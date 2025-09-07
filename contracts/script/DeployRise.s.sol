// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TrancheVault.sol";
import "../src/TrancheToken.sol";
import "../src/RiskParams.sol";
import "../src/OracleManager.sol";
import "../src/StrategyRegistry.sol";
import "../src/PauseGuardian.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockStrategy.sol";
import "../src/FlashEpochs.sol";
import "../src/KineticFees.sol";

contract DeployRise is Script {
    // Deployment addresses from ENV
    address public owner;
    address public guardian;
    address public keeper;
    address public aiSigner;
    address public treasury;

    // Deployed contracts
    TrancheVault public vault;
    TrancheToken public seniorToken;
    TrancheToken public juniorToken;
    RiskParams public riskParams;
    OracleManager public oracleManager;
    StrategyRegistry public strategyRegistry;
    PauseGuardian public pauseGuardian;
    MockUSDC public usdc;
    MockStrategy public mockStrategy;
    FlashEpochs public flashEpochs;
    KineticFees public kineticFees;

    function run() external {
        // Read ENV
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        owner = vm.envAddress("OWNER_ADDRESS");
        guardian = vm.envAddress("GUARDIAN_ADDRESS");
        keeper = vm.envAddress("KEEPER_ADDRESS");
        treasury = owner; // default treasury to owner unless customized
        aiSigner = owner; // default AI signer to owner for now
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying FluxTranche to RISE Testnet...");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        // 1. Deploy Mock USDC (for testnet only)
        console.log("\n1. Deploying Mock USDC...");
        usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // 2. Deploy PauseGuardian
        console.log("\n2. Deploying PauseGuardian...");
        pauseGuardian = new PauseGuardian(owner, guardian);
        console.log("PauseGuardian deployed at:", address(pauseGuardian));

        // 3. Deploy OracleManager
        console.log("\n3. Deploying OracleManager...");
        oracleManager = new OracleManager(owner);
        console.log("OracleManager deployed at:", address(oracleManager));

        // 4. Deploy RiskParams
        console.log("\n4. Deploying RiskParams...");
        riskParams = new RiskParams(owner, guardian, keeper, aiSigner);
        console.log("RiskParams deployed at:", address(riskParams));

        // 5. Deploy StrategyRegistry
        console.log("\n5. Deploying StrategyRegistry...");
        strategyRegistry = new StrategyRegistry(owner);
        console.log("StrategyRegistry deployed at:", address(strategyRegistry));

        // 6. Deploy TrancheVault
        console.log("\n6. Deploying TrancheVault...");
        vault = new TrancheVault(
            IERC20(address(usdc)),
            "FluxTranche Vault",
            "FTV",
            owner,
            keeper,
            treasury
        );
        console.log("TrancheVault deployed at:", address(vault));

        // 7. Deploy TrancheTokens
        console.log("\n7. Deploying TrancheTokens...");
        seniorToken = new TrancheToken("Senior FLUX", "S-FLUX", 0, owner);
        juniorToken = new TrancheToken("Junior FLUX", "J-FLUX", 1, owner);
        console.log("SeniorToken deployed at:", address(seniorToken));
        console.log("JuniorToken deployed at:", address(juniorToken));

        // 8. Deploy MockStrategy
        console.log("\n8. Deploying MockStrategy...");
        mockStrategy = new MockStrategy(address(usdc), address(vault));
        console.log("MockStrategy deployed at:", address(mockStrategy));

        // 9. Deploy FlashEpochs & KineticFees
        console.log("\n9. Deploying FlashEpochs & KineticFees...");
        // Base: 24h, min: 1h, max: 6h
        flashEpochs = new FlashEpochs(
            address(oracleManager),
            24 hours,
            1 hours,
            6 hours
        );
        console.log("FlashEpochs deployed at:", address(flashEpochs));
        // Ensure config matches thresholds and speed
        flashEpochs.updateConfig(24 hours, 1 hours, 6 hours, 2500, 6000, 1500);

        // Base fees: mgmt 1% (100 bps), perf 10% (1000 bps), coupon 0.30% (30 bps)
        kineticFees = new KineticFees(
            address(oracleManager),
            100,
            1000,
            30
        );
        console.log("KineticFees deployed at:", address(kineticFees));

        // 10. Initialize and configure
        console.log("\n10. Initializing contracts...");
        
        // Set vault in tranche tokens
        seniorToken.setVault(address(vault));
        juniorToken.setVault(address(vault));
        
        // Initialize vault
        vault.initialize(
            address(seniorToken),
            address(juniorToken),
            address(riskParams),
            address(oracleManager),
            address(strategyRegistry),
            address(pauseGuardian)
        );

        // Configure FlashEpochs & KineticFees in vault
        vault.setFlashEpochs(address(flashEpochs));
        vault.setKineticFees(address(kineticFees));

        // Grant KEEPER_ROLE in FlashEpochs to the Vault so it can call flash-trigger functions
        flashEpochs.grantRole(flashEpochs.KEEPER_ROLE(), address(vault));
        // Grant KEEPER_ROLE in KineticFees to keeper for updates
        kineticFees.grantRole(kineticFees.KEEPER_ROLE(), keeper);

        // Setup oracle price
        oracleManager.updatePrice(address(usdc), 1e8); // $1.00

        // Register mock strategy
        strategyRegistry.addStrategy(
            address(mockStrategy),
            address(mockStrategy),
            1_000_000e6, // 1M cap
            300 // 3x max leverage
        );

        console.log("\n11. Configuration complete!");

        // Output deployment addresses
        console.log("\n=== DEPLOYMENT ADDRESSES ===");
        console.log("USDC:", address(usdc));
        console.log("TrancheVault:", address(vault));
        console.log("SeniorToken:", address(seniorToken));
        console.log("JuniorToken:", address(juniorToken));
        console.log("RiskParams:", address(riskParams));
        console.log("OracleManager:", address(oracleManager));
        console.log("StrategyRegistry:", address(strategyRegistry));
        console.log("PauseGuardian:", address(pauseGuardian));
        console.log("MockStrategy:", address(mockStrategy));
        console.log("FlashEpochs:", address(flashEpochs));
        console.log("KineticFees:", address(kineticFees));
        console.log("============================");

        // Write to .env for frontend
        _writeDeploymentAddresses();

        vm.stopBroadcast();
    }

    function _writeDeploymentAddresses() internal {
        string memory output = string.concat(
            "# Deployed Contract Addresses\n",
            "TRANCHE_VAULT_ADDRESS=", vm.toString(address(vault)), "\n",
            "SENIOR_TOKEN_ADDRESS=", vm.toString(address(seniorToken)), "\n",
            "JUNIOR_TOKEN_ADDRESS=", vm.toString(address(juniorToken)), "\n",
            "RISK_PARAMS_ADDRESS=", vm.toString(address(riskParams)), "\n",
            "ORACLE_MANAGER_ADDRESS=", vm.toString(address(oracleManager)), "\n",
            "STRATEGY_REGISTRY_ADDRESS=", vm.toString(address(strategyRegistry)), "\n",
            "PAUSE_GUARDIAN_ADDRESS=", vm.toString(address(pauseGuardian)), "\n",
            "MOCK_STRATEGY_ADDRESS=", vm.toString(address(mockStrategy)), "\n",
            "MOCK_USDC_ADDRESS=", vm.toString(address(usdc)), "\n",
            "FLASH_EPOCHS_ADDRESS=", vm.toString(address(flashEpochs)), "\n",
            "KINETIC_FEES_ADDRESS=", vm.toString(address(kineticFees)), "\n"
        );

        vm.writeFile("deployments/rise.txt", output);
        console.log("\nDeployment addresses written to deployments/rise.txt");
    }
}
