import mongoose, { Schema } from 'mongoose';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

export interface IDbGroundTruth {
  messageId: mongoose.Types.ObjectId;
  groundTruthCategory: string;
  groundTruthPriority: string;
  groundTruthNeedsHuman: boolean;
  notes: string;
}

const GroundTruthSchema = new Schema<IDbGroundTruth>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      unique: true,
    },
    groundTruthCategory: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    groundTruthPriority: {
      type: String,
      enum: PRIORITIES,
      required: true,
    },
    groundTruthNeedsHuman: {
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
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const GroundTruth = mongoose.model<any>('GroundTruth', GroundTruthSchema);
export default GroundTruth;
