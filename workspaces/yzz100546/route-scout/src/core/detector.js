const Logger = require('../utils/logger');
const RouteScanner = require('../scanners/route-scanner');
const MenuScanner = require('../scanners/menu-scanner');
const PermissionScanner = require('../scanners/permission-scanner');
const CodeLinkScanner = require('../scanners/code-link-scanner');

class DeadLinkDetector {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.routeScanner = new RouteScanner(config);
    this.menuScanner = new MenuScanner(config);
    this.permissionScanner = new PermissionScanner(config);
    this.codeLinkScanner = new CodeLinkScanner(config);
    
    this.results = {
      summary: {},
      deadLinks: [],
      orphanPages: [],
      duplicateRoutes: [],
      invalidPermissions: [],
      externalLinkIssues: [],
      dynamicRoutes: [],
      lazyLoadedRoutes: [],
      adminOnlyRoutes: [],
      legacyMenuItems: []
    };
  }

  async detect() {
    this.logger.section('开始死链检测');
    
    const routes = this.routeScanner.scan();
    const menus = this.menuScanner.scan();
    const permissions = this.permissionScanner.scan();
    const codeLinks = this.codeLinkScanner.scan();

    this._findDeadLinks(codeLinks, routes);
    this._findOrphanPages(routes, menus, permissions);
    this._findDuplicateRoutes(routes);
    this._findInvalidPermissions(permissions, routes);
    this._findExternalLinkIssues(codeLinks);
    this._findDynamicAndLazyRoutes(routes);
    this._findAdminOnlyRoutes(routes, permissions);
    this._findLegacyMenuItems(menus, routes);
    this._buildSummary();

    return this.results;
  }

  _findDeadLinks(codeLinks, routes) {
    this.logger.subSection('检测代码中的死链接');
    
    const allRoutePaths = new Set();
    routes.forEach(r => {
      if (r.fullPath) allRoutePaths.add(r.fullPath);
      if (r.path) allRoutePaths.add(r.path);
      if (r.alias) r.alias.forEach(a => allRoutePaths.add(a));
    });

    const permissionPaths = new Set(this.permissionScanner.getAllRoutes());
    const menuPaths = new Set(this.menuScanner.getAllPaths());
    const allKnownPaths = new Set([...allRoutePaths, ...permissionPaths, ...menuPaths]);

    const internalLinks = this.codeLinkScanner.getInternalLinks();
    
    internalLinks.forEach(link => {
      const normalizedPath = this._normalizePath(link.path);
      
      if (this._shouldIgnorePath(normalizedPath)) return;
      if (this._matchesDynamicRoute(normalizedPath, routes)) return;
      if (this._isRelativePath(link.path)) return;
      
      const isInRoutes = allRoutePaths.has(normalizedPath);
      const isInPermissions = permissionPaths.has(normalizedPath);
      const isInMenus = menuPaths.has(normalizedPath);
      const matchesAnyDynamic = this._matchesDynamicRoute(normalizedPath, routes);
      const matchesPermissionDynamic = this._matchesPermissionDynamicRoute(normalizedPath, routes);
      
      if (!isInRoutes && !matchesAnyDynamic && !matchesPermissionDynamic) {
        let description = '代码中引用的路径不存在于路由定义中';
        let severity = 'error';
        
        if (isInPermissions && !isInRoutes) {
          description = '路径存在于权限配置但不存在于路由定义，可能是权限配置过期';
          severity = 'warning';
        } else if (isInMenus && !isInRoutes) {
          description = '路径存在于菜单配置但不存在于路由定义，可能是菜单配置过期';
          severity = 'warning';
        }
        
        this.results.deadLinks.push({
          path: normalizedPath,
          originalPath: link.path,
          sourceFile: link.sourceFile,
          line: link.line,
          type: 'code',
          severity: severity,
          inPermissions: isInPermissions,
          inMenus: isInMenus,
          description: description
        });
      }
    });

    this.logger.info(`发现 ${this.results.deadLinks.length} 个代码死链接`);
  }

  _findOrphanPages(routes, menus, permissions) {
    this.logger.subSection('检测无入口页面');
    
    const menuPaths = new Set(this.menuScanner.getAllPaths());
    const permRoutes = new Set(this.permissionScanner.getAllRoutes());
    const codeLinkPaths = new Set(
      this.codeLinkScanner.getInternalLinks().map(l => this._normalizePath(l.path))
    );

    routes.forEach(route => {
      const checkPath = route.fullPath || route.path;
      if (!checkPath || this._shouldIgnorePath(checkPath)) return;
      if (route.redirect) return;
      if (route.isDynamic) return;

      const hasMenuEntry = this._hasMenuEntry(checkPath, menuPaths);
      const hasPermissionEntry = permRoutes.has(checkPath) || this._matchesPermissionDynamicRoute(checkPath, routes);
      const hasCodeLink = this._hasCodeReference(checkPath, codeLinkPaths, routes);
      const hasDynamicMatch = this._hasDynamicCodeReference(checkPath, codeLinkPaths, routes);

      if (!hasMenuEntry && !hasPermissionEntry && !hasCodeLink && !hasDynamicMatch) {
        this.results.orphanPages.push({
          path: checkPath,
          name: route.name,
          component: route.component,
          isDynamic: route.isDynamic,
          isLazy: route.isLazy,
          sourceFile: route.sourceFile,
          line: route.line,
          permissions: route.permissions,
          type: 'orphan',
          severity: 'warning',
          description: '该路由没有菜单入口、没有权限配置，也没有代码引用'
        });
      }
    });

    this.logger.info(`发现 ${this.results.orphanPages.length} 个无入口页面`);
  }

  _findDuplicateRoutes(routes) {
    this.logger.subSection('检测重复路由');
    
    const pathMap = new Map();
    
    routes.forEach(route => {
      const checkPath = route.fullPath || route.path;
      if (!checkPath) return;
      
      if (!pathMap.has(checkPath)) {
        pathMap.set(checkPath, []);
      }
      pathMap.get(checkPath).push(route);
    });

    pathMap.forEach((routeList, path) => {
      if (routeList.length > 1) {
        this.results.duplicateRoutes.push({
          path: path,
          count: routeList.length,
          occurrences: routeList.map(r => ({
            sourceFile: r.sourceFile,
            line: r.line,
            name: r.name,
            component: r.component
          })),
          type: 'duplicate',
          severity: 'error',
          description: `该路径在 ${routeList.length} 个地方被定义`
        });
      }
    });

    this.logger.info(`发现 ${this.results.duplicateRoutes.length} 个重复路由`);
  }

  _findInvalidPermissions(permissions, routes) {
    this.logger.subSection('检测无效权限配置');
    
    const allRoutePaths = new Set();
    routes.forEach(r => {
      if (r.fullPath) allRoutePaths.add(r.fullPath);
      if (r.path) allRoutePaths.add(r.path);
    });

    this.permissionScanner.getAllRoutes().forEach(routePath => {
      if (this._shouldIgnorePath(routePath)) return;
      if (this._matchesDynamicRoute(routePath, routes)) return;
      
      if (!allRoutePaths.has(routePath) && !this._basePathExists(routePath, allRoutePaths)) {
        const permEntries = permissions.filter(p => p.route === routePath);
        this.results.invalidPermissions.push({
          path: routePath,
          roles: permEntries.flatMap(p => p.roles),
          sources: permEntries.map(p => ({
            sourceFile: p.sourceFile,
            line: p.line
          })),
          type: 'invalid-permission',
          severity: 'warning',
          description: '权限配置中的路径不存在于路由定义中'
        });
      }
    });

    this.logger.info(`发现 ${this.results.invalidPermissions.length} 个无效权限配置`);
  }

  _findExternalLinkIssues(codeLinks) {
    this.logger.subSection('检测外链格式问题');
    
    const externalLinks = this.codeLinkScanner.getExternalLinks();
    
    externalLinks.forEach(link => {
      const issues = [];
      
      if (!link.path.startsWith('http://') && !link.path.startsWith('https://')) {
        issues.push('协议缺失，应为 http:// 或 https://');
      }
      
      if (link.path.includes(' ') || link.path.includes('\n') || link.path.includes('\t')) {
        issues.push('链接中包含空白字符');
      }
      
      if (link.path.endsWith('/') && !link.path.endsWith('//')) {
        const trimmed = link.path.slice(0, -1);
        if (!trimmed.includes('?') && !trimmed.includes('#')) {
          issues.push('建议检查是否需要末尾斜杠');
        }
      }
      
      if (link.path.match(/["'<>\\]/)) {
        issues.push('链接包含可疑字符');
      }

      if (issues.length > 0) {
        this.results.externalLinkIssues.push({
          path: link.path,
          sourceFile: link.sourceFile,
          line: link.line,
          issues: issues,
          type: 'external-link',
          severity: 'warning',
          description: issues.join('; ')
        });
      }
    });

    this.logger.info(`发现 ${this.results.externalLinkIssues.length} 个外链格式问题`);
  }

  _findDynamicAndLazyRoutes(routes) {
    routes.forEach(route => {
      if (route.isDynamic) {
        this.results.dynamicRoutes.push({
          path: route.fullPath || route.path,
          name: route.name,
          params: route.dynamicParams,
          component: route.component,
          sourceFile: route.sourceFile,
          line: route.line
        });
      }
      if (route.isLazy) {
        this.results.lazyLoadedRoutes.push({
          path: route.fullPath || route.path,
          name: route.name,
          component: route.component,
          sourceFile: route.sourceFile,
          line: route.line
        });
      }
    });

    this.logger.info(`发现 ${this.results.dynamicRoutes.length} 个动态路由, ${this.results.lazyLoadedRoutes.length} 个懒加载路由`);
  }

  _findAdminOnlyRoutes(routes, permissions) {
    this.logger.subSection('检测仅管理员可见的路由');
    
    routes.forEach(route => {
      const checkPath = route.fullPath || route.path;
      if (!checkPath) return;

      const routePerms = route.permissions || [];
      const permRoles = this.permissionScanner.getRolesByRoute(checkPath);
      const allRoles = [...new Set([...routePerms, ...permRoles])];

      if (allRoles.length > 0 && this.permissionScanner.isAdminOnly(checkPath)) {
        this.results.adminOnlyRoutes.push({
          path: checkPath,
          name: route.name,
          roles: allRoles,
          component: route.component,
          sourceFile: route.sourceFile,
          line: route.line,
          isAdminOnly: true,
          description: '该路由仅管理员可访问，可能被误判为死链'
        });
      }
    });

    this.logger.info(`发现 ${this.results.adminOnlyRoutes.length} 个仅管理员可见的路由`);
  }

  _findLegacyMenuItems(menus, routes) {
    this.logger.subSection('检测旧菜单保留项');
    
    const allRoutePaths = new Set();
    routes.forEach(r => {
      if (r.fullPath) allRoutePaths.add(r.fullPath);
      if (r.path) allRoutePaths.add(r.path);
    });

    menus.forEach(menu => {
      if (!menu.path || this._shouldIgnorePath(menu.path)) return;
      
      if (!allRoutePaths.has(menu.path) && !this._matchesDynamicRoute(menu.path, routes)) {
        this.results.legacyMenuItems.push({
          path: menu.path,
          name: menu.name,
          permissions: menu.permissions,
          parentPath: menu.parentPath,
          sourceFile: menu.sourceFile,
          line: menu.line,
          type: 'legacy-menu',
          severity: 'warning',
          description: '菜单项引用的路径不存在于路由定义中，可能是旧菜单残留'
        });
      }
    });

    this.logger.info(`发现 ${this.results.legacyMenuItems.length} 个旧菜单保留项`);
  }

  _normalizePath(pathStr) {
    if (!pathStr) return '';
    const clean = pathStr.split('?')[0].split('#')[0];
    if (!clean.startsWith('/')) return '/' + clean;
    return clean;
  }

  _shouldIgnorePath(pathStr) {
    if (!pathStr) return true;
    if (this.routeScanner.isIgnoredPath(pathStr)) return true;
    if (pathStr === '/' || pathStr === '') return true;
    return false;
  }

  _matchesDynamicRoute(pathStr, routes) {
    return routes.some(route => {
      const routePath = route.fullPath || route.path;
      if (!routePath || !route.isDynamic) return false;
      
      const pattern = routePath.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '[^/]+');
      try {
        return new RegExp('^' + pattern + '$').test(pathStr);
      } catch (e) {
        return false;
      }
    });
  }

  _matchesPermissionDynamicRoute(pathStr, routes) {
    const permissionPaths = this.permissionScanner.getAllRoutes();
    
    for (const permPath of permissionPaths) {
      if (!permPath.includes(':')) continue;
      
      const pattern = permPath.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '[^/]+');
      try {
        if (new RegExp('^' + pattern + '$').test(pathStr)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  }

  _basePathExists(pathStr, allRoutePaths) {
    const parts = pathStr.split('/').filter(Boolean);
    for (let i = parts.length; i > 0; i--) {
      const base = '/' + parts.slice(0, i).join('/');
      if (allRoutePaths.has(base)) return true;
    }
    return false;
  }

  _hasMenuEntry(pathStr, menuPaths) {
    if (menuPaths.has(pathStr)) return true;
    
    const parts = pathStr.split('/').filter(Boolean);
    for (let i = parts.length; i > 0; i--) {
      const base = '/' + parts.slice(0, i).join('/');
      if (menuPaths.has(base)) return true;
    }
    return false;
  }

  _hasCodeReference(pathStr, codeLinkPaths, routes) {
    if (codeLinkPaths.has(pathStr)) return true;
    
    return routes.some(r => {
      if (!r.redirect) return false;
      return r.redirect === pathStr || this._normalizePath(r.redirect) === pathStr;
    });
  }

  _hasDynamicCodeReference(pathStr, codeLinkPaths, routes) {
    if (!pathStr.includes(':')) return false;
    
    const pattern = pathStr.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '[^/]+');
    try {
      const regex = new RegExp('^' + pattern + '$');
      for (const linkPath of codeLinkPaths) {
        if (regex.test(linkPath)) {
          return true;
        }
      }
    } catch (e) {
      return false;
    }
    
    return false;
  }

  _isRelativePath(pathStr) {
    return pathStr.startsWith('./') || pathStr.startsWith('../');
  }

  _buildSummary() {
    this.results.summary = {
      totalRoutes: this.routeScanner.routes.length,
      totalMenus: this.menuScanner.menus.length,
      totalPermissions: this.permissionScanner.permissions.length,
      totalCodeLinks: this.codeLinkScanner.links.length,
      dynamicRoutes: this.results.dynamicRoutes.length,
      lazyLoadedRoutes: this.results.lazyLoadedRoutes.length,
      adminOnlyRoutes: this.results.adminOnlyRoutes.length,
      issues: {
        error: this.results.deadLinks.length + this.results.duplicateRoutes.length,
        warning: this.results.orphanPages.length + 
                 this.results.invalidPermissions.length + 
                 this.results.externalLinkIssues.length + 
                 this.results.legacyMenuItems.length,
        total: this.results.deadLinks.length + 
               this.results.orphanPages.length + 
               this.results.duplicateRoutes.length + 
               this.results.invalidPermissions.length + 
               this.results.externalLinkIssues.length + 
               this.results.legacyMenuItems.length
      }
    };
  }
}

module.exports = DeadLinkDetector;
