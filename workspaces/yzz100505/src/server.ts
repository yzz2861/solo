import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';
import Device, { DeviceStatus } from './models/Device';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanitation-queue';

process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 服务器关闭中...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 服务器关闭中...');
  console.error(err.name, err.message);
  console.error(err.stack);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM 收到，正在优雅关闭...');
  server.close(() => {
    console.log('进程已终止');
    mongoose.connection.close().then(() => {
      console.log('MongoDB 连接已关闭');
    });
  });
});

mongoose.set('strictQuery', true);

async function initializeDefaultDevice(): Promise<void> {
  try {
    const existingDevice = await Device.findOne({ name: '主压缩设备' });
    if (!existingDevice) {
      const defaultDevice = new Device({
        name: '主压缩设备',
        status: DeviceStatus.NORMAL,
        description: '压缩站主要压缩处理设备'
      });
      await defaultDevice.save();
      console.log('默认设备已创建: 主压缩设备');
    }
  } catch (error) {
    console.error('初始化默认设备失败:', error);
  }
}

async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB 连接成功');

    await mongoose.connection.db.admin().ping();
    console.log('MongoDB 连接验证通过');

    await initializeDefaultDevice();
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
}

const server = app.listen(PORT, async () => {
  console.log(`
  ============================================
  环卫压缩站转运排队系统 API
  ============================================
  环境: ${process.env.NODE_ENV || 'development'}
  端口: ${PORT}
  地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/health
  API 文档: http://localhost:${PORT}/api
  ============================================
  `);

  await connectDB();
});

export default server;
