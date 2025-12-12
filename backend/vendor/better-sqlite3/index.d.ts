declare class Database {
  constructor(filename: string);
  prepare<BindParameters = any>(sql: string): Database.Statement<BindParameters>;
  exec(sql: string): any;
  pragma(statement: string): any;
  close(): void;
}

declare namespace Database {
  interface RunResult {
    changes: number;
    lastInsertRowid: number;
  }

  interface Statement<BindParameters = any> {
    run(params?: BindParameters): RunResult;
    get(params?: BindParameters): any;
    all(params?: BindParameters): any[];
  }
}

export = Database;
