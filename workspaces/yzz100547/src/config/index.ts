import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface Config {
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  dbPath: string;
  dbMode: 'file' | 'memory';
  reviewThresholdPoints: number;
  idempotencyTtl: number;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'default_secret_key_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbPath: process.env.DB_PATH || './database.sqlite',
  dbMode: (process.env.DB_MODE as 'file' | 'memory') || 'file',
  reviewThresholdPoints: parseInt(process.env.REVIEW_THRESHOLD_POINTS || '1000', 10),
  idempotencyTtl: parseInt(process.env.IDEMPOTENCY_TTL || '86400', 10),
};

export default config;
