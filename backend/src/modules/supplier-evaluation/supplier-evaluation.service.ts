import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import {
  CreateSupplierEvaluationDto,
  UpdateSupplierEvaluationDto,
  QuerySupplierEvaluationDto,
  SupplierEvaluationResponseDto,
  EvaluationStatus,
} from './dto/supplier-evaluation.dto';

@Injectable()
export class SupplierEvaluationService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) {}

  // ============================================================================
  // EVALUATION CRUD
  // ============================================================================

  /**
   * Create a new supplier evaluation
   */
  async create(
    dto: CreateSupplierEvaluationDto,
    userId: string,
    accessToken: string,
  ): Promise<SupplierEvaluationResponseDto> {
    this.logger.log('Creating supplier evaluation', 'SupplierEvaluationService');

    // CRITICAL GUARD: Validate vendor has capability for the process
    await this.assertVendorHasProcess(dto.vendorId, dto.processId, userId, accessToken);

    // Build evaluation record
    const record = {
      user_id: userId,
      vendor_id: dto.vendorId,
      project_id: dto.projectId || null,
      bom_item_id: dto.bomItemId || null,
      process_id: dto.processId, // REQUIRED: Process context for evaluation
      material_availability_score: dto.materialAvailabilityScore || 0,
      equipment_capability_score: dto.equipmentCapabilityScore || 0,
      process_feasibility_score: dto.processFeasibilityScore || 0,
      quality_certification_score: dto.qualityCertificationScore || 0,
      financial_stability_score: dto.financialStabilityScore || 0,
      capacity_score: dto.capacityScore || 0,
      lead_time_score: dto.leadTimeScore || 0,
      quoted_cost: dto.quotedCost || null,
      market_average_cost: dto.marketAverageCost || null,
      cost_competitiveness_score: dto.costCompetitivenessScore || null,
      vendor_rating_score: dto.vendorRatingScore || null,
      evaluation_round: dto.evaluationRound || 1,
      evaluator_notes: dto.evaluatorNotes || null,
      recommendation_status: dto.recommendationStatus || 'pending',
      status: 'draft',
    };

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('supplier_evaluation_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating evaluation: ${error.message}`, 'SupplierEvaluationService');
      throw new InternalServerErrorException(`Failed to create evaluation: ${error.message}`);
    }

    // Calculate weighted score
    const evaluation = await this.calculateWeightedScore(data, userId, accessToken);

    return this.mapToResponseDto(evaluation);
  }

  /**
   * Find all evaluations with optional filtering
   */
  async findAll(
    query: QuerySupplierEvaluationDto,
    userId: string,
    accessToken: string,
  ): Promise<SupplierEvaluationResponseDto[]> {
    this.logger.log('Fetching supplier evaluations', 'SupplierEvaluationService');

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('supplier_evaluation_summary')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (query.vendorId) {
      queryBuilder = queryBuilder.eq('vendor_id', query.vendorId);
    }
    if (query.projectId) {
      queryBuilder = queryBuilder.eq('project_id', query.projectId);
    }
    if (query.bomItemId) {
      queryBuilder = queryBuilder.eq('bom_item_id', query.bomItemId);
    }
    if (query.processId) {
      queryBuilder = queryBuilder.eq('process_id', query.processId);
    }
    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }
    if (query.recommendationStatus) {
      queryBuilder = queryBuilder.eq('recommendation_status', query.recommendationStatus);
    }
    if (query.isFrozen !== undefined) {
      queryBuilder = queryBuilder.eq('is_frozen', query.isFrozen);
    }
    if (query.evaluationRound) {
      queryBuilder = queryBuilder.eq('evaluation_round', query.evaluationRound);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      this.logger.error(`Error fetching evaluations: ${error.message}`, 'SupplierEvaluationService');
      throw new InternalServerErrorException(`Failed to fetch evaluations: ${error.message}`);
    }

    return data.map((record) => this.mapToResponseDto(record));
  }

  /**
   * Find evaluation by ID
   */
  async findOne(
    id: string,
    userId: string,
    accessToken: string,
  ): Promise<SupplierEvaluationResponseDto> {
    this.logger.log(`Fetching evaluation ${id}`, 'SupplierEvaluationService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('supplier_evaluation_summary')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Evaluation ${id} not found`);
    }

    return this.mapToResponseDto(data);
  }

  /**
   * Update evaluation (only if not frozen)
   */
  async update(
    id: string,
    dto: UpdateSupplierEvaluationDto,
    userId: string,
    accessToken: string,
  ): Promise<SupplierEvaluationResponseDto> {
    this.logger.log(`Updating evaluation ${id}`, 'SupplierEvaluationService');

    // Check if evaluation exists and is not frozen
    const existing = await this.findOne(id, userId, accessToken);
    if (existing.isFrozen) {
      throw new ForbiddenException('Cannot update frozen evaluation');
    }

    // Guard recommendation status changes
    if (dto.recommendationStatus && existing.status === 'draft') {
      throw new BadRequestException('Cannot set recommendation while evaluation is in draft status');
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.materialAvailabilityScore !== undefined) updates.material_availability_score = dto.materialAvailabilityScore;
    if (dto.equipmentCapabilityScore !== undefined) updates.equipment_capability_score = dto.equipmentCapabilityScore;
    if (dto.processFeasibilityScore !== undefined) updates.process_feasibility_score = dto.processFeasibilityScore;
    if (dto.qualityCertificationScore !== undefined) updates.quality_certification_score = dto.qualityCertificationScore;
    if (dto.financialStabilityScore !== undefined) updates.financial_stability_score = dto.financialStabilityScore;
    if (dto.capacityScore !== undefined) updates.capacity_score = dto.capacityScore;
    if (dto.leadTimeScore !== undefined) updates.lead_time_score = dto.leadTimeScore;
    if (dto.quotedCost !== undefined) updates.quoted_cost = dto.quotedCost;
    if (dto.marketAverageCost !== undefined) updates.market_average_cost = dto.marketAverageCost;
    if (dto.costCompetitivenessScore !== undefined) updates.cost_competitiveness_score = dto.costCompetitivenessScore;
    if (dto.vendorRatingScore !== undefined) updates.vendor_rating_score = dto.vendorRatingScore;
    if (dto.evaluatorNotes !== undefined) updates.evaluator_notes = dto.evaluatorNotes;
    if (dto.recommendationStatus !== undefined) updates.recommendation_status = dto.recommendationStatus;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('supplier_evaluation_records')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating evaluation: ${error.message}`, 'SupplierEvaluationService');
      throw new InternalServerErrorException(`Failed to update evaluation: ${error.message}`);
    }

    // Recalculate weighted score
    const evaluation = await this.calculateWeightedScore(data, userId, accessToken);

    return this.mapToResponseDto(evaluation);
  }

  /**
   * Delete evaluation (only if not frozen)
   */
  async delete(id: string, userId: string, accessToken: string): Promise<void> {
    this.logger.log(`Deleting evaluation ${id}`, 'SupplierEvaluationService');

    // Check if evaluation exists and is not frozen
    const existing = await this.findOne(id, userId, accessToken);
    if (existing.isFrozen) {
      throw new ForbiddenException('Cannot delete frozen evaluation');
    }

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('supplier_evaluation_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Error deleting evaluation: ${error.message}`, 'SupplierEvaluationService');
      throw new InternalServerErrorException(`Failed to delete evaluation: ${error.message}`);
    }
  }

  // ============================================================================
  // STATUS TRANSITIONS (Commands)
  // ============================================================================

  /**
   * Mark evaluation as completed
   */
  async complete(id: string, userId: string, accessToken: string): Promise<SupplierEvaluationResponseDto> {
    this.logger.log(`Marking evaluation ${id} as completed`, 'SupplierEvaluationService');

    const existing = await this.findOne(id, userId, accessToken);
    if (existing.isFrozen) {
      throw new ForbiddenException('Cannot change status of frozen evaluation');
    }

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('supplier_evaluation_records')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error completing evaluation: ${error.message}`, 'SupplierEvaluationService');
      throw new InternalServerErrorException(`Failed to complete evaluation: ${error.message}`);
    }

    return this.mapToResponseDto(data);
  }

  /**
   * Approve evaluation (freezes it and creates snapshot)
   */
  async approve(id: string, userId: string, accessToken: string): Promise<{ snapshotId: string }> {
    this.logger.log(`Approving and freezing evaluation ${id}`, 'SupplierEvaluationService');

    const existing = await this.findOne(id, userId, accessToken);
    if (existing.isFrozen) {
      throw new BadRequestException('Evaluation is already approved and frozen');
    }

    // Call freeze_evaluation function
    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .rpc('freeze_evaluation', {
        p_evaluation_id: id,
        p_user_id: userId,
      });

    if (error) {
      this.logger.error(`Error approving evaluation: ${error.message}`, 'SupplierEvaluationService');
      throw new InternalServerErrorException(`Failed to approve evaluation: ${error.message}`);
    }

    return { snapshotId: data };
  }

  // ============================================================================
  // VALIDATION GUARDS
  // ============================================================================

  /**
   * Assert that a vendor has capability for a specific process
   * OEM-critical validation: prevents invalid vendor-process combinations
   *
   * @throws BadRequestException if vendor lacks process capability
   */
  private async assertVendorHasProcess(
    vendorId: string,
    processId: string,
    userId: string,
    accessToken: string,
  ): Promise<void> {
    this.logger.log(
      `Validating vendor ${vendorId} has capability for process ${processId}`,
      'SupplierEvaluationService',
    );

    // Query vendor_process_capabilities table
    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('vendor_process_capabilities')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('process_id', processId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Error checking vendor-process capability: ${error.message}`,
        'SupplierEvaluationService',
      );
      throw new InternalServerErrorException(
        'Failed to validate vendor process capability',
      );
    }

    if (!data) {
      this.logger.warn(
        `Vendor ${vendorId} does not have capability for process ${processId}`,
        'SupplierEvaluationService',
      );
      throw new BadRequestException(
        `Vendor does not have registered capability for the selected manufacturing process. ` +
        `Please select a different vendor or add process capability mapping first.`,
      );
    }

    this.logger.log(
      `Vendor ${vendorId} has valid capability for process ${processId}`,
      'SupplierEvaluationService',
    );
  }

  // ============================================================================
  // CALCULATION LOGIC
  // ============================================================================

  /**
   * Calculate weighted score for evaluation
   * Uses criteria weights from evaluation_criteria_weights table
   */
  private async calculateWeightedScore(
    evaluation: any,
    userId: string,
    accessToken: string,
  ): Promise<any> {
    // Get weights for this user/project
    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('evaluation_criteria_weights')
      .select('*')
      .eq('user_id', userId);

    if (evaluation.project_id) {
      queryBuilder = queryBuilder.eq('project_id', evaluation.project_id);
    }

    queryBuilder = queryBuilder.order('project_id', { ascending: false, nullsFirst: false }).limit(1);

    const { data: weights } = await queryBuilder.single();

    // Use defaults if no weights found
    const costWeight = weights?.cost_competency_weight || 30.0;
    const vendorWeight = weights?.vendor_rating_weight || 30.0;
    const technicalWeight = weights?.technical_capability_weight || 40.0;

    // Calculate component scores (0-100 scale)
    const technicalPercentage =
      (evaluation.technical_total_score / (evaluation.technical_max_score || 700)) * 100;
    const costScore = evaluation.cost_competitiveness_score || 0;
    const vendorScore = evaluation.vendor_rating_score || 0;

    // Calculate weighted score
    const weightedScore =
      (costScore * (costWeight / 100)) +
      (vendorScore * (vendorWeight / 100)) +
      (technicalPercentage * (technicalWeight / 100));

    // Update the evaluation record
    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('supplier_evaluation_records')
      .update({
        overall_weighted_score: weightedScore,
      })
      .eq('id', evaluation.id)
      .select()
      .single();

    if (error) {
      this.logger.warn(`Error updating weighted score: ${error.message}`, 'SupplierEvaluationService');
      return evaluation; // Return original if update fails
    }

    return data;
  }

  // ============================================================================
  // MAPPING
  // ============================================================================

  private mapToResponseDto(record: any): SupplierEvaluationResponseDto {
    return {
      id: record.id,
      userId: record.user_id,
      vendorId: record.vendor_id,
      vendorName: record.vendor_name,
      projectId: record.project_id,
      bomItemId: record.bom_item_id,
      processId: record.process_id,
      processName: record.process_name,
      materialAvailabilityScore: Number(record.material_availability_score),
      equipmentCapabilityScore: Number(record.equipment_capability_score),
      processFeasibilityScore: Number(record.process_feasibility_score),
      qualityCertificationScore: Number(record.quality_certification_score),
      financialStabilityScore: Number(record.financial_stability_score),
      capacityScore: Number(record.capacity_score),
      leadTimeScore: Number(record.lead_time_score),
      technicalTotalScore: Number(record.technical_total_score),
      technicalMaxScore: Number(record.technical_max_score),
      technicalPercentage: Number(record.technical_percentage),
      quotedCost: record.quoted_cost ? Number(record.quoted_cost) : undefined,
      marketAverageCost: record.market_average_cost ? Number(record.market_average_cost) : undefined,
      costCompetitivenessScore: record.cost_competitiveness_score ? Number(record.cost_competitiveness_score) : undefined,
      vendorRatingScore: record.vendor_rating_score ? Number(record.vendor_rating_score) : undefined,
      overallWeightedScore: record.overall_weighted_score ? Number(record.overall_weighted_score) : undefined,
      status: record.status as EvaluationStatus,
      evaluationRound: record.evaluation_round,
      evaluatorNotes: record.evaluator_notes,
      recommendationStatus: record.recommendation_status,
      isFrozen: record.is_frozen,
      approvedAt: record.approved_at ? new Date(record.approved_at) : undefined,
      approvedBy: record.approved_by,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}
