import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  id?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;

  @IsOptional()
  year?: number;

  @IsString()
  @MinLength(1)
  cluster!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  po!: string;

  @IsString()
  @MinLength(1)
  businessCustomers!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sourceSystem?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  audienceId?: string;

  @IsOptional()
  audienceIds?: string[];

  @IsOptional()
  @IsDateString()
  plannedCsiDate?: string;
}
