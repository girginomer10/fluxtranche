// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract PauseGuardian is AccessControl {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    bool public depositsPaused;
    bool public withdrawalsPaused;
    bool public emergencyMode;

    event DepositsPaused();
    event DepositsUnpaused();
    event WithdrawalsPaused();
    event WithdrawalsUnpaused();
    event EmergencyModeActivated();
    event EmergencyModeDeactivated();

    error AlreadyPaused();
    error NotPaused();
    error EmergencyActive();

    constructor(address admin, address guardian) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, guardian);
    }

    function pauseDeposits() external onlyRole(GUARDIAN_ROLE) {
        if (depositsPaused) revert AlreadyPaused();
        depositsPaused = true;
        emit DepositsPaused();
    }

    function unpauseDeposits() external onlyRole(GUARDIAN_ROLE) {
        if (!depositsPaused) revert NotPaused();
        if (emergencyMode) revert EmergencyActive();
        depositsPaused = false;
        emit DepositsUnpaused();
    }

    function pauseWithdrawals() external onlyRole(GUARDIAN_ROLE) {
        if (withdrawalsPaused) revert AlreadyPaused();
        withdrawalsPaused = true;
        emit WithdrawalsPaused();
    }

    function unpauseWithdrawals() external onlyRole(GUARDIAN_ROLE) {
        if (!withdrawalsPaused) revert NotPaused();
        withdrawalsPaused = false;
        emit WithdrawalsUnpaused();
    }

    function activateEmergencyMode() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (emergencyMode) revert AlreadyPaused();
        emergencyMode = true;
        depositsPaused = true;
        emit EmergencyModeActivated();
        emit DepositsPaused();
    }

    function deactivateEmergencyMode() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!emergencyMode) revert NotPaused();
        emergencyMode = false;
        depositsPaused = false;
        withdrawalsPaused = false;
        emit EmergencyModeDeactivated();
        emit DepositsUnpaused();
        emit WithdrawalsUnpaused();
    }

    function canDeposit() external view returns (bool) {
        return !depositsPaused && !emergencyMode;
    }

    function canWithdraw() external view returns (bool) {
        return !withdrawalsPaused || emergencyMode;
    }
}