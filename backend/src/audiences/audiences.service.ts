import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import Database, { Statement } from 'better-sqlite3';
import { CreateAudienceDto } from './dto/create-audience.dto';
import { UpdateAudienceDto } from './dto/update-audience.dto';
import { randomUUID } from 'crypto';
import { EmployeesService, EmployeeRecord } from '../employees/employees.service';
import { parseDepartmentTree } from './departments.utils';

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
  private readonly logger = new Logger(AudiencesService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly employeesService: EmployeesService,
  ) {}

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
    this.db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS audiences_path_uq ON audiences(path)',
    );

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

  async syncFromEmployees(): Promise<{
    created: number;
    updated: number;
    total: number;
  }> {
    const employees = await this.employeesService.fetchEmployees();
    return this.syncFromEmployeeRecords(employees);
  }

  async syncFromPayload(payload: unknown): Promise<{
    created: number;
    updated: number;
    total: number;
  }> {
    const employees = this.employeesService.normalizeEmployeesPayload(payload);
    return this.syncFromEmployeeRecords(employees);
  }

  private collectDepartments(employees: EmployeeRecord[]): string[] {
    return employees
      .map((employee) => employee.departmentPath ?? employee.department ?? '')
      .filter(
        (department) =>
          typeof department === 'string' && department.trim().length > 0,
      );
  }

  private syncFromEmployeeRecords(employees: EmployeeRecord[]): {
    created: number;
    updated: number;
    total: number;
  } {
    const rawDepartments = this.collectDepartments(employees);
    const nodes = parseDepartmentTree(rawDepartments);

    const existing = this.selectAllStmt.all() as DbAudience[];
    const byPath = new Map<string, DbAudience>(
      existing.map((row) => [row.path, row]),
    );
    const pathToId = new Map<string, string>(
      existing.map((row) => [row.path, row.id]),
    );

    let created = 0;
    let updated = 0;

    for (const node of nodes) {
      const parentId = node.parentPath ? pathToId.get(node.parentPath) : undefined;
      const existingNode = byPath.get(node.path);

      if (existingNode) {
        const needsUpdate =
          existingNode.name !== node.name ||
          (existingNode.parentId ?? undefined) !== parentId;

        if (needsUpdate) {
          this.updateStmt.run({
            id: existingNode.id,
            parentId: parentId ?? null,
            name: node.name,
            path: node.path,
          });
          updated += 1;
        }

        pathToId.set(node.path, existingNode.id);
        continue;
      }

      const audience: Audience = {
        id: randomUUID(),
        parentId,
        name: node.name,
        path: node.path,
      };

      this.insertStmt.run(this.toDbAudience(audience));
      created += 1;
      pathToId.set(node.path, audience.id);
    }

    return { created, updated, total: nodes.length };
  }

  logSyncError(error: unknown): void {
    this.logger.error(
      `Failed to synchronize audiences: ${String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
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
