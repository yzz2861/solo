import path from 'path';

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  dbPath: path.join(process.cwd(), 'data', 'exam_report.db'),
  jwtSecret: process.env.JWT_SECRET || 'exam-report-secret-key-2024',
  logLevel: process.env.LOG_LEVEL || 'info'
};
