const path = require('path');
const FileUtils = require('../utils/file-utils');
const Logger = require('../utils/logger');

class CodeLinkScanner {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.links = [];
    this.linkPatterns = this.config.links.linkPatterns.length > 0
      ? this.config.links.linkPatterns.map(p => {
          try { return new RegExp(p, 'g'); } catch (e) { return null; }
        }).filter(Boolean)
      : this._getDefaultPatterns();
    this.externalPattern = new RegExp(this.config.links.externalLinkPattern);
  }

  _getDefaultPatterns() {
    return [
      /this\.\$router\.push\(['"`]([^'"`]+)['"`]/g,
      /router\.push\(['"`]([^'"`]+)['"`]/g,
      /<router-link[^>]*to=['"`]([^'"`]+)['"`]/g,
      /this\.\$router\.replace\(['"`]([^'"`]+)['"`]/g,
      /router\.replace\(['"`]([^'"`]+)['"`]/g,
      /useRouter\(\)\.push\(['"`]([^'"`]+)['"`]/g,
      /<Link[^>]*to=['"`]([^'"`]+)['"`]/g,
      /<NavLink[^>]*to=['"`]([^'"`]+)['"`]/g,
      /navigateTo\(['"`]([^'"`]+)['"`]/g,
      /window\.location\.(?:href|assign|replace)\s*=\s*['"`]([^'"`]+)['"`]/g
    ];
  }

  scan() {
    this.logger.info('开始扫描代码中的链接...');
    const files = FileUtils.globFiles(this.config.links.scanFiles, this.config.projectRoot);
    this.logger.verbose(`找到 ${files.length} 个待扫描文件`);

    let scannedCount = 0;
    files.forEach(file => {
      if (FileUtils.isIgnored(file, this.config.ignore.files, this.config.projectRoot)) return;
      if (this._isRouteConfigFile(file)) return;
      
      this._scanFile(file);
      scannedCount++;
    });

    this.logger.verbose(`实际扫描 ${scannedCount} 个文件`);
    this.logger.success(`共发现 ${this.links.length} 个代码链接`);
    return this.links;
  }

  _isRouteConfigFile(filePath) {
    const relative = path.relative(this.config.projectRoot, filePath);
    return this.config.route.files.some(pattern => {
      const globPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/[{}]/g, '');
      try {
        return new RegExp(globPattern).test(relative);
      } catch (e) {
        return false;
      }
    });
  }

  _scanFile(filePath) {
    const content = FileUtils.readFile(filePath);
    if (!content) return;

    const ext = FileUtils.getExt(filePath);
    
    const parts = [];
    
    if (ext === 'vue') {
      const script = this._extractVueScript(content);
      const template = this._extractVueTemplate(content);
      if (script) parts.push({ code: script, offset: this._getLineOffset(content, '<script') });
      if (template) parts.push({ code: template, offset: this._getLineOffset(content, '<template') });
    } else {
      parts.push({ code: content, offset: 0 });
    }

    parts.forEach(part => {
      this.linkPatterns.forEach((pattern, idx) => {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(part.code)) !== null) {
          const linkPath = match[1] || match[2];
          if (!linkPath) continue;
          
          const line = part.code.substring(0, match.index).split('\n').length + part.offset;
          const link = {
            path: linkPath,
            sourceFile: path.relative(this.config.projectRoot, filePath),
            line: line,
            patternIndex: idx,
            isExternal: this._isExternalLink(linkPath),
            type: this._classifyLink(linkPath)
          };

          if (!this._isDuplicate(link)) {
            this.links.push(link);
          }
        }
      });
    });
  }

  _extractVueScript(content) {
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    return scriptMatch ? scriptMatch[1] : '';
  }

  _extractVueTemplate(content) {
    const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/s);
    return templateMatch ? templateMatch[1] : '';
  }

  _getLineOffset(content, search) {
    const index = content.indexOf(search);
    if (index === -1) return 0;
    return content.substring(0, index).split('\n').length - 1;
  }

  _isExternalLink(linkPath) {
    const trimmed = linkPath.trim();
    const clean = trimmed.replace(/\s+/g, '').toLowerCase();
    return this.externalPattern.test(trimmed) || 
           clean.startsWith('http://') || 
           clean.startsWith('https://') || 
           clean.startsWith('www.');
  }

  _classifyLink(linkPath) {
    const trimmed = linkPath.trim();
    const clean = trimmed.replace(/\s+/g, '').toLowerCase();
    
    if (this._isExternalLink(linkPath)) return 'external';
    if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return 'special';
    if (trimmed.startsWith('#')) return 'anchor';
    if (trimmed.startsWith('?')) return 'query';
    if (trimmed.startsWith('./') || trimmed.startsWith('../')) return 'relative';
    return 'internal';
  }

  _isDuplicate(link) {
    return this.links.some(l => 
      l.path === link.path && 
      l.sourceFile === link.sourceFile && 
      l.line === link.line
    );
  }

  getInternalLinks() {
    return this.links.filter(l => l.type === 'internal' || l.type === 'relative');
  }

  getExternalLinks() {
    return this.links.filter(l => l.isExternal || l.type === 'external');
  }

  getAllLinkPaths() {
    return this.getInternalLinks().map(l => l.path);
  }
}

module.exports = CodeLinkScanner;
