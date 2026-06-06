import {
  DispatchBatch,
  DispatchItem,
  DispatchResult,
  DispatchResultItem,
  DispatchStatus,
  Pilot,
  ProcessAction,
  ReviewOpinion,
  RiskLevel
} from '../objects/types';
import { DispatchItemEntity } from '../objects/entities';
import { MaterialRule } from '../rules/materialRule';
import { RiskAssessmentRule } from '../rules/riskAssessmentRule';
import { ReviewRule } from '../rules/reviewRule';
import { DispatchStateMachine } from '../states/dispatchStateMachine';
import { processRecorder } from '../records/processRecorder';

export interface ProcessBatchRequest {
  batchNo: string;
  sourceChannel: string;
  items: DispatchItem[];
  action: string;
  reviewOpinion?: ReviewOpinion;
}

export interface ProcessBatchResponse {
  success: boolean;
  data?: DispatchResult;
  error?: string;
}

export class DispatchService {
  private pilotRegistry: Map<string, Pilot> = new Map();
  private stateMachines: Map<string, DispatchStateMachine> = new Map();

  registerPilot(pilot: Pilot): void {
    this.pilotRegistry.set(pilot.id, pilot);
  }

  getPilot(pilotId: string): Pilot | undefined {
    return this.pilotRegistry.get(pilotId);
  }

  processBatch(request: ProcessBatchRequest): ProcessBatchResponse {
    try {
      const batchNo = request.batchNo;
      const sourceChannel = request.sourceChannel as any;
      const action = request.action as ProcessAction;

      const itemIds = request.items.map(item => item.itemId || '');
      processRecorder.registerBatch(batchNo, sourceChannel, itemIds);

      const resultItems: DispatchResultItem[] = [];

      for (const item of request.items) {
        const resultItem = this.processItem(item, batchNo, sourceChannel, action, request.reviewOpinion);
        resultItems.push(resultItem);
      }

      const approvableCount = resultItems.filter(i => i.status === DispatchStatus.APPROVABLE).length;
      const supplementRequiredCount = resultItems.filter(i => i.status === DispatchStatus.SUPPLEMENT_REQUIRED).length;
      const lockedCount = resultItems.filter(i => i.status === DispatchStatus.LOCKED).length;
      const failedCount = resultItems.filter(i => i.status === DispatchStatus.FAILED).length;

      const result: DispatchResult = {
        batchNo,
        sourceChannel,
        totalCount: resultItems.length,
        approvableCount,
        supplementRequiredCount,
        lockedCount,
        failedCount,
        items: resultItems,
        processedAt: new Date().toISOString()
      };

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private processItem(
    item: DispatchItem,
    batchNo: string,
    sourceChannel: string,
    action: ProcessAction,
    reviewOpinion?: ReviewOpinion
  ): DispatchResultItem {
    const itemEntity = new DispatchItemEntity(item);
    const pilot = this.pilotRegistry.get(item.pilotId);

    const materialResult = MaterialRule.checkMaterials(itemEntity);
    const riskResult = RiskAssessmentRule.assess(itemEntity, pilot);

    const reviewResult = ReviewRule.evaluate(riskResult, materialResult);

    const stateMachine = new DispatchStateMachine(
      itemEntity.itemId,
      DispatchStatus.PENDING,
      riskResult.riskLevel
    );
    this.stateMachines.set(itemEntity.itemId, stateMachine);

    if (action === ProcessAction.SUBMIT) {
      stateMachine.transition(ProcessAction.SUBMIT, 'system', '提交派单申请');

      if (!materialResult.complete) {
        stateMachine.transition(ProcessAction.SUPPLEMENT, 'system', '材料不齐全，需补充材料');
      } else if (reviewResult.canDirectApprove) {
        stateMachine.transition(ProcessAction.APPROVE, 'system', '系统自动审核通过');
      }
    }

    const finalStatus = stateMachine.getCurrentStatus();
    const allReasons = [...materialResult.reasons, ...riskResult.riskReasons, ...reviewResult.reasons];

    const history = stateMachine.getHistory();
    for (const transition of history) {
      processRecorder.record(
        itemEntity.itemId,
        batchNo,
        sourceChannel as any,
        transition,
        reviewOpinion?.reviewer,
        reviewOpinion?.opinion,
        reviewOpinion
      );
    }

    processRecorder.updateBatchItemStatus(batchNo, itemEntity.itemId, finalStatus);

    return {
      itemId: itemEntity.itemId,
      pilotId: itemEntity.pilotId,
      pilotName: itemEntity.pilotName,
      shipName: itemEntity.shipName,
      status: finalStatus,
      reasons: allReasons,
      riskLevel: riskResult.riskLevel,
      reviewRequired: reviewResult.reviewRequired,
      canDirectApprove: reviewResult.canDirectApprove
    };
  }

  getItemHistory(itemId: string) {
    return processRecorder.getItemHistory(itemId);
  }

  getBatchHistory(batchNo: string) {
    return processRecorder.getBatchHistory(batchNo);
  }

  getStateMachine(itemId: string): DispatchStateMachine | undefined {
    return this.stateMachines.get(itemId);
  }

  performAction(
    itemId: string,
    action: ProcessAction,
    operator?: string,
    remark?: string,
    reviewOpinion?: ReviewOpinion
  ): { success: boolean; newStatus?: DispatchStatus; reason?: string } {
    const stateMachine = this.stateMachines.get(itemId);
    if (!stateMachine) {
      return { success: false, reason: '未找到该明细项的状态机' };
    }

    const result = stateMachine.transition(action, operator, remark);
    if (result.success && result.newStatus) {
      const history = stateMachine.getHistory();
      const lastTransition = history[history.length - 1];
      
      const itemRecords = processRecorder.getItemHistory(itemId);
      const firstRecord = itemRecords[0];
      if (firstRecord) {
        processRecorder.record(
          itemId,
          firstRecord.batchNo,
          firstRecord.sourceChannel,
          lastTransition,
          operator,
          remark,
          reviewOpinion
        );
        processRecorder.updateBatchItemStatus(firstRecord.batchNo, itemId, result.newStatus);
      }
    }

    return result;
  }
}

export const dispatchService = new DispatchService();
