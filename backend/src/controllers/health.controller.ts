import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { IHealthResponse } from '../../../shared/src/types';

export const checkHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dbState = mongoose.connection.readyState;
    const isConnected = dbState === 1; // 1 = connected, 2 = connecting, 3 = disconnecting, 0 = disconnected

    const response: IHealthResponse = {
      status: isConnected ? 'ok' : 'error',
      database: isConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    res.status(isConnected ? 200 : 503).json(response);
  } catch (error) {
    next(error);
  }
};
