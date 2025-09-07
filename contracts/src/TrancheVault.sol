// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TrancheToken.sol";
import "./RiskParams.sol";
import "./OracleManager.sol";
import "./StrategyRegistry.sol";
import "./PauseGuardian.sol";
import "./FlashEpochs.sol";
import "./KineticFees.sol";

contract TrancheVault is ERC4626, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    uint256 public constant BPS = 10_000;
    uint256 public constant SENIOR_TRANCHE = 0;
    uint256 public constant JUNIOR_TRANCHE = 1;

    struct EpochInfo {
        uint256 index;
        uint256 startTime;
        uint256 endTime;
        uint256 seniorAssets;
        uint256 juniorAssets;
        int256 totalReturn;
        bool settled;
    }

    struct TrancheInfo {
        uint256 totalAssets;
        uint256 totalSupply;
        uint256 targetReturn; // For senior only
        uint256 accruedFees;
    }

    TrancheToken public seniorToken;
    TrancheToken public juniorToken;
    RiskParams public riskParams;
    OracleManager public oracleManager;
    StrategyRegistry public strategyRegistry;
    PauseGuardian public pauseGuardian;
    FlashEpochs public flashEpochs;
    KineticFees public kineticFees;

    EpochInfo public currentEpoch;
    mapping(uint256 => TrancheInfo) public trancheInfo;
    // Track epoch start block to enforce same-block restrictions properly
    uint256 public currentEpochStartBlock;
    
    uint256 public managementFeeBps = 100; // 1% annual
    uint256 public performanceFeeBps = 1000; // 10% on junior profits
    uint256 public lastFeeCollection;
    uint256 public highWatermark;
    
    address public treasury;

    event TrancheDeposit(
        address indexed user,
        uint256 indexed tranche,
        uint256 assets,
        uint256 shares
    );
    event TrancheWithdraw(
        address indexed user,
        uint256 indexed tranche,
        uint256 assets,
        uint256 shares
    );
    event EpochStarted(uint256 indexed epochIndex, uint256 endTime);
    event EpochSettled(
        uint256 indexed epochIndex,
        int256 totalReturn,
        uint256 seniorPaid,
        uint256 juniorPnL
    );
    event SeniorPaid(uint256 indexed epochIndex, uint256 amount);
    event JuniorAbsorbedLoss(uint256 indexed epochIndex, uint256 loss);
    event FeesCollected(uint256 management, uint256 performance);
    event FlashEpochTriggered(uint256 epochIndex, uint256 currentVol);

    error EpochNotEnded();
    error EpochAlreadySettled();
    error InvalidTranche();
    error DepositsDisabled();
    error WithdrawalsDisabled();
    error OracleDeviation();
    error InsufficientLiquidity();
    error SameBlockRestriction();

    modifier whenDepositsEnabled() {
        if (!pauseGuardian.canDeposit()) revert DepositsDisabled();
        _;
    }

    modifier whenWithdrawalsEnabled() {
        if (!pauseGuardian.canWithdraw()) revert WithdrawalsDisabled();
        _;
    }

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _admin,
        address _keeper,
        address _treasury
    ) ERC4626(_asset) ERC20(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(KEEPER_ROLE, _keeper);
        treasury = _treasury;
        lastFeeCollection = block.timestamp;
    }

    function initialize(
        address _seniorToken,
        address _juniorToken,
        address _riskParams,
        address _oracleManager,
        address _strategyRegistry,
        address _pauseGuardian
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        seniorToken = TrancheToken(_seniorToken);
        juniorToken = TrancheToken(_juniorToken);
        riskParams = RiskParams(_riskParams);
        oracleManager = OracleManager(_oracleManager);
        strategyRegistry = StrategyRegistry(_strategyRegistry);
        pauseGuardian = PauseGuardian(_pauseGuardian);

        // Start first epoch
        _startNewEpoch();
    }

    function depositTranche(
        uint256 assets,
        address receiver,
        uint256 tranche
    ) external nonReentrant whenDepositsEnabled returns (uint256 shares) {
        if (tranche > JUNIOR_TRANCHE) revert InvalidTranche();
        if (block.number == currentEpochStartBlock) revert SameBlockRestriction();

        // Transfer assets from user
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);

        // Calculate shares based on tranche NAV
        shares = _convertToTrancheShares(assets, tranche);

        // Mint tranche tokens
        TrancheToken token = tranche == SENIOR_TRANCHE ? seniorToken : juniorToken;
        token.mint(receiver, shares);

        // Update tranche info
        trancheInfo[tranche].totalAssets += assets;
        trancheInfo[tranche].totalSupply += shares;

        emit TrancheDeposit(msg.sender, tranche, assets, shares);
    }

    function withdrawTranche(
        uint256 shares,
        address receiver,
        uint256 tranche
    ) external nonReentrant whenWithdrawalsEnabled returns (uint256 assets) {
        if (tranche > JUNIOR_TRANCHE) revert InvalidTranche();
        if (block.number == currentEpochStartBlock) revert SameBlockRestriction();

        TrancheToken token = tranche == SENIOR_TRANCHE ? seniorToken : juniorToken;
        
        // Calculate assets based on tranche NAV
        assets = _convertToTrancheAssets(shares, tranche);

        // Check liquidity
        if (IERC20(asset()).balanceOf(address(this)) < assets) {
            revert InsufficientLiquidity();
        }

        // Burn tranche tokens
        token.burn(msg.sender, shares);

        // Update tranche info
        trancheInfo[tranche].totalAssets -= assets;
        trancheInfo[tranche].totalSupply -= shares;

        // Transfer assets to receiver
        IERC20(asset()).safeTransfer(receiver, assets);

        emit TrancheWithdraw(msg.sender, tranche, assets, shares);
    }

    function settleEpoch() external onlyRole(KEEPER_ROLE) {
        if (block.timestamp < currentEpoch.endTime) revert EpochNotEnded();
        if (currentEpoch.settled) revert EpochAlreadySettled();

        // Check oracle deviation
        (bool isValid, ) = oracleManager.checkDeviation(
            address(asset()),
            riskParams.getCurrentConfig().maxDrawdownBps
        );
        if (!isValid) revert OracleDeviation();

        // Calculate total return from strategies
        int256 totalReturn = _calculateTotalReturn();
        
        // Collect fees
        uint256 feesCollected = _collectFees();

        // Apply waterfall distribution
        (uint256 seniorPaid, uint256 juniorPnL) = _applyWaterfall(totalReturn);

        // Mark epoch as settled
        currentEpoch.totalReturn = totalReturn;
        currentEpoch.settled = true;

        emit EpochSettled(currentEpoch.index, totalReturn, seniorPaid, juniorPnL);
        emit FeesCollected(feesCollected, 0);

        // Start new epoch
        _startNewEpoch();
    }

    function _startNewEpoch() internal {
        // Get adaptive epoch duration from FlashEpochs
        uint256 adaptiveDuration = address(flashEpochs) != address(0) 
            ? flashEpochs.calculateOptimalDuration()
            : riskParams.getCurrentConfig().epochLength;
        
        currentEpoch = EpochInfo({
            index: currentEpoch.index + 1,
            startTime: block.timestamp,
            endTime: block.timestamp + adaptiveDuration,
            seniorAssets: trancheInfo[SENIOR_TRANCHE].totalAssets,
            juniorAssets: trancheInfo[JUNIOR_TRANCHE].totalAssets,
            totalReturn: 0,
            settled: false
        });
        currentEpochStartBlock = block.number;

        emit EpochStarted(currentEpoch.index, currentEpoch.endTime);
    }

    function _calculateTotalReturn() internal view returns (int256 totalReturn) {
        // Mock calculation for MVP
        // In production, would aggregate returns from all strategies
        uint256 totalAssets = trancheInfo[SENIOR_TRANCHE].totalAssets + 
                              trancheInfo[JUNIOR_TRANCHE].totalAssets;
        
        // Simulate 5% APY return
        totalReturn = int256((totalAssets * 500) / BPS / 365);
    }

    function _collectFees() internal returns (uint256 totalFees) {
        uint256 totalAssets = trancheInfo[SENIOR_TRANCHE].totalAssets + 
                              trancheInfo[JUNIOR_TRANCHE].totalAssets;
        
        // Determine management fee bps (dynamic if KineticFees is set)
        uint256 mgmtBps = managementFeeBps;
        if (address(kineticFees) != address(0)) {
            KineticFees.DynamicRates memory rates = kineticFees.getCurrentRates();
            mgmtBps = rates.managementFeeBps;
        }

        // Management fee
        uint256 timePassed = block.timestamp - lastFeeCollection;
        uint256 managementFee = (totalAssets * mgmtBps * timePassed) / 
                                (BPS * 365 days);
        
        lastFeeCollection = block.timestamp;
        totalFees = managementFee;

        if (treasury != address(0) && totalFees > 0) {
            IERC20(asset()).safeTransfer(treasury, totalFees);
        }
    }

    function _applyWaterfall(int256 totalReturn) internal returns (
        uint256 seniorPaid,
        uint256 juniorPnL
    ) {
        RiskParams.RiskConfig memory config = riskParams.getCurrentConfig();

        // Determine dynamic rates if KineticFees is set
        uint256 perfBps = performanceFeeBps;
        uint256 seniorCouponBps = config.seniorTargetBps;
        if (address(kineticFees) != address(0)) {
            KineticFees.DynamicRates memory rates = kineticFees.getCurrentRates();
            perfBps = rates.performanceFeeBps;
            seniorCouponBps = rates.seniorCouponBps;
        }
        
        // Calculate senior target return
        uint256 seniorTarget = (trancheInfo[SENIOR_TRANCHE].totalAssets * 
                                seniorCouponBps) / BPS;

        if (totalReturn > 0) {
            uint256 profit = uint256(totalReturn);
            
            // Pay senior target first
            seniorPaid = profit >= seniorTarget ? seniorTarget : profit;
            trancheInfo[SENIOR_TRANCHE].totalAssets += seniorPaid;
            
            // Remaining profit to junior
            if (profit > seniorPaid) {
                juniorPnL = profit - seniorPaid;
                
                // Apply performance fee on junior profits (dynamic if available)
                uint256 performanceFee = (juniorPnL * perfBps) / BPS;
                juniorPnL -= performanceFee;
                
                trancheInfo[JUNIOR_TRANCHE].totalAssets += juniorPnL;
                
                if (treasury != address(0) && performanceFee > 0) {
                    IERC20(asset()).safeTransfer(treasury, performanceFee);
                }
            }
            
            emit SeniorPaid(currentEpoch.index, seniorPaid);
        } else {
            // Loss scenario - junior absorbs first
            uint256 loss = uint256(-totalReturn);
            
            if (trancheInfo[JUNIOR_TRANCHE].totalAssets >= loss) {
                trancheInfo[JUNIOR_TRANCHE].totalAssets -= loss;
                juniorPnL = loss; // Recorded as loss
            } else {
                // Junior wiped out, senior takes remaining loss
                uint256 juniorLoss = trancheInfo[JUNIOR_TRANCHE].totalAssets;
                trancheInfo[JUNIOR_TRANCHE].totalAssets = 0;
                
                uint256 seniorLoss = loss - juniorLoss;
                trancheInfo[SENIOR_TRANCHE].totalAssets -= seniorLoss;
                
                juniorPnL = juniorLoss;
            }
            
            emit JuniorAbsorbedLoss(currentEpoch.index, juniorPnL);
        }
    }

    function _convertToTrancheShares(
        uint256 assets,
        uint256 tranche
    ) internal view returns (uint256) {
        uint256 supply = trancheInfo[tranche].totalSupply;
        if (supply == 0) {
            return assets; // 1:1 for first deposit
        }
        return (assets * supply) / trancheInfo[tranche].totalAssets;
    }

    function _convertToTrancheAssets(
        uint256 shares,
        uint256 tranche
    ) internal view returns (uint256) {
        uint256 supply = trancheInfo[tranche].totalSupply;
        if (supply == 0) {
            return 0;
        }
        return (shares * trancheInfo[tranche].totalAssets) / supply;
    }

    // ERC4626 Overrides
    function totalAssets() public view override returns (uint256) {
        return trancheInfo[SENIOR_TRANCHE].totalAssets + 
               trancheInfo[JUNIOR_TRANCHE].totalAssets;
    }

    function deposit(uint256, address) public pure override returns (uint256) {
        revert("Use depositTranche");
    }

    function withdraw(uint256, address, address) public pure override returns (uint256) {
        revert("Use withdrawTranche");
    }

    function mint(uint256, address) public pure override returns (uint256) {
        revert("Use depositTranche");
    }

    function redeem(uint256, address, address) public pure override returns (uint256) {
        revert("Use withdrawTranche");
    }

    // View functions
    function getTrancheNAV(uint256 tranche) external view returns (uint256) {
        if (trancheInfo[tranche].totalSupply == 0) return 1e6; // 1:1 initial
        return (trancheInfo[tranche].totalAssets * 1e6) / trancheInfo[tranche].totalSupply;
    }

    function getSeniorAPY() external view returns (uint256) {
        RiskParams.RiskConfig memory config = riskParams.getCurrentConfig();
        // Annualized: (targetBps per epoch) * (epochs per year)
        uint256 epochsPerYear = 365 days / config.epochLength;
        return config.seniorTargetBps * epochsPerYear;
    }

    // Flash Epochs Integration
    function checkFlashTrigger() external onlyRole(KEEPER_ROLE) returns (bool shouldSettle) {
        if (address(flashEpochs) == address(0)) return false;
        
        bool flashTriggered = flashEpochs.flashTrigger();
        if (flashTriggered) {
            (uint256 currentVol,,,) = flashEpochs.getVolatilityState();
            emit FlashEpochTriggered(currentEpoch.index, currentVol);
            
            // Force early settlement if conditions met
            return true;
        }
        
        return false;
    }
    
    function updateVolatilityAndCheckEpoch() external onlyRole(KEEPER_ROLE) {
        if (address(flashEpochs) != address(0)) {
            flashEpochs.updateVolatilityAndDuration();
        }
    }
    
    function setFlashEpochs(address _flashEpochs) external onlyRole(DEFAULT_ADMIN_ROLE) {
        flashEpochs = FlashEpochs(_flashEpochs);
    }
    
    function setKineticFees(address _kineticFees) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kineticFees = KineticFees(_kineticFees);
    }
    
    function getAdaptiveEpochDuration() external view returns (uint256) {
        return address(flashEpochs) != address(0) 
            ? flashEpochs.calculateOptimalDuration()
            : riskParams.getCurrentConfig().epochLength;
    }

    function canSettleEpoch() external view returns (bool) {
        return block.timestamp >= currentEpoch.endTime && !currentEpoch.settled;
    }
}
