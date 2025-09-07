import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const riskConfigSchema = Joi.object({
  marketOverrides: Joi.object({
    btcPrice: Joi.number().min(1000).max(200000).optional(),
    ethPrice: Joi.number().min(100).max(20000).optional(),
    totalLiquidity: Joi.number().min(1000000).max(10000000000).optional(),
    avgFunding: Joi.number().min(-0.1).max(0.1).optional(),
    impliedVol: Joi.number().min(0).max(200).optional()
  }).optional(),
  
  preferences: Joi.object({
    riskTolerance: Joi.string().valid('low', 'medium', 'high').optional(),
    targetAPY: Joi.number().min(0).max(100).optional(),
    maxDrawdown: Joi.number().min(0).max(50).optional(),
    preferredStrategies: Joi.array().items(
      Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/)
    ).optional()
  }).optional()
});

export const validateRiskConfig = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = riskConfigSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Invalid request parameters',
      details: error.details.map(d => d.message)
    });
  }
  
  next();
};