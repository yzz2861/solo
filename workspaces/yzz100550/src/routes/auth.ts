import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { success, handleError } from '../utils/response';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const authService = new AuthService();

router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      throw new Error('请输入用户名');
    }
    const result = await authService.login(username);
    success(res, result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    success(res, req.currentUser);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const role = req.query.role as any;
    const users = await authService.listUsers(role);
    success(res, users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      tenantId: u.tenantId,
    })));
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/users', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, name, role, tenantId } = req.body;
    const user = await authService.createUser({ username, name, role, tenantId });
    success(res, {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    });
  } catch (err) {
    handleError(res, err);
  }
});

export const authRoutes = router;
