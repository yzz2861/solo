import { Router, Request, Response, NextFunction } from 'express';
import Device, { DeviceStatus, IDevice } from '../models/Device';
import { validateDeviceStatusUpdate } from '../middleware/validation';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, status = DeviceStatus.NORMAL, description } = req.body;

    if (!name) {
      return next(new BadRequestError('设备名称不能为空'));
    }

    const existingDevice = await Device.findOne({ name });
    if (existingDevice) {
      return res.status(409).json({
        status: 'fail',
        message: '设备名称已存在'
      });
    }

    const device = new Device({
      name,
      status,
      description,
      lastMaintenanceTime: status === DeviceStatus.MAINTENANCE ? new Date() : undefined
    });

    await device.save();

    res.status(201).json({
      status: 'success',
      message: '设备创建成功',
      data: device
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const devices = await Device.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const statusCounts = await Device.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const summary: Record<string, number> = {
      [DeviceStatus.NORMAL]: 0,
      [DeviceStatus.MAINTENANCE]: 0,
      [DeviceStatus.FAULT]: 0
    };

    statusCounts.forEach((item: { _id: string; count: number }) => {
      summary[item._id] = item.count;
    });

    res.status(200).json({
      status: 'success',
      data: devices,
      summary
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new BadRequestError('无效的设备ID格式'));
    }

    const device = await Device.findById(id).lean();

    if (!device) {
      return next(new NotFoundError('设备不存在'));
    }

    res.status(200).json({
      status: 'success',
      data: device
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', validateDeviceStatusUpdate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData: Partial<IDevice> = { status };

    if (status === DeviceStatus.MAINTENANCE || status === DeviceStatus.FAULT) {
      updateData.lastMaintenanceTime = new Date();
    }

    const device = await Device.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!device) {
      return next(new NotFoundError('设备不存在'));
    }

    let message = '设备状态更新成功';
    if (status === DeviceStatus.MAINTENANCE) {
      message = '设备已设置为检修状态，进站将被暂停';
    } else if (status === DeviceStatus.FAULT) {
      message = '设备已设置为故障状态，进站将被暂停';
    } else if (status === DeviceStatus.NORMAL) {
      message = '设备已恢复正常，进站已开放';
    }

    res.status(200).json({
      status: 'success',
      message,
      data: device
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new BadRequestError('无效的设备ID格式'));
    }

    if (name) {
      const existingDevice = await Device.findOne({
        name,
        _id: { $ne: id }
      });

      if (existingDevice) {
        return res.status(409).json({
          status: 'fail',
          message: '设备名称已被其他设备使用'
        });
      }
    }

    const device = await Device.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!device) {
      return next(new NotFoundError('设备不存在'));
    }

    res.status(200).json({
      status: 'success',
      message: '设备信息更新成功',
      data: device
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new BadRequestError('无效的设备ID格式'));
    }

    const device = await Device.findByIdAndDelete(id);

    if (!device) {
      return next(new NotFoundError('设备不存在'));
    }

    res.status(200).json({
      status: 'success',
      message: '设备删除成功'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
