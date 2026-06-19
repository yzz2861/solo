const http = require('http');

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========== Library Study Room API Test ==========\n');

  console.log('1. Student Login');
  const stuLogin = await request('POST', '/api/auth/login', {
    username: 'student1',
    password: '123456',
  });
  const stuOk = stuLogin.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + stuLogin.status + ' - ' + stuOk);
  const stuToken = stuLogin.data.token;
  console.log('   User: ' + stuLogin.data.user.name);

  console.log('\n2. Librarian Login');
  const libLogin = await request('POST', '/api/auth/login', {
    username: 'librarian',
    password: '123456',
  });
  const libOk = libLogin.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + libLogin.status + ' - ' + libOk);
  const libToken = libLogin.data.token;
  console.log('   User: ' + libLogin.data.user.name + ' (' + libLogin.data.user.role + ')');

  console.log('\n3. Get Room List');
  const rooms = await request('GET', '/api/rooms', null, stuToken);
  const roomsOk = rooms.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + rooms.status + ' - ' + roomsOk);
  console.log('   Room count: ' + rooms.data.length);
  rooms.data.forEach(function(r) {
    console.log('   - ' + r.name + ' (capacity: ' + r.capacity + ')');
  });

  const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  const endTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  console.log('\n4. Create Reservation');
  console.log('   Time: ' + startTime + ' ~ ' + endTime);
  const createRes = await request('POST', '/api/reservations', {
    room_id: 1,
    contact_name: 'Test User',
    contact_phone: '13900139001',
    group_size: 4,
    start_time: startTime,
    end_time: endTime,
    purpose: 'Group study',
  }, stuToken);
  const createOk = createRes.status === 201 ? 'OK' : 'FAIL';
  console.log('   Status: ' + createRes.status + ' - ' + createOk);
  if (createRes.status === 201) {
    console.log('   Reservation ID: ' + createRes.data.id);
    console.log('   Status: ' + createRes.data.status);
    console.log('   Check-in deadline: ' + createRes.data.check_in_deadline);
  } else {
    console.log('   Error: ' + createRes.data.error);
  }

  const reservationId = createRes.data ? createRes.data.id : null;

  console.log('\n5. Time Conflict Detection');
  const conflictRes = await request('POST', '/api/reservations', {
    room_id: 1,
    contact_name: 'Test User',
    contact_phone: '13900139001',
    group_size: 3,
    start_time: startTime,
    end_time: endTime,
    purpose: 'Conflict test',
  }, stuToken);
  const conflictOk = conflictRes.status === 400 ? 'OK (correctly rejected)' : 'FAIL';
  console.log('   Status: ' + conflictRes.status + ' - ' + conflictOk);
  console.log('   Error: ' + conflictRes.data.error);

  console.log('\n6. Multi-room Overlap Detection');
  const overlapRes = await request('POST', '/api/reservations', {
    room_id: 2,
    contact_name: 'Test User',
    contact_phone: '13900139001',
    group_size: 3,
    start_time: startTime,
    end_time: endTime,
    purpose: 'Overlap test',
  }, stuToken);
  const overlapOk = overlapRes.status === 400 ? 'OK (correctly rejected)' : 'FAIL';
  console.log('   Status: ' + overlapRes.status + ' - ' + overlapOk);
  console.log('   Error: ' + overlapRes.data.error);

  console.log('\n7. Get My Reservations');
  const myReservations = await request('GET', '/api/reservations/my', null, stuToken);
  const myOk = myReservations.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + myReservations.status + ' - ' + myOk);
  console.log('   Count: ' + (myReservations.data.pagination ? myReservations.data.pagination.total : myReservations.data.length));

  if (reservationId) {
    console.log('\n8. View Reservation Detail');
    const detail = await request('GET', '/api/reservations/' + reservationId, null, stuToken);
    const detailOk = detail.status === 200 ? 'OK' : 'FAIL';
    console.log('   Status: ' + detail.status + ' - ' + detailOk);
  }

  console.log('\n9. Librarian View All Reservations');
  const allReservations = await request('GET', '/api/reservations?page=1&page_size=10', null, libToken);
  const allOk = allReservations.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + allReservations.status + ' - ' + allOk);
  console.log('   Total: ' + allReservations.data.pagination.total);

  console.log('\n10. Librarian Manual Release');
  const releaseRes = await request('POST', '/api/reservations/' + reservationId + '/release', {
    reason: 'Equipment malfunction',
    remark: 'Projector broken, need repair',
  }, libToken);
  const releaseOk = releaseRes.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + releaseRes.status + ' - ' + releaseOk);
  if (releaseRes.status === 200) {
    console.log('   Reservation status: ' + releaseRes.data.status);
  }

  console.log('\n11. View Release Log');
  const releaseLogs = await request('GET', '/api/reservations/' + reservationId + '/release-log', null, libToken);
  const logOk = releaseLogs.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + releaseLogs.status + ' - ' + logOk);
  if (releaseLogs.data.length > 0) {
    const log = releaseLogs.data[0];
    console.log('   Release type: ' + log.release_type);
    console.log('   Reason: ' + log.reason);
    console.log('   Remark: ' + log.remark);
  }

  console.log('\n12. Statistics Overview');
  const stats = await request('GET', '/api/stats/overview', null, libToken);
  const statsOk = stats.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + stats.status + ' - ' + statsOk);
  if (stats.status === 200) {
    console.log('   Total reservations: ' + stats.data.total_reservations);
    console.log('   No-shows: ' + stats.data.no_show_count);
    console.log('   Manual releases: ' + stats.data.manual_release_count);
    console.log('   Utilization rate: ' + stats.data.utilization_rate + '%');
  }

  console.log('\n13. Blacklist Suggestions');
  const suggestions = await request('GET', '/api/stats/blacklist-suggestions', null, libToken);
  const sugOk = suggestions.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + suggestions.status + ' - ' + sugOk);
  console.log('   Suggestion count: ' + suggestions.data.length);

  console.log('\n14. Room Usage Statistics');
  const roomStats = await request('GET', '/api/stats/rooms', null, libToken);
  const rsOk = roomStats.status === 200 ? 'OK' : 'FAIL';
  console.log('   Status: ' + roomStats.status + ' - ' + rsOk);
  if (roomStats.status === 200 && roomStats.data.length > 0) {
    roomStats.data.forEach(function(r) {
      console.log('   - ' + r.name + ': ' + r.reservation_count + ' reservations, ' + r.utilization_rate + '% usage');
    });
  }

  console.log('\n15. User Registration');
  const registerRes = await request('POST', '/api/auth/register', {
    username: 'newstudent',
    password: '123456',
    name: 'New Student',
    phone: '13800001111',
  });
  const regOk = registerRes.status === 201 ? 'OK' : 'FAIL';
  console.log('   Status: ' + registerRes.status + ' - ' + regOk);
  if (registerRes.status === 201) {
    console.log('   New user: ' + registerRes.data.user.name + ' (' + registerRes.data.user.username + ')');
  }

  console.log('\n========== Test Complete ==========');
}

runTests().catch(console.error);
