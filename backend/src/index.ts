import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRouter from './routes/api';
import { connectDatabase } from './config/db';
import { errorHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

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

// Catch 404 routes
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
