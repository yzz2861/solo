declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database
  }

  interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string, params?: any[]): QueryResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  interface Statement {
    run(params?: any[]): void
    get(params?: any[]): any[]
    all(params?: any[]): any[][]
  }

  interface QueryResult {
    columns: string[]
    values: any[][]
  }

  function initSqlJs(options?: any): Promise<SqlJsStatic>
  export default initSqlJs
  export type { Database, Statement, QueryResult, SqlJsStatic }
}
