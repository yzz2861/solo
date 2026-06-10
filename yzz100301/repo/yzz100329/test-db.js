const dbModule = require('./db');

async function test() {
  try {
    console.log('Initializing DB...');
    await dbModule.init();
    console.log('DB init OK');

    const result = dbModule.queryOne('SELECT COUNT(*) as cnt FROM poles');
    console.log('Poles count:', result);

    const stats = dbModule.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', stats);

    console.log('All tests passed!');
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

test();
