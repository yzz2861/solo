import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import {
  login,
  getCurrentUser,
  getUserList,
} from '../controllers/authController';
import {
  createApplication,
  getApplicationList,
  getApplicationDetail,
  updateApplication,
  deleteApplication,
  approveApplication,
  confirmPickup,
  confirmReturn,
  addTrackingNote,
  getApprovalHistory,
  uploadAttachment,
} from '../controllers/sealController';
import {
  getStatistics,
  getOverdueList,
  getRejectedList,
  getNotReturnedList,
  exportMonthlyReport,
  getGuardSchedule,
  getLegalDetail,
} from '../controllers/adminController';
import { UserRole } from '../entities/User';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        '-' +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, getCurrentUser);
router.get('/users', authMiddleware, getUserList);

router.post(
  '/applications',
  authMiddleware,
  roleMiddleware(UserRole.EMPLOYEE, UserRole.APPROVER, UserRole.ADMIN),
  createApplication
);
router.get('/applications', authMiddleware, getApplicationList);
router.get('/applications/:id', authMiddleware, getApplicationDetail);
router.put(
  '/applications/:id',
  authMiddleware,
  roleMiddleware(UserRole.EMPLOYEE, UserRole.APPROVER, UserRole.ADMIN),
  updateApplication
);
router.delete(
  '/applications/:id',
  authMiddleware,
  roleMiddleware(UserRole.EMPLOYEE, UserRole.APPROVER, UserRole.ADMIN),
  deleteApplication
);

router.post(
  '/applications/:id/approve',
  authMiddleware,
  roleMiddleware(UserRole.APPROVER, UserRole.ADMIN),
  approveApplication
);

router.post(
  '/applications/:id/pickup',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN),
  confirmPickup
);

router.post(
  '/applications/:id/return',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN),
  confirmReturn
);

router.post(
  '/applications/:id/tracking',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN, UserRole.APPROVER),
  addTrackingNote
);

router.get('/applications/:id/history', authMiddleware, getApprovalHistory);

router.post(
  '/applications/:id/attachments',
  authMiddleware,
  upload.single('file'),
  uploadAttachment
);

router.get(
  '/admin/statistics',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN),
  getStatistics
);

router.get(
  '/admin/overdue',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN),
  getOverdueList
);

router.get(
  '/admin/rejected',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN),
  getRejectedList
);

router.get(
  '/admin/not-returned',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN),
  getNotReturnedList
);

router.get(
  '/admin/export',
  authMiddleware,
  roleMiddleware(UserRole.ADMIN),
  exportMonthlyReport
);

router.get(
  '/guard/schedule',
  authMiddleware,
  roleMiddleware(UserRole.GUARD, UserRole.ADMIN),
  getGuardSchedule
);

router.get(
  '/legal/applications/:id',
  authMiddleware,
  roleMiddleware(UserRole.LEGAL, UserRole.ADMIN),
  getLegalDetail
);

export default router;
