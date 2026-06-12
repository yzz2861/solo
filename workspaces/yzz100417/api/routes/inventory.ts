import { Router, Request, Response } from 'express';
import * as svc from '../services/inventory.ts';

const router = Router();

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const data = await svc.getStatsOverview();
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/models', async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getModels() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/locations', async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getLocations() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/attachments', async (req, res) => {
  try {
    const status = req.query.status as any;
    res.json({ success: true, data: await svc.getAttachments(status) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/attachments/scan', async (req, res) => {
  try {
    const { code } = req.body as { code: string };
    const attachment = await svc.getAttachmentByCode(code);
    if (!attachment) {
      return res.json({ success: false, error: '未找到该附件条码' });
    }
    const boundPatient = await svc.getBoundPatientByAttachmentId(attachment.id);
    res.json({
      success: true,
      data: {
        attachment,
        boundPatient,
        isDuplicate: !!boundPatient,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/attachments/bind', async (req, res) => {
  try {
    const { attachmentId, patientId, alignerBatch, followUpDate, clinicRoom, missingReason } = req.body;
    const result = await svc.bindAttachmentPatient({
      attachmentId,
      patientId,
      alignerBatch,
      followUpDate,
      clinicRoom,
      missingReason: missingReason ?? null,
    });
    res.json(result.success ? { success: true, data: result } : { success: false, error: result.message });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/patients', async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getPatients() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/patients', async (req, res) => {
  try {
    const { name, phone, treatment_plan } = req.body;
    const p = await svc.createPatient({ name, phone, treatment_plan });
    res.json({ success: true, data: p });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/patients/tomorrow', async (req, res) => {
  try {
    const clinicRoom = req.query.clinicRoom as string | undefined;
    res.json({ success: true, data: await svc.getPatientsTomorrow(clinicRoom) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/patients/:id', async (req, res) => {
  try {
    const data = await svc.getPatientDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: '患者不存在' });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/patients/bindings/:id/prepare', async (req, res) => {
  try {
    const { isPrepared } = req.body;
    const r = await svc.setPrepared(req.params.id, !!isPrepared);
    res.json({ success: true, data: r });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/inventory/missing', async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getMissingAttachments() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/inventory/near-expiry', async (req, res) => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    res.json({ success: true, data: await svc.getNearExpiryAttachments(days) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/inventory/adjustments', async (req, res) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    res.json({ success: true, data: await svc.getAdjustments(from, to) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/inventory/inbound', async (req, res) => {
  try {
    const { attachmentModelId, batchNo, quantity, locationId, expiryDate } = req.body;
    const r = await svc.inboundAttachment({
      modelId: attachmentModelId,
      batchNo,
      quantity: Number(quantity),
      locationId,
      expiryDate: expiryDate ?? null,
    });
    res.json({ success: true, data: r });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/inventory/adjust', async (req, res) => {
  try {
    const { attachmentId, delta, reason } = req.body;
    const r = await svc.adjustInventory(attachmentId, Number(delta), reason);
    res.json({ success: true, data: r });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/batches', async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getBatches() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/batches/:batchNo/recall', async (req, res) => {
  try {
    const r = await svc.recallBatch(req.params.batchNo);
    res.json({ success: true, data: r });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

function toCSV(rows: any[], headers: { key: string; label: string }[]): string {
  const head = headers.map((h) => `"${h.label}"`).join(',');
  const body = rows.map((r) =>
    headers.map((h) => {
      const v = r[h.key] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [head, ...body].join('\n');
}

router.get('/reports/missing', async (req, res) => {
  try {
    const data = await svc.getMissingAttachments();
    const csv = toCSV(data, [
      { key: 'follow_up_date', label: '复诊日期' },
      { key: 'p.name', label: '患者姓名' },
      { key: 'p.phone', label: '电话' },
      { key: 'att.code', label: '附件条码' },
      { key: 'att.batch_no', label: '批次' },
      { key: 'model.name', label: '附件型号' },
      { key: 'model.type', label: '类型' },
      { key: 'missing_reason', label: '缺件原因' },
      { key: 'clinic_room', label: '诊室' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="missing.csv"');
    res.send('\uFEFF' + csv);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/reports/near-expiry', async (req, res) => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const data = await svc.getNearExpiryAttachments(days);
    const csv = toCSV(data, [
      { key: 'code', label: '附件条码' },
      { key: 'batch_no', label: '批次' },
      { key: 'model.name', label: '型号' },
      { key: 'model.type', label: '类型' },
      { key: 'expiry_date', label: '有效期' },
      { key: 'days_left', label: '剩余天数' },
      { key: 'loc.clinic', label: '诊室' },
      { key: 'loc.shelf', label: '货架' },
      { key: 'loc.slot', label: '格子' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="near-expiry.csv"');
    res.send('\uFEFF' + csv);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/reports/adjustments', async (req, res) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const data = await svc.getAdjustments(from, to);
    const csv = toCSV(data, [
      { key: 'created_at', label: '操作时间' },
      { key: 'att.code', label: '附件条码' },
      { key: 'delta', label: '调整数量' },
      { key: 'reason', label: '原因' },
      { key: 'op.name', label: '操作人' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="adjustments.csv"');
    res.send('\uFEFF' + csv);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
