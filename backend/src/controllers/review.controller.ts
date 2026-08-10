import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import { createReviewSchema, updateReviewSchema } from '../validators/review.validator';

export const getReviews = async (
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
      priority: req.query.priority as string,
      status: req.query.status as string,
    };

    const result = await reviewService.getReviews(page, limit, filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createReview = async (
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

    const parseResult = createReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const result = await reviewService.createReview(messageId, parseResult.data);
    res.status(201).json(result);
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

export const updateReview = async (
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

    const parseResult = updateReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const result = await reviewService.updateReview(messageId, parseResult.data);
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
