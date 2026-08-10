"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_controller_1 = require("../controllers/health.controller");
const message_controller_1 = require("../controllers/message.controller");
const evaluation_controller_1 = require("../controllers/evaluation.controller");
const review_controller_1 = require("../controllers/review.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const message_validator_1 = require("../validators/message.validator");
const router = (0, express_1.Router)();
// Health check endpoint
router.get('/health', health_controller_1.checkHealth);
// Message stats endpoint (must be defined BEFORE /messages/:id)
router.get('/messages/stats', message_controller_1.getMessagesStats);
// Bulk endpoints
router.post('/messages/bulk', message_controller_1.importMessagesBulk);
router.post('/triage/bulk', message_controller_1.startBulkTriage);
router.get('/triage/bulk/status', message_controller_1.getBulkTriageStatus);
router.post('/triage/bulk/pause', message_controller_1.pauseBulkTriage);
router.post('/triage/bulk/stop', message_controller_1.stopBulkTriage);
// Message creation and list endpoints
router.post('/messages', (0, validate_middleware_1.validateBody)(message_validator_1.createMessageSchema), message_controller_1.createMessage);
router.get('/messages', message_controller_1.getMessages);
router.delete('/messages', message_controller_1.resetAllData);
router.delete('/messages/:messageId', message_controller_1.deleteMessage);
// Run/Retry triage endpoints
router.post('/triage/:messageId', message_controller_1.runTriage);
router.post('/triage/:messageId/retry', message_controller_1.retryTriage);
// Evaluation endpoints
router.get('/evaluations/metrics', evaluation_controller_1.getMetrics);
router.get('/evaluations', evaluation_controller_1.getEvaluations);
router.post('/evaluations', evaluation_controller_1.saveGroundTruth);
router.post('/evaluations/seed', evaluation_controller_1.seedEvaluationDataset);
router.get('/evaluations/:messageId', evaluation_controller_1.getEvaluationByMessageId);
// Human Review endpoints
router.get('/reviews', review_controller_1.getReviews);
router.post('/reviews/:messageId', review_controller_1.createReview);
router.patch('/reviews/:messageId', review_controller_1.updateReview);
// Single message details endpoint
router.get('/messages/:id', message_controller_1.getMessageById);
exports.default = router;
