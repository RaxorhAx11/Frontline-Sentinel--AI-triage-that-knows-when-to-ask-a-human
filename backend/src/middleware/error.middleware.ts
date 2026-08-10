import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Unhandled application error:', error);

  // If status code is already set to error status, use it; otherwise default to 500
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  res.status(statusCode).json({
    status: 'error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
};
