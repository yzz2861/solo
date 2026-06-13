import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import tenantRoutes from './routes/tenantRoutes';
import visitorRoutes from './routes/visitorRoutes';
import visitRoutes from './routes/visitRoutes';
import accessRoutes from './routes/accessRoutes';
import accessLogRoutes from './routes/accessLogRoutes';
import reportRoutes from './routes/reportRoutes';
import meetingRoomRoutes from './routes/meetingRoomRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: '共享工位访客通行 API 运行正常',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/access-logs', accessLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/meeting-rooms', meetingRoomRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
