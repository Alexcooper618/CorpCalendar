import { Module } from '@nestjs/common';
import { AudiencesController } from './audiences.controller';
import { AudiencesService } from './audiences.service';
import { DatabaseModule } from '../database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AudiencesController],
  providers: [AudiencesService],
})
export class AudiencesModule {}
