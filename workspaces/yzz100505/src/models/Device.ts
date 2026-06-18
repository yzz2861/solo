import mongoose, { Document, Schema } from 'mongoose';

export enum DeviceStatus {
  NORMAL = 'NORMAL',
  MAINTENANCE = 'MAINTENANCE',
  FAULT = 'FAULT'
}

export interface IDevice extends Document {
  name: string;
  status: DeviceStatus;
  lastMaintenanceTime?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, '设备名称不能为空'],
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(DeviceStatus),
      default: DeviceStatus.NORMAL,
      required: [true, '设备状态不能为空']
    },
    lastMaintenanceTime: {
      type: Date
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'devices'
  }
);

// 索引
DeviceSchema.index({ name: 1 }, { unique: true });
DeviceSchema.index({ status: 1 });

export default mongoose.model<IDevice>('Device', DeviceSchema);
