const { Command } = require('commander');
const { processRecords } = require('./processor');

function createProgram() {
  const program = new Command();

  program
    .name('toilet-score')
    .description('公厕保洁评分CLI - 规则判断、异常解释和处理留痕')
    .version('1.0.0');

  program
    .command('score')
    .description('对公厕保洁清单进行评分处理')
    .requiredOption('-i, --input <path>', '输入CSV清单文件路径')
    .requiredOption('-r, --rules <path>', '规则配置JSON文件路径')
    .requiredOption('-o, --output <dir>', '输出目录路径')
    .option('-s, --snapshot <path>', '历史快照文件路径（用于去重和留痕）')
    .option('-d, --dedupe-fields <fields>', '去重字段，逗号分隔（如：toilet_id,check_date）', '')
    .action((options) => {
      try {
        const dedupeFields = options.dedupeFields
          ? options.dedupeFields.split(',').map(f => f.trim()).filter(Boolean)
          : [];

        const result = processRecords({
          inputCsv: options.input,
          rulesFile: options.rules,
          outputDir: options.output,
          snapshotFile: options.snapshot,
          dedupeFields
        });

        printSummary(result.summary);
      } catch (err) {
        console.error('处理失败:', err.message);
        process.exit(1);
      }
    });

  return program;
}

function printSummary(summary) {
  console.log('');
  console.log('========================================');
  console.log('  公厕保洁评分 - 处理结果摘要');
  console.log('========================================');
  console.log('');
  console.log(`  批次号:     ${summary.batchId}`);
  console.log(`  处理时间:   ${summary.processedAt}`);
  console.log(`  源文件:     ${summary.sourceFile}`);
  console.log('');
  console.log(`  总记录数:   ${summary.totalCount}`);
  console.log(`  正常:       ${summary.normalCount}`);
  console.log(`  异常:       ${summary.abnormalCount}`);
  console.log(`  待复核:     ${summary.pendingCount}`);
  console.log('');
  console.log('  输出文件:');
  if (summary.outputFiles.normal) {
    console.log(`    正常记录:  ${summary.outputFiles.normal}`);
  }
  if (summary.outputFiles.abnormal) {
    console.log(`    异常记录:  ${summary.outputFiles.abnormal}`);
  }
  if (summary.outputFiles.pending) {
    console.log(`    待复核:    ${summary.outputFiles.pending}`);
  }
  if (summary.snapshotFile) {
    console.log(`    历史快照:  ${summary.snapshotFile}`);
  }
  console.log('');
  console.log('========================================');
  console.log('');
}

function runCli(argv) {
  const program = createProgram();
  program.parse(argv);
}

module.exports = {
  createProgram,
  runCli,
  printSummary
};
