#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

import { scanDirectory, RawFiles } from './scanner';
import { organizeSubmissions, mergeSimilarAuthors, OrganizationResult } from './organizer';
import { detectAllIssues, collectAllIssues, DetectionResult } from './issueDetector';
import { classifySubmissions, getSubmissionsByStatus } from './classifier';
import { ProcessedSubmission } from './types';
import { filterByDimensions, calculateSizeDistribution, getCommonSizes } from './filter';
import { FilterOptions } from './types';
import { exportResults, exportFilteredResults, exportReplyTemplates } from './exporter';
import { OrganizeOptions, ExportOptions } from './types';
import { formatFileSize, formatDate } from './utils';

const program = new Command();

program
  .name('photo-exhibition-organizer')
  .description('影展投稿整理器 - 扫描投稿目录，按作者和作品整理，检测问题，导出清单')
  .version('1.0.0');

interface ScanCommandOptions {
  output?: string;
  format?: 'csv' | 'xlsx';
  minSize?: number;
  nameThreshold?: number;
  extract?: boolean;
  exhibitionName?: string;
  exportReplies?: boolean;
}

program
  .command('scan <dir>')
  .description('扫描投稿目录并整理所有投稿')
  .option('-o, --output <dir>', '输出目录，默认为 ./output')
  .option('-f, --format <format>', '导出格式: csv 或 xlsx，默认为 xlsx')
  .option('-s, --min-size <mb>', '最低图片像素要求(MP)，默认为 2')
  .option('-n, --name-threshold <threshold>', '作者名相似度阈值，默认为 0.8')
  .option('-e, --extract', '自动解压压缩包')
  .option('--exhibition-name <name>', '影展名称，用于生成回复模板')
  .option('--export-replies', '导出作者回复模板')
  .action(async (dir: string, options: ScanCommandOptions) => {
    const inputDir = path.resolve(dir);
    const outputDir = path.resolve(options.output || './output');
    const format = options.format || 'xlsx';
    const minSize = options.minSize || 2;
    const nameThreshold = options.nameThreshold || 0.8;
    const autoExtract = options.extract || false;
    const exhibitionName = options.exhibitionName || '影展';

    if (!fs.existsSync(inputDir)) {
      console.error(chalk.red(`错误: 目录不存在: ${inputDir}`));
      process.exit(1);
    }

    console.log(chalk.bold('\n🎬 影展投稿整理器\n'));
    console.log(`扫描目录: ${chalk.cyan(inputDir)}`);
    console.log(`输出目录: ${chalk.cyan(outputDir)}`);
    console.log(`导出格式: ${chalk.cyan(format.toUpperCase())}\n`);

    const spinner = ora('正在扫描目录...').start();

    try {
      spinner.text = '正在扫描目录并识别文件...';
      const rawFiles = await scanDirectory(inputDir, autoExtract);
      
      spinner.text = `扫描完成，发现 ${rawFiles.photos.length} 张图片，${rawFiles.documents.length} 个文档，${rawFiles.archives.length} 个压缩包，${rawFiles.cloudLinks.length} 个网盘链接`;
      spinner.succeed();

      const organizeSpinner = ora('正在按作者和作品整理...').start();
      const organizeOptions: OrganizeOptions = {
        minImageSize: minSize,
        nameSimilarityThreshold: nameThreshold,
        autoExtractArchives: autoExtract
      };

      const orgResult = await organizeSubmissions(rawFiles, organizeOptions, inputDir);
      
      const mergedAuthors = mergeSimilarAuthors(orgResult.authors, nameThreshold);
      
      organizeSpinner.text = `整理完成，共 ${mergedAuthors.length} 位作者，${mergedAuthors.reduce((sum, a) => sum + a.works.length, 0)} 个作品`;
      organizeSpinner.succeed();

      const detectSpinner = ora('正在检测问题...').start();
      const detection = detectAllIssues(mergedAuthors, minSize, nameThreshold, rawFiles.issues);
      
      const allIssues = collectAllIssues(detection);
      const errors = allIssues.filter(i => i.severity === 'error').length;
      const warnings = allIssues.filter(i => i.severity === 'warning').length;
      const infos = allIssues.filter(i => i.severity === 'info').length;
      
      detectSpinner.text = `检测完成，发现 ${errors} 个错误，${warnings} 个警告，${infos} 个提示`;
      detectSpinner.succeed();

      const classifySpinner = ora('正在分类投稿...').start();
      const submissions = classifySubmissions(mergedAuthors, detection);
      
      const selected = getSubmissionsByStatus(submissions, 'selected');
      const pending = getSubmissionsByStatus(submissions, 'pending');
      const rejected = getSubmissionsByStatus(submissions, 'rejected');
      
      classifySpinner.text = `分类完成: ${selected.length} 位入围，${pending.length} 位待补，${rejected.length} 位退回`;
      classifySpinner.succeed();

      console.log('\n' + chalk.bold('📊 统计摘要'));
      const statsTable = new Table({
        head: [chalk.cyan('类别'), chalk.cyan('数量')],
        colWidths: [20, 10]
      });
      statsTable.push(
        ['作者总数', mergedAuthors.length.toString()],
        ['作品总数', mergedAuthors.reduce((sum, a) => sum + a.works.length, 0).toString()],
        ['图片总数', mergedAuthors.reduce((sum, a) => sum + a.works.reduce((s, w) => s + w.photos.length, 0), 0).toString()],
        ['入围初筛', selected.length.toString()],
        ['待补材料', pending.length.toString()],
        ['退回', rejected.length.toString()],
        ['错误问题', errors.toString()],
        ['警告问题', warnings.toString()]
      );
      console.log(statsTable.toString());

      console.log('\n' + chalk.bold('📐 尺寸分布'));
      const sizeDist = calculateSizeDistribution(mergedAuthors);
      
      const sizeTable = new Table({
        head: [chalk.cyan('像素范围'), chalk.cyan('数量'), chalk.cyan('占比')],
        colWidths: [15, 8, 10]
      });
      
      const totalPhotos = mergedAuthors.reduce((sum, a) => sum + a.works.reduce((s, w) => s + w.photos.length, 0), 0);
      
      for (const item of sizeDist.byMegapixels) {
        const pct = totalPhotos > 0 ? ((item.count / totalPhotos) * 100).toFixed(1) + '%' : '0%';
        sizeTable.push([item.range, item.count.toString(), pct]);
      }
      console.log(sizeTable.toString());

      console.log('\n' + chalk.bold('🔍 常见尺寸'));
      const commonSizes = getCommonSizes(mergedAuthors, 5);
      const sizeTable2 = new Table({
        head: [chalk.cyan('尺寸'), chalk.cyan('数量'), chalk.cyan('作者')],
        colWidths: [15, 8, 30]
      });
      
      for (const s of commonSizes) {
        sizeTable2.push([s.size, s.count.toString(), s.authors.slice(0, 3).join('、') + (s.authors.length > 3 ? '...' : '')]);
      }
      console.log(sizeTable2.toString());

      const exportSpinner = ora('正在导出结果...').start();
      const exportOptions: ExportOptions = {
        format,
        outputDir,
        includeIssues: true,
        includeMetadata: true
      };

      const exportedFiles = await exportResults(submissions, detection, exportOptions);
      
      if (options.exportReplies) {
        const replyFiles = await exportReplyTemplates(submissions, path.join(outputDir, '回复模板'), exhibitionName);
        exportedFiles.push(...replyFiles);
      }
      
      exportSpinner.text = `导出完成，共生成 ${exportedFiles.length} 个文件`;
      exportSpinner.succeed();

      console.log('\n' + chalk.bold('📁 导出文件:'));
      for (const file of exportedFiles) {
        console.log(`  ${chalk.green('✓')} ${path.relative(process.cwd(), file)}`);
      }

      console.log('\n' + chalk.bold('⚠️  需要注意的问题:'));
      
      if (rawFiles.archives.length > 0) {
        console.log(`  ${chalk.yellow('!')} 发现 ${rawFiles.archives.length} 个压缩包，请手动检查内容:`);
        for (const arc of rawFiles.archives) {
          console.log(`    - ${path.basename(arc.filePath)}`);
          if (arc.extractedPath) {
            console.log(`      已解压到: ${path.relative(process.cwd(), arc.extractedPath)}`);
          }
        }
      }
      
      if (rawFiles.cloudLinks.length > 0) {
        console.log(`  ${chalk.yellow('!')} 发现 ${rawFiles.cloudLinks.length} 个网盘链接，请手动下载检查:`);
        for (const link of rawFiles.cloudLinks) {
          console.log(`    - [${link.platform}] ${link.url}`);
        }
      }

      if (rawFiles.unclassified.length > 0) {
        console.log(`  ${chalk.gray('?')} 有 ${rawFiles.unclassified.length} 个文件无法识别:`);
        for (const f of rawFiles.unclassified.slice(0, 5)) {
          console.log(`    - ${path.basename(f)}`);
        }
        if (rawFiles.unclassified.length > 5) {
          console.log(`    ... 还有 ${rawFiles.unclassified.length - 5} 个文件`);
        }
      }

      console.log('\n' + chalk.bold.green('✅ 处理完成！\n'));

    } catch (error) {
      spinner.fail('处理失败');
      console.error(chalk.red(`错误: ${error}`));
      process.exit(1);
    }
  });

