import cron from 'node-cron';
import { ethers } from 'ethers';
import { ContractService } from './ContractService';
import { logger } from '../utils/logger';
import PQueue from 'p-queue';

export class EpochKeeper {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contractService: ContractService;
  private cronJob: cron.ScheduledTask | null = null;
  private queue: PQueue;
  private isRunning = false;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.RISE_RPC_URL || 'https://testnet-rpc.risechain.io'
    );
    
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      logger.warn('DEPLOYER_PRIVATE_KEY not set, using development key');
    }
    
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contractService = new ContractService(this.wallet);
    
    // Queue for handling multiple settlements
    this.queue = new PQueue({ concurrency: 1 });
    
    logger.info('EpochKeeper initialized with address:', this.wallet.address);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('EpochKeeper already running');
      return;
    }

    // Check every 5 minutes for epoch settlements
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.queue.add(() => this.checkAndSettleEpochs());
    });

    this.isRunning = true;
    logger.info('EpochKeeper started - checking every 5 minutes');

    // Run initial check
    await this.queue.add(() => this.checkAndSettleEpochs());
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    await this.queue.onIdle();
    this.isRunning = false;
    logger.info('EpochKeeper stopped');
  }

  private async checkAndSettleEpochs(): Promise<void> {
    try {
      logger.info('Checking for epochs to settle...');
      
      const vaults = await this.contractService.getActiveVaults();
      
      for (const vaultAddress of vaults) {
        try {
          await this.checkVaultEpoch(vaultAddress);
        } catch (error) {
          logger.error(`Failed to process vault ${vaultAddress}:`, error);
        }
      }
      
      logger.info(`Completed epoch check for ${vaults.length} vaults`);
    } catch (error) {
      logger.error('Failed to check epochs:', error);
    }
  }

  private async checkVaultEpoch(vaultAddress: string): Promise<void> {
    const canSettle = await this.contractService.canSettleEpoch(vaultAddress);
    
    if (!canSettle) {
      logger.debug(`Vault ${vaultAddress} epoch not ready for settlement`);
      return;
    }

    logger.info(`Settling epoch for vault ${vaultAddress}`);
    
    try {
      // Get current gas price and add buffer
      const gasPrice = await this.provider.getGasPrice();
      const bufferedGasPrice = gasPrice.mul(110).div(100); // 10% buffer
      
      const tx = await this.contractService.settleEpoch(vaultAddress, {
        gasPrice: bufferedGasPrice,
        gasLimit: 500000, // Conservative gas limit
      });
      
      logger.info(`Epoch settlement transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        logger.info(`Epoch settled successfully for vault ${vaultAddress}`, {
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber
        });
        
        // Log epoch details
        await this.logEpochDetails(vaultAddress);
      } else {
        logger.error(`Epoch settlement failed for vault ${vaultAddress}`, {
          txHash: tx.hash
        });
      }
      
    } catch (error) {
      logger.error(`Failed to settle epoch for vault ${vaultAddress}:`, error);
      
      // Check if it's a known error we can handle
      if (this.isRecoverableError(error)) {
        logger.info('Error appears recoverable, will retry next cycle');
      } else {
        // Send alert for non-recoverable errors
        await this.sendAlert(`Critical epoch settlement error for vault ${vaultAddress}`, error);
      }
    }
  }

  private async logEpochDetails(vaultAddress: string): Promise<void> {
    try {
      const epochData = await this.contractService.getCurrentEpoch(vaultAddress);
      const totalAssets = await this.contractService.getTotalAssets(vaultAddress);
      
      logger.info(`Epoch ${epochData.index} settled for vault ${vaultAddress}`, {
        totalReturn: epochData.totalReturn,
        seniorAssets: epochData.seniorAssets,
        juniorAssets: epochData.juniorAssets,
        totalAssets: totalAssets.toString(),
        settled: epochData.settled
      });
    } catch (error) {
      logger.warn('Failed to log epoch details:', error);
    }
  }

  private isRecoverableError(error: any): boolean {
    const recoverableErrors = [
      'insufficient funds',
      'gas price too low',
      'nonce too low',
      'replacement transaction underpriced',
      'network congestion'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return recoverableErrors.some(msg => errorMessage.includes(msg));
  }

  private async sendAlert(message: string, error: any): Promise<void> {
    logger.error('ALERT:', message, { error: error.message });
    
    // In production, this would send to Slack, Discord, or other alerting system
    // For now, just log as critical
    try {
      // Could integrate with external alerting service here
      console.error('🚨 CRITICAL ALERT:', message);
    } catch (alertError) {
      logger.error('Failed to send alert:', alertError);
    }
  }

  // Manual settlement method for emergency use
  async forceSettlement(vaultAddress: string): Promise<string> {
    logger.warn(`Force settling epoch for vault ${vaultAddress}`);
    
    const tx = await this.contractService.settleEpoch(vaultAddress, {
      gasLimit: 800000, // Higher gas limit for force settlement
    });
    
    logger.info(`Force settlement transaction sent: ${tx.hash}`);
    return tx.hash;
  }

  // Get status for monitoring
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.queue.size,
      queuePending: this.queue.pending,
      walletAddress: this.wallet.address,
    };
  }
}