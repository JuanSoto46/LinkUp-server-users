/**
 * Main server file for LinkUp Video Platform Backend
 * @module Server
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import meetingsRoutes from './routes/meetings';
import oauthRoutes from './routes/oauth';

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ 
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'https://link-up-frontend-tau.vercel.app'   // Frontend URL
  ],
  credentials: true 
}));

// Health check endpoint
/**
 * Health check route
 * @route GET /api/health
 * @returns {Object} Health status
 */
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'LinkUp Backend API',
    version: '1.0.0'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/oauth', oauthRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

const port = process.env.PORT || 8080;

/**
 * Starts the Express server
 * @returns {void}
 */
app.listen(port, () => {
  console.log(`🚀 LinkUp Backend API running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
});


export default app;