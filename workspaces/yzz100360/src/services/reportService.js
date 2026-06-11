const db = require('../db');
const { addDays } = require('./batchService');

const STATUS_FLOW = {
  collected: {
    next: ['cleaning'],
    description: '待清洗',
    next_desc: '清洗中',
  },
  cleaning: {
    next: ['cleaned'],
    description: '清洗中',
    next_desc: '清洗完成',
  },
  cleaned: {
    next: ['sterilizing'],
    description: '已清洗',
    next_desc: '灭菌中',
  },
  sterilizing: {
    next: ['sterilized', 'sterilization_failed'],
    description: '灭菌中',
    next_desc: '灭菌完成或失败',
  },
  sterilized: {
    next: ['stored'],
    description: '灭菌成功',
    next_desc: '入柜',
  },
  sterilization_failed: {
    next: [],
    description: '灭菌失败',
    next_desc: '需重新处理',
  },
  stored: {
    next: ['issued'],
    description: '已入柜',
    next_desc: '发放',
  },
  issued: {
    next: ['used', 'stored'],
    description: '已发放',
    next_desc: '使用或归还',
  },
  used: {
    next: [],
    description: '已使用',
    next_desc: '',
  },
};

const SCAN_ACTION_MAP = {
  collect: { status: 'collected', description: '回收登记' },
  cleaning: { status: 'cleaning', description: '开始清洗' },
  cleaned: { status: 'cleaned', description: '清洗完成' },
  sterilizing: { status: 'sterilizing', description: '开始灭菌' },
  sterilized: { status: 'sterilized', description: '灭菌完成' },
  sterilization_fail: { status: 'sterilization_failed', description: '灭菌失败' },
  stored: { status: 'stored', description: '入柜' },
  issue: { status: 'issued', description: '发放' },
  use: { status: 'used', description: '使用' },
  return: { status: 'stored', description: '归还' },
  reprocess: { status: 'cleaned', description: '重新处理' },
};

const getDailyReport = async (reportDate) => {
  const date = reportDate || new Date().toISOString().slice(0, 10);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  const expiredBatches = await db.all(
    `SELECT sb.*, julianday(?) - julianday(sb.expire_at) as days_overdue
     FROM sterilization_batches sb
     WHERE sb.status = 'stored' 
       AND sb.expire_at IS NOT NULL 
       AND sb.expire_at < ?
     ORDER BY sb.expire_at ASC`,
    [date, date]
  );

  const expiringSoonBatches = await db.all(
    `SELECT sb.*, julianday(sb.expire_at) - julianday(?) as days_remaining
     FROM sterilization_batches sb
     WHERE sb.status = 'stored' 
       AND sb.expire_at IS NOT NULL 
       AND sb.expire_at >= ? 
       AND sb.expire_at < ?
     ORDER BY sb.expire_at ASC`,
    [date, date, addDays(date, 3).toISOString()]
  );

  const dayScans = await db.all(
    `SELECT action, status, COUNT(*) as count
     FROM scan_records
     WHERE timestamp >= ? AND timestamp < ?
     GROUP BY action, status
     ORDER BY count DESC`,
    [date, nextDateStr]
  );

  const dayBatches = await db.all(
    `SELECT status, COUNT(*) as count
     FROM sterilization_batches
     WHERE created_at >= ? AND created_at < ?
     GROUP BY status`,
    [date, nextDateStr]
  );

  const missedScans = await findMissedScans(date);

  const sterilizationStats = await db.all(
    `SELECT 
      sterilizer_id,
      COUNT(*) as total_cycles,
      SUM(CASE WHEN sterilization_result = 'success' THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status = 'sterilization_failed' THEN 1 ELSE 0 END) as failed_count
     FROM sterilization_batches
     WHERE sterilized_at >= ? AND sterilized_at < ?
     GROUP BY sterilizer_id
     ORDER BY total_cycles DESC`,
    [date, nextDateStr]
  );

  const dayTreatments = await db.all(
    `SELECT 
      status,
      COUNT(*) as count
     FROM treatment_records
     WHERE treatment_date = ?
     GROUP BY status`,
    [date]
  );

  const overdueBatchesFormatted = expiredBatches.map(b => ({
    ...b,
    days_overdue: Math.ceil(Math.abs(b.days_overdue)),
    status_description: STATUS_FLOW[b.status]?.description || b.status,
  }));

  const expiringFormatted = expiringSoonBatches.map(b => ({
    ...b,
    days_remaining: Math.ceil(b.days_remaining),
    status_description: STATUS_FLOW[b.status]?.description || b.status,
  }));

  return {
    report_date: date,
    summary: {
      total_scans_today: dayScans.reduce((sum, s) => sum + s.count, 0),
      scan_by_action: dayScans,
      batches_created_today: dayBatches,
      expired_batches_count: overdueBatchesFormatted.length,
      expiring_soon_count: expiringFormatted.length,
      missed_scans_count: missedScans.length,
      sterilization_stats: sterilizationStats,
      treatments_today: dayTreatments,
    },
    expired_batches: overdueBatchesFormatted,
    expiring_soon_batches: expiringFormatted,
    missed_scans: missedScans,
  };
};

