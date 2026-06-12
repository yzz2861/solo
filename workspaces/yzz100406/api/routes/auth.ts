import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { LoginRequest } from '../../shared/types.js';

const router = Router();
const authService = new AuthService();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const result = await authService.login({ username, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : '登录失败' });
  }
});

export default router;
