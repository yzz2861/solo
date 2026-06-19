import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { User } from '../entities/User';
import { Tenant } from '../entities/Tenant';
import { Visitor } from '../entities/Visitor';
import { WifiApplication } from '../entities/WifiApplication';
import { OperationLog } from '../entities/OperationLog';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || './data/visitor_wifi.db',
  entities: [User, Tenant, Visitor, WifiApplication, OperationLog],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
