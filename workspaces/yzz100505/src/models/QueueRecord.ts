import mongoose, { Document, Schema } from 'mongoose';

export enum QueueStatus {
  WAITING = 'WAITING',
  WEIGHING = 'WEIGHING',
  COMPRESSING = 'COMPRESSING',
  COMPLETED = 'COMPLETED',
  ABNORMAL = 'ABNORMAL',
  SKIPPED = 'SKIPPED'
}

export interface IQueueRecord extends Document {
  vehicleId: mongoose.Types.ObjectId;
  status: QueueStatus;
  arrivalTime: Date;
  weighTime?: Date;
  weight?: number;
  compressStartTime?: Date;
  compressEndTime?: Date;
  exitTime?: Date;
  skipReason?: string;
  abnormalExitReason?: string;
  queuePosition: number;
  waitDuration?: number;
  compressDuration?: number;
  totalDuration?: number;
}

const QueueRecordSchema: Schema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, '车辆ID不能为空']
    },
    status: {
      type: String,
      enum: Object.values(QueueStatus),
      default: QueueStatus.WAITING,
      required: [true, '状态不能为空']
    },
    arrivalTime: {
      type: Date,
      default: Date.now,
      required: [true, '进场时间不能为空']
    },
    weighTime: {
      type: Date
    },
    weight: {
      type: Number,
      min: [0, '重量不能为负数'],
      max: [50000, '重量超过最大限制']
    },
    compressStartTime: {
      type: Date
    },
    compressEndTime: {
      type: Date
    },
    exitTime: {
      type: Date
    },
    skipReason: {
      type: String,
      trim: true
    },
    abnormalExitReason: {
      type: String,
      trim: true
    },
    queuePosition: {
      type: Number,
      required: [true, '排队位置不能为空'],
      min: [1, '排队位置不能小于1']
    },
    waitDuration: {
      type: Number,
      description: '等待时长（分钟）'
    },
    compressDuration: {
      type: Number,
      description: '压缩时长（分钟）'
    },
    totalDuration: {
      type: Number,
      description: '总时长（分钟）'
    }
  },
  {
    timestamps: true,
    collection: 'queue_records'
  }
);

// 索引
QueueRecordSchema.index({ vehicleId: 1, status: 1 });
QueueRecordSchema.index({ status: 1, arrivalTime: -1 });
QueueRecordSchema.index({ status: 1, queuePosition: 1 });
QueueRecordSchema.index({ arrivalTime: -1 });
QueueRecordSchema.index({ exitTime: -1 });

// 预保存钩子 - 计算时长
QueueRecordSchema.pre('save', function(next) {
  const record = this as IQueueRecord;

  // 计算等待时长（从进场到开始压缩）
  if (record.compressStartTime && record.arrivalTime) {
    record.waitDuration = Math.round(
      (record.compressStartTime.getTime() - record.arrivalTime.getTime()) / 60000
    );
  }

  // 计算压缩时长
  if (record.compressEndTime && record.compressStartTime) {
    record.compressDuration = Math.round(
      (record.compressEndTime.getTime() - record.compressStartTime.getTime()) / 60000
    );
  }

  // 计算总时长
  if (record.exitTime && record.arrivalTime) {
    record.totalDuration = Math.round(
      (record.exitTime.getTime() - record.arrivalTime.getTime()) / 60000
    );
  }

  next();
});

export default mongoose.model<IQueueRecord>('QueueRecord', QueueRecordSchema);
