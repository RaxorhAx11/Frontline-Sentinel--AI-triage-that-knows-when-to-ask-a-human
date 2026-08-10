import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller';
import {
  createMessage,
  getMessages,
  getMessageById,
  getDashboardStats,
} from '../controllers/message.controller';
import { validateBody } from '../middleware/validate.middleware';
import { createMessageSchema } from '../validators/message.validator';

const router = Router();

// Health check endpoint
router.get('/health', checkHealth);

// Message stats endpoint (must be defined BEFORE /messages/:id)
router.get('/messages/stats', getDashboardStats);

// Message creation and list endpoints
router.post('/messages', validateBody(createMessageSchema), createMessage);
router.get('/messages', getMessages);

// Single message details endpoint
router.get('/messages/:id', getMessageById);

export default router;
