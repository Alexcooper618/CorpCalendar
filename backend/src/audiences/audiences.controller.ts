import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AudiencesService } from './audiences.service';
import { CreateAudienceDto } from './dto/create-audience.dto';
import { UpdateAudienceDto } from './dto/update-audience.dto';

@Controller('audiences')
export class AudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Get()
  findAll() {
    return this.audiencesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateAudienceDto) {
    return this.audiencesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAudienceDto) {
    return this.audiencesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.audiencesService.remove(id);
  }
}
