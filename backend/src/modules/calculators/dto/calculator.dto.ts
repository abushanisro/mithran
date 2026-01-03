import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsNumber } from 'class-validator';

export enum CalculatorType {
  SINGLE = 'single',
  MULTI_STEP = 'multi_step',
  DASHBOARD = 'dashboard',
}

export class CreateCalculatorDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  calcCategory?: string;

  @ApiProperty({ enum: CalculatorType })
  @IsEnum(CalculatorType)
  calculatorType: CalculatorType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templateCategory?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  displayConfig?: Record<string, any>;
}

export class UpdateCalculatorDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  calcCategory?: string;

  @ApiPropertyOptional({ enum: CalculatorType })
  @IsEnum(CalculatorType)
  @IsOptional()
  calculatorType?: CalculatorType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templateCategory?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  displayConfig?: Record<string, any>;
}

export class QueryCalculatorDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  calcCategory?: string;

  @ApiPropertyOptional({ enum: CalculatorType })
  @IsEnum(CalculatorType)
  @IsOptional()
  calculatorType?: CalculatorType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class ExecuteCalculatorDto {
  @ApiProperty()
  @IsString()
  calculatorId: string;

  @ApiProperty()
  @IsObject()
  inputValues: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  databaseReferences?: Record<string, any>;
}
