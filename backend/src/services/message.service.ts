import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import { triageService } from './triage.service';
import { IMessageDetail, IMessagesResponse } from '../../../shared/src/types';
import { MessageStatus } from '../../../shared/src/constants';

export class MessageService {
  /**
   * Creates a new message and saves it in a pending state.
   */
  public async createMessage(rawText: string): Promise<IMessageDetail> {
    const messageDoc = new Message({
      rawText,
      status: 'pending',
    });
    await messageDoc.save();

    return {
      _id: messageDoc._id.toString(),
      rawText: messageDoc.rawText,
      status: messageDoc.status,
      createdAt: messageDoc.createdAt.toISOString(),
      updatedAt: messageDoc.updatedAt.toISOString(),
      triageDecision: null,
    };
  }

  /**
   * Runs the triage pipeline for a specific message.
   */
  public async runTriage(messageId: string): Promise<any> {
    const messageDoc = await Message.findById(messageId);
    if (!messageDoc) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    // Verify eligibility: skip if already processed successfully
    if (messageDoc.status === 'completed' || messageDoc.status === 'human_review') {
      const existing = await TriageDecision.findOne({ messageId }).lean() as any;
      if (existing) {
        return {
          ...existing,
          id: existing._id.toString(),
          messageId: existing.messageId.toString(),
        };
      }
    }

    messageDoc.status = 'processing';
    await messageDoc.save();

    try {
      const triageResult = await triageService.triageMessage(messageId, messageDoc.rawText);

      const finalStatus: MessageStatus = triageResult.needsHuman ? 'human_review' : 'completed';
      messageDoc.status = finalStatus;
      await messageDoc.save();

      // Save Triage Decision
      const decisionDoc = new TriageDecision({
        ...triageResult,
      });
      await decisionDoc.save();

      return {
        ...decisionDoc.toJSON(),
        id: decisionDoc._id.toString(),
        messageId: decisionDoc.messageId.toString(),
      };
    } catch (error: any) {
      messageDoc.status = 'failed';
      await messageDoc.save();
      throw error;
    }
  }

  /**
   * Retries a failed triage or re-triages an existing message.
   * Cleans up existing decisions first to respect the unique index.
   */
  public async retryTriage(messageId: string): Promise<any> {
    const messageDoc = await Message.findById(messageId);
    if (!messageDoc) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    // Clean up any old triage decisions first
    await TriageDecision.deleteMany({ messageId });

    messageDoc.status = 'processing';
    await messageDoc.save();

    try {
      const triageResult = await triageService.triageMessage(messageId, messageDoc.rawText);

      const finalStatus: MessageStatus = triageResult.needsHuman ? 'human_review' : 'completed';
      messageDoc.status = finalStatus;
      await messageDoc.save();

      // Save Triage Decision
      const decisionDoc = new TriageDecision({
        ...triageResult,
      });
      await decisionDoc.save();

      return {
        ...decisionDoc.toJSON(),
        id: decisionDoc._id.toString(),
        messageId: decisionDoc.messageId.toString(),
      };
    } catch (error: any) {
      messageDoc.status = 'failed';
      await messageDoc.save();
      throw error;
    }
  }

  /**
   * Fetches a page of messages, joining each with its triage decision using batch query resolving.
   */
  public async getMessages(page: number, limit: number): Promise<IMessagesResponse> {
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments();
    const messages = (await Message.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()) as any[];

    const totalPages = Math.ceil(total / limit);

    if (messages.length === 0) {
      return { messages: [], total, page, totalPages };
    }

    // Batch resolve decisions to avoid N+1 query problem
    const messageIds = messages.map((m) => m._id);
    const decisions = (await TriageDecision.find({
      messageId: { $in: messageIds },
    }).lean()) as any[];

    const decisionMap = new Map<string, any>();
    decisions.forEach((d) => {
      decisionMap.set(d.messageId.toString(), {
        ...d,
        id: d._id.toString(),
        messageId: d.messageId.toString(),
      });
    });

    const messagesWithDecisions: IMessageDetail[] = messages.map((m) => {
      const decision = decisionMap.get(m._id.toString()) || null;
      return {
        _id: m._id.toString(),
        rawText: m.rawText,
        status: m.status,
        createdAt: (m.createdAt as Date).toISOString(),
        updatedAt: (m.updatedAt as Date).toISOString(),
        triageDecision: decision,
      };
    });

    return {
      messages: messagesWithDecisions,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Fetches a single message details, including its triage decision.
   */
  public async getMessageById(id: string): Promise<IMessageDetail | null> {
    const message = (await Message.findById(id).lean()) as any;
    if (!message) return null;

    const decision = (await TriageDecision.findOne({ messageId: id }).lean()) as any;

    return {
      _id: message._id.toString(),
      rawText: message.rawText,
      status: message.status,
      createdAt: (message.createdAt as Date).toISOString(),
      updatedAt: (message.updatedAt as Date).toISOString(),
      triageDecision: decision
        ? ({
            ...decision,
            id: decision._id.toString(),
            messageId: decision.messageId.toString(),
          } as any)
        : null,
    };
  }

  /**
   * Compiles dashboard totals for statuses.
   */
  public async getDashboardStats() {
    const counts = await Message.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      humanReview: 0,
    };

    counts.forEach((item) => {
      const count = item.count;
      stats.total += count;

      switch (item._id) {
        case 'pending':
          stats.pending = count;
          break;
        case 'processing':
          stats.processing = count;
          break;
        case 'completed':
          stats.completed = count;
          break;
        case 'failed':
          stats.failed = count;
          break;
        case 'human_review':
          stats.humanReview = count;
          break;
      }
    });

    return stats;
  }
}

export const messageService = new MessageService();
