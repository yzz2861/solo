const express = require('express');
const cors = require('cors');
const path = require('path');

const { RiskLevel, RiskLevelLabels, RiskLevelPriority, RiskLevelColors, ProcessingStatus, ProcessingStatusLabels } = require('./src/constants');
const MessageClassifier = require('./src/classifier');
const { maskUserInfo } = require('./src/utils');
const sampleMessages = require('./src/sampleData');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const classifier = new MessageClassifier();

const store = {
  messages: [],
  processingResults: new Map(),
  nextId: 1
};

function sortByPriority(messages) {
  return [...messages].sort((a, b) => {
    const riskA = RiskLevelPriority[a.classification?.riskLevel] || 99;
    const riskB = RiskLevelPriority[b.classification?.riskLevel] || 99;
    if (riskA !== riskB) return riskA - riskB;
    return b.timestamp - a.timestamp;
  });
}

function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function initStore() {
  const classified = classifier.classifyBatch(sampleMessages);
  store.messages = classified.map((msg, index) => ({
    ...msg,
    internalId: store.nextId++,
    processing: {
      status: ProcessingStatus.PENDING,
      assignee: null,
      notes: null,
      manualOverride: null,
      handledAt: null,
      handledBy: null,
      createdAt: formatTimestamp(msg.timestamp)
    }
  }));

  store.messages.forEach(msg => {
    store.processingResults.set(msg.id, msg);
  });
}

initStore();

app.get('/api/config', (req, res) => {
  res.json({
    riskLevels: Object.values(RiskLevel).map(level => ({
      value: level,
      label: RiskLevelLabels[level],
      priority: RiskLevelPriority[level],
      color: RiskLevelColors[level]
    })),
    processingStatuses: Object.values(ProcessingStatus).map(status => ({
      value: status,
      label: ProcessingStatusLabels[status]
    }))
  });
});

app.get('/api/messages', (req, res) => {
  const {
    riskLevel,
    status,
    search,
    sortBy = 'priority',
    page = 1,
    pageSize = 50
  } = req.query;

  let result = [...store.messages];

  if (riskLevel && riskLevel !== 'all') {
    result = result.filter(m => m.classification?.riskLevel === riskLevel);
  }

  if (status && status !== 'all') {
    result = result.filter(m => m.processing?.status === status);
  }

  if (search) {
    const keyword = search.toLowerCase();
    result = result.filter(m =>
      m.content.toLowerCase().includes(keyword) ||
      m.username.toLowerCase().includes(keyword) ||
      m.userId.toLowerCase().includes(keyword)
    );
  }

  if (sortBy === 'priority') {
    result = sortByPriority(result);
  } else if (sortBy === 'time_desc') {
    result.sort((a, b) => b.timestamp - a.timestamp);
  } else if (sortBy === 'time_asc') {
    result.sort((a, b) => a.timestamp - b.timestamp);
  }

  const total = result.length;
  const start = (page - 1) * pageSize;
  const paginated = result.slice(start, start + parseInt(pageSize));

  res.json({
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / pageSize),
    data: paginated
  });
});

app.get('/api/messages/:id', (req, res) => {
  const msg = store.processingResults.get(req.params.id);
  if (!msg) {
    return res.status(404).json({ error: '消息不存在' });
  }
  res.json(msg);
});

app.post('/api/classify', (req, res) => {
  const { message, userHistory = [] } = req.body;
  if (!message || !message.content) {
    return res.status(400).json({ error: '缺少消息内容' });
  }
  const classification = classifier.classify(message, userHistory);
  res.json({ message, classification });
});

app.post('/api/classify/batch', (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '消息列表格式错误' });
  }
  const classified = classifier.classifyBatch(messages);
  res.json({ data: classified, total: classified.length });
});

app.post('/api/messages/import', (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '导入数据格式错误' });
  }

  const classified = classifier.classifyBatch(messages);
  const imported = classified.map(msg => {
    const processed = {
      ...msg,
      internalId: store.nextId++,
      processing: {
        status: ProcessingStatus.PENDING,
        assignee: null,
        notes: null,
        manualOverride: null,
        handledAt: null,
        handledBy: null,
        createdAt: formatTimestamp(msg.timestamp || Date.now())
      }
    };
    store.processingResults.set(msg.id, processed);
    return processed;
  });

  store.messages = sortByPriority([...store.messages, ...imported]);

  res.json({
    imported: imported.length,
    total: store.messages.length,
    data: imported.slice(0, 20)
  });
});

