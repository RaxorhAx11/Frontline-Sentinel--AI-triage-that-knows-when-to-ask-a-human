"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageService = exports.MessageService = void 0;
const Message_1 = require("../models/Message");
const TriageDecision_1 = require("../models/TriageDecision");
const triage_service_1 = require("./triage.service");
class MessageService {
    /**
     * Creates a new message and immediately runs it through the triage pipeline.
     */
    async createMessage(rawText) {
        // 1. Create message in pending state
        const messageDoc = new Message_1.Message({
            rawText,
            status: 'pending',
        });
        await messageDoc.save();
        const messageId = messageDoc._id.toString();
        try {
            // Update status to processing
            messageDoc.status = 'processing';
            await messageDoc.save();
            // 2. Execute Triage Pipeline
            const triageResult = await triage_service_1.triageService.triageMessage(messageId, rawText);
            // 3. Determine final message status based on triage decision
            const finalStatus = triageResult.needsHuman ? 'human_review' : 'completed';
            messageDoc.status = finalStatus;
            await messageDoc.save();
            // 4. Save Triage Decision
            const decisionDoc = new TriageDecision_1.TriageDecision({
                ...triageResult,
            });
            await decisionDoc.save();
            return {
                _id: messageId,
                rawText: messageDoc.rawText,
                status: messageDoc.status,
                createdAt: messageDoc.createdAt.toISOString(),
                updatedAt: messageDoc.updatedAt.toISOString(),
                triageDecision: decisionDoc.toJSON(),
            };
        }
        catch (error) {
            console.error(`Pipeline failure for message ${messageId}:`, error);
            // Fallback: update status to failed
            messageDoc.status = 'failed';
            await messageDoc.save();
            return {
                _id: messageId,
                rawText: messageDoc.rawText,
                status: messageDoc.status,
                createdAt: messageDoc.createdAt.toISOString(),
                updatedAt: messageDoc.updatedAt.toISOString(),
                triageDecision: null,
            };
        }
    }
    /**
     * Fetches a page of messages, joining each with its triage decision using batch query resolving.
     */
    async getMessages(page, limit) {
        const skip = (page - 1) * limit;
        const total = await Message_1.Message.countDocuments();
        const messages = (await Message_1.Message.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean());
        const totalPages = Math.ceil(total / limit);
        if (messages.length === 0) {
            return { messages: [], total, page, totalPages };
        }
        // Batch resolve decisions to avoid N+1 query problem
        const messageIds = messages.map((m) => m._id);
        const decisions = (await TriageDecision_1.TriageDecision.find({
            messageId: { $in: messageIds },
        }).lean());
        const decisionMap = new Map();
        decisions.forEach((d) => {
            decisionMap.set(d.messageId.toString(), {
                ...d,
                id: d._id.toString(),
                messageId: d.messageId.toString(),
            });
        });
        const messagesWithDecisions = messages.map((m) => {
            const decision = decisionMap.get(m._id.toString()) || null;
            return {
                _id: m._id.toString(),
                rawText: m.rawText,
                status: m.status,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
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
    async getMessageById(id) {
        const message = (await Message_1.Message.findById(id).lean());
        if (!message)
            return null;
        const decision = (await TriageDecision_1.TriageDecision.findOne({ messageId: id }).lean());
        return {
            _id: message._id.toString(),
            rawText: message.rawText,
            status: message.status,
            createdAt: message.createdAt.toISOString(),
            updatedAt: message.updatedAt.toISOString(),
            triageDecision: decision
                ? {
                    ...decision,
                    id: decision._id.toString(),
                    messageId: decision.messageId.toString(),
                }
                : null,
        };
    }
    /**
     * Compiles dashboard totals for statuses.
     */
    async getDashboardStats() {
        const counts = await Message_1.Message.aggregate([
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
exports.MessageService = MessageService;
exports.messageService = new MessageService();
