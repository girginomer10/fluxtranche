// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrategyAdapter.sol";

contract MockStrategy is IStrategyAdapter {
    IERC20 public asset;
    address public vault;
    uint256 public totalDeposited;
    int256 public mockReturn;
    bool public active = true;

    constructor(address _asset, address _vault) {
        asset = IERC20(_asset);
        vault = _vault;
        mockReturn = 500; // 5% default return
    }

    function target() external view override returns (address) {
        return address(this);
    }

    function requestFunds(uint256 amount) external override returns (uint256) {
        require(msg.sender == vault, "Only vault");
        asset.transferFrom(vault, address(this), amount);
        totalDeposited += amount;
        return amount;
    }

    function returnFunds(uint256 amount) external override returns (uint256) {
        require(msg.sender == vault, "Only vault");
        uint256 toReturn = amount > totalDeposited ? totalDeposited : amount;
        asset.transfer(vault, toReturn);
        totalDeposited -= toReturn;
        return toReturn;
    }

    function report() external view override returns (uint256 totalAssets, int256 pnl) {
        totalAssets = totalDeposited;
        pnl = (int256(totalDeposited) * mockReturn) / 10000;
    }

    function simulateEpochReturn(uint256 amount) external view override returns (int256) {
        return (int256(amount) * mockReturn) / 10000;
    }

    function isActive() external view override returns (bool) {
        return active;
    }

    function setMockReturn(int256 _return) external {
        mockReturn = _return;
    }

    function setActive(bool _active) external {
        active = _active;
    }
}