interface FilterCommandOptions extends ScanCommandOptions {
  minWidth?: number;
  minHeight?: number;
  minMp?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: string;
  orientation?: 'landscape' | 'portrait' | 'square';
}

program
  .command('filter <dir>')
  .description('按尺寸筛选作品（布展前使用）')
  .option('-o, --output <dir>', '输出目录，默认为 ./output')
  .option('--min-width <px>', '最小宽度(像素)')
  .option('--min-height <px>', '最小高度(像素)')
  .option('--min-mp <mp>', '最小像素(MP)')
  .option('--max-width <px>', '最大宽度(像素)')
  .option('--max-height <px>', '最大高度(像素)')
  .option('--aspect-ratio <ratio>', '宽高比，如 3:2')
  .option('--orientation <ori>', '拍摄方向: landscape/portrait/square')
  .option('-s, --min-size <mb>', '最低图片像素要求(MP)，默认为 2')
  .option('-n, --name-threshold <threshold>', '作者名相似度阈值，默认为 0.8')
  .option('-e, --extract', '自动解压压缩包')
  .action(async (dir: string, options: FilterCommandOptions) => {
    const inputDir = path.resolve(dir);
    const outputDir = path.resolve(options.output || './output');

    if (!fs.existsSync(inputDir)) {
      console.error(chalk.red(`错误: 目录不存在: ${inputDir}`));
      process.exit(1);
    }

    const filterOptions: FilterOptions = {
      minWidth: options.minWidth ? parseInt(options.minWidth as any) : undefined,
      minHeight: options.minHeight ? parseInt(options.minHeight as any) : undefined,
      minMegapixels: options.minMp ? parseFloat(options.minMp as any) : undefined,
      maxWidth: options.maxWidth ? parseInt(options.maxWidth as any) : undefined,
      maxHeight: options.maxHeight ? parseInt(options.maxHeight as any) : undefined,
      aspectRatio: options.aspectRatio,
      orientation: options.orientation
    };

    console.log(chalk.bold('\n🔍 布展尺寸筛选\n'));
    console.log(`扫描目录: ${chalk.cyan(inputDir)}`);
    console.log('筛选条件:');
    if (filterOptions.minWidth) console.log(`  最小宽度: ${chalk.cyan(filterOptions.minWidth)}px`);
    if (filterOptions.minHeight) console.log(`  最小高度: ${chalk.cyan(filterOptions.minHeight)}px`);
    if (filterOptions.minMegapixels) console.log(`  最小像素: ${chalk.cyan(filterOptions.minMegapixels)}MP`);
    if (filterOptions.maxWidth) console.log(`  最大宽度: ${chalk.cyan(filterOptions.maxWidth)}px`);
    if (filterOptions.maxHeight) console.log(`  最大高度: ${chalk.cyan(filterOptions.maxHeight)}px`);
    if (filterOptions.aspectRatio) console.log(`  宽高比: ${chalk.cyan(filterOptions.aspectRatio)}`);
    if (filterOptions.orientation) console.log(`  拍摄方向: ${chalk.cyan(filterOptions.orientation)}`);
    console.log('');

    const spinner = ora('正在处理中...').start();

    try {
      spinner.text = '正在扫描目录...';
      const rawFiles = await scanDirectory(inputDir, options.extract || false);

      spinner.text = '正在整理...';
      const organizeOptions: OrganizeOptions = {
        minImageSize: options.minSize || 2,
        nameSimilarityThreshold: options.nameThreshold || 0.8,
        autoExtractArchives: options.extract || false
      };
      const orgResult = await organizeSubmissions(rawFiles, organizeOptions, inputDir);
      const mergedAuthors = mergeSimilarAuthors(orgResult.authors, options.nameThreshold || 0.8);

      spinner.text = '正在筛选...';
      const filtered = filterByDimensions(mergedAuthors, filterOptions);

      spinner.succeed(`筛选完成，共 ${filtered.length} 位作者的 ${filtered.reduce((s, f) => s + f.matchedPhotos, 0)} 张图片符合条件`);

      console.log('\n' + chalk.bold('📋 筛选结果:'));
      
      for (const result of filtered) {
        console.log(`\n${chalk.bold(result.author.name)}`);
        console.log(`  匹配 ${result.matchedPhotos}/${result.totalPhotos} 张图片`);
        
        for (const fw of result.works) {
          console.log(`  - 《${fw.work.title}》:`);
          for (const photo of fw.photos) {
            console.log(`    • ${photo.originalName} (${photo.metadata.width}x${photo.metadata.height}, ${photo.metadata.megapixels}MP, ${formatDate(photo.metadata.takenAt)})`);
          }
        }
      }

      const exportOptions: ExportOptions = {
        format: 'csv',
        outputDir,
        includeIssues: false,
        includeMetadata: true
      };

      const exported = await exportFilteredResults(filtered, exportOptions);
      
      if (exported) {
        console.log(`\n${chalk.green('✓')} 筛选结果已导出: ${path.relative(process.cwd(), exported)}`);
      }

      console.log('\n' + chalk.bold.green('✅ 筛选完成！\n'));

    } catch (error) {
      spinner.fail('处理失败');
      console.error(chalk.red(`错误: ${error}`));
      process.exit(1);
    }
  });

