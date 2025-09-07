// Standard ERC20 ABI (minimal)
export const ERC20ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const TrancheVaultABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "assets", "type": "uint256" },
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "uint256", "name": "tranche", "type": "uint256" }
    ],
    "name": "depositTranche",
    "outputs": [{ "internalType": "uint256", "name": "shares", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "shares", "type": "uint256" },
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "uint256", "name": "tranche", "type": "uint256" }
    ],
    "name": "withdrawTranche",
    "outputs": [{ "internalType": "uint256", "name": "assets", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tranche", "type": "uint256" }],
    "name": "getTrancheNAV",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSeniorAPY",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentEpoch",
    "outputs": [
      { "internalType": "uint256", "name": "index", "type": "uint256" },
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "uint256", "name": "seniorAssets", "type": "uint256" },
      { "internalType": "uint256", "name": "juniorAssets", "type": "uint256" },
      { "internalType": "int256", "name": "totalReturn", "type": "int256" },
      { "internalType": "bool", "name": "settled", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "canSettleEpoch",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalAssets",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "checkFlashTrigger",
    "outputs": [{ "internalType": "bool", "name": "shouldSettle", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "updateVolatilityAndCheckEpoch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_flashEpochs", "type": "address" }],
    "name": "setFlashEpochs",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_kineticFees", "type": "address" }],
    "name": "setKineticFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAdaptiveEpochDuration",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const RiskParamsABI = [
  {
    "inputs": [],
    "name": "getCurrentConfig",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "epochLength", "type": "uint256" },
          { "internalType": "uint256", "name": "seniorTargetBps", "type": "uint256" },
          { "internalType": "uint256", "name": "maxDrawdownBps", "type": "uint256" },
          { "internalType": "uint256", "name": "slippageBps", "type": "uint256" },
          { "internalType": "address[]", "name": "strategies", "type": "address[]" },
          { "internalType": "uint256[]", "name": "targetWeightsBps", "type": "uint256[]" },
          { "internalType": "uint256[]", "name": "caps", "type": "uint256[]" }
        ],
        "internalType": "struct RiskParams.RiskConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// FlashEpochs ABI (subset)
export const FlashEpochsABI = [
  {
    "inputs": [],
    "name": "calculateOptimalDuration",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVolatilityState",
    "outputs": [
      { "internalType": "uint256", "name": "currentVol", "type": "uint256" },
      { "internalType": "uint256", "name": "historicalVol", "type": "uint256" },
      { "internalType": "uint256", "name": "lastUpdateTime", "type": "uint256" },
      { "internalType": "uint256", "name": "volChangeRate", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAdaptiveConfig",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "baseEpochDuration", "type": "uint256" },
          { "internalType": "uint256", "name": "minEpochDuration", "type": "uint256" },
          { "internalType": "uint256", "name": "maxEpochDuration", "type": "uint256" },
          { "internalType": "uint256", "name": "volThresholdLow", "type": "uint256" },
          { "internalType": "uint256", "name": "volThresholdHigh", "type": "uint256" },
          { "internalType": "uint256", "name": "speedMultiplier", "type": "uint256" }
        ],
        "internalType": "struct FlashEpochs.AdaptiveConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// KineticFees ABI (subset)
export const KineticFeesABI = [
  {
    "inputs": [],
    "name": "getCurrentRates",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "managementFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "performanceFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "seniorCouponBps", "type": "uint256" },
          { "internalType": "uint256", "name": "entryFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "exitFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "lastUpdateTime", "type": "uint256" }
        ],
        "internalType": "struct KineticFees.DynamicRates",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const KineticFeesWriteABI = [
  {
    "inputs": [],
    "name": "updateKineticFees",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "managementFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "performanceFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "seniorCouponBps", "type": "uint256" },
          { "internalType": "uint256", "name": "entryFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "exitFeeBps", "type": "uint256" },
          { "internalType": "uint256", "name": "lastUpdateTime", "type": "uint256" }
        ],
        "internalType": "struct KineticFees.DynamicRates",
        "name": "newRates",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ERC1155 ABI (minimal for NFT transfers)
export const ERC1155ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes", "name": "data", "type": "bytes" }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" },
      { "internalType": "uint256", "name": "id", "type": "uint256" }
    ],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Laddered Epochs ABI (placeholder)
export const LadderedEpochsABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "assets", "type": "uint256" },
      { "internalType": "uint256[]", "name": "rungWeightsBps", "type": "uint256[]" }
    ],
    "name": "depositLadder",
    "outputs": [{ "internalType": "uint256[]", "name": "shares", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "rungId", "type": "uint256" }],
    "name": "settleRung",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLadderState",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalDeposited", "type": "uint256" },
          { "internalType": "uint256", "name": "pendingSettlement", "type": "uint256" },
          { "internalType": "uint256", "name": "averageYield", "type": "uint256" }
        ],
        "internalType": "struct LadderedEpochs.LadderState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Drawdown Shield ABI (placeholder)
export const DrawdownShieldABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "thresholdBps", "type": "uint256" },
      { "internalType": "uint256", "name": "notional", "type": "uint256" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "purchaseShield",
    "outputs": [{ "internalType": "string", "name": "policyId", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "policyId", "type": "string" }],
    "name": "claimShield",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalReserves", "type": "uint256" },
          { "internalType": "uint256", "name": "utilizationRate", "type": "uint256" },
          { "internalType": "uint256", "name": "totalPolicies", "type": "uint256" }
        ],
        "internalType": "struct DrawdownShield.PoolState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Yield Teleport ABI (placeholder)
