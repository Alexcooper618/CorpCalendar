import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAudienceDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  path!: string;
}
