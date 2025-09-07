// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RentEscrow
 * @dev Kira escrow'u; zamanında ödeyene rozet/indirim veren Punctuality SBT sistemi
 */
contract RentEscrow is ERC1155Supply, AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant LANDLORD_ROLE = keccak256("LANDLORD_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct RentAgreement {
        uint256 agreementId;
        address tenant;
        address landlord;
        uint256 monthlyRent;
        uint256 deposit;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
        uint256 consecutiveOnTimePayments;
        uint256 totalPayments;
        uint256 latePayments;
    }
    
    struct Payment {
        uint256 agreementId;
        uint256 amount;
        uint256 dueDate;
        uint256 paidDate;
        bool isPaid;
        bool isOnTime;
        uint256 latePenalty;
    }
    
    enum PunctualityBadge {
        PERFECT_TENANT,    // 100% on-time (12+ months)
        RELIABLE_PAYER,    // 95%+ on-time (6+ months)
        GOOD_TENANT,       // 85%+ on-time (3+ months)
        IMPROVING          // Recent improvement trend
    }
    
    IERC20 public paymentToken;
    
    uint256 public agreementCounter;
    mapping(uint256 => RentAgreement) public rentAgreements;
    mapping(uint256 => Payment[]) public rentPayments;
    mapping(address => uint256[]) public tenantAgreements;
    mapping(address => PunctualityBadge) public tenantBadges;
    mapping(address => uint256) public discountRates; // BPS
    
    uint256 public constant BPS = 10_000;
    uint256 public constant LATE_PENALTY_RATE = 500; // 5% of rent
    uint256 public constant GRACE_PERIOD = 3 days;
    
    // SBT Token IDs
    uint256 public constant PERFECT_TENANT_SBT = 1;
    uint256 public constant RELIABLE_PAYER_SBT = 2;
    uint256 public constant GOOD_TENANT_SBT = 3;
    uint256 public constant IMPROVING_SBT = 4;
    
    event RentAgreementCreated(uint256 indexed agreementId, address indexed tenant, address indexed landlord, uint256 monthlyRent);
    event RentPaid(uint256 indexed agreementId, uint256 amount, bool onTime);
    event PunctualityBadgeEarned(address indexed tenant, PunctualityBadge badge, uint256 discountRate);
    event DepositReturned(uint256 indexed agreementId, uint256 amount);
    
    constructor(address _paymentToken) ERC1155("https://fluxtranche.io/api/rent-sbt/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        paymentToken = IERC20(_paymentToken);
    }
    
    function createRentAgreement(
        address tenant,
        uint256 monthlyRent,
        uint256 deposit,
        uint256 startDate,
        uint256 endDate
    ) external onlyRole(LANDLORD_ROLE) returns (uint256 agreementId) {
        agreementCounter++;
        agreementId = agreementCounter;
        
        rentAgreements[agreementId] = RentAgreement({
            agreementId: agreementId,
            tenant: tenant,
            landlord: msg.sender,
            monthlyRent: monthlyRent,
            deposit: deposit,
            startDate: startDate,
            endDate: endDate,
            isActive: true,
            consecutiveOnTimePayments: 0,
            totalPayments: 0,
            latePayments: 0
        });
        
        tenantAgreements[tenant].push(agreementId);
        
        // Tenant deposits security deposit
        paymentToken.safeTransferFrom(tenant, address(this), deposit);
        
        emit RentAgreementCreated(agreementId, tenant, msg.sender, monthlyRent);
        return agreementId;
    }
    
    function payRent(uint256 agreementId) external {
        RentAgreement storage agreement = rentAgreements[agreementId];
        require(msg.sender == agreement.tenant, "Not tenant");
        require(agreement.isActive, "Agreement not active");
        
        uint256 currentMonth = _getCurrentPaymentMonth(agreementId);
        require(rentPayments[agreementId].length == currentMonth, "Payment already made");
        
        uint256 dueDate = agreement.startDate + (currentMonth * 30 days);
        bool isOnTime = block.timestamp <= dueDate + GRACE_PERIOD;
        
        uint256 paymentAmount = agreement.monthlyRent;
        uint256 latePenalty = 0;
        
        if (!isOnTime) {
            latePenalty = (agreement.monthlyRent * LATE_PENALTY_RATE) / BPS;
            paymentAmount += latePenalty;
        }
        
        // Apply discount if tenant has earned one
        if (discountRates[msg.sender] > 0) {
            uint256 discount = (agreement.monthlyRent * discountRates[msg.sender]) / BPS;
            paymentAmount -= discount;
        }
        
        rentPayments[agreementId].push(Payment({
            agreementId: agreementId,
            amount: paymentAmount,
            dueDate: dueDate,
            paidDate: block.timestamp,
            isPaid: true,
            isOnTime: isOnTime,
            latePenalty: latePenalty
        }));
        
        _updatePaymentStats(agreementId, isOnTime);
        _updatePunctualityBadge(agreement.tenant);
        
        paymentToken.safeTransferFrom(msg.sender, agreement.landlord, paymentAmount);
        
        emit RentPaid(agreementId, paymentAmount, isOnTime);
    }
    
    function _updatePaymentStats(uint256 agreementId, bool isOnTime) internal {
        RentAgreement storage agreement = rentAgreements[agreementId];
        agreement.totalPayments++;
        
        if (isOnTime) {
            agreement.consecutiveOnTimePayments++;
        } else {
            agreement.consecutiveOnTimePayments = 0;
            agreement.latePayments++;
        }
    }
    
    function _updatePunctualityBadge(address tenant) internal {
        uint256[] memory agreements = tenantAgreements[tenant];
        uint256 totalPayments = 0;
        uint256 onTimePayments = 0;
        uint256 maxConsecutive = 0;
        
        for (uint256 i = 0; i < agreements.length; i++) {
            RentAgreement storage agreement = rentAgreements[agreements[i]];
            totalPayments += agreement.totalPayments;
            onTimePayments += (agreement.totalPayments - agreement.latePayments);
            if (agreement.consecutiveOnTimePayments > maxConsecutive) {
                maxConsecutive = agreement.consecutiveOnTimePayments;
            }
        }
        
        if (totalPayments < 3) return; // Need at least 3 payments
        
        uint256 onTimeRate = (onTimePayments * BPS) / totalPayments;
        PunctualityBadge newBadge = tenantBadges[tenant];
        uint256 newDiscountRate = 0;
        
        if (onTimeRate >= 10000 && maxConsecutive >= 12) {
            newBadge = PunctualityBadge.PERFECT_TENANT;
            newDiscountRate = 1000; // 10% discount
            _mintBadge(tenant, PERFECT_TENANT_SBT);
        } else if (onTimeRate >= 9500 && maxConsecutive >= 6) {
            newBadge = PunctualityBadge.RELIABLE_PAYER;
            newDiscountRate = 500; // 5% discount
            _mintBadge(tenant, RELIABLE_PAYER_SBT);
        } else if (onTimeRate >= 8500 && maxConsecutive >= 3) {
            newBadge = PunctualityBadge.GOOD_TENANT;
            newDiscountRate = 250; // 2.5% discount
            _mintBadge(tenant, GOOD_TENANT_SBT);
        } else if (maxConsecutive >= 2) {
            newBadge = PunctualityBadge.IMPROVING;
            _mintBadge(tenant, IMPROVING_SBT);
        }
        
        if (newBadge != tenantBadges[tenant] || newDiscountRate != discountRates[tenant]) {
            tenantBadges[tenant] = newBadge;
            discountRates[tenant] = newDiscountRate;
            emit PunctualityBadgeEarned(tenant, newBadge, newDiscountRate);
        }
    }
    
    function _mintBadge(address tenant, uint256 tokenId) internal {
        if (balanceOf(tenant, tokenId) == 0) {
            _mint(tenant, tokenId, 1, "");
        }
    }
    
    function endRentAgreement(uint256 agreementId) external {
        RentAgreement storage agreement = rentAgreements[agreementId];
        require(msg.sender == agreement.landlord || msg.sender == agreement.tenant, "Not authorized");
        require(agreement.isActive, "Agreement not active");
        
        agreement.isActive = false;
        
        // Return deposit minus any damages/unpaid rent
        uint256 refundAmount = agreement.deposit;
        paymentToken.safeTransfer(agreement.tenant, refundAmount);
        
        emit DepositReturned(agreementId, refundAmount);
    }
    
    function _getCurrentPaymentMonth(uint256 agreementId) internal view returns (uint256) {
        RentAgreement memory agreement = rentAgreements[agreementId];
        if (block.timestamp < agreement.startDate) return 0;
        
        uint256 elapsed = block.timestamp - agreement.startDate;
        return (elapsed / 30 days) + 1;
    }
    
    function getTenantStats(address tenant) external view returns (
        uint256 totalAgreements,
        uint256 totalPayments,
        uint256 onTimePayments,
        uint256 currentStreak,
        PunctualityBadge badge,
        uint256 discount
    ) {
        uint256[] memory agreements = tenantAgreements[tenant];
        totalAgreements = agreements.length;
        
        for (uint256 i = 0; i < agreements.length; i++) {
            RentAgreement memory agreement = rentAgreements[agreements[i]];
            totalPayments += agreement.totalPayments;
            onTimePayments += (agreement.totalPayments - agreement.latePayments);
            if (agreement.consecutiveOnTimePayments > currentStreak) {
                currentStreak = agreement.consecutiveOnTimePayments;
            }
        }
        
        badge = tenantBadges[tenant];
        discount = discountRates[tenant];
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}