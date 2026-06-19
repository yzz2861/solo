const dayjs = require('dayjs');
const http = require('http');

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('=== Reservation Core Function Test ===\n');

  const login = await request('POST', '/api/auth/login', {
    username: 'student1', password: '123456'
  });
  const token = login.data.token;
  console.log('[OK] Student login');

  const libLogin = await request('POST', '/api/auth/login', {
    username: 'librarian', password: '123456'
  });
  const libToken = libLogin.data.token;
  console.log('[OK] Librarian login');

  const startTime = dayjs().add(2, 'hour').format('YYYY-MM-DD HH:mm:ss');
  const endTime = dayjs().add(4, 'hour').format('YYYY-MM-DD HH:mm:ss');
  console.log('\nReservation time:', startTime, '-', endTime);

  const create = await request('POST', '/api/reservations', {
    room_id: 1,
    contact_name: 'Test User',
    contact_phone: '13900001111',
    group_size: 4,
    start_time: startTime,
    end_time: endTime,
    purpose: 'Test reservation',
  }, token);

  console.log('\n--- 1. Create Reservation ---');
  console.log('Status:', create.status, create.status === 201 ? '[OK]' : '[FAIL]');
  if (create.status === 201) {
    console.log('  ID:', create.data.id);
    console.log('  Status:', create.data.status);
    console.log('  Room:', create.data.room_name);
    console.log('  Check-in deadline:', create.data.check_in_deadline);
  } else {
    console.log('  Error:', create.data.error);
  }

  const reservationId = create.data ? create.data.id : null;

  console.log('\n--- 2. Time Conflict Detection ---');
  const conflict = await request('POST', '/api/reservations', {
    room_id: 1,
    contact_name: 'Conflict',
    contact_phone: '13900002222',
    group_size: 3,
    start_time: startTime,
    end_time: endTime,
    purpose: 'Conflict test',
  }, token);
  console.log('Status:', conflict.status, conflict.status === 400 ? '[OK] Correctly rejected' : '[FAIL]');
  console.log('Error:', conflict.data.error);

  console.log('\n--- 3. Multi-room Overlap Detection ---');
  const overlap = await request('POST', '/api/reservations', {
    room_id: 2,
    contact_name: 'Overlap',
    contact_phone: '13900003333',
    group_size: 3,
    start_time: startTime,
    end_time: endTime,
    purpose: 'Overlap test',
  }, token);
  console.log('Status:', overlap.status, overlap.status === 400 ? '[OK] Correctly rejected' : '[FAIL]');
  console.log('Error:', overlap.data.error);

  console.log('\n--- 4. My Reservations ---');
  const my = await request('GET', '/api/reservations/my', null, token);
  console.log('Status:', my.status, my.status === 200 ? '[OK]' : '[FAIL]');
  console.log('Total:', my.data.pagination.total);

  console.log('\n--- 5. Librarian View All ---');
  const all = await request('GET', '/api/reservations?page=1&page_size=10', null, libToken);
  console.log('Status:', all.status, all.status === 200 ? '[OK]' : '[FAIL]');
  console.log('Total:', all.data.pagination.total);

  console.log('\n--- 6. Manual Release by Librarian ---');
  const release = await request('POST', '/api/reservations/' + reservationId + '/release', {
    reason: 'Equipment issue',
    remark: 'Projector not working',
  }, libToken);
  console.log('Status:', release.status, release.status === 200 ? '[OK]' : '[FAIL]');
  if (release.status === 200) {
    console.log('  New status:', release.data.status);
  }

  console.log('\n--- 7. Release Log ---');
  const logs = await request('GET', '/api/reservations/' + reservationId + '/release-log', null, libToken);
  console.log('Status:', logs.status, logs.status === 200 ? '[OK]' : '[FAIL]');
  if (logs.data.length > 0) {
    const log = logs.data[0];
    console.log('  Type:', log.release_type);
    console.log('  Reason:', log.reason);
    console.log('  Remark:', log.remark);
  }

  console.log('\n--- 8. Stats Overview ---');
  const stats = await request('GET', '/api/stats/overview', null, libToken);
  console.log('Status:', stats.status, stats.status === 200 ? '[OK]' : '[FAIL]');
  console.log('  Total reservations:', stats.data.total_reservations);
  console.log('  Manual releases:', stats.data.manual_release_count);
  console.log('  Utilization rate:', stats.data.utilization_rate + '%');

  console.log('\n=== All tests completed ===');
}

test().catch(console.error);
