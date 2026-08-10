import { Request, Response, NextFunction } from 'express';
import { evaluationService } from '../services/evaluation.service';
import { saveGroundTruthSchema } from '../validators/evaluation.validator';

export const getEvaluations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const list = await evaluationService.getEvaluations();
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

export const saveGroundTruth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = saveGroundTruthSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request body fields',
        errors: parseResult.error.errors,
      });
      return;
    }

    const saved = await evaluationService.saveGroundTruth(parseResult.data);
    res.status(201).json(saved);
  } catch (error: any) {
    if (error.message && error.message.includes('does not exist')) {
      res.status(404).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const getEvaluationByMessageId = async (
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

    const detail = await evaluationService.getEvaluationByMessageId(messageId);
    if (!detail) {
      res.status(404).json({
        status: 'error',
        message: `Evaluation/Message with ID ${messageId} not found`,
      });
      return;
    }

    res.status(200).json(detail);
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const metrics = await evaluationService.getMetrics();
    
    // Model configuration metadata info
    const provider = 'Gemini';
    const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.5-flash';
    const promptVersion = 'v2';
    const evaluationDate = new Date().toISOString();

    res.status(200).json({
      metrics,
      modelInfo: {
        provider,
        model,
        promptVersion,
        evaluationDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const seedEvaluationDataset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await evaluationService.seedChallengeDataset();
    res.status(200).json({
      status: 'success',
      message: `Seeded ${result.seededCount} new challenge messages (${result.existingCount} already existed)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

