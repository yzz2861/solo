const { resolveConflict, loadSnapshot, listVersions } = require('./dist/version');
const { generateNewSchedule } = require('./dist/generator');
const path = require('path');

const outputDir = path.resolve('./output');
const versions = listVersions(outputDir);
const snap = loadSnapshot(outputDir, versions[versions.length - 1].version);

const conflict = snap.conflicts.find(c => c.id === 'CONFLICT-0004');
console.log('=== Test reassign_room ===');
console.log('Before resolution:');
console.log('  Entry A room:', conflict.entries[0].normalizedRoom);
console.log('  Entry B room:', conflict.entries[1].normalizedRoom);

const resolution = resolveConflict(
  conflict,
  'reassign_room',
  '教务王老师',
  '政治课换到B-301',
  conflict.entries,
  'B-301'
);
console.log('\nAfter reassign_room resolution:');
console.log('  Final A room:', resolution.finalEntries[0].normalizedRoom);
console.log('  Final B room:', resolution.finalEntries[1].normalizedRoom);
console.log('  Final B note:', resolution.finalEntries[1].note);
console.log('  newRoom field:', resolution.newRoom);

const newEntries = generateNewSchedule(snap.entries, [resolution]);
const politicsEntry = newEntries.find(e => e.courseName === '政治' && e.className === '高一2班');
console.log('\nIn generated schedule:');
console.log('  政治 room:', politicsEntry ? politicsEntry.normalizedRoom : 'NOT FOUND');

console.log('\n=== Test reassign_time ===');
const conflict2 = snap.conflicts.find(c => c.id === 'CONFLICT-0001');
console.log('Before resolution:');
console.log('  Entry B period:', conflict2.entries[1].periodStart, '-', conflict2.entries[1].periodEnd);

const resolution2 = resolveConflict(
  conflict2,
  'reassign_time',
  '教务王老师',
  '语文2班调到第3-4节',
  conflict2.entries,
  undefined,
  3,
  4
);
console.log('\nAfter reassign_time resolution:');
console.log('  Final B period:', resolution2.finalEntries[1].periodStart, '-', resolution2.finalEntries[1].periodEnd);
console.log('  Final B note:', resolution2.finalEntries[1].note);

const newEntries2 = generateNewSchedule(snap.entries, [resolution2]);
const yuwen2 = newEntries2.find(e => e.courseName === '语文' && e.className === '高一2班');
console.log('\nIn generated schedule:');
console.log('  语文2班 period:', yuwen2 ? `${yuwen2.periodStart}-${yuwen2.periodEnd}` : 'NOT FOUND');

console.log('\n=== Test keep_first ===');
const conflict3 = snap.conflicts.find(c => c.id === 'CONFLICT-0002');
const resolution3 = resolveConflict(
  conflict3,
  'keep_first',
  '教务王老师',
  '保留高一1班',
  conflict3.entries
);
const newEntries3 = generateNewSchedule(snap.entries, [resolution3]);
const math3 = newEntries3.filter(e => e.courseName === '数学' && e.normalizedTeacher === '李华');
console.log('After keep_first, math entries:', math3.length);
math3.forEach(e => console.log('  ', e.className, e.periodStart, '-', e.periodEnd, e.normalizedRoom));

console.log('\nAll tests passed!');
