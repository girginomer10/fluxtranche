// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PaydaySplitter
 * @dev Maaş gününde S/J/bill otomatik paylaştırma sistemi
 */
contract PaydaySplitter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct PaydayConfig {
        uint256 configId;
        address employee;
        uint256 paydayDay;           // Ayın hangi günü (1-31)
        uint256 salaryAmount;        // Beklenen maaş miktarı
        uint256 seniorAllocBps;      // Senior tahsisi (BPS)
        uint256 juniorAllocBps;      // Junior tahsisi (BPS)
        uint256 billsAllocBps;       // Fatura tahsisi (BPS)
        uint256 spendingAllocBps;    // Harcama tahsisi (BPS)
        bool isActive;
        bool autoExecute;            // Otomatik çalıştır mı?
    }
    
    struct BillSchedule {
        uint256 billId;
        string billName;             // "Electricity", "Rent", "Internet"
        address payee;               // Fatura ödenecek adres
        uint256 amount;              // Fatura tutarı
        uint256 dueDay;              // Ayın hangi günü ödenmeli (1-31)
        bool isActive;
        bool isRecurring;            // Tekrarlayan mı?
    }
    
    struct PaydaySplit {
        uint256 splitId;
        address employee;
        uint256 timestamp;
        uint256 totalAmount;
        uint256 seniorAmount;
        uint256 juniorAmount;
        uint256 billsAmount;
        uint256 spendingAmount;
        uint256 actualSalary;
        bool executed;
        string notes;
    }
    
    struct MonthlyBudget {
        uint256 month;               // YYYYMM format
        address employee;
        uint256 budgetedSalary;
        uint256 actualSalary;
        uint256 totalBills;
        uint256 remainingBills;
        uint256 spendingUsed;
        uint256 spendingRemaining;
        bool isComplete;
    }
    
    address public trancheVault;
    IERC20 public paymentToken;
    
    uint256 public configCounter;
    uint256 public billCounter;
    uint256 public splitCounter;
    
    mapping(uint256 => PaydayConfig) public paydayConfigs;
    mapping(address => uint256) public employeeConfigId;
    mapping(uint256 => BillSchedule[]) public employeeBills;
    mapping(uint256 => PaydaySplit) public paydaySplits;
    mapping(bytes32 => MonthlyBudget) public monthlyBudgets; // keccak256(employee, month) => budget
    
    // Spending accounts - kişisel harcama bakiyeleri
    mapping(address => uint256) public spendingBalances;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_BILLS_PER_USER = 20;
    
    event PaydayConfigCreated(
        uint256 indexed configId,
        address indexed employee,
        uint256 paydayDay,
        uint256 seniorAlloc,
        uint256 juniorAlloc,
        uint256 billsAlloc
    );
    
    event BillScheduleAdded(
        uint256 indexed configId,
        uint256 indexed billId,
        string billName,
        uint256 amount,
        uint256 dueDay
    );
    
    event PaydayExecuted(
        uint256 indexed splitId,
        address indexed employee,
        uint256 totalAmount,
        uint256 seniorAmount,
        uint256 juniorAmount,
        uint256 billsAmount
    );
    
    event BillPaid(
        uint256 indexed billId,
        address indexed employee,
        address indexed payee,
        uint256 amount,
        string billName
    );
    
    event SpendingWithdrawal(
        address indexed employee,
        uint256 amount,
        uint256 remainingBalance
    );
    
    error ConfigNotFound();
    error InvalidAllocation();
    error InsufficientSalary();
    error PaydayNotDue();
    error BillsLimitExceeded();
    error InsufficientSpendingBalance();
    error UnauthorizedEmployee();
    
    constructor(
        address _trancheVault,
        address _paymentToken
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        trancheVault = _trancheVault;
        paymentToken = IERC20(_paymentToken);
    }
    
    /**
     * @dev Payday konfigürasyonu oluştur
     */
    function createPaydayConfig(
        uint256 paydayDay,
        uint256 salaryAmount,
        uint256 seniorAllocBps,
        uint256 juniorAllocBps,
        uint256 billsAllocBps,
        uint256 spendingAllocBps
    ) external returns (uint256 configId) {
        // Toplam tahsis %100 olmalı
        if (seniorAllocBps + juniorAllocBps + billsAllocBps + spendingAllocBps != BPS) {
            revert InvalidAllocation();
        }
        if (paydayDay == 0 || paydayDay > 31) revert InvalidAllocation();
        
        configCounter++;
        configId = configCounter;
        
        paydayConfigs[configId] = PaydayConfig({
            configId: configId,
            employee: msg.sender,
            paydayDay: paydayDay,
            salaryAmount: salaryAmount,
            seniorAllocBps: seniorAllocBps,
            juniorAllocBps: juniorAllocBps,
            billsAllocBps: billsAllocBps,
            spendingAllocBps: spendingAllocBps,
            isActive: true,
            autoExecute: true
        });
        
        employeeConfigId[msg.sender] = configId;
        
        emit PaydayConfigCreated(
            configId,
            msg.sender,
            paydayDay,
            seniorAllocBps,
            juniorAllocBps,
            billsAllocBps
        );
        
        return configId;
    }
    
    /**
     * @dev Fatura programı ekle
     */
    function addBillSchedule(
        string calldata billName,
        address payee,
        uint256 amount,
        uint256 dueDay,
        bool isRecurring
    ) external returns (uint256 billId) {
        uint256 configId = employeeConfigId[msg.sender];
        if (configId == 0) revert ConfigNotFound();
        if (employeeBills[configId].length >= MAX_BILLS_PER_USER) revert BillsLimitExceeded();
        if (dueDay == 0 || dueDay > 31) revert InvalidAllocation();
        
        billCounter++;
        billId = billCounter;
        
        employeeBills[configId].push(BillSchedule({
            billId: billId,
            billName: billName,
            payee: payee,
            amount: amount,
            dueDay: dueDay,
            isActive: true,
            isRecurring: isRecurring
        }));
        
        emit BillScheduleAdded(configId, billId, billName, amount, dueDay);
        
        return billId;
    }
    
    /**
     * @dev Maaş gününü kontrol et ve splitter çalıştır
     */
    function executePaydaySplit(address employee) external onlyRole(KEEPER_ROLE) nonReentrant {
        uint256 configId = employeeConfigId[employee];
        if (configId == 0) revert ConfigNotFound();
        
        PaydayConfig memory config = paydayConfigs[configId];
        if (!config.isActive) revert ConfigNotFound();
        
        // Bugün payday mi kontrol et
        if (!_isPayday(config.paydayDay)) revert PaydayNotDue();
        
        // Bu ay için zaten split yapılmış mı kontrol et
        uint256 currentMonth = _getCurrentMonth();
        bytes32 budgetKey = keccak256(abi.encodePacked(employee, currentMonth));
        if (monthlyBudgets[budgetKey].actualSalary > 0) return; // Bu ay zaten yapılmış
        
        // Employee'nin bakiyesini kontrol et
        uint256 availableBalance = paymentToken.balanceOf(employee);
        if (availableBalance < config.salaryAmount) revert InsufficientSalary();
        
        // Split işlemini gerçekleştir
        _performPaydaySplit(configId, availableBalance);
    }
    
    /**
     * @dev Payday split işlemini gerçekleştir
     */
    function _performPaydaySplit(uint256 configId, uint256 actualSalary) internal {
        PaydayConfig memory config = paydayConfigs[configId];
        
        splitCounter++;
        uint256 splitId = splitCounter;
        
        // Tahsisleri hesapla
        uint256 seniorAmount = (actualSalary * config.seniorAllocBps) / BPS;
        uint256 juniorAmount = (actualSalary * config.juniorAllocBps) / BPS;
        uint256 billsAmount = (actualSalary * config.billsAllocBps) / BPS;
        uint256 spendingAmount = (actualSalary * config.spendingAllocBps) / BPS;
        
        // Employee'den token'ları al
        paymentToken.safeTransferFrom(config.employee, address(this), actualSalary);
        
        // Senior/Junior tranche'lere yatır (mock implementation)
        if (seniorAmount > 0) {
            _depositToTranche(config.employee, seniorAmount, 0); // Senior tranche
        }
        if (juniorAmount > 0) {
            _depositToTranche(config.employee, juniorAmount, 1); // Junior tranche
        }
        
        // Spending balance'ına ekle
        if (spendingAmount > 0) {
            spendingBalances[config.employee] += spendingAmount;
        }
        
        // Split kaydını oluştur
        paydaySplits[splitId] = PaydaySplit({
            splitId: splitId,
            employee: config.employee,
            timestamp: block.timestamp,
            totalAmount: actualSalary,
            seniorAmount: seniorAmount,
            juniorAmount: juniorAmount,
            billsAmount: billsAmount,
            spendingAmount: spendingAmount,
            actualSalary: actualSalary,
            executed: true,
            notes: "Automatic payday split"
        });
        
        // Aylık budget güncelle
        _updateMonthlyBudget(config.employee, actualSalary, billsAmount);
        
        emit PaydayExecuted(
            splitId,
            config.employee,
            actualSalary,
            seniorAmount,
            juniorAmount,
            billsAmount
        );
        
        // Faturaları öde
        _payScheduledBills(configId, billsAmount);
    }
    
    /**
     * @dev Zamanlanmış faturaları öde
     */
    function _payScheduledBills(uint256 configId, uint256 availableBillsAmount) internal {
        BillSchedule[] memory bills = employeeBills[configId];
        uint256 remainingAmount = availableBillsAmount;
        
        for (uint256 i = 0; i < bills.length && remainingAmount > 0; i++) {
            BillSchedule memory bill = bills[i];
            
            if (bill.isActive && _shouldPayBill(bill.dueDay)) {
                if (bill.amount <= remainingAmount) {
                    // Faturayı öde
                    paymentToken.safeTransfer(bill.payee, bill.amount);
                    remainingAmount -= bill.amount;
                    
                    emit BillPaid(
                        bill.billId,
                        paydayConfigs[configId].employee,
                        bill.payee,
                        bill.amount,
                        bill.billName
                    );
                }
            }
        }
        
        // Kalan tutarı spending balance'a ekle
        if (remainingAmount > 0) {
            spendingBalances[paydayConfigs[configId].employee] += remainingAmount;
        }
    }
    
    /**
     * @dev Spending balance'dan para çek
     */
    function withdrawSpending(uint256 amount) external nonReentrant {
        if (spendingBalances[msg.sender] < amount) revert InsufficientSpendingBalance();
        
        spendingBalances[msg.sender] -= amount;
        paymentToken.safeTransfer(msg.sender, amount);
        
        emit SpendingWithdrawal(msg.sender, amount, spendingBalances[msg.sender]);
    }
    
    /**
     * @dev Manuel fatura ödemesi
     */
    function payBillManually(uint256 billId) external nonReentrant {
        uint256 configId = employeeConfigId[msg.sender];
        if (configId == 0) revert UnauthorizedEmployee();
        
        BillSchedule[] storage bills = employeeBills[configId];
        BillSchedule memory targetBill;
        bool found = false;
        
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].billId == billId && bills[i].isActive) {
                targetBill = bills[i];
                found = true;
                break;
            }
        }
        
        if (!found) revert ConfigNotFound();
        if (spendingBalances[msg.sender] < targetBill.amount) revert InsufficientSpendingBalance();
        
        spendingBalances[msg.sender] -= targetBill.amount;
        paymentToken.safeTransfer(targetBill.payee, targetBill.amount);
        
        emit BillPaid(billId, msg.sender, targetBill.payee, targetBill.amount, targetBill.billName);
    }
    
    /**
     * @dev Tranche'a yatır (mock implementation)
     */
    function _depositToTranche(address user, uint256 amount, uint256 tranche) internal {
        // Mock - gerçekte TrancheVault.depositTranche() çağrılır
        // Şimdilik token'ları contract'ta tut
    }
    
    /**
     * @dev Bugün payday mi?
     */
    function _isPayday(uint256 paydayDay) internal view returns (bool) {
        uint256 currentDay = (block.timestamp / 86400 + 4) % 7; // Mock implementation
        return currentDay == paydayDay % 7; // Haftada bir test için
    }
    
    /**
     * @dev Fatura ödenecek mi?
     */
    function _shouldPayBill(uint256 dueDay) internal view returns (bool) {
        uint256 currentDay = (block.timestamp / 86400) % 31 + 1;
        return currentDay >= dueDay || currentDay <= dueDay + 3; // 3 gün tolerans
    }
    
    /**
     * @dev Mevcut ayı al (YYYYMM)
     */
    function _getCurrentMonth() internal view returns (uint256) {
        // Mock implementation - gerçekte timestamp'dan hesaplanır
        return 202409; // September 2024
    }
    
    /**
     * @dev Aylık budget'ı güncelle
     */
    function _updateMonthlyBudget(address employee, uint256 salary, uint256 billsAmount) internal {
        uint256 currentMonth = _getCurrentMonth();
        bytes32 budgetKey = keccak256(abi.encodePacked(employee, currentMonth));
        
        MonthlyBudget storage budget = monthlyBudgets[budgetKey];
        budget.month = currentMonth;
        budget.employee = employee;
        budget.actualSalary = salary;
        budget.totalBills = billsAmount;
        budget.remainingBills = billsAmount;
    }
    
    /**
     * @dev View functions
     */
    function getEmployeeConfig(address employee) external view returns (PaydayConfig memory) {
        uint256 configId = employeeConfigId[employee];
        return paydayConfigs[configId];
    }
    
    function getEmployeeBills(address employee) external view returns (BillSchedule[] memory) {
        uint256 configId = employeeConfigId[employee];
        return employeeBills[configId];
    }
    
    function getMonthlyBudget(address employee, uint256 month) external view returns (MonthlyBudget memory) {
        bytes32 budgetKey = keccak256(abi.encodePacked(employee, month));
        return monthlyBudgets[budgetKey];
    }
    
    function getRecentSplits(address employee, uint256 count) external view returns (PaydaySplit[] memory splits) {
        uint256 found = 0;
        splits = new PaydaySplit[](count);
        
        for (uint256 i = splitCounter; i > 0 && found < count; i--) {
            if (paydaySplits[i].employee == employee) {
                splits[found] = paydaySplits[i];
                found++;
            }
        }
    }
    
    /**
     * @dev Admin functions
     */
    function setTrancheVault(address _trancheVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trancheVault = _trancheVault;
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
    
    function updateEmployeeConfig(
        address employee,
        uint256 seniorAllocBps,
        uint256 juniorAllocBps,
        uint256 billsAllocBps,
        uint256 spendingAllocBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (seniorAllocBps + juniorAllocBps + billsAllocBps + spendingAllocBps != BPS) {
            revert InvalidAllocation();
        }
        
        uint256 configId = employeeConfigId[employee];
        PaydayConfig storage config = paydayConfigs[configId];
        config.seniorAllocBps = seniorAllocBps;
        config.juniorAllocBps = juniorAllocBps;
        config.billsAllocBps = billsAllocBps;
        config.spendingAllocBps = spendingAllocBps;
    }
}