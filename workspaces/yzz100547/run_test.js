const { execSync } = require('child_process');

try {
  const output = execSync('./node_modules/.bin/jest tests/utils/phone.test.ts --no-coverage', {
    encoding: 'utf8',
    timeout: 120000,
    cwd: __dirname,
  });
  console.log('=== TEST OUTPUT ===');
  console.log(output);
} catch (e) {
  console.log('=== TEST FAILED ===');
  console.log('Exit code:', e.status);
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}
