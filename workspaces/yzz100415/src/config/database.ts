import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { SealApplication } from '../entities/SealApplication';
import { ApprovalRecord } from '../entities/ApprovalRecord';
import { Attachment } from '../entities/Attachment';
import { OperationLog } from '../entities/OperationLog';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './database.sqlite',
  synchronize: true,
  logging: false,
  entities: [User, SealApplication, ApprovalRecord, Attachment, OperationLog],
  migrations: [],
  subscribers: [],
});
