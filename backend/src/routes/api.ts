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
  getMessagesStats,
} from '../controllers/message.controller';
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

// Message creation and list endpoints
router.post('/messages', validateBody(createMessageSchema), createMessage);
router.get('/messages', getMessages);

// Run/Retry triage endpoints
router.post('/triage/:messageId', runTriage);
router.post('/triage/:messageId/retry', retryTriage);

// Single message details endpoint
router.get('/messages/:id', getMessageById);

export default router;