app.put('/api/messages/:id/processing', (req, res) => {
  const msg = store.processingResults.get(req.params.id);
  if (!msg) {
    return res.status(404).json({ error: '消息不存在' });
  }

  const { status, assignee, notes, manualOverride, handledBy } = req.body;

  msg.processing = {
    ...msg.processing,
    status: status || msg.processing.status,
    assignee: assignee !== undefined ? assignee : msg.processing.assignee,
    notes: notes !== undefined ? notes : msg.processing.notes,
    manualOverride: manualOverride !== undefined ? manualOverride : msg.processing.manualOverride,
    handledBy: handledBy || msg.processing.handledBy,
    handledAt: [ProcessingStatus.PROCESSED, ProcessingStatus.ESCALATED, ProcessingStatus.DISMISSED].includes(status)
      ? formatTimestamp(Date.now())
      : msg.processing.handledAt
  };

  res.json(msg);
});

app.post('/api/messages/batch-processing', (req, res) => {
  const { ids, status, assignee, notes, handledBy } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: '缺少消息ID列表' });
  }

  const updated = [];
  ids.forEach(id => {
    const msg = store.processingResults.get(id);
    if (msg) {
      msg.processing = {
        ...msg.processing,
        status: status || msg.processing.status,
        assignee: assignee !== undefined ? assignee : msg.processing.assignee,
        notes: notes !== undefined ? notes : msg.processing.notes,
        handledBy: handledBy || msg.processing.handledBy,
        handledAt: [ProcessingStatus.PROCESSED, ProcessingStatus.ESCALATED, ProcessingStatus.DISMISSED].includes(status)
          ? formatTimestamp(Date.now())
          : msg.processing.handledAt
      };
      updated.push({ id, status: 'success' });
    } else {
      updated.push({ id, status: 'not_found' });
    }
  });

  res.json({
    updated: updated.filter(u => u.status === 'success').length,
    results: updated
  });
});

app.get('/api/stats', (req, res) => {
  const stats = {
    total: store.messages.length,
    byRiskLevel: {},
    byStatus: {},
    urgentCount: 0,
    reviewRequiredCount: 0,
    pendingCount: 0,
    processedCount: 0
  };

  Object.values(RiskLevel).forEach(level => {
    stats.byRiskLevel[level] = 0;
  });

  Object.values(ProcessingStatus).forEach(status => {
    stats.byStatus[status] = 0;
  });

  store.messages.forEach(msg => {
    const risk = msg.classification?.riskLevel;
    if (risk) stats.byRiskLevel[risk]++;
    if (msg.classification?.requiresReview) stats.reviewRequiredCount++;
    if ([RiskLevel.SELF_HARM, RiskLevel.OFFLINE_THREAT].includes(risk)) stats.urgentCount++;

    const status = msg.processing?.status;
    if (status) stats.byStatus[status]++;
    if (status === ProcessingStatus.PENDING) stats.pendingCount++;
    if ([ProcessingStatus.PROCESSED, ProcessingStatus.ESCALATED, ProcessingStatus.DISMISSED].includes(status)) {
      stats.processedCount++;
    }
  });

  res.json(stats);
});

