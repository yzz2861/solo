import express from 'express';
import { getStore } from './db/init';
import { OrderRepo } from './db/repositories/orderRepo';
import { NoteRepo } from './db/repositories/noteRepo';
import { ClaimRepo } from './db/repositories/claimRepo';
import { ReviewRepo } from './db/repositories/reviewRepo';
import { SupplementRepo } from './db/repositories/supplementRepo';
import { TimelineRepo } from './db/repositories/timelineRepo';
import { OrderService } from './services/orderService';
import { NoteService } from './services/noteService';
import { ClaimService } from './services/claimService';
import { ReviewService } from './services/reviewService';
import { SupplementService } from './services/supplementService';
import { TimelineService } from './services/timelineService';
import { ExportService } from './services/exportService';
import { createOrderRoutes } from './routes/orderRoutes';
import { createClaimRoutes } from './routes/claimRoutes';
import { createExportRoutes } from './routes/exportRoutes';
import { errorHandler } from './middleware/errorHandler';

const PORT = process.env.PORT || 3100;

function main() {
  getStore();

  const orderRepo = new OrderRepo();
  const noteRepo = new NoteRepo();
  const claimRepo = new ClaimRepo();
  const reviewRepo = new ReviewRepo();
  const supplementRepo = new SupplementRepo();
  const timelineRepo = new TimelineRepo();

  const orderService = new OrderService(orderRepo, timelineRepo);
  const noteService = new NoteService(noteRepo, timelineRepo, orderService);
  const claimService = new ClaimService(claimRepo, timelineRepo, orderService, noteRepo, reviewRepo, supplementRepo);
  const reviewService = new ReviewService(claimRepo, reviewRepo, timelineRepo);
  const supplementService = new SupplementService(supplementRepo, claimRepo, timelineRepo);
  const timelineService = new TimelineService(timelineRepo);
  const exportService = new ExportService(claimRepo, orderRepo, reviewRepo);

  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'laundry-compensation' });
  });

  app.use('/api/orders', createOrderRoutes(orderService, noteService, timelineService));
  app.use('/api/claims', createClaimRoutes(claimService, reviewService, supplementService));
  app.use('/api/exports', createExportRoutes(exportService));

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`连锁洗衣赔付接口服务已启动: http://localhost:${PORT}`);
  });
}

main();
