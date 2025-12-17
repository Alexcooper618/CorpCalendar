import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductDto {
  year!: number;

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
  audienceId?: string;

  @IsOptional()
  @IsDateString()
  plannedCsiDate?: string;
}
