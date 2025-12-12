import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [EventsModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

