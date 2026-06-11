import { getDb } from './database.js';
import { seedHazards } from './data/seedData.js';
import fs from 'fs';

async function initDb() {
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
  }
  
  const db = await getDb();
  
  const existing = await db.get('SELECT COUNT(*) as count FROM hazards');
  if (existing.count > 0) {
    console.log('数据库已有数据，跳过初始化');
    process.exit(0);
  }
  
  console.log('正在初始化数据库...');
  
  for (const hazard of seedHazards) {
    await db.run(
      'INSERT INTO hazards (id, boxNumber, location, description, photoUrl, team, deadline, status, rejectCount, isOverdue, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      hazard.id,
      hazard.boxNumber,
      hazard.location,
      hazard.description,
      hazard.photoUrl || null,
      hazard.team,
      hazard.deadline,
      hazard.status,
      hazard.rejectCount,
      hazard.status !== 'CLOSED' && new Date(hazard.deadline) < new Date(new Date().toDateString()) ? 1 : 0,
      hazard.createdAt,
      hazard.createdBy
    );
    
    for (const rect of hazard.rectifications) {
      await db.run(
        'INSERT INTO rectifications (id, hazardId, description, photoUrl, submittedAt, submittedBy) VALUES (?, ?, ?, ?, ?, ?)',
        Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
        hazard.id,
        rect.description,
        rect.photoUrl || null,
        rect.submittedAt,
        rect.submittedBy
      );
    }
    
    for (const review of hazard.reviews) {
      await db.run(
        'INSERT INTO reviews (id, hazardId, passed, comment, reviewedAt, reviewedBy) VALUES (?, ?, ?, ?, ?, ?)',
        Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
        hazard.id,
        review.passed ? 1 : 0,
        review.comment,
        review.reviewedAt,
        review.reviewedBy
      );
    }
  }
  
  console.log('✅ 数据库初始化完成，已导入8条示例数据');
  process.exit(0);
}

initDb().catch(console.error);
