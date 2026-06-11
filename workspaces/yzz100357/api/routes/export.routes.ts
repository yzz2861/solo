import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import * as projectRepo from '../repositories/project.repository.js';
import * as materialRepo from '../repositories/material.repository.js';
import * as evidenceRepo from '../repositories/evidence.repository.js';
import * as summaryRepo from '../repositories/summary.repository.js';
import { exportPackage } from '../services/export.service.js';
import type { ExportRequest } from '../../shared/types.js';

const router = Router();

router.post('/project/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { format } = req.body as ExportRequest;
    
    const project = await projectRepo.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    
    const materials = await materialRepo.getMaterialsByProjectId(projectId);
    const evidence = await evidenceRepo.getEvidenceByProjectId(projectId);
    const summary = await summaryRepo.getLatestSummary(projectId);
    
    if (!summary) {
      return res.status(400).json({ success: false, error: '请先生成申诉摘要' });
    }
    
    const materialOrder = await materialRepo.getMaterialOrder(projectId);
    
    const { fileName, filePath } = await exportPackage(
      { project, materials, evidence, summary, materialOrder },
      format
    );
    
    await projectRepo.updateProjectStatus(projectId, 'exported');
    
    res.json({
      success: true,
      data: {
        downloadUrl: `/api/export/download/${fileName}`,
        fileName
      }
    });
  } catch (error) {
    console.error('Failed to export package:', error);
    res.status(500).json({ success: false, error: '导出材料包失败' });
  }
});

router.get('/download/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const exportDir = path.join(process.cwd(), 'data', 'exports');
    const filePath = path.join(exportDir, fileName);
    
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Failed to download file:', err);
        res.status(500).json({ success: false, error: '下载失败' });
      }
    });
  } catch (error) {
    console.error('Failed to handle download:', error);
    res.status(500).json({ success: false, error: '下载失败' });
  }
});

export default router;
