// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SettleUpSplitter
 * @dev SettleUp-Tarzı Harcama Paylaştırma — Ay sonu netleşen "ortak pot" → otomatik S/J yatırımı
 */
contract SettleUpSplitter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct ExpenseGroup {
        uint256 groupId;
        string name;
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => uint256) totalPaid; // Toplam ödenen
        mapping(address => uint256) totalOwed; // Toplam borçlu
        uint256 totalExpenses;
        bool isActive;
        uint256 settlementDate; // Ay sonu netleşme tarihi
        SettlementPreference settlement;
    }
    
    struct Expense {
        uint256 expenseId;
        uint256 groupId;
        address paidBy;
        uint256 amount;
        string description;
        address[] splitBetween;
        mapping(address => uint256) individualShare;
        uint256 timestamp;
        bool isSettled;
    }
    
    struct SettlementPreference {
        uint256 seniorPercentage; // Senior tranche için yüzde (BPS)
        uint256 juniorPercentage; // Junior tranche için yüzde (BPS) 
        bool autoInvest; // Otomatik yatırım yapılsın mı
        address trancheVault; // Hedef vault adresi
    }
    
    struct Settlement {
        uint256 settlementId;
        uint256 groupId;
        uint256 month;
        uint256 year;
        mapping(address => int256) netBalances; // Pozitif: alacak, negatif: borç
        mapping(address => bool) hasSettled;
        uint256 totalInvested;
        bool isComplete;
    }
    
    IERC20 public paymentToken;
    address public trancheVault;
    
    uint256 public groupCounter;
    uint256 public expenseCounter;
    uint256 public settlementCounter;
    
    mapping(uint256 => ExpenseGroup) public groups;
    mapping(uint256 => Expense) public expenses;
    mapping(uint256 => Settlement) public settlements;
    mapping(address => uint256[]) public userGroups;
    mapping(uint256 => uint256[]) public groupExpenses;
    mapping(uint256 => uint256[]) public groupSettlements;
    
    uint256 public constant BPS = 10_000;
    
    event GroupCreated(uint256 indexed groupId, string name, address[] members);
    event ExpenseAdded(uint256 indexed expenseId, uint256 indexed groupId, address indexed paidBy, uint256 amount, string description);
    event MonthlySettlement(uint256 indexed settlementId, uint256 indexed groupId, uint256 month, uint256 year);
    event UserSettled(uint256 indexed settlementId, address indexed user, int256 netBalance, uint256 investedAmount);
    event AutoInvestment(address indexed user, uint256 seniorAmount, uint256 juniorAmount);
    
    constructor(address _paymentToken, address _trancheVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        paymentToken = IERC20(_paymentToken);
        trancheVault = _trancheVault;
    }
    
    function createGroup(
        string calldata name,
        address[] calldata members,
        SettlementPreference calldata preference
    ) external returns (uint256 groupId) {
        require(members.length > 1, "Need at least 2 members");
        require(preference.seniorPercentage + preference.juniorPercentage <= BPS, "Invalid percentages");
        
        groupCounter++;
        groupId = groupCounter;
        
        ExpenseGroup storage group = groups[groupId];
        group.groupId = groupId;
        group.name = name;
        group.members = members;
        group.isActive = true;
        group.settlementDate = _getNextSettlementDate();
        group.settlement = preference;
        
        // Set member flags
        for (uint256 i = 0; i < members.length; i++) {
            group.isMember[members[i]] = true;
            userGroups[members[i]].push(groupId);
        }
        
        emit GroupCreated(groupId, name, members);
        return groupId;
    }
    
    function addExpense(
        uint256 groupId,
        uint256 amount,
        string calldata description,
        address[] calldata splitBetween
    ) external nonReentrant {
        ExpenseGroup storage group = groups[groupId];
        require(group.isActive, "Group not active");
        require(group.isMember[msg.sender], "Not a group member");
        require(splitBetween.length > 0, "Must split between someone");
        
        // Transfer payment from user
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        expenseCounter++;
        uint256 expenseId = expenseCounter;
        
        Expense storage expense = expenses[expenseId];
        expense.expenseId = expenseId;
        expense.groupId = groupId;
        expense.paidBy = msg.sender;
        expense.amount = amount;
        expense.description = description;
        expense.splitBetween = splitBetween;
        expense.timestamp = block.timestamp;
        
        // Calculate individual shares (equal split for now)
        uint256 sharePerPerson = amount / splitBetween.length;
        for (uint256 i = 0; i < splitBetween.length; i++) {
            require(group.isMember[splitBetween[i]], "Split member not in group");
            expense.individualShare[splitBetween[i]] = sharePerPerson;
            group.totalOwed[splitBetween[i]] += sharePerPerson;
        }
        
        group.totalPaid[msg.sender] += amount;
        group.totalExpenses += amount;
        groupExpenses[groupId].push(expenseId);
        
        emit ExpenseAdded(expenseId, groupId, msg.sender, amount, description);
    }
    
    function triggerMonthlySettlement(uint256 groupId) external onlyRole(KEEPER_ROLE) {
        ExpenseGroup storage group = groups[groupId];
        require(group.isActive, "Group not active");
        require(block.timestamp >= group.settlementDate, "Settlement date not reached");
        
        settlementCounter++;
        uint256 settlementId = settlementCounter;
        
        Settlement storage settlement = settlements[settlementId];
        settlement.settlementId = settlementId;
        settlement.groupId = groupId;
        settlement.month = _getCurrentMonth();
        settlement.year = _getCurrentYear();
        
        // Calculate net balances for each member
        for (uint256 i = 0; i < group.members.length; i++) {
            address member = group.members[i];
            int256 netBalance = int256(group.totalPaid[member]) - int256(group.totalOwed[member]);
            settlement.netBalances[member] = netBalance;
            
            // Reset monthly balances
            group.totalPaid[member] = 0;
            group.totalOwed[member] = 0;
        }
        
        group.totalExpenses = 0;
        group.settlementDate = _getNextSettlementDate();
        groupSettlements[groupId].push(settlementId);
        
        emit MonthlySettlement(settlementId, groupId, settlement.month, settlement.year);
    }
    
    function settleBalance(uint256 settlementId) external nonReentrant {
        Settlement storage settlement = settlements[settlementId];
        require(!settlement.hasSettled[msg.sender], "Already settled");
        
        ExpenseGroup storage group = groups[settlement.groupId];
        require(group.isMember[msg.sender], "Not a group member");
        
        int256 netBalance = settlement.netBalances[msg.sender];
        settlement.hasSettled[msg.sender] = true;
        
        if (netBalance < 0) {
            // User owes money - pay into contract
            uint256 amountToPay = uint256(-netBalance);
            paymentToken.safeTransferFrom(msg.sender, address(this), amountToPay);
        } else if (netBalance > 0) {
            // User is owed money - receive payment
            uint256 amountToReceive = uint256(netBalance);
            paymentToken.safeTransfer(msg.sender, amountToReceive);
        }
        
        // Auto-invest surplus if enabled
        uint256 investmentAmount = 0;
        if (group.settlement.autoInvest && netBalance < 0) {
            investmentAmount = uint256(-netBalance);
            _autoInvest(msg.sender, investmentAmount, group.settlement);
            settlement.totalInvested += investmentAmount;
        }
        
        emit UserSettled(settlementId, msg.sender, netBalance, investmentAmount);
    }
    
    function _autoInvest(
        address user,
        uint256 amount,
        SettlementPreference memory preference
    ) internal {
        if (!preference.autoInvest || preference.trancheVault == address(0)) return;
        
        uint256 seniorAmount = (amount * preference.seniorPercentage) / BPS;
        uint256 juniorAmount = (amount * preference.juniorPercentage) / BPS;
        uint256 remainingAmount = amount - seniorAmount - juniorAmount;
        
        // Transfer to tranche vault for investment
        if (seniorAmount + juniorAmount > 0) {
            paymentToken.safeTransfer(preference.trancheVault, seniorAmount + juniorAmount);
            
            // Note: In a full implementation, we would call the vault's deposit function
            // with tranche specifications here
            
            emit AutoInvestment(user, seniorAmount, juniorAmount);
        }
        
        // Return any remaining amount to user
        if (remainingAmount > 0) {
            paymentToken.safeTransfer(user, remainingAmount);
        }
    }
    
    function getGroupBalance(uint256 groupId, address user) external view returns (
        uint256 totalPaid,
        uint256 totalOwed,
        int256 currentBalance
    ) {
        ExpenseGroup storage group = groups[groupId];
        totalPaid = group.totalPaid[user];
        totalOwed = group.totalOwed[user];
        currentBalance = int256(totalPaid) - int256(totalOwed);
    }
    
    function getSettlementBalance(uint256 settlementId, address user) external view returns (
        int256 netBalance,
        bool hasSettled
    ) {
        Settlement storage settlement = settlements[settlementId];
        netBalance = settlement.netBalances[user];
        hasSettled = settlement.hasSettled[user];
    }
    
    function getUserGroups(address user) external view returns (uint256[] memory) {
        return userGroups[user];
    }
    
    function getGroupExpenses(uint256 groupId) external view returns (uint256[] memory) {
        return groupExpenses[groupId];
    }
    
    function _getCurrentMonth() internal view returns (uint256) {
        return ((block.timestamp / 30 days) % 12) + 1;
    }
    
    function _getCurrentYear() internal view returns (uint256) {
        return 2024 + (block.timestamp / 365 days);
    }
    
    function _getNextSettlementDate() internal view returns (uint256) {
        uint256 currentMonth = _getCurrentMonth();
        uint256 currentYear = _getCurrentYear();
        
        // Last day of current month
        if (currentMonth == 12) {
            return block.timestamp + (31 days - (block.timestamp % 30 days));
        } else {
            return block.timestamp + (30 days - (block.timestamp % 30 days));
        }
    }
    
    function emergencyWithdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        paymentToken.safeTransfer(msg.sender, amount);
    }
    
    function updateGroupPreference(
        uint256 groupId,
        SettlementPreference calldata newPreference
    ) external {
        ExpenseGroup storage group = groups[groupId];
        require(group.isMember[msg.sender], "Not a group member");
        require(newPreference.seniorPercentage + newPreference.juniorPercentage <= BPS, "Invalid percentages");
        
        group.settlement = newPreference;
    }
}