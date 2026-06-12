import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: path.join(__dirname, '../database.sqlite'),
  synchronize: true,
  logging: false,
  entities: [path.join(__dirname, 'entities/**/*.{js,ts}')],
  migrations: [],
  subscribers: [],
});
