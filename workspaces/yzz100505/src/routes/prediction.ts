import { Router, Request, Response, NextFunction } from 'express';
import { getRoutePressurePrediction, getHistoricalStats } from '../utils/prediction';
import { validatePredictionQuery } from '../middleware/validation';

const router = Router();

router.get('/route-pressure', validatePredictionQuery, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { route, lookbackHours = '24', compressCapacity = '1' } = req.query;

    const predictions = await getRoutePressurePrediction({
      route: route as string | undefined,
      lookbackHours: parseInt(lookbackHours as string, 10),
      compressCapacity: parseInt(compressCapacity as string, 10)
    });

    const overallStats = await getHistoricalStats({
      route: route as string | undefined,
      lookbackHours: parseInt(lookbackHours as string, 10)
    });

    const totalQueueLength = predictions.reduce((sum, p) => sum + p.currentQueueLength, 0);
    const maxPressure = predictions.reduce(
      (max, p) => {
        const pressureOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        return pressureOrder.indexOf(p.pressureLevel) > pressureOrder.indexOf(max) ? p.pressureLevel : max;
      },
      'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    );

    res.status(200).json({
      status: 'success',
      data: {
        overall: {
          totalQueueLength,
          maxPressure,
          historicalStats: overallStats
        },
        byRoute: predictions
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/queue-estimate', validatePredictionQuery, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { route, compressCapacity = '1' } = req.query;

    const predictions = await getRoutePressurePrediction({
      route: route as string | undefined,
      compressCapacity: parseInt(compressCapacity as string, 10)
    });

    const estimates = predictions.map(p => ({
      route: p.route,
      currentQueueLength: p.currentQueueLength,
      estimatedWaitTime: p.estimatedWaitTime,
      estimatedWaitTimeFormatted: formatDuration(p.estimatedWaitTime),
      pressureLevel: p.pressureLevel,
      suggestedAction: p.suggestedAction
    }));

    res.status(200).json({
      status: 'success',
      data: {
        estimates,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/recommended-delay', validatePredictionQuery, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { route, lookbackHours = '24' } = req.query;

    const predictions = await getRoutePressurePrediction({
      route: route as string | undefined,
      lookbackHours: parseInt(lookbackHours as string, 10)
    });

    const recommendations = predictions
      .filter(p => p.pressureLevel === 'HIGH' || p.pressureLevel === 'CRITICAL')
      .map(p => ({
        route: p.route,
        currentQueueLength: p.currentQueueLength,
        estimatedWaitTime: p.estimatedWaitTime,
        recommendedDelayMinutes: calculateRecommendedDelay(p.estimatedWaitTime),
        pressureLevel: p.pressureLevel,
        suggestedAction: p.suggestedAction,
        affectedVehicles: p.vehicles.filter(v => v.status === 'WAITING').length
      }));

    res.status(200).json({
      status: 'success',
      data: {
        highPressureRoutes: recommendations,
        totalAffected: recommendations.reduce((sum, r) => sum + r.currentQueueLength, 0),
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

function calculateRecommendedDelay(estimatedWaitTime: number): number {
  if (estimatedWaitTime < 30) {
    return Math.ceil(estimatedWaitTime * 0.5);
  } else if (estimatedWaitTime < 60) {
    return Math.ceil(estimatedWaitTime * 0.6);
  } else {
    return Math.ceil(estimatedWaitTime * 0.7);
  }
}

export default router;
