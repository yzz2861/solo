import { getDb } from '../database';
import type { BodyPart } from '../../shared/types';

export function getBodyParts(): BodyPart[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM body_parts ORDER BY category, name`).all() as BodyPart[];
}

export function getSensitiveBodyParts(): BodyPart[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM body_parts WHERE is_sensitive = 1 ORDER BY name`).all() as BodyPart[];
}

export default { getBodyParts, getSensitiveBodyParts };
