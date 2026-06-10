import { Router, Request, Response } from 'express';
import { ClaimService } from '../services/claimService';
import { ReviewService } from '../services/reviewService';
import { SupplementService } from '../services/supplementService';
import { validate } from '../middleware/validate';
import { ReviewAction } from '../types';

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export function createClaimRoutes(
  claimService: ClaimService,
  reviewService: ReviewService,
  supplementService: SupplementService,
): Router {
  const router = Router();

  router.post(
    '/',
    validate([
      { field: 'orderId', required: true, type: 'string' },
      { field: 'storeId', required: true, type: 'string' },
      { field: 'amount', required: true, type: 'number', min: 0.01 },
      { field: 'reason', required: true, type: 'string', minLength: 1 },
    ]),
    (req: Request, res: Response) => {
      const actorId = req.headers['x-actor-id'] as string || 'unknown';
      const claim = claimService.submitClaim(req.body, actorId);
      res.status(201).json({ success: true, data: claim });
    },
  );

  router.get('/:id', (req: Request, res: Response) => {
    const claim = claimService.getClaim(param(req, 'id'));
    res.json({ success: true, data: claim });
  });

  router.get('/:id/details', (req: Request, res: Response) => {
    const details = claimService.getClaimWithDetails(param(req, 'id'));
    res.json({ success: true, data: details });
  });

  router.get('/order/:orderId', (req: Request, res: Response) => {
    const claims = claimService.getClaimsByOrder(param(req, 'orderId'));
    res.json({ success: true, data: claims });
  });

  router.post(
    '/:id/review',
    validate([
      { field: 'action', required: true, type: 'string' },
      { field: 'comment', required: true, type: 'string' },
    ]),
    (req: Request, res: Response) => {
      const reviewerId = req.headers['x-actor-id'] as string || 'unknown';
      const review = reviewService.reviewClaim({
        claimId: param(req, 'id'),
        reviewerId,
        action: req.body.action as ReviewAction,
        comment: req.body.comment,
        approvedAmount: req.body.approvedAmount,
        isSeniorReviewer: req.body.isSeniorReviewer ?? false,
      });
      res.status(201).json({ success: true, data: review });
    },
  );

  router.get('/:id/reviews', (req: Request, res: Response) => {
    const reviews = reviewService.getReviewsByClaim(param(req, 'id'));
    res.json({ success: true, data: reviews });
  });

  router.post(
    '/:id/supplements',
    validate([
      { field: 'photos', required: true, type: 'array' },
      { field: 'description', required: true, type: 'string' },
    ]),
    (req: Request, res: Response) => {
      const submittedBy = req.headers['x-actor-id'] as string || 'unknown';
      const supplements = supplementService.submitSupplement({
        claimId: param(req, 'id'),
        submittedBy,
        photos: req.body.photos,
        description: req.body.description,
      });
      res.status(201).json({ success: true, data: supplements });
    },
  );

  router.get('/:id/supplements', (req: Request, res: Response) => {
    const supplements = supplementService.getSupplementsByClaim(param(req, 'id'));
    res.json({ success: true, data: supplements });
  });

  return router;
}
