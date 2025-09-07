// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MatchBoostNFT
 * @dev Topluluk/sponsor eşleşmesi; vesting NFT ile parça parça itfa
 */
contract MatchBoostNFT is ERC721, AccessControl {
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    
    struct MatchBoost {
        uint256 tokenId;
        address beneficiary;
        address sponsor;
        uint256 totalAmount;
        uint256 vestedAmount;
        uint256 vestingStart;
        uint256 vestingDuration;
        string purpose; // "Education", "Emergency Fund", "Startup Capital"
        bool isActive;
    }
    
    uint256 public tokenCounter;
    mapping(uint256 => MatchBoost) public matchBoosts;
    
    event MatchCreated(uint256 indexed tokenId, address indexed beneficiary, address indexed sponsor, uint256 amount);
    event VestingClaimed(uint256 indexed tokenId, uint256 amount);
    
    constructor() ERC721("FluxTranche MatchBoost", "FTMB") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function createMatch(
        address beneficiary,
        uint256 totalAmount,
        uint256 vestingDuration,
        string calldata purpose
    ) external payable onlyRole(SPONSOR_ROLE) returns (uint256 tokenId) {
        require(msg.value >= totalAmount, "Insufficient funds");
        
        tokenCounter++;
        tokenId = tokenCounter;
        
        matchBoosts[tokenId] = MatchBoost({
            tokenId: tokenId,
            beneficiary: beneficiary,
            sponsor: msg.sender,
            totalAmount: totalAmount,
            vestedAmount: 0,
            vestingStart: block.timestamp,
            vestingDuration: vestingDuration,
            purpose: purpose,
            isActive: true
        });
        
        _mint(beneficiary, tokenId);
        
        emit MatchCreated(tokenId, beneficiary, msg.sender, totalAmount);
        return tokenId;
    }
    
    function claimVesting(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
        MatchBoost storage boost = matchBoosts[tokenId];
        require(boost.isActive, "Not active");
        
        uint256 vestedAmount = _calculateVested(tokenId);
        uint256 claimable = vestedAmount - boost.vestedAmount;
        require(claimable > 0, "Nothing to claim");
        
        boost.vestedAmount += claimable;
        payable(msg.sender).transfer(claimable);
        
        emit VestingClaimed(tokenId, claimable);
    }
    
    function _calculateVested(uint256 tokenId) internal view returns (uint256) {
        MatchBoost memory boost = matchBoosts[tokenId];
        
        if (block.timestamp < boost.vestingStart) return 0;
        if (block.timestamp >= boost.vestingStart + boost.vestingDuration) {
            return boost.totalAmount;
        }
        
        uint256 elapsed = block.timestamp - boost.vestingStart;
        return (boost.totalAmount * elapsed) / boost.vestingDuration;
    }
    
    function getClaimableAmount(uint256 tokenId) external view returns (uint256) {
        MatchBoost memory boost = matchBoosts[tokenId];
        uint256 vested = _calculateVested(tokenId);
        return vested > boost.vestedAmount ? vested - boost.vestedAmount : 0;
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}