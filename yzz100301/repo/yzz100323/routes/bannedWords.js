const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getBannedWords, runAllRules } = require('../db/ruleEngine');
const { generateBatchId } = require('../db/importer');

router.get('/', (req, res) => {
  try {
    const words = getBannedWords();
    res.json({ words });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const { word, category } = req.body;

  if (!word) {
    return res.status(400).json({ error: '禁用词不能为空' });
  }

  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO banned_words (word, category) VALUES (?, ?)');
    const result = stmt.run(word, category || '其他');

    if (result.changes > 0) {
      const materials = db.prepare('SELECT material_id FROM materials').all();
      const batchId = generateBatchId() + '_banned';
      let hitCount = 0;
      for (const m of materials) {
        const hits = runAllRules(m.material_id, batchId);
        hitCount += hits.filter(h => h.rule_type === 'banned_word' && h.rule_name.includes(word)).length;
      }

      res.json({
        success: true,
        id: result.lastInsertRowid,
        word,
        category: category || '其他',
        newlyHitMaterials: hitCount,
      });
    } else {
      res.json({
        success: false,
        message: '该禁用词已存在',
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const wordRecord = db.prepare('SELECT * FROM banned_words WHERE id = ?').get(id);
    if (!wordRecord) {
      return res.status(404).json({ error: '禁用词不存在' });
    }

    const stmt = db.prepare('DELETE FROM banned_words WHERE id = ?');
    stmt.run(id);

    res.json({
      success: true,
      word: wordRecord.word,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
