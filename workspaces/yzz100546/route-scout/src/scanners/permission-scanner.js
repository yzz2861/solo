const path = require('path');
const FileUtils = require('../utils/file-utils');
const Logger = require('../utils/logger');

class PermissionScanner {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.permissions = [];
  }

  scan() {
    this.logger.info('开始扫描权限配置...');
    const files = FileUtils.globFiles(this.config.permission.files, this.config.projectRoot);
    this.logger.verbose(`找到 ${files.length} 个权限配置文件`);

    files.forEach(file => {
      if (FileUtils.isIgnored(file, this.config.ignore.files, this.config.projectRoot)) return;
      this._scanFile(file);
    });

    this.logger.success(`共发现 ${this.permissions.length} 个权限条目`);
    return this.permissions;
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
      const permList = Array.isArray(data) ? data : this._findPermissionArray(data);
      permList.forEach(item => {
        this._parsePermission(item, filePath);
      });
    }
  }

  _extractFromJs(content, filePath) {
    try {
      const match = content.match(/(?:module\.exports\s*=\s*|export\s+(?:default\s+)?)(\[?[\s\S]*?\]?);?\s*$/);
      if (match) {
        return FileUtils.parseJsObject(match[1].trim().replace(/;$/, ''));
      }
      
      const arrMatch = content.match(/const\s+\w*(?:permission|Permission|role|Role|auth|Auth)\w*\s*=\s*(\[[\s\S]*?\]);/);
      if (arrMatch) {
        return FileUtils.parseJsObject(arrMatch[1]);
      }
    } catch (e) {
      this.logger.warn(`JS权限配置解析失败: ${path.basename(filePath)}`);
    }
    return this._regexExtract(content, filePath);
  }

  _regexExtract(content, filePath) {
    const result = [];
    const routeRegex = /(?:route|path|resource)\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
    const roleRegex = /(?:role|roles)\s*[:=]\s*(?:\[([^\]]*)\]|['"`]([^'"`]+)['"`])/g;
    
    const routes = [];
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      routes.push({
        route: match[1],
        roles: [],
        sourceFile: path.relative(this.config.projectRoot, filePath),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    let roleIdx = 0;
    while ((match = roleRegex.exec(content)) !== null) {
      const rolesStr = match[1] || match[2] || '';
      const roles = rolesStr.split(',').map(s => s.trim().replace(/['"`]/g, '')).filter(Boolean);
      if (routes[roleIdx]) {
        routes[roleIdx].roles = roles;
      }
      roleIdx++;
    }
    
    return routes;
  }

  _findPermissionArray(obj) {
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== 'object' || obj === null) return [];
    
    for (const key of ['permissions', 'permissionList', 'roles', 'roleList', 'authList', 'resources']) {
      if (obj[key] && Array.isArray(obj[key])) return obj[key];
    }
    
    if (obj.routes && Array.isArray(obj.routes)) return obj.routes;
    
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        const first = obj[key][0];
        if (first && typeof first === 'object') {
          for (const p of this.config.permission.routeKey) {
            if (first[p]) return obj[key];
          }
        }
      }
    }
    return [];
  }

  _parsePermission(item, filePath) {
    if (!item || typeof item !== 'object') return;

    const perm = {
      route: '',
      roles: [],
      sourceFile: path.relative(this.config.projectRoot, filePath),
      line: item._line || 0
    };

    for (const key of this.config.permission.routeKey) {
      if (item[key]) {
        perm.route = String(item[key]);
        break;
      }
    }

    for (const key of this.config.permission.roleKey) {
      if (item[key]) {
        perm.roles = Array.isArray(item[key]) ? item[key].map(String) : [String(item[key])];
        break;
      }
    }

    if (perm.route) {
      this.permissions.push(perm);
    }
  }

  getAllRoutes() {
    const routes = new Set();
    this.permissions.forEach(p => {
      if (p.route) routes.add(p.route);
    });
    return Array.from(routes);
  }

  getRolesByRoute(routePath) {
    const roles = new Set();
    this.permissions.forEach(p => {
      if (p.route === routePath) {
        p.roles.forEach(r => roles.add(r));
      }
    });
    return Array.from(roles);
  }

  isAdminOnly(routePath) {
    const roles = this.getRolesByRoute(routePath);
    if (roles.length === 0) return false;
    
    const adminRoles = this.config.permission.adminRoles;
    return roles.every(role => 
      adminRoles.some(adminRole => 
        String(role).toLowerCase() === String(adminRole).toLowerCase() ||
        String(role).toLowerCase().includes(String(adminRole).toLowerCase())
      )
    );
  }

  hasAnyRole(routePath) {
    return this.getRolesByRoute(routePath).length > 0;
  }
}

module.exports = PermissionScanner;
