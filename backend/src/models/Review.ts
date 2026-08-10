import mongoose, { Schema } from 'mongoose';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

export interface IDbReview {
  messageId: mongoose.Types.ObjectId;
  reviewerId: string | null;
  originalDecisionId: mongoose.Types.ObjectId;
  decision: 'accepted' | 'overridden';
  finalCategory: string;
  finalPriority: string;
  finalAction: string;
  finalNeedsHuman: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IDbReview>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      unique: true,
    },
    reviewerId: {
      type: String,
      default: null,
    },
    originalDecisionId: {
      type: Schema.Types.ObjectId,
      ref: 'TriageDecision',
      required: true,
    },
    decision: {
      type: String,
      enum: ['accepted', 'overridden'],
      required: true,
    },
    finalCategory: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    finalPriority: {
      type: String,
      enum: PRIORITIES,
      required: true,
    },
    finalAction: {
      type: String,
      required: true,
      trim: true,
    },
    finalNeedsHuman: {
      type: Boolean,
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.messageId = ret.messageId.toString();
        ret.originalDecisionId = ret.originalDecisionId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Review = mongoose.model<any>('Review', ReviewSchema);
export default Review;
