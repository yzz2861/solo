const { all, get, run } = require('../database');

const extractDates = (text) => {
  const datePatterns = [
    /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/g,
    /(\d{1,2})[-/月](\d{1,2})[日号]/g
  ];
  
  const dates = [];
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let year, month, day;
      if (match[1] && match[2] && match[3] && match[1].length === 4) {
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else if (match[1] && match[2]) {
        year = new Date().getFullYear().toString();
        month = match[1].padStart(2, '0');
        day = match[2].padStart(2, '0');
      }
      if (year && month && day) {
        dates.push({
          date: `${year}-${month}-${day}`,
          original: match[0],
          index: match.index
        });
      }
    }
  }
  return dates;
};

const extractAmounts = (text) => {
  const amountPatterns = [
    /[￥¥](\d+(?:\.\d{1,2})?)/g,
    /(\d+(?:\.\d{1,2})?)[元块]/g,
    /合计[：:]\s*[￥¥]?(\d+(?:\.\d{1,2})?)/g,
    /总计[：:]\s*[￥¥]?(\d+(?:\.\d{1,2})?)/g,
    /实收[：:]\s*[￥¥]?(\d+(?:\.\d{1,2})?)/g,
    /优惠[：:]\s*[￥¥]?(\d+(?:\.\d{1,2})?)/g,
    /折扣[：:]\s*[￥¥]?(\d+(?:\.\d{1,2})?)/g
  ];
  
  const amounts = [];
  for (const pattern of amountPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      amounts.push({
        amount: parseFloat(match[1]),
        original: match[0],
        index: match.index,
        context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + 20))
      });
    }
  }
  return amounts;
};

const extractMedicalItems = (text) => {
  const items = [];
  const keywords = [
    '挂号费', '诊查费', '检查费', '化验费', '治疗费', '手术费',
    '药费', '药品费', '床位费', '护理费', '材料费', 'CT', 'X光',
    '核磁共振', 'B超', '彩超', '心电图', '血常规', '尿常规'
  ];
  
  for (const keyword of keywords) {
    const regex = new RegExp(`(${keyword})[^\\n]{0,50}[￥¥]?(\\d+(?:\\.\\d{1,2})?)?`, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      items.push({
        item: match[1],
        amount: match[2] ? parseFloat(match[2]) : null,
        original: match[0],
        index: match.index
      });
    }
  }
  return items;
};

const extractAccidentDescription = (text) => {
  const accidentKeywords = ['事故', '意外', '受伤', '碰撞', '摔倒', '车祸', '出险', '受伤经过'];
  let description = '';
  let sourceRef = '';
  
  const sentences = text.split(/[。！？.!?\n]/);
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (accidentKeywords.some(kw => sentence.includes(kw)) && sentence.length > 5) {
      description += sentence.trim() + '。';
      if (!sourceRef) {
        sourceRef = `第${i + 1}句`;
      }
    }
  }
  
  return { description: description || null, sourceRef };
};

const findSourceReference = (text, searchText) => {
  if (!text || !searchText) return null;
  
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText.substring(0, Math.min(20, searchText.length)))) {
      return `第${i + 1}行`;
    }
  }
  
  const paragraphs = text.split(/\n\s*\n/);
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].includes(searchText.substring(0, Math.min(30, searchText.length)))) {
      return `第${i + 1}段`;
    }
  }
  
  return null;
};

