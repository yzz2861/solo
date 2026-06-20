const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
    };

    let postData = '';

    if (data) {
      options.headers = { 'Content-Type': 'application/json' };
      postData = JSON.stringify(data);
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
    if (postData) req.write(postData);
    req.end();
  });
}

function requestForm(method, path, fields) {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary' + Date.now();
    let postData = '';
    for (const key in fields) {
      postData += '--' + boundary + '\r\n';
      postData += 'Content-Disposition: form-data; name="' + key + '"\r\n\r\n';
      postData += fields[key] + '\r\n';
    }
    postData += '--' + boundary + '--\r\n';

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

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
    req.write(postData);
    req.end();
  });
}

function getRecentDate(daysAgo = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

async function runTests() {
  console.log('=== 校园失物认领服务 API 测试 ===\n');

  console.log('1. 健康检查');
  const health = await request('GET', '/api/health');
  console.log('   状态:', health.status, '-', health.data.message);

  const today = getRecentDate(0).substring(0, 10);
  const year = parseInt(today.substring(0, 4));
  const month = parseInt(today.substring(5, 7));

  console.log('\n2. 登记失物 - 水杯');
  const item1 = await requestForm('POST', '/api/items', {
    type: '水杯',
    brand: '膳魔师',
    color: '蓝色',
    features: '有校徽贴纸，杯盖有划痕',
    location: '图书馆3楼自习室',
    found_time: getRecentDate(2),
    storage_location: '保卫处1号室',
    locker_number: 'A-012',
    is_valuable: '0'
  });
  console.log('   状态:', item1.status);
  if (item1.status === 201) {
    console.log('   物品ID:', item1.data.item?.id);
    console.log('   保管柜:', item1.data.item?.locker_number);
  } else {
    console.log('   错误:', item1.data.error || item1.data);
  }

  console.log('\n3. 登记失物 - 耳机（贵重物品）');
  const item2 = await requestForm('POST', '/api/items', {
    type: '耳机',
    brand: 'AirPods',
    color: '白色',
    features: 'Pro2代，充电盒有刻字',
    location: '教学楼A座201',
    found_time: getRecentDate(1),
    storage_location: '保卫处保险柜',
    locker_number: 'SAFE-001',
    is_valuable: '1',
    storage_period_days: '60'
  });
  console.log('   状态:', item2.status);
  if (item2.status === 201) {
    console.log('   物品ID:', item2.data.item?.id);
    console.log('   贵重物品:', item2.data.item?.is_valuable === 1 ? '是' : '否');
  } else {
    console.log('   错误:', item2.data.error || item2.data);
  }

  console.log('\n4. 登记失物 - 校园卡');
  const item3 = await requestForm('POST', '/api/items', {
    type: '校园卡',
    color: '蓝色',
    features: '有照片，学号尾号1234',
    location: '食堂二楼',
    found_time: getRecentDate(0),
    storage_location: '保卫处1号室',
    locker_number: 'B-005',
    is_valuable: '0'
  });
  console.log('   状态:', item3.status);
  if (item3.status === 201) {
    console.log('   物品ID:', item3.data.item?.id);
  } else {
    console.log('   错误:', item3.data.error || item3.data);
  }

  console.log('\n5. 获取物品列表');
  const list = await request('GET', '/api/items?page=1&limit=10');
  console.log('   状态:', list.status);
  console.log('   总数:', list.data.pagination?.total);
  console.log('   物品数:', list.data.items?.length);
  if (list.data.items) {
    list.data.items.forEach(item => {
      console.log('    -', item.id, item.type, item.status, item.locker_number);
    });
  }

  console.log('\n6. 库存统计');
  const stats = await request('GET', '/api/items/stats');
  console.log('   状态:', stats.status);
  console.log('   总计:', stats.data.total);
  console.log('   待认领:', stats.data.pending);
  console.log('   按类型:', JSON.stringify(stats.data.by_type));

  const item1Id = item1.data.item?.id;
  const item2Id = item2.data.item?.id;
  if (!item1Id || !item2Id) {
    console.log('\n!!! 失物登记失败，后续测试无法继续 !!!');
    return;
  }

  console.log('\n7. 提交认领申请 - 水杯（第一个人）');
  const claim1 = await request('POST', '/api/claims', {
    item_id: item1Id,
    applicant_name: '张三',
    applicant_phone: '13800138001',
    student_id: '2023001001',
    id_last_four: '1234',
    description: '蓝色膳魔师水杯，有校徽贴纸'
  });
  console.log('   状态:', claim1.status);
  if (claim1.status === 201) {
    console.log('   申请ID:', claim1.data.claim?.id);
    console.log('   消息:', claim1.data.message);
  } else {
    console.log('   错误:', claim1.data.error || claim1.data);
  }

  console.log('\n8. 提交认领申请 - 水杯（第二个人，触发争议）');
  const claim2 = await request('POST', '/api/claims', {
    item_id: item1Id,
    applicant_name: '李四',
    applicant_phone: '13800138002',
    student_id: '2023002002',
    id_last_four: '5678',
    description: '蓝色水杯，杯盖有划痕，是我的'
  });
  console.log('   状态:', claim2.status);
  if (claim2.status === 201) {
    console.log('   消息:', claim2.data.message);
  } else {
    console.log('   错误:', claim2.data.error || claim2.data);
  }

  console.log('\n9. 检查水杯状态（应为争议中 disputed）');
  const item1Detail = await request('GET', '/api/items/' + item1Id);
  console.log('   物品状态:', item1Detail.data.item?.status);
  console.log('   申请数量:', item1Detail.data.claims?.length);

  const claim1Id = claim1.data.claim?.id;
  if (!claim1Id) {
    console.log('\n!!! 认领申请失败，后续测试无法继续 !!!');
    return;
  }

  console.log('\n10. 一次核验 - 通过第一个申请');
  const verify1 = await request('POST', '/api/claims/' + claim1Id + '/verify/first', {
    verifier: '张保卫',
    pass: true
  });
  console.log('   状态:', verify1.status);
  console.log('   结果:', verify1.data.message || verify1.data.error);

  console.log('\n11. 耳机认领申请（贵重物品）');
  const claim3 = await request('POST', '/api/claims', {
    item_id: item2Id,
    applicant_name: '王五',
    applicant_phone: '13900139001',
    student_id: '2022003003',
    id_last_four: '9012',
    description: '白色AirPods Pro2，充电盒刻有名字'
  });
  console.log('   状态:', claim3.status);
  if (claim3.status === 201) {
    console.log('   消息:', claim3.data.message);
  } else {
    console.log('   错误:', claim3.data.error || claim3.data);
  }

  const claim3Id = claim3.data.claim?.id;
  if (claim3Id) {
    console.log('\n12. 贵重物品一次核验');
    const verifyFirst = await request('POST', '/api/claims/' + claim3Id + '/verify/first', {
      verifier: '张保卫',
      pass: true
    });
    console.log('   状态:', verifyFirst.status);
    console.log('   结果:', verifyFirst.data.message || verifyFirst.data.error);
    console.log('   是否需要二次核验:', verifyFirst.data.need_second_verify);

    console.log('\n13. 贵重物品二次核验');
    const verifySecond = await request('POST', '/api/claims/' + claim3Id + '/verify/second', {
      verifier: '李保安',
      pass: true
    });
    console.log('   状态:', verifySecond.status);
    console.log('   结果:', verifySecond.data.message || verifySecond.data.error);

    console.log('\n14. 物品归还 - 耳机');
    const returnItem = await request('POST', '/api/claims/' + claim3Id + '/return', {
      handler: '张保卫',
      receiver_name: '王五',
      receiver_id_last_four: '9012'
    });
    console.log('   状态:', returnItem.status);
    console.log('   结果:', returnItem.data.message || returnItem.data.error);
    if (returnItem.status === 200) {
      console.log('   领取人:', returnItem.data.receiver?.name);
      console.log('   证件后四位:', returnItem.data.receiver?.id_last_four);
      console.log('   经办人:', returnItem.data.handler);
    }
  }

  console.log('\n15. 验证已归还物品不能再申请');
  const claim4 = await request('POST', '/api/claims', {
    item_id: item2Id,
    applicant_name: '赵六',
    applicant_phone: '13700137001',
    description: '试试申请已归还的物品'
  });
  console.log('   状态:', claim4.status);
  console.log('   错误:', claim4.data.error);

  console.log('\n16. 学生查询申请状态（按手机号）');
  const studentClaims = await request('GET', '/api/claims/by-phone/13800138001');
  console.log('   状态:', studentClaims.status);
  console.log('   申请数量:', studentClaims.data.claims?.length);
  if (studentClaims.data.claims?.length > 0) {
    console.log('   最新申请状态:', studentClaims.data.claims[0].status);
  }

  console.log('\n17. 月度汇总');
  const summary = await request('GET', `/api/export/summary?year=${year}&month=${month}`);
  console.log('   状态:', summary.status);
  console.log('   期间:', summary.data.period);
  console.log('   新增物品:', summary.data.summary?.new_items);
  console.log('   新增申请:', summary.data.summary?.new_claims);
  console.log('   已归还:', summary.data.summary?.returned_items);
  console.log('   待认领:', summary.data.summary?.pending_items);
  console.log('   争议物品:', summary.data.summary?.disputed_items);

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
