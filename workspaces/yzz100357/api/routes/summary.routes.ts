import { Router } from 'express';
import * as summaryRepo from '../repositories/summary.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import * as evidenceRepo from '../repositories/evidence.repository.js';
import * as materialRepo from '../repositories/material.repository.js';
import { generateSummary, generateChangeLog } from '../services/summaryGenerator.service.js';
import type { SaveSummaryRequest } from '../../shared/types.js';

const router = Router();

router.get('/project/:projectId', async (req, res) => {
  try {
    const summaries = await summaryRepo.getSummariesByProjectId(req.params.projectId);
    res.json({ success: true, data: summaries });
  } catch (error) {
    console.error('Failed to get summaries:', error);
    res.status(500).json({ success: false, error: '获取摘要列表失败' });
  }
});

router.get('/project/:projectId/latest', async (req, res) => {
  try {
    const summary = await summaryRepo.getLatestSummary(req.params.projectId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Failed to get latest summary:', error);
    res.status(500).json({ success: false, error: '获取最新摘要失败' });
  }
});

router.post('/project/:projectId/generate', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = await projectRepo.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    
    const evidence = await evidenceRepo.getEvidenceByProjectId(projectId);
    const materials = await materialRepo.getMaterialsByProjectId(projectId);
    
    if (evidence.length === 0) {
      return res.status(400).json({ success: false, error: '请先进行智能识别获取证据' });
    }
    
    const content = generateSummary({
      project,
      evidence,
      materialsCount: materials.length
    });
    
    const summary = await summaryRepo.createSummary(
      projectId,
      { content, changeLog: '系统自动生成' },
      'system'
    );
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Failed to generate summary:', error);
    res.status(500).json({ success: false, error: '生成摘要失败' });
  }
});

router.post('/project/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { content, changeLog } = req.body as SaveSummaryRequest;
    
    if (!content) {
      return res.status(400).json({ success: false, error: '摘要内容不能为空' });
    }
    
    const project = await projectRepo.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    
    const latestSummary = await summaryRepo.getLatestSummary(projectId);
    let finalChangeLog = changeLog;
    
    if (latestSummary && !changeLog) {
      finalChangeLog = generateChangeLog(latestSummary.content, content);
    }
    
    const summary = await summaryRepo.createSummary(
      projectId,
      { content, changeLog: finalChangeLog },
      'user'
    );
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Failed to save summary:', error);
    res.status(500).json({ success: false, error: '保存摘要失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const summary = await summaryRepo.getSummaryById(req.params.id);
    if (!summary) {
      return res.status(404).json({ success: false, error: '摘要不存在' });
    }
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Failed to get summary:', error);
    res.status(500).json({ success: false, error: '获取摘要失败' });
  }
});

export default router;