const detectConflicts = (summaryData, documents, claim) => {
  const conflicts = [];
  
  const allDates = summaryData.allDates || [];
  const accidentDate = claim.accident_date;
  
  if (accidentDate && allDates.length > 0) {
    const medicalDates = allDates.filter(d => d.source === 'medical');
    for (const medDate of medicalDates) {
      if (medDate.date < accidentDate) {
        conflicts.push({
          conflict_type: 'date_conflict',
          description: `病历日期(${medDate.date})早于事故日期(${accidentDate})，存在时间冲突`,
          severity: 'high',
          source_ref: medDate.sourceRef
        });
      }
    }
  }
  
  const invoiceAmounts = summaryData.invoiceAmounts || [];
  const medicalAmounts = summaryData.medicalAmounts || [];
  
  if (invoiceAmounts.length > 0 && medicalAmounts.length > 0) {
    const invoiceTotal = invoiceAmounts.reduce((sum, a) => sum + a.amount, 0);
    const medicalTotal = medicalAmounts.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    if (medicalTotal > 0 && Math.abs(invoiceTotal - medicalTotal) / medicalTotal > 0.1) {
      conflicts.push({
        conflict_type: 'amount_mismatch',
        description: `发票总金额(￥${invoiceTotal.toFixed(2)})与医疗项目费用合计(￥${medicalTotal.toFixed(2)})差异超过10%`,
        severity: 'high'
      });
    }
  }
  
  const discountKeywords = ['折扣', '优惠', '减免', '实收', '实际支付', '自费'];
  for (const doc of documents) {
    if (doc.doc_type === 'invoice' && doc.contents) {
      const content = doc.contents.map(c => c.content).join('\n');
      for (const kw of discountKeywords) {
        if (content.includes(kw)) {
          const sourceRef = findSourceReference(content, kw);
          conflicts.push({
            conflict_type: 'discount_detected',
            description: `检测到发票存在${kw}，需核对实际支付金额与理赔金额`,
            severity: 'medium',
            source_ref: sourceRef || `${doc.file_name}`
          });
          break;
        }
      }
    }
  }
  
  const photoDocs = documents.filter(d => d.doc_type === 'photo');
  if (photoDocs.length > 0) {
    for (const photo of photoDocs) {
      if (photo.file_size < 100 * 1024) {
        conflicts.push({
          conflict_type: 'blurry_photo',
          description: `照片"${photo.file_name}"文件过小(${Math.round(photo.file_size / 1024)}KB)，可能模糊不清`,
          severity: 'medium'
        });
      }
    }
  }
  
  if (conflicts.length === 0) {
    conflicts.push({
      conflict_type: 'amount_accident_check',
      description: '金额与事故经过已自动核对，请人工确认是否匹配',
      severity: 'low'
    });
  }
  
  return conflicts;
};

const detectMissingItems = (documents, summaryData) => {
  const missing = [];
  const docTypes = documents.map(d => d.doc_type);
  
  if (!docTypes.includes('medical')) {
    missing.push({
      item_name: '病历/诊断证明',
      reason: '缺少就诊记录和医生诊断',
      priority: 'required'
    });
  }
  
  if (!docTypes.includes('invoice')) {
    missing.push({
      item_name: '医疗费用发票',
      reason: '缺少费用结算凭证',
      priority: 'required'
    });
  }
  
  if (!docTypes.includes('accident')) {
    missing.push({
      item_name: '事故说明/出险经过',
      reason: '缺少事故发生经过的书面说明',
      priority: 'required'
    });
  }
  
  if (!docTypes.includes('photo')) {
    missing.push({
      item_name: '事故/伤情照片',
      reason: '缺少现场或伤情照片佐证',
      priority: 'optional'
    });
  }
  
  const medicalDocs = documents.filter(d => d.doc_type === 'medical');
  for (const medDoc of medicalDocs) {
    if (medDoc.contents && medDoc.contents.length > 0) {
      const content = medDoc.contents.map(c => c.content).join('\n');
      if (!content.includes('诊断') && !content.includes('诊断结论')) {
        missing.push({
          item_name: '诊断结论',
          reason: '病历中未发现明确诊断结论',
          priority: 'required'
        });
      }
      if (!content.includes('医生签名') && !content.includes('医师') && !content.includes('主治')) {
        missing.push({
          item_name: '医生签章',
          reason: '病历未发现医生签名或签章',
          priority: 'optional'
        });
      }
    }
  }
  
  const invoiceDocs = documents.filter(d => d.doc_type === 'invoice');
  for (const invDoc of invoiceDocs) {
    if (invDoc.contents && invDoc.contents.length > 0) {
      const content = invDoc.contents.map(c => c.content).join('\n');
      if (!content.includes('发票专用章') && !content.includes('收费章')) {
        missing.push({
          item_name: '收费印章',
          reason: '发票未发现收费专用章',
          priority: 'required'
        });
      }
    }
  }
  
  return missing;
};

