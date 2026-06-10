const { loadAllData } = require('./src/utils/data-loader');

async function test() {
  const opts = {
    inventory: './examples/inventory.csv',
    layout: './examples/box-layout.json',
    movements: './examples/movements.csv',
  };

  const data = await loadAllData(opts);
  const { tracker, conflicts, inventory, movements } = data;

  console.log('=== Inventory 数据 ===');
  for (const inv of inventory) {
    console.log(`  行${inv._lineNumber}: ${inv.sampleId} -> ${inv.boxId}/${inv.position}`);
  }

  console.log('\n=== Movements 数据 ===');
  for (const move of movements) {
    console.log(`  行${move._lineNumber}: ${move.sampleId} ${move.fromBox}/${move.fromPosition} -> ${move.toBox}/${move.toPosition}`);
  }

  console.log('\n=== 最终样本位置 ===');
  for (const sample of tracker.samples.values()) {
    console.log(`  ${sample.sampleId}: ${sample.currentBox}/${sample.currentPosition} (status: ${sample.status})`);
  }

  console.log('\n=== BOX-B 盒子布局占用情况 ===');
  const boxB = tracker.boxes.get('BOX-B');
  for (const row of boxB.grid) {
    for (const pos of row) {
      if (pos.occupied) {
        console.log(`  ${boxB.boxId} ${pos.label}: ${pos.sampleId}`);
      }
    }
  }

  console.log('\n=== Position Conflicts ===');
  const posConflicts = conflicts.filter(c => c.type === 'position-conflict');
  if (posConflicts.length === 0) {
    console.log('  (没有检测到任何位置冲突!)');
  }
  for (const c of posConflicts) {
    console.log(`  [${c.source}] 行${c.lineNumber}: ${c.sampleId} ${c.boxId}/${c.position} - ${c.message}`);
    console.log(`    冲突样本: ${c.conflictingSamples?.join(', ')}`);
  }

  console.log('\n=== 所有冲突类型 ===');
  const typeCounts = {};
  for (const c of conflicts) {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  }
  console.log(typeCounts);
}

test().catch(err => console.error('Error:', err));
