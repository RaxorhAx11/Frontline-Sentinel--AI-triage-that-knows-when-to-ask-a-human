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
    async getMessages(page, limit, filters) {
        const skip = (page - 1) * limit;
        const query = {};
        if (filters?.status && filters.status !== 'all') {
            query.status = filters.status;
        }
        if ((filters?.priority && filters.priority !== 'all') || (filters?.category && filters.category !== 'all')) {
            const decisionQuery = {};
            if (filters.priority && filters.priority !== 'all') {
                decisionQuery.priority = filters.priority;
            }
            if (filters.category && filters.category !== 'all') {
                decisionQuery.category = filters.category;
            }
            const matchingDecisions = await TriageDecision_1.TriageDecision.find(decisionQuery).select('messageId').lean();
            const messageIds = matchingDecisions.map((d) => d.messageId);
            query._id = { $in: messageIds };
        }
        const total = await Message_1.Message.countDocuments(query);
        const messages = (await Message_1.Message.find(query)
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
    /**
     * Imports a bulk list of messages from a CSV string.
     */
    async importMessagesBulk(csvText) {
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
                const invalidMsg = new Message_1.Message({
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
                const existing = await Message_1.Message.findOne({ externalId });
                if (existing) {
                    isDuplicate = true;
                }
            }
            else {
                // sensible duplicate strategy: exact rawText match within the database
                const existing = await Message_1.Message.findOne({ rawText: rawText.trim() });
                if (existing) {
                    isDuplicate = true;
                }
            }
            if (isDuplicate) {
                duplicateCount++;
                continue;
            }
            // Save as pending
            const pendingMsg = new Message_1.Message({
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
    async getDetailedStats() {
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
        const priorityCounts = await TriageDecision_1.TriageDecision.aggregate([
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
            if (item._id === 'P0')
                stats.p0 = item.count;
            if (item._id === 'P1')
                stats.p1 = item.count;
            if (item._id === 'P2')
                stats.p2 = item.count;
            if (item._id === 'P3')
                stats.p3 = item.count;
        });
        stats.automated = stats.completed;
        stats.highPriority = stats.p0 + stats.p1;
        stats.failedTotal = stats.failed + stats.invalid;
        const avgConfResult = await TriageDecision_1.TriageDecision.aggregate([
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
    parseCsv(csvText) {
        const lines = [];
        let row = [];
        let inQuotes = false;
        let entry = '';
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    entry += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === ',' && !inQuotes) {
                row.push(entry.trim());
                entry = '';
            }
            else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                row.push(entry.trim());
                if (row.length > 1 || row[0] !== '') {
                    lines.push(row);
                }
                row = [];
                entry = '';
            }
            else {
                entry += char;
            }
        }
        if (entry || row.length > 0) {
            row.push(entry.trim());
            lines.push(row);
        }
        if (lines.length === 0)
            return [];
        const headers = lines[0].map(h => h.toLowerCase().replace(/['"]/g, '').trim());
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i];
            const rowObj = {};
            headers.forEach((header, index) => {
                rowObj[header] = values[index] !== undefined ? values[index] : '';
            });
            data.push(rowObj);
        }
        return data;
    }
}
exports.MessageService = MessageService;
exports.messageService = new MessageService();