const generateFollowUpPoints = (conflicts, missing, summaryData) => {
  const points = [];
  
  if (conflicts.some(c => c.conflict_type === 'date_conflict')) {
    points.push({
      question: '请确认病历日期与事故日期不一致的原因？是否存在既往病史？',
      reason: '时间线存在冲突，需核实就诊与事故的关联性'
    });
  }
  
  if (conflicts.some(c => c.conflict_type === 'amount_mismatch')) {
    points.push({
      question: '请解释发票金额与费用明细存在差异的原因？是否有其他费用？',
      reason: '金额核对存在疑点'
    });
  }
  
  if (conflicts.some(c => c.conflict_type === 'discount_detected')) {
    points.push({
      question: '请提供费用明细和实际支付凭证，确认是否有医保报销或其他渠道支付？',
      reason: '发票存在折扣/优惠，需核实实际损失金额'
    });
  }
  
  if (conflicts.some(c => c.conflict_type === 'blurry_photo')) {
    points.push({
      question: '请重新上传清晰的照片，确保关键信息可见',
      reason: '照片模糊，无法核对信息'
    });
  }
  
  if (missing.some(m => m.priority === 'required')) {
    const requiredItems = missing.filter(m => m.priority === 'required').map(m => m.item_name).join('、');
    points.push({
      question: `请补充提供：${requiredItems}`,
      reason: '缺少必备理赔材料'
    });
  }
  
  const accidentDesc = summaryData.accidentDescription;
  if (!accidentDesc || accidentDesc.length < 20) {
    points.push({
      question: '请详细描述事故发生的时间、地点、原因及经过，是否有第三方责任？',
      reason: '事故经过描述不完整，需确认事故性质和责任划分'
    });
  }
  
  if (summaryData.medicalItems && summaryData.medicalItems.length > 0) {
    const hasInjuryRelated = summaryData.medicalItems.some(item => 
      ['治疗费', '手术费', 'CT', 'X光', '核磁共振'].some(kw => item.item.includes(kw))
    );
    if (!hasInjuryRelated && summaryData.medicalItems.length > 0) {
      points.push({
        question: '请确认所列医疗项目是否与本次事故相关？是否有既往症治疗？',
        reason: '需排查医疗费用与事故的关联性'
      });
    }
  }
  
  return points;
};

