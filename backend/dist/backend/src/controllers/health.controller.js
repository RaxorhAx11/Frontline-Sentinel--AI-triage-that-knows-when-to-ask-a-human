"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHealth = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const checkHealth = async (req, res, next) => {
    try {
        const dbState = mongoose_1.default.connection.readyState;
        const isConnected = dbState === 1; // 1 = connected, 2 = connecting, 3 = disconnecting, 0 = disconnected
        const response = {
            status: isConnected ? 'ok' : 'error',
            database: isConnected ? 'connected' : 'disconnected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
        res.status(isConnected ? 200 : 503).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.checkHealth = checkHealth;
