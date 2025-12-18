import { Injectable, Logger } from '@nestjs/common';

export interface EmployeeRecord {
  id?: string;
  name?: string;
  department?: string;
  departmentPath?: string;
}

@Injectable()
export class EmployeesService {
  private readonly apiUrl = process.env.EMPLOYEES_API_URL ?? process.env.ONEC_URL;
  private readonly apiToken = process.env.EMPLOYEES_API_TOKEN;
  private readonly basicUsername =
    process.env.EMPLOYEES_API_USERNAME ?? process.env.ONEC_USERNAME;
  private readonly basicPassword =
    process.env.EMPLOYEES_API_PASSWORD ?? process.env.ONEC_PASSWORD;
  private readonly logger = new Logger(EmployeesService.name);

  async fetchEmployees(): Promise<EmployeeRecord[]> {
    if (!this.apiUrl) {
      throw new Error(
        'EMPLOYEES_API_URL (или ONEC_URL) не задан в переменных окружения',
      );
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.basicUsername && this.basicPassword) {
      const encoded = Buffer.from(
        `${this.basicUsername}:${this.basicPassword}`,
      ).toString('base64');
      headers.Authorization = `Basic ${encoded}`;
    } else if (this.apiToken) {
      headers.Authorization = `Bearer ${this.apiToken}`;
    }

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

      if (!Array.isArray(payload)) {
        throw new Error('Employees API returned non-array payload');
      }

      return payload as EmployeeRecord[];
    } catch (error) {
      this.logger.error(
        `Failed to fetch employees from ${this.apiUrl}: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
