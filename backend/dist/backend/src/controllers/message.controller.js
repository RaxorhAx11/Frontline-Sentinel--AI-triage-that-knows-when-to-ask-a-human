"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getMessageById = exports.getMessages = exports.createMessage = void 0;
const message_service_1 = require("../services/message.service");
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
        const result = await message_service_1.messageService.getMessages(page, limit);
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
