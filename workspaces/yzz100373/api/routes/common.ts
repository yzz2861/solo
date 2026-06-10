import { Router } from 'express';
import {
  searchMembers,
  getMemberById,
  getMemberByPlate,
  findSimilarMemberPlates,
  createMember,
  addMemberPackage,
  getWorkers,
  getAddonConfigs,
} from '../services/memberService';

const router = Router();

router.get('/workers', (_req, res) => {
  res.json(getWorkers());
});

router.get('/addons-config', (_req, res) => {
  res.json(getAddonConfigs());
});

router.get('/members', (req, res) => {
  const keyword = typeof req.query.q as string | undefined;
  res.json(searchMembers(keyword));
});

router.get('/members/similar-plates', (req, res) => {
  const plate = typeof req.query.plate as string | undefined;
  if (!plate) {
    res.json([]);
    return;
  }
  res.json(findSimilarMemberPlates(plate));
});

router.get('/members/:id', (req, res) => {
  const member = getMemberById(req.params.id);
  if (!member) {
    res.status(404).json({ error: '会员不存在' });
    return;
  }
  res.json(member);
});

router.get('/members/by-plate/:plate', (req, res) => {
  const member = getMemberByPlate(req.params.plate);
  if (!member) {
    res.status(404).json({ error: '未找到该车牌的会员' });
    return;
  }
  res.json(member);
});

router.post('/members', (req, res) => {
  const { name, phone, plateNumber } = req.body;
  if (!name || !phone || !plateNumber) {
    res.status(400).json({ error: '缺少必要信息不全' });
    return;
  }
  const member = createMember({ name, phone, plateNumber });
  res.status(201).json(member);
});

router.post('/members/:id/packages', (req, res) => {
  const { packageName, totalTimes, pricePerTime } = req.body;
  if (!packageName || !totalTimes || pricePerTime === undefined) {
    res.status(400).json({ error: '缺少套餐信息不全' });
    return;
  }
  const pkg = addMemberPackage(req.params.id, { packageName, totalTimes, pricePerTime });
  if (!pkg) {
    res.status(404).json({ error: '会员不存在' });
    return;
  }
  res.status(201).json(pkg);
});

export default router;
