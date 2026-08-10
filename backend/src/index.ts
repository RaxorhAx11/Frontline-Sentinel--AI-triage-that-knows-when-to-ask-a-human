import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api';
import { connectDatabase } from './config/db';
import { errorHandler } from './middleware/error.middleware';

// Load environment variables from multiple possible paths
dotenv.config(); // Loads from process.cwd()
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // dev structure
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // compiled structure in dist/

const app = express();
const port = process.env.PORT || 5000;

console.log('=== Frontline Sentinel Backend Bootstrap ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set (defaulting to development)'}`);
console.log(`PORT: ${process.env.PORT || 'not set (defaulting to 5000)'}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'Defined' : 'UNDEFINED (using local default)'}`);
console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Defined (redacted)' : 'UNDEFINED'}`);
console.log('============================================');

// Enable CORS
app.use(
  cors({
    origin: '*', // Allow all origins for dev/hackathon purposes
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  let frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
  if (!fs.existsSync(frontendDistPath)) {
    frontendDistPath = path.resolve(__dirname, '../../../../frontend/dist');
    if (!fs.existsSync(frontendDistPath)) {
      frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
    }
  }

  if (fs.existsSync(frontendDistPath)) {
    console.log(`Serving static frontend files from: ${frontendDistPath}`);
    app.use(express.static(frontendDistPath));
    
    // Support SPA routing (React Router) by falling back to index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(frontendDistPath, 'index.html'));
    });
  } else {
    console.warn(`WARNING: Production environment set but frontend build directory not found at: ${frontendDistPath}`);
  }
}

// Catch 404 routes (only for unmatched API routes or if static files are not served)
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling
app.use(errorHandler);

// Startup sequence
const startServer = async () => {
  await connectDatabase();
  app.listen(port, () => {
    console.log(`Frontline Sentinel Backend running at http://127.0.0.1:${port}`);
    console.log(`Health endpoint: http://127.0.0.1:${port}/api/health`);
  });
};

startServer().catch((error) => {
  console.error('Critical failure during server startup:', error);
  process.exit(1);
});
