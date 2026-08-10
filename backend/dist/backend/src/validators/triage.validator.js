"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triageDecisionSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../../../shared/src/constants");
exports.triageDecisionSchema = zod_1.z.object({
    category: zod_1.z.enum(constants_1.CATEGORIES),
    priority: zod_1.z.enum(constants_1.PRIORITIES),
    summary: zod_1.z.string().min(1, 'Summary cannot be empty'),
    suggestedAction: zod_1.z.string().min(1, 'Suggested action cannot be empty'),
    confidence: zod_1.z.number().min(0).max(1),
    needsHuman: zod_1.z.boolean(),
    humanReason: zod_1.z.string().nullable().optional(),
});
