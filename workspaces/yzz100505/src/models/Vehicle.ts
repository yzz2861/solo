import mongoose, { Document, Schema } from 'mongoose';

export interface IVehicle extends Document {
  plateNumber: string;
  route: string;
  driverName: string;
  createdAt: Date;
}

const VehicleSchema: Schema = new Schema(
  {
    plateNumber: {
      type: String,
      required: [true, '车牌号不能为空'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z0-9]{4,5}$/, '请输入有效的车牌号']
    },
    route: {
      type: String,
      required: [true, '所属线路不能为空'],
      trim: true
    },
    driverName: {
      type: String,
      required: [true, '司机姓名不能为空'],
      trim: true
    }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: false
    },
    collection: 'vehicles'
  }
);

// 索引
VehicleSchema.index({ plateNumber: 1 }, { unique: true });
VehicleSchema.index({ route: 1 });

export default mongoose.model<IVehicle>('Vehicle', VehicleSchema);
