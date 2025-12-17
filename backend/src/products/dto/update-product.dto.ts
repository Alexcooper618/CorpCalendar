import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  year?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  cluster?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  po?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  businessCustomers?: string;

  @IsOptional()
  @IsString()
  audienceId?: string;

  @IsOptional()
  @IsDateString()
  plannedCsiDate?: string;
}
