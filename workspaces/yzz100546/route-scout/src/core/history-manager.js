const fs = require('fs');
const path = require('path');
const FileUtils = require('../utils/file-utils');
const Logger = require('../utils/logger');

class HistoryManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.historyFile = config.history.file;
    this.maxHistory = config.history.maxHistory;
    this.enabled = config.history.enabled;
  }

  load() {
    if (!this.enabled) {
      return { records: [], latest: null };
    }

    if (!FileUtils.fileExists(this.historyFile)) {
      return { records: [], latest: null };
    }

    try {
      const data = FileUtils.parseJsonFile(this.historyFile);
      if (!data || !Array.isArray(data.records)) {
        return { records: [], latest: null };
      }
      return {
        records: data.records,
        latest: data.records.length > 0 ? data.records[0] : null
      };
    } catch (e) {
      this.logger.warn('读取历史记录失败，将创建新记录');
      return { records: [], latest: null };
    }
  }

  save(currentResults) {
    if (!this.enabled) return;

    const history = this.load();
    const record = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      issues: this._extractIssueSignatures(currentResults)
    };

    history.records.unshift(record);
    if (history.records.length > this.maxHistory) {
      history.records = history.records.slice(0, this.maxHistory);
    }

    FileUtils.ensureDir(path.dirname(this.historyFile));
    FileUtils.writeFile(this.historyFile, JSON.stringify({
      records: history.records
    }, null, 2));

    this.logger.info(`历史记录已保存到: ${this.historyFile}`);
    return record;
  }

  compare(currentResults) {
    const history = this.load();
    const previous = history.latest;
    
    if (!previous) {
      this.logger.info('没有历史记录，跳过对比');
      return {
        isFirstRun: true,
        newIssues: this._flattenIssues(currentResults),
        fixedIssues: [],
        unchangedIssues: []
      };
    }

    const current = this._extractIssueSignatures(currentResults);
    const prev = previous.issues;

    const newIssues = [];
    const fixedIssues = [];
    const unchangedIssues = [];

    const currentMap = new Map();
    current.forEach(issue => {
      currentMap.set(issue.signature, issue);
    });

    const prevMap = new Map();
    prev.forEach(issue => {
      prevMap.set(issue.signature, issue);
    });

    currentMap.forEach((issue, sig) => {
      if (!prevMap.has(sig)) {
        newIssues.push(issue);
      } else {
        unchangedIssues.push(issue);
      }
    });

    prevMap.forEach((issue, sig) => {
      if (!currentMap.has(sig)) {
        fixedIssues.push(issue);
      }
    });

    this.logger.info(`对比结果: 新增 ${newIssues.length} 个问题, 修复 ${fixedIssues.length} 个问题, 遗留 ${unchangedIssues.length} 个问题`);

    return {
      isFirstRun: false,
      previousDate: previous.date,
      currentDate: new Date().toISOString(),
      newIssues,
      fixedIssues,
      unchangedIssues
    };
  }

  _extractIssueSignatures(results) {
    const signatures = [];

    const addIssue = (type, item) => {
      const signature = `${type}:${item.path || item.route || 'unknown'}:${item.sourceFile || ''}:${item.line || 0}`;
      signatures.push({
        signature,
        type,
        path: item.path || item.route || '',
        name: item.name || '',
        sourceFile: item.sourceFile || '',
        line: item.line || 0,
        description: item.description || ''
      });
    };

    results.deadLinks?.forEach(item => addIssue('deadLink', item));
    results.orphanPages?.forEach(item => addIssue('orphanPage', item));
    results.duplicateRoutes?.forEach(item => addIssue('duplicateRoute', item));
    results.invalidPermissions?.forEach(item => addIssue('invalidPermission', item));
    results.externalLinkIssues?.forEach(item => addIssue('externalLinkIssue', item));
    results.legacyMenuItems?.forEach(item => addIssue('legacyMenuItem', item));

    return signatures;
  }

  _flattenIssues(results) {
    return this._extractIssueSignatures(results);
  }

  getHistoryStats() {
    const history = this.load();
    if (history.records.length === 0) {
      return null;
    }

    const stats = {
      totalRuns: history.records.length,
      firstRun: history.records[history.records.length - 1].date,
      lastRun: history.records[0].date,
      trend: []
    };

    history.records.slice(0, 10).reverse().forEach(record => {
      stats.trend.push({
        date: record.date,
        totalIssues: record.issues.length
      });
    });

    return stats;
  }
}

module.exports = HistoryManager;
