import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  vehicleId: mongoose.Types.ObjectId;
  message: string;
  delayMinutes: number;
  sentAt: Date;
  read: boolean;
  readAt?: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, '车辆ID不能为空']
    },
    message: {
      type: String,
      required: [true, '通知内容不能为空'],
      trim: true,
      maxlength: [500, '通知内容不能超过500字符']
    },
    delayMinutes: {
      type: Number,
      required: [true, '晚点分钟数不能为空'],
      min: [1, '晚点分钟数不能小于1']
    },
    sentAt: {
      type: Date,
      default: Date.now,
      required: [true, '发送时间不能为空']
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'notifications'
  }
);

// 索引
NotificationSchema.index({ vehicleId: 1, sentAt: -1 });
NotificationSchema.index({ read: 1, sentAt: -1 });
NotificationSchema.index({ sentAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
