import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import Database, { Statement } from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface Product {
  id: string;
  year: number;
  cluster: string;
  name: string;
  code?: string;
  owner?: string;
  status?: string;
  sourceSystem?: string;
  description?: string;
  po: string;
  businessCustomers: string;
  audienceId?: string;
  plannedCsiDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface DbProduct {
  id: string;
  year: number;
  cluster: string;
  name: string;
  code: string | null;
  owner: string | null;
  status: string | null;
  sourceSystem: string | null;
  description: string | null;
  po: string;
  businessCustomers: string;
  audienceId: string | null;
  plannedCsiDate: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  private db!: Database;
  private insertStmt!: Statement;
  private selectAllStmt!: Statement;
  private selectByIdStmt!: Statement;
  private updateStmt!: Statement;
  private deleteStmt!: Statement;

  constructor(private readonly dbService: DatabaseService) {}

  onModuleInit(): void {
    this.db = this.dbService.getConnection();

    const tableInfoStmt = this.db.prepare(`PRAGMA table_info(products)`);
    const tableHasColumn = (name: string) =>
      (tableInfoStmt.all() as { name: string }[]).some((col) => col.name === name);
    const addColumnIfMissing = (name: string, definition: string) => {
      if (!tableHasColumn(name)) {
        this.db.exec(`ALTER TABLE products ADD COLUMN ${definition}`);
      }
    };

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        cluster TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT,
        owner TEXT,
        status TEXT,
        sourceSystem TEXT,
        description TEXT,
        po TEXT NOT NULL,
        businessCustomers TEXT NOT NULL,
        audienceId TEXT,
        plannedCsiDate TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    addColumnIfMissing('code', 'code TEXT');
    addColumnIfMissing('owner', 'owner TEXT');
    addColumnIfMissing('status', 'status TEXT');
    addColumnIfMissing('sourceSystem', 'sourceSystem TEXT');
    addColumnIfMissing('description', 'description TEXT');

    this.insertStmt = this.db.prepare(`
      INSERT INTO products (
        id,
        year,
        cluster,
        name,
        code,
        owner,
        status,
        sourceSystem,
        description,
        po,
        businessCustomers,
        audienceId,
        plannedCsiDate,
        createdAt,
        updatedAt
      ) VALUES (
        @id,
        @year,
        @cluster,
        @name,
        @code,
        @owner,
        @status,
        @sourceSystem,
        @description,
        @po,
        @businessCustomers,
        @audienceId,
        @plannedCsiDate,
        @createdAt,
        @updatedAt
      )
    `);

    this.selectAllStmt = this.db.prepare(`
      SELECT * FROM products ORDER BY year DESC, cluster ASC, name ASC
    `);
    this.selectByIdStmt = this.db.prepare(`SELECT * FROM products WHERE id = ?`);
    this.updateStmt = this.db.prepare(`
      UPDATE products SET
        year = @year,
        cluster = @cluster,
        name = @name,
        code = @code,
        owner = @owner,
        status = @status,
        sourceSystem = @sourceSystem,
        description = @description,
        po = @po,
        businessCustomers = @businessCustomers,
        audienceId = @audienceId,
        plannedCsiDate = @plannedCsiDate,
        updatedAt = @updatedAt
      WHERE id = @id
    `);
    this.deleteStmt = this.db.prepare(`DELETE FROM products WHERE id = ?`);
  }

  async findAll(): Promise<Product[]> {
    const rows = this.selectAllStmt.all() as DbProduct[];
    return rows.map((row) => this.mapRowToProduct(row));
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.buildProductFromInput(dto);
    this.insertStmt.run(this.toDbProduct(product));
    return product;
  }

  async createMany(dtos: CreateProductDto[]): Promise<Product[]> {
    const products = dtos.map((dto) => this.create(dto));
    return Promise.all(products);
  }

  async importFromInsight(payload: unknown): Promise<Product[]> {
    const parsedPayload =
      typeof payload === 'string' && payload.trim().startsWith('{')
        ? JSON.parse(payload)
        : payload;

    if (!parsedPayload || typeof parsedPayload !== 'object') {
      throw new Error('Некорректный формат импорта продуктов');
    }

    const entries = Array.isArray((parsedPayload as any).objectEntries)
      ? ((parsedPayload as any).objectEntries as any[])
      : [];

    if (entries.length === 0) {
      return [];
    }

    const dtos: CreateProductDto[] = entries.map((entry) => {
      const attributes: any[] = Array.isArray(entry.attributes)
        ? entry.attributes
        : [];

      const getAttribute = (name: string) =>
        attributes.find(
          (attr) => attr?.objectTypeAttribute?.name?.toLowerCase() === name.toLowerCase()
        );

      const getStringValue = (name: string) => {
        const attr = getAttribute(name);
        if (!attr || !Array.isArray(attr.objectAttributeValues)) return undefined;
        const value = attr.objectAttributeValues[0];
        return (
          value?.value ??
          value?.displayValue ??
          value?.searchValue ??
          (typeof value === 'string' ? value : undefined)
        );
      };

      const getUserNames = (name: string) => {
        const attr = getAttribute(name);
        if (!attr || !Array.isArray(attr.objectAttributeValues)) return [] as string[];
        return attr.objectAttributeValues
          .map((val: any) => val?.user?.displayName ?? val?.displayValue ?? '')
          .filter((text: string) => typeof text === 'string' && text.trim().length > 0)
          .map((text: string) => text.trim());
      };

      const getReferencedLabel = (name: string) => {
        const attr = getAttribute(name);
        const firstValue = attr?.objectAttributeValues?.[0];
        return (
          firstValue?.referencedObject?.label ??
          firstValue?.displayValue ??
          firstValue?.searchValue
        );
      };

      const stripHtml = (value?: string) =>
        value ? value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : undefined;

      const createdAt = getStringValue('Created') ?? entry.created;
      const updatedAt = getStringValue('Updated') ?? entry.updated;
      const parsedYear = (value?: string) => {
        if (!value) return undefined;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date.getFullYear();
      };
      const owner = getUserNames('Владелец продукта')[0];
      const team = getUserNames('Команда продукта');
      const description = stripHtml(getStringValue('Описание продукта'));

      const dto: CreateProductDto = {
        id: typeof entry.objectKey === 'string' ? entry.objectKey.trim() : undefined,
        year: parsedYear(createdAt),
        cluster: getReferencedLabel('Кластер - Продукт') ?? 'Не указан',
        name: (getStringValue('Name') ?? entry.label ?? 'Без названия').trim(),
        code: typeof entry.objectKey === 'string' ? entry.objectKey.trim() : undefined,
        owner,
        status: getStringValue('Status'),
        sourceSystem: getStringValue('Проект Jira') ?? 'Jira',
        description,
        po: owner ?? 'Не указан',
        businessCustomers: team.length ? team.join(', ') : owner ?? 'Не указано',
        plannedCsiDate: undefined,
        createdAt,
        updatedAt,
      };

      return dto;
    });

    return this.upsertMany(dtos);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = this.selectByIdStmt.get(id) as DbProduct | undefined;
    if (!existing) {
      throw new NotFoundException('Продукт не найден');
    }

    const current = this.mapRowToProduct(existing);
    const updated: Product = this.buildProductFromInput(
      { ...dto, id, updatedAt: new Date().toISOString() },
      current
    );

    this.updateStmt.run(this.toDbProduct(updated));
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = this.deleteStmt.run(id);
    if (result.changes === 0) {
      throw new NotFoundException('Продукт не найден');
    }
  }

  private buildProductFromInput(
    input: Partial<CreateProductDto> & { id?: string },
    existing?: Product,
    nowIso = new Date().toISOString()
  ): Product {
    const createdAt = this.normalizeDateValue(
      input.createdAt ?? existing?.createdAt,
      existing?.createdAt ?? nowIso
    );
    const updatedAt = this.normalizeDateValue(input.updatedAt ?? nowIso, nowIso);

    const id = input.id?.trim() || existing?.id || randomUUID();
    const cluster = this.normalizeString(
      input.cluster ?? existing?.cluster,
      existing?.cluster ?? 'Без кластера'
    );
    const name = this.normalizeString(
      input.name ?? existing?.name,
      existing?.name ?? 'Без названия'
    );
    const owner = this.normalizeOptional(input.owner ?? input.po, existing?.owner);
    const po = this.normalizeString(
      input.po ?? input.owner ?? existing?.po,
      existing?.po ?? 'Не указан'
    );
    const businessCustomers = this.normalizeString(
      input.businessCustomers ?? input.owner ?? existing?.businessCustomers,
      existing?.businessCustomers ?? 'Не указано'
    );

    return {
      id,
      year: input.year ?? existing?.year ?? this.extractYear(createdAt),
      cluster,
      name,
      code: this.normalizeOptional(input.code, existing?.code),
      owner,
      status: this.normalizeOptional(input.status, existing?.status),
      sourceSystem: this.normalizeOptional(input.sourceSystem, existing?.sourceSystem),
      description: this.normalizeOptional(input.description, existing?.description),
      po,
      businessCustomers,
      audienceId: input.audienceId?.trim() ?? existing?.audienceId,
      plannedCsiDate: input.plannedCsiDate ?? existing?.plannedCsiDate,
      createdAt,
      updatedAt,
    };
  }

  private async upsert(dto: CreateProductDto): Promise<Product> {
    const existing = dto.id
      ? ((this.selectByIdStmt.get(dto.id) as DbProduct | undefined) ?? undefined)
      : undefined;
    const existingProduct = existing ? this.mapRowToProduct(existing) : undefined;
    const product = this.buildProductFromInput(dto, existingProduct);

    if (existingProduct) {
      this.updateStmt.run(this.toDbProduct(product));
    } else {
      this.insertStmt.run(this.toDbProduct(product));
    }

    return product;
  }

  private async upsertMany(dtos: CreateProductDto[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const dto of dtos) {
      products.push(await this.upsert(dto));
    }
    return products;
  }

  private mapRowToProduct(row: DbProduct): Product {
    return {
      ...row,
      code: row.code ?? undefined,
      owner: row.owner ?? undefined,
      status: row.status ?? undefined,
      sourceSystem: row.sourceSystem ?? undefined,
      description: row.description ?? undefined,
      audienceId: row.audienceId ?? undefined,
      plannedCsiDate: row.plannedCsiDate ?? undefined,
    };
  }

  private toDbProduct(product: Product): DbProduct {
    return {
      ...product,
      code: product.code ?? null,
      owner: product.owner ?? null,
      status: product.status ?? null,
      sourceSystem: product.sourceSystem ?? null,
      description: product.description ?? null,
      audienceId: product.audienceId ?? null,
      plannedCsiDate: product.plannedCsiDate ?? null,
    };
  }

  private normalizeDateValue(value?: string, fallback?: string): string {
    if (!value) {
      return fallback ?? new Date().toISOString();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return fallback ?? new Date().toISOString();
    }

    return parsed.toISOString();
  }

  private extractYear(value: string): number {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? new Date().getFullYear()
      : parsed.getFullYear();
  }

  private normalizeOptional(value?: string, fallback?: string): string | undefined {
    const normalized = value?.trim();
    if (normalized && normalized.length > 0) {
      return normalized;
    }
    if (fallback !== undefined) {
      const fb = fallback?.trim();
      return fb && fb.length > 0 ? fb : undefined;
    }
    return undefined;
  }

  private normalizeString(value?: string, fallback = ''): string {
    const normalized = this.normalizeOptional(value, fallback);
    if (normalized && normalized.length > 0) {
      return normalized;
    }
    return fallback.trim() || '—';
  }
}
