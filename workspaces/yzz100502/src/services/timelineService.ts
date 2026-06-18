import type { SmsRecord, AnalysisResult, PatientTimeline, PatientTimelineRecord, TrendType, SeverityLevel } from '../types';
import { SEVERITY_CONFIGS } from '../types';

const getSeverityPriority = (severity: SeverityLevel): number => {
  const config = SEVERITY_CONFIGS.find((c) => c.key === severity);
  return config?.priority || 0;
};

export const timelineService = {
  aggregateByPatient(smsList: SmsRecord[], results: AnalysisResult[]): PatientTimeline[] {
    const patientMap = new Map<string, { sms: SmsRecord; result: AnalysisResult }[]>();

    for (const sms of smsList) {
      const result = results.find((r) => r.smsId === sms.id);
      if (!result) continue;

      if (!patientMap.has(sms.patientId)) {
        patientMap.set(sms.patientId, []);
      }
      patientMap.get(sms.patientId)!.push({ sms, result });
    }

    const timelines: PatientTimeline[] = [];

    for (const [patientId, records] of patientMap) {
      const sortedRecords = records.sort(
        (a, b) => new Date(a.sms.sendTime).getTime() - new Date(b.sms.sendTime).getTime()
      );

      const dateGroups = new Map<string, { sms: SmsRecord; result: AnalysisResult }[]>();
      for (const record of sortedRecords) {
        const dateKey = new Date(record.sms.sendTime).toDateString();
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(record);
      }

      const timelineRecords: PatientTimelineRecord[] = [];
      const severities: SeverityLevel[] = [];

      for (const [dateKey, dayRecords] of dateGroups) {
        const date = new Date(dateKey);
        const smsIds = dayRecords.map((r) => r.sms.id);
        
        let topSeverity: SeverityLevel = 'low';
        let topCategory = dayRecords[0].result.category;
        let topConfidence = 0;
        const summaries: string[] = [];

        for (const record of dayRecords) {
          const severityPriority = getSeverityPriority(record.result.severity);
          if (severityPriority > getSeverityPriority(topSeverity)) {
            topSeverity = record.result.severity;
            topCategory = record.result.category;
          }
          if (record.result.confidence > topConfidence) {
            topConfidence = record.result.confidence;
          }
          summaries.push(record.result.summary);
        }

        severities.push(topSeverity);

        const trend = this.calculateTrend(severities);

        timelineRecords.push({
          date,
          smsIds,
          category: topCategory,
          severity: topSeverity,
          summary: summaries.join('；'),
          trend,
        });
      }

      const firstSms = sortedRecords[0].sms;
      timelines.push({
        patientId,
        patientName: firstSms.patientName,
        patientNameMasked: firstSms.patientNameMasked,
        records: timelineRecords,
      });
    }

    return timelines.sort((a, b) => {
      const aLatest = a.records[a.records.length - 1];
      const bLatest = b.records[b.records.length - 1];
      return getSeverityPriority(bLatest.severity) - getSeverityPriority(aLatest.severity);
    });
  },

  calculateTrend(severities: SeverityLevel[]): TrendType {
    if (severities.length < 2) return 'unknown';

    const recent = severities.slice(-3);
    const priorities = recent.map((s) => getSeverityPriority(s));
    
    const first = priorities[0];
    const last = priorities[priorities.length - 1];
    
    if (last > first) return 'worsening';
    if (last < first) return 'improving';
    
    const allSame = priorities.every((p) => p === first);
    if (allSame) return 'stable';
    
    return 'unknown';
  },

  getTrendLabel(trend: TrendType): { label: string; color: string; icon: string } {
    switch (trend) {
      case 'improving':
        return { label: '好转', color: '#43A047', icon: 'TrendingUp' };
      case 'worsening':
        return { label: '加重', color: '#E53935', icon: 'TrendingDown' };
      case 'stable':
        return { label: '稳定', color: '#1976D2', icon: 'Minus' };
      default:
        return { label: '未知', color: '#757575', icon: 'HelpCircle' };
    }
  },

  formatDate(date: Date): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  },

  formatDateOnly(date: Date): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  },

  formatDateTime(date: Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours}:${minutes}`;
  },

  getDayDiff(date1: Date, date2: Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  },
};
