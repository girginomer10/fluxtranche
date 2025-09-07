import { Router } from 'express';
import { RiskEngine } from '../services/RiskEngine';
import { MarketDataService } from '../services/MarketDataService';
import { SigningService } from '../services/SigningService';
import { logger } from '../utils/logger';
import { validateRiskConfig } from '../middleware/validation';

const router = Router();
const riskEngine = new RiskEngine();
const marketDataService = new MarketDataService();
const signingService = new SigningService();

// Get current risk parameters
router.get('/current', async (_req, res) => {
  try {
    const currentConfig = await riskEngine.getCurrentConfig();
    res.json(currentConfig);
  } catch (error) {
    logger.error('Failed to get current config:', error);
    res.status(500).json({ error: 'Failed to retrieve current configuration' });
  }
});

// Generate next epoch parameters
router.get('/next', async (_req, res) => {
  try {
    // Fetch market data
    const marketData = await marketDataService.getMarketData();
    
    // Generate risk parameters using AI
    const riskConfig = await riskEngine.generateRiskParams(marketData);
    
    // Sign the configuration
    const signature = signingService.signRiskConfig(riskConfig);
    
    const response = {
      ...riskConfig,
      signature,
      timestamp: Date.now(),
      marketData: {
        btcPrice: marketData.btcPrice,
        ethPrice: marketData.ethPrice,
        totalLiquidity: marketData.totalLiquidity,
        avgFunding: marketData.avgFunding,
        impliedVol: marketData.impliedVol,
      }
    };
    
    logger.info('Generated new risk parameters', { 
      epochLength: riskConfig.epochLength,
      seniorTargetBps: riskConfig.seniorTargetBps,
      confidence: riskConfig.confidence 
    });
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to generate next config:', error);
    res.status(500).json({ error: 'Failed to generate risk parameters' });
  }
});

// Manual parameter generation with custom inputs
router.post('/generate', validateRiskConfig, async (req, res) => {
  try {
    const { marketOverrides, preferences } = req.body;
    
    // Get base market data
    const baseMarketData = await marketDataService.getMarketData();
    
    // Apply overrides
    const marketData = { ...baseMarketData, ...marketOverrides };
    
    // Generate parameters with preferences
    const riskConfig = await riskEngine.generateRiskParams(marketData, preferences);
    
    // Sign the configuration
    const signature = signingService.signRiskConfig(riskConfig);
    
    res.json({
      ...riskConfig,
      signature,
      timestamp: Date.now(),
      marketData
    });
  } catch (error) {
    logger.error('Failed to generate custom config:', error);
    res.status(400).json({ error: 'Failed to generate custom parameters' });
  }
});

// Get market signals
router.get('/signals', async (_req, res) => {
  try {
    const signals = await marketDataService.getDetailedSignals();
    res.json({
      signals,
      timestamp: Date.now(),
      freshness: 'live' // Could be 'live', 'cached', 'stale'
    });
  } catch (error) {
    logger.error('Failed to get market signals:', error);
    res.status(500).json({ error: 'Failed to retrieve market signals' });
  }
});

// Get AI model status
router.get('/status', (_req, res) => {
  res.json({
    model: 'gemini-2.0-flash-exp',
    status: 'operational',
    lastUpdate: new Date().toISOString(),
    requestsToday: 0, // Could implement actual counting
    version: '1.0.0'
  });
});

export { router as riskRoutes };