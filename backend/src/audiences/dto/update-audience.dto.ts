import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAudienceDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  path?: string;
}
