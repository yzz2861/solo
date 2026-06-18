import { Router, Request, Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import Vehicle from '../models/Vehicle';
import { validateDelayNotification } from '../middleware/validation';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

const router = Router();

router.post('/delay', validateDelayNotification, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId, delayMinutes, message } = req.body;
    const vehicle = res.locals.vehicle;

    const defaultMessage = `【晚点通知】${vehicle.plateNumber}车辆预计晚点${delayMinutes}分钟，请调度员注意安排。`;

    const notification = new Notification({
      vehicleId,
      message: message || defaultMessage,
      delayMinutes,
      sentAt: new Date(),
      read: false
    });

    await notification.save();

    const populatedNotification = await Notification.findById(notification._id)
      .populate('vehicleId')
      .lean();

    res.status(201).json({
      status: 'success',
      message: '晚点通知发送成功',
      data: populatedNotification
    });
  } catch (error) {
    next(error);
  }
});

router.post('/batch-delay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { route, delayMinutes, message } = req.body;

    if (!route) {
      return next(new BadRequestError('线路不能为空'));
    }

    if (!delayMinutes || delayMinutes < 1) {
      return next(new BadRequestError('晚点分钟数必须是大于0的整数'));
    }

    const vehiclesInRoute = await Vehicle.find({ route }).select('_id plateNumber');

    if (vehiclesInRoute.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: '该线路下没有车辆'
      });
    }

    const notifications = vehiclesInRoute.map(vehicle => ({
      vehicleId: vehicle._id,
      message: message || `【晚点通知】${vehicle.plateNumber}车辆预计晚点${delayMinutes}分钟，请调度员注意安排。`,
      delayMinutes,
      sentAt: new Date(),
      read: false
    }));

    const insertedNotifications = await Notification.insertMany(notifications);

    const populatedNotifications = await Notification.find({
      _id: { $in: insertedNotifications.map(n => n._id) }
    })
      .populate('vehicleId')
      .lean();

    res.status(201).json({
      status: 'success',
      message: `批量发送${populatedNotifications.length}条晚点通知成功`,
      data: populatedNotifications
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId, read, page = '1', limit = '20', sortBy = 'sentAt', sortOrder = 'desc' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};

    if (vehicleId) {
      if (!mongoose.Types.ObjectId.isValid(vehicleId as string)) {
        return next(new BadRequestError('无效的车辆ID格式'));
      }
      filter.vehicleId = vehicleId;
    }

    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('vehicleId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter)
    ]);

    const unreadCount = await Notification.countDocuments({ read: false });

    res.status(200).json({
      status: 'success',
      data: notifications,
      summary: {
        unreadCount
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new BadRequestError('无效的通知ID格式'));
    }

    const notification = await Notification.findById(id)
      .populate('vehicleId')
      .lean();

    if (!notification) {
      return next(new NotFoundError('通知不存在'));
    }

    res.status(200).json({
      status: 'success',
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new BadRequestError('无效的通知ID格式'));
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    ).populate('vehicleId');

    if (!notification) {
      return next(new NotFoundError('通知不存在'));
    }

    res.status(200).json({
      status: 'success',
      message: '通知已标记为已读',
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

router.put('/read-all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.status(200).json({
      status: 'success',
      message: `已标记${result.modifiedCount}条通知为已读`,
      data: {
        updatedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new BadRequestError('无效的通知ID格式'));
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return next(new NotFoundError('通知不存在'));
    }

    res.status(200).json({
      status: 'success',
      message: '通知删除成功'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
