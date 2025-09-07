import cron from 'node-cron';
import { ethers } from 'ethers';
import { ContractService } from './ContractService';
import { logger } from '../utils/logger';
import axios from 'axios';

interface HealthMetrics {
  timestamp: number;
  blockchain: {
    connected: boolean;
    blockNumber?: number;
    gasPrice?: string;
    balance?: string;
    error?: string;
  };
  contracts: {
    vaultsAccessible: number;
    vaultsTotal: number;
    riskParamsAccessible: boolean;
    errors: string[];
  };
  services: {
    aiEngine: boolean;
    keeper: boolean;
  };
  performance: {
    avgBlockTime?: number;
    lastSettlement?: number;
    lastParamUpdate?: number;
  };
}

export class HealthMonitor {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contractService: ContractService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private metrics: HealthMetrics[] = [];
  private maxMetricsHistory = 288; // 24 hours of 5-minute intervals
  
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.RISE_RPC_URL || 'https://testnet-rpc.risechain.io'
    );
    
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not set');
    }
    
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contractService = new ContractService(this.wallet);
    
    logger.info('HealthMonitor initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('HealthMonitor already running');
      return;
    }

    // Run health checks every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.performHealthCheck();
    });

    this.isRunning = true;
    logger.info('HealthMonitor started - checking every 5 minutes');

    // Run initial health check
    await this.performHealthCheck();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    logger.info('HealthMonitor stopped');
  }

  private async performHealthCheck(): Promise<void> {
    const timestamp = Date.now();
    logger.info('Starting health check...');
    
    try {
      const metrics: HealthMetrics = {
        timestamp,
        blockchain: await this.checkBlockchain(),
        contracts: await this.checkContracts(),
        services: await this.checkServices(),
        performance: await this.checkPerformance(),
      };

      // Store metrics
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }

      // Log health status
      this.logHealthStatus(metrics);

      // Check for alerts
      await this.checkAlerts(metrics);

      logger.info('Health check completed');
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  private async checkBlockchain() {
    try {
      const [blockNumber, gasPrice, balance] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getGasPrice(),
        this.provider.getBalance(this.wallet.address)
      ]);

      return {
        connected: true,
        blockNumber,
        gasPrice: gasPrice.toString(),
        balance: ethers.utils.formatEther(balance)
      };
    } catch (error) {
      logger.error('Blockchain health check failed:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkContracts() {
    try {
      const healthCheck = await this.contractService.healthCheck();
      
      const accessibleVaults = healthCheck.vaults.filter(v => v.accessible).length;
      const errors = healthCheck.vaults
        .filter(v => !v.accessible)
        .map(v => `${v.address}: ${v.error}`)
        .concat(
          healthCheck.riskParams && !healthCheck.riskParams.accessible 
            ? [`RiskParams: ${healthCheck.riskParams.error}`] 
            : []
        );

      return {
        vaultsAccessible: accessibleVaults,
        vaultsTotal: healthCheck.vaults.length,
        riskParamsAccessible: healthCheck.riskParams?.accessible ?? false,
        errors
      };
    } catch (error) {
      logger.error('Contract health check failed:', error);
      return {
        vaultsAccessible: 0,
        vaultsTotal: 0,
        riskParamsAccessible: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private async checkServices() {
    const results = await Promise.allSettled([
      this.checkAIEngine(),
      this.checkKeeperService()
    ]);

    return {
      aiEngine: results[0].status === 'fulfilled' ? results[0].value : false,
      keeper: results[1].status === 'fulfilled' ? results[1].value : true // Keeper is this service
    };
  }

  private async checkAIEngine(): Promise<boolean> {
    try {
      const aiEngineUrl = process.env.AI_RISK_ENGINE_URL || 'http://localhost:4000';
      const response = await axios.get(`${aiEngineUrl}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async checkKeeperService(): Promise<boolean> {
    // This is the keeper service, so it's running if we reach this point
    return true;
  }

  private async checkPerformance() {
    try {
      // Get average block time from recent blocks
      const currentBlock = await this.provider.getBlockNumber();
      const blocksToCheck = 10;
      
      if (currentBlock >= blocksToCheck) {
        const [currentBlockData, pastBlockData] = await Promise.all([
          this.provider.getBlock(currentBlock),
          this.provider.getBlock(currentBlock - blocksToCheck)
        ]);
        
        const timeDiff = currentBlockData.timestamp - pastBlockData.timestamp;
        const avgBlockTime = timeDiff / blocksToCheck;
        
        return {
          avgBlockTime,
          lastSettlement: this.getLastSettlementTime(),
          lastParamUpdate: this.getLastParamUpdateTime()
        };
      }
      
      return {};
    } catch (error) {
      logger.error('Performance check failed:', error);
      return {};
    }
  }

  private getLastSettlementTime(): number | undefined {
    // In production, this would query recent settlement events
    // For now, return undefined
    return undefined;
  }

  private getLastParamUpdateTime(): number | undefined {
    // In production, this would query recent parameter update events
    // For now, return undefined
    return undefined;
  }

  private logHealthStatus(metrics: HealthMetrics): void {
    const status = {
      blockchain: metrics.blockchain.connected ? '✅' : '❌',
      contracts: `${metrics.contracts.vaultsAccessible}/${metrics.contracts.vaultsTotal} vaults, RiskParams: ${metrics.contracts.riskParamsAccessible ? '✅' : '❌'}`,
      services: `AI: ${metrics.services.aiEngine ? '✅' : '❌'}, Keeper: ${metrics.services.keeper ? '✅' : '❌'}`,
      balance: metrics.blockchain.balance || 'unknown'
    };

    logger.info('Health Status', status);

    if (metrics.contracts.errors.length > 0) {
      logger.warn('Contract errors detected:', metrics.contracts.errors);
    }
  }

  private async checkAlerts(metrics: HealthMetrics): Promise<void> {
    const alerts = [];

    // Critical alerts
    if (!metrics.blockchain.connected) {
      alerts.push('🚨 CRITICAL: Blockchain connection lost');
    }

    if (metrics.blockchain.balance && parseFloat(metrics.blockchain.balance) < 0.1) {
      alerts.push('🚨 CRITICAL: Low keeper wallet balance');
    }

    if (metrics.contracts.vaultsAccessible === 0 && metrics.contracts.vaultsTotal > 0) {
      alerts.push('🚨 CRITICAL: All vaults inaccessible');
    }

    // Warning alerts
    if (!metrics.services.aiEngine) {
      alerts.push('⚠️  WARNING: AI Risk Engine unreachable');
    }

    if (metrics.contracts.errors.length > 0) {
      alerts.push(`⚠️  WARNING: ${metrics.contracts.errors.length} contract errors`);
    }

    if (metrics.blockchain.balance && parseFloat(metrics.blockchain.balance) < 1) {
      alerts.push('⚠️  WARNING: Keeper wallet balance getting low');
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  private async sendAlert(message: string): Promise<void> {
    logger.error('HEALTH ALERT:', message);
    
    try {
      // In production, send to Slack, Discord, etc.
      console.error(message);
    } catch (error) {
      logger.error('Failed to send health alert:', error);
    }
  }

  // API methods for external monitoring
  getCurrentMetrics(): HealthMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(hours: number = 24): HealthMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  getHealthSummary() {
    const current = this.getCurrentMetrics();
    if (!current) {
      return { status: 'unknown', message: 'No metrics available' };
    }

    const issues = [];
    if (!current.blockchain.connected) issues.push('blockchain disconnected');
    if (current.contracts.vaultsAccessible < current.contracts.vaultsTotal) issues.push('vault access issues');
    if (!current.services.aiEngine) issues.push('AI engine down');
    if (current.blockchain.balance && parseFloat(current.blockchain.balance) < 0.1) issues.push('low balance');

    if (issues.length === 0) {
      return { status: 'healthy', message: 'All systems operational' };
    } else if (issues.some(issue => issue.includes('blockchain') || issue.includes('balance'))) {
      return { status: 'critical', message: `Critical issues: ${issues.join(', ')}` };
    } else {
      return { status: 'warning', message: `Issues detected: ${issues.join(', ')}` };
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      metricsCount: this.metrics.length,
      lastCheck: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : null,
      walletAddress: this.wallet.address,
    };
  }
}