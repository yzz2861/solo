const express = require('express');
const router = express.Router();
const CompletionEngine = require('../engine/completionEngine');
const DataStore = require('../store/dataStore');

const engine = new CompletionEngine();
const store = new DataStore();

router.post('/complete', async (req, res) => {
  try {
    const { description, photoNotes = [], context = {} } = req.body;

    if (!description || description.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '请输入事故简短描述'
      });
    }

    const result = await engine.complete(description, photoNotes, context);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Completion error:', err);
    res.status(500).json({
      success: false,
      error: '补全处理失败',
      details: err.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { 
      surveyorId,
      plateNumber,
      description, 
      photoNotes = [], 
      context = {},
      completionResult 
    } = req.body;

    if (!surveyorId) {
      return res.status(400).json({
        success: false,
        error: '缺少查勘员ID'
      });
    }

    let result = completionResult;
    if (!result && description) {
      result = await engine.complete(description, photoNotes, context);
    }

    if (!result) {
      return res.status(400).json({
        success: false,
        error: '无法创建案件：缺少描述或补全结果'
      });
    }

    const caseData = {
      surveyorId,
      plateNumber: plateNumber || '未登记',
      originalDescription: description,
      photoNotes,
      context,
      ...result,
      finalDescription: result.standardDescription
    };

    const newCase = await store.createCase(caseData);

    res.json({
      success: true,
      data: newCase
    });
  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({
      success: false,
      error: '创建案件失败',
      details: err.message
    });
  }
});

router.get('/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await store.getCase(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: '案件不存在'
      });
    }

    res.json({
      success: true,
      data: caseData
    });
  } catch (err) {
    console.error('Get case error:', err);
    res.status(500).json({
      success: false,
      error: '获取案件失败',
      details: err.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const filters = {};
    
    if (req.query.surveyorId) filters.surveyorId = req.query.surveyorId;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.lowConfidenceOnly === 'true') filters.lowConfidenceOnly = true;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (req.query.sortBy) filters.sortBy = req.query.sortBy;
    if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const cases = await store.listCases(filters);

    res.json({
      success: true,
      data: cases,
      count: cases.length
    });
  } catch (err) {
    console.error('List cases error:', err);
    res.status(500).json({
      success: false,
      error: '获取案件列表失败',
      details: err.message
    });
  }
});

router.put('/:caseId/confirm', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { 
      finalDescription, 
      confirmedParts, 
      confirmedLiability,
      notes,
      additionalPhotos = []
    } = req.body;

    const confirmedData = {
      finalDescription,
      confirmedParts,
      confirmedLiability,
      notes,
      additionalPhotos
    };

    const updatedCase = await store.confirmCase(caseId, confirmedData);

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        error: '案件不存在'
      });
    }

    res.json({
      success: true,
      data: updatedCase
    });
  } catch (err) {
    console.error('Confirm case error:', err);
    res.status(500).json({
      success: false,
      error: '确认案件失败',
      details: err.message
    });
  }
});

router.post('/:caseId/export', async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await store.getCase(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: '案件不存在'
      });
    }

    const exportData = {
      caseId: caseData.id,
      summaryText: generateSystemSummary(caseData),
      reshootList: caseData.reshootList,
      missingMaterials: caseData.missingMaterials,
      exportTime: new Date().toISOString()
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (err) {
    console.error('Export case error:', err);
    res.status(500).json({
      success: false,
      error: '导出案件失败',
      details: err.message
    });
  }
});

router.post('/:caseId/reshoot/:reshootId', async (req, res) => {
  try {
    const { caseId, reshootId } = req.params;
    const { isCompleted, notes, photoUrl } = req.body;

    const updatedCase = await store.updateReshoot(caseId, reshootId, {
      isCompleted,
      notes,
      photoUrl
    });

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        error: '案件或补拍项不存在'
      });
    }

    res.json({
      success: true,
      data: updatedCase
    });
  } catch (err) {
    console.error('Update reshoot error:', err);
    res.status(500).json({
      success: false,
      error: '更新补拍状态失败',
      details: err.message
    });
  }
});

router.get('/:caseId/reshoot-stats', async (req, res) => {
  try {
    const { caseId } = req.params;
    const stats = await store.getReshootStats(caseId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: '案件不存在'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Get reshoot stats error:', err);
    res.status(500).json({
      success: false,
      error: '获取补拍统计失败',
      details: err.message
    });
  }
});

function generateSystemSummary(caseData) {
  const parts = [];

  parts.push('【事故经过】');
  parts.push(caseData.finalDescription || caseData.standardDescription);
  parts.push('');

  parts.push('【损失部位】');
  if (caseData.confirmedParts && caseData.confirmedParts.length > 0) {
    parts.push(caseData.confirmedParts.map(p => 
      `${p.name}（${p.damage || '待核实'}）`
    ).join('、'));
  } else if (caseData.vehicleParts && caseData.vehicleParts.length > 0) {
    parts.push(caseData.vehicleParts.map(p => p.name).join('、'));
  }
  parts.push('');

  parts.push('【责任判断】');
  if (caseData.confirmedLiability) {
    parts.push(caseData.confirmedLiability);
  } else if (caseData.liabilityClue) {
    parts.push(`${caseData.liabilityClue.liability}：${caseData.liabilityClue.clue}`);
  }
  parts.push('');

  parts.push('【注意事项】');
  if (caseData.lowConfidenceFlags && caseData.lowConfidenceFlags.length > 0) {
    caseData.lowConfidenceFlags.forEach((flag, idx) => {
      parts.push(`${idx + 1}. ${flag.message}`);
    });
  } else {
    parts.push('无特殊注意事项');
  }
  parts.push('');

  if (caseData.missingMaterials && caseData.missingMaterials.length > 0) {
    parts.push('【缺材料提醒】');
    caseData.missingMaterials.forEach((m, idx) => {
      parts.push(`${idx + 1}. ${m.name}：${m.reason}`);
    });
  }

  return parts.join('\n');
}

module.exports = router;
