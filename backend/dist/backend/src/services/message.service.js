"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageService = exports.MessageService = void 0;
const Message_1 = require("../models/Message");
const TriageDecision_1 = require("../models/TriageDecision");
const triage_service_1 = require("./triage.service");
class MessageService {
    /**
     * Creates a new message and saves it in a pending state.
     */
    async createMessage(rawText) {
        const messageDoc = new Message_1.Message({
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
    async runTriage(messageId) {
        const messageDoc = await Message_1.Message.findById(messageId);
        if (!messageDoc) {
            throw new Error(`Message with ID ${messageId} not found`);
        }
        // Verify eligibility: skip if already processed successfully
        if (messageDoc.status === 'completed' || messageDoc.status === 'human_review') {
            const existing = await TriageDecision_1.TriageDecision.findOne({ messageId }).lean();
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
            const triageResult = await triage_service_1.triageService.triageMessage(messageId, messageDoc.rawText);
            const finalStatus = triageResult.needsHuman ? 'human_review' : 'completed';
            messageDoc.status = finalStatus;
            await messageDoc.save();
            // Save Triage Decision
            const decisionDoc = new TriageDecision_1.TriageDecision({
                ...triageResult,
            });
            await decisionDoc.save();
            return {
                ...decisionDoc.toJSON(),
                id: decisionDoc._id.toString(),
                messageId: decisionDoc.messageId.toString(),
            };
        }
        catch (error) {
            messageDoc.status = 'failed';
            await messageDoc.save();
            throw error;
        }
    }
    /**
     * Retries a failed triage or re-triages an existing message.
     * Cleans up existing decisions first to respect the unique index.
     */
    async retryTriage(messageId) {
        const messageDoc = await Message_1.Message.findById(messageId);
        if (!messageDoc) {
            throw new Error(`Message with ID ${messageId} not found`);
        }
        // Clean up any old triage decisions first
        await TriageDecision_1.TriageDecision.deleteMany({ messageId });
        messageDoc.status = 'processing';
        await messageDoc.save();
        try {
            const triageResult = await triage_service_1.triageService.triageMessage(messageId, messageDoc.rawText);
            const finalStatus = triageResult.needsHuman ? 'human_review' : 'completed';
            messageDoc.status = finalStatus;
            await messageDoc.save();
            // Save Triage Decision
            const decisionDoc = new TriageDecision_1.TriageDecision({
                ...triageResult,
            });
            await decisionDoc.save();
            return {
                ...decisionDoc.toJSON(),
                id: decisionDoc._id.toString(),
                messageId: decisionDoc.messageId.toString(),
            };
        }
        catch (error) {
            messageDoc.status = 'failed';
            await messageDoc.save();
            throw error;
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
