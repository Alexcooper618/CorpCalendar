import { Module } from '@nestjs/common';
import { AudiencesController } from './audiences.controller';
import { AudiencesService } from './audiences.service';
import { DatabaseModule } from '../database.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [DatabaseModule, EmployeesModule],
  controllers: [AudiencesController],
  providers: [AudiencesService],
})
export class AudiencesModule {}
