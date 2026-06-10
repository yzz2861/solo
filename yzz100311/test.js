const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(jsonData);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('========== 矿区车辆拉运 API 测试 ==========\n');

  console.log('1. 批量进场 5 个车次');
  const entryResult = await post('/api/entry/batch', {
    source_batch_no: 'DAY001',
    records: [
      { plate_number: '冀A12345', trip_no: 'T001', driver_name: '张三', entry_time: '2024-06-09 08:00:00', tare_weight: 15.0, material: '铁矿石', origin: '东矿', destination: '选厂', source: 'gate1' },
      { plate_number: '冀B67890', trip_no: 'T002', driver_name: '王五', entry_time: '2024-06-09 08:30:00', tare_weight: 14.0, material: '煤炭', origin: '西矿', source: 'gate1' },
      { plate_number: '冀C11111', trip_no: 'T003', driver_name: '赵六', entry_time: '2024-06-09 09:00:00', tare_weight: 16.0, material: '铁矿石', origin: '东矿', source: 'gate2' },
      { plate_number: '冀D22222', trip_no: 'T004', driver_name: '钱七', entry_time: '2024-06-09 09:30:00', tare_weight: 15.5, material: '石灰石', origin: '北矿', source: 'gate2' },
      { plate_number: '冀E33333', trip_no: 'T005', driver_name: '孙八', entry_time: '2024-06-09 10:00:00', tare_weight: 14.5, material: '煤炭', origin: '西矿', source: 'gate1' }
    ]
  });
  console.log(`   进场成功: ${entryResult.created}, 跳过: ${entryResult.skipped}, 失败: ${entryResult.failed}`);

  console.log('\n2. 批量出场磅单 4 张（含司机不一致和重量差异）');
  const exitResult = await post('/api/exit/batch', {
    source_batch_no: 'EXIT001',
    records: [
      { plate_number: '冀A12345', trip_no: 'T001', driver_name: '张三', exit_time: '2024-06-09 10:00:00', gross_weight: 55.0, tare_weight: 15.0, net_weight: 40.0, weighbridge_no: '地磅1', source: 'wb1' },
      { plate_number: '冀B67890', trip_no: 'T002', driver_name: '王五', exit_time: '2024-06-09 10:30:00', gross_weight: 52.0, tare_weight: 14.0, net_weight: 38.0, weighbridge_no: '地磅1', source: 'wb1' },
      { plate_number: '冀C11111', trip_no: 'T003', driver_name: '赵六替身', exit_time: '2024-06-09 11:00:00', gross_weight: 60.0, tare_weight: 16.0, net_weight: 42.0, weighbridge_no: '地磅2', source: 'wb2' },
      { plate_number: '冀D22222', trip_no: 'T004', driver_name: '钱七', exit_time: '2024-06-09 11:30:00', gross_weight: 56.5, tare_weight: 15.5, net_weight: 41.0, weighbridge_no: '地磅2', source: 'wb2' }
    ]
  });
  console.log(`   出场成功: ${exitResult.created}, 跳过: ${exitResult.skipped}, 失败: ${exitResult.failed}`);

  console.log('\n3. T001 重复进场（制造 duplicate_entry 异常）');
  const dupEntry = await post('/api/entry', {
    plate_number: '冀A12345', trip_no: 'T001', driver_name: '张三', entry_time: '2024-06-09 08:05:00', source: 'gate2'
  });
  console.log(`   异常类型: ${dupEntry.anomalies.join(', ') || '无'}`);

  console.log('\n4. T004 补录差异大的净重（制造 weight_diff_exceeded 异常）');
  const supp = await post('/api/supplementary', {
    plate_number: '冀D22222', trip_no: 'T004', weigh_type: 'net', weight: 45.0, weigh_time: '2024-06-09 12:00:00', source: 'manual'
  });
  console.log(`   异常类型: ${supp.anomalies.join(', ') || '无'}`);

  console.log('\n5. 异常汇总统计');
  const anomalySummary = await get('/api/anomalies/summary?start_date=2024-06-09&end_date=2024-06-09');
  console.log(`   总车次: ${anomalySummary.total_trips}`);
  console.log(`   异常车次: ${anomalySummary.anomaly_trips} (${anomalySummary.anomaly_rate})`);
  console.log(`   明细: 重复进场=${anomalySummary.breakdown.duplicate_entry}, 重量差异=${anomalySummary.breakdown.weight_diff_exceeded}, 缺出场磅单=${anomalySummary.breakdown.missing_exit_weighbridge}, 司机不一致=${anomalySummary.breakdown.driver_mismatch}`);
  console.log(`   已关闭异常: ${anomalySummary.closed_anomalies}, 待处理: ${anomalySummary.open_anomalies}`);

  console.log('\n6. 车次详情（T003 - 司机不一致）');
  const trip3 = await get('/api/trips/3');
  console.log(`   车牌: ${trip3.plate_number}, 车次: ${trip3.trip_no}`);
  console.log(`   状态: ${trip3.status}, 异常: ${trip3.anomaly_list.join(', ') || '无'}`);
  console.log(`   进场司机: ${trip3.entry_records[0]?.driver_name}, 出场司机: ${trip3.exit_records[0]?.driver_name}`);

  console.log('\n7. 提交复核意见并关闭异常（T003 司机不一致）');
  const review = await post('/api/review/3', {
    opinion: '经核实，司机为赵六本人，出场时输入错误，已纠正。',
    reviewer: '调度员李工',
    is_closed: true,
    anomaly_type: 'driver_mismatch'
  });
  console.log(`   ${review.message}`);
  console.log(`   当前状态: ${review.trip.status}, 已关闭: ${review.trip.is_review_closed === 1 ? '是' : '否'}`);

  console.log('\n8. 日终核对报告（JSON）');
  const report = await get('/api/report/daily?date=2024-06-09');
  console.log(`   报告日期: ${report.report_date}`);
  console.log(`   总车次: ${report.summary.total_trips}`);
  console.log(`   已完成: ${report.summary.completed_trips}, 进行中: ${report.summary.in_progress}`);
  console.log(`   异常车次: ${report.summary.anomaly_trips}, 已关闭: ${report.summary.closed_anomalies}`);
  console.log(`   总净重: ${report.weight_summary.total_net_weight} 吨`);
  console.log(`   车辆数: ${report.vehicle_stats.length} 台`);
  console.log(`   物料种类: ${report.material_stats.length} 种`);

  console.log('\n9. 车辆时间线（冀A12345）');
  const timeline = await get('/api/trips/timeline/冀A12345?limit=10');
  console.log(`   车牌: ${timeline.plate_number}, 车次总数: ${timeline.total}`);
  timeline.timeline.forEach(t => {
    console.log(`   - ${t.trip_no}: 状态=${t.status}, 事件数=${t.events.length}`);
  });

  console.log('\n10. 同批次重复导入测试（去重验证）');
  const dupBatch = await post('/api/entry/batch', {
    source_batch_no: 'DAY001',
    records: [
      { plate_number: '冀A12345', trip_no: 'T001', driver_name: '张三', entry_time: '2024-06-09 08:00:00', tare_weight: 15.0, material: '铁矿石' }
    ]
  });
  console.log(`    同批次导入: 成功=${dupBatch.created}, 跳过=${dupBatch.skipped}`);

  console.log('\n========== 测试完成 ==========');
}

runTests().catch(console.error);
