import { getRepository } from '../config/database';
import { Cutoff, CutoffStatus } from '../entities/Cutoff';
import { Order } from '../entities/Order';
import { CloseCutoffRequest } from '../types/api';

export class CutoffService {
  static async createCutoff(name: string, cutoffTime: Date, createdBy?: string): Promise<Cutoff> {
    const cutoffRepo = getRepository(Cutoff);

    const cutoff = new Cutoff();
    cutoff.name = name;
    cutoff.cutoffTime = cutoffTime;
    cutoff.status = 'active';
    cutoff.createdBy = createdBy;

    return await cutoffRepo.save(cutoff);
  }

  static async closeCutoff(cutoffId: string, data: CloseCutoffRequest): Promise<Cutoff> {
    const cutoffRepo = getRepository(Cutoff);
    const orderRepo = getRepository(Order);

    const cutoff = await cutoffRepo.findOne({ where: { id: cutoffId } });
    if (!cutoff) throw new Error('截单批次不存在');
    if (cutoff.status === 'closed') throw new Error('截单批次已关闭');

    cutoff.status = 'closed';
    cutoff.actualCutoffTime = data.actualCutoffTime
      ? new Date(data.actualCutoffTime)
      : new Date();

    await orderRepo.update(
      { cutoffId, status: 'confirmed' },
      { status: 'cutoff', updatedAt: new Date() }
    );

    return await cutoffRepo.save(cutoff);
  }

  static async getCutoffDetail(cutoffId: string): Promise<Cutoff | null> {
    const cutoffRepo = getRepository(Cutoff);
    return await cutoffRepo.findOne({
      where: { id: cutoffId },
      relations: ['orders', 'orders.items', 'orders.items.product', 'deliveries', 'sortingLists']
    });
  }

  static async getCutoffList(status?: CutoffStatus): Promise<Cutoff[]> {
    const cutoffRepo = getRepository(Cutoff);
    const where = status ? { status } : {};
    return await cutoffRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  static async getActiveCutoff(): Promise<Cutoff | null> {
    const cutoffRepo = getRepository(Cutoff);
    return await cutoffRepo.findOne({
      where: { status: 'active' },
      order: { createdAt: 'DESC' }
    });
  }
}
