import { Router, Request, Response } from 'express';
import {
  processQualification,
  processReview,
  getAuditRecord,
  getAuditTrail,
  getPendingReviews,
  validateInput,
  QualificationInput,
  ReviewInput
} from '../services/qualificationService';

const router = Router();

router.post('/qualification', (req: Request, res: Response) => {
  try {
    const input = req.body as QualificationInput;
    
    const validation = validateInput(input);
    if (!validation.valid) {
      return res.status(400).json({
        code: 400,
        message: '参数校验失败',
        errors: validation.errors,
        data: null
      });
    }

    const result = processQualification(input);

    return res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error: any) {
    console.error('资格判定出错:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message,
      data: null
    });
  }
});

router.get('/qualification/:auditNo', (req: Request, res: Response) => {
  try {
    const { auditNo } = req.params;
    const record = getAuditRecord(auditNo);

    if (!record) {
      return res.status(404).json({
        code: 404,
        message: '审核记录不存在',
        data: null
      });
    }

    return res.status(200).json({
      code: 200,
      message: 'success',
      data: record
    });
  } catch (error: any) {
    console.error('查询审核记录出错:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message,
      data: null
    });
  }
});

router.get('/audittrail/:businessId', (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const records = getAuditTrail(businessId);

    return res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        businessId,
        total: records.length,
        records
      }
    });
  } catch (error: any) {
    console.error('查询审计轨迹出错:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message,
      data: null
    });
  }
});

router.post('/review', (req: Request, res: Response) => {
  try {
    const input = req.body as ReviewInput;

    if (!input.auditNo) {
      return res.status(400).json({
        code: 400,
        message: '审核编号不能为空',
        data: null
      });
    }

    if (!input.operatorId || !input.operatorName) {
      return res.status(400).json({
        code: 400,
        message: '操作人信息不完整',
        data: null
      });
    }

    if (!['approve', 'reject', 'return'].includes(input.reviewResult)) {
      return res.status(400).json({
        code: 400,
        message: '无效的复核结果，可选值：approve、reject、return',
        data: null
      });
    }

    const result = processReview(input);

    return res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error: any) {
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        code: 404,
        message: error.message,
        data: null
      });
    }
    if (error.message.includes('无需复核')) {
      return res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
    }
    console.error('复核处理出错:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message,
      data: null
    });
  }
});

router.get('/reviews/pending', (_req: Request, res: Response) => {
  try {
    const records = getPendingReviews();

    return res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        total: records.length,
        records
      }
    });
  } catch (error: any) {
    console.error('查询待复核列表出错:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message,
      data: null
    });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    code: 200,
    message: 'ok',
    data: {
      timestamp: new Date().toISOString(),
      service: 'voting-qualification-api',
      status: 'running'
    }
  });
});

export default router;
