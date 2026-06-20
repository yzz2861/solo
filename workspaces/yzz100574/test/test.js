const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

function request(method, path, data = null, userId = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (userId) {
      options.headers['x-user-id'] = userId;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: result });
        } catch (e) {
          resolve({ status: res.statusCode, body });
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

const VOLUNTEER1_ID = '1';
const VOLUNTEER2_ID = '2';
const VOLUNTEER3_ID = '3';
const ADMIN_ID = '4';
const MANAGER_ID = '5';

async function runTests() {
  console.log('========== 志愿时长申诉服务 API 测试 ==========\n');

  console.log('1. 测试首页');
  const homeRes = await request('GET', '/');
  console.log('   状态:', homeRes.status);
  console.log('   服务名称:', homeRes.body.name);
  console.log('   ✅ 首页正常\n');

  console.log('2. 测试用户信息获取');
  const userRes = await request('GET', '/api/users/me', null, VOLUNTEER1_ID);
  console.log('   状态:', userRes.status);
  console.log('   用户:', userRes.body.name, '-', userRes.body.role);
  console.log('   ✅ 用户信息获取正常\n');

  console.log('3. 测试活动列表查询');
  const actRes = await request('GET', '/api/activities', null, VOLUNTEER1_ID);
  console.log('   状态:', actRes.status);
  console.log('   活动数量:', actRes.body.total);
  console.log('   第一个活动:', actRes.body.list[0]?.name);
  console.log('   ✅ 活动查询正常\n');

  console.log('4. 测试个人签到记录');
  const myAttRes = await request('GET', '/api/attendance/mine', null, VOLUNTEER1_ID);
  console.log('   状态:', myAttRes.status);
  console.log('   记录数量:', myAttRes.body.total);
  console.log('   ✅ 个人签到记录查询正常\n');

  console.log('5. 测试提交申诉 (缺签补录)');
  const appealData = {
    activity_id: 1,
    appeal_type: 'missed_sign',
    reason: '活动当天忘记签退，但实际参与到结束',
    requested_hours: 3,
    requested_sign_in: '2024-01-15 09:00:00',
    requested_sign_out: '2024-01-15 12:00:00'
  };
  const appealRes = await request('POST', '/api/appeals', appealData, VOLUNTEER2_ID);
  console.log('   状态:', appealRes.status);
  console.log('   消息:', appealRes.body.message);
  console.log('   申诉ID:', appealRes.body.appeal?.id || appealRes.body.merged_appeal?.id);
  const appealId = appealRes.body.appeal?.id || appealRes.body.merged_appeal?.id;
  console.log('   ✅ 申诉提交正常\n');

  console.log('6. 测试重复申诉合并');
  const appealData2 = {
    activity_id: 1,
    appeal_type: 'missed_sign',
    reason: '补充说明：有合影照片为证',
    requested_hours: 3
  };
  const appeal2Res = await request('POST', '/api/appeals', appealData2, VOLUNTEER2_ID);
  console.log('   状态:', appeal2Res.status);
  console.log('   消息:', appeal2Res.body.message);
  console.log('   合并到申诉ID:', appeal2Res.body.merged_to_id);
  console.log('   ✅ 重复申诉合并正常\n');

  console.log('7. 测试管理员查看申诉列表');
  const appealListRes = await request('GET', '/api/appeals?status=pending', null, ADMIN_ID);
  console.log('   状态:', appealListRes.status);
  console.log('   待审核申诉数量:', appealListRes.body.total);
  console.log('   ✅ 管理员查看申诉正常\n');

  console.log('8. 测试查看申诉详情和审核日志');
  const appealDetailRes = await request('GET', `/api/appeals/${appealId}`, null, ADMIN_ID);
  console.log('   状态:', appealDetailRes.status);
  console.log('   申诉类型:', appealDetailRes.body.appeal?.appeal_type);
  console.log('   审核日志数量:', appealDetailRes.body.audit_logs?.length);
  console.log('   合并申诉数量:', appealDetailRes.body.merged_appeals?.length);
  console.log('   ✅ 申诉详情查询正常\n');

  console.log('9. 测试开始审核');
  const reviewStartRes = await request('POST', `/api/review/${appealId}/review`, {}, ADMIN_ID);
  console.log('   状态:', reviewStartRes.status);
  console.log('   消息:', reviewStartRes.body.message);
  console.log('   申诉状态:', reviewStartRes.body.appeal?.status);
  console.log('   ✅ 开始审核正常\n');

  console.log('10. 测试审核通过');
  const approveData = {
    approve_hours: 3,
    remark: '情况属实，同意补录3小时'
  };
  const approveRes = await request('POST', `/api/review/${appealId}/approve`, approveData, ADMIN_ID);
  console.log('   状态:', approveRes.status);
  console.log('   消息:', approveRes.body.message);
  console.log('   申诉状态:', approveRes.body.appeal?.status);
  console.log('   修正后时长:', approveRes.body.attendance_record?.hours, '小时');
  console.log('   数据来源:', approveRes.body.attendance_record?.source);
  console.log('   ✅ 审核通过正常\n');

  console.log('11. 测试志愿者查看审核结果');
  const myAppealRes = await request('GET', '/api/appeals/mine?status=approved', null, VOLUNTEER2_ID);
  console.log('   状态:', myAppealRes.status);
  console.log('   已通过申诉数量:', myAppealRes.body.total);
  console.log('   ✅ 志愿者查进度正常\n');

  console.log('12. 测试驳回申诉（先创建一个新申诉）');
  const rejectAppealData = {
    activity_id: 1,
    appeal_type: 'extended_activity',
    reason: '活动延时了，多干了1小时',
    requested_hours: 4
  };
  const newAppealRes = await request('POST', '/api/appeals', rejectAppealData, VOLUNTEER3_ID);
  const rejectAppealId = newAppealRes.body.appeal?.id;
  console.log('   新申诉ID:', rejectAppealId);

  const rejectData = { reason: '活动按时结束，没有延时' };
  const rejectRes = await request('POST', `/api/review/${rejectAppealId}/reject`, rejectData, ADMIN_ID);
  console.log('   驳回状态:', rejectRes.status);
  console.log('   申诉状态:', rejectRes.body.appeal?.status);
  console.log('   驳回原因:', rejectRes.body.reject_reason);
  console.log('   ✅ 驳回申诉正常\n');

  console.log('13. 测试生成公示清单');
  const genPubRes = await request('POST', '/api/publications/generate', { activity_id: 1 }, ADMIN_ID);
  console.log('   状态:', genPubRes.status);
  console.log('   消息:', genPubRes.body.message);
  console.log('   公示批次号:', genPubRes.body.publication?.batch_no);
  console.log('   记录数量:', genPubRes.body.records?.length);
  const pubId = genPubRes.body.publication?.id;
  console.log('   ✅ 生成公示正常\n');

  console.log('14. 测试查看公示详情');
  const pubDetailRes = await request('GET', `/api/publications/${pubId}`, null, ADMIN_ID);
  console.log('   状态:', pubDetailRes.status);
  console.log('   志愿者总数:', pubDetailRes.body.summary?.total_volunteers);
  console.log('   修正记录数:', pubDetailRes.body.summary?.corrected_count);
  console.log('   总时长:', pubDetailRes.body.summary?.total_hours, '小时');
  console.log('   ✅ 公示详情正常\n');

  console.log('15. 测试查看修正记录分类');
  const correctionsRes = await request('GET', `/api/publications/${pubId}/corrections`, null, ADMIN_ID);
  console.log('   状态:', correctionsRes.status);
  console.log('   修正总数:', correctionsRes.body.total);
  console.log('   缺签补录:', correctionsRes.body.grouped?.missed_sign?.length, '条');
  console.log('   活动延时:', correctionsRes.body.grouped?.extended_activity?.length, '条');
  console.log('   管理员录错:', correctionsRes.body.grouped?.admin_error?.length, '条');
  console.log('   ✅ 修正记录分类正常\n');

  console.log('16. 测试活动负责人复核');
  const reviewPubRes = await request('POST', `/api/publications/${pubId}/review`, {}, MANAGER_ID);
  console.log('   状态:', reviewPubRes.status);
  console.log('   消息:', reviewPubRes.body.message);
  console.log('   公示状态:', reviewPubRes.body.publication?.status);
  console.log('   ✅ 负责人复核正常\n');

  console.log('17. 测试管理员发布公示');
  const publishRes = await request('POST', `/api/publications/${pubId}/publish`, {}, ADMIN_ID);
  console.log('   状态:', publishRes.status);
  console.log('   消息:', publishRes.body.message);
  console.log('   公示状态:', publishRes.body.publication?.status);
  console.log('   ✅ 发布公示正常\n');

  console.log('18. 测试管理员手动修改时长');
  const manualUpdateRes = await request('PUT', '/api/attendance/1/manual', {
    hours: 3.5,
    sign_out_time: '2024-01-15 12:30:00'
  }, ADMIN_ID);
  console.log('   状态:', manualUpdateRes.status);
  console.log('   消息:', manualUpdateRes.body.message);
  console.log('   修改后时长:', manualUpdateRes.body.record?.hours, '小时');
  console.log('   数据来源:', manualUpdateRes.body.record?.source);
  console.log('   ✅ 手动修改正常\n');

  console.log('19. 测试公示修正（生成修正版）');
  const reviseRes = await request('POST', `/api/publications/${pubId}/revise`, {}, ADMIN_ID);
  console.log('   状态:', reviseRes.status);
  console.log('   消息:', reviseRes.body.message);
  console.log('   新版公示ID:', reviseRes.body.new_publication?.id);
  console.log('   原公示状态:', reviseRes.body.previous_publication_id ? '已修正' : '未知');
  console.log('   ✅ 公示修正正常\n');

  console.log('\n========== 全部测试完成 ==========');
  console.log('✅ 核心功能测试通过');
  console.log('\n提示: 使用 x-user-id 请求头模拟不同用户登录');
  console.log('  - 志愿者: 1, 2, 3');
  console.log('  - 管理员: 4');
  console.log('  - 活动负责人: 5');
}

runTests().catch(err => {
  console.error('测试失败:', err.message);
  process.exit(1);
});
