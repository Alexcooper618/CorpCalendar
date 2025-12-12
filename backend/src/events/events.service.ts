import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface EventItem {
  id: string;
  title: string;
  owner?: string;
  dept?: string;
  startDate: string;
  endDate: string;
  color?: string;
  comment?: string;
}

@Injectable()
export class EventsService {
  private db: Database;
  private insertStmt: Database.Statement;
  private selectAllStmt: Database.Statement;
  private selectByIdStmt: Database.Statement;
  private updateStmt: Database.Statement;
  private deleteStmt: Database.Statement;

  constructor() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'calendar.db');
    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        owner TEXT,
        dept TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        color TEXT,
        comment TEXT
      )
    `);

    this.insertStmt = this.db.prepare(
      `INSERT INTO events (id, title, owner, dept, startDate, endDate, color, comment)
       VALUES (@id, @title, @owner, @dept, @startDate, @endDate, @color, @comment)`,
    );
    this.selectAllStmt = this.db.prepare(
      `SELECT * FROM events ORDER BY startDate ASC, endDate ASC, title ASC`,
    );
    this.selectByIdStmt = this.db.prepare(`SELECT * FROM events WHERE id = ?`);
    this.updateStmt = this.db.prepare(
      `UPDATE events
       SET title = @title,
           owner = @owner,
           dept = @dept,
           startDate = @startDate,
           endDate = @endDate,
           color = @color,
           comment = @comment
       WHERE id = @id`,
    );
    this.deleteStmt = this.db.prepare(`DELETE FROM events WHERE id = ?`);
  }

  async findAll(): Promise<EventItem[]> {
    const rows = this.selectAllStmt.all() as DbEvent[];
    return rows.map((row) => this.mapRowToEvent(row));
  }

  async create(dto: CreateEventDto): Promise<EventItem> {
    this.validateRequiredFields(dto.title, dto.startDate, dto.endDate);

    const start = this.parseDate(dto.startDate, 'start');
    const end = this.parseDate(dto.endDate, 'end');
    this.ensureDateOrder(start, end);

    const event: EventItem = {
      id: randomUUID(),
      title: dto.title.trim(),
      owner: dto.owner?.trim(),
      dept: dto.dept?.trim(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      color: dto.color?.trim(),
      comment: dto.comment?.trim(),
    };

    this.insertStmt.run(this.toDbEvent(event));
    return event;
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventItem> {
    const current = this.selectByIdStmt.get(id) as DbEvent | undefined;

    if (!current) {
      throw new NotFoundException('Событие не найдено');
    }

    const start = dto.startDate
      ? this.parseDate(dto.startDate, 'start')
      : new Date(current.startDate);
    const end = dto.endDate
      ? this.parseDate(dto.endDate, 'end')
      : new Date(current.endDate);

    this.ensureDateOrder(start, end);

    const currentEvent = this.mapRowToEvent(current);

    const updated: EventItem = {
      ...currentEvent,
      ...dto,
      title: dto.title?.trim() ?? currentEvent.title,
      owner: dto.owner?.trim() ?? currentEvent.owner,
      dept: dto.dept?.trim() ?? currentEvent.dept,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      color: dto.color?.trim() ?? currentEvent.color,
      comment: dto.comment?.trim() ?? currentEvent.comment,
    };

    this.updateStmt.run(this.toDbEvent(updated));
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = this.deleteStmt.run(id);
    if (result.changes === 0) {
      throw new NotFoundException('Событие не найдено');
    }
  }

  private mapRowToEvent(row: DbEvent): EventItem {
    return {
      ...row,
      owner: row.owner ?? undefined,
      dept: row.dept ?? undefined,
      color: row.color ?? undefined,
      comment: row.comment ?? undefined,
    };
  }

  private toDbEvent(event: EventItem): DbEvent {
    return {
      ...event,
      owner: event.owner ?? null,
      dept: event.dept ?? null,
      color: event.color ?? null,
      comment: event.comment ?? null,
    };
  }

  private validateRequiredFields(title?: string, startDate?: string, endDate?: string) {
    if (!title?.trim()) {
      throw new BadRequestException('Укажите название события');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('Дата начала и окончания обязательны');
    }
  }

  private parseDate(value: string, kind: 'start' | 'end'): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        kind === 'start'
          ? 'Неверный формат даты начала'
          : 'Неверный формат даты окончания',
      );
    }
    return parsed;
  }

  private ensureDateOrder(start: Date, end: Date) {
    if (end < start) {
      throw new BadRequestException('Дата окончания раньше даты начала');
    }
  }
}

interface DbEvent {
  id: string;
  title: string;
  owner: string | null;
  dept: string | null;
  startDate: string;
  endDate: string;
  color: string | null;
  comment: string | null;
}
