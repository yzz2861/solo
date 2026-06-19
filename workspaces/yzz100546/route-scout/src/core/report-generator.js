const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');
const FileUtils = require('../utils/file-utils');
const Logger = require('../utils/logger');

class ReportGenerator {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
  }

  generate(results, comparison) {
    this.logger.section('生成报告');
    
    const reports = {};

    if (this.config.report.views.includes('frontend')) {
      reports.frontend = this._buildFrontendView(results, comparison);
    }
    if (this.config.report.views.includes('test')) {
      reports.test = this._buildTestView(results, comparison);
    }
    if (this.config.report.views.includes('product')) {
      reports.product = this._buildProductView(results, comparison);
    }

    this.config.report.formats.forEach(format => {
      if (format === 'console') {
        this._outputConsole(reports, comparison);
      }
      if (format === 'json') {
        this._outputJson(reports, results, comparison);
      }
      if (format === 'html') {
        this._outputHtml(reports, results, comparison);
      }
    });

    return reports;
  }

  _buildFrontendView(results, comparison) {
    return {
      title: '前端开发视角报告',
      summary: {
        ...results.summary,
        comparison: comparison && !comparison.isFirstRun ? {
          newIssues: comparison.newIssues.length,
          fixedIssues: comparison.fixedIssues.length
        } : null
      },
      sections: [
        {
          name: '代码死链接 (严重)',
          key: 'deadLinks',
          items: results.deadLinks,
          description: '代码中跳转到不存在路径的链接'
        },
        {
          name: '重复路由定义 (严重)',
          key: 'duplicateRoutes',
          items: results.duplicateRoutes,
          description: '同一路径被多次定义'
        },
        {
          name: '外链格式问题',
          key: 'externalLinkIssues',
          items: results.externalLinkIssues,
          description: '外链协议、字符、格式问题'
        },
        {
          name: '无入口页面',
          key: 'orphanPages',
          items: results.orphanPages,
          description: '有路由定义但无法通过正常途径访问的页面'
        },
        {
          name: '无效权限配置',
          key: 'invalidPermissions',
          items: results.invalidPermissions,
          description: '权限配置指向不存在的路由'
        },
        {
          name: '旧菜单保留项',
          key: 'legacyMenuItems',
          items: results.legacyMenuItems,
          description: '菜单配置指向不存在的路由，可能是历史遗留'
        },
        {
          name: '动态路由列表',
          key: 'dynamicRoutes',
          items: results.dynamicRoutes,
          description: '带参数的动态路由，需要特别注意匹配'
        },
        {
          name: '懒加载路由列表',
          key: 'lazyLoadedRoutes',
          items: results.lazyLoadedRoutes,
          description: '使用懒加载的路由组件'
        }
      ]
    };
  }

  _buildTestView(results, comparison) {
    const adminOnlyPaths = new Set(results.adminOnlyRoutes.map(r => r.path));
    
    const realDeadLinks = results.deadLinks.filter(d => !adminOnlyPaths.has(d.path));
    const adminOnlyDeadLinks = results.deadLinks.filter(d => adminOnlyPaths.has(d.path));

    const realOrphanPages = results.orphanPages.filter(p => !adminOnlyPaths.has(p.path));
    const adminOnlyOrphans = results.orphanPages.filter(p => adminOnlyPaths.has(p.path));

    const realLegacyItems = results.legacyMenuItems.filter(m => !adminOnlyPaths.has(m.path));
    const adminOnlyLegacy = results.legacyMenuItems.filter(m => adminOnlyPaths.has(m.path));

    return {
      title: '测试视角报告',
      summary: {
        totalIssues: results.summary.issues.total,
        realDeadLinks: realDeadLinks.length,
        adminOnlyDeadLinks: adminOnlyDeadLinks.length,
        realOrphanPages: realOrphanPages.length,
        adminOnlyOrphans: adminOnlyOrphans.length,
        realLegacyItems: realLegacyItems.length,
        adminOnlyLegacy: adminOnlyLegacy.length,
        duplicateRoutes: results.duplicateRoutes.length,
        externalLinkIssues: results.externalLinkIssues.length,
        invalidPermissions: results.invalidPermissions.length,
        comparison: comparison && !comparison.isFirstRun ? {
          newIssues: comparison.newIssues.length,
          fixedIssues: comparison.fixedIssues.length
        } : null
      },
      sections: [
        {
          name: '真实死链接 (需优先处理)',
          key: 'realDeadLinks',
          items: realDeadLinks,
          description: '普通用户也会遇到的死链接',
          priority: 'high'
        },
        {
          name: '重复路由 (需优先处理)',
          key: 'duplicateRoutes',
          items: results.duplicateRoutes,
          description: '同一路径被多次定义，可能导致非预期行为',
          priority: 'high'
        },
        {
          name: '外链格式问题',
          key: 'externalLinkIssues',
          items: results.externalLinkIssues,
          description: '外链可能无法正常打开',
          priority: 'medium'
        },
        {
          name: '无效权限配置',
          key: 'invalidPermissions',
          items: results.invalidPermissions,
          description: '权限配置指向不存在的路由',
          priority: 'medium'
        },
        {
          name: '真实无入口页面',
          key: 'realOrphanPages',
          items: realOrphanPages,
          description: '普通用户无法通过正常途径访问的页面',
          priority: 'medium'
        },
        {
          name: '真实旧菜单残留',
          key: 'realLegacyItems',
          items: realLegacyItems,
          description: '普通用户可见的旧菜单残留项',
          priority: 'medium'
        },
        {
          name: '仅管理员可见问题 (可能是正常)',
          key: 'adminOnlyIssues',
          items: [
            ...adminOnlyDeadLinks.map(i => ({ ...i, issueType: '死链接' })),
            ...adminOnlyOrphans.map(i => ({ ...i, issueType: '无入口页面' })),
            ...adminOnlyLegacy.map(i => ({ ...i, issueType: '旧菜单残留' }))
          ],
          description: '这些路径仅管理员可见，可能是有意保留的功能入口，请与产品确认',
          priority: 'low',
          isAdminOnly: true
        },
        {
          name: '仅管理员可见路由列表',
          key: 'adminOnlyRoutes',
          items: results.adminOnlyRoutes,
          description: '仅供参考的管理员专属路由',
          priority: 'low',
          isAdminOnly: true
        }
      ]
    };
  }

  _buildProductView(results, comparison) {
    return {
      title: '产品经理视角报告',
      summary: {
        totalPages: results.summary.totalRoutes,
        pagesWithEntry: results.summary.totalRoutes - results.orphanPages.length,
        orphanPages: results.orphanPages.length,
        menuItems: results.summary.totalMenus,
        legacyMenuItems: results.legacyMenuItems.length,
        comparison: comparison && !comparison.isFirstRun ? {
          newIssues: comparison.newIssues.length,
          fixedIssues: comparison.fixedIssues.length
        } : null
      },
      sections: [
        {
          name: '无入口页面 (重点关注)',
          key: 'orphanPages',
          items: results.orphanPages,
          description: '这些页面存在路由但用户无法通过菜单或导航访问，可能是功能漏配或已废弃'
        },
        {
          name: '旧菜单残留项',
          key: 'legacyMenuItems',
          items: results.legacyMenuItems,
          description: '菜单配置中指向不存在路由的项，可能是已下线功能未清理'
        },
        {
          name: '路由总览',
          key: 'allRoutes',
          items: results.adminOnlyRoutes.length > 0 ? [
            { category: '普通页面', count: results.summary.totalRoutes - results.adminOnlyRoutes.length },
            { category: '管理员专属页面', count: results.adminOnlyRoutes.length },
            { category: '带参数动态路由', count: results.dynamicRoutes.length },
            { category: '懒加载页面', count: results.lazyLoadedRoutes.length }
          ] : [],
          description: '页面构成统计'
        }
      ]
    };
  }

  _outputConsole(reports, comparison) {
    console.log('\n');
    
    if (comparison && !comparison.isFirstRun) {
      this._printComparisonHeader(comparison);
    }

    Object.keys(reports).forEach(view => {
      this._printConsoleView(view, reports[view]);
    });
  }

  _printComparisonHeader(comparison) {
    const table = new Table({
      head: [chalk.cyan('对比维度'), chalk.cyan('数量')],
      style: { head: [], border: [] },
      colWidths: [40, 20]
    });
    
    table.push(
      ['上次运行时间', comparison.previousDate?.replace('T', ' ').slice(0, 19) || '-'],
      ['本次运行时间', comparison.currentDate?.replace('T', ' ').slice(0, 19) || '-'],
      [chalk.yellow('新增问题'), chalk.yellow.bold(`+${comparison.newIssues.length}`)],
      [chalk.green('已修复问题'), chalk.green.bold(`-${comparison.fixedIssues.length}`)],
      [chalk.gray('遗留问题'), chalk.gray.bold(`${comparison.unchangedIssues.length}`)]
    );
    
    console.log(table.toString());
    
    if (comparison.newIssues.length > 0) {
      console.log('\n' + chalk.yellow.bold('⚠ 新增问题列表:'));
      comparison.newIssues.slice(0, 10).forEach(issue => {
        console.log(chalk.yellow(`  + ${this._formatIssueSignature(issue)}`));
      });
      if (comparison.newIssues.length > 10) {
        console.log(chalk.yellow(`  ... 还有 ${comparison.newIssues.length - 10} 个新增问题`));
      }
    }
    
    if (comparison.fixedIssues.length > 0) {
      console.log('\n' + chalk.green.bold('✓ 已修复问题列表:'));
      comparison.fixedIssues.slice(0, 10).forEach(issue => {
        console.log(chalk.green(`  - ${this._formatIssueSignature(issue)}`));
      });
      if (comparison.fixedIssues.length > 10) {
        console.log(chalk.green(`  ... 还有 ${comparison.fixedIssues.length - 10} 个已修复问题`));
      }
    }
  }

  _formatIssueSignature(issue) {
    const typeMap = {
      'deadLink': '死链接',
      'orphanPage': '无入口页面',
      'duplicateRoute': '重复路由',
      'invalidPermission': '无效权限',
      'externalLinkIssue': '外链问题',
      'legacyMenuItem': '旧菜单'
    };
    return `[${typeMap[issue.type] || issue.type}] ${issue.path} (${issue.sourceFile}:${issue.line})`;
  }

  _printConsoleView(viewName, view) {
    const titleMap = {
      frontend: '前端开发视角',
      test: '测试视角',
      product: '产品经理视角'
    };

    console.log('\n');
    console.log(chalk.bold.cyan('▓'.repeat(60)));
    console.log(chalk.bold.cyan(`  ${titleMap[viewName] || viewName}`));
    console.log(chalk.bold.cyan('▓'.repeat(60)));

    this._printConsoleSummary(view.summary, viewName);

    view.sections.forEach(section => {
      if (!section.items || section.items.length === 0) {
        console.log('\n' + chalk.gray(`  ${section.name}: 无问题 ✓`));
        return;
      }

      const icon = section.priority === 'high' ? chalk.red('✖') 
        : section.priority === 'medium' ? chalk.yellow('⚠') 
        : section.isAdminOnly ? chalk.magenta('👤')
        : chalk.blue('ℹ');

      console.log(`\n${icon} ${chalk.bold(section.name)} (${section.items.length})`);
      console.log(chalk.gray(`  ${section.description}`));

      if (viewName === 'product' && section.key === 'allRoutes') {
        this._printStatsTable(section.items);
      } else {
        this._printIssuesTable(section.items, section.isAdminOnly);
      }
    });
  }

  _printConsoleSummary(summary, viewName) {
    console.log('');
    const table = new Table({
      style: { head: [], border: [] },
      colWidths: [30, 30]
    });

    if (viewName === 'frontend') {
      table.push(
        [chalk.gray('总路由数'), summary.totalRoutes],
        [chalk.gray('总菜单项'), summary.totalMenus],
        [chalk.gray('权限配置数'), summary.totalPermissions],
        [chalk.gray('代码链接数'), summary.totalCodeLinks],
        [chalk.gray('动态路由'), summary.dynamicRoutes],
        [chalk.gray('懒加载路由'), summary.lazyLoadedRoutes],
        [chalk.gray('管理员路由'), summary.adminOnlyRoutes],
        [chalk.red.bold('严重问题'), summary.issues.error],
        [chalk.yellow.bold('警告问题'), summary.issues.warning],
        [chalk.bold('问题总计'), chalk.bold(summary.issues.total)]
      );
    } else if (viewName === 'test') {
      table.push(
        [chalk.red.bold('真实死链接'), summary.realDeadLinks],
        [chalk.red.bold('重复路由'), summary.duplicateRoutes],
        [chalk.yellow.bold('外链格式问题'), summary.externalLinkIssues],
        [chalk.yellow.bold('无效权限配置'), summary.invalidPermissions],
        [chalk.yellow.bold('真实无入口页面'), summary.realOrphanPages],
        [chalk.yellow.bold('真实旧菜单残留'), summary.realLegacyItems],
        [chalk.magenta('管理员专属-死链'), summary.adminOnlyDeadLinks],
        [chalk.magenta('管理员专属-无入口'), summary.adminOnlyOrphans],
        [chalk.magenta('管理员专属-旧菜单'), summary.adminOnlyLegacy],
        [chalk.bold('问题总计'), chalk.bold(summary.totalIssues)]
      );
    } else if (viewName === 'product') {
      table.push(
        [chalk.gray('页面总数'), summary.totalPages],
        [chalk.green('有正常入口'), summary.pagesWithEntry],
        [chalk.yellow.bold('无入口页面'), summary.orphanPages],
        [chalk.gray('菜单项总数'), summary.menuItems],
        [chalk.yellow('旧菜单残留'), summary.legacyMenuItems]
      );
    }

    if (summary.comparison) {
      table.push(
        [chalk.yellow('相比上次新增'), `+${summary.comparison.newIssues}`],
        [chalk.green('相比上次修复'), `-${summary.comparison.fixedIssues}`]
      );
    }

    console.log(table.toString());
  }

  _printIssuesTable(items, isAdminOnly) {
    const displayItems = items.slice(0, 20);
    const color = isAdminOnly ? chalk.magenta : chalk.white;

    displayItems.forEach((item, idx) => {
      const prefix = `    ${String(idx + 1).padStart(2, ' ')}. `;
      const pathStr = item.path || item.route || item.name || 'unknown';
      const location = item.sourceFile ? `@ ${item.sourceFile}${item.line ? ':' + item.line : ''}` : '';
      
      console.log(color(prefix + pathStr));
      if (item.description && item.description !== pathStr) {
        console.log(chalk.gray(`        ${item.description}`));
      }
      if (location) {
        console.log(chalk.gray(`        ${location}`));
      }
      if (item.roles && item.roles.length > 0) {
        console.log(chalk.magenta(`        权限角色: ${item.roles.join(', ')}`));
      }
      if (item.issues) {
        item.issues.forEach(issue => {
          console.log(chalk.yellow(`        · ${issue}`));
        });
      }
      if (item.occurrences) {
        item.occurrences.forEach(occ => {
          console.log(chalk.gray(`        · ${occ.sourceFile}:${occ.line} ${occ.name || occ.component || ''}`));
        });
      }
    });

    if (items.length > 20) {
      console.log(chalk.gray(`    ... 还有 ${items.length - 20} 项，请查看完整报告`));
    }
  }

  _printStatsTable(items) {
    const table = new Table({
      head: [chalk.cyan('类别'), chalk.cyan('数量')],
      style: { head: [], border: [] },
      colWidths: [30, 20]
    });
    items.forEach(item => {
      table.push([item.category, item.count]);
    });
    console.log(table.toString());
  }

  _outputJson(reports, rawResults, comparison) {
    FileUtils.ensureDir(this.config.report.outputDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const output = {
      generatedAt: new Date().toISOString(),
      comparison: comparison,
      rawResults: {
        summary: rawResults.summary,
        dynamicRoutes: rawResults.dynamicRoutes,
        lazyLoadedRoutes: rawResults.lazyLoadedRoutes,
        adminOnlyRoutes: rawResults.adminOnlyRoutes
      },
      views: reports
    };

    Object.keys(reports).forEach(view => {
      const filename = `route-scout-${view}-${timestamp}.json`;
      const filepath = path.join(this.config.report.outputDir, filename);
      FileUtils.writeFile(filepath, JSON.stringify({ ...output, view: reports[view] }, null, 2));
      this.logger.info(`${view} JSON报告已保存: ${filepath}`);
    });

    const allFilename = `route-scout-full-${timestamp}.json`;
    const allFilepath = path.join(this.config.report.outputDir, allFilename);
    FileUtils.writeFile(allFilepath, JSON.stringify(output, null, 2));
    this.logger.info(`完整JSON报告已保存: ${allFilepath}`);
  }

  _outputHtml(reports, rawResults, comparison) {
    FileUtils.ensureDir(this.config.report.outputDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const html = this._buildHtmlReport(reports, rawResults, comparison);
    
    const filepath = path.join(this.config.report.outputDir, `route-scout-report-${timestamp}.html`);
    FileUtils.writeFile(filepath, html);
    this.logger.info(`HTML报告已保存: ${filepath}`);
  }

  _buildHtmlReport(reports, rawResults, comparison) {
    const sections = Object.keys(reports).map(view => {
      const viewData = reports[view];
      const titleMap = { frontend: '前端开发视角', test: '测试视角', product: '产品经理视角' };
      
      const sectionHtml = viewData.sections.map(sec => {
        if (!sec.items || sec.items.length === 0) {
          return `
            <div class="section-card success">
              <h3>${sec.name} <span class="badge success">0</span></h3>
              <p class="section-desc">${sec.description}</p>
              <div class="empty-state">✓ 无问题</div>
            </div>`;
        }
        
        const priorityClass = sec.priority === 'high' ? 'error' : sec.priority === 'medium' ? 'warning' : sec.isAdminOnly ? 'admin' : 'info';
        
        const itemsHtml = sec.items.slice(0, 50).map((item, idx) => {
          const pathStr = item.path || item.route || item.name || 'unknown';
          const location = item.sourceFile ? `<span class="location">${item.sourceFile}${item.line ? ':' + item.line : ''}</span>` : '';
          const desc = item.description && item.description !== pathStr ? `<div class="item-desc">${item.description}</div>` : '';
          const roles = item.roles ? `<div class="item-roles">权限: ${item.roles.join(', ')}</div>` : '';
          const count = item.count !== undefined ? `<span class="item-count">${item.count}</span>` : '';
          const category = item.category ? `<span class="item-category">${item.category}</span>` : '';
          
          return `
            <div class="issue-item">
              <div class="issue-header">
                <span class="issue-idx">${idx + 1}.</span>
                <span class="issue-path">${category || pathStr}</span>
                ${count}
              </div>
              ${desc}
              ${roles}
              ${location}
            </div>`;
        }).join('');

        return `
          <div class="section-card ${priorityClass}">
            <h3>${sec.name} <span class="badge ${priorityClass}">${sec.items.length}</span></h3>
            <p class="section-desc">${sec.description}</p>
            <div class="issues-list">${itemsHtml}</div>
            ${sec.items.length > 50 ? `<p class="more-hint">还有 ${sec.items.length - 50} 项未显示，请查看 JSON 报告</p>` : ''}
          </div>`;
      }).join('');

      return `
        <div class="view-section" id="view-${view}">
          <h2>${titleMap[view] || view}</h2>
          ${sectionHtml}
        </div>`;
    }).join('');

    const comparisonHtml = comparison && !comparison.isFirstRun ? `
      <div class="comparison-bar">
        <div class="comparison-item new">
          <span class="label">新增问题</span>
          <span class="value">+${comparison.newIssues.length}</span>
        </div>
        <div class="comparison-item fixed">
          <span class="label">已修复</span>
          <span class="value">-${comparison.fixedIssues.length}</span>
        </div>
        <div class="comparison-item remaining">
          <span class="label">遗留</span>
          <span class="value">${comparison.unchangedIssues.length}</span>
        </div>
        <div class="comparison-time">
          ${comparison.previousDate?.slice(0, 10)} → ${comparison.currentDate?.slice(0, 10)}
        </div>
      </div>` : '';

    const navHtml = Object.keys(reports).map(view => {
      const titleMap = { frontend: '前端开发', test: '测试', product: '产品经理' };
      return `<a href="#view-${view}" class="nav-tab">${titleMap[view] || view}</a>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>前端路由死链巡查报告</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f5f7fa; color: #303133; line-height: 1.6; }
  .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 24px; margin-bottom: 8px; }
  .header .time { opacity: 0.85; font-size: 14px; }
  .comparison-bar { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; display: flex; gap: 24px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .comparison-item { display: flex; flex-direction: column; align-items: center; padding: 0 20px; border-right: 1px solid #ebeef5; }
  .comparison-item:last-of-type { border-right: none; }
  .comparison-item .label { font-size: 12px; color: #909399; }
  .comparison-item .value { font-size: 24px; font-weight: bold; margin-top: 4px; }
  .comparison-item.new .value { color: #e6a23c; }
  .comparison-item.fixed .value { color: #67c23a; }
  .comparison-item.remaining .value { color: #909399; }
  .comparison-time { margin-left: auto; color: #909399; font-size: 13px; }
  .nav-tabs { display: flex; gap: 8px; margin-bottom: 20px; background: white; padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .nav-tab { flex: 1; text-align: center; padding: 12px; text-decoration: none; color: #606266; border-radius: 6px; transition: all 0.2s; }
  .nav-tab:hover { background: #f5f7fa; color: #667eea; }
  .view-section { background: white; border-radius: 8px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .view-section h2 { font-size: 20px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #ebeef5; color: #303133; }
  .section-card { padding: 20px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #dcdfe6; background: #fafbfc; }
  .section-card.error { border-left-color: #f56c6c; background: #fef0f0; }
  .section-card.warning { border-left-color: #e6a23c; background: #fdf6ec; }
  .section-card.info { border-left-color: #409eff; background: #ecf5ff; }
  .section-card.success { border-left-color: #67c23a; background: #f0f9eb; }
  .section-card.admin { border-left-color: #909399; background: #f4f4f5; }
  .section-card h3 { font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
  .section-desc { color: #909399; font-size: 13px; margin-bottom: 16px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
  .badge.error { background: #f56c6c; color: white; }
  .badge.warning { background: #e6a23c; color: white; }
  .badge.info { background: #409eff; color: white; }
  .badge.success { background: #67c23a; color: white; }
  .badge.admin { background: #909399; color: white; }
  .empty-state { text-align: center; padding: 20px; color: #67c23a; font-size: 14px; }
  .issues-list { display: flex; flex-direction: column; gap: 10px; }
  .issue-item { background: white; padding: 12px 16px; border-radius: 6px; border: 1px solid #ebeef5; }
  .issue-header { display: flex; align-items: center; gap: 8px; }
  .issue-idx { color: #909399; font-size: 13px; min-width: 24px; }
  .issue-path { font-family: "SF Mono", Monaco, Consolas, monospace; color: #303133; font-weight: 500; flex: 1; }
  .item-category { font-weight: 500; }
  .item-count { margin-left: auto; font-weight: bold; color: #667eea; font-size: 16px; }
  .item-desc { font-size: 13px; color: #606266; margin-top: 6px; margin-left: 32px; }
  .item-roles { font-size: 12px; color: #909399; margin-top: 4px; margin-left: 32px; }
  .location { font-size: 12px; color: #c0c4cc; margin-top: 4px; margin-left: 32px; display: block; font-family: "SF Mono", Monaco, Consolas, monospace; }
  .more-hint { text-align: center; color: #909399; font-size: 12px; padding: 12px; margin-top: 10px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>前端路由死链巡查报告</h1>
    <div class="time">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
  </div>
  ${comparisonHtml}
  <div class="nav-tabs">${navHtml}</div>
  ${sections}
</div>
</body>
</html>`;
  }
}

module.exports = ReportGenerator;
