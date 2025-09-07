// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TrancheToken is ERC20, Ownable {
    uint8 public trancheType; // 0 = Senior, 1 = Junior, 2 = Mezzanine
    address public vault;

    error NotVault();
    error InvalidTranche();

    event VaultUpdated(address indexed oldVault, address indexed newVault);

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint8 _trancheType,
        address _owner
    ) ERC20(name, symbol) Ownable(_owner) {
        if (_trancheType > 2) revert InvalidTranche();
        trancheType = _trancheType;
    }

    function setVault(address _vault) external onlyOwner {
        address oldVault = vault;
        vault = _vault;
        emit VaultUpdated(oldVault, _vault);
    }

    function mint(address to, uint256 amount) external onlyVault {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyVault {
        _burn(from, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6; // Match USDC decimals
    }
}