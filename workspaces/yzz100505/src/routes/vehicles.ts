import { Router, Request, Response, NextFunction } from 'express';
import Vehicle from '../models/Vehicle';
import { validateVehicleCreation } from '../middleware/validation';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();

router.post('/', validateVehicleCreation, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { plateNumber, route, driverName } = req.body;

    const existingVehicle = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
    if (existingVehicle) {
      res.status(409).json({
        status: 'fail',
        message: '该车牌号已存在',
        data: existingVehicle
      });
      return;
    }

    const vehicle = new Vehicle({
      plateNumber: plateNumber.toUpperCase(),
      route,
      driverName
    });

    await vehicle.save();

    res.status(201).json({
      status: 'success',
      message: '车辆登记成功',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { route, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (route) {
      filter.route = route;
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Vehicle.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: vehicles,
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
    const vehicle = await Vehicle.findById(id).lean();

    if (!vehicle) {
      return next(new NotFoundError('车辆不存在'));
    }

    res.status(200).json({
      status: 'success',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validateVehicleCreation, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { plateNumber, route, driverName } = req.body;

    const existingVehicle = await Vehicle.findOne({
      plateNumber: plateNumber.toUpperCase(),
      _id: { $ne: id }
    });

    if (existingVehicle) {
      return res.status(409).json({
        status: 'fail',
        message: '该车牌号已被其他车辆使用'
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      {
        plateNumber: plateNumber.toUpperCase(),
        route,
        driverName
      },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return next(new NotFoundError('车辆不存在'));
    }

    res.status(200).json({
      status: 'success',
      message: '车辆信息更新成功',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByIdAndDelete(id);

    if (!vehicle) {
      return next(new NotFoundError('车辆不存在'));
    }

    res.status(200).json({
      status: 'success',
      message: '车辆删除成功'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
