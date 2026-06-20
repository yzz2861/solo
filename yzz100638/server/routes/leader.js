const express = require('express');
const router = express.Router();
const DataStore = require('../store/dataStore');

const store = new DataStore();

router.get('/low-confidence-cases', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cases = await store.getLowConfidenceCases(limit);

    res.json({
      success: true,
      data: cases,
      count: cases.length
    });
  } catch (err) {
    console.error('Get low confidence cases error:', err);
    res.status(500).json({
      success: false,
      error: '获取低置信案件失败',
      details: err.message
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await store.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败',
      details: err.message
    });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const leaderboard = await store.getLeaderboard(startDate, endDate);

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({
      success: false,
      error: '获取排行榜失败',
      details: err.message
    });
  }
});

router.get('/training-cases', async (req, res) => {
  try {
    const trainingCases = await store.getTrainingCases();

    res.json({
      success: true,
      data: trainingCases
    });
  } catch (err) {
    console.error('Get training cases error:', err);
    res.status(500).json({
      success: false,
      error: '获取培训案例失败',
      details: err.message
    });
  }
});

router.get('/training-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const trainingCase = await store.getTrainingCase(id);

    if (!trainingCase) {
      return res.status(404).json({
        success: false,
        error: '培训案例不存在'
      });
    }

    res.json({
      success: true,
      data: trainingCase
    });
  } catch (err) {
    console.error('Get training case error:', err);
    res.status(500).json({
      success: false,
      error: '获取培训案例失败',
      details: err.message
    });
  }
});

router.post('/training-cases', async (req, res) => {
  try {
    const {
      sourceCaseId,
      sourcePlateNumber,
      example,
      improvements,
      trainerNotes,
      confidenceImprovement,
      category,
      createdBy,
    } = req.body;

    if (!example || !example.bad || !example.good) {
      return res.status(400).json({
        success: false,
        error: '缺少正反面示例'
      });
    }

    if (!improvements || improvements.length === 0) {
      return res.status(400).json({
        success: false,
        error: '至少需要一条改进要点'
      });
    }

    const trainingData = {
      sourceCaseId,
      sourcePlateNumber,
      originalDescription: example.bad,
      standardDescription: example.good,
      example,
      improvements,
      trainerNotes: trainerNotes || '',
      confidenceImprovement: confidenceImprovement || 0.3,
      category: category || 'other',
      createdBy,
      isCompleted: false,
    };

    const newTraining = await store.addTrainingCase(trainingData);

    res.json({
      success: true,
      data: newTraining
    });
  } catch (err) {
    console.error('Add training case error:', err);
    res.status(500).json({
      success: false,
      error: '添加培训案例失败',
      details: err.message
    });
  }
});

router.post('/training-cases/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { learnerId, learnerNotes, quizScore } = req.body;

    const updated = await store.updateTrainingCase(id, {
      isCompleted: true,
      completedAt: new Date().toISOString(),
      learnerId,
      learnerNotes: learnerNotes || '',
      quizScore: quizScore || 0,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: '培训案例不存在'
      });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    console.error('Complete training case error:', err);
    res.status(500).json({
      success: false,
      error: '标记完成失败',
      details: err.message
    });
  }
});

router.delete('/training-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await store.deleteTrainingCase(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '培训案例不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (err) {
    console.error('Delete training case error:', err);
    res.status(500).json({
      success: false,
      error: '删除失败',
      details: err.message
    });
  }
});

router.get('/case/:caseId/training-analysis', async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await store.getCase(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: '案件不存在'
      });
    }

    const analysis = generateTrainingAnalysis(caseData);

    res.json({
      success: true,
      data: analysis
    });
  } catch (err) {
    console.error('Get training analysis error:', err);
    res.status(500).json({
      success: false,
      error: '获取培训分析失败',
      details: err.message
    });
  }
});

router.post('/case/:caseId/convert-to-training', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { trainerNotes, createdBy } = req.body;

    const caseData = await store.getCase(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: '案件不存在'
      });
    }

    const analysis = generateTrainingAnalysis(caseData);

    const trainingData = {
      originalCaseId: caseId,
      originalDescription: caseData.originalDescription,
      standardDescription: caseData.finalDescription || caseData.standardDescription,
      issues: analysis.issues,
      improvements: analysis.improvements,
      example: analysis.example,
      trainerNotes: trainerNotes || analysis.trainerNotes,
      createdBy
    };

    const newTraining = await store.addTrainingCase(trainingData);

    res.json({
      success: true,
      data: newTraining
    });
  } catch (err) {
    console.error('Convert to training case error:', err);
    res.status(500).json({
      success: false,
      error: '转换为培训案例失败',
      details: err.message
    });
  }
});

