import { Router, Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { NoteService } from '../services/noteService';
import { TimelineService } from '../services/timelineService';
import { validate } from '../middleware/validate';
import { OrderStatus } from '../types';

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export function createOrderRoutes(
  orderService: OrderService,
  noteService: NoteService,
  timelineService: TimelineService,
): Router {
  const router = Router();

  router.post(
    '/',
    validate([
      { field: 'storeId', required: true, type: 'string' },
      { field: 'customerId', required: true, type: 'string' },
      { field: 'customerName', required: true, type: 'string', minLength: 1 },
      { field: 'receiptPhotos', required: true, type: 'array' },
    ]),
    (req: Request, res: Response) => {
      const actorId = req.headers['x-actor-id'] as string || 'unknown';
      const order = orderService.createOrder(req.body, actorId);
      res.status(201).json({ success: true, data: order });
    },
  );

  router.get('/:id', (req: Request, res: Response) => {
    const order = orderService.getOrder(param(req, 'id'));
    res.json({ success: true, data: order });
  });

  router.get('/store/:storeId', (req: Request, res: Response) => {
    const orders = orderService.getOrdersByStore(param(req, 'storeId'));
    res.json({ success: true, data: orders });
  });

  router.patch(
    '/:id/status',
    validate([
      { field: 'status', required: true, type: 'string' },
    ]),
    (req: Request, res: Response) => {
      const actorId = req.headers['x-actor-id'] as string || 'unknown';
      const newStatus = req.body.status as OrderStatus;
      const order = orderService.updateOrderStatus(param(req, 'id'), newStatus, actorId);
      res.json({ success: true, data: order });
    },
  );

  router.post(
    '/:id/notes',
    validate([
      { field: 'defectDescription', required: true, type: 'string', minLength: 1 },
      { field: 'defectPhotos', required: true, type: 'array' },
      { field: 'severity', required: true, type: 'string' },
    ]),
    (req: Request, res: Response) => {
      const note = noteService.addNote({
        orderId: param(req, 'id'),
        storeId: req.body.storeId || '',
        defectDescription: req.body.defectDescription,
        defectPhotos: req.body.defectPhotos,
        severity: req.body.severity,
        createdBy: req.headers['x-actor-id'] as string || 'unknown',
      });
      res.status(201).json({ success: true, data: note });
    },
  );

  router.get('/:id/notes', (req: Request, res: Response) => {
    const notes = noteService.getNotesByOrder(param(req, 'id'));
    res.json({ success: true, data: notes });
  });

  router.get('/:id/timeline', (req: Request, res: Response) => {
    const events = timelineService.getTimelineByOrder(param(req, 'id'));
    res.json({ success: true, data: events });
  });

  return router;
}
