"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriageDecision = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const constants_1 = require("../../../shared/src/constants");
const TriageDecisionSchema = new mongoose_1.Schema({
    messageId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Message',
        required: true,
        unique: true,
    },
    category: {
        type: String,
        enum: constants_1.CATEGORIES,
        required: true,
    },
    priority: {
        type: String,
        enum: constants_1.PRIORITIES,
        required: true,
    },
    summary: {
        type: String,
        required: true,
        trim: true,
    },
    suggestedAction: {
        type: String,
        required: true,
        trim: true,
    },
    needsHuman: {
        type: Boolean,
        required: true,
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
    },
    humanReason: {
        type: String,
        default: null,
    },
    model: {
        type: String,
        default: null,
    },
    promptVersion: {
        type: String,
        default: null,
    },
    latencyMs: {
        type: Number,
        default: null,
    },
    inputTokens: {
        type: Number,
        default: null,
    },
    outputTokens: {
        type: Number,
        default: null,
    },
    totalTokens: {
        type: Number,
        default: null,
    },
    estimatedCost: {
        type: Number,
        default: null,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id.toString();
            ret.messageId = ret.messageId.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});
exports.TriageDecision = mongoose_1.default.model('TriageDecision', TriageDecisionSchema);
