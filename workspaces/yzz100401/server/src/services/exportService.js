const { get, run, all } = require('../database');
const summaryService = require('./summaryGenerator');

const generateCustomerExport = async (summaryId, userId) => {
  const detail = await summaryService.getSummaryDetail(summaryId);
  if (!detail) {
    throw new Error('摘要不存在');
  }
  
  const { summary, structured, conflicts, missing_items, follow_up_points } = detail;
  
  let content = `尊敬的${summary.customer_name}客户：\n\n`;
  content += `您好！感谢您选择我们的理赔服务。\n\n`;
  content += `您的理赔申请（案件号：${summary.claim_no}）我们已收悉，经初步审核，\n`;
  content += `为了加快理赔处理速度，烦请您补充或确认以下材料：\n\n`;
  
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  content += `一、需要补充的材料\n`;
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (missing_items.length > 0) {
    missing_items.forEach((item, idx) => {
      const priority = item.priority === 'required' ? '【必备】' : '【可选】';
      content += `${idx + 1}. ${priority} ${item.item_name}\n`;
      if (item.reason) {
        content += `   说明：${item.reason}\n`;
      }
      content += `\n`;
    });
  } else {
    content += `材料齐全，无需补充。\n\n`;
  }
  
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  content += `二、需要您确认的问题\n`;
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (follow_up_points.length > 0) {
    follow_up_points.forEach((point, idx) => {
      content += `${idx + 1}. ${point.question}\n`;
      if (point.reason) {
        content += `   原因：${point.reason}\n`;
      }
      content += `\n`;
    });
  } else {
    content += `暂无需要确认的问题。\n\n`;
  }
  
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  content += `三、已提取的案件信息（供您核对）\n`;
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (structured.accident_time.length > 0) {
    content += `【事故日期】\n`;
    structured.accident_time.forEach(item => {
      content += `  ${item.value}\n`;
    });
    content += `\n`;
  }
  
  if (structured.accident_description.length > 0) {
    content += `【事故经过】\n`;
    structured.accident_description.forEach(item => {
      content += `  ${item.value}\n`;
    });
    content += `\n`;
  }
  
  if (structured.visit_times.length > 0) {
    content += `【就诊日期】\n`;
    structured.visit_times.forEach(item => {
      content += `  ${item.value}\n`;
    });
    content += `\n`;
  }
  
  if (structured.expense_items.length > 0) {
    content += `【费用项目】\n`;
    structured.expense_items.forEach(item => {
      content += `  ${item.key}：${item.value}\n`;
    });
    content += `\n`;
  }
  
  if (structured.expense_totals.length > 0) {
    content += `【费用合计】\n`;
    structured.expense_totals.forEach(item => {
      content += `  ${item.key}：${item.value}\n`;
    });
    content += `\n`;
  }
  
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `如有任何疑问，请随时与我们联系。给您带来的不便，深表歉意！\n\n`;
  content += `祝您生活愉快，身体健康！\n\n`;
  content += `理赔服务部\n`;
  content += new Date().toLocaleDateString('zh-CN');
  
  await run(`
    INSERT INTO export_records (claim_id, export_type, exported_by)
    VALUES (?, 'customer', ?)
  `, [summary.claim_id, userId]);
  
  return {
    type: 'customer',
    title: `理赔材料补件通知 - ${summary.claim_no}`,
    content,
    format: 'text'
  };
};

