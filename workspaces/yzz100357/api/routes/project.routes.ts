import { Router } from 'express';
import * as projectRepo from '../repositories/project.repository.js';
import type { CreateProjectRequest } from '../../shared/types.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const projects = await projectRepo.getAllProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Failed to get projects:', error);
    res.status(500).json({ success: false, error: '获取项目列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await projectRepo.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Failed to get project:', error);
    res.status(500).json({ success: false, error: '获取项目信息失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { orderNo, customerName, orderTime, appealDeadline } = req.body as CreateProjectRequest;
    
    if (!orderNo || !customerName || !orderTime || !appealDeadline) {
      return res.status(400).json({ success: false, error: '请填写完整的订单信息' });
    }
    
    const project = await projectRepo.createProject({
      orderNo,
      customerName,
      orderTime,
      appealDeadline
    });
    
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ success: false, error: '创建项目失败' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const project = await projectRepo.updateProjectStatus(req.params.id, status);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Failed to update project status:', error);
    res.status(500).json({ success: false, error: '更新项目状态失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await projectRepo.deleteProject(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Failed to delete project:', error);
    res.status(500).json({ success: false, error: '删除项目失败' });
  }
});

export default router;
