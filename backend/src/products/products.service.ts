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

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        cluster TEXT NOT NULL,
        name TEXT NOT NULL,
        po TEXT NOT NULL,
        businessCustomers TEXT NOT NULL,
        audienceId TEXT,
        plannedCsiDate TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    this.insertStmt = this.db.prepare(`
      INSERT INTO products (
        id,
        year,
        cluster,
        name,
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
    const nowIso = new Date().toISOString();
    const product: Product = {
      id: randomUUID(),
      year: dto.year,
      cluster: dto.cluster.trim(),
      name: dto.name.trim(),
      po: dto.po.trim(),
      businessCustomers: dto.businessCustomers.trim(),
      audienceId: dto.audienceId?.trim(),
      plannedCsiDate: dto.plannedCsiDate,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.insertStmt.run(this.toDbProduct(product));
    return product;
  }

  async createMany(dtos: CreateProductDto[]): Promise<Product[]> {
    const products = dtos.map((dto) => this.create(dto));
    return Promise.all(products);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = this.selectByIdStmt.get(id) as DbProduct | undefined;
    if (!existing) {
      throw new NotFoundException('Продукт не найден');
    }

    const current = this.mapRowToProduct(existing);
    const updated: Product = {
      ...current,
      ...dto,
      cluster: dto.cluster?.trim() ?? current.cluster,
      name: dto.name?.trim() ?? current.name,
      po: dto.po?.trim() ?? current.po,
      businessCustomers: dto.businessCustomers?.trim() ?? current.businessCustomers,
      audienceId: dto.audienceId?.trim() ?? current.audienceId,
      plannedCsiDate: dto.plannedCsiDate ?? current.plannedCsiDate,
      updatedAt: new Date().toISOString(),
    };

    this.updateStmt.run(this.toDbProduct(updated));
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = this.deleteStmt.run(id);
    if (result.changes === 0) {
      throw new NotFoundException('Продукт не найден');
    }
  }

  private mapRowToProduct(row: DbProduct): Product {
    return {
      ...row,
      audienceId: row.audienceId ?? undefined,
      plannedCsiDate: row.plannedCsiDate ?? undefined,
    };
  }

  private toDbProduct(product: Product): DbProduct {
    return {
      ...product,
      audienceId: product.audienceId ?? null,
      plannedCsiDate: product.plannedCsiDate ?? null,
    };
  }
}
