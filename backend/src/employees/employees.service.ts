import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';

export interface EmployeeRecord {
  id?: string;
  name?: string;
  department?: string;
  departmentPath?: string;
}

const execFileAsync = promisify(execFile);

@Injectable()
export class EmployeesService {
  private readonly apiUrl = process.env.EMPLOYEES_API_URL ?? process.env.ONEC_URL;
  private readonly apiToken = process.env.EMPLOYEES_API_TOKEN;
  private readonly basicUsername =
    process.env.EMPLOYEES_API_USERNAME ?? process.env.ONEC_USERNAME;
  private readonly basicPassword =
    process.env.EMPLOYEES_API_PASSWORD ?? process.env.ONEC_PASSWORD;
  private readonly useNtlm =
    (process.env.EMPLOYEES_USE_NTLM ?? process.env.ONEC_USE_NTLM ?? 'true').toLowerCase() ===
    'true';
  private readonly logger = new Logger(EmployeesService.name);

  async fetchEmployees(): Promise<EmployeeRecord[]> {
    if (!this.apiUrl) {
      throw new Error(
        'EMPLOYEES_API_URL (или ONEC_URL) не задан в переменных окружения',
      );
    }

    if (this.useNtlm && this.basicUsername && this.basicPassword) {
      try {
        return await this.fetchViaNtlm();
      } catch (error) {
        this.logger.warn(
          `NTLM-запрос к ${this.apiUrl} завершился ошибкой, пробуем обычный запрос: ${String(error)}`,
        );
      }
    }

    const headers = this.buildHeaders();
    const init: RequestInit = { headers };

    try {
      const response = await fetch(this.apiUrl, init);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Employees API responded with ${response.status}: ${text || response.statusText}`,
        );
      }

      const payload = (await response.json()) as unknown;
      return this.normalizeEmployees(payload);
    } catch (error) {
      this.logger.error(
        `Failed to fetch employees from ${this.apiUrl}: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async fetchViaNtlm(): Promise<EmployeeRecord[]> {
    if (!this.basicUsername || !this.basicPassword) {
      throw new Error(
        'EMPLOYEES_API_USERNAME/EMPLOYEES_API_PASSWORD (или ONEC_USERNAME/ONEC_PASSWORD) не заданы в переменных окружения',
      );
    }

    const user = `${this.basicUsername}:${this.basicPassword}`;
    try {
      const { stdout } = await execFileAsync('curl', [
        '--silent',
        '--show-error',
        '--fail',
        '--ntlm',
        '--user',
        user,
        '-H',
        'Accept: application/json',
        this.apiUrl,
      ]);

      const payload = stdout.trim().length > 0 ? JSON.parse(stdout) : [];
      return this.normalizeEmployees(payload);
    } catch (error) {
      this.logger.error(
        `Failed to fetch employees via NTLM from ${this.apiUrl}: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (this.basicUsername && this.basicPassword) {
      const encoded = Buffer.from(
        `${this.basicUsername}:${this.basicPassword}`,
      ).toString('base64');
      headers.Authorization = `Basic ${encoded}`;
    } else if (this.apiToken) {
      headers.Authorization = `Bearer ${this.apiToken}`;
    } else {
      throw new Error(
        'EMPLOYEES_API_USERNAME/EMPLOYEES_API_PASSWORD или EMPLOYEES_API_TOKEN не заданы в переменных окружения',
      );
    }

    return headers;
  }

  private normalizeEmployees(payload: unknown): EmployeeRecord[] {
    const candidate = (payload as { return?: unknown })?.return ?? payload;
    const possibleLists: unknown[] = [
      (candidate as { staffListEmployees?: unknown })?.staffListEmployees,
      (candidate as { staff?: unknown })?.staff,
      (candidate as { employees?: unknown })?.employees,
      candidate,
    ];

    for (const item of possibleLists) {
      if (!item) continue;
      const entries = Array.isArray(item) ? item : [item];
      if (entries.length === 0) {
        return [];
      }
      const mapped = entries
        .map((entry) => this.toEmployeeRecord(entry))
        .filter((emp): emp is EmployeeRecord => Boolean(emp));

      if (mapped.length > 0) {
        return mapped;
      }
    }

    throw new Error('Employees API returned empty or incompatible payload');
  }

  private toEmployeeRecord(value: unknown): EmployeeRecord | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value as Record<string, unknown>;
    const name = this.pickString(source, ['FIO', 'full_name', 'name', 'FullName']);
    if (!name) {
      return null;
    }

    const departmentPath = this.pickString(source, [
      'departmentPath',
      'department',
      'Division',
      'Organisation',
      'Organization',
    ]);
    const department =
      this.pickString(source, ['department', 'Department', 'Division', 'Organisation']) ??
      departmentPath;
    const id = this.pickString(source, ['id', 'Id', 'TABNUMBER', 'TabNumber']);

    return {
      id: id ?? undefined,
      name,
      department: department ?? undefined,
      departmentPath: departmentPath ?? undefined,
    };
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const raw = source[key];
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim();
      }
    }

    return undefined;
  }
}