function generateTrainingAnalysis(caseData) {
  const issues = [];
  const improvements = [];
  let trainerNotes = '';

  if (caseData.lowConfidenceFlags && caseData.lowConfidenceFlags.length > 0) {
    for (const flag of caseData.lowConfidenceFlags) {
      issues.push({
        type: flag.type,
        severity: flag.severity,
        problem: flag.message,
        suggestion: flag.suggestion
      });
    }
  }

  if (caseData.trainingNotes && caseData.trainingNotes.length > 0) {
    const note = caseData.trainingNotes[0];
    improvements.push(...(note.improvements || []));
  }

  if (!caseData.accidentTime || !caseData.accidentTime.date) {
    improvements.push('事故日期未填写，应明确记录如"2024年1月15日"');
  }
  if (!caseData.accidentTime || !caseData.accidentTime.time) {
    improvements.push('事故时间未填写，应明确记录如"14时30分"');
  }
  if (!caseData.accidentLocation || !caseData.accidentLocation.road) {
    improvements.push('事故地点不具体，应记录到具体道路和路口');
  }
  if (!caseData.accidentDirection || !caseData.accidentDirection.ourDirection) {
    improvements.push('车辆行驶方向不明确，应说明双方行驶方向');
  }
  if (!caseData.vehicleParts || caseData.vehicleParts.length === 0) {
    improvements.push('损失部位未明确，应逐一列出所有受损部位');
  }
  if (caseData.liabilityClue && caseData.liabilityClue.liability === '待认定') {
    improvements.push('责任判断不明确，应根据现场情况给出初步判断');
  }

  const vagueDirs = caseData.accidentDirection?.hasVagueWords || [];
  if (vagueDirs.length > 0) {
    trainerNotes += `使用了模糊方位词：${vagueDirs.join('、')}。`;
    trainerNotes += '新人培训时应强调使用"由南向北"、"左转"、"掉头"等精确方向词，避免"前面"、"旁边"等模糊表述。';
  }

  const estimatedParts = (caseData.vehicleParts || []).filter(p => p.isEstimated);
  if (estimatedParts.length > 0) {
    trainerNotes += `有${estimatedParts.length}个部位是根据方位推测的：${estimatedParts.map(p => p.name).join('、')}。`;
    trainerNotes += '应提醒查勘员现场仔细检查，不要仅凭方位词推测损失部位，必要时拆检确认。';
  }

  const conflicts = caseData.lowConfidenceFlags?.filter(f => f.type === 'description-conflict') || [];
  if (conflicts.length > 0) {
    trainerNotes += `发现${conflicts.length}处文字与照片描述冲突。`;
    trainerNotes += '应强调"写你所见"，文字描述必须与照片证据一致，发现矛盾时应现场核实。';
  }

  if (!trainerNotes) {
    trainerNotes = '该案件描述较为完整规范，可作为正面案例展示。';
  }

  const example = generateTrainingExample(caseData);

  return {
    originalDescription: caseData.originalDescription,
    standardDescription: caseData.finalDescription || caseData.standardDescription,
    issues,
    improvements,
    example,
    trainerNotes,
    confidenceScore: caseData.confidenceScore
  };
}

function generateTrainingExample(caseData) {
  const original = caseData.originalDescription || '';

  const date = caseData.accidentTime?.date || '2024年1月15日';
  const time = caseData.accidentTime?.time || '14时30分';
  
  const location = caseData.accidentLocation?.road 
    ? `在${caseData.accidentLocation.road}${caseData.accidentLocation.intersection || ''}`
    : '在中关村大街与知春路交叉口';

  const ourDir = caseData.accidentDirection?.ourDirection || '由南向北直行';
  const otherDir = caseData.accidentDirection?.otherDirection 
    ? `，对方${caseData.accidentDirection.otherDirection}` 
    : '，对方由东向西左转';

  const parts = caseData.vehicleParts?.length > 0 
    ? caseData.vehicleParts.map(p => p.name).join('、')
    : '右前保险杠、右前翼子板、右前大灯';

  const damage = caseData.damageDescription?.length > 0 
    ? caseData.damageDescription.map(d => d.type).join('、')
    : '剐蹭、凹陷、破裂';

  const liability = caseData.liabilityClue?.liability !== '待认定'
    ? `${caseData.liabilityClue.liability}：${caseData.liabilityClue.clue}`
    : '对方全责：对方转弯未让直行，应承担全部责任。';

  const goodExample = `${date} ${time}，${location}处，我方${ourDir}${otherDir}时发生碰撞事故，造成我方车辆${parts}${damage}。经初步判断：${liability}`;

  return {
    bad: original,
    good: goodExample,
    explanation: `
【修改说明】
1. 补充了具体时间"${date} ${time}"，避免时间模糊
2. 明确了事故地点"${location}"，便于定位
3. 细化了双方行驶方向"${ourDir}"和"${otherDir}"，责任判断更清晰
4. 详细列出了损失部位"${parts}"，定损依据更充分
5. 明确了责任判断依据，符合"转弯让直行"规则
    `.trim()
  };
}

module.exports = router;
