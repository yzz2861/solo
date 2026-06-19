import { getDb } from '../database';
import { Activity, ActivityParticipant, ActivityStatus, PointsTransaction, TransactionStatus } from '../models/types';
import { AppError } from '../utils/errors';
import { awardPoints, revokePoints, getTransactionById } from './pointsService';
import { getUserById, getUserPoints } from './userService';

export async function createActivity(name: string, pointsPerPerson: number, description?: string): Promise<Activity> {
  if (pointsPerPerson <= 0) {
    throw new AppError('每人积分必须大于0', 400);
  }

  const db = await getDb();
  const result = await db.run(
    'INSERT INTO activities (name, description, points_per_person) VALUES (?, ?, ?)',
    name,
    description || null,
    pointsPerPerson
  );

  const activity = await db.get('SELECT * FROM activities WHERE id = ?', result.lastID);
  return activity as Activity;
}

export async function getActivityById(id: number): Promise<Activity | null> {
  const db = await getDb();
  const activity = await db.get('SELECT * FROM activities WHERE id = ?', id);
  return activity ? (activity as Activity) : null;
}

export async function listActivities(page: number = 1, pageSize: number = 20): Promise<{ activities: Activity[]; total: number }> {
  const db = await getDb();
  const offset = (page - 1) * pageSize;

  const activities = await db.all(
    'SELECT * FROM activities ORDER BY created_at DESC LIMIT ? OFFSET ?',
    pageSize,
    offset
  );

  const totalResult = await db.get('SELECT COUNT(*) as count FROM activities');
  const total = totalResult?.count || 0;

  return { activities: activities as Activity[], total };
}

export async function addActivityParticipants(
  activityId: number,
  userIds: number[],
  operatorId: number
): Promise<{ participants: ActivityParticipant[]; transactions: PointsTransaction[] }> {
  const db = await getDb();
  const activity = await getActivityById(activityId);

  if (!activity) {
    throw new AppError('活动不存在', 404);
  }

  if (activity.status === 'cancelled') {
    throw new AppError('活动已取消，无法添加参与者', 400);
  }

  const participants: ActivityParticipant[] = [];
  const transactions: PointsTransaction[] = [];

  for (const userId of userIds) {
    const user = await getUserById(userId);
    if (!user) {
      throw new AppError(`用户 ${userId} 不存在`, 404);
    }

    const existing = await db.get(
      'SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      activityId,
      userId
    );

    if (existing) {
      throw new AppError(`用户 ${userId} 已经是该活动的参与者`, 400);
    }

    const transaction = await awardPoints(
      userId,
      activity.points_per_person,
      `参与活动: ${activity.name}`,
      'award',
      undefined,
      operatorId,
      activityId
    );

    const result = await db.run(
      'INSERT INTO activity_participants (activity_id, user_id, points_awarded, transaction_id) VALUES (?, ?, ?, ?)',
      activityId,
      userId,
      activity.points_per_person,
      transaction.id
    );

    const participant = await db.get(
      'SELECT * FROM activity_participants WHERE id = ?',
      result.lastID
    );

    participants.push(participant as ActivityParticipant);
    transactions.push(transaction);
  }

  return { participants, transactions };
}

export async function cancelActivity(activityId: number, operatorId: number): Promise<{ activity: Activity; revokedTransactions: PointsTransaction[] }> {
  const db = await getDb();
  const activity = await getActivityById(activityId);

  if (!activity) {
    throw new AppError('活动不存在', 404);
  }

  if (activity.status === 'cancelled') {
    throw new AppError('活动已经取消', 400);
  }

  const participants = await db.all(
    'SELECT * FROM activity_participants WHERE activity_id = ?',
    activityId
  ) as ActivityParticipant[];

  const revokedTransactions: PointsTransaction[] = [];

  for (const participant of participants) {
    const originalTx = participant.transaction_id
      ? await getTransactionById(participant.transaction_id)
      : null;

    if (originalTx && originalTx.status === 'pending') {
      await db.run(
        'UPDATE points_transactions SET status = ?, review_status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
        'reversed' as TransactionStatus,
        'rejected',
        operatorId,
        new Date().toISOString(),
        originalTx.id
      );

      const currentBalance = await getUserPoints(participant.user_id);
      const result = await db.run(
        `INSERT INTO points_transactions
         (user_id, type, amount, balance_after, related_id, status, description, reviewed_by, review_status, reviewed_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, 'approved', ?)`,
        participant.user_id,
        'revoke',
        participant.points_awarded,
        currentBalance,
        originalTx.id,
        `活动取消: ${activity.name} (撤销待发放积分)`,
        operatorId,
        new Date().toISOString()
      );

      const revokedTx = await db.get('SELECT * FROM points_transactions WHERE id = ?', result.lastID);
      revokedTransactions.push(revokedTx as PointsTransaction);
    } else {
      const revokedTx = await revokePoints(
        participant.user_id,
        participant.points_awarded,
        `活动取消: ${activity.name}`,
        participant.transaction_id,
        operatorId,
        activityId
      );
      revokedTransactions.push(revokedTx);
    }
  }

  await db.run(
    'UPDATE activities SET status = ?, cancelled_at = ? WHERE id = ?',
    'cancelled' as ActivityStatus,
    new Date().toISOString(),
    activityId
  );

  const updatedActivity = await getActivityById(activityId);

  return {
    activity: updatedActivity!,
    revokedTransactions,
  };
}

export async function getActivityParticipants(activityId: number): Promise<ActivityParticipant[]> {
  const db = await getDb();
  const participants = await db.all(
    'SELECT * FROM activity_participants WHERE activity_id = ?',
    activityId
  );
  return participants as ActivityParticipant[];
}
