"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_controller_1 = require("../controllers/health.controller");
const message_controller_1 = require("../controllers/message.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const message_validator_1 = require("../validators/message.validator");
const router = (0, express_1.Router)();
// Health check endpoint
router.get('/health', health_controller_1.checkHealth);
// Message stats endpoint (must be defined BEFORE /messages/:id)
router.get('/messages/stats', message_controller_1.getDashboardStats);
// Message creation and list endpoints
router.post('/messages', (0, validate_middleware_1.validateBody)(message_validator_1.createMessageSchema), message_controller_1.createMessage);
router.get('/messages', message_controller_1.getMessages);
// Single message details endpoint
router.get('/messages/:id', message_controller_1.getMessageById);
exports.default = router;
