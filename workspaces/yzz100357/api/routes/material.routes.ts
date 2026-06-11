import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import * as materialRepo from '../repositories/material.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import { parseFile, detectFileType, formatFileSize } from '../services/fileParser.service.js';
import { UPLOADS_DIR } from '../db/index.js';
import type { MaterialType } from '../../shared/types.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

router.get('/project/:projectId', async (req, res) => {
  try {
    const materials = await materialRepo.getMaterialsByProjectId(req.params.projectId);
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Failed to get materials:', error);
    res.status(500).json({ success: false, error: '获取材料列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const material = await materialRepo.getMaterialById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, error: '材料不存在' });
    }
    res.json({ success: true, data: material });
  } catch (error) {
    console.error('Failed to get material:', error);
    res.status(500).json({ success: false, error: '获取材料信息失败' });
  }
});

router.post('/project/:projectId/upload', upload.array('files', 20), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = await projectRepo.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: '请选择要上传的文件' });
    }
    
    const type = (req.body.type as MaterialType) || 'other';
    const results = [];
    
    for (const file of files) {
      const detectedType = detectFileType(file.originalname);
      const finalType = type === 'other' ? detectedType : type;
      
      const material = await materialRepo.createMaterial({
        projectId,
        type: finalType,
        fileName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size
      });
      
      try {
        const parsedContent = await parseFile(file.path, file.mimetype);
        await materialRepo.updateMaterialParsedContent(material.id, parsedContent);
        material.parsedContent = parsedContent;
      } catch (parseError) {
        console.warn(`Failed to parse file ${file.originalname}:`, parseError);
      }
      
      results.push(material);
    }
    
    if (project.status === 'draft') {
      await projectRepo.updateProjectStatus(projectId, 'draft');
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Failed to upload materials:', error);
    res.status(500).json({ success: false, error: '上传材料失败' });
  }
});

router.put('/:id/type', async (req, res) => {
  try {
    const { type } = req.body;
    const material = await materialRepo.updateMaterialType(req.params.id, type);
    if (!material) {
      return res.status(404).json({ success: false, error: '材料不存在' });
    }
    res.json({ success: true, data: material });
  } catch (error) {
    console.error('Failed to update material type:', error);
    res.status(500).json({ success: false, error: '更新材料类型失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const material = await materialRepo.getMaterialById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, error: '材料不存在' });
    }
    
    try {
      await fs.unlink(material.filePath);
    } catch (unlinkError) {
      console.warn('Failed to delete file:', unlinkError);
    }
    
    const success = await materialRepo.deleteMaterial(req.params.id);
    res.json({ success, data: { deleted: success } });
  } catch (error) {
    console.error('Failed to delete material:', error);
    res.status(500).json({ success: false, error: '删除材料失败' });
  }
});

router.get('/project/:projectId/order', async (req, res) => {
  try {
    const order = await materialRepo.getMaterialOrder(req.params.projectId);
    res.json({ success: true, data: { projectId: req.params.projectId, order } });
  } catch (error) {
    console.error('Failed to get material order:', error);
    res.status(500).json({ success: false, error: '获取材料顺序失败' });
  }
});

router.put('/project/:projectId/order', async (req, res) => {
  try {
    const { order } = req.body;
    const newOrder = await materialRepo.updateMaterialOrder(req.params.projectId, order);
    res.json({ success: true, data: { projectId: req.params.projectId, order: newOrder } });
  } catch (error) {
    console.error('Failed to update material order:', error);
    res.status(500).json({ success: false, error: '更新材料顺序失败' });
  }
});

export default router;
