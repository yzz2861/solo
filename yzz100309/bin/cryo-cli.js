#!/usr/bin/env node

const { Command } = require('commander');
const { runAudit } = require('../src/commands/audit');
const { runMove } = require('../src/commands/move');
const { runReview } = require('../src/commands/review');
const { runExport } = require('../src/commands/export');

const program = new Command();

program
  .name('cryo')
  .description('实验室样本冻存管理 CLI 工具')
  .version('1.0.0');

program
  .command('audit')
  .description('全面审计：检测位置冲突、样本缺失、人员不一致等问题')
  .requiredOption('-i, --inventory <path>', '样本台账 CSV 文件路径')
  .requiredOption('-l, --layout <path>', '冻存盒布局 JSON 文件路径')
  .requiredOption('-m, --movements <path>', '移动记录 CSV 文件路径')
  .option('-t, --type <type>', '问题类型过滤: position-conflict|missing-sample|reviewer-mismatch|duplicate-move|all', 'all')
  .option('--json', '以 JSON 格式输出')
  .action(async (opts) => {
    try {
      const result = await runAudit(opts);
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (err) {
      console.error('审计失败:', err.message);
      process.exit(1);
    }
  });

program
  .command('move')
  .description('处理移动记录：应用移动并检测重复移动')
  .requiredOption('-i, --inventory <path>', '样本台账 CSV 文件路径')
  .requiredOption('-l, --layout <path>', '冻存盒布局 JSON 文件路径')
  .requiredOption('-m, --movements <path>', '移动记录 CSV 文件路径')
  .option('--batch-id <id>', '指定批次 ID，用于去重')
  .option('--dry-run', '只预览不实际应用')
  .option('--json', '以 JSON 格式输出')
  .action(async (opts) => {
    try {
      const result = await runMove(opts);
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (err) {
      console.error('移动处理失败:', err.message);
      process.exit(1);
    }
  });

program
  .command('review')
  .description('复核相关查询：按复核人、状态等筛选')
  .requiredOption('-i, --inventory <path>', '样本台账 CSV 文件路径')
  .requiredOption('-l, --layout <path>', '冻存盒布局 JSON 文件路径')
  .requiredOption('-m, --movements <path>', '移动记录 CSV 文件路径')
  .option('-s, --status <status>', '按状态筛选: stored|moved|reviewed|discarded')
  .option('-r, --reviewer <name>', '按复核人筛选')
  .option('-p, --position <pos>', '按位置筛选，如 A1')
  .option('--sample-id <id>', '按样本编号查询详情')
  .option('--json', '以 JSON 格式输出')
  .action(async (opts) => {
    try {
      const result = await runReview(opts);
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (err) {
      console.error('查询失败:', err.message);
      process.exit(1);
    }
  });

program
  .command('export')
  .description('导出审计报告，保留原始行号和冲突说明')
  .requiredOption('-i, --inventory <path>', '样本台账 CSV 文件路径')
  .requiredOption('-l, --layout <path>', '冻存盒布局 JSON 文件路径')
  .requiredOption('-m, --movements <path>', '移动记录 CSV 文件路径')
  .requiredOption('-o, --output <path>', '输出报告文件路径 (.csv 或 .json)')
  .option('-t, --type <type>', '报告类型: full|conflicts|movements|samples', 'full')
  .option('--include-line-numbers', '包含原始行号 (默认包含)', true)
  .action(async (opts) => {
    try {
      const result = await runExport(opts);
      console.log(`报告已导出到: ${result.outputPath}`);
      console.log(`共 ${result.recordCount} 条记录`);
    } catch (err) {
      console.error('导出失败:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
