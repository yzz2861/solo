import { Router, Request, Response, NextFunction } from 'express';
import QueueRecord, { QueueStatus } from '../models/QueueRecord';
import {
  validateQueueArrive,
  validateWeigh,
  validateCompressStart,
  validateCompressEnd,
  validateExit,
  validateSkip,
  validateAbnormalExit
} from '../middleware/validation';
import { calculateQueuePosition, recalculateQueuePositions } from '../utils/prediction';

const router = Router();

router.post('/arrive', validateQueueArrive, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId } = req.body;

    const maxPosition = await QueueRecord.findOne({
      status: { $in: [QueueStatus.WAITING, QueueStatus.WEIGHING, QueueStatus.COMPRESSING] }
    })
      .sort({ queuePosition: -1 })
      .select('queuePosition')
      .lean();

    const queuePosition = calculateQueuePosition(maxPosition?.queuePosition ?? null);

    const queueRecord = new QueueRecord({
      vehicleId,
      status: QueueStatus.WAITING,
      arrivalTime: new Date(),
      queuePosition
    });

    await queueRecord.save();

    const populatedRecord = await QueueRecord.findById(queueRecord._id)
      .populate('vehicleId')
      .lean();

    res.status(201).json({
      status: 'success',
      message: '车辆进场成功',
      data: populatedRecord
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/weigh', validateWeigh, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { weight } = req.body;

    const record = res.locals.queueRecord;
    record.status = QueueStatus.WEIGHING;
    record.weighTime = new Date();
    record.weight = weight;

    await record.save();

    const populatedRecord = await QueueRecord.findById(id)
      .populate('vehicleId')
      .lean();

    res.status(200).json({
      status: 'success',
      message: '称重完成',
      data: populatedRecord
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/compress-start', validateCompressStart, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const record = res.locals.queueRecord;
    record.status = QueueStatus.COMPRESSING;
    record.compressStartTime = new Date();

    await record.save();

    const populatedRecord = await QueueRecord.findById(id)
      .populate('vehicleId')
      .lean();

    res.status(200).json({
      status: 'success',
      message: '开始压缩',
      data: populatedRecord
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/compress-end', validateCompressEnd, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const record = res.locals.queueRecord;
    record.compressEndTime = new Date();

    await record.save();

    const populatedRecord = await QueueRecord.findById(id)
      .populate('vehicleId')
      .lean();

    res.status(200).json({
      status: 'success',
      message: '压缩完成',
      data: populatedRecord
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/exit', validateExit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const record = res.locals.queueRecord;
    record.status = QueueStatus.COMPLETED;
    record.exitTime = new Date();

    await record.save();
    await recalculateQueuePositions();

    const populatedRecord = await QueueRecord.findById(id)
      .populate('vehicleId')
      .lean();

    res.status(200).json({
      status: 'success',
      message: '车辆出场成功',
      data: populatedRecord
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/skip', validateSkip, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { skipReason } = req.body;

    const record = res.locals.queueRecord;
    record.status = QueueStatus.SKIPPED;
    record.skipReason = skipReason;
    record.exitTime = new Date();

    await record.save();
    await recalculateQueuePositions();

    const populatedRecord = await QueueRecord.findById(id)
      .populate('vehicleId')
      .lean();

    res.status(200).json({
      status: 'success',
      message: '跳队处理完成',
      data: populatedRecord
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/abnormal-exit', validateAbnormalExit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { abnormalExitReason } = req.body;

    const record = res.locals.queueRecord;
    record.status = QueueStatus.ABNORMAL;
    record.abnormalExitReason = abnormalExitReason;
    record.exitTime = new Date();

    await record.save();
    await recalculateQueuePositions();

    const populatedRecord = await QueueRecord.findById(id)
      .populate('vehicleId')
      .lean();

    res.status(200).json({
      status: 'success',
      message: '异常退场处理完成',
      data: populatedRecord
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { route, status, includeHistory = 'false' } = req.query;

    let filter: Record<string, unknown> = {};

    if (!includeHistory || includeHistory === 'false') {
      filter.status = {
        $in: [QueueStatus.WAITING, QueueStatus.WEIGHING, QueueStatus.COMPRESSING]
      };
    }

    if (status) {
      const statusArray = (status as string).split(',');
      filter.status = { $in: statusArray };
    }

    let query = QueueRecord.find(filter);

    if (route) {
      const { default: Vehicle } = await import('../models/Vehicle');
      const vehiclesInRoute = await Vehicle.find({ route: route as string }).select('_id');
      const vehicleIds = vehiclesInRoute.map(v => v._id);
      query = query.where('vehicleId').in(vehicleIds);
    }

    const records = await query
      .populate('vehicleId')
      .sort({ queuePosition: 1, arrivalTime: 1 })
      .lean();

    const waitingCount = records.filter(r => r.status === QueueStatus.WAITING).length;
    const processingCount = records.filter(
      r => r.status === QueueStatus.WEIGHING || r.status === QueueStatus.COMPRESSING
    ).length;

    res.status(200).json({
      status: 'success',
      data: records,
      summary: {
        total: records.length,
        waiting: waitingCount,
        processing: processingCount
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const record = await QueueRecord.findById(id)
      .populate('vehicleId')
      .lean();

    if (!record) {
      res.status(404).json({
        status: 'fail',
        message: '排队记录不存在'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: record
    });
  } catch (error) {
    next(error);
  }
});

export default router;
