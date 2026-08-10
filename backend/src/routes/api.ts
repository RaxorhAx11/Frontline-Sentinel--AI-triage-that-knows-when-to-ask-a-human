import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller';
import {
  createMessage,
  getMessages,
  getMessageById,
  getDashboardStats,
  runTriage,
  retryTriage,
  importMessagesBulk,
  startBulkTriage,
  getBulkTriageStatus,
  pauseBulkTriage,
  stopBulkTriage,
  resetBulkTriage,
  getMessagesStats,
  deleteMessage,
  resetAllData,
} from '../controllers/message.controller';
import {
  getEvaluations,
  saveGroundTruth,
  getEvaluationByMessageId,
  getMetrics,
  seedEvaluationDataset,
} from '../controllers/evaluation.controller';
import {
  getReviews,
  createReview,
  updateReview,
} from '../controllers/review.controller';
import { validateBody } from '../middleware/validate.middleware';
import { createMessageSchema } from '../validators/message.validator';

const router = Router();


// Health check endpoint
router.get('/health', checkHealth);

// Message stats endpoint (must be defined BEFORE /messages/:id)
router.get('/messages/stats', getMessagesStats);

// Bulk endpoints
router.post('/messages/bulk', importMessagesBulk);
router.post('/triage/bulk', startBulkTriage);
router.get('/triage/bulk/status', getBulkTriageStatus);
router.post('/triage/bulk/pause', pauseBulkTriage);
router.post('/triage/bulk/stop', stopBulkTriage);
router.post('/triage/bulk/reset', resetBulkTriage);

// Message creation and list endpoints
router.post('/messages', validateBody(createMessageSchema), createMessage);
router.get('/messages', getMessages);
router.delete('/messages', resetAllData);
router.delete('/messages/:messageId', deleteMessage);

// Run/Retry triage endpoints
router.post('/triage/:messageId', runTriage);
router.post('/triage/:messageId/retry', retryTriage);

// Evaluation endpoints
router.get('/evaluations/metrics', getMetrics);
router.get('/evaluations', getEvaluations);
router.post('/evaluations', saveGroundTruth);
router.post('/evaluations/seed', seedEvaluationDataset);
router.get('/evaluations/:messageId', getEvaluationByMessageId);

// Human Review endpoints
router.get('/reviews', getReviews);
router.post('/reviews/:messageId', createReview);
router.patch('/reviews/:messageId', updateReview);

// Single message details endpoint
router.get('/messages/:id', getMessageById);

export default router;
