export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export function todayISO() {
  return new Date().toISOString();
}

export function isOverdueDeadline(deadline) {
  return new Date(deadline) < new Date(new Date().toDateString());
}

export async function updateOverdueStatus() {
  const { getDb } = await import('./database.js');
  const db = await getDb();
  
  const hazards = await db.all('SELECT id, deadline, status FROM hazards');
  
  for (const hazard of hazards) {
    if (hazard.status !== 'CLOSED') {
      const isOverdue = isOverdueDeadline(hazard.deadline) ? 1 : 0;
      await db.run(
        'UPDATE hazards SET isOverdue = ? WHERE id = ?',
        isOverdue,
        hazard.id
      );
    } else {
      await db.run('UPDATE hazards SET isOverdue = 0 WHERE id = ?', hazard.id);
    }
  }
}
