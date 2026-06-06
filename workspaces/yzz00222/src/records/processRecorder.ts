import { v4 as uuidv4 } from 'uuid';
import {
  DispatchStatus,
  ProcessAction,
  SourceChannel,
  ReviewOpinion
} from '../objects/types';
import { StateTransition } from '../states/dispatchStateMachine';

export interface ProcessRecord {
  recordId: string;
  itemId: string;
  batchNo: string;
  sourceChannel: SourceChannel;
  action: ProcessAction;
  fromStatus: DispatchStatus;
  toStatus: DispatchStatus;
  operator?: string;
  remark?: string;
  reviewOpinion?: ReviewOpinion;
  timestamp: string;
}

export interface ItemHistory {
  itemId: string;
  batchNo: string;
  sourceChannel: SourceChannel;
  records: ProcessRecord[];
  currentStatus: DispatchStatus;
}

export interface BatchHistory {
  batchNo: string;
  sourceChannel: SourceChannel;
  totalItems: number;
  items: ItemHistory[];
  createdAt: string;
}

export class ProcessRecorder {
  private records: Map<string, ProcessRecord[]> = new Map();
  private batchRecords: Map<string, BatchHistory> = new Map();

  record(
    itemId: string,
    batchNo: string,
    sourceChannel: SourceChannel,
    transition: StateTransition,
    operator?: string,
    remark?: string,
    reviewOpinion?: ReviewOpinion
  ): ProcessRecord {
    const record: ProcessRecord = {
      recordId: uuidv4(),
      itemId,
      batchNo,
      sourceChannel,
      action: transition.action,
      fromStatus: transition.from,
      toStatus: transition.to,
      operator: operator || transition.operator,
      remark: remark || transition.remark,
      reviewOpinion,
      timestamp: transition.timestamp
    };

    if (!this.records.has(itemId)) {
      this.records.set(itemId, []);
    }
    this.records.get(itemId)!.push(record);

    return record;
  }

  getItemHistory(itemId: string): ProcessRecord[] {
    return this.records.get(itemId) || [];
  }

  getBatchHistory(batchNo: string): BatchHistory | undefined {
    return this.batchRecords.get(batchNo);
  }

  registerBatch(
    batchNo: string,
    sourceChannel: SourceChannel,
    itemIds: string[]
  ): void {
    const items: ItemHistory[] = itemIds.map(itemId => ({
      itemId,
      batchNo,
      sourceChannel,
      records: [],
      currentStatus: DispatchStatus.PENDING
    }));

    this.batchRecords.set(batchNo, {
      batchNo,
      sourceChannel,
      totalItems: itemIds.length,
      items,
      createdAt: new Date().toISOString()
    });
  }

  updateBatchItemStatus(
    batchNo: string,
    itemId: string,
    status: DispatchStatus
  ): void {
    const batch = this.batchRecords.get(batchNo);
    if (batch) {
      const item = batch.items.find(i => i.itemId === itemId);
      if (item) {
        item.currentStatus = status;
        item.records = this.getItemHistory(itemId);
      }
    }
  }

  getRecordsByBatch(batchNo: string): ProcessRecord[] {
    const result: ProcessRecord[] = [];
    for (const records of this.records.values()) {
      result.push(...records.filter(r => r.batchNo === batchNo));
    }
    return result.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
}

export const processRecorder = new ProcessRecorder();
