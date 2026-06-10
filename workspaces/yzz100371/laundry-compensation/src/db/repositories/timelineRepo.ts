import { getStore, persist } from '../init';
import { TimelineEvent } from '../../types';

export class TimelineRepo {
  create(event: TimelineEvent): TimelineEvent {
    const store = getStore();
    store.timelineEvents.set(event.id, event);
    persist();
    return event;
  }

  findByOrderId(orderId: string): TimelineEvent[] {
    return Array.from(getStore().timelineEvents.values())
      .filter(e => e.orderId === orderId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
