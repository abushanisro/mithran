import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateLSRDto {
  @IsString()
  labourCode: string;

  @IsString()
  labourType: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  minimumWagePerDay: number;

  @IsNumber()
  @Min(0)
  minimumWagePerMonth: number;

  @IsNumber()
  @Min(0)
  dearnessAllowance: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  perksPercentage: number;

  @IsNumber()
  @Min(0)
  lhr: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateLSRDto {
  @IsOptional()
  @IsString()
  labourCode?: string;

  @IsOptional()
  @IsString()
  labourType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumWagePerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumWagePerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dearnessAllowance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  perksPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lhr?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
