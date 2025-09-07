import { ethers } from 'ethers';
import { logger } from '../utils/logger';

// Contract ABIs (minimal for keeper operations)
const TRANCHE_VAULT_ABI = [
  'function settleEpoch() external',
  'function canSettleEpoch() external view returns (bool)',
  'function currentEpoch() external view returns (uint256 index, uint256 startTime, uint256 endTime, uint256 seniorAssets, uint256 juniorAssets, int256 totalReturn, bool settled)',
  'function totalAssets() external view returns (uint256)',
  'event EpochSettled(uint256 indexed epochIndex, int256 totalReturn, uint256 seniorPaid, uint256 juniorPnL)'
];

const RISK_PARAMS_ABI = [
  'function executeParams() external',
  'function canExecute() external view returns (bool)',
  'function getCurrentConfig() external view returns (tuple(uint256 epochLength, uint256 seniorTargetBps, uint256 maxDrawdownBps, uint256 slippageBps, address[] strategies, uint256[] targetWeightsBps, uint256[] caps))',
  'event ParamsExecuted(tuple(uint256 epochLength, uint256 seniorTargetBps, uint256 maxDrawdownBps, uint256 slippageBps, address[] strategies, uint256[] targetWeightsBps, uint256[] caps) config)'
];

export class ContractService {
  private wallet: ethers.Wallet;
  private vaultAddresses: string[];
  private riskParamsAddress: string;

  constructor(wallet: ethers.Wallet) {
    this.wallet = wallet;
    
    // Load contract addresses from environment
    this.vaultAddresses = [
      process.env.TRANCHE_VAULT_ADDRESS || ''
    ].filter(addr => addr !== '');
    
    this.riskParamsAddress = process.env.RISK_PARAMS_ADDRESS || '';
    
    if (this.vaultAddresses.length === 0) {
      logger.warn('No vault addresses configured');
    }
    
    if (!this.riskParamsAddress) {
      logger.warn('No risk params address configured');
    }
    
    logger.info('ContractService initialized', {
      vaults: this.vaultAddresses.length,
      riskParams: !!this.riskParamsAddress
    });
  }

  async getActiveVaults(): Promise<string[]> {
    // In production, this might query a registry contract
    // For MVP, return configured addresses
    return this.vaultAddresses;
  }

