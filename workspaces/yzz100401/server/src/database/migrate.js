const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = process.env.DB_PATH || './data/claim.db';
const db = require('sqlite3').verbose();

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const database = new db.Database(dbPath);

database.serialize(() => {
  console.log('开始数据库迁移...');
  
  const checkColumns = (tableName, callback) => {
    database.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        console.error(`检查表 ${tableName} 列时出错:`, err);
        return;
      }
      const columns = rows.map(row => row.name);
      callback(columns);
    });
  };
  
  checkColumns('documents', (columns) => {
    console.log('现有 documents 表列:', columns);
    
    const columnsToAdd = [
      { name: 'parse_status', def: "TEXT NOT NULL DEFAULT 'pending' CHECK(parse_status IN ('pending', 'processing', 'success', 'failed', 'unsupported'))" },
      { name: 'parse_error', def: 'TEXT' },
      { name: 'parsed_at', def: 'DATETIME' },
      { name: 'page_count', def: 'INTEGER DEFAULT 0' },
      { name: 'text_length', def: 'INTEGER DEFAULT 0' }
    ];
    
    columnsToAdd.forEach(col => {
      if (!columns.includes(col.name)) {
        console.log(`添加列: ${col.name}`);
        database.run(`ALTER TABLE documents ADD COLUMN ${col.name} ${col.def}`, (err) => {
          if (err) {
            console.error(`添加列 ${col.name} 失败:`, err.message);
          } else {
            console.log(`列 ${col.name} 添加成功`);
          }
        });
      } else {
        console.log(`列 ${col.name} 已存在，跳过`);
      }
    });
    
    database.run(`
      UPDATE documents SET parse_status = 'success' 
      WHERE id IN (SELECT DISTINCT document_id FROM document_contents) 
      AND (parse_status IS NULL OR parse_status = 'pending')
    `, function(err) {
      if (err) {
        console.error('更新现有文档状态失败:', err.message);
      } else {
        console.log(`更新了 ${this.changes} 个已有内容的文档状态为 success`);
      }
    });
    
    database.run(`
      UPDATE documents SET parse_status = 'pending' 
      WHERE parse_status IS NULL
    `, function(err) {
      if (err) {
        console.error('更新默认状态失败:', err.message);
      } else {
        console.log(`更新了 ${this.changes} 个文档的默认状态`);
      }
    });
  });
  
  setTimeout(() => {
    database.close();
    console.log('数据库迁移完成！');
  }, 2000);
});
