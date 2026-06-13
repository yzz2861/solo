import { Router, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../../shared/types.js';
import { AccidentService } from '../services/AccidentService.js';
import { ExportService } from '../services/ExportService.js';
import { AuditService } from '../services/AuditService.js';

const router = Router();

router.use(authMiddleware, roleMiddleware(UserRole.MANAGER));

router.get('/unclosed', async (_req: AuthRequest, res: Response) => {
  try {
    const accidents = await new AccidentService().getUnclosedList();
    res.json(accidents);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取未结案清单失败' });
  }
});

router.get('/overdue', async (_req: AuthRequest, res: Response) => {
  try {
    const accidents = await new AccidentService().getOverdueList();
    res.json(accidents);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取超期定损清单失败' });
  }
});

router.get('/disputed', async (_req: AuthRequest, res: Response) => {
  try {
    const accidents = await new AccidentService().getDisputedList();
    res.json(accidents);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取扣款争议清单失败' });
  }
});

router.get('/export/:type', async (req: AuthRequest, res: Response) => {
  try {
    const type = req.params.type as 'unclosed' | 'overdue' | 'disputed';
    if (!['unclosed', 'overdue', 'disputed'].includes(type)) {
      return res.status(400).json({ error: '无效的导出类型' });
    }
    const buffer = await new ExportService().exportToExcel(type);
    const fileName = `${type}-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '导出失败' });
  }
});

router.get('/audit-timeline/:id', async (req: AuthRequest, res: Response) => {
  try {
    const timeline = await new AuditService().getTimelineComparison(req.params.id);
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取时间线对比失败' });
  }
});

router.post('/accidents/:id/close', async (req: AuthRequest, res: Response) => {
  try {
    const accident = await new AccidentService().closeAccident(req.params.id, req.user);
    if (!accident) return res.status(404).json({ error: '事故记录不存在' });
    res.json(accident);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '结案失败' });
  }
});

router.post('/accidents/:id/dispute', async (req: AuthRequest, res: Response) => {
  try {
    const accident = await new AccidentService().markDisputed(req.params.id, req.user);
    if (!accident) return res.status(404).json({ error: '事故记录不存在' });
    res.json(accident);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '标记争议失败' });
  }
});

export default router;