const findMissedScans = async (date) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  const allBatches = await db.all(
    `SELECT * FROM sterilization_batches
     WHERE collected_at IS NOT NULL
     ORDER BY collected_at DESC`
  );

  const missedScanReports = [];

  for (const batch of allBatches) {
    const scans = await db.all(
      'SELECT action, timestamp, status, operator, location FROM scan_records WHERE qr_code = ? ORDER BY timestamp',
      [batch.qr_code]
    );

    const scanActions = new Set(scans.map(s => s.action));
    const scanStatuses = new Set(scans.map(s => s.status));

    const issues = [];

    if (batch.collected_at && !scanActions.has('collect')) {
      issues.push({
        type: 'missing_scan',
        action: 'collect',
        action_desc: '回收登记',
        reason: '已回收但无扫码记录',
        expected_time: batch.collected_at,
      });
    }

    if (batch.cleaned_at && !scanActions.has('cleaned')) {
      issues.push({
        type: 'missing_scan',
        action: 'cleaned',
        action_desc: '清洗完成',
        reason: '已清洗完成但无扫码记录',
        expected_time: batch.cleaned_at,
      });
    }

    if (batch.sterilized_at && !scanActions.has('sterilized')) {
      issues.push({
        type: 'missing_scan',
        action: 'sterilized',
        action_desc: '灭菌完成',
        reason: '已灭菌完成但无扫码记录',
        expected_time: batch.sterilized_at,
      });
    }

    if (batch.stored_at && !scanActions.has('stored')) {
      issues.push({
        type: 'missing_scan',
        action: 'stored',
        action_desc: '入柜',
        reason: '已入柜但无扫码记录',
        expected_time: batch.stored_at,
      });
    }

    if (batch.issued_at && !scanActions.has('issue')) {
      issues.push({
        type: 'missing_scan',
        action: 'issue',
        action_desc: '发放',
        reason: '已发放但无扫码记录',
        expected_time: batch.issued_at,
      });
    }

    if (batch.used_at && !scanActions.has('use')) {
      issues.push({
        type: 'missing_scan',
        action: 'use',
        action_desc: '使用',
        reason: '已使用但无扫码记录',
        expected_time: batch.used_at,
      });
    }

    const flowInfo = STATUS_FLOW[batch.status];
    if (flowInfo && flowInfo.next.length > 0) {
      const allNextScanned = flowInfo.next.every(nextAction => {
        const mappedAction = nextAction === 'sterilized' ? 'sterilized' : 
                            nextAction === 'sterilization_failed' ? 'sterilization_fail' :
                            nextAction === 'stored' && batch.status === 'issued' ? 'return' :
                            nextAction;
        return scanActions.has(mappedAction);
      });

      if (!allNextScanned) {
        const missingNextActions = flowInfo.next.filter(nextAction => {
          const mappedAction = nextAction === 'sterilized' ? 'sterilized' : 
                              nextAction === 'sterilization_failed' ? 'sterilization_fail' :
                              nextAction === 'stored' && batch.status === 'issued' ? 'return' :
                              nextAction;
          return !scanActions.has(mappedAction);
        });

        const nextActionDescriptions = missingNextActions.map(na => {
          if (na === 'sterilized') return '灭菌完成';
          if (na === 'sterilization_failed') return '灭菌失败记录';
          if (na === 'stored' && batch.status === 'issued') return '归还';
          if (na === 'stored') return '入柜';
          if (na === 'issued') return '发放';
          if (na === 'cleaning') return '清洗中';
          if (na === 'sterilizing') return '灭菌中';
          if (na === 'used') return '使用';
          return STATUS_FLOW[na]?.next_desc || STATUS_FLOW[na]?.description || na;
        }).join('或');

        issues.push({
          type: 'pending_next_step',
          current_status: batch.status,
          current_status_desc: flowInfo.description,
          missing_next_actions: missingNextActions,
          missing_next_actions_desc: nextActionDescriptions,
          reason: `${flowInfo.description}状态超过预期时间，${nextActionDescriptions}环节未执行`,
          since_time: getLastActionTime(batch),
        });
      }
    }

    if (issues.length > 0) {
      const lastScan = scans.length > 0 ? scans[scans.length - 1] : null;
      const locationInfo = batch.location || (lastScan && lastScan.location) || '未知';
      const operatorInfo = lastScan && lastScan.operator;

      missedScanReports.push({
        batch_id: batch.id,
        qr_code: batch.qr_code,
        bag_no: batch.bag_no,
        current_status: batch.status,
        current_status_desc: flowInfo?.description || batch.status,
        location: locationInfo,
        last_operator: operatorInfo,
        issues,
        last_scan: lastScan ? {
          action: lastScan.action,
          action_desc: SCAN_ACTION_MAP[lastScan.action]?.description || lastScan.action,
          timestamp: lastScan.timestamp,
          operator: lastScan.operator,
          location: lastScan.location,
        } : null,
        time_since_last_action: lastScan ? calculateTimeSince(lastScan.timestamp) : null,
        collected_at: batch.collected_at,
      });
    }
  }

  return missedScanReports.sort((a, b) => {
    const timeA = a.last_scan?.timestamp || a.collected_at || '1970-01-01';
    const timeB = b.last_scan?.timestamp || b.collected_at || '1970-01-01';
    return new Date(timeB) - new Date(timeA);
  });
};

