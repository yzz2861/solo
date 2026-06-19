const path = require('path');
const FileUtils = require('../utils/file-utils');
const Logger = require('../utils/logger');

class MenuScanner {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.menus = [];
  }

  scan() {
    this.logger.info('开始扫描菜单配置...');
    const files = FileUtils.globFiles(this.config.menu.files, this.config.projectRoot);
    this.logger.verbose(`找到 ${files.length} 个菜单配置文件`);

    files.forEach(file => {
      if (FileUtils.isIgnored(file, this.config.ignore.files, this.config.projectRoot)) return;
      this._scanFile(file);
    });

    this.logger.success(`共发现 ${this.menus.length} 个菜单项`);
    return this.menus;
  }

  _scanFile(filePath) {
    const content = FileUtils.readFile(filePath);
    if (!content) return;

    const ext = FileUtils.getExt(filePath);
    let data = null;

    if (ext === 'json') {
      data = FileUtils.parseJsonFile(filePath);
    } else if (ext === 'yaml' || ext === 'yml') {
      data = FileUtils.parseYamlFile(filePath);
    } else if (ext === 'js' || ext === 'ts') {
      data = this._extractFromJs(content, filePath);
    }

    if (data) {
      const menuList = Array.isArray(data) ? data : this._findMenuArray(data);
      menuList.forEach(item => {
        this._parseMenuItem(item, filePath, '');
      });
    }
  }

  _extractFromJs(content, filePath) {
    try {
      const match = content.match(/(?:module\.exports\s*=\s*|export\s+(?:default\s+)?)(\[?[\s\S]*?\]?);?\s*$/);
      if (match) {
        return FileUtils.parseJsObject(match[1].trim().replace(/;$/, ''));
      }
      
      const arrMatch = content.match(/const\s+\w*(?:menu|Menu)\w*\s*=\s*(\[[\s\S]*?\]);/);
      if (arrMatch) {
        return FileUtils.parseJsObject(arrMatch[1]);
      }
    } catch (e) {
      this.logger.warn(`JS菜单配置解析失败: ${path.basename(filePath)}`);
    }
    return this._regexExtract(content, filePath);
  }

  _regexExtract(content, filePath) {
    const result = [];
    const items = [];
    let match;
    const pathRegex = /(?:path|route|url|href)\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
    const nameRegex = /(?:name|title|label)\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
    
    let idx = 0;
    while ((match = pathRegex.exec(content)) !== null) {
      items.push({
        _index: idx++,
        path: match[1],
        sourceFile: path.relative(this.config.projectRoot, filePath),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    const names = [];
    while ((match = nameRegex.exec(content)) !== null) {
      names.push(match[1]);
    }
    
    items.forEach((item, i) => {
      if (names[i]) item.name = names[i];
      result.push(item);
    });
    
    return result;
  }

  _findMenuArray(obj) {
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== 'object' || obj === null) return [];
    
    for (const key of ['menus', 'menu', 'menuList', 'items', 'routes']) {
      if (obj[key] && Array.isArray(obj[key])) return obj[key];
    }
    
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        const first = obj[key][0];
        if (first && typeof first === 'object') {
          for (const p of this.config.menu.pathKey) {
            if (first[p]) return obj[key];
          }
        }
      }
    }
    return [];
  }

  _parseMenuItem(item, filePath, parentPath) {
    if (!item || typeof item !== 'object') return;

    const menuItem = {
      path: '',
      name: '',
      permissions: [],
      children: [],
      parentPath: parentPath,
      sourceFile: path.relative(this.config.projectRoot, filePath),
      line: item._line || 0
    };

    for (const key of this.config.menu.pathKey) {
      if (item[key]) {
        menuItem.path = String(item[key]);
        break;
      }
    }

    for (const key of this.config.menu.nameKey) {
      if (item[key]) {
        menuItem.name = String(item[key]);
        break;
      }
    }

    for (const key of this.config.menu.permissionKey) {
      if (item[key]) {
        menuItem.permissions = Array.isArray(item[key]) ? item[key] : [String(item[key])];
        break;
      }
    }

    if (menuItem.path) {
      this.menus.push(menuItem);
    }

    for (const key of this.config.menu.childrenKey) {
      if (item[key] && Array.isArray(item[key])) {
        const childParent = menuItem.path || parentPath;
        item[key].forEach(child => {
          this._parseMenuItem(child, filePath, childParent);
        });
      }
    }
  }

  getAllPaths() {
    const paths = new Set();
    this.menus.forEach(m => {
      if (m.path) paths.add(m.path);
    });
    return Array.from(paths);
  }

  getMenuByPath(pathStr) {
    return this.menus.filter(m => m.path === pathStr);
  }
}

module.exports = MenuScanner;
