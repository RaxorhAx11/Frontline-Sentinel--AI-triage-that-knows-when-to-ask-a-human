import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import { bulkTriageService } from '../services/bulkTriage.service';

export const createMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rawText } = req.body;
    const result = await messageService.createMessage(rawText);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      res.status(400).json({
        status: 'error',
        message: 'Page and limit must be positive integers',
      });
      return;
    }

    const filters = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      category: req.query.category as string,
    };

    const result = await messageService.getMessages(page, limit, filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMessageById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const result = await messageService.getMessageById(id);
    
    if (!result) {
      res.status(404).json({
        status: 'error',
        message: `Message with ID ${id} not found`,
      });
      return;
    }
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await messageService.getDashboardStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const runTriage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageId } = req.params;

    if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid message ID format',
      });
      return;
    }

    const result = await messageService.runTriage(messageId);
    res.status(200).json(result);
  } catch (error: any) {
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

export const retryTriage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageId } = req.params;

    if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid message ID format',
      });
      return;
    }

    const result = await messageService.retryTriage(messageId);
    res.status(200).json(result);
  } catch (error: any) {
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

export const importMessagesBulk = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { csvText } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Request body must contain csvText string',
      });
      return;
    }

    const result = await messageService.importMessagesBulk(csvText);
    // Reset bulk status counts in memory after a fresh import
    bulkTriageService.reset();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const startBulkTriage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await bulkTriageService.startTriage();
    res.status(200).json({ status: 'started' });
  } catch (error) {
    next(error);
  }
};

export const getBulkTriageStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = await bulkTriageService.getStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
};

export const pauseBulkTriage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    bulkTriageService.pause();
    res.status(200).json({ status: 'paused' });
  } catch (error) {
    next(error);
  }
};

export const stopBulkTriage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    bulkTriageService.stop();
    res.status(200).json({ status: 'stopped' });
  } catch (error) {
    next(error);
  }
};

export const getMessagesStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await messageService.getDetailedStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};
