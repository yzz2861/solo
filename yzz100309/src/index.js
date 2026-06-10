const { parseInventoryCSV, parseMovementsCSV, parseCSVWithLineNumbers } = require('./parsers/csv-parser');
const { parseLayoutJSON, validatePosition, getPosition } = require('./parsers/layout-parser');
const {
  STATUS,
  buildSampleTracker,
  getSampleById,
  getSamplesByStatus,
  getSamplesByReviewer,
  getSamplesByPosition,
  getAllSamples,
} = require('./engine/sample-tracker');
const {
  CONFLICT_TYPES,
  detectAllConflicts,
  detectPositionConflicts,
  detectMissingSamples,
  detectReviewerMismatch,
  detectDuplicateMoves,
  detectInvalidPositions,
  detectEmptySampleIds,
  getConflictsByType,
  groupConflictsByType,
} = require('./audit/conflict-detector');
const { runAudit } = require('./commands/audit');
const { runMove } = require('./commands/move');
const { runReview } = require('./commands/review');
const { runExport } = require('./commands/export');
const { loadAllData } = require('./utils/data-loader');

module.exports = {
  parsers: {
    parseInventoryCSV,
    parseMovementsCSV,
    parseCSVWithLineNumbers,
    parseLayoutJSON,
    validatePosition,
    getPosition,
  },
  engine: {
    STATUS,
    buildSampleTracker,
    getSampleById,
    getSamplesByStatus,
    getSamplesByReviewer,
    getSamplesByPosition,
    getAllSamples,
  },
  audit: {
    CONFLICT_TYPES,
    detectAllConflicts,
    detectPositionConflicts,
    detectMissingSamples,
    detectReviewerMismatch,
    detectDuplicateMoves,
    detectInvalidPositions,
    detectEmptySampleIds,
    getConflictsByType,
    groupConflictsByType,
  },
  commands: {
    runAudit,
    runMove,
    runReview,
    runExport,
  },
  utils: {
    loadAllData,
  },
};
