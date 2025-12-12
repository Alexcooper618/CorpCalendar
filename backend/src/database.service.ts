import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { closeSync, existsSync, mkdirSync, openSync } from 'fs';
import { dirname, resolve } from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db!: Database;
  private readonly dbPath = resolve(
    process.env.SQLITE_PATH ?? '/app/data/calendar.db',
  );

  onModuleInit() {
    const dataDir = dirname(this.dbPath);

    try {
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
        Logger.log(`Created data directory: ${dataDir}`, DatabaseService.name);
      }

      if (!existsSync(this.dbPath)) {
        closeSync(openSync(this.dbPath, 'a'));
        Logger.log(`Created SQLite file: ${this.dbPath}`, DatabaseService.name);
      }
    } catch (err) {
      Logger.error(
        `Failed to prepare SQLite path at ${this.dbPath}: ${String(err)}`,
        undefined,
        DatabaseService.name,
      );
      throw err;
    }

    this.db = new Database(this.dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    Logger.log(`Initialized SQLite database at: ${this.dbPath}`, DatabaseService.name);
  }

  getConnection(): Database {
    return this.db;
  }

  getPath(): string {
    return this.dbPath;
  }
}
