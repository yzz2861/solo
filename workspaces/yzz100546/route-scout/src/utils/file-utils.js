const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('yaml');
const { parse } = require('jsonc-parser');

class FileUtils {
  static readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      return null;
    }
  }

  static writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  static fileExists(filePath) {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (e) {
      return false;
    }
  }

  static dirExists(dirPath) {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch (e) {
      return false;
    }
  }

  static globFiles(patterns, baseDir) {
    const result = new Set();
    const ignorePatterns = [];
    const includePatterns = [];

    patterns.forEach(p => {
      if (p.startsWith('!')) {
        ignorePatterns.push(p.slice(1));
      } else {
        includePatterns.push(p);
      }
    });

    includePatterns.forEach(pattern => {
      const matches = glob.sync(pattern, {
        cwd: baseDir,
        absolute: true,
        nodir: true,
        ignore: ignorePatterns
      });
      matches.forEach(m => result.add(m));
    });

    return Array.from(result).sort();
  }

  static parseJsonFile(filePath) {
    const content = this.readFile(filePath);
    if (!content) return null;
    try {
      return parse(content);
    } catch (e) {
      return null;
    }
  }

  static parseYamlFile(filePath) {
    const content = this.readFile(filePath);
    if (!content) return null;
    try {
      return yaml.parse(content);
    } catch (e) {
      return null;
    }
  }

  static parseJsObject(content) {
    try {
      return eval(`(${content})`);
    } catch (e) {
      return null;
    }
  }

  static getExt(filePath) {
    return path.extname(filePath).toLowerCase().slice(1);
  }

  static isIgnored(filePath, ignorePatterns, baseDir) {
    if (!ignorePatterns || ignorePatterns.length === 0) return false;
    const relative = path.relative(baseDir, filePath);
    return ignorePatterns.some(p => {
      try {
        return new RegExp(p.replace(/\./g, '\\.').replace(/\*/g, '.*')).test(relative);
      } catch (e) {
        return false;
      }
    });
  }

  static ensureDir(dirPath) {
    if (!this.dirExists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static resolvePath(filePath, baseDir) {
    if (path.isAbsolute(filePath)) return filePath;
    return path.resolve(baseDir, filePath);
  }
}

module.exports = FileUtils;
