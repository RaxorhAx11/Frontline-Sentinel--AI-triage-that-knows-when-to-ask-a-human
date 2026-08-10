import { Review } from '../models/Review';
import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import mongoose from 'mongoose';

export class ReviewService {
  /**
   * Fetches paginated, sorted human-review cases with optional priority and status filtering.
   */
  public async getReviews(
    page: number,
    limit: number,
    filters?: { priority?: string; status?: string }
  ) {
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: { needsHuman: true } }
    ];

    // Lookup Message
    pipeline.push({
      $lookup: {
        from: 'messages',
        localField: 'messageId',
        foreignField: '_id',
        as: 'message'
      }
    });
    pipeline.push({ $unwind: '$message' });

    // Lookup Review
    pipeline.push({
      $lookup: {
        from: 'reviews',
        localField: 'messageId',
        foreignField: 'messageId',
        as: 'review'
      }
    });
    pipeline.push({
      $unwind: {
        path: '$review',
        preserveNullAndEmptyArrays: true
      }
    });

    // Add currentPriority field based on Review presence
    pipeline.push({
      $addFields: {
        currentPriority: {
          $cond: {
            if: '$review',
            then: '$review.finalPriority',
            else: '$priority'
          }
        }
      }
    });

    // Filter by Priority
    if (filters?.priority && filters.priority !== 'all') {
      pipeline.push({ $match: { currentPriority: filters.priority } });
    }

    // Filter by Review Status
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'pending') {
        pipeline.push({ $match: { review: { $exists: false } } });
      } else if (filters.status === 'reviewed' || filters.status === 'completed') {
        pipeline.push({ $match: { review: { $exists: true } } });
      } else if (filters.status === 'accepted') {
        pipeline.push({ $match: { 'review.decision': 'accepted' } });
      } else if (filters.status === 'overridden') {
        pipeline.push({ $match: { 'review.decision': 'overridden' } });
      }
    }

    // Count Pipeline
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await TriageDecision.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add priorityOrder and sort: P0 (0), P1 (1), P2 (2), P3 (3)
    pipeline.push({
      $addFields: {
        priorityOrder: {
          $switch: {
            branches: [
              { case: { $eq: ['$currentPriority', 'P0'] }, then: 0 },
              { case: { $eq: ['$currentPriority', 'P1'] }, then: 1 },
              { case: { $eq: ['$currentPriority', 'P2'] }, then: 2 },
              { case: { $eq: ['$currentPriority', 'P3'] }, then: 3 }
            ],
            default: 4
          }
        }
      }
    });

    // Sort by priority level first, then by lower confidence first
    pipeline.push({
      $sort: {
        priorityOrder: 1,
        confidence: 1
      }
    });

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const cases = await TriageDecision.aggregate(pipeline);

    const formattedCases = cases.map((c) => {
      return {
        id: c._id.toString(),
        messageId: c.messageId.toString(),
        category: c.category,
        priority: c.priority,
        summary: c.summary,
        suggestedAction: c.suggestedAction,
        needsHuman: c.needsHuman,
        confidence: c.confidence,
        humanReason: c.humanReason,
        model: c.model,
        promptVersion: c.promptVersion,
        latencyMs: c.latencyMs,
        createdAt: c.createdAt,
        message: {
          id: c.message._id.toString(),
          rawText: c.message.rawText,
          status: c.message.status,
          createdAt: c.message.createdAt,
          updatedAt: c.message.updatedAt
        },
        review: c.review ? {
          id: c.review._id.toString(),
          messageId: c.review.messageId.toString(),
          originalDecisionId: c.review.originalDecisionId.toString(),
          decision: c.review.decision,
          finalCategory: c.review.finalCategory,
          finalPriority: c.review.finalPriority,
          finalAction: c.review.finalAction,
          finalNeedsHuman: c.review.finalNeedsHuman,
          notes: c.review.notes,
          createdAt: c.review.createdAt,
          updatedAt: c.review.updatedAt
        } : null
      };
    });

    return {
      cases: formattedCases,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Creates a review for a specific message and updates its status.
   */
  public async createReview(messageId: string, input: any) {
    const messageDoc = await Message.findById(messageId);
    if (!messageDoc) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    const decisionDoc = await TriageDecision.findOne({ messageId });
    if (!decisionDoc) {
      throw new Error(`Triage decision not found for message ${messageId}`);
    }

    const reviewDoc = await Review.findOneAndUpdate(
      { messageId: new mongoose.Types.ObjectId(messageId) },
      {
        originalDecisionId: decisionDoc._id,
        decision: input.decision,
        finalCategory: input.finalCategory,
        finalPriority: input.finalPriority,
        finalAction: input.finalAction,
        finalNeedsHuman: input.finalNeedsHuman,
        notes: input.notes || '',
      },
      { new: true, upsert: true }
    );

    // Update message status: completed if resolved (finalNeedsHuman = false), else human_review
    messageDoc.status = input.finalNeedsHuman ? 'human_review' : 'completed';
    await messageDoc.save();

    return reviewDoc.toJSON();
  }

  /**
   * Updates an existing review.
   */
  public async updateReview(messageId: string, input: any) {
    const reviewDoc = await Review.findOne({ messageId: new mongoose.Types.ObjectId(messageId) });
    if (!reviewDoc) {
      throw new Error(`Review not found for message ${messageId}`);
    }

    if (input.decision !== undefined) reviewDoc.decision = input.decision;
    if (input.finalCategory !== undefined) reviewDoc.finalCategory = input.finalCategory;
    if (input.finalPriority !== undefined) reviewDoc.finalPriority = input.finalPriority;
    if (input.finalAction !== undefined) reviewDoc.finalAction = input.finalAction;
    if (input.finalNeedsHuman !== undefined) reviewDoc.finalNeedsHuman = input.finalNeedsHuman;
    if (input.notes !== undefined) reviewDoc.notes = input.notes;

    await reviewDoc.save();

    // Update message status if finalNeedsHuman changed
    if (input.finalNeedsHuman !== undefined) {
      const messageDoc = await Message.findById(messageId);
      if (messageDoc) {
        messageDoc.status = input.finalNeedsHuman ? 'human_review' : 'completed';
        await messageDoc.save();
      }
    }

    return reviewDoc.toJSON();
  }
}

export const reviewService = new ReviewService();
