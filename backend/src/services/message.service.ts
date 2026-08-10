import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import { GroundTruth } from '../models/GroundTruth';
import { Review } from '../models/Review';
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
  public async getMessages(
    page: number,
    limit: number,
    filters?: { status?: string; priority?: string; category?: string }
  ): Promise<IMessagesResponse> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if ((filters?.priority && filters.priority !== 'all') || (filters?.category && filters.category !== 'all')) {
      const decisionQuery: any = {};
      if (filters.priority && filters.priority !== 'all') {
        decisionQuery.priority = filters.priority;
      }
      if (filters.category && filters.category !== 'all') {
        decisionQuery.category = filters.category;
      }

      const matchingDecisions = await TriageDecision.find(decisionQuery).select('messageId').lean();
      const messageIds = matchingDecisions.map((d) => d.messageId);
      query._id = { $in: messageIds };
    }

    const total = await Message.countDocuments(query);
    const messages = (await Message.find(query)
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

  /**
   * Imports a bulk list of messages from a CSV string.
   */
  public async importMessagesBulk(csvText: string): Promise<any> {
    const rows = this.parseCsv(csvText);
    if (rows.length === 0) {
      return { total: 0, valid: 0, invalid: 0, duplicates: 0, imported: 0 };
    }

    const headers = Object.keys(rows[0]);
    const textKeys = ['message', 'text', 'ticket', 'rawtext', 'customer_message', 'body', 'description', 'issue', 'ticket_text', 'query'];
    const idKeys = ['id', 'external_id', 'message_id', 'ticket_id', 'msg_id', '_id'];

    const textKey = headers.find((h) => textKeys.includes(h.toLowerCase())) || headers[0];
    const idKey = headers.find((h) => idKeys.includes(h.toLowerCase()));

    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let importedCount = 0;

    for (const row of rows) {
      const rawText = row[textKey];
      const externalId = idKey && row[idKey] ? String(row[idKey]).trim() : null;

      // Input Validation
      if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
        invalidCount++;
        // Create an invalid message
        const invalidMsg = new Message({
          rawText: typeof rawText === 'string' && rawText.trim().length > 0 ? rawText : '[Empty Message]',
          status: 'invalid',
          externalId,
        });
        await invalidMsg.save();
        continue;
      }

      // Duplicate Handling
      let isDuplicate = false;
      if (externalId) {
        const existing = await Message.findOne({ externalId });
        if (existing) {
          isDuplicate = true;
        }
      } else {
        // sensible duplicate strategy: exact rawText match within the database
        const existing = await Message.findOne({ rawText: rawText.trim() });
        if (existing) {
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      // Save as pending
      const pendingMsg = new Message({
        rawText: rawText.trim(),
        status: 'pending',
        externalId,
      });
      await pendingMsg.save();
      validCount++;
      importedCount++;
    }

    return {
      total: rows.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
      imported: importedCount,
    };
  }

  /**
   * Compiles detailed dashboard statistics.
   */
  public async getDetailedStats() {
    const counts = await Message.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats: any = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      humanReview: 0,
      invalid: 0,
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      automated: 0,
      highPriority: 0,
      failedTotal: 0,
      averageConfidence: 0,
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
        case 'invalid':
          stats.invalid = count;
          break;
      }
    });

    // Aggregations on TriageDecision joined with reviews to compute current priorities
    const priorityCounts = await TriageDecision.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: 'messageId',
          foreignField: 'messageId',
          as: 'review',
        },
      },
      {
        $unwind: {
          path: '$review',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          currentPriority: {
            $cond: {
              if: '$review',
              then: '$review.finalPriority',
              else: '$priority',
            },
          },
        },
      },
      {
        $group: {
          _id: '$currentPriority',
          count: { $sum: 1 },
        },
      },
    ]);

    priorityCounts.forEach((item) => {
      if (item._id === 'P0') stats.p0 = item.count;
      if (item._id === 'P1') stats.p1 = item.count;
      if (item._id === 'P2') stats.p2 = item.count;
      if (item._id === 'P3') stats.p3 = item.count;
    });

    stats.automated = stats.completed;
    stats.highPriority = stats.p0 + stats.p1;
    stats.failedTotal = stats.failed + stats.invalid;

    const avgConfResult = await TriageDecision.aggregate([
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' },
        },
      },
    ]);

    if (avgConfResult.length > 0 && avgConfResult[0].avgConfidence !== null) {
      stats.averageConfidence = parseFloat(avgConfResult[0].avgConfidence.toFixed(4));
    }

    return stats;
  }

  /**
   * Helper to parse CSV data safely.
   */
  private parseCsv(csvText: string): any[] {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let entry = '';

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          entry += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(entry.trim());
        entry = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(entry.trim());
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        entry = '';
      } else {
        entry += char;
      }
    }
    if (entry || row.length > 0) {
      row.push(entry.trim());
      lines.push(row);
    }

    if (lines.length === 0) return [];
    const headers = lines[0].map(h => h.toLowerCase().replace(/['"]/g, '').trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      const rowObj: any = {};
      headers.forEach((header, index) => {
        rowObj[header] = values[index] !== undefined ? values[index] : '';
      });
      data.push(rowObj);
    }

    return data;
  }

  /**
   * Deletes a specific message and all its related records.
   */
  public async deleteMessage(messageId: string): Promise<boolean> {
    // Delete related records in parallel to prevent leaving orphans
    await Promise.all([
      TriageDecision.deleteMany({ messageId }),
      GroundTruth.deleteMany({ messageId }),
      Review.deleteMany({ messageId })
    ]);

    // Delete the message itself
    const result = await Message.deleteOne({ _id: messageId });
    return (result.deletedCount ?? 0) > 0;
  }

  /**
   * Deletes all Messages, TriageDecisions, GroundTruths, and Reviews.
   */
  public async resetAllData(): Promise<void> {
    await Promise.all([
      TriageDecision.deleteMany({}),
      GroundTruth.deleteMany({}),
      Review.deleteMany({}),
      Message.deleteMany({})
    ]);
  }
}

export const messageService = new MessageService();
