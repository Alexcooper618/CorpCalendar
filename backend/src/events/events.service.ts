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
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end < start) {
      throw new BadRequestException('Дата окончания раньше даты начала');
    }

    return this.prisma.event.create({
      data: {
        title: dto.title,
        owner: dto.owner,
        goal: dto.goal,
        dept: dto.dept,
        product: dto.product,
        startDate: start,
        endDate: end,
      },
    });
  }

  async update(id: number, dto: UpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.event.delete({
      where: { id },
    });
  }
}