const generateSummary = async (claimId, userId) => {
  const claim = await get('SELECT * FROM claims WHERE id = ?', [claimId]);
  if (!claim) {
    throw new Error('理赔案件不存在');
  }
  
  const documents = await all(`
    SELECT d.*, 
           (SELECT GROUP_CONCAT(content, '\n') FROM document_contents dc WHERE dc.document_id = d.id) as combined_content
    FROM documents d
    WHERE d.claim_id = ?
    ORDER BY d.upload_at
  `, [claimId]);
  
  if (documents.length === 0) {
    throw new Error('该案件暂无上传材料，请先上传文档');
  }
  
  const docsWithContents = [];
  for (const doc of documents) {
    const contents = await all(`
      SELECT * FROM document_contents WHERE document_id = ? ORDER BY page_no
    `, [doc.id]);
    docsWithContents.push({
      ...doc,
      contents
    });
  }
  
  const summaryData = {
    allDates: [],
    invoiceAmounts: [],
    medicalAmounts: [],
    medicalItems: [],
    accidentDescription: null
  };
  
  const summaryItems = [];
  
  for (const doc of docsWithContents) {
    const content = doc.contents.map(c => c.content).join('\n');
    if (!content) continue;
    
    if (doc.doc_type === 'medical') {
      const dates = extractDates(content);
      for (const d of dates) {
        const sourceRef = `${doc.file_name} ${findSourceReference(content, d.original) || ''}`;
        summaryData.allDates.push({ ...d, source: 'medical', sourceRef, docId: doc.id });
        
        summaryItems.push({
          category: 'visit_time',
          key: '就诊日期',
          value: d.date,
          source_ref: sourceRef,
          confidence: 0.9
        });
      }
      
      const items = extractMedicalItems(content);
      for (const item of items) {
        const sourceRef = `${doc.file_name} ${findSourceReference(content, item.original) || ''}`;
        summaryData.medicalItems.push({ ...item, sourceRef, docId: doc.id });
        
        summaryItems.push({
          category: 'expense_item',
          key: item.item,
          value: item.amount ? `￥${item.amount.toFixed(2)}` : '待定',
          source_ref: sourceRef,
          confidence: 0.85
        });
      }
    }
    
    if (doc.doc_type === 'invoice') {
      const amounts = extractAmounts(content);
      for (const amt of amounts) {
        const sourceRef = `${doc.file_name} ${findSourceReference(content, amt.original) || ''}`;
        summaryData.invoiceAmounts.push({ ...amt, sourceRef, docId: doc.id });
        
        if (amt.original.includes('合计') || amt.original.includes('总计') || amt.original.includes('实收')) {
          summaryItems.push({
            category: 'expense_total',
            key: amt.original.includes('优惠') || amt.original.includes('折扣') ? '优惠金额' : '发票总金额',
            value: `￥${amt.amount.toFixed(2)}`,
            source_ref: sourceRef,
            confidence: 0.95
          });
        }
      }
    }
    
    if (doc.doc_type === 'accident') {
      const { description, sourceRef } = extractAccidentDescription(content);
      if (description) {
        const fullSourceRef = `${doc.file_name} ${sourceRef || ''}`;
        summaryData.accidentDescription = description;
        
        summaryItems.push({
          category: 'accident_desc',
          key: '事故经过',
          value: description,
          source_ref: fullSourceRef,
          confidence: 0.75
        });
      }
      
      const dates = extractDates(content);
      for (const d of dates) {
        const sourceRef = `${doc.file_name} ${findSourceReference(content, d.original) || ''}`;
        summaryData.allDates.push({ ...d, source: 'accident', sourceRef, docId: doc.id });
        
        summaryItems.push({
          category: 'accident_time',
          key: '事故日期',
          value: d.date,
          source_ref: sourceRef,
          confidence: 0.9
        });
      }
    }
  }
  
  const conflicts = detectConflicts(summaryData, docsWithContents, claim);
  const missingItems = detectMissingItems(docsWithContents, summaryData);
  const followUpPoints = generateFollowUpPoints(conflicts, missingItems, summaryData);
  
  const existingSummary = await get('SELECT id FROM summaries WHERE claim_id = ?', [claimId]);
  let summaryId;
  
  if (existingSummary) {
    await run('DELETE FROM summary_items WHERE summary_id = ?', [existingSummary.id]);
    await run('DELETE FROM conflicts WHERE summary_id = ?', [existingSummary.id]);
    await run('DELETE FROM missing_items WHERE summary_id = ?', [existingSummary.id]);
    await run('DELETE FROM follow_up_points WHERE summary_id = ?', [existingSummary.id]);
    
    await run(`
      UPDATE summaries 
      SET generated_at = CURRENT_TIMESTAMP, 
          generated_by = ?,
          status = 'draft',
          has_manual_revision = 0
      WHERE id = ?
    `, [userId, existingSummary.id]);
    
    summaryId = existingSummary.id;
  } else {
    const result = await run(`
      INSERT INTO summaries (claim_id, generated_by, status)
      VALUES (?, ?, 'draft')
    `, [claimId, userId]);
    summaryId = result.lastID;
  }
  
  for (const item of summaryItems) {
    await run(`
      INSERT INTO summary_items (summary_id, category, key, value, source_ref, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [summaryId, item.category, item.key, item.value, item.source_ref, item.confidence]);
  }
  
  for (const conflict of conflicts) {
    await run(`
      INSERT INTO conflicts (summary_id, conflict_type, description, severity)
      VALUES (?, ?, ?, ?)
    `, [summaryId, conflict.conflict_type, conflict.description, conflict.severity]);
  }
  
  for (const item of missingItems) {
    await run(`
      INSERT INTO missing_items (summary_id, item_name, reason, priority)
      VALUES (?, ?, ?, ?)
    `, [summaryId, item.item_name, item.reason, item.priority]);
  }
  
  for (const point of followUpPoints) {
    await run(`
      INSERT INTO follow_up_points (summary_id, question, reason)
      VALUES (?, ?, ?)
    `, [summaryId, point.question, point.reason]);
  }
  
  return getSummaryDetail(summaryId);
};

const getSummaryDetail = async (summaryId) => {
  const summary = await get(`
    SELECT s.*, c.claim_no, c.customer_name, c.accident_date,
           u.name as generator_name
    FROM summaries s
    LEFT JOIN claims c ON s.claim_id = c.id
    LEFT JOIN users u ON s.generated_by = u.id
    WHERE s.id = ?
  `, [summaryId]);
  
  if (!summary) return null;
  
  const items = await all(`
    SELECT * FROM summary_items WHERE summary_id = ? ORDER BY category, id
  `, [summaryId]);
  
  const conflicts = await all(`
    SELECT * FROM conflicts WHERE summary_id = ? ORDER BY severity DESC, id
  `, [summaryId]);
  
  const missingItems = await all(`
    SELECT * FROM missing_items WHERE summary_id = ? ORDER BY priority DESC, id
  `, [summaryId]);
  
  const followUpPoints = await all(`
    SELECT * FROM follow_up_points WHERE summary_id = ? ORDER BY id
  `, [summaryId]);
  
  const revisions = await all(`
    SELECT r.*, u.name as reviser_name
    FROM revisions r
    LEFT JOIN users u ON r.revised_by = u.id
    WHERE r.summary_id = ?
    ORDER BY r.revised_at DESC
  `, [summaryId]);
  
  const reviews = await all(`
    SELECT sr.*, u.name as supervisor_name
    FROM supervisor_reviews sr
    LEFT JOIN users u ON sr.supervisor_id = u.id
    WHERE sr.summary_id = ?
    ORDER BY sr.reviewed_at DESC
  `, [summaryId]);
  
  const visitTimes = items.filter(i => i.category === 'visit_time');
  const expenseItems = items.filter(i => i.category === 'expense_item');
  const expenseTotals = items.filter(i => i.category === 'expense_total');
  const accidentTime = items.filter(i => i.category === 'accident_time');
  const accidentDesc = items.filter(i => i.category === 'accident_desc');
  
  return {
    summary,
    structured: {
      visit_times: visitTimes,
      accident_time: accidentTime,
      accident_description: accidentDesc,
      expense_items: expenseItems,
      expense_totals: expenseTotals
    },
    conflicts,
    missing_items: missingItems,
    follow_up_points: followUpPoints,
    revisions,
    reviews
  };
};

const updateSummaryItem = async (itemId, newValue, userId, reason) => {
  const item = await get('SELECT * FROM summary_items WHERE id = ?', [itemId]);
  if (!item) {
    throw new Error('摘要项不存在');
  }
  
  if (item.value === newValue) {
    return { message: '值未变化，无需更新' };
  }
  
  await run(`
    UPDATE summary_items 
    SET value = ?, is_manual = 1 
    WHERE id = ?
  `, [newValue, itemId]);
  
  await run(`
    INSERT INTO revisions (summary_id, field_name, old_value, new_value, revised_by, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [item.summary_id, `${item.category}.${item.key}`, item.value, newValue, userId, reason || '人工修正']);
  
  await run(`
    UPDATE summaries SET has_manual_revision = 1 WHERE id = ?
  `, [item.summary_id]);
  
  return getSummaryDetail(item.summary_id);
};

const addManualSummaryItem = async (summaryId, category, key, value, sourceRef, userId) => {
  const result = await run(`
    INSERT INTO summary_items (summary_id, category, key, value, source_ref, confidence, is_manual)
    VALUES (?, ?, ?, ?, ?, 1.0, 1)
  `, [summaryId, category, key, value, sourceRef || '人工添加']);
  
  await run(`
    INSERT INTO revisions (summary_id, field_name, old_value, new_value, revised_by, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [summaryId, `${category}.${key}`, null, value, userId, '人工添加']);
  
  await run(`
    UPDATE summaries SET has_manual_revision = 1 WHERE id = ?
  `, [summaryId]);
  
  return getSummaryDetail(summaryId);
};

const deleteSummaryItem = async (itemId, userId, reason) => {
  const item = await get('SELECT * FROM summary_items WHERE id = ?', [itemId]);
  if (!item) {
    throw new Error('摘要项不存在');
  }
  
  await run(`
    INSERT INTO revisions (summary_id, field_name, old_value, new_value, revised_by, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [item.summary_id, `${item.category}.${item.key}`, item.value, null, userId, reason || '人工删除']);
  
  await run('DELETE FROM summary_items WHERE id = ?', [itemId]);
  
  await run(`
    UPDATE summaries SET has_manual_revision = 1 WHERE id = ?
  `, [item.summary_id]);
  
  return getSummaryDetail(item.summary_id);
};

const updateConflictStatus = async (conflictId, resolved, userId) => {
  const conflict = await get('SELECT * FROM conflicts WHERE id = ?', [conflictId]);
  if (!conflict) {
    throw new Error('冲突记录不存在');
  }
  
  await run(`
    UPDATE conflicts SET resolved = ? WHERE id = ?
  `, [resolved ? 1 : 0, conflictId]);
  
  return getSummaryDetail(conflict.summary_id);
};

const updateMissingItem = async (itemId, updates, userId) => {
  const item = await get('SELECT * FROM missing_items WHERE id = ?', [itemId]);
  if (!item) {
    throw new Error('缺失项不存在');
  }
  
  if (updates.item_name !== undefined) {
    await run(`
      UPDATE missing_items SET item_name = ? WHERE id = ?
    `, [updates.item_name, itemId]);
  }
  if (updates.reason !== undefined) {
    await run(`
      UPDATE missing_items SET reason = ? WHERE id = ?
    `, [updates.reason, itemId]);
  }
  if (updates.priority !== undefined) {
    await run(`
      UPDATE missing_items SET priority = ? WHERE id = ?
    `, [updates.priority, itemId]);
  }
  
  return getSummaryDetail(item.summary_id);
};

const updateFollowUpPoint = async (pointId, updates, userId) => {
  const point = await get('SELECT * FROM follow_up_points WHERE id = ?', [pointId]);
  if (!point) {
    throw new Error('追问点不存在');
  }
  
  if (updates.question !== undefined) {
    await run(`
      UPDATE follow_up_points SET question = ? WHERE id = ?
    `, [updates.question, pointId]);
  }
  if (updates.reason !== undefined) {
    await run(`
      UPDATE follow_up_points SET reason = ? WHERE id = ?
    `, [updates.reason, pointId]);
  }
  
  return getSummaryDetail(point.summary_id);
};

const addMissingItem = async (summaryId, item_name, reason, priority, userId) => {
  await run(`
    INSERT INTO missing_items (summary_id, item_name, reason, priority)
    VALUES (?, ?, ?, ?)
  `, [summaryId, item_name, reason || '', priority || 'required']);
  
  return getSummaryDetail(summaryId);
};

const addFollowUpPoint = async (summaryId, question, reason, userId) => {
  await run(`
    INSERT INTO follow_up_points (summary_id, question, reason)
    VALUES (?, ?, ?)
  `, [summaryId, question, reason || '']);
  
  return getSummaryDetail(summaryId);
};

const deleteMissingItem = async (itemId, userId) => {
  const item = await get('SELECT * FROM missing_items WHERE id = ?', [itemId]);
  if (!item) {
    throw new Error('缺失项不存在');
  }
  
  await run('DELETE FROM missing_items WHERE id = ?', [itemId]);
  return getSummaryDetail(item.summary_id);
};

const deleteFollowUpPoint = async (pointId, userId) => {
  const point = await get('SELECT * FROM follow_up_points WHERE id = ?', [pointId]);
  if (!point) {
    throw new Error('追问点不存在');
  }
  
  await run('DELETE FROM follow_up_points WHERE id = ?', [pointId]);
  return getSummaryDetail(point.summary_id);
};

module.exports = {
  generateSummary,
  getSummaryDetail,
  updateSummaryItem,
  addManualSummaryItem,
  deleteSummaryItem,
  updateConflictStatus,
  updateMissingItem,
  updateFollowUpPoint,
  addMissingItem,
  addFollowUpPoint,
  deleteMissingItem,
  deleteFollowUpPoint
};
