"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
const db_1 = require("./config/db");
const error_middleware_1 = require("./middleware/error.middleware");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Enable CORS
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for dev/hackathon purposes
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parsing
app.use(express_1.default.json());
// API Routes
app.use('/api', api_1.default);
// Catch 404 routes
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot find ${req.method} ${req.originalUrl}`,
    });
});
// Centralized error handling
app.use(error_middleware_1.errorHandler);
// Startup sequence
const startServer = async () => {
    await (0, db_1.connectDatabase)();
    app.listen(port, () => {
        console.log(`Frontline Sentinel Backend running at http://127.0.0.1:${port}`);
        console.log(`Health endpoint: http://127.0.0.1:${port}/api/health`);
    });
};
startServer().catch((error) => {
    console.error('Critical failure during server startup:', error);
    process.exit(1);
});
