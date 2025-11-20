/**
 * Global error handling middleware
 * @module ErrorHandler
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Custom error interface
 */
interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

/**
 * Global error handler middleware
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  // Firebase Auth errors
  if (err.message?.includes('auth/')) {
    error.statusCode = 400;
    error.message = 'Authentication error';
  }

  // Firestore errors
  if (err.message?.includes('firestore/')) {
    error.statusCode = 500;
    error.message = 'Database error';
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    timestamp: new Date().toISOString()
  });
}