const generateInternalExport = async (summaryId, userId) => {
  const detail = await summaryService.getSummaryDetail(summaryId);
  if (!detail) {
    throw new Error('摘要不存在');
  }
  
  const { summary, structured, conflicts, missing_items, follow_up_points, revisions, reviews } = detail;
  
  let content = `═══════════════════════════════════════════════\n`;
  content += `            理赔案件审核报告（内部版）\n`;
  content += `═══════════════════════════════════════════════\n\n`;
  
  content += `【基本信息】\n`;
  content += `  案件编号：${summary.claim_no}\n`;
  content += `  客户姓名：${summary.customer_name}\n`;
  content += `  事故日期：${summary.accident_date || '未填写'}\n`;
  content += `  生成时间：${summary.generated_at}\n`;
  content += `  生成人员：${summary.generator_name}\n`;
  content += `  摘要状态：${summary.status}\n`;
  content += `  是否人工改判：${summary.has_manual_revision ? '是' : '否'}\n\n`;
  
  content += `───────────────────────────────────────────────\n`;
  content += `【提取信息汇总】\n`;
  content += `───────────────────────────────────────────────\n\n`;
  
  if (structured.accident_time.length > 0) {
    content += `■ 事故日期\n`;
    structured.accident_time.forEach(item => {
      const manual = item.is_manual ? ' [人工]' : '';
      const conf = ` (置信度: ${(item.confidence * 100).toFixed(0)}%)`;
      content += `  ${item.value}${manual}${conf}\n`;
      content += `    来源：${item.source_ref}\n`;
    });
    content += `\n`;
  }
  
  if (structured.accident_description.length > 0) {
    content += `■ 事故经过\n`;
    structured.accident_description.forEach(item => {
      const manual = item.is_manual ? ' [人工]' : '';
      const conf = ` (置信度: ${(item.confidence * 100).toFixed(0)}%)`;
      content += `  ${item.value}${manual}${conf}\n`;
      content += `    来源：${item.source_ref}\n`;
    });
    content += `\n`;
  }
  
  if (structured.visit_times.length > 0) {
    content += `■ 就诊日期\n`;
    structured.visit_times.forEach(item => {
      const manual = item.is_manual ? ' [人工]' : '';
      const conf = ` (置信度: ${(item.confidence * 100).toFixed(0)}%)`;
      content += `  ${item.value}${manual}${conf}\n`;
      content += `    来源：${item.source_ref}\n`;
    });
    content += `\n`;
  }
  
  if (structured.expense_items.length > 0) {
    content += `■ 费用项目\n`;
    structured.expense_items.forEach(item => {
      const manual = item.is_manual ? ' [人工]' : '';
      const conf = ` (置信度: ${(item.confidence * 100).toFixed(0)}%)`;
      content += `  ${item.key}：${item.value}${manual}${conf}\n`;
      content += `    来源：${item.source_ref}\n`;
    });
    content += `\n`;
  }
  
  if (structured.expense_totals.length > 0) {
    content += `■ 费用合计\n`;
    structured.expense_totals.forEach(item => {
      const manual = item.is_manual ? ' [人工]' : '';
      const conf = ` (置信度: ${(item.confidence * 100).toFixed(0)}%)`;
      content += `  ${item.key}：${item.value}${manual}${conf}\n`;
      content += `    来源：${item.source_ref}\n`;
    });
    content += `\n`;
  }
  
  content += `───────────────────────────────────────────────\n`;
  content += `【冲突检测结果】\n`;
  content += `───────────────────────────────────────────────\n\n`;
  
  if (conflicts.length > 0) {
    conflicts.forEach((c, idx) => {
      const severityMap = { high: '【高风险】', medium: '【中风险】', low: '【低风险】' };
      const status = c.resolved ? ' [已解决]' : ' [待处理]';
      content += `${idx + 1}. ${severityMap[c.severity]}${status}\n`;
      content += `   类型：${c.conflict_type}\n`;
      content += `   描述：${c.description}\n`;
      if (c.source_ref) {
        content += `   来源：${c.source_ref}\n`;
      }
      content += `\n`;
    });
  } else {
    content += `未检测到冲突。\n\n`;
  }
  
  content += `───────────────────────────────────────────────\n`;
  content += `【缺失材料清单】\n`;
  content += `───────────────────────────────────────────────\n\n`;
  
  if (missing_items.length > 0) {
    missing_items.forEach((item, idx) => {
      const priority = item.priority === 'required' ? '【必备】' : '【可选】';
      content += `${idx + 1}. ${priority} ${item.item_name}\n`;
      if (item.reason) {
        content += `   原因：${item.reason}\n`;
      }
      content += `\n`;
    });
  } else {
    content += `材料齐全。\n\n`;
  }
  
  content += `───────────────────────────────────────────────\n`;
  content += `【需追问问题清单】\n`;
  content += `───────────────────────────────────────────────\n\n`;
  
  if (follow_up_points.length > 0) {
    follow_up_points.forEach((point, idx) => {
      content += `${idx + 1}. ${point.question}\n`;
      if (point.reason) {
        content += `   原因：${point.reason}\n`;
      }
      content += `\n`;
    });
  } else {
    content += `暂无需要追问的问题。\n\n`;
  }
  
  content += `───────────────────────────────────────────────\n`;
  content += `【人工改判记录】\n`;
  content += `───────────────────────────────────────────────\n\n`;
  
  if (revisions.length > 0) {
    revisions.forEach((rev, idx) => {
      content += `${idx + 1}. 字段：${rev.field_name}\n`;
      content += `   原值：${rev.old_value || '(空)'}\n`;
      content += `   新值：${rev.new_value || '(已删除)'}\n`;
      content += `   操作：${rev.reason}\n`;
      content += `   操作人：${rev.reviser_name}\n`;
      content += `   时间：${rev.revised_at}\n\n`;
    });
  } else {
    content += `暂无人工改判记录。\n\n`;
  }
  
  content += `───────────────────────────────────────────────\n`;
  content += `【主管审核记录】\n`;
  content += `───────────────────────────────────────────────\n\n`;
  
  if (reviews.length > 0) {
    reviews.forEach((review, idx) => {
      const riskMap = { high: '【高风险】', medium: '【中风险】', low: '【低风险】' };
      const status = review.approved ? ' [已通过]' : ' [待确认]';
      content += `${idx + 1}. ${riskMap[review.risk_level]}${status}\n`;
      if (review.risk_notes) {
        content += `   风险说明：${review.risk_notes}\n`;
      }
      content += `   审核人：${review.supervisor_name}\n`;
      content += `   时间：${review.reviewed_at}\n\n`;
    });
  } else {
    content += `暂无主管审核记录。\n\n`;
  }
  
  content += `═══════════════════════════════════════════════\n`;
  content += `  报告生成时间：${new Date().toLocaleString('zh-CN')}\n`;
  content += `  报告生成人：${userId}\n`;
  content += `═══════════════════════════════════════════════\n`;
  
  await run(`
    INSERT INTO export_records (claim_id, export_type, exported_by)
    VALUES (?, 'internal', ?)
  `, [summary.claim_id, userId]);
  
  return {
    type: 'internal',
    title: `理赔审核报告 - ${summary.claim_no}（内部版）`,
    content,
    format: 'text'
  };
};

module.exports = {
  generateCustomerExport,
  generateInternalExport
};
