const db = require('../db');

const traceByPatient = async (patientId) => {
  const treatments = await db.all(
    `SELECT tr.*, 
      json_group_array(json_object(
        'id', ti.id,
        'batch_id', ti.batch_id,
        'qr_code', sb.qr_code,
        'bag_no', sb.bag_no,
        'batch_status', sb.status,
        'picked_up_at', ti.picked_up_at,
        'used_at', ti.used_at
      )) as instruments_json
     FROM treatment_records tr
     LEFT JOIN treatment_instruments ti ON tr.id = ti.treatment_id
     LEFT JOIN sterilization_batches sb ON ti.batch_id = sb.id
     WHERE tr.patient_id = ?
     GROUP BY tr.id
     ORDER BY tr.treatment_date DESC`,
    [patientId]
  );

  const result = [];
  for (const t of treatments) {
    let instruments = [];
    try {
      instruments = JSON.parse(t.instruments_json);
      if (instruments.length === 1 && instruments[0].id === null) {
        instruments = [];
      }
    } catch (e) {
      instruments = [];
    }
    delete t.instruments_json;

    const batchDetailPromises = instruments
      .filter(inst => inst.batch_id)
      .map(inst => getBatchFullTrace(inst.batch_id));

    const batchTraces = await Promise.all(batchDetailPromises);

    result.push({
      ...t,
      instrument_batches: instruments.map((inst, idx) => ({
        ...inst,
        full_trace: batchTraces[idx] || null,
      })),
    });
  }

  return result;
};

const getBatchFullTrace = async (batchId) => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE id = ?', [batchId]);
  if (!batch) return null;

  const items = await db.all(
    `SELECT bi.instrument_id, i.code, i.name, i.type
     FROM batch_items bi
     JOIN instruments i ON bi.instrument_id = i.id
     WHERE bi.batch_id = ?`,
    [batchId]
  );

  const scanRecords = await db.all(
    'SELECT * FROM scan_records WHERE qr_code = ? ORDER BY timestamp ASC',
    [batch.qr_code]
  );

  const treatmentUsage = await db.all(
    `SELECT ti.*, tr.patient_id, tr.patient_name, tr.doctor, tr.treatment_date, tr.treatment_type
     FROM treatment_instruments ti
     JOIN treatment_records tr ON ti.treatment_id = tr.id
     WHERE ti.batch_id = ?
     ORDER BY ti.picked_up_at DESC`,
    [batchId]
  );

  return {
    batch_info: batch,
    instruments: items,
    scan_history: scanRecords,
    treatment_usage: treatmentUsage,
  };
};

const traceByInstrument = async (instrumentCode) => {
  const instrument = await db.get('SELECT * FROM instruments WHERE code = ?', [instrumentCode]);
  if (!instrument) {
    throw new Error('器械不存在');
  }

  const batchHistory = await db.all(
    `SELECT sb.*, 
      (SELECT MAX(timestamp) FROM scan_records sr WHERE sr.qr_code = sb.qr_code) as last_scan
     FROM sterilization_batches sb
     JOIN batch_items bi ON sb.id = bi.batch_id
     WHERE bi.instrument_id = ?
     ORDER BY sb.created_at DESC`,
    [instrument.id]
  );

  const detailedBatches = [];
  for (const batch of batchHistory) {
    const trace = await getBatchFullTrace(batch.id);
    detailedBatches.push(trace);
  }

  return {
    instrument,
    batch_history: detailedBatches,
  };
};

const traceByPotCycle = async (potCycle) => {
  const batches = await db.all(
    `SELECT * FROM sterilization_batches 
     WHERE pot_cycle = ? 
     ORDER BY sterilized_at DESC`,
    [potCycle]
  );

  const detailedBatches = [];
  for (const batch of batches) {
    const trace = await getBatchFullTrace(batch.id);
    detailedBatches.push(trace);
  }

  const stats = {
    total_batches: batches.length,
    success_count: batches.filter(b => b.sterilization_result === 'success' || b.status === 'sterilized' || b.status === 'stored' || b.status === 'issued' || b.status === 'used').length,
    failed_count: batches.filter(b => b.status === 'sterilization_failed').length,
    sterilizer_ids: [...new Set(batches.filter(b => b.sterilizer_id).map(b => b.sterilizer_id))],
  };

  return {
    pot_cycle: potCycle,
    stats,
    batches: detailedBatches,
  };
};

const traceByQRCode = async (qrCode) => {
  const batch = await db.get('SELECT * FROM sterilization_batches WHERE qr_code = ?', [qrCode]);
  if (!batch) {
    throw new Error('二维码对应的批次不存在');
  }

  return getBatchFullTrace(batch.id);
};

const traceBySterilizer = async (sterilizerId, startDate, endDate) => {
  const conditions = ['sterilizer_id = ?'];
  const params = [sterilizerId];

  if (startDate) {
    conditions.push('sterilized_at >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('sterilized_at <= ?');
    params.push(endDate);
  }

  const batches = await db.all(
    `SELECT * FROM sterilization_batches 
     WHERE ${conditions.join(' AND ')}
     ORDER BY sterilized_at DESC`,
    params
  );

  const detailedBatches = [];
  for (const batch of batches) {
    const trace = await getBatchFullTrace(batch.id);
    detailedBatches.push(trace);
  }

  return {
    sterilizer_id: sterilizerId,
    total_batches: batches.length,
    batches: detailedBatches,
  };
};

module.exports = {
  traceByPatient,
  traceByInstrument,
  traceByPotCycle,
  traceByQRCode,
  traceBySterilizer,
  getBatchFullTrace,
};
