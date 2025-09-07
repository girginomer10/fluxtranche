// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "contracts/src/RiskParams.sol";

contract RiskParamsTest is Test {
    RiskParams public riskParams;
    
    address public admin = address(0x1);
    address public guardian = address(0x2);
    address public keeper = address(0x3);
    address public aiSigner;
    uint256 public aiSignerKey = 0x1234;

    function setUp() public {
        aiSigner = vm.addr(aiSignerKey);
        riskParams = new RiskParams(admin, guardian, keeper, aiSigner);
    }

    function testInitialConfig() public view {
        RiskParams.RiskConfig memory config = riskParams.getCurrentConfig();
        assertEq(config.epochLength, 86400); // 24 hours
        assertEq(config.seniorTargetBps, 30); // 0.3%
        assertEq(config.maxDrawdownBps, 2000); // 20%
        assertEq(config.slippageBps, 50); // 0.5%
    }

    function testQueueParams() public {
        RiskParams.RiskConfig memory newConfig = _createValidConfig();
        bytes memory signature = _signConfig(newConfig);

        vm.prank(keeper);
        riskParams.queueParams(newConfig, signature);

        RiskParams.QueuedConfig memory queued = riskParams.getQueuedConfig();
        assertEq(queued.config.epochLength, newConfig.epochLength);
        assertFalse(queued.executed);
    }

    function testExecuteParams() public {
        RiskParams.RiskConfig memory newConfig = _createValidConfig();
        bytes memory signature = _signConfig(newConfig);

        vm.prank(keeper);
        riskParams.queueParams(newConfig, signature);

        // Fast forward past timelock
        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(keeper);
        riskParams.executeParams();

        RiskParams.RiskConfig memory current = riskParams.getCurrentConfig();
        assertEq(current.epochLength, newConfig.epochLength);
        assertEq(current.seniorTargetBps, newConfig.seniorTargetBps);
    }

    function testTimelockEnforcement() public {
        RiskParams.RiskConfig memory newConfig = _createValidConfig();
        bytes memory signature = _signConfig(newConfig);

        vm.prank(keeper);
        riskParams.queueParams(newConfig, signature);

        // Try to execute before timelock
        vm.prank(keeper);
        vm.expectRevert(RiskParams.TimelockNotPassed.selector);
        riskParams.executeParams();
    }

    function testEmergencyUpdate() public {
        RiskParams.RiskConfig memory newConfig = _createValidConfig();

        vm.prank(guardian);
        riskParams.emergencyUpdate(newConfig);

        RiskParams.RiskConfig memory current = riskParams.getCurrentConfig();
        assertEq(current.epochLength, newConfig.epochLength);
    }

    function testRejectQueuedParams() public {
        RiskParams.RiskConfig memory newConfig = _createValidConfig();
        bytes memory signature = _signConfig(newConfig);

        vm.prank(keeper);
        riskParams.queueParams(newConfig, signature);

        vm.prank(guardian);
        riskParams.rejectQueuedParams();

        RiskParams.QueuedConfig memory queued = riskParams.getQueuedConfig();
        assertEq(queued.queuedAt, 0);
    }

    function testInvalidSignature() public {
        RiskParams.RiskConfig memory newConfig = _createValidConfig();
        
        // Sign with wrong key
        uint256 wrongKey = 0x5678;
        bytes32 messageHash = keccak256(abi.encode(newConfig, riskParams.nonce()));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedMessageHash);
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        vm.prank(keeper);
        vm.expectRevert(RiskParams.InvalidSignature.selector);
        riskParams.queueParams(newConfig, wrongSignature);
    }

    function testInvalidConfig() public {
        RiskParams.RiskConfig memory badConfig = _createValidConfig();
        badConfig.epochLength = 1000; // Too short

        vm.prank(guardian);
        vm.expectRevert(RiskParams.InvalidConfig.selector);
        riskParams.emergencyUpdate(badConfig);
    }

    function testWeightValidation() public {
        RiskParams.RiskConfig memory badConfig = _createValidConfig();
        badConfig.targetWeightsBps[0] = 5000; // Doesn't sum to 10000

        vm.prank(guardian);
        vm.expectRevert(RiskParams.WeightsNotValid.selector);
        riskParams.emergencyUpdate(badConfig);
    }

    function _createValidConfig() internal pure returns (RiskParams.RiskConfig memory) {
        address[] memory strategies = new address[](2);
        strategies[0] = address(0x100);
        strategies[1] = address(0x101);

        uint256[] memory weights = new uint256[](2);
        weights[0] = 7000; // 70%
        weights[1] = 3000; // 30%

        uint256[] memory caps = new uint256[](2);
        caps[0] = 1_000_000e6;
        caps[1] = 500_000e6;

        return RiskParams.RiskConfig({
            epochLength: 7200, // 2 hours for testing
            seniorTargetBps: 50, // 0.5%
            maxDrawdownBps: 1500, // 15%
            slippageBps: 100, // 1%
            strategies: strategies,
            targetWeightsBps: weights,
            caps: caps
        });
    }

    function _signConfig(RiskParams.RiskConfig memory config) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encode(config, riskParams.nonce()));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aiSignerKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }
}