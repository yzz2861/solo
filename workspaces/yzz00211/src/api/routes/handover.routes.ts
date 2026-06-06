import { Router } from 'express';
import { HandoverController } from '../controllers/handover.controller';

const router = Router();
const controller = new HandoverController();

router.post('/handover/process', (req, res) => {
  controller.processHandover(req, res);
});

router.get('/handover/health', (_req, res) => {
  res.json({
    success: true,
    code: 200,
    message: '麻醉药品余量交接API运行正常',
    data: {
      version: '1.0.0',
      status: 'healthy',
    },
  });
});

export { router as handoverRouter, controller as handoverController };
