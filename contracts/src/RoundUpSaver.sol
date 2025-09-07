// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RoundUpSaver
 * @dev Round-Up / Open-Banking / Card-Link — Küsurat biriktirme ve eşik dolunca auto-stake (batch)
 */
contract RoundUpSaver is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant BANKING_ORACLE_ROLE = keccak256("BANKING_ORACLE_ROLE");
    bytes32 public constant CARD_PROCESSOR_ROLE = keccak256("CARD_PROCESSOR_ROLE");
    
    struct RoundUpAccount {
        address owner;
        uint256 totalRoundUps; // Total round-ups accumulated
        uint256 batchThreshold; // Threshold to trigger auto-stake
        uint256 lastBatchAt; // Last batch processing time
        bool autoStakeEnabled; // Auto-stake when threshold reached
        uint256 seniorAllocation; // Percentage to Senior tranche (BPS)
        uint256 juniorAllocation; // Percentage to Junior tranche (BPS)
        RoundUpStrategy strategy;
        BankingConnection bankConnection;
        CardLinkSettings cardSettings;
    }
    
    enum RoundUpStrategy {
        CONSERVATIVE,    // Round up to nearest $1
        MODERATE,        // Round up to nearest $5
        AGGRESSIVE,      // Round up to nearest $10
        CUSTOM          // Custom round-up amount
    }
    
    struct BankingConnection {
        string bankId; // Encrypted bank identifier
        string accountId; // Encrypted account identifier
        bool isConnected;
        uint256 lastSyncAt;
        uint256 totalTransactions;
        bool autoSyncEnabled;
    }
    
    struct CardLinkSettings {
        string maskedCardNumber; // Last 4 digits only
        string cardType; // "VISA", "MASTERCARD", etc.
        bool isLinked;
        uint256 dailyLimit; // Daily round-up limit
        uint256 dailyUsed; // Today's usage
        uint256 lastResetDay;
        string[] excludedMerchants; // Skip round-ups for these merchants
    }
    
    struct Transaction {
        uint256 transactionId;
        address user;
        uint256 originalAmount; // Original transaction amount (in cents)
        uint256 roundUpAmount; // Round-up amount (in cents)
        string merchantName;
        string category; // "GROCERY", "GAS", "RESTAURANT", etc.
        uint256 timestamp;
        bool processed;
        TransactionSource source;
    }
    
    enum TransactionSource {
        OPEN_BANKING,
        CARD_LINK,
        MANUAL
    }
    
    struct BatchExecution {
        uint256 batchId;
        address user;
        uint256 totalAmount;
        uint256 seniorAmount;
        uint256 juniorAmount;
        uint256 transactionCount;
        uint256 executedAt;
        bool success;
    }
    
    IERC20 public stablecoin; // USDC or similar
    address public trancheVault;
    
    mapping(address => RoundUpAccount) public accounts;
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public userTransactions;
    mapping(uint256 => BatchExecution) public batches;
    mapping(address => uint256) public userBatchCount;
    
    uint256 public transactionCounter;
    uint256 public batchCounter;
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_BATCH_THRESHOLD = 10 * 10**6; // $10 minimum
    
    event AccountSetup(address indexed user, uint256 batchThreshold, RoundUpStrategy strategy);
    event BankingConnected(address indexed user, string bankId);
    event CardLinked(address indexed user, string maskedCardNumber, string cardType);
    event RoundUpProcessed(uint256 indexed transactionId, address indexed user, uint256 roundUpAmount);
    event BatchExecuted(uint256 indexed batchId, address indexed user, uint256 totalAmount, uint256 seniorAmount, uint256 juniorAmount);
    event TransactionSynced(address indexed user, uint256 count, uint256 totalRoundUps);
    
    constructor(address _stablecoin, address _trancheVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BANKING_ORACLE_ROLE, msg.sender);
        _grantRole(CARD_PROCESSOR_ROLE, msg.sender);
        
        stablecoin = IERC20(_stablecoin);
        trancheVault = _trancheVault;
    }
    
    function setupRoundUpAccount(
        uint256 batchThreshold,
        uint256 seniorAllocation,
        uint256 juniorAllocation,
        RoundUpStrategy strategy
    ) external {
        require(batchThreshold >= MIN_BATCH_THRESHOLD, "Threshold too low");
        require(seniorAllocation + juniorAllocation <= BPS, "Invalid allocation");
        
        accounts[msg.sender] = RoundUpAccount({
            owner: msg.sender,
            totalRoundUps: 0,
            batchThreshold: batchThreshold,
            lastBatchAt: block.timestamp,
            autoStakeEnabled: true,
            seniorAllocation: seniorAllocation,
            juniorAllocation: juniorAllocation,
            strategy: strategy,
            bankConnection: BankingConnection("", "", false, 0, 0, false),
            cardSettings: CardLinkSettings("", "", false, 100 * 10**6, 0, block.timestamp / 1 days, new string[](0))
        });
        
        emit AccountSetup(msg.sender, batchThreshold, strategy);
    }
    
    function connectOpenBanking(
        string calldata encryptedBankId,
        string calldata encryptedAccountId
    ) external {
        RoundUpAccount storage account = accounts[msg.sender];
        require(account.owner == msg.sender, "Account not found");
        
        account.bankConnection.bankId = encryptedBankId;
        account.bankConnection.accountId = encryptedAccountId;
        account.bankConnection.isConnected = true;
        account.bankConnection.lastSyncAt = block.timestamp;
        account.bankConnection.autoSyncEnabled = true;
        
        emit BankingConnected(msg.sender, encryptedBankId);
    }
    
    function linkCard(
        string calldata maskedCardNumber,
        string calldata cardType,
        uint256 dailyLimit
    ) external {
        RoundUpAccount storage account = accounts[msg.sender];
        require(account.owner == msg.sender, "Account not found");
        
        account.cardSettings.maskedCardNumber = maskedCardNumber;
        account.cardSettings.cardType = cardType;
        account.cardSettings.isLinked = true;
        account.cardSettings.dailyLimit = dailyLimit;
        account.cardSettings.dailyUsed = 0;
        account.cardSettings.lastResetDay = block.timestamp / 1 days;
        
        emit CardLinked(msg.sender, maskedCardNumber, cardType);
    }
    
    function processTransaction(
        address user,
        uint256 originalAmount, // in cents
        string calldata merchantName,
        string calldata category,
        TransactionSource source
    ) external {
        require(
            hasRole(BANKING_ORACLE_ROLE, msg.sender) || 
            hasRole(CARD_PROCESSOR_ROLE, msg.sender) || 
            user == msg.sender, 
            "Not authorized"
        );
        
        RoundUpAccount storage account = accounts[user];
        require(account.owner == user, "Account not found");
        
        // Check daily limits for card transactions
        if (source == TransactionSource.CARD_LINK) {
            uint256 currentDay = block.timestamp / 1 days;
            if (currentDay > account.cardSettings.lastResetDay) {
                account.cardSettings.dailyUsed = 0;
                account.cardSettings.lastResetDay = currentDay;
            }
        }
        
        // Calculate round-up amount
        uint256 roundUpAmount = _calculateRoundUp(originalAmount, account.strategy);
        
        // Check if we should skip this merchant
        if (source == TransactionSource.CARD_LINK && _isExcludedMerchant(account, merchantName)) {
            return;
        }
        
        // Check daily limits
        if (source == TransactionSource.CARD_LINK) {
            require(account.cardSettings.dailyUsed + roundUpAmount <= account.cardSettings.dailyLimit, "Daily limit exceeded");
            account.cardSettings.dailyUsed += roundUpAmount;
        }
        
        // Store transaction
        transactionCounter++;
        transactions[transactionCounter] = Transaction({
            transactionId: transactionCounter,
            user: user,
            originalAmount: originalAmount,
            roundUpAmount: roundUpAmount,
            merchantName: merchantName,
            category: category,
            timestamp: block.timestamp,
            processed: false,
            source: source
        });
        
        userTransactions[user].push(transactionCounter);
        account.totalRoundUps += roundUpAmount;
        
        emit RoundUpProcessed(transactionCounter, user, roundUpAmount);
        
        // Check if we should trigger batch execution
        if (account.autoStakeEnabled && account.totalRoundUps >= account.batchThreshold) {
            _executeBatch(user);
        }
    }
    
    function syncBankingTransactions(
        address user,
        uint256[] calldata originalAmounts,
        string[] calldata merchantNames,
        string[] calldata categories
    ) external onlyRole(BANKING_ORACLE_ROLE) {
        require(originalAmounts.length == merchantNames.length, "Array length mismatch");
        require(merchantNames.length == categories.length, "Array length mismatch");
        
        RoundUpAccount storage account = accounts[user];
        require(account.bankConnection.isConnected, "Banking not connected");
        
        uint256 totalRoundUps = 0;
        
        for (uint256 i = 0; i < originalAmounts.length; i++) {
            uint256 roundUpAmount = _calculateRoundUp(originalAmounts[i], account.strategy);
            
            transactionCounter++;
            transactions[transactionCounter] = Transaction({
                transactionId: transactionCounter,
                user: user,
                originalAmount: originalAmounts[i],
                roundUpAmount: roundUpAmount,
                merchantName: merchantNames[i],
                category: categories[i],
                timestamp: block.timestamp,
                processed: false,
                source: TransactionSource.OPEN_BANKING
            });
            
            userTransactions[user].push(transactionCounter);
            totalRoundUps += roundUpAmount;
        }
        
        account.totalRoundUps += totalRoundUps;
        account.bankConnection.lastSyncAt = block.timestamp;
        account.bankConnection.totalTransactions += originalAmounts.length;
        
        emit TransactionSynced(user, originalAmounts.length, totalRoundUps);
        
        // Check for batch execution
        if (account.autoStakeEnabled && account.totalRoundUps >= account.batchThreshold) {
            _executeBatch(user);
        }
    }
    
    function _executeBatch(address user) internal {
        RoundUpAccount storage account = accounts[user];
        require(account.totalRoundUps > 0, "No round-ups to process");
        
        uint256 totalAmount = account.totalRoundUps;
        uint256 seniorAmount = (totalAmount * account.seniorAllocation) / BPS;
        uint256 juniorAmount = (totalAmount * account.juniorAllocation) / BPS;
        
        // Create batch record
        batchCounter++;
        userBatchCount[user]++;
        
        batches[batchCounter] = BatchExecution({
            batchId: batchCounter,
            user: user,
            totalAmount: totalAmount,
            seniorAmount: seniorAmount,
            juniorAmount: juniorAmount,
            transactionCount: userTransactions[user].length,
            executedAt: block.timestamp,
            success: false
        });
        
        // Transfer tokens from user and stake in tranches
        uint256 totalToStake = seniorAmount + juniorAmount;
        if (totalToStake > 0) {
            stablecoin.safeTransferFrom(user, address(this), totalToStake);
            stablecoin.safeTransfer(trancheVault, totalToStake);
            
            // In full implementation, would call specific tranche deposit functions
            // TrancheVault(trancheVault).depositToSenior(seniorAmount);
            // TrancheVault(trancheVault).depositToJunior(juniorAmount);
            
            batches[batchCounter].success = true;
        }
        
        // Reset round-ups
        account.totalRoundUps = 0;
        account.lastBatchAt = block.timestamp;
        
        // Mark transactions as processed
        uint256[] storage userTxs = userTransactions[user];
        for (uint256 i = 0; i < userTxs.length; i++) {
            transactions[userTxs[i]].processed = true;
        }
        
        emit BatchExecuted(batchCounter, user, totalAmount, seniorAmount, juniorAmount);
    }
    
    function manualBatchExecution() external nonReentrant {
        RoundUpAccount storage account = accounts[msg.sender];
        require(account.owner == msg.sender, "Account not found");
        require(account.totalRoundUps > 0, "No round-ups to process");
        
        _executeBatch(msg.sender);
    }
    
    function _calculateRoundUp(uint256 originalAmount, RoundUpStrategy strategy) internal pure returns (uint256) {
        uint256 roundUpTarget;
        
        if (strategy == RoundUpStrategy.CONSERVATIVE) {
            roundUpTarget = 100; // $1.00
        } else if (strategy == RoundUpStrategy.MODERATE) {
            roundUpTarget = 500; // $5.00
        } else if (strategy == RoundUpStrategy.AGGRESSIVE) {
            roundUpTarget = 1000; // $10.00
        } else {
            roundUpTarget = 100; // Default to $1.00
        }
        
        uint256 remainder = originalAmount % roundUpTarget;
        return remainder == 0 ? 0 : roundUpTarget - remainder;
    }
    
    function _isExcludedMerchant(RoundUpAccount storage account, string calldata merchant) internal view returns (bool) {
        for (uint256 i = 0; i < account.cardSettings.excludedMerchants.length; i++) {
            if (keccak256(bytes(account.cardSettings.excludedMerchants[i])) == keccak256(bytes(merchant))) {
                return true;
            }
        }
        return false;
    }
    
    function updateBatchThreshold(uint256 newThreshold) external {
        require(newThreshold >= MIN_BATCH_THRESHOLD, "Threshold too low");
        accounts[msg.sender].batchThreshold = newThreshold;
    }
    
    function updateAllocation(uint256 seniorAllocation, uint256 juniorAllocation) external {
        require(seniorAllocation + juniorAllocation <= BPS, "Invalid allocation");
        
        RoundUpAccount storage account = accounts[msg.sender];
        account.seniorAllocation = seniorAllocation;
        account.juniorAllocation = juniorAllocation;
    }
    
    function addExcludedMerchant(string calldata merchant) external {
        accounts[msg.sender].cardSettings.excludedMerchants.push(merchant);
    }
    
    function setAutoStake(bool enabled) external {
        accounts[msg.sender].autoStakeEnabled = enabled;
    }
    
    function getUserStats(address user) external view returns (
        uint256 totalRoundUps,
        uint256 batchThreshold,
        uint256 totalBatches,
        uint256 totalTransactions,
        bool autoStakeEnabled
    ) {
        RoundUpAccount storage account = accounts[user];
        return (
            account.totalRoundUps,
            account.batchThreshold,
            userBatchCount[user],
            userTransactions[user].length,
            account.autoStakeEnabled
        );
    }
    
    function getRecentTransactions(address user, uint256 limit) external view returns (Transaction[] memory) {
        uint256[] storage userTxs = userTransactions[user];
        uint256 length = userTxs.length > limit ? limit : userTxs.length;
        Transaction[] memory recentTxs = new Transaction[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 txIndex = userTxs[userTxs.length - 1 - i]; // Get latest first
            recentTxs[i] = transactions[txIndex];
        }
        
        return recentTxs;
    }
}