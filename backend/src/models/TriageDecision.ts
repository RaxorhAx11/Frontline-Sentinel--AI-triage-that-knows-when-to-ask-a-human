import mongoose, { Schema } from 'mongoose';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

export interface IDbTriageDecision {
  messageId: mongoose.Types.ObjectId;
  category: string;
  priority: string;
  summary: string;
  suggestedAction: string;
  needsHuman: boolean;
  confidence: number;
  humanReason: string | null;
  model: string | null;
  promptVersion: string | null;
  latencyMs: number | null;
}

const TriageDecisionSchema = new Schema<IDbTriageDecision>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      unique: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.messageId = ret.messageId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const TriageDecision = mongoose.model<any>('TriageDecision', TriageDecisionSchema);
