const chalk = require('chalk');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.verboseEnabled = options.verbose || false;
    this.prefix = options.prefix || '[route-scout]';
  }

  shouldLog(level) {
    const currentLevel = LOG_LEVELS[this.level] ?? LOG_LEVELS.info;
    const targetLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
    return targetLevel <= currentLevel;
  }

  log(level, ...args) {
    if (!this.shouldLog(level)) return;
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = chalk.gray(`${this.prefix} ${timestamp}`);
    console.log(prefix, ...args);
  }

  error(...args) {
    this.log('error', chalk.red('✖ ERROR:'), ...args);
  }

  warn(...args) {
    this.log('warn', chalk.yellow('⚠ WARN:'), ...args);
  }

  info(...args) {
    this.log('info', chalk.blue('ℹ INFO:'), ...args);
  }

  success(...args) {
    this.log('info', chalk.green('✔ SUCCESS:'), ...args);
  }

  debug(...args) {
    this.log('debug', chalk.magenta('→ DEBUG:'), ...args);
  }

  verbose(...args) {
    if (!this.verboseEnabled) return;
    this.log('verbose', chalk.cyan('· VERBOSE:'), ...args);
  }

  section(title) {
    console.log('');
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan.bold(`  ${title}`));
    console.log(chalk.cyan('═'.repeat(60)));
  }

  subSection(title) {
    console.log('');
    console.log(chalk.cyan(`── ${title} ──`));
  }
}

module.exports = Logger;
