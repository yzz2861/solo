const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const FileUtils = require('../utils/file-utils');
const Logger = require('../utils/logger');

class RouteScanner {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.routes = [];
    this.dynamicPatterns = config.route.dynamicRoutePatterns.map(p => {
      try { return new RegExp(p); } catch (e) { return null; }
    }).filter(Boolean);
    this.lazyPatterns = config.route.lazyLoadPatterns.map(p => {
      try { return new RegExp(p); } catch (e) { return null; }
    }).filter(Boolean);
  }

  scan() {
    this.logger.info('开始扫描路由文件...');
    const files = FileUtils.globFiles(this.config.route.files, this.config.projectRoot);
    this.logger.verbose(`找到 ${files.length} 个路由文件`);
    
    files.forEach(file => {
      if (FileUtils.isIgnored(file, this.config.ignore.files, this.config.projectRoot)) return;
      this._scanFile(file);
    });

    this._resolveNestedRoutes();
    this.logger.success(`共发现 ${this.routes.length} 个路由定义`);
    return this.routes;
  }

  _scanFile(filePath) {
    const content = FileUtils.readFile(filePath);
    if (!content) return;

    const ext = FileUtils.getExt(filePath);
    let ast = null;

    try {
      if (ext === 'js' || ext === 'jsx') {
        ast = parser.parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'dynamicImport', 'classProperties']
        });
      } else if (ext === 'ts' || ext === 'tsx') {
        ast = parser.parse(content, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx', 'dynamicImport', 'classProperties']
        });
      }
    } catch (e) {
      this.logger.warn(`解析路由文件失败: ${path.relative(this.config.projectRoot, filePath)} - ${e.message}`);
      this._fallbackRegexScan(content, filePath);
      return;
    }

    if (ast) {
      this._traverseAst(ast, content, filePath);
    }
  }

  _traverseAst(ast, content, filePath) {
    const foundRoutes = [];
    
    traverse(ast, {
      VariableDeclarator: (nodePath) => {
        if (nodePath.node.init && nodePath.node.init.type === 'ArrayExpression') {
          const varName = nodePath.node.id.name;
          if (/(routes|router|routeConfig)/i.test(varName)) {
            const routes = this._extractRoutesFromArray(nodePath.node.init, content, filePath);
            routes.forEach(r => foundRoutes.push(r));
            nodePath.skip();
          }
        }
      },
      AssignmentExpression: (nodePath) => {
        if (nodePath.node.right && nodePath.node.right.type === 'ArrayExpression') {
          const left = nodePath.node.left;
          let varName = '';
          if (left.type === 'Identifier') {
            varName = left.name;
          } else if (left.type === 'MemberExpression' && left.property) {
            varName = left.property.name || '';
          }
          if (/(routes|router|routeConfig)/i.test(varName)) {
            const routes = this._extractRoutesFromArray(nodePath.node.right, content, filePath);
            routes.forEach(r => foundRoutes.push(r));
            nodePath.skip();
          }
        }
      },
      ExportDefaultDeclaration: (nodePath) => {
        if (nodePath.node.declaration && nodePath.node.declaration.type === 'ArrayExpression') {
          const routes = this._extractRoutesFromArray(nodePath.node.declaration, content, filePath);
          routes.forEach(r => foundRoutes.push(r));
          nodePath.skip();
        }
      }
    });

    const seen = new Set();
    foundRoutes.forEach(route => {
      const key = `${route.fullPath || route.path}:${route.sourceFile}:${route.line}`;
      if (!seen.has(key) && (route.fullPath || route.path)) {
        seen.add(key);
        this.routes.push(route);
      }
    });
  }

  _extractRoutesFromArray(arrayNode, content, filePath, parentPath = '') {
    const routes = [];
    arrayNode.elements.forEach(elem => {
      if (!elem || elem.type !== 'ObjectExpression') return;
      const route = this._extractSingleRoute(elem, content, filePath, parentPath);
      if (route) {
        routes.push(route);
        if (route._children) {
          routes.push(...route._children);
          delete route._children;
        }
      }
    });
    return routes;
  }

  _extractSingleRoute(objNode, content, filePath, parentPath = '') {
    const route = {
      path: '',
      name: '',
      component: '',
      isLazy: false,
      isDynamic: false,
      dynamicParams: [],
      meta: {},
      permissions: [],
      sourceFile: path.relative(this.config.projectRoot, filePath),
      line: objNode.loc ? objNode.loc.start.line : 0,
      parentPath: parentPath,
      fullPath: ''
    };

    objNode.properties.forEach(prop => {
      if (!prop.key) return;
      const key = prop.key.name || prop.key.value;
      
      if (key === 'path' && prop.value.type === 'StringLiteral') {
        route.path = prop.value.value;
      } else if (key === 'name' && prop.value.type === 'StringLiteral') {
        route.name = prop.value.value;
      } else if (key === 'component') {
        const componentInfo = this._extractComponent(prop.value, content);
        route.component = componentInfo.name;
        route.isLazy = componentInfo.isLazy;
      } else if (key === 'children' && prop.value.type === 'ArrayExpression') {
        const fullParentPath = parentPath ? this._joinPath(parentPath, route.path) : route.path;
        route._children = this._extractRoutesFromArray(prop.value, content, filePath, fullParentPath);
      } else if (key === 'meta' && prop.value.type === 'ObjectExpression') {
        route.meta = this._extractMeta(prop.value);
        if (route.meta.permissions || route.meta.roles || route.meta.auth) {
          route.permissions = [].concat(
            route.meta.permissions || [],
            route.meta.roles || [],
            route.meta.auth || []
          );
        }
      } else if (key === 'redirect' && prop.value.type === 'StringLiteral') {
        route.redirect = prop.value.value;
      } else if (key === 'alias') {
        if (prop.value.type === 'StringLiteral') {
          route.alias = [prop.value.value];
        } else if (prop.value.type === 'ArrayExpression') {
          route.alias = prop.value.elements
            .filter(e => e && e.type === 'StringLiteral')
            .map(e => e.value);
        }
      }
    });

    if (route.path) {
      route.fullPath = parentPath ? this._joinPath(parentPath, route.path) : route.path;
      this._checkDynamicRoute(route);
    }

    if (!route.path && !route.name) {
      return null;
    }

    return route;
  }

  _extractComponent(valueNode, content) {
    const result = { name: '', isLazy: false };
    
    if (valueNode.type === 'Identifier') {
      result.name = valueNode.name;
    } else if (valueNode.type === 'ArrowFunctionExpression' || valueNode.type === 'FunctionExpression') {
      result.isLazy = true;
      const funcBody = content.slice(valueNode.start, valueNode.end);
      const importMatch = funcBody.match(/import\(['"`]([^'"`]+)['"`]\)/);
      if (importMatch) {
        result.name = importMatch[1];
      }
    } else if (valueNode.type === 'CallExpression') {
      if (valueNode.callee.name === 'import' || valueNode.callee.name === 'lazy') {
        result.isLazy = true;
        if (valueNode.arguments[0] && valueNode.arguments[0].type === 'StringLiteral') {
          result.name = valueNode.arguments[0].value;
        }
      }
    } else if (valueNode.type === 'StringLiteral') {
      result.name = valueNode.value;
    }

    return result;
  }

  _extractMeta(objNode) {
    const meta = {};
    objNode.properties.forEach(prop => {
      if (!prop.key) return;
      const key = prop.key.name || prop.key.value;
      if (prop.value.type === 'StringLiteral') {
        meta[key] = prop.value.value;
      } else if (prop.value.type === 'BooleanLiteral') {
        meta[key] = prop.value.value;
      } else if (prop.value.type === 'NumericLiteral') {
        meta[key] = prop.value.value;
      } else if (prop.value.type === 'ArrayExpression') {
        meta[key] = prop.value.elements
          .filter(e => e && e.type === 'StringLiteral')
          .map(e => e.value);
      } else if (prop.value.type === 'ObjectExpression') {
        meta[key] = this._extractMeta(prop.value);
      }
    });
    return meta;
  }

  _checkDynamicRoute(route) {
    if (route.path.includes(':')) {
      route.isDynamic = true;
      const paramMatches = route.path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
      if (paramMatches) {
        route.dynamicParams = paramMatches.map(p => p.slice(1));
      }
    }
    
    this.dynamicPatterns.forEach(pattern => {
      if (pattern.test(route.path)) {
        route.isDynamic = true;
      }
    });
  }

  _fallbackRegexScan(content, filePath) {
    this.logger.verbose(`使用正则表达式回退扫描: ${path.basename(filePath)}`);
    
    const pathRegex = /path\s*:\s*['"`]([^'"`]+)['"`]/g;
    const nameRegex = /name\s*:\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
      const route = {
        path: match[1],
        fullPath: match[1],
        name: '',
        component: '',
        isLazy: false,
        isDynamic: false,
        dynamicParams: [],
        meta: {},
        permissions: [],
        sourceFile: path.relative(this.config.projectRoot, filePath),
        line: content.substring(0, match.index).split('\n').length,
        parentPath: ''
      };
      
      this.lazyPatterns.forEach(p => {
        if (p.test(content.substring(Math.max(0, match.index - 200), match.index + 200))) {
          route.isLazy = true;
        }
      });
      
      this._checkDynamicRoute(route);
      
      if (route.path && !this.routes.some(r => r.path === route.path && r.sourceFile === route.sourceFile)) {
        this.routes.push(route);
      }
    }
  }

  _resolveNestedRoutes() {
    const resolved = [];
    this.routes.forEach(route => {
      if (route.fullPath) {
        resolved.push(route);
      } else if (route.path) {
        route.fullPath = route.path;
        resolved.push(route);
      }
    });
    this.routes = resolved;
  }

  _joinPath(parent, child) {
    if (!parent) return child;
    if (!child) return parent;
    if (child.startsWith('/')) return child;
    const p = parent.endsWith('/') ? parent.slice(0, -1) : parent;
    return `${p}/${child}`;
  }

  getAllPaths() {
    const paths = new Set();
    this.routes.forEach(r => {
      if (r.fullPath) paths.add(r.fullPath);
      if (r.path) paths.add(r.path);
      if (r.alias) r.alias.forEach(a => paths.add(a));
    });
    return Array.from(paths);
  }

  isIgnoredPath(pathStr) {
    if (this.config.ignore.paths.includes(pathStr)) return true;
    return this.config.ignore.pathPatterns.some(p => {
      try { return new RegExp(p).test(pathStr); } catch (e) { return false; }
    });
  }
}

module.exports = RouteScanner;