app.get('/api/export/report', (req, res) => {
  const { format = 'json', mask = 'true' } = req.query;
  const shouldMask = mask === 'true';

  const reportData = store.messages.map(msg => {
    const user = shouldMask ? maskUserInfo({
      id: msg.userId,
      username: msg.username,
      phone: msg.phone,
      email: msg.email,
      address: msg.address
    }) : {
      id: msg.userId,
      username: msg.username,
      phone: msg.phone,
      email: msg.email
    };

    const displayRiskLevel = msg.processing?.manualOverride || msg.classification?.riskLevel;

    return {
      消息ID: msg.id,
      用户ID: user.id,
      用户昵称: user.username,
      联系方式: shouldMask ? user.phone || user.email : (msg.phone || msg.email || ''),
      消息类型: msg.type === 'comment' ? '评论' : '私信',
      来源: msg.source || '',
      消息内容: msg.content,
      AI风险等级: RiskLevelLabels[msg.classification?.riskLevel] || '未知',
      AI置信度: `${(msg.classification?.confidence * 100).toFixed(1)}%`,
      是否需复核: msg.classification?.requiresReview ? '是' : '否',
      人工修正等级: msg.processing?.manualOverride ? RiskLevelLabels[msg.processing.manualOverride] : '',
      最终风险等级: RiskLevelLabels[displayRiskLevel] || '未知',
      处理状态: ProcessingStatusLabels[msg.processing?.status] || '',
      处理人: msg.processing?.handledBy || '',
      处理备注: msg.processing?.notes || '',
      处理时间: msg.processing?.handledAt || '',
      消息时间: msg.processing?.createdAt || '',
      触发关键词: (msg.classification?.triggers || []).map(t => t.keywords?.join('/') || t.text).join('、'),
      反讽检测: msg.classification?.analysis?.sarcasm?.detected ? '是' : '否',
      方言检测: msg.classification?.analysis?.dialectDetected ? '是' : '否',
      引用内容: msg.classification?.analysis?.quotedContent?.length > 0 ? '是' : '否'
    };
  });

  if (format === 'csv') {
    const headers = Object.keys(reportData[0] || {});
    const csv = [
      headers.join(','),
      ...reportData.map(row =>
        headers.map(h => {
          const value = String(row[h] || '').replace(/"/g, '""');
          return value.includes(',') || value.includes('\n') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="风险分级报告_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } else {
    const summary = {
      生成时间: formatTimestamp(Date.now()),
      消息总数: reportData.length,
      统计: {
        自伤风险: reportData.filter(r => r['最终风险等级'] === '自伤风险').length,
        线下威胁: reportData.filter(r => r['最终风险等级'] === '线下威胁').length,
        人身攻击: reportData.filter(r => r['最终风险等级'] === '人身攻击').length,
        客服跟进: reportData.filter(r => r['最终风险等级'] === '客服跟进').length,
        普通吐槽: reportData.filter(r => r['最终风险等级'] === '普通吐槽').length,
        待复核: reportData.filter(r => r['最终风险等级'] === '待复核').length
      },
      处理情况: {
        待处理: reportData.filter(r => r['处理状态'] === '待处理').length,
        处理中: reportData.filter(r => r['处理状态'] === '处理中').length,
        已处理: reportData.filter(r => ['已处理', '已升级', '已忽略'].includes(r['处理状态'])).length
      },
      数据: reportData
    };

    res.json(summary);
  }
});

app.get('/api/review-queue', (req, res) => {
  const reviewItems = store.messages
    .filter(m => m.classification?.requiresReview || m.classification?.riskLevel === RiskLevel.REVIEW_REQUIRED)
    .sort((a, b) => {
      const confA = a.classification?.confidence || 0;
      const confB = b.classification?.confidence || 0;
      return confA - confB;
    });

  res.json({
    total: reviewItems.length,
    data: reviewItems
  });
});

app.get('/api/urgent-queue', (req, res) => {
  const urgentItems = store.messages
    .filter(m => [RiskLevel.SELF_HARM, RiskLevel.OFFLINE_THREAT].includes(m.classification?.riskLevel))
    .sort((a, b) => {
      const riskA = RiskLevelPriority[a.classification?.riskLevel] || 99;
      const riskB = RiskLevelPriority[b.classification?.riskLevel] || 99;
      if (riskA !== riskB) return riskA - riskB;
      return b.timestamp - a.timestamp;
    });

  res.json({
    total: urgentItems.length,
    selfHarm: urgentItems.filter(m => m.classification?.riskLevel === RiskLevel.SELF_HARM).length,
    offlineThreat: urgentItems.filter(m => m.classification?.riskLevel === RiskLevel.OFFLINE_THREAT).length,
    data: urgentItems
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), messageCount: store.messages.length });
});

app.listen(PORT, () => {
  console.log(`\n🚀 社区留言辱骂风险分级系统后端已启动`);
  console.log(`📡 API 地址: http://localhost:${PORT}`);
  console.log(`📊 测试数据: ${store.messages.length} 条示例消息已加载`);
  console.log(`\n主要接口:`);
  console.log(`  GET  /api/messages          - 获取消息列表（支持筛选、排序、分页）`);
  console.log(`  GET  /api/stats              - 统计概览`);
  console.log(`  GET  /api/urgent-queue       - 紧急风险队列（自伤+线下威胁）`);
  console.log(`  GET  /api/review-queue       - 待人工复核队列`);
  console.log(`  GET  /api/export/report      - 导出报告（支持json/csv，支持脱敏）`);
  console.log(`  POST /api/classify           - 单条消息分类`);
  console.log(`  POST /api/classify/batch     - 批量消息分类`);
  console.log(`  POST /api/messages/import    - 导入消息并自动分类`);
  console.log(`  PUT  /api/messages/:id/processing - 更新处理状态/备注/人工修正`);
  console.log(`\n`);
});
