import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { startDate: 'asc' },
    });
  }

  async create(dto: CreateEventDto) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('Укажите название события');
    }

    if (!dto.startDate || !dto.endDate) {
      throw new BadRequestException('Дата начала и окончания обязательны');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Неверный формат даты');
    }

    if (end < start) {
      throw new BadRequestException('Дата окончания раньше даты начала');
    }

    return this.prisma.event.create({
      data: {
        title: dto.title,
        owner: dto.owner,
        dept: dto.dept,
        startDate: start,
        endDate: end,
        color: dto.color,
        comment: dto.comment,
      },
    });
  }

  async update(id: number, dto: UpdateEventDto) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (dto.startDate) {
      start = new Date(dto.startDate);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Неверный формат даты начала');
      }
    }

    if (dto.endDate) {
      end = new Date(dto.endDate);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Неверный формат даты окончания');
      }
    }

    if (start && end && end < start) {
      throw new BadRequestException('Дата окончания раньше даты начала');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startDate: start,
        endDate: end,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.event.delete({
      where: { id },
    });
  }
}
