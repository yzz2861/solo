import express, { Request, Response } from 'express';
import { dispatchService } from '../services/dispatchService';
import { ExportService } from '../records/exportService';
import { DispatchResult, ProcessAction } from '../objects/types';
import { PilotEntity } from '../objects/entities';

const router = express.Router();

interface DispatchRequest {
  batchNo: string;
  sourceChannel: string;
  items: any[];
  action: string;
  reviewOpinion?: any;
}

router.post('/dispatch/process', (req: Request, res: Response) => {
  try {
    const body = req.body as DispatchRequest;

    if (!body.batchNo) {
      return res.status(400).json({ success: false, error: '缺少批次号' });
    }
    if (!body.sourceChannel) {
      return res.status(400).json({ success: false, error: '缺少来源渠道' });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ success: false, error: '缺少明细项' });
    }
    if (!body.action) {
      return res.status(400).json({ success: false, error: '缺少处理动作' });
    }

    const result = dispatchService.processBatch({
      batchNo: body.batchNo,
      sourceChannel: body.sourceChannel,
      items: body.items,
      action: body.action,
      reviewOpinion: body.reviewOpinion
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dispatch/result/:batchNo', (req: Request, res: Response) => {
  try {
    const batchNo = req.params.batchNo;
    const batchHistory = dispatchService.getBatchHistory(batchNo);

    if (!batchHistory) {
      return res.status(404).json({ success: false, error: '批次不存在' });
    }

    res.json({ success: true, data: batchHistory });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dispatch/item/:itemId/history', (req: Request, res: Response) => {
  try {
    const itemId = req.params.itemId;
    const history = dispatchService.getItemHistory(itemId);

    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dispatch/export/:batchNo', (req: Request, res: Response) => {
  try {
    const batchNo = req.params.batchNo;
    const format = req.query.format as string || 'json';

    const batchHistory = dispatchService.getBatchHistory(batchNo);
    if (!batchHistory) {
      return res.status(404).json({ success: false, error: '批次不存在' });
    }

    const mockResult: DispatchResult = {
      batchNo: batchHistory.batchNo,
      sourceChannel: batchHistory.sourceChannel,
      totalCount: batchHistory.totalItems,
      approvableCount: batchHistory.items.filter(i => i.currentStatus === 'APPROVABLE').length,
      supplementRequiredCount: batchHistory.items.filter(i => i.currentStatus === 'SUPPLEMENT_REQUIRED').length,
      lockedCount: batchHistory.items.filter(i => i.currentStatus === 'LOCKED').length,
      failedCount: batchHistory.items.filter(i => i.currentStatus === 'FAILED').length,
      items: batchHistory.items.map(item => ({
        itemId: item.itemId,
        pilotId: '',
        shipName: '',
        status: item.currentStatus,
        reasons: item.records.map(r => r.remark || ''),
        riskLevel: 'LOW',
        reviewRequired: false,
        canDirectApprove: true
      })),
      processedAt: batchHistory.createdAt
    };

    if (format === 'csv') {
      const csv = ExportService.toCSV(mockResult);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="dispatch_${batchNo}.csv"`);
      res.send('\uFEFF' + csv);
    } else {
      res.json({
        success: true,
        data: {
          summary: ExportService.getSummary(mockResult),
          records: ExportService.toRecordList(mockResult)
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/dispatch/action', (req: Request, res: Response) => {
  try {
    const { itemId, action, operator, remark, reviewOpinion } = req.body;

    if (!itemId || !action) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const result = dispatchService.performAction(
      itemId,
      action as ProcessAction,
      operator,
      remark,
      reviewOpinion
    );

    res.json({ success: result.success, data: { newStatus: result.newStatus }, error: result.reason });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/pilot/register', (req: Request, res: Response) => {
  try {
    const pilotData = req.body;
    const pilot = new PilotEntity(pilotData);
    dispatchService.registerPilot(pilot);

    res.json({ success: true, data: { pilotId: pilot.id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/pilot/:pilotId', (req: Request, res: Response) => {
  try {
    const pilot = dispatchService.getPilot(req.params.pilotId);
    if (!pilot) {
      return res.status(404).json({ success: false, error: '引航员不存在' });
    }
    res.json({ success: true, data: pilot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
