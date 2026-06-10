import { getStore, persist } from '../init';
import { InspectionNote } from '../../types';

export class NoteRepo {
  create(note: InspectionNote): InspectionNote {
    const store = getStore();
    store.notes.set(note.id, note);
    persist();
    return note;
  }

  findByOrderId(orderId: string): InspectionNote[] {
    return Array.from(getStore().notes.values())
      .filter(n => n.orderId === orderId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