  async canSettleEpoch(vaultAddress: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(vaultAddress, TRANCHE_VAULT_ABI, this.wallet);
      return await contract.canSettleEpoch();
    } catch (error) {
      logger.error(`Failed to check settlement status for ${vaultAddress}:`, error);
      return false;
    }
  }

  async settleEpoch(
    vaultAddress: string,
    overrides?: ethers.Overrides
  ): Promise<ethers.ContractTransaction> {
    const contract = new ethers.Contract(vaultAddress, TRANCHE_VAULT_ABI, this.wallet);
    
    // Estimate gas first
    const gasEstimate = await contract.estimateGas.settleEpoch();
    const gasLimit = gasEstimate.mul(120).div(100); // 20% buffer
    
    const txOverrides = {
      gasLimit,
      ...overrides
    };
    
    return await contract.settleEpoch(txOverrides);
  }

  async getCurrentEpoch(vaultAddress: string) {
    try {
      const contract = new ethers.Contract(vaultAddress, TRANCHE_VAULT_ABI, this.wallet);
      const epoch = await contract.currentEpoch();
      
      return {
        index: epoch[0].toNumber(),
        startTime: epoch[1].toNumber(),
        endTime: epoch[2].toNumber(),
        seniorAssets: epoch[3].toString(),
        juniorAssets: epoch[4].toString(),
        totalReturn: epoch[5].toString(),
        settled: epoch[6]
      };
    } catch (error) {
      logger.error(`Failed to get current epoch for ${vaultAddress}:`, error);
      throw error;
    }
  }

  async getTotalAssets(vaultAddress: string): Promise<ethers.BigNumber> {
    try {
      const contract = new ethers.Contract(vaultAddress, TRANCHE_VAULT_ABI, this.wallet);
      return await contract.totalAssets();
    } catch (error) {
      logger.error(`Failed to get total assets for ${vaultAddress}:`, error);
      throw error;
    }
  }

  async canExecuteParams(): Promise<boolean> {
    if (!this.riskParamsAddress) {
      return false;
    }
    
    try {
      const contract = new ethers.Contract(this.riskParamsAddress, RISK_PARAMS_ABI, this.wallet);
      return await contract.canExecute();
    } catch (error) {
      logger.error('Failed to check params execution status:', error);
      return false;
    }
  }

  async executeParams(overrides?: ethers.Overrides): Promise<ethers.ContractTransaction> {
    if (!this.riskParamsAddress) {
      throw new Error('Risk params address not configured');
    }
    
    const contract = new ethers.Contract(this.riskParamsAddress, RISK_PARAMS_ABI, this.wallet);
    
    // Estimate gas first
    const gasEstimate = await contract.estimateGas.executeParams();
    const gasLimit = gasEstimate.mul(120).div(100); // 20% buffer
    
    const txOverrides = {
      gasLimit,
      ...overrides
    };
    
    return await contract.executeParams(txOverrides);
  }

  async getCurrentRiskConfig() {
    if (!this.riskParamsAddress) {
      return null;
    }
    
    try {
      const contract = new ethers.Contract(this.riskParamsAddress, RISK_PARAMS_ABI, this.wallet);
      const config = await contract.getCurrentConfig();
      
      return {
        epochLength: config[0].toNumber(),
        seniorTargetBps: config[1].toNumber(),
        maxDrawdownBps: config[2].toNumber(),
        slippageBps: config[3].toNumber(),
        strategies: config[4],
        targetWeightsBps: config[5].map((w: ethers.BigNumber) => w.toNumber()),
        caps: config[6].map((c: ethers.BigNumber) => c.toString())
      };
    } catch (error) {
      logger.error('Failed to get current risk config:', error);
      return null;
    }
  }

  // Listen for events
  async subscribeToEvents() {
    for (const vaultAddress of this.vaultAddresses) {
      try {
        const contract = new ethers.Contract(vaultAddress, TRANCHE_VAULT_ABI, this.wallet);
        
        contract.on('EpochSettled', (epochIndex, totalReturn, seniorPaid, juniorPnL, event) => {
          logger.info(`Epoch ${epochIndex.toString()} settled for vault ${vaultAddress}`, {
            totalReturn: totalReturn.toString(),
            seniorPaid: seniorPaid.toString(),
            juniorPnL: juniorPnL.toString(),
            txHash: event.transactionHash
          });
        });
        
        logger.info(`Subscribed to events for vault ${vaultAddress}`);
      } catch (error) {
        logger.error(`Failed to subscribe to events for vault ${vaultAddress}:`, error);
      }
    }
    
    // Subscribe to risk params events
    if (this.riskParamsAddress) {
      try {
        const contract = new ethers.Contract(this.riskParamsAddress, RISK_PARAMS_ABI, this.wallet);
        
        contract.on('ParamsExecuted', (config, event) => {
          logger.info('Risk parameters executed', {
            epochLength: config[0].toString(),
            seniorTargetBps: config[1].toString(),
            txHash: event.transactionHash
          });
        });
        
        logger.info('Subscribed to risk params events');
      } catch (error) {
        logger.error('Failed to subscribe to risk params events:', error);
      }
    }
  }

  // Health check for contracts
  async healthCheck(): Promise<{
    vaults: Array<{ address: string; accessible: boolean; error?: string }>;
    riskParams: { accessible: boolean; error?: string } | null;
  }> {
    const vaultStatus = await Promise.all(
      this.vaultAddresses.map(async (address) => {
        try {
          const contract = new ethers.Contract(address, TRANCHE_VAULT_ABI, this.wallet);
          await contract.totalAssets();
          return { address, accessible: true };
        } catch (error) {
          return { 
            address, 
            accessible: false, 
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
    
    let riskParamsStatus = null;
    if (this.riskParamsAddress) {
      try {
        const contract = new ethers.Contract(this.riskParamsAddress, RISK_PARAMS_ABI, this.wallet);
        await contract.getCurrentConfig();
        riskParamsStatus = { accessible: true };
      } catch (error) {
        riskParamsStatus = { 
          accessible: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    return {
      vaults: vaultStatus,
      riskParams: riskParamsStatus
    };
  }
}