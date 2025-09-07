// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title GasSponsorManager
 * @dev Gas Sponsor + Passkey + Session Keys — Mobil-öncelikli, tek-tık işlem deneyimi
 */
contract GasSponsorManager is AccessControl {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;
    
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    
    struct SessionKey {
        address keyAddress;
        address owner;
        uint256 validUntil;
        uint256 gasAllowance;
        uint256 gasUsed;
        bool isActive;
        bytes32[] allowedSelectors; // Function selectors this key can call
        address[] allowedContracts; // Contracts this key can interact with
    }
    
    struct PasskeyAccount {
        address accountAddress;
        bytes32 passkeyId; // Webauthn credential ID
        uint256 pubKeyX; // P-256 public key X coordinate
        uint256 pubKeyY; // P-256 public key Y coordinate
        bool isActive;
        uint256 nonce;
    }
    
    struct GasSponsorship {
        address sponsor;
        uint256 budget; // Total gas budget
        uint256 used; // Gas used
        uint256 dailyLimit; // Daily spending limit
        uint256 dailyUsed; // Today's usage
        uint256 lastResetDay; // Last daily reset
        bool isActive;
        address[] allowedUsers; // Users who can use this sponsorship
        mapping(address => bool) userAllowed;
    }
    
    struct MetaTx {
        address from;
        address to;
        uint256 value;
        bytes data;
        uint256 gas;
        uint256 nonce;
        uint256 deadline;
        bytes sessionSignature;
        bytes passkeySignature;
    }
    
    mapping(address => SessionKey) public sessionKeys;
    mapping(bytes32 => PasskeyAccount) public passkeyAccounts;
    mapping(address => GasSponsorship) public gasSponsors;
    mapping(address => uint256) public userNonces;
    
    // Gas price tracking for reimbursement
    mapping(address => uint256) public gasReserves;
    uint256 public maxGasPrice = 50 gwei;
    uint256 public baseFeeMultiplier = 120; // 120% of base fee
    
    IERC20 public gasToken; // Token used for gas payments
    
    event SessionKeyCreated(address indexed owner, address indexed sessionKey, uint256 validUntil, uint256 gasAllowance);
    event PasskeyRegistered(address indexed account, bytes32 indexed passkeyId);
    event GasSponsored(address indexed sponsor, address indexed user, uint256 gasUsed, uint256 cost);
    event MetaTransactionExecuted(address indexed from, address indexed to, bool success, uint256 gasUsed);
    event SessionKeyRevoked(address indexed owner, address indexed sessionKey);
    
    constructor(address _gasToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SPONSOR_ROLE, msg.sender);
        _grantRole(RELAYER_ROLE, msg.sender);
        gasToken = IERC20(_gasToken);
    }
    
    function createSessionKey(
        address keyAddress,
        uint256 validityDuration,
        uint256 gasAllowance,
        bytes32[] calldata allowedSelectors,
        address[] calldata allowedContracts
    ) external {
        require(keyAddress != address(0), "Invalid key address");
        require(validityDuration > 0, "Invalid duration");
        
        sessionKeys[keyAddress] = SessionKey({
            keyAddress: keyAddress,
            owner: msg.sender,
            validUntil: block.timestamp + validityDuration,
            gasAllowance: gasAllowance,
            gasUsed: 0,
            isActive: true,
            allowedSelectors: allowedSelectors,
            allowedContracts: allowedContracts
        });
        
        emit SessionKeyCreated(msg.sender, keyAddress, block.timestamp + validityDuration, gasAllowance);
    }
    
    function registerPasskey(
        bytes32 passkeyId,
        uint256 pubKeyX,
        uint256 pubKeyY
    ) external returns (address accountAddress) {
        // Generate deterministic account address from passkey
        accountAddress = address(uint160(uint256(keccak256(abi.encodePacked(passkeyId, pubKeyX, pubKeyY)))));
        
        passkeyAccounts[passkeyId] = PasskeyAccount({
            accountAddress: accountAddress,
            passkeyId: passkeyId,
            pubKeyX: pubKeyX,
            pubKeyY: pubKeyY,
            isActive: true,
            nonce: 0
        });
        
        emit PasskeyRegistered(accountAddress, passkeyId);
        return accountAddress;
    }
    
    function setupGasSponsorship(
        uint256 budget,
        uint256 dailyLimit,
        address[] calldata allowedUsers
    ) external payable {
        require(msg.value >= budget, "Insufficient payment");
        
        GasSponsorship storage sponsorship = gasSponsors[msg.sender];
        sponsorship.sponsor = msg.sender;
        sponsorship.budget = budget;
        sponsorship.used = 0;
        sponsorship.dailyLimit = dailyLimit;
        sponsorship.dailyUsed = 0;
        sponsorship.lastResetDay = block.timestamp / 1 days;
        sponsorship.isActive = true;
        sponsorship.allowedUsers = allowedUsers;
        
        // Set user permissions
        for (uint256 i = 0; i < allowedUsers.length; i++) {
            sponsorship.userAllowed[allowedUsers[i]] = true;
        }
        
        gasReserves[msg.sender] += msg.value;
    }
    
    function executeMetaTransaction(
        MetaTx calldata txData,
        address gassponsor
    ) public onlyRole(RELAYER_ROLE) returns (bool success) {
        require(block.timestamp <= txData.deadline, "Transaction expired");
        
        // Verify session key authorization
        SessionKey storage sessionKey = sessionKeys[msg.sender];
        require(sessionKey.isActive, "Session key inactive");
        require(block.timestamp <= sessionKey.validUntil, "Session key expired");
        require(sessionKey.owner == txData.from, "Invalid session key owner");
        
        // Check gas allowance
        uint256 estimatedGasCost = txData.gas * tx.gasprice;
        require(sessionKey.gasUsed + estimatedGasCost <= sessionKey.gasAllowance, "Gas allowance exceeded");
        
        // Verify contract and selector permissions
        require(_isAllowedContract(sessionKey, txData.to), "Contract not allowed");
        require(_isAllowedSelector(sessionKey, txData.data), "Selector not allowed");
        
        // Verify signatures
        require(_verifySessionSignature(txData), "Invalid session signature");
        require(_verifyPasskeySignature(txData), "Invalid passkey signature");
        
        // Check gas sponsorship
        GasSponsorship storage sponsor = gasSponsors[gassponsor];
        require(sponsor.isActive, "Sponsor inactive");
        require(sponsor.userAllowed[txData.from], "User not allowed");
        
        // Check daily limits
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > sponsor.lastResetDay) {
            sponsor.dailyUsed = 0;
            sponsor.lastResetDay = currentDay;
        }
        require(sponsor.dailyUsed + estimatedGasCost <= sponsor.dailyLimit, "Daily limit exceeded");
        
        // Execute transaction
        uint256 gasStart = gasleft();
        (success,) = txData.to.call{value: txData.value, gas: txData.gas}(txData.data);
        uint256 gasUsed = gasStart - gasleft();
        
        // Update usage tracking
        uint256 actualGasCost = gasUsed * tx.gasprice;
        sessionKey.gasUsed += actualGasCost;
        sponsor.used += actualGasCost;
        sponsor.dailyUsed += actualGasCost;
        userNonces[txData.from]++;
        
        // Reimburse relayer from sponsor's gas reserve
        if (gasReserves[gassponsor] >= actualGasCost) {
            gasReserves[gassponsor] -= actualGasCost;
            payable(msg.sender).transfer(actualGasCost);
        }
        
        emit MetaTransactionExecuted(txData.from, txData.to, success, gasUsed);
        emit GasSponsored(gassponsor, txData.from, gasUsed, actualGasCost);
        
        return success;
    }
    
    function _verifySessionSignature(MetaTx calldata txData) internal view returns (bool) {
        bytes32 txHash = keccak256(abi.encode(
            txData.from,
            txData.to,
            txData.value,
            txData.data,
            txData.nonce,
            txData.deadline
        ));
        
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(txHash);
        address signer = ethSignedHash.recover(txData.sessionSignature);
        
        return sessionKeys[signer].owner == txData.from;
    }
    
    function _verifyPasskeySignature(MetaTx calldata txData) internal view returns (bool) {
        // Simplified passkey verification - in production would use WebAuthn
        // This is a placeholder that assumes passkey signature verification
        return txData.passkeySignature.length > 0;
    }
    
    function _isAllowedContract(SessionKey storage sessionKey, address target) internal view returns (bool) {
        if (sessionKey.allowedContracts.length == 0) return true; // No restrictions
        
        for (uint256 i = 0; i < sessionKey.allowedContracts.length; i++) {
            if (sessionKey.allowedContracts[i] == target) {
                return true;
            }
        }
        return false;
    }
    
    function _isAllowedSelector(SessionKey storage sessionKey, bytes calldata data) internal view returns (bool) {
        if (sessionKey.allowedSelectors.length == 0) return true; // No restrictions
        if (data.length < 4) return false;
        
        bytes4 selector = bytes4(data[:4]);
        for (uint256 i = 0; i < sessionKey.allowedSelectors.length; i++) {
            if (sessionKey.allowedSelectors[i] == selector) {
                return true;
            }
        }
        return false;
    }
    
    function revokeSessionKey(address keyAddress) external {
        SessionKey storage sessionKey = sessionKeys[keyAddress];
        require(sessionKey.owner == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");
        
        sessionKey.isActive = false;
        emit SessionKeyRevoked(sessionKey.owner, keyAddress);
    }
    
    function batchExecute(
        MetaTx[] calldata transactions,
        address gassponsor
    ) external onlyRole(RELAYER_ROLE) returns (bool[] memory results) {
        results = new bool[](transactions.length);
        
        for (uint256 i = 0; i < transactions.length; i++) {
            results[i] = executeMetaTransaction(transactions[i], gassponsor);
        }
        
        return results;
    }
    
    function estimateGasCost(MetaTx calldata txData) external view returns (uint256) {
        return txData.gas * tx.gasprice;
    }
    
    function getSessionKeyInfo(address keyAddress) external view returns (
        address owner,
        uint256 validUntil,
        uint256 gasAllowance,
        uint256 gasUsed,
        bool isActive
    ) {
        SessionKey memory sessionKey = sessionKeys[keyAddress];
        return (
            sessionKey.owner,
            sessionKey.validUntil,
            sessionKey.gasAllowance,
            sessionKey.gasUsed,
            sessionKey.isActive
        );
    }
    
    function getGasSponsorshipInfo(address sponsor) external view returns (
        uint256 budget,
        uint256 used,
        uint256 dailyLimit,
        uint256 dailyUsed,
        bool isActive
    ) {
        GasSponsorship storage sponsorship = gasSponsors[sponsor];
        return (
            sponsorship.budget,
            sponsorship.used,
            sponsorship.dailyLimit,
            sponsorship.dailyUsed,
            sponsorship.isActive
        );
    }
    
    function withdrawGasReserve(uint256 amount) external {
        require(gasReserves[msg.sender] >= amount, "Insufficient balance");
        gasReserves[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
    
    function updateMaxGasPrice(uint256 newMaxGasPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxGasPrice = newMaxGasPrice;
    }
    
    // Emergency functions
    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Pause all session keys
        // In production, would implement a proper pause mechanism
    }
    
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
}