export const YieldTeleportABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "epochs", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "advanceYield",
    "outputs": [{ "internalType": "string", "name": "noteId", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "noteId", "type": "string" }],
    "name": "redeemNote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalAdvanced", "type": "uint256" },
          { "internalType": "uint256", "name": "totalOutstanding", "type": "uint256" },
          { "internalType": "uint256", "name": "availableAdvance", "type": "uint256" }
        ],
        "internalType": "struct YieldTeleport.PoolState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Liquidity Staircase ABI (placeholder)
export const LiquidityStaircaseABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "rungId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "depositToRung",
    "outputs": [{ "internalType": "string", "name": "tokenId", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "tokenId", "type": "string" }],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalLiquidity", "type": "uint256" },
          { "internalType": "uint256", "name": "averageYield", "type": "uint256" },
          { "internalType": "uint256", "name": "totalNFTs", "type": "uint256" }
        ],
        "internalType": "struct LiquidityStaircase.PoolState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllRungs",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "rungId", "type": "uint256" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "uint256", "name": "minLiquidity", "type": "uint256" },
          { "internalType": "uint256", "name": "maxLiquidity", "type": "uint256" },
          { "internalType": "uint256", "name": "premium", "type": "uint256" },
          { "internalType": "uint256", "name": "lockDuration", "type": "uint256" },
          { "internalType": "uint256", "name": "yieldBoost", "type": "uint256" },
          { "internalType": "uint256", "name": "utilization", "type": "uint256" },
          { "internalType": "uint256", "name": "available", "type": "uint256" }
        ],
        "internalType": "struct LiquidityStaircase.StaircaseRung[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserNFTs",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "tokenId", "type": "string" },
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "uint256", "name": "rungId", "type": "uint256" },
          { "internalType": "uint256", "name": "principal", "type": "uint256" },
          { "internalType": "uint256", "name": "lockedUntil", "type": "uint256" },
          { "internalType": "uint256", "name": "yieldAccrued", "type": "uint256" },
          { "internalType": "uint256", "name": "totalYieldPotential", "type": "uint256" },
          { "internalType": "bool", "name": "isActive", "type": "bool" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
          { "internalType": "string", "name": "premiumTier", "type": "string" }
        ],
        "internalType": "struct LiquidityStaircase.LiquidityNFT[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "tokenId", "type": "string" },
      { "internalType": "uint256", "name": "newRungId", "type": "uint256" },
      { "internalType": "uint256", "name": "additionalAmount", "type": "uint256" }
    ],
    "name": "upgradeRung",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "tokenId", "type": "string" }],
    "name": "emergencyExit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "tokenId", "type": "string" }],
    "name": "claimYield",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "count", "type": "uint256" }],
    "name": "getRecentEvents",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "eventType", "type": "string" },
          { "internalType": "string", "name": "tokenId", "type": "string" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint256", "name": "rung", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "uint256", "name": "premium", "type": "uint256" }
        ],
        "internalType": "struct LiquidityStaircase.LiquidityEvent[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// CPPI Autopilot ABI
export const CPPIAutopilotABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "strategyId", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "customFloor", "type": "uint256" },
      { "internalType": "bool", "name": "autoRebalance", "type": "bool" }
    ],
    "name": "createPosition",
    "outputs": [{ "internalType": "string", "name": "positionId", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalAUM", "type": "uint256" },
          { "internalType": "uint256", "name": "totalPositions", "type": "uint256" },
          { "internalType": "uint256", "name": "averageMultiplier", "type": "uint256" },
          { "internalType": "uint256", "name": "successRate", "type": "uint256" }
        ],
        "internalType": "struct CPPIAutopilot.PoolState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// AutoCallable Note ABI
export const AutoCallableNoteABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "templateId", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes", "name": "customParams", "type": "bytes" }
    ],
    "name": "issueNote",
    "outputs": [{ "internalType": "string", "name": "tokenId", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalNotional", "type": "uint256" },
          { "internalType": "uint256", "name": "totalNotes", "type": "uint256" },
          { "internalType": "uint256", "name": "averageCouponRate", "type": "uint256" }
        ],
        "internalType": "struct AutoCallableNote.PoolState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Vol Target Index ABI
export const VolTargetIndexABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "strategyId", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "createPosition",
    "outputs": [{ "internalType": "string", "name": "positionId", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalAUM", "type": "uint256" },
          { "internalType": "uint256", "name": "averageTargetVol", "type": "uint256" },
          { "internalType": "uint256", "name": "averageRealizedVol", "type": "uint256" }
        ],
        "internalType": "struct VolTargetIndex.PoolState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Portfolio Tracker ABI
export const PortfolioTrackerABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "bool", "name": "isPublic", "type": "bool" }
    ],
    "name": "createPortfolio",
    "outputs": [{ "internalType": "string", "name": "portfolioId", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserPortfolios",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "id", "type": "string" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "uint256", "name": "totalValue", "type": "uint256" },
          { "internalType": "uint256", "name": "totalReturn", "type": "uint256" }
        ],
        "internalType": "struct PortfolioTracker.Portfolio[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract addresses (mock for demo)
export const CONTRACT_ADDRESSES = {
  TrancheVault: '0x1234567890123456789012345678901234567890',
  RiskParams: '0x2345678901234567890123456789012345678901',
  FlashEpochs: '0x3456789012345678901234567890123456789012',
  KineticFees: '0x4567890123456789012345678901234567890123',
  USDC: '0x5678901234567890123456789012345678901234'
} as const;