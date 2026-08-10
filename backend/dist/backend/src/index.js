"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const api_1 = __importDefault(require("./routes/api"));
const db_1 = require("./config/db");
const error_middleware_1 = require("./middleware/error.middleware");
// Load environment variables from multiple possible paths
dotenv_1.default.config(); // Loads from process.cwd()
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') }); // dev structure
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') }); // compiled structure in dist/
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
console.log('=== Frontline Sentinel Backend Bootstrap ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set (defaulting to development)'}`);
console.log(`PORT: ${process.env.PORT || 'not set (defaulting to 5000)'}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'Defined' : 'UNDEFINED (using local default)'}`);
console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Defined (redacted)' : 'UNDEFINED'}`);
console.log('============================================');
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
// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
    let frontendDistPath = path_1.default.resolve(process.cwd(), '../frontend/dist');
    if (!fs_1.default.existsSync(frontendDistPath)) {
        frontendDistPath = path_1.default.resolve(__dirname, '../../../../frontend/dist');
        if (!fs_1.default.existsSync(frontendDistPath)) {
            frontendDistPath = path_1.default.resolve(__dirname, '../../frontend/dist');
        }
    }
    if (fs_1.default.existsSync(frontendDistPath)) {
        console.log(`Serving static frontend files from: ${frontendDistPath}`);
        app.use(express_1.default.static(frontendDistPath));
        // Support SPA routing (React Router) by falling back to index.html
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api')) {
                return next();
            }
            res.sendFile(path_1.default.resolve(frontendDistPath, 'index.html'));
        });
    }
    else {
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
