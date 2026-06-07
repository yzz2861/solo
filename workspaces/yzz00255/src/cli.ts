#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readCsv } from './csv-reader';
import { loadConfig } from './config-loader';
import { loadSnapshot } from './snapshot';
import { classifyRecords, generateSummary } from './classifier';
import { writeOutput } from './output-writer';

const program = new Command();

program
  .name('gov-classify')
  .description('政务热线诉求归类CLI工具 - 规则判断、异常解释、处理留痕一体化')
  .version('1.0.0');

program
  .requiredOption('-i, --input <path>', '输入CSV清单文件路径')
  .requiredOption('-r, --rules <path>', '规则配置JSON文件路径')
  .option('-s, --snapshot <path>', '历史快照CSV文件路径', '')
  .requiredOption('-o, --output <path>', '输出目录路径')
  .option('-b, --batch-id <id>', '批次号，默认自动生成')
  .option('--strict', '严格模式，所有异常都标记为异常记录')
  .action(async (options) => {
    try {
      await runClassification(options);
    } catch (error) {
      console.error(chalk.red(`\n错误: ${error instanceof Error ? error.message : '未知错误'}`));
      process.exit(1);
    }
  });

async function runClassification(options: any) {
  const startTime = Date.now();
  const batchId = options.batchId || `BATCH_${new Date().toISOString().replace(/[-:.T]/g, '').slice(0, 14)}`;

  console.log(chalk.blue.bold('\n=== 政务热线诉求归类 CLI ===\n'));
  console.log(chalk.gray(`批次号: ${batchId}`));
  console.log(chalk.gray(`开始时间: ${new Date().toLocaleString('zh-CN')}\n`));

  console.log(chalk.cyan('[1/5] 读取输入文件...'));
  const csvResult = readCsv(options.input);
  console.log(chalk.green(`  ✓ 读取到 ${csvResult.rowCount} 条记录`));
  console.log(chalk.gray(`  列名: ${csvResult.headers.join(', ')}`));

  console.log(chalk.cyan('\n[2/5] 加载规则配置...'));
  const config = loadConfig(options.rules);
  console.log(chalk.green(`  ✓ 加载 ${config.rules.length} 条分类规则`));
  console.log(chalk.gray(`  必填字段: ${config.requiredFields.join(', ')}`));
  console.log(chalk.gray(`  去重字段: ${config.duplicateCheckFields.join(', ')}`));

  console.log(chalk.cyan('\n[3/5] 加载历史快照...'));
  const snapshots = options.snapshot ? loadSnapshot(options.snapshot) : [];
  console.log(chalk.green(`  ✓ 加载 ${snapshots.length} 条历史快照记录`));

  console.log(chalk.cyan('\n[4/5] 执行分类处理...'));
  const result = classifyRecords(csvResult.records, config, snapshots, {
    batchId,
    strictMode: options.strict || false,
  });
  console.log(chalk.green('  ✓ 分类处理完成'));

  const summary = generateSummary(result, batchId);

  console.log(chalk.cyan('\n[5/5] 输出结果文件...'));
  const outputFiles = writeOutput(
    result.normalRecords,
    result.abnormalRecords,
    result.pendingRecords,
    summary,
    options.output
  );
  console.log(chalk.green('  ✓ 输出完成'));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(chalk.blue.bold('\n=== 处理结果汇总 ===\n'));
  console.log(`  总记录数:    ${chalk.white.bold(summary.totalRecords)}`);
  console.log(`  正常记录:    ${chalk.green(summary.normalRecords)}`);
  console.log(`  异常记录:    ${chalk.red(summary.abnormalRecords)}`);
  console.log(`  待复核记录:  ${chalk.yellow(summary.pendingRecords)}`);
  console.log('');
  console.log(`  缺字段:      ${chalk.red(summary.missingFieldCount)}`);
  console.log(`  规则冲突:    ${chalk.yellow(summary.ruleConflictCount)}`);
  console.log(`  重复诉求:    ${chalk.yellow(summary.duplicateCount)}`);
  console.log('');
  console.log(chalk.gray(`  处理耗时: ${duration} 秒`));

  console.log(chalk.blue.bold('\n=== 输出文件 ===\n'));
  console.log(`  正常记录:    ${chalk.green(outputFiles.normal)}`);
  console.log(`  异常记录:    ${chalk.red(outputFiles.abnormal)}`);
  console.log(`  待复核记录:  ${chalk.yellow(outputFiles.pending)}`);
  console.log(`  处理留痕:    ${chalk.blue(outputFiles.traceLog)}`);
  console.log(`  汇总信息:    ${chalk.gray(outputFiles.summary)}`);

  console.log(chalk.green.bold('\n✓ 归类处理完成!\n'));
}

program.parse(process.argv);
