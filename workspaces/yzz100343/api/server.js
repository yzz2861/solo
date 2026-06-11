import express from 'express';
import cors from 'cors';
import { getDb } from './database.js';
import {
  getHazards,
  getHazardById,
  createHazard,
  submitRectification,
  submitReview,
  deleteHazard,
  getTeamStats,
  getOverviewStats,
} from './routes/hazards.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'],
  credentials: true,
}));

app.use(express.json());

app.get('/api/hazards', getHazards);
app.get('/api/hazards/:id', getHazardById);
app.post('/api/hazards', createHazard);
app.post('/api/hazards/:hazardId/rectification', submitRectification);
app.post('/api/hazards/:hazardId/review', submitReview);
app.delete('/api/hazards/:id', deleteHazard);
app.get('/api/stats/team', getTeamStats);
app.get('/api/stats/overview', getOverviewStats);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  await getDb();
  console.log(`🚀 后端服务已启动，监听端口 ${PORT}`);
  console.log(`📡 API地址: http://localhost:${PORT}/api`);
});
