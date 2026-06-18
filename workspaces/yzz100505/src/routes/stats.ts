import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import QueueRecord, { QueueStatus } from '../models/QueueRecord';
import Vehicle from '../models/Vehicle';
import { validateStatsQuery } from '../middleware/validation';
import { getHistoricalStats } from '../utils/prediction';

const router = Router();

router.get('/wait-time', validateStatsQuery, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, route } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

    if (!start) {
      start = new Date();
      start.setDate(start.getDate() - 7);
    }
    if (!end) {
      end = new Date();
    }

    const match: Record<string, unknown> = {
      status: QueueStatus.COMPLETED,
      exitTime: { $gte: start, $lte: end }
    };

    let vehicleIds: string[] | undefined;
    if (route) {
      const vehiclesInRoute = await Vehicle.find({ route: route as string }).select('_id');
      vehicleIds = vehiclesInRoute.map(v => v._id.toString());
      match.vehicleId = { $in: vehicleIds };
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' },
      {
        $group: {
          _id: '$vehicle.route',
          totalWaitTime: { $sum: { $ifNull: ['$waitDuration', 0] } },
          totalCompressTime: { $sum: { $ifNull: ['$compressDuration', 0] } },
          totalRecords: { $sum: 1 },
          avgWaitTime: { $avg: { $ifNull: ['$waitDuration', 0] } },
          avgCompressTime: { $avg: { $ifNull: ['$compressDuration', 0] } },
          avgTotalTime: { $avg: { $ifNull: ['$totalDuration', 0] } },
          maxWaitTime: { $max: { $ifNull: ['$waitDuration', 0] } },
          minWaitTime: { $min: { $ifNull: ['$waitDuration', 0] } }
        }
      },
      {
        $project: {
          route: '$_id',
          totalRecords: 1,
          avgWaitTime: { $round: ['$avgWaitTime', 1] },
          avgCompressTime: { $round: ['$avgCompressTime', 1] },
          avgTotalTime: { $round: ['$avgTotalTime', 1] },
          maxWaitTime: 1,
          minWaitTime: 1,
          totalWaitTime: 1,
          totalCompressTime: 1,
          _id: 0
        }
      },
      { $sort: { avgWaitTime: -1 as const } }
    ] as const;

    const routeStats = await QueueRecord.aggregate(pipeline as unknown as mongoose.PipelineStage[]);

    const overallStats = await getHistoricalStats({
      route: route as string | undefined,
      lookbackHours: Math.ceil((end.getTime() - start.getTime()) / (60 * 60 * 1000))
    });

    const timeDistribution = await getTimeDistribution(start, end, vehicleIds);

    res.status(200).json({
      status: 'success',
      data: {
        period: {
          start,
          end
        },
        overall: {
          ...overallStats,
          periodHours: Math.ceil((end.getTime() - start.getTime()) / (60 * 60 * 1000))
        },
        byRoute: routeStats,
        timeDistribution
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/route-congestion', validateStatsQuery, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, route } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

    if (!start) {
      start = new Date();
      start.setDate(start.getDate() - 7);
    }
    if (!end) {
      end = new Date();
    }

    const match: Record<string, unknown> = {
      exitTime: { $gte: start, $lte: end }
    };

    let vehicleIds: string[] | undefined;
    if (route) {
      const vehiclesInRoute = await Vehicle.find({ route: route as string }).select('_id');
      vehicleIds = vehiclesInRoute.map(v => v._id.toString());
      match.vehicleId = { $in: vehicleIds };
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' },
      {
        $group: {
          _id: {
            route: '$vehicle.route',
            status: '$status'
          },
          count: { $sum: 1 },
          avgWaitTime: { $avg: { $ifNull: ['$waitDuration', 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.route',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
              avgWaitTime: { $round: ['$avgWaitTime', 1] }
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      {
        $project: {
          route: '$_id',
          totalCount: 1,
          statuses: 1,
          congestionLevel: {
            $cond: [
              { $gt: ['$totalCount', 50] },
              'HIGH',
              { $cond: [{ $gt: ['$totalCount', 20] }, 'MEDIUM', 'LOW'] }
            ]
          },
          _id: 0
        }
      },
      { $sort: { totalCount: -1 as const } }
    ] as const;

    const congestionStats = await QueueRecord.aggregate(pipeline as unknown as mongoose.PipelineStage[]);

    const peakHours = await getPeakHourStats(start, end, vehicleIds);

    res.status(200).json({
      status: 'success',
      data: {
        period: {
          start,
          end
        },
        byRoute: congestionStats,
        peakHours
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/abnormal-exits', validateStatsQuery, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, route } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

    if (!start) {
      start = new Date();
      start.setDate(start.getDate() - 30);
    }
    if (!end) {
      end = new Date();
    }

    const match: Record<string, unknown> = {
      status: QueueStatus.ABNORMAL,
      exitTime: { $gte: start, $lte: end }
    };

    let vehicleIds: string[] | undefined;
    if (route) {
      const vehiclesInRoute = await Vehicle.find({ route: route as string }).select('_id');
      vehicleIds = vehiclesInRoute.map(v => v._id.toString());
      match.vehicleId = { $in: vehicleIds };
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' },
      {
        $group: {
          _id: {
            route: '$vehicle.route',
            reason: '$abnormalExitReason'
          },
          count: { $sum: 1 },
          records: { $push: '$$ROOT' }
        }
      },
      {
        $group: {
          _id: '$_id.route',
          totalAbnormal: { $sum: '$count' },
          reasons: {
            $push: {
              reason: '$_id.reason',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          route: '$_id',
          totalAbnormal: 1,
          reasons: 1,
          _id: 0
        }
      },
      { $sort: { totalAbnormal: -1 as const } }
    ] as const;

    const abnormalStats = await QueueRecord.aggregate(pipeline as unknown as mongoose.PipelineStage[]);

    const skipPipeline = [
      {
        $match: {
          status: QueueStatus.SKIPPED,
          exitTime: { $gte: start, $lte: end },
          ...(vehicleIds ? { vehicleId: { $in: vehicleIds } } : {})
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' },
      {
        $group: {
          _id: {
            route: '$vehicle.route',
            reason: '$skipReason'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.route',
          totalSkip: { $sum: '$count' },
          reasons: {
            $push: {
              reason: '$_id.reason',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          route: '$_id',
          totalSkip: 1,
          reasons: 1,
          _id: 0
        }
      },
      { $sort: { totalSkip: -1 as const } }
    ] as const;

    const skipStats = await QueueRecord.aggregate(skipPipeline as unknown as mongoose.PipelineStage[]);

    const totalCompleted = await QueueRecord.countDocuments({
      status: QueueStatus.COMPLETED,
      exitTime: { $gte: start, $lte: end },
      ...(vehicleIds ? { vehicleId: { $in: vehicleIds } } : {})
    });

    const totalAbnormalCount = await QueueRecord.countDocuments({
      status: QueueStatus.ABNORMAL,
      exitTime: { $gte: start, $lte: end },
      ...(vehicleIds ? { vehicleId: { $in: vehicleIds } } : {})
    });

    const totalSkipCount = await QueueRecord.countDocuments({
      status: QueueStatus.SKIPPED,
      exitTime: { $gte: start, $lte: end },
      ...(vehicleIds ? { vehicleId: { $in: vehicleIds } } : {})
    });

    const abnormalRate = totalCompleted + totalAbnormalCount + totalSkipCount > 0
      ? ((totalAbnormalCount / (totalCompleted + totalAbnormalCount + totalSkipCount)) * 100).toFixed(2)
      : '0.00';

    res.status(200).json({
      status: 'success',
      data: {
        period: {
          start,
          end
        },
        summary: {
          totalCompleted,
          totalAbnormal: totalAbnormalCount,
          totalSkip: totalSkipCount,
          abnormalRate: `${abnormalRate}%`
        },
        abnormalExits: abnormalStats,
        skipped: skipStats
      }
    });
  } catch (error) {
    next(error);
  }
});

async function getTimeDistribution(
  start: Date,
  end: Date,
  vehicleIds?: string[]
): Promise<Array<{ hour: number; count: number; avgWaitTime: number }>> {
  const match: Record<string, unknown> = {
    status: QueueStatus.COMPLETED,
    exitTime: { $gte: start, $lte: end }
  };

  if (vehicleIds) {
    match.vehicleId = { $in: vehicleIds };
  }

  const pipeline = [
    { $match: match },
    {
      $project: {
        hour: { $hour: '$arrivalTime' },
        waitDuration: { $ifNull: ['$waitDuration', 0] }
      }
    },
    {
      $group: {
        _id: '$hour',
        count: { $sum: 1 },
        avgWaitTime: { $avg: '$waitDuration' }
      }
    },
    {
      $project: {
        hour: '$_id',
        count: 1,
        avgWaitTime: { $round: ['$avgWaitTime', 1] },
        _id: 0
      }
    },
    { $sort: { hour: 1 as const } }
  ] as const;

  return QueueRecord.aggregate(pipeline as unknown as mongoose.PipelineStage[]);
}

async function getPeakHourStats(
  start: Date,
  end: Date,
  vehicleIds?: string[]
): Promise<Array<{ hour: number; count: number; congestion: string }>> {
  const timeDist = await getTimeDistribution(start, end, vehicleIds);

  const maxCount = Math.max(...timeDist.map(d => d.count), 1);

  return timeDist.map(d => ({
    ...d,
    congestion:
      d.count > maxCount * 0.7 ? 'HIGH' :
      d.count > maxCount * 0.4 ? 'MEDIUM' : 'LOW'
  }));
}

export default router;
