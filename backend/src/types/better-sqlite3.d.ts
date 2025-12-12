declare module 'better-sqlite3' {
  export interface Statement<TRow = unknown> {
    run(...params: any[]): { changes: number };
    get(...params: any[]): TRow | undefined;
    all(...params: any[]): TRow[];
  }

  export default class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    prepare<TRow = unknown>(source: string): Statement<TRow>;
    exec(source: string): this;
  }
}

