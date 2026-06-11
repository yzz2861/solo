import { getDb } from '../database';
import type { Deposit, DepositInput } from '../../shared/types';

export function getDeposits(bookingId?: number): Deposit[] {
  const db = getDb();
  let sql = `SELECT * FROM deposits`;
  const params: unknown[] = [];

  if (bookingId) {
    sql += ` WHERE booking_id = ?`;
    params.push(bookingId);
  }

  sql += ` ORDER BY created_at DESC`;

  return db.prepare(sql).all(...params) as Deposit[];
}

export function getDepositById(id: number): Deposit | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM deposits WHERE id = ?`).get(id) as Deposit | undefined;
}

export function saveDeposit(deposit: DepositInput): Deposit {
  const db = getDb();

  if (deposit.id) {
    const stmt = db.prepare(`
      UPDATE deposits 
      SET amount = @amount,
          screenshot_path = @screenshot_path,
          paid_at = @paid_at,
          payment_method = @payment_method,
          notes = @notes
      WHERE id = @id
    `);
    stmt.run(deposit);
  } else {
    const stmt = db.prepare(`
      INSERT INTO deposits (booking_id, amount, screenshot_path, paid_at, payment_method, notes)
      VALUES (@booking_id, @amount, @screenshot_path, @paid_at, @payment_method, @notes)
    `);
    const result = stmt.run(deposit);

    if (deposit.paid_at) {
      db.prepare(`
        UPDATE bookings 
        SET status = 'confirmed',
            updated_at = @updated_at
        WHERE id = @bookingId
      `).run({
        bookingId: deposit.booking_id,
        updated_at: new Date().toISOString(),
      });
    }

    return getDepositById(result.lastInsertRowid as number)!;
  }

  return getDepositById(deposit.id)!;
}

export function deleteDeposit(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM deposits WHERE id = ?`).run(id);
  return result.changes > 0;
}

export default { getDeposits, getDepositById, saveDeposit, deleteDeposit };
