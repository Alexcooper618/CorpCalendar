import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import Database, { Statement } from 'better-sqlite3';
import { DatabaseService } from '../database.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventType } from './event.types';

export interface EventItem {
  id: string;
  title: string;
  type: EventType;
  owner?: string;
  dept?: string;
  startDate: string;
  endDate: string;
  productId?: string;
  plannedCsiDate?: string;
  color?: string;
  comment?: string;
}

@Injectable()
export class EventsService implements OnModuleInit {
  private db!: Database;
  private insertStmt!: Statement;
  private selectAllStmt!: Statement;
  private selectByIdStmt!: Statement;
  private updateStmt!: Statement;
  private deleteStmt!: Statement;

  constructor(private readonly dbService: DatabaseService) {}

  onModuleInit(): void {
    this.db = this.dbService.getConnection();

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        owner TEXT,
        dept TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        color TEXT,
        comment TEXT,
        type TEXT NOT NULL DEFAULT 'custom',
        productId TEXT,
        plannedCsiDate TEXT
      )
    `);

    this.ensureSchema();

    this.insertStmt = this.db.prepare(
      `INSERT INTO events (id, title, owner, dept, startDate, endDate, color, comment, type, productId, plannedCsiDate)
       VALUES (@id, @title, @owner, @dept, @startDate, @endDate, @color, @comment, @type, @productId, @plannedCsiDate)`,
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
           comment = @comment,
           type = @type,
           productId = @productId,
           plannedCsiDate = @plannedCsiDate
       WHERE id = @id`,
    );
    this.deleteStmt = this.db.prepare(`DELETE FROM events WHERE id = ?`);
  }

  async findAll(): Promise<EventItem[]> {
    const rows = this.selectAllStmt.all() as DbEvent[];
    return rows.map((row) => this.mapRowToEvent(row));
  }

  async create(dto: CreateEventDto): Promise<EventItem> {
    const type = this.normalizeType(dto.type);

    this.validateRequiredFields({
      title: dto.title,
      startDate: dto.startDate,
      endDate: dto.endDate,
      type,
      productId: dto.productId,
    });

    const start = this.parseDate(dto.startDate, 'start');
    const end = this.parseDate(dto.endDate, 'end');
    this.ensureDateOrder(start, end);

    const plannedCsiDate = dto.plannedCsiDate
      ? this.parseDate(dto.plannedCsiDate, 'planned').toISOString()
      : undefined;

    const event: EventItem = {
      id: randomUUID(),
      type,
      title: dto.title.trim(),
      owner: dto.owner?.trim(),
      dept: dto.dept?.trim(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      productId: this.normalizeProductId(dto.productId),
      plannedCsiDate,
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

    const type = this.normalizeType(dto.type ?? currentEvent.type);
    const productId =
      dto.productId !== undefined
        ? this.normalizeProductId(dto.productId)
        : currentEvent.productId;
    const plannedCsiDate =
      dto.plannedCsiDate !== undefined
        ? dto.plannedCsiDate
          ? this.parseDate(dto.plannedCsiDate, 'planned').toISOString()
          : undefined
        : currentEvent.plannedCsiDate;

    const updated: EventItem = {
      ...currentEvent,
      ...dto,
      type,
      title: dto.title?.trim() ?? currentEvent.title,
      owner: dto.owner?.trim() ?? currentEvent.owner,
      dept: dto.dept?.trim() ?? currentEvent.dept,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      productId,
      plannedCsiDate,
      color: dto.color?.trim() ?? currentEvent.color,
      comment: dto.comment?.trim() ?? currentEvent.comment,
    };

    this.validateRequiredFields({
      title: updated.title,
      startDate: updated.startDate,
      endDate: updated.endDate,
      type: updated.type,
      productId: updated.productId,
    });

    this.updateStmt.run(this.toDbEvent(updated));
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = this.deleteStmt.run(id);
    if (result.changes === 0) {
      throw new NotFoundException('Событие не найдено');
    }
  }

  private ensureSchema() {
    const columns = this.db.prepare(`PRAGMA table_info(events)`).all() as {
      name: string;
    }[];

    const addColumnIfMissing = (name: string, definition: string) => {
      const exists = columns.some((column) => column.name === name);
      if (!exists) {
        this.db.exec(`ALTER TABLE events ADD COLUMN ${definition}`);
        columns.push({ name });
      }
    };

    addColumnIfMissing('type', "type TEXT NOT NULL DEFAULT 'custom'");
    addColumnIfMissing('productId', 'productId TEXT');
    addColumnIfMissing('plannedCsiDate', 'plannedCsiDate TEXT');
  }

  private mapRowToEvent(row: DbEvent): EventItem {
    return {
      ...row,
      type: (row.type as EventType) ?? 'custom',
      owner: row.owner ?? undefined,
      dept: row.dept ?? undefined,
      productId: row.productId ?? undefined,
      plannedCsiDate: row.plannedCsiDate ?? undefined,
      color: row.color ?? undefined,
      comment: row.comment ?? undefined,
    };
  }

  private toDbEvent(event: EventItem): DbEvent {
    return {
      ...event,
      owner: event.owner ?? null,
      dept: event.dept ?? null,
      productId: event.productId ?? null,
      plannedCsiDate: event.plannedCsiDate ?? null,
      color: event.color ?? null,
      comment: event.comment ?? null,
    };
  }

  private validateRequiredFields(data: {
    title?: string;
    startDate?: string;
    endDate?: string;
    type: EventType;
    productId?: string;
  }) {
    if (!data.title?.trim()) {
      throw new BadRequestException('Укажите название события');
    }

    if (!data.startDate || !data.endDate) {
      throw new BadRequestException('Дата начала и окончания обязательны');
    }

    this.ensureProductRequirement(data.type, this.normalizeProductId(data.productId));
  }

  private ensureProductRequirement(type: EventType, productId?: string) {
    if (type === 'itProduct' && !productId) {
      throw new BadRequestException('Выберите продукт для события типа IT-продукт');
    }
  }

  private normalizeType(type?: EventType): EventType {
    if (!type) {
      return 'custom';
    }

    if (type === 'custom' || type === 'itProduct') {
      return type;
    }

    throw new BadRequestException('Неизвестный тип события');
  }

  private normalizeProductId(productId?: string): string | undefined {
    const trimmed = productId?.trim();
    return trimmed ? trimmed : undefined;
  }

  private parseDate(value: string, kind: 'start' | 'end' | 'planned'): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      let message = 'Неверный формат даты';
      if (kind === 'start') {
        message = 'Неверный формат даты начала';
      } else if (kind === 'end') {
        message = 'Неверный формат даты окончания';
      } else {
        message = 'Неверный формат плановой даты CSI';
      }
      throw new BadRequestException(message);
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
  type: EventType;
  owner: string | null;
  dept: string | null;
  startDate: string;
  endDate: string;
  productId: string | null;
  plannedCsiDate: string | null;
  color: string | null;
  comment: string | null;
}