program
  .command('list <dir>')
  .description('列出扫描结果概览')
  .option('-s, --min-size <mb>', '最低图片像素要求(MP)，默认为 2')
  .option('-n, --name-threshold <threshold>', '作者名相似度阈值，默认为 0.8')
  .option('-e, --extract', '自动解压压缩包')
  .action(async (dir: string, options: ScanCommandOptions) => {
    const inputDir = path.resolve(dir);

    if (!fs.existsSync(inputDir)) {
      console.error(chalk.red(`错误: 目录不存在: ${inputDir}`));
      process.exit(1);
    }

    const spinner = ora('正在扫描...').start();

    try {
      const rawFiles = await scanDirectory(inputDir, options.extract || false);

      const organizeOptions: OrganizeOptions = {
        minImageSize: options.minSize || 2,
        nameSimilarityThreshold: options.nameThreshold || 0.8,
        autoExtractArchives: options.extract || false
      };
      const orgResult = await organizeSubmissions(rawFiles, organizeOptions, inputDir);
      const mergedAuthors = mergeSimilarAuthors(orgResult.authors, options.nameThreshold || 0.8);

      const detection = detectAllIssues(mergedAuthors, options.minSize || 2, options.nameThreshold || 0.8, rawFiles.issues);
      const submissions = classifySubmissions(mergedAuthors, detection);

      spinner.succeed('扫描完成');

      console.log('\n' + chalk.bold('📋 投稿概览\n'));

      for (const submission of submissions) {
        const statusColor = submission.status === 'selected' ? chalk.green :
                         submission.status === 'pending' ? chalk.yellow : chalk.red;
        const statusText = submission.status === 'selected' ? '✓ 入围' :
                        submission.status === 'pending' ? '⚠ 待补' : '✗ 退回';
        
        console.log(`${statusColor(statusText)} ${chalk.bold(submission.author.name)}`);
        
        if (submission.author.nameVariants.length > 1) {
          console.log(`   别名: ${submission.author.nameVariants.join('、')}`);
        }
        
        if (submission.author.email) console.log(`   邮箱: ${submission.author.email}`);
        if (submission.author.phone) console.log(`   电话: ${submission.author.phone}`);
        
        console.log(`   作品: ${submission.author.works.length} 个`);
        for (const work of submission.author.works) {
          const hasStatement = work.statement ? '✓' : '✗';
          console.log(`     - 《${work.title}》 (${work.photos.length}张, 说明:${hasStatement})`);
          for (const photo of work.photos) {
            const sizeColor = photo.metadata.megapixels < (options.minSize || 2) ? chalk.red : chalk.gray;
            console.log(`       ${sizeColor(photo.originalName)} ${sizeColor(`${photo.metadata.width}x${photo.metadata.height} (${photo.metadata.megapixels}MP)`)}`);
          }
        }
        
        if (submission.reasons.length > 0) {
          console.log(`   问题:`);
          for (const reason of submission.reasons.slice(0, 5)) {
            console.log(`     ${reason}`);
          }
          if (submission.reasons.length > 5) {
            console.log(`     ... 还有 ${submission.reasons.length - 5} 个问题`);
          }
        }
        console.log('');
      }

    } catch (error) {
      spinner.fail('处理失败');
      console.error(chalk.red(`错误: ${error}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

if (process.argv.length < 3) {
  program.outputHelp();
}
