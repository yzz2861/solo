import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult, query } from 'express-validator';
import { BadRequestError } from './errorHandler';
import QueueRecord, { QueueStatus } from '../models/QueueRecord';
import Device, { DeviceStatus } from '../models/Device';
import Vehicle from '../models/Vehicle';
import mongoose from 'mongoose';

export const validate = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join(', ');
    return next(new BadRequestError(messages));
  }
  next();
};

export const validateVehicleCreation = [
  body('plateNumber')
    .notEmpty().withMessage('车牌号不能为空')
    .isString().withMessage('车牌号必须是字符串')
    .trim()
    .matches(/^[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z0-9]{4,5}$/).withMessage('请输入有效的车牌号'),
  body('route')
    .notEmpty().withMessage('所属线路不能为空')
    .isString().withMessage('所属线路必须是字符串')
    .trim(),
  body('driverName')
    .notEmpty().withMessage('司机姓名不能为空')
    .isString().withMessage('司机姓名必须是字符串')
    .trim(),
  validate
];

export const validateQueueArrive = [
  body('vehicleId')
    .notEmpty().withMessage('车辆ID不能为空')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的车辆ID格式'),
  validate,
  checkVehicleExists,
  checkVehicleNotInQueue,
  checkDeviceAvailable
];

export const validateWeigh = [
  param('id')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的记录ID格式'),
  body('weight')
    .notEmpty().withMessage('重量不能为空')
    .isFloat({ min: 0, max: 50000 }).withMessage('重量必须在0-50000之间'),
  validate,
  checkQueueRecordExists,
  checkRecordStatus([QueueStatus.WAITING], '只能对等待中的车辆进行称重')
];

export const validateCompressStart = [
  param('id')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的记录ID格式'),
  validate,
  checkQueueRecordExists,
  checkRecordStatus([QueueStatus.WAITING, QueueStatus.WEIGHING], '只能对等待或称重中的车辆开始压缩'),
  checkHasWeightRecord
];

export const validateCompressEnd = [
  param('id')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的记录ID格式'),
  validate,
  checkQueueRecordExists,
  checkRecordStatus([QueueStatus.COMPRESSING], '只能对压缩中的车辆结束压缩')
];

export const validateExit = [
  param('id')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的记录ID格式'),
  validate,
  checkQueueRecordExists,
  checkRecordStatus([QueueStatus.COMPRESSING], '只能对压缩中的车辆进行出场'),
  checkHasWeightRecord,
  checkHasCompressEndTime
];

export const validateSkip = [
  param('id')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的记录ID格式'),
  body('skipReason')
    .notEmpty().withMessage('跳队原因不能为空')
    .isString().withMessage('跳队原因必须是字符串')
    .trim()
    .isLength({ min: 5 }).withMessage('跳队原因至少5个字符'),
  validate,
  checkQueueRecordExists,
  checkRecordStatus([QueueStatus.WAITING, QueueStatus.WEIGHING], '只能跳队等待中或称重中的车辆')
];

export const validateAbnormalExit = [
  param('id')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的记录ID格式'),
  body('abnormalExitReason')
    .notEmpty().withMessage('异常退场原因不能为空')
    .isString().withMessage('异常退场原因必须是字符串')
    .trim()
    .isLength({ min: 5 }).withMessage('异常退场原因至少5个字符'),
  validate,
  checkQueueRecordExists,
  checkRecordStatus(
    [QueueStatus.WAITING, QueueStatus.WEIGHING, QueueStatus.COMPRESSING],
    '只能对处理中的车辆进行异常退场'
  )
];

export const validateDeviceStatusUpdate = [
  param('id')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的设备ID格式'),
  body('status')
    .notEmpty().withMessage('状态不能为空')
    .isIn(Object.values(DeviceStatus)).withMessage(`状态必须是: ${Object.values(DeviceStatus).join(', ')}`),
  validate
];

export const validateDelayNotification = [
  body('vehicleId')
    .notEmpty().withMessage('车辆ID不能为空')
    .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('无效的车辆ID格式'),
  body('delayMinutes')
    .notEmpty().withMessage('晚点分钟数不能为空')
    .isInt({ min: 1 }).withMessage('晚点分钟数必须是大于0的整数'),
  body('message')
    .optional()
    .isString().withMessage('通知内容必须是字符串')
    .trim()
    .isLength({ max: 500 }).withMessage('通知内容不能超过500字符'),
  validate,
  checkVehicleExists
];

export const validateStatsQuery = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('开始日期格式错误'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('结束日期格式错误'),
  query('route')
    .optional()
    .isString().withMessage('线路必须是字符串'),
  validate
];

export const validatePredictionQuery = [
  query('route')
    .optional()
    .isString().withMessage('线路必须是字符串'),
  validate
];

async function checkVehicleExists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicleId = req.body.vehicleId || req.params.vehicleId;
    if (!vehicleId) return next();

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return next(new BadRequestError('车辆不存在'));
    }

    res.locals.vehicle = vehicle;
    next();
  } catch (error) {
    next(error);
  }
}

async function checkVehicleNotInQueue(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const { vehicleId } = req.body;
    const activeStatuses = [
      QueueStatus.WAITING,
      QueueStatus.WEIGHING,
      QueueStatus.COMPRESSING
    ];

    const existingRecord = await QueueRecord.findOne({
      vehicleId,
      status: { $in: activeStatuses }
    });

    if (existingRecord) {
      return next(new BadRequestError('该车辆已有未完成的排队记录，不能重复进场'));
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function checkDeviceAvailable(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const unavailableStatuses = [DeviceStatus.MAINTENANCE, DeviceStatus.FAULT];
    const unavailableDevice = await Device.findOne({
      status: { $in: unavailableStatuses }
    });

    if (unavailableDevice) {
      return next(new BadRequestError(
        `设备"${unavailableDevice.name}"当前处于${unavailableDevice.status}状态，暂停进站`
      ));
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function checkQueueRecordExists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) return next();

    const record = await QueueRecord.findById(id);
    if (!record) {
      return next(new BadRequestError('排队记录不存在'));
    }

    res.locals.queueRecord = record;
    next();
  } catch (error) {
    next(error);
  }
}

function checkRecordStatus(allowedStatuses: QueueStatus[], errorMessage: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const record = res.locals.queueRecord;
    if (!record) return next();

    if (!allowedStatuses.includes(record.status)) {
      return next(new BadRequestError(errorMessage));
    }

    next();
  };
}

function checkHasWeightRecord(_req: Request, res: Response, next: NextFunction): void {
  const record = res.locals.queueRecord;
  if (!record) return next();

  if (record.weight === undefined || record.weight === null || !record.weighTime) {
    return next(new BadRequestError('缺少称重记录，请先完成称重'));
  }

  next();
}

function checkHasCompressEndTime(_req: Request, res: Response, next: NextFunction): void {
  const record = res.locals.queueRecord;
  if (!record) return next();

  if (!record.compressEndTime) {
    return next(new BadRequestError('压缩尚未结束，请先完成压缩'));
  }

  next();
}
