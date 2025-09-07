import cron from 'node-cron';
import axios from 'axios';
import { ContractService } from './ContractService';
import { logger } from '../utils/logger';
import { ethers } from 'ethers';
import PQueue from 'p-queue';

export class ParameterKeeper {
  private contractService: ContractService;
  private cronJob: cron.ScheduledTask | null = null;
  private queue: PQueue;
  private isRunning = false;
  private aiRiskEngineUrl: string;

  constructor() {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not set');
    }
    
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.RISE_RPC_URL || 'https://testnet-rpc.risechain.io'
    );
    
    const wallet = new ethers.Wallet(privateKey, provider);
    this.contractService = new ContractService(wallet);
    this.queue = new PQueue({ concurrency: 1 });
    
    this.aiRiskEngineUrl = process.env.AI_RISK_ENGINE_URL || 'http://localhost:4000';
    
    logger.info('ParameterKeeper initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('ParameterKeeper already running');
      return;
    }

    // Check every 10 minutes for parameter updates
    this.cronJob = cron.schedule('*/10 * * * *', async () => {
      await this.queue.add(() => this.checkAndExecuteParams());
    });

    this.isRunning = true;
    logger.info('ParameterKeeper started - checking every 10 minutes');

    // Run initial check
    await this.queue.add(() => this.checkAndExecuteParams());
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
    logger.info('ParameterKeeper stopped');
  }

  private async checkAndExecuteParams(): Promise<void> {
    try {
      logger.info('Checking for parameter updates...');
      
      const canExecute = await this.contractService.canExecuteParams();
      
      if (!canExecute) {
        logger.debug('No parameter updates ready for execution');
        return;
      }

      logger.info('Executing parameter updates');
      
      try {
        const tx = await this.contractService.executeParams({
          gasLimit: 300000, // Conservative gas limit
        });
        
        logger.info(`Parameter execution transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          logger.info('Parameters executed successfully', {
            txHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
          });
          
          // Log new configuration
          await this.logNewConfiguration();
          
          // Optionally queue new parameters from AI
          await this.queueNextParameters();
          
        } else {
          logger.error('Parameter execution failed', { txHash: tx.hash });
        }
        
      } catch (error) {
        logger.error('Failed to execute parameters:', error);
        
        if (this.isRecoverableError(error)) {
          logger.info('Error appears recoverable, will retry next cycle');
        } else {
          await this.sendAlert('Critical parameter execution error', error);
        }
      }
      
    } catch (error) {
      logger.error('Failed to check parameter status:', error);
    }
  }

  private async logNewConfiguration(): Promise<void> {
    try {
      const config = await this.contractService.getCurrentRiskConfig();
      if (config) {
        logger.info('New risk configuration active', {
          epochLength: config.epochLength,
          seniorTargetBps: config.seniorTargetBps,
          maxDrawdownBps: config.maxDrawdownBps,
          strategiesCount: config.strategies.length
        });
      }
    } catch (error) {
      logger.warn('Failed to log new configuration:', error);
    }
  }

  private async queueNextParameters(): Promise<void> {
    try {
      logger.info('Requesting next risk parameters from AI engine...');
      
      const response = await axios.get(`${this.aiRiskEngineUrl}/api/risk/next`, {
        timeout: 30000, // 30 second timeout
      });
      
      if (response.data) {
        logger.info('Received new risk parameters from AI', {
          epochLength: response.data.epochLength,
          seniorTargetBps: response.data.seniorTargetBps,
          confidence: response.data.confidence
        });
        
        // The AI engine should handle the queueing via the RiskParams contract
        // This keeper just executes already-queued parameters
        
        // Optionally, we could validate the parameters here before they're queued
        await this.validateParameters(response.data);
        
      } else {
        logger.warn('No parameter data received from AI engine');
      }
      
    } catch (error: any) {
      logger.error('Failed to queue next parameters:', error);
      
      if (error?.code === 'ECONNREFUSED') {
        logger.error('AI Risk Engine appears to be down');
      }
    }
  }

  private async validateParameters(params: any): Promise<boolean> {
    try {
      // Basic validation of AI-generated parameters
      const validations = [
        params.epochLength >= 3600 && params.epochLength <= 86400,
        params.seniorTargetBps >= 10 && params.seniorTargetBps <= 200,
        params.maxDrawdownBps >= 500 && params.maxDrawdownBps <= 5000,
        params.slippageBps >= 10 && params.slippageBps <= 300,
        Array.isArray(params.strategies) && params.strategies.length > 0,
        Array.isArray(params.targetWeightsBps) && 
          params.targetWeightsBps.reduce((sum: number, w: number) => sum + w, 0) === 10000,
        params.confidence >= 0 && params.confidence <= 100
      ];
      
      const isValid = validations.every(v => v);
      
      if (!isValid) {
        logger.error('Invalid parameters received from AI engine', params);
        await this.sendAlert('Invalid AI parameters detected', params);
        return false;
      }
      
      // Additional business logic validation
      if (params.confidence < 50) {
        logger.warn('Low confidence parameters received', { confidence: params.confidence });
      }
      
      if (params.maxDrawdownBps > 3000) {
        logger.warn('High risk parameters detected', { maxDrawdownBps: params.maxDrawdownBps });
      }
      
      return true;
      
    } catch (error) {
      logger.error('Parameter validation failed:', error);
      return false;
    }
  }

  private isRecoverableError(error: any): boolean {
    const recoverableErrors = [
      'insufficient funds',
      'gas price too low',
      'nonce too low',
      'replacement transaction underpriced'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return recoverableErrors.some(msg => errorMessage.includes(msg));
  }

  private async sendAlert(message: string, data: any): Promise<void> {
    logger.error('ALERT:', message, { data });
    
    try {
      // Could integrate with external alerting service here
      console.error('🚨 PARAMETER ALERT:', message);
    } catch (alertError) {
      logger.error('Failed to send parameter alert:', alertError);
    }
  }

  // Manual parameter execution for emergency use
  async forceExecution(): Promise<string> {
    logger.warn('Force executing parameters');
    
    const tx = await this.contractService.executeParams({
      gasLimit: 500000, // Higher gas limit for force execution
    });
    
    logger.info(`Force execution transaction sent: ${tx.hash}`);
    return tx.hash;
  }

  // Get parameter keeper status
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.queue.size,
      queuePending: this.queue.pending,
      aiEngineUrl: this.aiRiskEngineUrl,
    };
  }

  // Test connection to AI engine
  async testAIConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.aiRiskEngineUrl}/health`, {
        timeout: 5000
      });
      
      return response.status === 200;
    } catch (error) {
      logger.error('AI engine connection test failed:', error);
      return false;
    }
  }
}