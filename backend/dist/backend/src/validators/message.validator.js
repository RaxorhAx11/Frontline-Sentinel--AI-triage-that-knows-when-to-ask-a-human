"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageSchema = void 0;
const zod_1 = require("zod");
exports.createMessageSchema = zod_1.z.object({
    rawText: zod_1.z
        .string({
        required_error: 'Message text is required',
        invalid_type_error: 'Message text must be a string',
    })
        .trim()
        .min(1, 'Message text cannot be empty'),
});
