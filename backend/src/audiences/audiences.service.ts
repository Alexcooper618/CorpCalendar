import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import Database, { Statement } from 'better-sqlite3';
import { CreateAudienceDto } from './dto/create-audience.dto';
import { UpdateAudienceDto } from './dto/update-audience.dto';
import { randomUUID } from 'crypto';

export interface Audience {
  id: string;
  parentId?: string;
  name: string;
  path: string;
}

interface DbAudience {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
}

@Injectable()
export class AudiencesService implements OnModuleInit {
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
      CREATE TABLE IF NOT EXISTS audiences (
        id TEXT PRIMARY KEY,
        parentId TEXT,
        name TEXT NOT NULL,
        path TEXT NOT NULL
      )
    `);

    this.insertStmt = this.db.prepare(`
      INSERT INTO audiences (id, parentId, name, path)
      VALUES (@id, @parentId, @name, @path)
    `);
    this.selectAllStmt = this.db.prepare(`SELECT * FROM audiences ORDER BY path ASC`);
    this.selectByIdStmt = this.db.prepare(`SELECT * FROM audiences WHERE id = ?`);
    this.updateStmt = this.db.prepare(`
      UPDATE audiences
      SET parentId = @parentId,
          name = @name,
          path = @path
      WHERE id = @id
    `);
    this.deleteStmt = this.db.prepare(`DELETE FROM audiences WHERE id = ?`);
  }

  async findAll(): Promise<Audience[]> {
    const rows = this.selectAllStmt.all() as DbAudience[];
    return rows.map((row) => this.mapRowToAudience(row));
  }

  async create(dto: CreateAudienceDto): Promise<Audience> {
    const audience: Audience = {
      id: randomUUID(),
      parentId: dto.parentId?.trim(),
      name: dto.name.trim(),
      path: dto.path.trim(),
    };

    this.insertStmt.run(this.toDbAudience(audience));
    return audience;
  }

  async update(id: string, dto: UpdateAudienceDto): Promise<Audience> {
    const existing = this.selectByIdStmt.get(id) as DbAudience | undefined;
    if (!existing) {
      throw new NotFoundException('Аудитория не найдена');
    }

    const current = this.mapRowToAudience(existing);
    const updated: Audience = {
      ...current,
      ...dto,
      parentId: dto.parentId?.trim() ?? current.parentId,
      name: dto.name?.trim() ?? current.name,
      path: dto.path?.trim() ?? current.path,
    };

    this.updateStmt.run(this.toDbAudience(updated));
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = this.deleteStmt.run(id);
    if (result.changes === 0) {
      throw new NotFoundException('Аудитория не найдена');
    }
  }

  private mapRowToAudience(row: DbAudience): Audience {
    return {
      ...row,
      parentId: row.parentId ?? undefined,
    };
  }

  private toDbAudience(audience: Audience): DbAudience {
    return {
      ...audience,
      parentId: audience.parentId ?? null,
    };
  }
}
