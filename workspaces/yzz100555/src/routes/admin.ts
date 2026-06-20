import { Router, Request, Response } from 'express';
import { PackageService } from '../services/packageService';
import { BusinessError } from '../types';

export function createAdminRouter(service: PackageService = new PackageService()): Router {
  const router = Router();

  router.get('/balance/:packageId', (req: Request, res: Response) => {
    try {
      const result = service.getBalance(req.params.packageId);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err instanceof BusinessError) {
        res.status(400).json({ success: false, error: err.message, code: err.code });
      } else {
        res.status(500).json({ success: false, error: '服务器内部错误' });
      }
    }
  });

  router.get('/history/:studentId', (req: Request, res: Response) => {
    try {
      const result = service.getHistory(
        req.params.studentId,
        req.query.package_id as string | undefined,
        req.query.start_date as string | undefined,
        req.query.end_date as string | undefined,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      if (err instanceof BusinessError) {
        res.status(400).json({ success: false, error: err.message, code: err.code });
      } else {
        res.status(500).json({ success: false, error: '服务器内部错误' });
      }
    }
  });

  router.post('/package', (req: Request, res: Response) => {
    try {
      const { student_id, course_id, name, total_lessons, purchase_date, expire_date } = req.body;
      const result = service.createPackage(student_id, course_id, name, total_lessons, purchase_date, expire_date);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err instanceof BusinessError) {
        res.status(400).json({ success: false, error: err.message, code: err.code });
      } else {
        res.status(500).json({ success: false, error: '服务器内部错误' });
      }
    }
  });

  router.post('/student', (req: Request, res: Response) => {
    try {
      const { name, parent_phone, class_teacher_id } = req.body;
      const result = service.createStudent(name, parent_phone, class_teacher_id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  });

  router.post('/course', (req: Request, res: Response) => {
    try {
      const { name, subject, duration_minutes } = req.body;
      const result = service.createCourse(name, subject, duration_minutes ?? 60);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  });

  return router;
}
