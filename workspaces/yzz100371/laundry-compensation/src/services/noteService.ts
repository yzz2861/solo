import { v4 as uuidv4 } from 'uuid';
import { NoteRepo } from '../db/repositories/noteRepo';
import { TimelineRepo } from '../db/repositories/timelineRepo';
import { OrderService } from './orderService';
import { InspectionNote, AddNoteInput, TimelineEventType } from '../types';
import { OrderNotFoundError } from '../utils/errors';

export class NoteService {
  constructor(
    private noteRepo: NoteRepo,
    private timelineRepo: TimelineRepo,
    private orderService: OrderService,
  ) {}

  addNote(input: AddNoteInput): InspectionNote {
    const order = this.orderService.getOrder(input.orderId);
    if (!order) throw new OrderNotFoundError(input.orderId);

    this.orderService.assertNotPickedUp(input.orderId);

    const now = new Date().toISOString();
    const note: InspectionNote = {
      id: uuidv4(),
      orderId: input.orderId,
      storeId: input.storeId,
      defectDescription: input.defectDescription,
      defectPhotos: JSON.stringify(input.defectPhotos),
      severity: input.severity,
      createdBy: input.createdBy,
      createdAt: now,
    };

    const saved = this.noteRepo.create(note);

    this.timelineRepo.create({
      id: uuidv4(),
      orderId: input.orderId,
      eventType: TimelineEventType.NoteAdded,
      actorId: input.createdBy,
      detail: `添加瑕疵备注: ${input.defectDescription}（严重程度: ${input.severity}）`,
      createdAt: now,
    });

    return saved;
  }

  getNotesByOrder(orderId: string): InspectionNote[] {
    return this.noteRepo.findByOrderId(orderId);
  }
}
