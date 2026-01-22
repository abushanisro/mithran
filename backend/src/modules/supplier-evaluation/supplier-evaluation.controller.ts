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
import { SupplierEvaluationService } from './supplier-evaluation.service';
import {
  CreateSupplierEvaluationDto,
  UpdateSupplierEvaluationDto,
  QuerySupplierEvaluationDto,
  SupplierEvaluationResponseDto,
} from './dto/supplier-evaluation.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Supplier Evaluation')
@ApiBearerAuth()
@Controller({ path: 'supplier-evaluations', version: '1' })
@UseGuards(SupabaseAuthGuard)
export class SupplierEvaluationController {
  constructor(private readonly evaluationService: SupplierEvaluationService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new supplier evaluation' })
  @ApiResponse({
    status: 201,
    description: 'Evaluation created successfully',
    type: SupplierEvaluationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() dto: CreateSupplierEvaluationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ): Promise<SupplierEvaluationResponseDto> {
    return this.evaluationService.create(dto, userId, accessToken);
  }

  @Get()
  @ApiOperation({ summary: 'Get all supplier evaluations with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'List of evaluations',
    type: [SupplierEvaluationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() query: QuerySupplierEvaluationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ): Promise<SupplierEvaluationResponseDto[]> {
    return this.evaluationService.findAll(query, userId, accessToken);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier evaluation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation found',
    type: SupplierEvaluationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ): Promise<SupplierEvaluationResponseDto> {
    return this.evaluationService.findOne(id, userId, accessToken);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier evaluation (only if not frozen)' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation updated successfully',
    type: SupplierEvaluationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Cannot update frozen evaluation' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierEvaluationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ): Promise<SupplierEvaluationResponseDto> {
    return this.evaluationService.update(id, dto, userId, accessToken);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete supplier evaluation (only if not frozen)' })
  @ApiResponse({ status: 204, description: 'Evaluation deleted successfully' })
  @ApiResponse({ status: 403, description: 'Cannot delete frozen evaluation' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ): Promise<void> {
    return this.evaluationService.delete(id, userId, accessToken);
  }

  // ============================================================================
  // STATE TRANSITION COMMANDS
  // ============================================================================

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark evaluation as completed' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation marked as completed',
    type: SupplierEvaluationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Cannot change status of frozen evaluation' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async complete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ): Promise<SupplierEvaluationResponseDto> {
    return this.evaluationService.complete(id, userId, accessToken);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve and freeze evaluation (creates immutable snapshot)',
    description: 'This freezes the evaluation and creates an immutable snapshot. Returns snapshot_id for nomination reference.',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluation approved and frozen. Snapshot created.',
    schema: {
      type: 'object',
      properties: {
        snapshotId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Evaluation already approved' })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ): Promise<{ snapshotId: string }> {
    return this.evaluationService.approve(id, userId, accessToken);
  }
}
