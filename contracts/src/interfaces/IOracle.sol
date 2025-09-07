// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOracle {
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp);
    function getTwap(address token, uint256 window) external view returns (uint256 twap);
    function checkDeviation(address token, uint256 maxDeviationBps) external view returns (bool isValid, uint256 deviation);
}