import { Request, Response } from 'express';
import { settings } from '../config.js';

export const handleConfigGet = (req: Request, res: Response) => {
  try {
    res.json({
      useHostedLink: settings.USE_HOSTED_LINK,
      brand: 'amazon', // Default brand for now
    });
  } catch (error) {
    console.error('❌ Config retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to get configuration',
      timestamp: new Date().toISOString(),
    });
  }
};