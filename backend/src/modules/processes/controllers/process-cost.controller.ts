/**
 * Process Cost Controller
 *
 * Production-grade REST API controller for process costs
 * - RESTful endpoints with proper HTTP methods
 * - Authentication with Supabase
 * - Request validation with DTOs
 * - Swagger API documentation
 *
 * @class ProcessCostController
 * @version 2.0.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AccessToken } from '../../../common/decorators/access-token.decorator';
import { ProcessCostService } from '../services/process-cost.service';
import {
  CreateProcessCostDto,
  UpdateProcessCostDto,
  QueryProcessCostsDto,
  ProcessCostResponseDto,
  ProcessCostListResponseDto,
} from '../dto/process-cost.dto';
import { ProcessCostInput } from '../engines/process-cost-calculation.engine';

@ApiTags('Process Costs')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('process-costs')
export class ProcessCostController {
  constructor(private readonly processCostService: ProcessCostService) {}

  /**
   * Get all process cost records with pagination and filtering
   */
  @Get()
  @ApiOperation({ summary: 'Get all process cost records' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of process cost records',
    type: ProcessCostListResponseDto,
  })
  async findAll(
    @Query() query: QueryProcessCostsDto,
    @CurrentUser('id') userId: string,
    @AccessToken() accessToken: string,
  ): Promise<ProcessCostListResponseDto> {
    // Handle multiple bomItemId query parameters
    // When multiple ?bomItemId=uuid1&bomItemId=uuid2 are sent, they are automatically parsed as array
    if (query.bomItemId && Array.isArray(query.bomItemId)) {
      query.bomItemIds = query.bomItemId;
      delete query.bomItemId; // Remove single bomItemId to avoid conflicts
    } else if (query.bomItemId && typeof query.bomItemId === 'string') {
      // If only one bomItemId is provided, keep it in the single field
      // No changes needed
    }

    return this.processCostService.findAll(query, userId, accessToken);
  }

  /**
   * Get single process cost by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get process cost by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns single process cost record',
    type: ProcessCostResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Process cost not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @AccessToken() accessToken: string,
  ): Promise<ProcessCostResponseDto> {
    return this.processCostService.findOne(id, userId, accessToken);
  }

  /**
   * Create new process cost
   */
  @Post()
  @ApiOperation({ summary: 'Create new process cost' })
  @ApiResponse({
    status: 201,
    description: 'Process cost created successfully',
    type: ProcessCostResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Body() dto: CreateProcessCostDto,
    @CurrentUser('id') userId: string,
    @AccessToken() accessToken: string,
  ): Promise<ProcessCostResponseDto> {
    return this.processCostService.create(dto, userId, accessToken);
  }

  /**
   * Update existing process cost
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update process cost' })
  @ApiResponse({
    status: 200,
    description: 'Process cost updated successfully',
    type: ProcessCostResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Process cost not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessCostDto,
    @CurrentUser('id') userId: string,
    @AccessToken() accessToken: string,
  ): Promise<ProcessCostResponseDto> {
    return this.processCostService.update(id, dto, userId, accessToken);
  }

  /**
   * Delete process cost
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete process cost' })
  @ApiResponse({ status: 204, description: 'Process cost deleted successfully' })
  @ApiResponse({ status: 404, description: 'Process cost not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @AccessToken() accessToken: string,
  ): Promise<void> {
    await this.processCostService.remove(id, userId, accessToken);
  }

  /**
   * Calculate process cost without saving (preview/what-if analysis)
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate process cost without saving' })
  @ApiResponse({
    status: 200,
    description: 'Process cost calculated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async calculateOnly(@Body() input: ProcessCostInput): Promise<any> {
    return this.processCostService.calculateOnly(input);
  }
}
