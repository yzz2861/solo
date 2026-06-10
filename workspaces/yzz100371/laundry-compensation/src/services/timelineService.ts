import { TimelineRepo } from '../db/repositories/timelineRepo';
import { TimelineEvent } from '../types';

export class TimelineService {
  constructor(
    private timelineRepo: TimelineRepo,
  ) {}

  getTimelineByOrder(orderId: string): TimelineEvent[] {
    return this.timelineRepo.findByOrderId(orderId);
  }
}
