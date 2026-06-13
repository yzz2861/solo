import { Router, Response } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AccidentService } from '../services/AccidentService.js';
import { PhotoService } from '../services/PhotoService.js';
import { AuditService } from '../services/AuditService.js';
import { 
  CreateAccidentRequest, 
  UpdateAccidentRequest, 
  AccidentStatus 
} from '../../shared/types.js';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

const getAccidentService = () => new AccidentService();
const getPhotoService = () => new PhotoService();
const getAuditService = () => new AuditService();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, startDate, endDate, plateNumber } = req.query;
    const filters = {
      status: status as AccidentStatus | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      storeId: req.user.storeId,
      plateNumber: plateNumber as string | undefined
    };
    const accidents = await getAccidentService().getAccidentList(filters);
    res.json(accidents);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取事故列表失败' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body as CreateAccidentRequest;
    const accident = await getAccidentService().createAccident(data, req.user);
    res.status(201).json(accident);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '创建事故记录失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const accident = await getAccidentService().getAccidentById(req.params.id);
    if (!accident) return res.status(404).json({ error: '事故记录不存在' });
    res.json(accident);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取事故详情失败' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body as UpdateAccidentRequest;
    const accident = await getAccidentService().updateAccident(req.params.id, data, req.user);
    if (!accident) return res.status(404).json({ error: '事故记录不存在' });
    res.json(accident);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '更新事故记录失败' });
  }
});

router.get('/:id/photos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const photos = await getPhotoService().getPhotosByAccidentId(req.params.id);
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取照片列表失败' });
  }
});

router.post('/:id/photos', authMiddleware, upload.array('photos', 20), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const description = req.body.description || '';
    if (!files || files.length === 0) return res.status(400).json({ error: '请选择要上传的照片' });

    const photoService = getPhotoService();
    const photos = [];
    for (const file of files) {
      const photo = await photoService.uploadPhoto(req.params.id, file, description, req.user);
      photos.push(photo);
    }
    res.status(201).json(photos);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '上传照片失败' });
  }
});

router.get('/photos/:fileName', async (req, res) => {
  try {
    const filePath = await getPhotoService().getPhotoFilePath(req.params.fileName);
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).json({ error: '照片不存在' });
  }
});

router.post('/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const accident = await getAccidentService().confirmFee(req.params.id, req.user);
    if (!accident) return res.status(404).json({ error: '事故记录不存在' });
    res.json(accident);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '确认费用失败' });
  }
});

router.post('/:id/close', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const accident = await getAccidentService().requestClose(req.params.id, req.user);
    if (!accident) return res.status(404).json({ error: '事故记录不存在' });
    res.json(accident);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '申请结案失败' });
  }
});

router.get('/:id/audit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await getAuditService().getAuditLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '获取审计日志失败' });
  }
});

export default router;