const getLastActionTime = (batch) => {
  const times = [
    batch.used_at,
    batch.issued_at,
    batch.stored_at,
    batch.sterilized_at,
    batch.cleaned_at,
    batch.collected_at,
  ].filter(Boolean);
  
  return times.length > 0 ? times[0] : null;
};

const calculateTimeSince = (timestamp) => {
  if (!timestamp) return null;
  
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}天前`;
  if (diffHours > 0) return `${diffHours}小时前`;
  if (diffMins > 0) return `${diffMins}分钟前`;
  return '刚刚';
};

const getMissedScanAlerts = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  return findMissedScans(yesterdayStr);
};

const getInventoryStatus = async () => {
  const batchesByStatus = await db.all(
    `SELECT status, COUNT(*) as count, MIN(expire_at) as earliest_expire
     FROM sterilization_batches
     GROUP BY status
     ORDER BY status`
  );

  const instrumentsByType = await db.all(
    `SELECT type, COUNT(*) as count
     FROM instruments
     WHERE status = 'in_use'
     GROUP BY type
     ORDER BY type`
  );

  const formattedBatches = batchesByStatus.map(b => ({
    ...b,
    status_desc: STATUS_FLOW[b.status]?.description || b.status,
  }));

  return {
    batches_by_status: formattedBatches,
    instruments_by_type: instrumentsByType,
  };
};

module.exports = {
  getDailyReport,
  findMissedScans,
  getMissedScanAlerts,
  getInventoryStatus,
};
