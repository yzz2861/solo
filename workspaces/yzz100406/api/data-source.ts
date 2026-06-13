import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import path from 'path';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dataSource: DataSource;

export async function initializeDataSource(): Promise<DataSource> {
  const sqlJsWasmPath = path.join(
    __dirname,
    '../node_modules/sql.js/dist/sql-wasm.wasm'
  );

  const sqlJs = await initSqlJs({
    locateFile: () => sqlJsWasmPath
  });

  const dbPath = path.join(__dirname, '../database.sqlite');

  dataSource = new DataSource({
    type: 'sqljs',
    location: dbPath,
    autoSave: true,
    synchronize: true,
    logging: false,
    entities: [path.join(__dirname, 'entities/**/*.{js,ts}')],
    migrations: [],
    subscribers: [],
  } as any);

  await dataSource.initialize();
  return dataSource;
}

export function getDataSource(): DataSource {
  return dataSource;
}

export const AppDataSource = new Proxy({} as DataSource, {
  get(_target, prop) {
    if (dataSource && prop in dataSource) {
      return (dataSource as any)[prop];
    }
    return undefined;
  }
});
