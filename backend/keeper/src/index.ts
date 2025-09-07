import dotenv from 'dotenv';
import { EpochKeeper } from './services/EpochKeeper';
import { ParameterKeeper } from './services/ParameterKeeper';
import { HealthMonitor } from './services/HealthMonitor';
import { logger } from './utils/logger';

dotenv.config();

async function main() {
  try {
    logger.info('Starting FluxTranche Keeper services...');

    // Initialize services
    const epochKeeper = new EpochKeeper();
    const parameterKeeper = new ParameterKeeper();
    const healthMonitor = new HealthMonitor();

    // Start services
    await Promise.all([
      epochKeeper.start(),
      parameterKeeper.start(),
      healthMonitor.start()
    ]);

    logger.info('All keeper services started successfully');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await epochKeeper.stop();
      await parameterKeeper.stop();
      await healthMonitor.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await epochKeeper.stop();
      await parameterKeeper.stop();
      await healthMonitor.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start keeper services:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error in main:', error);
  process.exit(1);
});