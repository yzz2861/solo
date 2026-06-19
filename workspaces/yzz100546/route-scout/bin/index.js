#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const chalk = require('chalk');
const ConfigLoader = require('../src/config/config-loader');
const DeadLinkDetector = require('../src/core/detector');
const HistoryManager = require('../src/core/history-manager');
const ReportGenerator = require('../src/core/report-generator');
const Logger = require('../src/utils/logger');

const program = new Command();

program
  .name('route-scout')
  .description('前端路由死链巡查工具 - 扫描路由、菜单、权限，检测死链、无入口页面、重复路由和外链问题')
  .version('1.0.0');

program
  .option('-c, --config <path>', '配置文件路径', './route-scout.config.json')
  .option('-p, --project-root <path>', '项目根目录，覆盖配置文件中的 projectRoot')
  .option('-f, --format <formats...>', '输出格式: console, json, html (覆盖配置)', [])
  .option('-v, --view <views...>', '报告视角: frontend, test, product (覆盖配置)', [])
  .option('-o, --output <dir>', '报告输出目录 (覆盖配置)')
  .option('--no-history', '不进行历史记录对比')
  .option('--no-save', '不保存本次运行记录')
  .option('--verbose', '显示详细日志')
  .option('--strict', '严格模式，发现任何问题时退出码为 1')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      const config = ConfigLoader.load(configPath);

      if (options.projectRoot) {
        config.projectRoot = path.resolve(options.projectRoot);
      }
      if (options.format.length > 0) {
        config.report.formats = options.format;
      }
      if (options.view.length > 0) {
        config.report.views = options.view;
      }
      if (options.output) {
        config.report.outputDir = path.resolve(options.output);
      }
      if (options.verbose) {
        config.logging.verbose = true;
        config.logging.level = 'verbose';
      }

      const logger = new Logger(config.logging);

      console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║          前端路由死链巡查工具 v1.0.0              ║'));
      console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════╝'));
      logger.info(`项目根目录: ${config.projectRoot}`);
      logger.info(`配置文件: ${configPath}`);

      const detector = new DeadLinkDetector(config);
      const results = await detector.detect();

      let comparison = { isFirstRun: true };
      const historyManager = new HistoryManager(config);

      if (options.history !== false && config.history.enabled) {
        comparison = historyManager.compare(results);
      }

      if (options.save !== false && config.history.enabled) {
        historyManager.save(results);
      }

      const reportGenerator = new ReportGenerator(config);
      reportGenerator.generate(results, comparison);

      const totalIssues = results.summary.issues.total;
      
      logger.section('检测完成');
      if (totalIssues === 0) {
        logger.success('太棒了！没有发现任何问题 🎉');
      } else {
        logger.warn(`共发现 ${totalIssues} 个问题`);
        logger.warn(`  - 严重问题: ${results.summary.issues.error}`);
        logger.warn(`  - 警告问题: ${results.summary.issues.warning}`);
        
        if (comparison && !comparison.isFirstRun) {
          if (comparison.newIssues.length > 0) {
            logger.warn(`  - 相比上次新增: ${comparison.newIssues.length}`);
          }
          if (comparison.fixedIssues.length > 0) {
            logger.success(`  - 相比上次修复: ${comparison.fixedIssues.length}`);
          }
        }
      }

      console.log('\n');
      
      if (options.strict && totalIssues > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red.bold('\n✖ 运行出错:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('init')
  .description('初始化配置文件')
  .option('-f, --force', '覆盖已存在的配置文件')
  .action((options) => {
    const fs = require('fs');
    const targetPath = path.resolve(process.cwd(), 'route-scout.config.json');
    
    if (fs.existsSync(targetPath) && !options.force) {
      console.log(chalk.yellow('⚠ 配置文件已存在，使用 -f 或 --force 覆盖'));
      process.exit(0);
    }

    const defaultConfig = {
      projectRoot: './',
      framework: 'vue',
      route: {
        files: ['src/router/**/*.{js,ts}', 'src/router/index.{js,ts}'],
        dynamicRoutePatterns: [':id', ':[a-z]+Id$'],
        lazyLoadPatterns: ['()\\s*=>\\s*import\\(', 'component:\\s*\\(\\)\\s*=>']
      },
      menu: {
        files: ['src/config/menu.{js,ts,json}'],
        pathKey: ['path', 'route', 'url', 'href'],
        nameKey: ['name', 'title', 'label'],
        permissionKey: ['permission', 'roles', 'auth'],
        childrenKey: ['children', 'subMenu', 'items']
      },
      permission: {
        files: ['src/config/permission.{js,ts,json}'],
        routeKey: ['route', 'path', 'resource'],
        roleKey: ['role', 'roles'],
        adminRoles: ['admin', 'superAdmin', 'root', 'administrator']
      },
      links: {
        scanFiles: ['src/**/*.{vue,js,ts,jsx,tsx}', '!src/**/*.d.ts'],
        linkPatterns: [],
        externalLinkPattern: '^https?://',
        internalLinkBasePath: '/'
      },
      ignore: {
        paths: ['/login', '/404', '/403', '/500', '/redirect'],
        pathPatterns: [],
        files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}', '**/mock/**']
      },
      history: {
        enabled: true,
        file: './.route-scout-history.json',
        maxHistory: 30
      },
      report: {
        outputDir: './reports',
        formats: ['console', 'json', 'html'],
        views: ['frontend', 'test', 'product']
      },
      logging: {
        level: 'info',
        verbose: false
      }
    };

    fs.writeFileSync(targetPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log(chalk.green(`✓ 配置文件已创建: ${targetPath}`));
    console.log(chalk.gray('请根据实际项目结构修改配置文件中的路径'));
  });

program
  .command('history')
  .description('查看历史检测记录')
  .option('-c, --config <path>', '配置文件路径', './route-scout.config.json')
  .option('-n, --number <n>', '显示最近 N 条记录', 10)
  .action((options) => {
    const config = ConfigLoader.load(path.resolve(options.config));
    const historyManager = new HistoryManager(config);
    const history = historyManager.load();
    const stats = historyManager.getHistoryStats();

    if (history.records.length === 0) {
      console.log(chalk.yellow('暂无历史记录'));
      process.exit(0);
    }

    console.log(chalk.cyan.bold('\n═══ 历史检测记录 ═══'));
    if (stats) {
      console.log(chalk.gray(`共运行 ${stats.totalRuns} 次 | 首次: ${stats.firstRun?.slice(0, 10)} | 最近: ${stats.lastRun?.slice(0, 10)}`));
    }
    console.log('');

    const Table = require('cli-table3');
    const table = new Table({
      head: [chalk.cyan('#'), chalk.cyan('运行时间'), chalk.cyan('问题数'), chalk.cyan('变化')],
      style: { head: [], border: [] },
      colWidths: [6, 25, 12, 20]
    });

    const n = Math.min(parseInt(options.number) || 10, history.records.length);
    for (let i = 0; i < n; i++) {
      const record = history.records[i];
      const prev = history.records[i + 1];
      const diff = prev ? record.issues.length - prev.issues.length : '-';
      const diffStr = diff === '-' ? diff : diff > 0 ? chalk.yellow(`+${diff}`) : diff < 0 ? chalk.green(`${diff}`) : chalk.gray('0');
      
      table.push([
        i + 1,
        record.date.replace('T', ' ').slice(0, 19),
        record.issues.length,
        diffStr
      ]);
    }

    console.log(table.toString());
  });

program.parse(process.argv);
