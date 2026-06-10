const { parseInventoryCSV, parseMovementsCSV } = require('../parsers/csv-parser');
const { parseLayoutJSON } = require('../parsers/layout-parser');
const { buildSampleTracker } = require('../engine/sample-tracker');
const { detectAllConflicts } = require('../audit/conflict-detector');

async function loadAllData(opts) {
  const [inventory, boxes, movements] = await Promise.all([
    parseInventoryCSV(opts.inventory),
    parseLayoutJSON(opts.layout),
    parseMovementsCSV(opts.movements),
  ]);

  const tracker = buildSampleTracker(inventory, boxes, movements);
  const conflicts = detectAllConflicts(tracker, inventory, movements);

  return {
    inventory,
    boxes,
    movements,
    tracker,
    conflicts,
  };
}

module.exports = {
  loadAllData,
};
