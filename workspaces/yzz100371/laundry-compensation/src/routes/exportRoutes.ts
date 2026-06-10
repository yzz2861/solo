import { Router, Request, Response } from 'express';
import { ExportService } from '../services/exportService';

export function createExportRoutes(exportService: ExportService): Router {
  const router = Router();

  router.get('/monthly', (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);

    if (!year || !month || month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请提供有效的 year 和 month 参数' },
      });
      return;
    }

    const format = (req.query.format as string) || 'json';

    if (format === 'csv') {
      const csv = exportService.exportMonthlyCsv(year, month);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=compensation_${year}_${month}.csv`);
      res.send('\uFEFF' + csv);
      return;
    }

    const data = exportService.exportMonthly(year, month);
    res.json({ success: true, data });
  });

  return router;
}
