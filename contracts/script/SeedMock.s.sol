// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TrancheVault.sol";
import "../src/mocks/MockUSDC.sol";

contract SeedMock is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Seeding mock data...");

        // Load deployed addresses
        address vaultAddress = vm.envAddress("TRANCHE_VAULT_ADDRESS");
        address usdcAddress = vm.envAddress("MOCK_USDC_ADDRESS");
        
        MockUSDC usdc = MockUSDC(usdcAddress);
        TrancheVault vault = TrancheVault(vaultAddress);

        // Test addresses
        address alice = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address bob = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

        // Mint USDC to test users
        console.log("Minting USDC to test users...");
        usdc.mint(alice, 100_000e6); // 100k USDC
        usdc.mint(bob, 100_000e6);
        usdc.mint(vm.addr(deployerPrivateKey), 1_000_000e6); // 1M to deployer

        // Mint some to vault for liquidity
        usdc.mint(address(vault), 10_000e6);

        console.log("Seed data complete!");
        console.log("Alice balance:", usdc.balanceOf(alice) / 1e6, "USDC");
        console.log("Bob balance:", usdc.balanceOf(bob) / 1e6, "USDC");

        vm.stopBroadcast();
    }
}