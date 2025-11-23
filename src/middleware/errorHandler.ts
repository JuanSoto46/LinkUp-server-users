import type { Request, Response, NextFunction } from "express";

/**
 * Standardized error interface
 */
export interface AppError extends Error {
  statusCode?: number;
  code?: string | number;
  details?: string;
}

/**
 * Global Error Handler Middleware
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  
  // Normalize error object
  const error: AppError = {
    name: err.name || "InternalError",
    message: err.message || "Internal server error",
    statusCode: err.statusCode || 500,
    code: err.code,
    stack: err.stack,
    details: err.details,
  };

  /**
   *  FIREBASE AUTH ERRORS
   */
  if (err.code?.toString().startsWith("auth/")) {
    error.statusCode = 401;
    error.message = "Authentication failed";
    error.name = "FirebaseAuthError";
  }

  /**
   * FIRESTORE ERRORS
   */
  if (err.code?.toString().startsWith("firestore/")) {
    error.statusCode = 500;
    error.message = "Firestore database error";
    error.name = "FirestoreError";
  }

  /**
   * JWT ERRORS
   */
  if (err.name === "JsonWebTokenError") {
    error.statusCode = 401;
    error.message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    error.statusCode = 401;
    error.message = "Token expired";
  }

  /**
   * JSON PARSE ERRORS
   */
  if (err instanceof SyntaxError && "body" in err) {
    error.statusCode = 400;
    error.message = "Invalid JSON body";
  }

  /**
   *  RATE LIMIT ERRORS
   */
  if (err.name === "RateLimitError") {
    error.statusCode = 429;
    error.message = "Too many requests";
  }

  /**
   *  DEFAULT FALLBACK
   */
  const status = error.statusCode;

  res.status(status).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      name: error.name,
    },
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
    }),
  });
}
