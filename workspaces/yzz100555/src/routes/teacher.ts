import { Router, Request, Response } from 'express';
import { PackageService } from '../services/packageService';

export function createTeacherRouter(service: PackageService = new PackageService()): Router {
  const router = Router();

  router.get('/available-this-week', (req: Request, res: Response) => {
    try {
      const teacherId = req.query.teacher_id as string | undefined;
      const result = service.getAvailableStudentsThisWeek(teacherId);
      const summary = {
        total_students: result.length,
        total_available_lessons: result.reduce((sum, r) => sum + r.package.remaining_lessons, 0),
        by_date: {} as Record<string, number>,
      };
      for (const r of result) {
        for (const d of r.available_dates) {
          summary.by_date[d] = (summary.by_date[d] || 0) + 1;
        }
      }
      res.json({
        success: true,
        data: {
          students: result.map((r) => ({
            student_id: r.student.id,
            student_name: r.student.name,
            parent_phone: r.student.parent_phone,
            package_id: r.package.id,
            package_name: r.package.name,
            course_name: r.course.name,
            subject: r.course.subject,
            remaining_lessons: r.package.remaining_lessons,
            available_dates: r.available_dates,
            freeze_notes: r.freeze_notes,
          })),
          summary,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  });

  return router;
}
