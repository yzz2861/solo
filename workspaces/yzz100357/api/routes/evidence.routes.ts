import { Router } from 'express';
import * as evidenceRepo from '../repositories/evidence.repository.js';
import * as materialRepo from '../repositories/material.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import { analyzeText, convertToEvidence } from '../services/patternRecognizer.service.js';
import type { UpdateEvidenceRequest, BatchConfirmRequest } from '../../shared/types.js';

const router = Router();

router.get('/project/:projectId', async (req, res) => {
  try {
    const evidence = await evidenceRepo.getEvidenceByProjectId(req.params.projectId);
    res.json({ success: true, data: evidence });
  } catch (error) {
    console.error('Failed to get evidence:', error);
    res.status(500).json({ success: false, error: '获取证据列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const evidence = await evidenceRepo.getEvidenceById(req.params.id);
    if (!evidence) {
      return res.status(404).json({ success: false, error: '证据不存在' });
    }
    res.json({ success: true, data: evidence });
  } catch (error) {
    console.error('Failed to get evidence:', error);
    res.status(500).json({ success: false, error: '获取证据信息失败' });
  }
});

router.post('/project/:projectId/analyze', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = await projectRepo.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    
    const materials = await materialRepo.getMaterialsByProjectId(projectId);
    
    if (materials.length === 0) {
      return res.status(400).json({ success: false, error: '请先上传材料' });
    }
    
    await projectRepo.updateProjectStatus(projectId, 'analyzing');
    await evidenceRepo.deleteEvidenceByProjectId(projectId);
    
    const allEvidence = [];
    
    for (const material of materials) {
      if (!material.parsedContent) continue;
      
      const matches = analyzeText(material.parsedContent, material.id, {
        customerName: project.customerName,
        orderTime: project.orderTime
      });
      
      for (const match of matches) {
        const evidence = convertToEvidence(match, projectId, material.id);
        allEvidence.push(evidence);
      }
    }
    
    const savedEvidence = await evidenceRepo.createEvidencesBatch(allEvidence);
    await projectRepo.updateProjectStatus(projectId, 'confirmed');
    
    res.json({ success: true, data: savedEvidence });
  } catch (error) {
    console.error('Failed to analyze evidence:', error);
    res.status(500).json({ success: false, error: '智能识别失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = req.body as UpdateEvidenceRequest;
    const evidence = await evidenceRepo.updateEvidence(req.params.id, data);
    if (!evidence) {
      return res.status(404).json({ success: false, error: '证据不存在' });
    }
    res.json({ success: true, data: evidence });
  } catch (error) {
    console.error('Failed to update evidence:', error);
    res.status(500).json({ success: false, error: '更新证据失败' });
  }
});

router.post('/batch-confirm', async (req, res) => {
  try {
    const { ids } = req.body as BatchConfirmRequest;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请选择要确认的证据' });
    }
    
    await evidenceRepo.batchConfirmEvidence(ids);
    res.json({ success: true, data: { confirmed: ids.length } });
  } catch (error) {
    console.error('Failed to batch confirm evidence:', error);
    res.status(500).json({ success: false, error: '批量确认失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await evidenceRepo.deleteEvidence(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: '证据不存在' });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Failed to delete evidence:', error);
    res.status(500).json({ success: false, error: '删除证据失败' });
  }
});

export default router;
