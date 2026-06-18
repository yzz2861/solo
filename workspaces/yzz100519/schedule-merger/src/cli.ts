#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readMultipleSchedules } from './reader';
import { normalizeEntries, loadAliasMap, buildAliasMapFromEntries } from './normalizer';
import { detectAllConflicts } from './detector';
import { reportToConsole, exportReport } from './reporter';
import {
  createBeforeSnapshot,
  createAfterSnapshot,
  resolveConflict,
  listVersions,
  loadSnapshot,
} from './version';
import {
  generateNewSchedule,
  exportScheduleCSV,
  exportScheduleXlsx,
  getClassTimetable,
  formatClassTimetable,
} from './generator';
import {
  queryClassSchedule,
  queryConflictHistory,
  showVersionDiff,
  listAllClasses,
} from './query';
import { Resolution, NormalizedEntry } from './types';

const DEFAULT_OUTPUT = './output';
const DEFAULT_DATA = './data';

const program = new Command();

program
  .name('schedule-merger')
  .description('课表冲突合并器 - 多份课表冲突检测、合并与版本管理')
  .version('1.0.0');

program
  .command('detect')
  .description('检测多份课表中的冲突')
  .option('-c, --class <files...>', '班级课表文件路径')
  .option('-t, --teacher <files...>', '教师课表文件路径')
  .option('-r, --room <files...>', '教室表文件路径')
  .option('-a, --alias <path>', '别名映射文件路径')
  .option('-o, --output <dir>', '输出目录', DEFAULT_OUTPUT)
  .option('--operator <name>', '操作人姓名', '教务管理员')
  .option('--save', '保存冲突检测前版本快照', true)
  .action(async (opts) => {
    try {
      const files: { path: string; type: string }[] = [];

      if (opts.class) {
        for (const f of opts.class) files.push({ path: f, type: 'class_schedule' });
      }
      if (opts.teacher) {
        for (const f of opts.teacher) files.push({ path: f, type: 'teacher_schedule' });
      }
      if (opts.room) {
        for (const f of opts.room) files.push({ path: f, type: 'room_schedule' });
      }

      if (files.length === 0) {
        const dataDir = path.resolve(DEFAULT_DATA);
        const autoFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx'));
        for (const f of autoFiles) {
          const fullPath = path.join(dataDir, f);
          if (f.includes('班级') || f.includes('class')) files.push({ path: fullPath, type: 'class_schedule' });
          else if (f.includes('教师') || f.includes('teacher')) files.push({ path: fullPath, type: 'teacher_schedule' });
          else if (f.includes('教室') || f.includes('room')) files.push({ path: fullPath, type: 'room_schedule' });
          else files.push({ path: fullPath, type: 'class_schedule' });
        }

        if (files.length === 0) {
          console.error(chalk.red('未找到任何课表文件，请通过 -c/-t/-r 指定，或在 ./data 目录下放置文件'));
          process.exit(1);
        }
      }

      console.log(chalk.cyan('📂 读取课表文件...'));
      for (const f of files) {
        console.log(chalk.gray(`   ${f.type}: ${f.path}`));
      }

      const rawEntries = await readMultipleSchedules(files);
      console.log(chalk.cyan(`📊 共读取 ${rawEntries.length} 条课表记录`));

      const aliasMap = loadAliasMap(opts.alias);
      const entries = normalizeEntries(rawEntries, aliasMap);

      const autoAlias = buildAliasMapFromEntries(entries);
      const teacherCount = Object.keys(autoAlias.teachers).length;
      const roomCount = Object.keys(autoAlias.rooms).length;
      console.log(chalk.gray(`   教师归一化: ${teacherCount} 位, 教室归一化: ${roomCount} 间`));

      console.log(chalk.cyan('🔍 检测冲突...'));
      const { report, dedupedEntries } = detectAllConflicts(entries);

      console.log(reportToConsole(report));

      const { mdPath, jsonPath } = exportReport(report, path.resolve(opts.output));
      console.log(chalk.green(`📄 报告已导出:`));
      console.log(chalk.gray(`   Markdown: ${mdPath}`));
      console.log(chalk.gray(`   JSON:     ${jsonPath}`));

      if (opts.save) {
        const snapshot = createBeforeSnapshot(
          path.resolve(opts.output),
          dedupedEntries,
          report.conflicts,
          opts.operator,
          `冲突检测 - ${files.length}份课表`
        );
        console.log(chalk.green(`💾 版本快照已保存: v${snapshot.version}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ 错误: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('resolve')
  .description('交互式解决冲突')
  .option('-o, --output <dir>', '输出目录', DEFAULT_OUTPUT)
  .option('--operator <name>', '操作人姓名', '教务管理员')
  .option('--version <ver>', '基于的版本号（默认最新）')
  .action(async (opts) => {
    try {
      const outputDir = path.resolve(opts.output);
      const versions = listVersions(outputDir);
      if (versions.length === 0) {
        console.error(chalk.red('暂无版本数据，请先运行 detect 命令'));
        process.exit(1);
      }

      const targetVersion = opts.version || versions[versions.length - 1].version;
      const snapshot = loadSnapshot(outputDir, targetVersion);
      if (!snapshot) {
        console.error(chalk.red(`版本 v${targetVersion} 不存在`));
        process.exit(1);
      }

      console.log(chalk.cyan(`📋 版本 v${targetVersion}: ${snapshot.label}`));
      console.log(chalk.cyan(`   共 ${snapshot.conflicts.length} 个冲突待解决`));

      const unresolvedConflicts = snapshot.conflicts.filter(
        c => !snapshot.resolutions.some(r => r.conflictId === c.id)
      );

      if (unresolvedConflicts.length === 0) {
        console.log(chalk.green('🎉 所有冲突已解决！'));
        return;
      }

      const resolutions: Resolution[] = [...snapshot.resolutions];

      for (const conflict of unresolvedConflicts) {
        console.log('');
        console.log(chalk.yellow(`冲突 ${conflict.id}:`));
        console.log(conflict.description);
        console.log(chalk.gray(`建议: ${conflict.suggestion}`));

        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: `如何处理冲突 ${conflict.id}?`,
            choices: [
              { name: '保留第一条', value: 'keep_first' },
              { name: '保留第二条', value: 'keep_second' },
              { name: '两条都保留（加备注）', value: 'keep_both_with_note' },
              { name: '更换教室', value: 'reassign_room' },
              { name: '调整时间', value: 'reassign_time' },
              { name: '手动处理', value: 'manual' },
            ],
          },
          {
            type: 'input',
            name: 'note',
            message: '备注说明:',
            default: '',
          },
        ]);

        const resolution = resolveConflict(
          conflict,
          answers.action as Resolution['action'],
          opts.operator,
          answers.note,
          conflict.entries
        );
        resolutions.push(resolution);

        console.log(chalk.green(`✓ 冲突 ${conflict.id} 已解决 (${answers.action})`));
      }

      const newEntries = generateNewSchedule(snapshot.entries, resolutions);
      const afterSnapshot = createAfterSnapshot(
        outputDir,
        newEntries,
        snapshot.conflicts,
        resolutions,
        opts.operator,
        `冲突解决后 - ${resolutions.length}项`,
        targetVersion
      );

      console.log(chalk.green(`\n💾 已保存新版本: v${afterSnapshot.version}`));
      console.log(chalk.green(`   解决: ${resolutions.length} 项冲突`));
      console.log(chalk.green(`   操作人: ${opts.operator}`));

      const reResult = detectAllConflicts(newEntries);
      if (reResult.report.conflicts.length > 0) {
        console.log(chalk.yellow(`\n⚠ 解决后仍有 ${reResult.report.conflicts.length} 个冲突，建议再次检测`));
      } else {
        console.log(chalk.green('\n🎉 解决后无冲突，可以生成新课表！'));
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ 错误: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('确认后生成新版课表')
  .option('-o, --output <dir>', '输出目录', DEFAULT_OUTPUT)
  .option('--version <ver>', '基于的版本号（默认最新）')
  .option('--format <fmt>', '输出格式: csv, xlsx, both', 'both')
  .action((opts) => {
    try {
      const outputDir = path.resolve(opts.output);
      const versions = listVersions(outputDir);
      if (versions.length === 0) {
        console.error(chalk.red('暂无版本数据，请先运行 detect 命令'));
        process.exit(1);
      }

      const targetVersion = opts.version || versions[versions.length - 1].version;
      const snapshot = loadSnapshot(outputDir, targetVersion);
      if (!snapshot) {
        console.error(chalk.red(`版本 v${targetVersion} 不存在`));
        process.exit(1);
      }

      const unresolved = snapshot.conflicts.filter(
        c => !snapshot.resolutions.some(r => r.conflictId === c.id)
      );
      if (unresolved.length > 0) {
        console.log(chalk.yellow(`⚠ 仍有 ${unresolved.length} 个未解决冲突，建议先运行 resolve 命令`));
        console.log(chalk.yellow('  使用 --force 可强制生成'));
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const baseName = `merged-schedule-v${targetVersion}-${timestamp}`;

      if (opts.format === 'csv' || opts.format === 'both') {
        const csvPath = path.join(outputDir, `${baseName}.csv`);
        exportScheduleCSV(snapshot.entries, csvPath);
        console.log(chalk.green(`📄 CSV课表: ${csvPath}`));
      }

      if (opts.format === 'xlsx' || opts.format === 'both') {
        const xlsxPath = path.join(outputDir, `${baseName}.xlsx`);
        exportScheduleXlsx(snapshot.entries, xlsxPath);
        console.log(chalk.green(`📄 XLSX课表: ${xlsxPath}`));
      }

      console.log(chalk.green(`\n✅ 新版课表已生成 (基于 v${targetVersion})`));
    } catch (err: any) {
      console.error(chalk.red(`❌ 错误: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('class <className>')
  .description('查看指定班级的最终课表')
  .option('-o, --output <dir>', '数据目录', DEFAULT_OUTPUT)
  .action((className, opts) => {
    try {
      const result = queryClassSchedule(path.resolve(opts.output), className);

      if (!result.found) {
        console.log(chalk.yellow(result.message));

        const classes = listAllClasses(path.resolve(opts.output));
        if (classes.length > 0) {
          console.log(chalk.cyan('\n可用班级:'));
          for (const c of classes) {
            console.log(chalk.gray(`  - ${c}`));
          }
        }
        return;
      }

      if (result.snapshot) {
        const view = getClassTimetable(result.snapshot.entries, className);
        console.log(formatClassTimetable(view));
        console.log(chalk.gray(`版本: v${result.version} | 确认人: ${result.snapshot.createdBy} | 时间: ${new Date(result.snapshot.createdAt).toLocaleString('zh-CN')}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ 错误: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('history <conflictId>')
  .description('查看冲突的解决历史')
  .option('-o, --output <dir>', '数据目录', DEFAULT_OUTPUT)
  .action((conflictId, opts) => {
    try {
      const result = queryConflictHistory(path.resolve(opts.output), conflictId);

      if (!result.found) {
        console.log(chalk.yellow(result.message));
        return;
      }

      console.log(chalk.cyan(`冲突 ${conflictId} 历史:`));
      for (const v of result.versions) {
        const conflict = v.conflicts.find(c => c.id === conflictId);
        const resolution = v.resolutions.find(r => r.conflictId === conflictId);

        console.log('');
        console.log(chalk.white(`  v${v.version}: ${v.label}`));
        console.log(chalk.gray(`    操作人: ${v.createdBy} | 时间: ${new Date(v.createdAt).toLocaleString('zh-CN')}`));

        if (conflict) {
          console.log(chalk.yellow(`    冲突状态: 发现`));
          console.log(chalk.gray(`    ${conflict.description.split('\n')[0]}`));
        }

        if (resolution) {
          console.log(chalk.green(`    解决方式: ${resolution.action}`));
          console.log(chalk.green(`    确认人: ${resolution.resolvedBy}`));
          console.log(chalk.gray(`    备注: ${resolution.note}`));
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ 错误: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('diff <fromVersion> <toVersion>')
  .description('对比两个版本的差异')
  .option('-o, --output <dir>', '数据目录', DEFAULT_OUTPUT)
  .action((fromVersion, toVersion, opts) => {
    try {
      const output = showVersionDiff(path.resolve(opts.output), fromVersion, toVersion);
      console.log(output);
    } catch (err: any) {
      console.error(chalk.red(`❌ 错误: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('versions')
  .description('列出所有版本')
  .option('-o, --output <dir>', '数据目录', DEFAULT_OUTPUT)
  .action((opts) => {
    try {
      const versions = listVersions(path.resolve(opts.output));

      if (versions.length === 0) {
        console.log(chalk.yellow('暂无版本数据'));
        return;
      }

      console.log(chalk.cyan('版本列表:'));
      console.log('───────────────────────────────────────');

      for (const v of versions) {
        const resolvedCount = v.resolutions.length;
        const totalConflicts = v.conflicts.length;
        const status = resolvedCount >= totalConflicts && totalConflicts > 0
          ? chalk.green('✓ 已全部解决')
          : totalConflicts > 0
            ? chalk.yellow(`⚑ ${totalConflicts - resolvedCount} 项未解决`)
            : chalk.gray('-');

        console.log(`  v${v.version} | ${v.label}`);
        console.log(`    ${v.createdBy} | ${new Date(v.createdAt).toLocaleString('zh-CN')} | ${status}`);
        console.log(`    条目: ${v.entries.length} | 冲突: ${totalConflicts} | 已解决: ${resolvedCount}`);
        console.log('');
      }
    } catch (err: any) {
      console.error(chalk.red(`❌ 错误: ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
