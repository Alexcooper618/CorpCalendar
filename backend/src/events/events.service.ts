import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { randomUUID } from 'crypto';

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
  private events: EventItem[] = [];

  async findAll(): Promise<EventItem[]> {
    return this.events.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
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

    this.events.push(event);
    return event;
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventItem> {
    const index = this.events.findIndex((event) => event.id === id);

    if (index === -1) {
      throw new NotFoundException('Событие не найдено');
    }

    const current = this.events[index];
    const start = dto.startDate
      ? this.parseDate(dto.startDate, 'start')
      : new Date(current.startDate);
    const end = dto.endDate ? this.parseDate(dto.endDate, 'end') : new Date(current.endDate);

    this.ensureDateOrder(start, end);

    const updated: EventItem = {
      ...current,
      ...dto,
      title: dto.title?.trim() ?? current.title,
      owner: dto.owner?.trim() ?? current.owner,
      dept: dto.dept?.trim() ?? current.dept,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      color: dto.color?.trim() ?? current.color,
      comment: dto.comment?.trim() ?? current.comment,
    };

    this.events[index] = updated;
    return updated;
  }

  async remove(id: string): Promise<void> {
    const index = this.events.findIndex((event) => event.id === id);
    if (index === -1) {
      throw new NotFoundException('Событие не найдено');
    }
    this.events.splice(index, 1);
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
