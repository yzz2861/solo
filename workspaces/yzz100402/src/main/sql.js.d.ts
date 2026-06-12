declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  export interface Database {
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string, params?: unknown[]): { columns: string[]; values: unknown[][] }[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface Statement {
    bind(params?: unknown[] | Record<string, unknown>): boolean;
    step(): boolean;
    getAsObject(params?: unknown[]): Record<string, unknown>;
    free(): boolean;
  }

  export default function initSqlJs(config?: {
    locateFile?: (filename: string) => string;
  }): Promise<SqlJsStatic>;
}
