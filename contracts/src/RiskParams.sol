// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract RiskParams is AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant AI_SIGNER_ROLE = keccak256("AI_SIGNER_ROLE");

    struct RiskConfig {
        uint256 epochLength;
        uint256 seniorTargetBps;
        uint256 maxDrawdownBps;
        uint256 slippageBps;
        address[] strategies;
        uint256[] targetWeightsBps;
        uint256[] caps;
    }

    struct QueuedConfig {
        RiskConfig config;
        bytes signature;
        uint256 queuedAt;
        bool executed;
    }

    RiskConfig public currentConfig;
    QueuedConfig public queuedConfig;
    
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    uint256 public constant EMERGENCY_DELAY = 2 hours;
    uint256 public constant BPS = 10_000;
    
    address public aiSigner;
    uint256 public nonce;

    event ParamsQueued(RiskConfig config, uint256 executeAfter);
    event ParamsExecuted(RiskConfig config);
    event ParamsRejected(RiskConfig config);
    event EmergencyUpdate(RiskConfig config);
    event AiSignerUpdated(address oldSigner, address newSigner);

    error InvalidSignature();
    error TimelockNotPassed();
    error AlreadyExecuted();
    error InvalidConfig();
    error ArrayLengthMismatch();
    error WeightsNotValid();

    constructor(
        address admin,
        address guardian,
        address keeper,
        address _aiSigner
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, guardian);
        _grantRole(KEEPER_ROLE, keeper);
        _grantRole(AI_SIGNER_ROLE, _aiSigner);
        
        aiSigner = _aiSigner;

        // Set default config
        currentConfig.epochLength = 86400; // 24 hours
        currentConfig.seniorTargetBps = 30; // 0.3% per epoch
        currentConfig.maxDrawdownBps = 2000; // 20%
        currentConfig.slippageBps = 50; // 0.5%
    }

    function queueParams(
        RiskConfig memory config,
        bytes memory signature
    ) external onlyRole(KEEPER_ROLE) {
        _validateConfig(config);
        _validateSignature(config, signature);

        queuedConfig = QueuedConfig({
            config: config,
            signature: signature,
            queuedAt: block.timestamp,
            executed: false
        });

        emit ParamsQueued(config, block.timestamp + TIMELOCK_DELAY);
    }

    function executeParams() external onlyRole(KEEPER_ROLE) {
        if (queuedConfig.executed) revert AlreadyExecuted();
        if (block.timestamp < queuedConfig.queuedAt + TIMELOCK_DELAY) {
            revert TimelockNotPassed();
        }

        currentConfig = queuedConfig.config;
        queuedConfig.executed = true;
        nonce++;

        emit ParamsExecuted(currentConfig);
    }

    function emergencyUpdate(
        RiskConfig memory config
    ) external onlyRole(GUARDIAN_ROLE) {
        _validateConfig(config);
        
        currentConfig = config;
        nonce++;

        emit EmergencyUpdate(config);
    }

    function rejectQueuedParams() external onlyRole(GUARDIAN_ROLE) {
        if (queuedConfig.executed) revert AlreadyExecuted();
        
        emit ParamsRejected(queuedConfig.config);
        delete queuedConfig;
    }

    function updateAiSigner(address newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldSigner = aiSigner;
        aiSigner = newSigner;
        _grantRole(AI_SIGNER_ROLE, newSigner);
        _revokeRole(AI_SIGNER_ROLE, oldSigner);
        emit AiSignerUpdated(oldSigner, newSigner);
    }

    function _validateConfig(RiskConfig memory config) internal pure {
        if (config.epochLength < 3600 || config.epochLength > 30 days) {
            revert InvalidConfig();
        }
        if (config.seniorTargetBps > 1000) { // Max 10% per epoch
            revert InvalidConfig();
        }
        if (config.maxDrawdownBps > 5000) { // Max 50% drawdown
            revert InvalidConfig();
        }
        if (config.strategies.length != config.targetWeightsBps.length ||
            config.strategies.length != config.caps.length) {
            revert ArrayLengthMismatch();
        }

        uint256 totalWeight = 0;
        for (uint256 i = 0; i < config.targetWeightsBps.length; i++) {
            totalWeight += config.targetWeightsBps[i];
        }
        if (totalWeight != BPS) {
            revert WeightsNotValid();
        }
    }

    function _validateSignature(
        RiskConfig memory config,
        bytes memory signature
    ) internal view {
        bytes32 messageHash = keccak256(abi.encode(config, nonce));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address signer = ethSignedMessageHash.recover(signature);
        if (signer != aiSigner) {
            revert InvalidSignature();
        }
    }

    function getCurrentConfig() external view returns (RiskConfig memory) {
        return currentConfig;
    }

    function getQueuedConfig() external view returns (QueuedConfig memory) {
        return queuedConfig;
    }

    function canExecute() external view returns (bool) {
        return !queuedConfig.executed && 
               block.timestamp >= queuedConfig.queuedAt + TIMELOCK_DELAY;
    }
}