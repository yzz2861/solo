const path = require('path');
const FileUtils = require('../utils/file-utils');

const DEFAULT_CONFIG = {
  projectRoot: './',
  framework: 'vue',
  route: {
    files: [
      'src/router/**/*.{js,ts}',
      'src/router/index.{js,ts}'
    ],
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
    adminRoles: ['admin', 'superAdmin', 'root']
  },
  links: {
    scanFiles: ['src/**/*.{vue,js,ts,jsx,tsx}'],
    linkPatterns: [],
    externalLinkPattern: '^https?://',
    internalLinkBasePath: '/'
  },
  ignore: {
    paths: ['/login', '/404', '/403', '/500'],
    pathPatterns: [],
    files: []
  },
  history: {
    enabled: true,
    file: './.route-scout-history.json',
    maxHistory: 30
  },
  report: {
    outputDir: './reports',
    formats: ['console', 'json'],
    views: ['frontend', 'test', 'product']
  },
  logging: {
    level: 'info',
    verbose: false
  }
};

class ConfigLoader {
  static load(configPath) {
    let userConfig = {};
    
    if (configPath && FileUtils.fileExists(configPath)) {
      const ext = FileUtils.getExt(configPath);
      if (ext === 'json') {
        userConfig = FileUtils.parseJsonFile(configPath) || {};
      } else if (ext === 'yaml' || ext === 'yml') {
        userConfig = FileUtils.parseYamlFile(configPath) || {};
      }
    }

    const config = this._deepMerge(DEFAULT_CONFIG, userConfig);
    config._configDir = configPath ? path.dirname(path.resolve(configPath)) : process.cwd();
    config.projectRoot = path.resolve(config._configDir, config.projectRoot);
    config.history.file = path.resolve(config._configDir, config.history.file);
    config.report.outputDir = path.resolve(config._configDir, config.report.outputDir);

    return config;
  }

  static _deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

module.exports = ConfigLoader;
module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
