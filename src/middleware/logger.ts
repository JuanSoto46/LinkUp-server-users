import { NextFunction, Request, Response } from "express";

/**
 * Express middleware for logging incoming requests and responses.
 *
 * Provides detailed logs including method, URL, IP, User-Agent, Origin, and execution time.
 * Useful for debugging, especially in mobile environments.
 * @function logger
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Callback to pass control to the next middleware.
 */
const logger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Detailed log for debugging (mobile-friendly)
    console.log("\nLOGS:")
    console.log(`📥 ${req.method} ${req.originalUrl}`);
    console.log(`   IP: ${req.ip}`);
    console.log(`   User-Agent: ${req.get('User-Agent')?.substring(0, 100)}...`);
    console.log(`   Origin: ${req.get('Origin') || 'No origin'}`);
    console.log(`   Time: ${new Date().toISOString()}`);

    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '❌' : '✅';

        console.log(`${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);

        if (typeof encoding === 'function') {
            return originalEnd.call(this, chunk, encoding as any) as any;
        }
        return originalEnd.call(this, chunk, encoding as any, cb) as any;
    };

    next();
};

export default logger;
