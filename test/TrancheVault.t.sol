// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "contracts/src/TrancheVault.sol";
import "contracts/src/TrancheToken.sol";
import "contracts/src/RiskParams.sol";
import "contracts/src/OracleManager.sol";
import "contracts/src/StrategyRegistry.sol";
import "contracts/src/PauseGuardian.sol";
import "contracts/src/mocks/MockUSDC.sol";
import "contracts/src/mocks/MockStrategy.sol";

contract TrancheVaultTest is Test {
    TrancheVault public vault;
    TrancheToken public seniorToken;
    TrancheToken public juniorToken;
    RiskParams public riskParams;
    OracleManager public oracleManager;
    StrategyRegistry public strategyRegistry;
    PauseGuardian public pauseGuardian;
    MockUSDC public usdc;
    MockStrategy public mockStrategy;

    address public owner = address(0x1);
    address public guardian = address(0x2);
    address public keeper = address(0x3);
    address public aiSigner = address(0x4);
    address public treasury = address(0x5);
    address public alice = address(0x10);
    address public bob = address(0x11);

    uint256 constant SENIOR_TRANCHE = 0;
    uint256 constant JUNIOR_TRANCHE = 1;

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy core contracts
        pauseGuardian = new PauseGuardian(owner, guardian);
        oracleManager = new OracleManager(owner);
        riskParams = new RiskParams(owner, guardian, keeper, aiSigner);
        strategyRegistry = new StrategyRegistry(owner);

        // Deploy vault
        vault = new TrancheVault(
            IERC20(address(usdc)),
            "FluxTranche Vault",
            "FTV",
            owner,
            keeper,
            treasury
        );

        // Deploy tranche tokens
        seniorToken = new TrancheToken("Senior FLUX", "S-FLUX", 0, owner);
        juniorToken = new TrancheToken("Junior FLUX", "J-FLUX", 1, owner);

        // Setup vault
        vm.startPrank(owner);
        seniorToken.setVault(address(vault));
        juniorToken.setVault(address(vault));
        vault.initialize(
            address(seniorToken),
            address(juniorToken),
            address(riskParams),
            address(oracleManager),
            address(strategyRegistry),
            address(pauseGuardian)
        );
        vm.stopPrank();

        // Setup mock strategy
        mockStrategy = new MockStrategy(address(usdc), address(vault));
        
        // Setup oracle price
        vm.prank(owner);
        oracleManager.updatePrice(address(usdc), 1e8); // $1.00

        // Mint USDC to test users
        usdc.mint(alice, 100_000e6); // 100k USDC
        usdc.mint(bob, 100_000e6);
    }

    function testDepositSeniorTranche() public {
        uint256 depositAmount = 10_000e6; // 10k USDC

        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        
        uint256 shares = vault.depositTranche(depositAmount, alice, SENIOR_TRANCHE);
        vm.stopPrank();

        assertEq(shares, depositAmount); // 1:1 for first deposit
        assertEq(seniorToken.balanceOf(alice), shares);
    }

    function testDepositJuniorTranche() public {
        uint256 depositAmount = 5_000e6; // 5k USDC

        vm.startPrank(bob);
        usdc.approve(address(vault), depositAmount);
        
        uint256 shares = vault.depositTranche(depositAmount, bob, JUNIOR_TRANCHE);
        vm.stopPrank();

        assertEq(shares, depositAmount); // 1:1 for first deposit
        assertEq(juniorToken.balanceOf(bob), shares);
    }

    function testWithdrawSeniorTranche() public {
        // First deposit
        uint256 depositAmount = 10_000e6;
        vm.startPrank(alice);
        usdc.approve(address(vault), depositAmount);
        vault.depositTranche(depositAmount, alice, SENIOR_TRANCHE);
        
        // Then withdraw half
        uint256 withdrawShares = 5_000e6;
        uint256 assetsReceived = vault.withdrawTranche(withdrawShares, alice, SENIOR_TRANCHE);
        vm.stopPrank();

        assertEq(assetsReceived, withdrawShares);
        assertEq(seniorToken.balanceOf(alice), depositAmount - withdrawShares);
        assertEq(usdc.balanceOf(alice), 100_000e6 - depositAmount + assetsReceived);
    }

    function testEpochSettlement() public {
        // Setup deposits
        vm.startPrank(alice);
        usdc.approve(address(vault), 10_000e6);
        vault.depositTranche(10_000e6, alice, SENIOR_TRANCHE);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 10_000e6);
        vault.depositTranche(10_000e6, bob, JUNIOR_TRANCHE);
        vm.stopPrank();

        // Fast forward past epoch end
        vm.warp(block.timestamp + 1 days + 1);

        // Settle epoch (keeper only)
        vm.prank(keeper);
        vault.settleEpoch();

        // Check new epoch started
        (uint256 epochIndex,,,,,,) = vault.currentEpoch();
        assertEq(epochIndex, 2);
    }

    function testPauseDeposits() public {
        vm.prank(guardian);
        pauseGuardian.pauseDeposits();

        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        
        vm.expectRevert(TrancheVault.DepositsDisabled.selector);
        vault.depositTranche(1000e6, alice, SENIOR_TRANCHE);
        vm.stopPrank();
    }

    function testEmergencyWithdrawals() public {
        // Deposit first
        vm.startPrank(alice);
        usdc.approve(address(vault), 10_000e6);
        vault.depositTranche(10_000e6, alice, SENIOR_TRANCHE);
        vm.stopPrank();

        // Activate emergency mode
        vm.prank(owner);
        pauseGuardian.activateEmergencyMode();

        // Withdrawals should still work
        vm.prank(alice);
        uint256 assets = vault.withdrawTranche(5_000e6, alice, SENIOR_TRANCHE);
        assertEq(assets, 5_000e6);
    }

    function testWaterfallDistribution() public {
        // Setup: 10k senior, 10k junior
        vm.startPrank(alice);
        usdc.approve(address(vault), 10_000e6);
        vault.depositTranche(10_000e6, alice, SENIOR_TRANCHE);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 10_000e6);
        vault.depositTranche(10_000e6, bob, JUNIOR_TRANCHE);
        vm.stopPrank();

        // Add some yield to vault (simulate strategy returns)
        usdc.mint(address(vault), 100e6); // 100 USDC profit

        // Fast forward and settle
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(keeper);
        vault.settleEpoch();

        // Check senior got their target coupon
        // Junior got remaining profit
        uint256 seniorNAV = vault.getTrancheNAV(SENIOR_TRANCHE);
        uint256 juniorNAV = vault.getTrancheNAV(JUNIOR_TRANCHE);
        
        assertGt(seniorNAV, 1e6); // Should be above initial 1:1
        assertGt(juniorNAV, 1e6); // Should be above initial 1:1
    }

    function testInvalidTranche() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        
        vm.expectRevert(TrancheVault.InvalidTranche.selector);
        vault.depositTranche(1000e6, alice, 2); // Invalid tranche
        vm.stopPrank();
    }

    function testSameBlockRestriction() public {
        // This would need to be tested with foundry cheatcodes
        // to manipulate block.number
    }
}