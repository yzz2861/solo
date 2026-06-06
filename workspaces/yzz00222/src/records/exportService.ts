import { DispatchResult, DispatchResultItem, DispatchStatus, SourceChannel } from '../objects/types';

export interface ExportRecord {
  批次号: string;
  来源渠道: string;
  明细项ID: string;
  引航员ID: string;
  引航员姓名: string;
  船舶名称: string;
  状态: string;
  风险等级: string;
  原因: string;
  是否需要复核: string;
  能否直接通过: string;
  处理时间: string;
}

export class ExportService {
  static toCSV(result: DispatchResult): string {
    const records = this.transform(result);
    if (records.length === 0) {
      return '';
    }

    const headers = Object.keys(records[0]) as (keyof ExportRecord)[];
    const headerRow = headers.join(',');
    const dataRows = records.map(record =>
      headers.map(h => this.escapeCSV(record[h])).join(',')
    );

    return [headerRow, ...dataRows].join('\n');
  }

  static toJSON(result: DispatchResult): string {
    return JSON.stringify(result, null, 2);
  }

  static toRecordList(result: DispatchResult): ExportRecord[] {
    return this.transform(result);
  }

  private static transform(result: DispatchResult): ExportRecord[] {
    return result.items.map(item => ({
      批次号: result.batchNo,
      来源渠道: this.getChannelName(result.sourceChannel),
      明细项ID: item.itemId,
      引航员ID: item.pilotId,
      引航员姓名: item.pilotName || '',
      船舶名称: item.shipName,
      状态: this.getStatusName(item.status),
      风险等级: item.riskLevel,
      原因: item.reasons.join('；'),
      是否需要复核: item.reviewRequired ? '是' : '否',
      能否直接通过: item.canDirectApprove ? '是' : '否',
      处理时间: result.processedAt
    }));
  }

  private static getStatusName(status: DispatchStatus): string {
    const nameMap: Record<DispatchStatus, string> = {
      [DispatchStatus.PENDING]: '待处理',
      [DispatchStatus.APPROVABLE]: '可办理',
      [DispatchStatus.SUPPLEMENT_REQUIRED]: '需补充',
      [DispatchStatus.LOCKED]: '已锁定',
      [DispatchStatus.FAILED]: '失败',
      [DispatchStatus.UNDER_REVIEW]: '复核中'
    };
    return nameMap[status] || status;
  }

  private static getChannelName(channel: SourceChannel): string {
    const nameMap: Record<SourceChannel, string> = {
      [SourceChannel.ONLINE]: '线上渠道',
      [SourceChannel.OFFLINE]: '线下渠道',
      [SourceChannel.PORTAL]: '门户网站',
      [SourceChannel.THIRD_PARTY]: '第三方渠道'
    };
    return nameMap[channel] || channel;
  }

  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  static getSummary(result: DispatchResult): {
    batchNo: string;
    sourceChannel: SourceChannel;
    totalCount: number;
    approvableCount: number;
    supplementRequiredCount: number;
    lockedCount: number;
    failedCount: number;
    processedAt: string;
  } {
    return {
      batchNo: result.batchNo,
      sourceChannel: result.sourceChannel,
      totalCount: result.totalCount,
      approvableCount: result.approvableCount,
      supplementRequiredCount: result.supplementRequiredCount,
      lockedCount: result.lockedCount,
      failedCount: result.failedCount,
      processedAt: result.processedAt
    };
  }
}
