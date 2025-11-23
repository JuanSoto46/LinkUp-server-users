/**
 * Authentication middleware for verifying Firebase ID tokens
 * @module AuthMiddleware
 */
import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import rateLimit from 'express-rate-limit';

/**
 * Extended Request interface to include UID
 */
interface AuthenticatedRequest extends Request {
  uid?: string;
}

/**
 * Verifies Firebase ID token from Authorization header
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 */
async function verifyIdToken(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ 
        success: false,
        error: 'Authorization header is required' 
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false,
        error: 'Authorization header must start with Bearer' 
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      res.status(401).json({ 
        success: false,
        error: 'Token is required' 
      });
      return;
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    req.uid = decodedToken.uid;
    
    next();
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }
}

const rateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 5, // More restrictive in production
    message: {
      success: false,
      message: "Too many requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use the default generator that handles IPv6 correctly
    skip: (req: Request) => {
      // Skip rate limiting in development with environment variable
      return process.env.NODE_ENV === 'development';
    }
  });


export { rateLimiter, verifyIdToken };