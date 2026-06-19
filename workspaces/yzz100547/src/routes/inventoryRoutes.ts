import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as inventoryController from '../controllers/inventoryController';

const router = Router();

router.get('/', inventoryController.list);
router.get('/:id', inventoryController.getById);
router.get('/:id/check', inventoryController.check);

router.use(authenticate, requireRole('social_worker', 'director'));

router.post('/', inventoryController.create);
router.put('/:id', inventoryController.update);
router.post('/:id/deduct', inventoryController.deduct);
router.post('/:id/restore', inventoryController.restore);

export default router;
