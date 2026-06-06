const http = require('http')

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) })
        } catch (e) {
          resolve({ statusCode: res.statusCode, body })
        }
      })
    })

    req.on('error', reject)

    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

async function runTests() {
  console.log('========== 法援案件补贴核算 API 测试 ==========\n')

  console.log('1. 健康检查')
  const health = await request('GET', '/health')
  console.log(`   状态: ${health.statusCode}`)
  console.log(`   结果: ${JSON.stringify(health.body)}\n`)

  console.log('2. 正常核算 - 民事案件')
  const normalCase = await request('POST', '/api/subsidy/calculate', {
    businessNo: 'FY20260001',
    objectStatus: {
      category: 'civil',
      isRemote: false,
      hasDifficulty: false
    },
    timeWindow: {
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      days: 14
    },
    ruleVersion: 'v2.0',
    operator: '法务人员A'
  })
  console.log(`   状态: ${normalCase.statusCode}`)
  console.log(`   业务结论: ${normalCase.body.data.conclusion}`)
  console.log(`   风险标签: ${normalCase.body.data.riskTags.join(', ')}`)
  console.log(`   下一步动作: ${normalCase.body.data.nextAction}`)
  console.log(`   审计编号: ${normalCase.body.data.auditNo}`)
  console.log(`   补贴金额: ${normalCase.body.data.calculation?.finalAmount}元\n`)

  console.log('3. 缺字段场景')
  const missingCase = await request('POST', '/api/subsidy/calculate', {
    businessNo: 'FY20260002',
    objectStatus: {},
    timeWindow: {},
    ruleVersion: 'v2.0',
    operator: '法务人员B'
  })
  console.log(`   状态: ${missingCase.statusCode}`)
  console.log(`   业务结论: ${missingCase.body.data.conclusion}`)
  console.log(`   风险标签: ${missingCase.body.data.riskTags.join(', ')}`)
  console.log(`   下一步动作: ${missingCase.body.data.nextAction}`)
  console.log(`   缺失字段数: ${missingCase.body.data.exceptionReport?.missingFieldDetails?.length}个\n`)

  console.log('4. 重复提交场景')
  const duplicateCase = await request('POST', '/api/subsidy/calculate', {
    businessNo: 'FY20260001',
    objectStatus: {
      category: 'civil',
      isRemote: false,
      hasDifficulty: false
    },
    timeWindow: {
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      days: 14
    },
    ruleVersion: 'v2.0',
    operator: '法务人员C'
  })
  console.log(`   状态: ${duplicateCase.statusCode}`)
  console.log(`   业务结论: ${duplicateCase.body.data.conclusion}`)
  console.log(`   风险标签: ${duplicateCase.body.data.riskTags.join(', ')}`)
  console.log(`   下一步动作: ${duplicateCase.body.data.nextAction}`)
  console.log(`   是否重复: ${duplicateCase.body.data.exceptionReport?.duplicateInfo?.isDuplicate}\n`)

  console.log('5. 规则冲突场景')
  const conflictCase = await request('POST', '/api/subsidy/calculate', {
    businessNo: 'FY20260003',
    objectStatus: {
      category: 'criminal',
      isRemote: true,
      hasDifficulty: true
    },
    timeWindow: {
      startDate: '2026-02-01',
      endDate: '2026-02-20',
      days: 19
    },
    ruleVersion: 'v1.0',
    operator: '法务人员D'
  })
  console.log(`   状态: ${conflictCase.statusCode}`)
  console.log(`   业务结论: ${conflictCase.body.data.conclusion}`)
  console.log(`   风险标签: ${conflictCase.body.data.riskTags.join(', ')}`)
  console.log(`   下一步动作: ${conflictCase.body.data.nextAction}`)
  console.log(`   冲突数: ${conflictCase.body.data.exceptionReport?.conflictDetails?.length}条\n`)

  console.log('6. 查询审计详情')
  const auditNo = normalCase.body.data.auditNo
  const auditDetail = await request('GET', `/api/subsidy/audit/${auditNo}`)
  console.log(`   状态: ${auditDetail.statusCode}`)
  console.log(`   审计编号: ${auditDetail.body.data.audit.auditNo}`)
  console.log(`   业务编号: ${auditDetail.body.data.audit.businessNo}`)
  console.log(`   任务状态: ${auditDetail.body.data.taskStatus.currentStatus}\n`)

  console.log('7. 数据回放')
  const replay = await request('GET', `/api/subsidy/audit/${auditNo}/replay`)
  console.log(`   状态: ${replay.statusCode}`)
  console.log(`   回放步骤数: ${replay.body.data.replaySteps.length}步`)
  replay.body.data.replaySteps.forEach(step => {
    console.log(`     - 步骤${step.step}: ${step.name}`)
  })
  console.log('')

  console.log('8. 业务历史记录')
  const history = await request('GET', '/api/subsidy/business/FY20260001/history')
  console.log(`   状态: ${history.statusCode}`)
  console.log(`   记录数: ${history.body.data.total}条\n`)

  console.log('9. 人工复核')
  const review = await request('POST', `/api/subsidy/audit/${conflictCase.body.data.auditNo}/review`, {
    operator: '复核主管E',
    reviewResult: 'pass',
    reviewComment: '经复核，确认适用规则，同意发放补贴'
  })
  console.log(`   状态: ${review.statusCode}`)
  console.log(`   复核结果: ${review.body.data.reviewResult}`)
  console.log(`   复核人: ${review.body.data.reviewer}\n`)

  console.log('10. 审计列表')
  const list = await request('GET', '/api/subsidy/audits?pageSize=5&pageNum=1')
  console.log(`   状态: ${list.statusCode}`)
  console.log(`   总记录数: ${list.body.data.total}`)
  console.log(`   当前页: ${list.body.data.pageNum}/${Math.ceil(list.body.data.total / list.body.data.pageSize)}\n`)

  console.log('========== 测试完成 ==========')
}

runTests().catch(console.error)
