"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAllData = exports.deleteMessage = exports.getMessagesStats = exports.stopBulkTriage = exports.pauseBulkTriage = exports.getBulkTriageStatus = exports.startBulkTriage = exports.importMessagesBulk = exports.retryTriage = exports.runTriage = exports.getDashboardStats = exports.getMessageById = exports.getMessages = exports.createMessage = void 0;
const message_service_1 = require("../services/message.service");
const bulkTriage_service_1 = require("../services/bulkTriage.service");
const createMessage = async (req, res, next) => {
    try {
        const { rawText } = req.body;
        const result = await message_service_1.messageService.createMessage(rawText);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.createMessage = createMessage;
const getMessages = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (page < 1 || limit < 1) {
            res.status(400).json({
                status: 'error',
                message: 'Page and limit must be positive integers',
            });
            return;
        }
        const filters = {
            status: req.query.status,
            priority: req.query.priority,
            category: req.query.category,
        };
        const result = await message_service_1.messageService.getMessages(page, limit, filters);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getMessages = getMessages;
const getMessageById = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Mongoose ObjectId format check
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid message ID format',
            });
            return;
        }
        const result = await message_service_1.messageService.getMessageById(id);
        if (!result) {
            res.status(404).json({
                status: 'error',
                message: `Message with ID ${id} not found`,
            });
            return;
        }
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getMessageById = getMessageById;
const getDashboardStats = async (req, res, next) => {
    try {
        const stats = await message_service_1.messageService.getDashboardStats();
        res.status(200).json(stats);
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
const runTriage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid message ID format',
            });
            return;
        }
        const result = await message_service_1.messageService.runTriage(messageId);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.message && error.message.includes('not found')) {
            res.status(404).json({
                status: 'error',
                message: error.message,
            });
            return;
        }
        next(error);
    }
};
exports.runTriage = runTriage;
const retryTriage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid message ID format',
            });
            return;
        }
        const result = await message_service_1.messageService.retryTriage(messageId);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.message && error.message.includes('not found')) {
            res.status(404).json({
                status: 'error',
                message: error.message,
            });
            return;
        }
        next(error);
    }
};
exports.retryTriage = retryTriage;
const importMessagesBulk = async (req, res, next) => {
    try {
        const { csvText } = req.body;
        if (!csvText || typeof csvText !== 'string') {
            res.status(400).json({
                status: 'error',
                message: 'Request body must contain csvText string',
            });
            return;
        }
        const result = await message_service_1.messageService.importMessagesBulk(csvText);
        // Reset bulk status counts in memory after a fresh import
        bulkTriage_service_1.bulkTriageService.reset();
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.importMessagesBulk = importMessagesBulk;
const startBulkTriage = async (req, res, next) => {
    try {
        await bulkTriage_service_1.bulkTriageService.startTriage();
        res.status(200).json({ status: 'started' });
    }
    catch (error) {
        next(error);
    }
};
exports.startBulkTriage = startBulkTriage;
const getBulkTriageStatus = async (req, res, next) => {
    try {
        const status = await bulkTriage_service_1.bulkTriageService.getStatus();
        res.status(200).json(status);
    }
    catch (error) {
        next(error);
    }
};
exports.getBulkTriageStatus = getBulkTriageStatus;
const pauseBulkTriage = async (req, res, next) => {
    try {
        bulkTriage_service_1.bulkTriageService.pause();
        res.status(200).json({ status: 'paused' });
    }
    catch (error) {
        next(error);
    }
};
exports.pauseBulkTriage = pauseBulkTriage;
const stopBulkTriage = async (req, res, next) => {
    try {
        bulkTriage_service_1.bulkTriageService.stop();
        res.status(200).json({ status: 'stopped' });
    }
    catch (error) {
        next(error);
    }
};
exports.stopBulkTriage = stopBulkTriage;
const getMessagesStats = async (req, res, next) => {
    try {
        const stats = await message_service_1.messageService.getDetailedStats();
        res.status(200).json(stats);
    }
    catch (error) {
        next(error);
    }
};
exports.getMessagesStats = getMessagesStats;
const deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid message ID format',
            });
            return;
        }
        const deleted = await message_service_1.messageService.deleteMessage(messageId);
        if (!deleted) {
            res.status(404).json({
                status: 'error',
                message: `Message with ID ${messageId} not found`,
            });
            return;
        }
        res.status(200).json({
            status: 'success',
            message: 'Message and related data deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while deleting the message',
        });
    }
};
exports.deleteMessage = deleteMessage;
const resetAllData = async (req, res, next) => {
    try {
        await message_service_1.messageService.resetAllData();
        bulkTriage_service_1.bulkTriageService.reset();
        res.status(200).json({
            status: 'success',
            message: 'All application and demo data reset successfully',
        });
    }
    catch (error) {
        console.error('Error resetting data:', error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while resetting the application data',
        });
    }
};
exports.resetAllData = resetAllData;
