module.exports = {
  ConfigLoader: require('./src/config/config-loader'),
  DeadLinkDetector: require('./src/core/detector'),
  HistoryManager: require('./src/core/history-manager'),
  ReportGenerator: require('./src/core/report-generator'),
  RouteScanner: require('./src/scanners/route-scanner'),
  MenuScanner: require('./src/scanners/menu-scanner'),
  PermissionScanner: require('./src/scanners/permission-scanner'),
  CodeLinkScanner: require('./src/scanners/code-link-scanner'),
  Logger: require('./src/utils/logger'),
  FileUtils: require('./src/utils/file-utils')
};
