// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStrategyAdapter {
    function target() external view returns (address);
    function requestFunds(uint256 amount) external returns (uint256);
    function returnFunds(uint256 amount) external returns (uint256);
    function report() external view returns (uint256 totalAssets, int256 pnl);
    function simulateEpochReturn(uint256 amount) external view returns (int256);
    function isActive() external view returns (bool);
}