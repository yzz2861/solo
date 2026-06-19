import { Router } from 'express';
import { TenantService } from '../services/TenantService';
import { success, handleError } from '../utils/response';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const tenantService = new TenantService();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const keyword = req.query.keyword as string;
    if (keyword) {
      success(res, await tenantService.search(keyword));
    } else {
      success(res, await tenantService.list());
    }
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    success(res, await tenantService.getById(req.params.id));
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { code, name, department, contactPerson, contactPhone } = req.body;
    const user = req.currentUser!;
    success(res, await tenantService.create(
      { code, name, department, contactPerson, contactPhone },
      user.userId,
      user.name
    ));
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:id', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, department, contactPerson, contactPhone } = req.body;
    const user = req.currentUser!;
    success(res, await tenantService.update(
      req.params.id,
      { name, department, contactPerson, contactPhone },
      user.userId,
      user.name
    ));
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    success(res, await tenantService.deactivate(req.params.id));
  } catch (err) {
    handleError(res, err);
  }
});

export const tenantRoutes = router;
