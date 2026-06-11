const db = require('../db');
const { addDays } = require('./batchService');

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

  return {
    report_date: date,
    summary: {
      total_scans_today: dayScans.reduce((sum, s) => sum + s.count, 0),
      scan_by_action: dayScans,
      batches_created_today: dayBatches,
      expired_batches_count: expiredBatches.length,
      expiring_soon_count: expiringSoonBatches.length,
      sterilization_stats: sterilizationStats,
      treatments_today: dayTreatments,
    },
    expired_batches: expiredBatches.map(b => ({
      ...b,
      days_overdue: Math.ceil(Math.abs(b.days_overdue)),
    })),
    expiring_soon_batches: expiringSoonBatches.map(b => ({
      ...b,
      days_remaining: Math.ceil(b.days_remaining),
    })),
    missed_scans: missedScans,
  };
};

const findMissedScans = async (date) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  const batches = await db.all(
    `SELECT * FROM sterilization_batches
     WHERE (collected_at >= ? AND collected_at < ?)
        OR (cleaned_at >= ? AND cleaned_at < ?)
        OR (sterilized_at >= ? AND sterilized_at < ?)
     ORDER BY created_at DESC`,
    [date, nextDateStr, date, nextDateStr, date, nextDateStr]
  );

  const missedScanReports = [];

  for (const batch of batches) {
    const scans = await db.all(
      'SELECT action, timestamp FROM scan_records WHERE qr_code = ? ORDER BY timestamp',
      [batch.qr_code]
    );

    const scanActions = new Set(scans.map(s => s.action));

    const expectedFlow = [];
    if (batch.collected_at) expectedFlow.push('collect');
    if (batch.cleaned_at) expectedFlow.push('cleaned');
    if (batch.status === 'sterilizing' || batch.sterilized_at) expectedFlow.push('sterilizing');
    if (batch.sterilized_at && batch.status !== 'sterilization_failed') expectedFlow.push('sterilized');
    if (batch.stored_at) expectedFlow.push('stored');
    if (batch.issued_at) expectedFlow.push('issue');
    if (batch.used_at) expectedFlow.push('use');

    const missing = expectedFlow.filter(action => !scanActions.has(action));

    if (missing.length > 0) {
      missedScanReports.push({
        batch_id: batch.id,
        qr_code: batch.qr_code,
        bag_no: batch.bag_no,
        current_status: batch.status,
        missing_actions: missing,
        last_scan: scans.length > 0 ? scans[scans.length - 1] : null,
      });
    }
  }

  return missedScanReports;
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

  return {
    batches_by_status: batchesByStatus,
    instruments_by_type: instrumentsByType,
  };
};

module.exports = {
  getDailyReport,
  findMissedScans,
  getMissedScanAlerts,
  getInventoryStatus,
};
