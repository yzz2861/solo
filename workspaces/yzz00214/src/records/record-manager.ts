import {
  ProcessingRecord,
  RiskSnapshot,
  DataReplayResult,
  ReplayStep
} from './processing-record';
import { TaskStatus, TASK_STATUS_LABELS } from '../status';
import { RuleEngineResult } from '../rules';

export class RecordManager {
  private records: Map<string, ProcessingRecord[]> = new Map();

  addRecord(
    applicationId: string,
    record: ProcessingRecord
  ): void {
    if (!this.records.has(applicationId)) {
      this.records.set(applicationId, []);
    }
    this.records.get(applicationId)!.push(record);
  }

  getRecords(applicationId: string): ProcessingRecord[] {
    const records = this.records.get(applicationId);
    return records ? [...records] : [];
  }

  createRiskSnapshot(ruleResult: RuleEngineResult): RiskSnapshot {
    return {
      totalRiskScore: ruleResult.totalRiskScore,
      riskLevel: ruleResult.riskLevel,
      calculationBasis: ruleResult.calculationBasis,
      anomalyExplanation: ruleResult.anomalyExplanation
    };
  }

  createProcessingRecord(params: {
    applicationId: string;
    cardId: string;
    studentId: string;
    operator: string;
    previousStatus: TaskStatus;
    currentStatus: TaskStatus;
    trigger: string;
    reason: string;
    ruleResult?: RuleEngineResult;
  }): ProcessingRecord {
    const { ruleResult } = params;
    const recordRuleResults = ruleResult?.ruleResults || [];
    const riskSnapshot = ruleResult
      ? this.createRiskSnapshot(ruleResult)
      : {
          totalRiskScore: 0,
          riskLevel: 'low' as const,
          calculationBasis: {
            totalScore: 0,
            breakdown: []
          },
          anomalyExplanation: ''
        };

    return {
      recordId: `REC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      applicationId: params.applicationId,
      cardId: params.cardId,
      studentId: params.studentId,
      processTime: new Date().toISOString(),
      operator: params.operator,
      previousStatus: params.previousStatus,
      currentStatus: params.currentStatus,
      trigger: params.trigger as any,
      reason: params.reason,
      riskSnapshot,
      ruleResults: recordRuleResults
    };
  }

  replayData(applicationId: string): DataReplayResult {
    const records = this.getRecords(applicationId);

    if (records.length === 0) {
      return {
        applicationId,
        totalSteps: 0,
        steps: [],
        finalStatus: 'pending',
        statusTimeline: []
      };
    }

    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.processTime).getTime() - new Date(b.processTime).getTime()
    );

    const steps: ReplayStep[] = sortedRecords.map((record, index) => ({
      stepIndex: index + 1,
      recordId: record.recordId,
      processTime: record.processTime,
      operator: record.operator,
      fromStatus: record.previousStatus,
      toStatus: record.currentStatus,
      trigger: record.trigger,
      reason: record.reason,
      riskScore: record.riskSnapshot.totalRiskScore,
      riskLevel: record.riskSnapshot.riskLevel,
      anomalyExplanation: record.riskSnapshot.anomalyExplanation
    }));

    const finalStatus = sortedRecords[sortedRecords.length - 1].currentStatus;

    const statusTimeline = this.buildStatusTimeline(sortedRecords);

    return {
      applicationId,
      totalSteps: steps.length,
      steps,
      finalStatus,
      statusTimeline
    };
  }

  private buildStatusTimeline(records: ProcessingRecord[]): DataReplayResult['statusTimeline'] {
    if (records.length === 0) return [];

    const timeline: DataReplayResult['statusTimeline'] = [];

    let currentStatus: TaskStatus = records[0].previousStatus;
    let currentStartTime = records[0].processTime;

    for (const record of records) {
      if (record.previousStatus !== currentStatus) {
        timeline.push({
          status: currentStatus,
          startTime: currentStartTime,
          endTime: record.processTime,
          duration:
            new Date(record.processTime).getTime() -
            new Date(currentStartTime).getTime()
        });
        currentStatus = record.previousStatus;
        currentStartTime = record.processTime;
      }

      timeline.push({
        status: record.currentStatus,
        startTime: record.processTime
      });
      currentStatus = record.currentStatus;
      currentStartTime = record.processTime;
    }

    const uniqueTimeline: DataReplayResult['statusTimeline'] = [];
    for (let i = 0; i < timeline.length; i++) {
      const current = timeline[i];
      const next = timeline[i + 1];
      if (next && current.status === next.status) {
        continue;
      }
      uniqueTimeline.push(current);
    }

    return uniqueTimeline;
  }

  getLatestRecord(applicationId: string): ProcessingRecord | null {
    const records = this.getRecords(applicationId);
    if (records.length === 0) return null;

    return records.reduce((latest, record) => {
      return new Date(record.processTime).getTime() > new Date(latest.processTime).getTime()
        ? record
        : latest;
    });
  }
}
