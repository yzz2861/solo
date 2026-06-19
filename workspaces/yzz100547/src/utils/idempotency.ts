import { getDb } from '../database';
import config from '../config';

export async function checkIdempotency(key: string, transactionType: string): Promise<{ exists: boolean; response?: unknown }> {
  const db = await getDb();

  await db.run(
    'DELETE FROM idempotency_keys WHERE expires_at < ?',
    new Date().toISOString()
  );

  const existing = await db.get(
    'SELECT response_data FROM idempotency_keys WHERE key = ? AND transaction_type = ?',
    key,
    transactionType
  );

  if (existing) {
    return {
      exists: true,
      response: existing.response_data ? JSON.parse(existing.response_data) : undefined,
    };
  }

  return { exists: false };
}

export async function saveIdempotencyKey(key: string, transactionType: string, responseData: unknown): Promise<void> {
  const db = await getDb();
  const expiresAt = new Date(Date.now() + config.idempotencyTtl * 1000).toISOString();

  await db.run(
    'INSERT OR REPLACE INTO idempotency_keys (key, transaction_type, response_data, expires_at) VALUES (?, ?, ?, ?)',
    key,
    transactionType,
    JSON.stringify(responseData),
    expiresAt
  );
}
