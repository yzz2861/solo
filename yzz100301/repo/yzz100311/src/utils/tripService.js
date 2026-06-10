const { db } = require('../db');
const config = require('../config');

function getOrCreateTrip(plateNumber, tripNo) {
  let trip = db.prepare('SELECT * FROM trips WHERE plate_number = ? AND trip_no = ?').get(plateNumber, tripNo);
  if (trip) return { trip, created: false };

  const info = db.prepare(`
    INSERT INTO trips (trip_no, plate_number, status)
    VALUES (?, ?, ?)
  `).run(tripNo, plateNumber, config.STATUS.ENTERED);

  trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(info.lastInsertRowid);
  return { trip, created: true };
}

function updateTripStatus(tripId, status) {
  db.prepare(`
    UPDATE trips SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, tripId);
}

function checkAnomalies(tripId) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  if (!trip) return [];

  const anomalies = new Set();

  const entries = db.prepare('SELECT * FROM entry_records WHERE trip_id = ?').all(tripId);
  const exits = db.prepare('SELECT * FROM exit_weighbridge WHERE trip_id = ?').all(tripId);

  if (entries.length > 1) {
    const names = new Set(entries.map(e => e.driver_name).filter(Boolean));
    if (names.size > 1) {
      anomalies.add(config.ANOMALY_TYPES.DRIVER_MISMATCH);
    }
  }

  if (entries.length > 0 && exits.length > 0) {
    const entryDriver = entries[0].driver_name;
    const exitDriver = exits[0].driver_name;
    if (entryDriver && exitDriver && entryDriver !== exitDriver) {
      anomalies.add(config.ANOMALY_TYPES.DRIVER_MISMATCH);
    }
  }

  let hasWeightDiff = false;

  if (trip.gross_from_exit && trip.tare_from_entry && trip.net_weight && trip.net_weight > 0) {
    const netCalculated = trip.gross_from_exit - trip.tare_from_entry;
    const diffRatio = Math.abs(trip.net_weight - netCalculated) / trip.net_weight;
    if (diffRatio > config.NET_WEIGHT_DIFF_TOLERANCE) {
      hasWeightDiff = true;
    }
  }

  if (trip.gross_weight && trip.tare_weight && trip.net_weight && trip.net_weight > 0) {
    const netCalculated = trip.gross_weight - trip.tare_weight;
    const diffRatio = Math.abs(trip.net_weight - netCalculated) / trip.net_weight;
    if (diffRatio > config.WEIGHT_DIFF_TOLERANCE) {
      hasWeightDiff = true;
    }
  }

  if (hasWeightDiff) {
    anomalies.add(config.ANOMALY_TYPES.WEIGHT_DIFF_EXCEEDED);
  }

  if (exits.length > 1) {
    anomalies.add(config.ANOMALY_TYPES.DUPLICATE_EXIT);
  }

  if (entries.length > 0 && exits.length === 0 && trip.status !== 'exited') {
    anomalies.add(config.ANOMALY_TYPES.MISSING_EXIT_WEIGHBRIDGE);
  }

  if (entries.length > 1) {
    anomalies.add(config.ANOMALY_TYPES.DUPLICATE_ENTRY);
  }

  return Array.from(anomalies);
}

function updateTripAnomalies(tripId) {
  const anomalies = checkAnomalies(tripId);
  const anomalyStr = anomalies.length > 0 ? anomalies.join(',') : null;
  const isAnomaly = anomalies.length > 0 ? 1 : 0;

  db.prepare(`
    UPDATE trips
    SET anomaly_types = ?, is_anomaly = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(anomalyStr, isAnomaly, tripId);

  return anomalies;
}

function getTripDetail(tripId) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  if (!trip) return null;

  const entryRecords = db.prepare('SELECT * FROM entry_records WHERE trip_id = ? ORDER BY created_at').all(tripId);
  const exitRecords = db.prepare('SELECT * FROM exit_weighbridge WHERE trip_id = ? ORDER BY created_at').all(tripId);
  const supplementaryRecords = db.prepare('SELECT * FROM supplementary_weighbridge WHERE trip_id = ? ORDER BY created_at').all(tripId);
  const reviewRecords = db.prepare('SELECT * FROM review_records WHERE trip_id = ? ORDER BY created_at').all(tripId);

  return {
    ...trip,
    entry_records: entryRecords,
    exit_records: exitRecords,
    supplementary_records: supplementaryRecords,
    review_records: reviewRecords,
    anomaly_list: trip.anomaly_types ? trip.anomaly_types.split(',') : []
  };
}

module.exports = {
  getOrCreateTrip,
  updateTripStatus,
  checkAnomalies,
  updateTripAnomalies,
  getTripDetail
};
