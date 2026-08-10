import mongoose, { Schema } from 'mongoose';
import { STATUSES } from '../../../shared/src/constants';

const MessageSchema = new Schema(
  {
    rawText: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Message = mongoose.model<any>('Message', MessageSchema);
