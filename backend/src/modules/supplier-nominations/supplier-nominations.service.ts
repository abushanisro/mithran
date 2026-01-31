import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { Logger } from '../../common/logger/logger.service';
import {
  CreateSupplierNominationDto,
  BomPartDto,
  CreateCriteriaDto,
  UpdateVendorEvaluationDto,
  CreateEvaluationScoreDto,
  SupplierNominationDto,
  SupplierNominationSummaryDto,
  VendorEvaluationDto,
  NominationCriteriaDto,
  EvaluationScoreDto,
  NominationType,
  NominationStatus,
  VendorType,
  RiskLevel,
  Recommendation
} from './dto/supplier-nomination.dto';

@Injectable()
export class SupplierNominationsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) { }

  async create(
    userId: string,
    createDto: CreateSupplierNominationDto,
    accessToken: string
  ): Promise<SupplierNominationDto> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Create the nomination
      const { data: nomination, error: nominationError } = await client
        .from('supplier_nomination_evaluations')
        .insert({
          user_id: userId,
          project_id: createDto.projectId,
          evaluation_group_id: createDto.evaluationGroupId,
          rfq_tracking_id: createDto.rfqTrackingId,
          nomination_name: createDto.nominationName,
          description: createDto.description,
          nomination_type: createDto.nominationType,
          status: NominationStatus.DRAFT
        })
        .select()
        .single();

      if (nominationError) {
        throw new BadRequestException(`Failed to create nomination: ${nominationError.message}`);
      }

      // Initialize default criteria (optional - continue if fails)
      try {
        const { error: criteriaError } = await client
          .rpc('initialize_nomination_evaluation_criteria', {
            p_nomination_evaluation_id: nomination.id,
            p_nomination_type: createDto.nominationType
          });

        if (criteriaError) {
          this.logger.warn(`Failed to initialize criteria: ${criteriaError.message}`);
        }
      } catch (criteriaError) {
        this.logger.warn(`Failed to call initialize criteria function: ${criteriaError.message}`);
        // Continue without criteria initialization
      }

      // Create BOM parts if provided
      if (createDto.bomParts && createDto.bomParts.length > 0) {
        try {
          await this.createBomParts(nomination.id, createDto.bomParts, accessToken);
        } catch (bomError) {
          this.logger.warn(`Failed to create BOM parts: ${bomError.message}`);
          // Continue without BOM parts for now
        }
      }

      // Create vendor evaluations if vendor IDs provided
      if (createDto.vendorIds && createDto.vendorIds.length > 0) {
        try {
          await this.createVendorEvaluations(nomination.id, createDto.vendorIds, accessToken);
        } catch (vendorError) {
          this.logger.warn(`Failed to create vendor evaluations: ${vendorError.message}`);
          // Continue without vendor evaluations for now
        }
      }

      // Return the created nomination with basic data
      return {
        id: nomination.id,
        nominationName: nomination.nomination_name,
        description: nomination.description,
        nominationType: nomination.nomination_type as NominationType,
        status: nomination.status as NominationStatus,
        projectId: nomination.project_id,
        evaluationGroupId: nomination.evaluation_group_id,
        rfqTrackingId: nomination.rfq_tracking_id,
        criteria: [],
        vendorEvaluations: [],
        bomParts: [],
        createdAt: nomination.created_at,
        updatedAt: nomination.updated_at,
        completedAt: nomination.completed_at,
        approvedAt: nomination.approved_at,
        approvedBy: nomination.approved_by
      };
    } catch (error) {
      this.logger.error('Failed to create supplier nomination:', error);
      throw error;
    }
  }

  async findByProject(
    userId: string,
    projectId: string,
    accessToken: string
  ): Promise<SupplierNominationSummaryDto[]> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      const { data, error } = await client
        .from('supplier_nomination_evaluations')
        .select(`
          id,
          nomination_name,
          nomination_type,
          status,
          created_at,
          vendor_nomination_evaluations (
            count
          ),
          supplier_nomination_bom_parts (
            count
          )
        `)
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(`Failed to fetch nominations: ${error.message}`);
      }

      return (data || []).map(nomination => ({
        id: nomination.id,
        nominationName: nomination.nomination_name,
        nominationType: nomination.nomination_type,
        status: nomination.status,
        vendorCount: nomination.vendor_nomination_evaluations?.length || 0,
        completionPercentage: this.calculateCompletionPercentage(nomination),
        bomPartsCount: nomination.supplier_nomination_bom_parts?.length || 0,
        createdAt: new Date(nomination.created_at)
      }));
    } catch (error) {
      this.logger.error('Failed to fetch nominations:', error);
      throw error;
    }
  }

  async findOne(
    userId: string,
    nominationId: string,
    accessToken: string
  ): Promise<SupplierNominationDto> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Get nomination with all related data
      const { data: nomination, error } = await client
        .from('supplier_nomination_evaluations')
        .select(`
          *,
          nomination_evaluation_criteria (*),
          vendor_nomination_evaluations (
            *,
            vendor_evaluation_scores (*)
          ),
          supplier_nomination_bom_parts (
            *,
            supplier_nomination_bom_part_vendors (*)
          )
        `)
        .eq('id', nominationId)
        .eq('user_id', userId)
        .single();

      if (error || !nomination) {
        throw new NotFoundException('Supplier nomination not found');
      }

      return this.mapToNominationDto(nomination);
    } catch (error) {
      this.logger.error('Failed to fetch nomination:', error);
      throw error;
    }
  }

  async updateCriteria(
    userId: string,
    nominationId: string,
    criteria: CreateCriteriaDto[],
    accessToken: string
  ): Promise<NominationCriteriaDto[]> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Verify ownership
      await this.verifyNominationOwnership(userId, nominationId, accessToken);

      // Clear existing criteria
      await client
        .from('nomination_evaluation_criteria')
        .delete()
        .eq('nomination_evaluation_id', nominationId);

      // Insert new criteria
      const criteriaData = criteria.map((criterion, index) => ({
        nomination_evaluation_id: nominationId,
        criteria_name: criterion.criteriaName,
        criteria_category: criterion.criteriaCategory,
        weight_percentage: criterion.weightPercentage,
        max_score: criterion.maxScore || 100,
        display_order: criterion.displayOrder || index,
        is_mandatory: criterion.isMandatory || false
      }));

      const { data, error } = await client
        .from('nomination_evaluation_criteria')
        .insert(criteriaData)
        .select();

      if (error) {
        throw new BadRequestException(`Failed to update criteria: ${error.message}`);
      }

      return data.map((criteria) => this.mapToCriteriaDto(criteria));
    } catch (error) {
      this.logger.error('Failed to update criteria:', error);
      throw error;
    }
  }

  async updateVendorEvaluation(
    userId: string,
    evaluationId: string,
    updateDto: UpdateVendorEvaluationDto,
    accessToken: string
  ): Promise<VendorEvaluationDto> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Verify ownership through nomination
      const { data: evaluation } = await client
        .from('vendor_nomination_evaluations')
        .select('nomination_evaluation_id')
        .eq('id', evaluationId)
        .single();

      if (!evaluation) {
        throw new NotFoundException('Vendor evaluation not found');
      }

      await this.verifyNominationOwnership(userId, evaluation.nomination_evaluation_id, accessToken);

      const { data, error } = await client
        .from('vendor_nomination_evaluations')
        .update({
          vendor_type: updateDto.vendorType,
          recommendation: updateDto.recommendation,
          risk_level: updateDto.riskLevel,
          risk_mitigation_percentage: updateDto.riskMitigationPercentage,
          minor_nc_count: updateDto.minorNcCount,
          major_nc_count: updateDto.majorNcCount,
          capability_percentage: updateDto.capabilityPercentage,
          technical_feasibility_score: updateDto.technicalFeasibilityScore,
          evaluation_notes: updateDto.evaluationNotes,
          technical_discussion: updateDto.technicalDiscussion,
          updated_at: new Date().toISOString()
        })
        .eq('id', evaluationId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Failed to update evaluation: ${error.message}`);
      }

      return this.mapToVendorEvaluationDto(data);
    } catch (error) {
      this.logger.error('Failed to update vendor evaluation:', error);
      throw error;
    }
  }

  async updateEvaluationScores(
    userId: string,
    evaluationId: string,
    scores: CreateEvaluationScoreDto[],
    accessToken: string
  ): Promise<EvaluationScoreDto[]> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Verify ownership
      const { data: evaluation } = await client
        .from('vendor_nomination_evaluations')
        .select('nomination_evaluation_id')
        .eq('id', evaluationId)
        .single();

      if (!evaluation) {
        throw new NotFoundException('Vendor evaluation not found');
      }

      await this.verifyNominationOwnership(userId, evaluation.nomination_evaluation_id, accessToken);

      // Get criteria for weight calculation
      const { data: criteria } = await client
        .from('nomination_evaluation_criteria')
        .select('*')
        .eq('nomination_evaluation_id', evaluation.nomination_evaluation_id);

      const criteriaMap = new Map(criteria?.map(c => [c.id, c]) || []);

      // Prepare scores with weighted calculations
      const scoreData = scores.map(score => {
        const criterion = criteriaMap.get(score.criteriaId);
        const weightedScore = criterion
          ? (score.score * criterion.weight_percentage) / 100
          : 0;

        return {
          vendor_nomination_evaluation_id: evaluationId,
          criteria_id: score.criteriaId,
          score: score.score,
          max_possible_score: criterion?.max_score || 100,
          weighted_score: weightedScore,
          evidence_text: score.evidenceText,
          assessor_notes: score.assessorNotes,
          assessed_by: userId,
          assessed_at: new Date().toISOString()
        };
      });

      // Clear existing scores
      await client
        .from('vendor_evaluation_scores')
        .delete()
        .eq('vendor_nomination_evaluation_id', evaluationId);

      // Insert new scores
      const { data, error } = await client
        .from('vendor_evaluation_scores')
        .insert(scoreData)
        .select();

      if (error) {
        throw new BadRequestException(`Failed to update scores: ${error.message}`);
      }

      return data.map((score) => this.mapToScoreDto(score));
    } catch (error) {
      this.logger.error('Failed to update evaluation scores:', error);
      throw error;
    }
  }

  async addVendorsToNomination(
    userId: string,
    nominationId: string,
    vendorIds: string[],
    accessToken: string
  ): Promise<VendorEvaluationDto[]> {
    try {
      await this.verifyNominationOwnership(userId, nominationId, accessToken);
      return this.createVendorEvaluations(nominationId, vendorIds, accessToken);
    } catch (error) {
      this.logger.error('Failed to add vendors to nomination:', error);
      throw error;
    }
  }

  async completeNomination(
    userId: string,
    nominationId: string,
    accessToken: string
  ): Promise<SupplierNominationDto> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      await this.verifyNominationOwnership(userId, nominationId, accessToken);

      const { error } = await client
        .from('supplier_nomination_evaluations')
        .update({
          status: NominationStatus.COMPLETED,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', nominationId);

      if (error) {
        throw new BadRequestException(`Failed to complete nomination: ${error.message}`);
      }

      return this.findOne(userId, nominationId, accessToken);
    } catch (error) {
      this.logger.error('Failed to complete nomination:', error);
      throw error;
    }
  }

  async update(
    userId: string,
    nominationId: string,
    updateDto: Partial<CreateSupplierNominationDto>,
    accessToken: string
  ): Promise<SupplierNominationDto> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      await this.verifyNominationOwnership(userId, nominationId, accessToken);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updateDto.nominationName) {
        updateData.nomination_name = updateDto.nominationName;
      }
      if (updateDto.description !== undefined) {
        updateData.description = updateDto.description;
      }
      if (updateDto.nominationType) {
        updateData.nomination_type = updateDto.nominationType;
      }

      const { error } = await client
        .from('supplier_nomination_evaluations')
        .update(updateData)
        .eq('id', nominationId);

      if (error) {
        throw new BadRequestException(`Failed to update nomination: ${error.message}`);
      }

      return this.findOne(userId, nominationId, accessToken);
    } catch (error) {
      this.logger.error('Failed to update nomination:', error);
      throw error;
    }
  }

  async remove(
    userId: string,
    nominationId: string,
    accessToken: string
  ): Promise<void> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      await this.verifyNominationOwnership(userId, nominationId, accessToken);

      // First get all vendor evaluations for this nomination
      const { data: vendorEvaluations } = await client
        .from('vendor_nomination_evaluations')
        .select('id')
        .eq('nomination_evaluation_id', nominationId);

      // Delete vendor evaluation scores for each vendor evaluation
      if (vendorEvaluations && vendorEvaluations.length > 0) {
        const vendorEvaluationIds = vendorEvaluations.map(ve => ve.id);

        const { error: scoresError } = await client
          .from('vendor_evaluation_scores')
          .delete()
          .in('vendor_nomination_evaluation_id', vendorEvaluationIds);

        if (scoresError) {
          this.logger.warn('Error deleting vendor scores:', scoresError.message);
        }
      }

      // Delete vendor evaluations
      const { error: vendorError } = await client
        .from('vendor_nomination_evaluations')
        .delete()
        .eq('nomination_evaluation_id', nominationId);

      if (vendorError) {
        this.logger.warn('Error deleting vendor evaluations:', vendorError.message);
      }

      // Delete nomination criteria
      const { error: criteriaError } = await client
        .from('nomination_evaluation_criteria')
        .delete()
        .eq('nomination_evaluation_id', nominationId);

      if (criteriaError) {
        this.logger.warn('Error deleting criteria:', criteriaError.message);
      }

      // Finally delete the nomination itself
      const { error } = await client
        .from('supplier_nomination_evaluations')
        .delete()
        .eq('id', nominationId);

      if (error) {
        throw new BadRequestException(`Failed to delete nomination: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Failed to delete nomination:', error);
      throw error;
    }
  }

  // Private helper methods
  private async createVendorEvaluations(
    nominationId: string,
    vendorIds: string[],
    accessToken: string
  ): Promise<VendorEvaluationDto[]> {
    const client = this.supabaseService.getClient(accessToken);

    const evaluationData = vendorIds.map(vendorId => ({
      nomination_evaluation_id: nominationId,
      vendor_id: vendorId,
      vendor_type: VendorType.MANUFACTURER,
      risk_level: RiskLevel.MEDIUM,
      recommendation: Recommendation.PENDING
    }));

    const { data, error } = await client
      .from('vendor_nomination_evaluations')
      .insert(evaluationData)
      .select();

    if (error) {
      throw new BadRequestException(`Failed to create vendor evaluations: ${error.message}`);
    }

    return data.map((evaluation) => this.mapToVendorEvaluationDto(evaluation));
  }

  private async verifyNominationOwnership(
    userId: string,
    nominationId: string,
    accessToken: string
  ): Promise<void> {
    const client = this.supabaseService.getClient(accessToken);

    const { data } = await client
      .from('supplier_nomination_evaluations')
      .select('id')
      .eq('id', nominationId)
      .eq('user_id', userId)
      .single();

    if (!data) {
      throw new NotFoundException('Supplier nomination not found');
    }
  }

  private calculateCompletionPercentage(nomination: any): number {
    // Basic completion calculation - can be enhanced
    if (nomination.status === NominationStatus.COMPLETED) return 100;
    if (nomination.status === NominationStatus.APPROVED) return 100;
    if (nomination.status === NominationStatus.IN_PROGRESS) return 50;
    return 0;
  }

  private mapToNominationDto(data: any): SupplierNominationDto {
    return {
      id: data.id,
      nominationName: data.nomination_name,
      description: data.description,
      nominationType: data.nomination_type,
      projectId: data.project_id,
      evaluationGroupId: data.evaluation_group_id,
      rfqTrackingId: data.rfq_tracking_id,
      status: data.status,
      criteria: (data.nomination_evaluation_criteria || []).map((criteria: any) => this.mapToCriteriaDto(criteria)),
      vendorEvaluations: (data.vendor_nomination_evaluations || []).map((evaluation: any) => this.mapToVendorEvaluationDto(evaluation)),
      bomParts: (data.supplier_nomination_bom_parts || []).map((bomPart: any) => this.mapToBomPartDto(bomPart)),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      approvedBy: data.approved_by
    };
  }

  private mapToCriteriaDto(data: any): NominationCriteriaDto {
    return {
      id: data.id,
      criteriaName: data.criteria_name,
      criteriaCategory: data.criteria_category,
      weightPercentage: data.weight_percentage,
      maxScore: data.max_score,
      displayOrder: data.display_order,
      isMandatory: data.is_mandatory,
      createdAt: new Date(data.created_at)
    };
  }

  private mapToVendorEvaluationDto(data: any): VendorEvaluationDto {
    return {
      id: data.id,
      vendorId: data.vendor_id,
      vendorType: data.vendor_type,
      overallScore: data.overall_score || 0,
      overallRank: data.overall_rank,
      recommendation: data.recommendation,
      riskLevel: data.risk_level,
      riskMitigationPercentage: data.risk_mitigation_percentage || 0,
      minorNcCount: data.minor_nc_count || 0,
      majorNcCount: data.major_nc_count || 0,
      capabilityPercentage: data.capability_percentage || 0,
      technicalFeasibilityScore: data.technical_feasibility_score || 0,
      evaluationNotes: data.evaluation_notes,
      technicalDiscussion: data.technical_discussion,
      scores: (data.vendor_evaluation_scores || []).map((score: any) => this.mapToScoreDto(score)),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToScoreDto(data: any): EvaluationScoreDto {
    return {
      id: data.id,
      criteriaId: data.criteria_id,
      score: data.score,
      maxPossibleScore: data.max_possible_score,
      weightedScore: data.weighted_score,
      evidenceText: data.evidence_text,
      assessorNotes: data.assessor_notes,
      assessedAt: new Date(data.assessed_at)
    };
  }

  private mapToBomPartDto(data: any): BomPartDto {
    const vendorIds = (data.supplier_nomination_bom_part_vendors || []).map((v: any) => v.vendor_id);
    
    return {
      bomItemId: data.bom_item_id,
      bomItemName: data.bom_item_name,
      partNumber: data.part_number,
      material: data.material,
      quantity: data.quantity,
      vendorIds: vendorIds
    };
  }

  async storeEvaluationData(
    userId: string,
    vendorEvaluationId: string,
    evaluationData: {
      overview?: any;
      costAnalysis?: any;
      ratingEngine?: any;
      capability?: any;
      technical?: any;
    },
    accessToken: string
  ): Promise<any> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Verify ownership through nomination
      const { data: evaluation } = await client
        .from('vendor_nomination_evaluations')
        .select('nomination_evaluation_id')
        .eq('id', vendorEvaluationId)
        .single();

      if (!evaluation) {
        throw new NotFoundException('Vendor evaluation not found');
      }

      await this.verifyNominationOwnership(userId, evaluation.nomination_evaluation_id, accessToken);

      // Call database function to store evaluation data
      const { data, error } = await client
        .rpc('store_evaluation_data', {
          p_vendor_evaluation_id: vendorEvaluationId,
          p_overview_data: evaluationData.overview || {},
          p_cost_analysis: evaluationData.costAnalysis || {},
          p_rating_engine: evaluationData.ratingEngine || {},
          p_capability_data: evaluationData.capability || {},
          p_technical_data: evaluationData.technical || {}
        });

      if (error) {
        throw new BadRequestException(`Failed to store evaluation data: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to store evaluation data:', error);
      throw error;
    }
  }

  async getEvaluationData(
    userId: string,
    vendorEvaluationId: string,
    accessToken: string
  ): Promise<any> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Verify ownership
      const { data: evaluation } = await client
        .from('vendor_nomination_evaluations')
        .select('nomination_evaluation_id')
        .eq('id', vendorEvaluationId)
        .single();

      if (!evaluation) {
        throw new NotFoundException('Vendor evaluation not found');
      }

      await this.verifyNominationOwnership(userId, evaluation.nomination_evaluation_id, accessToken);

      // Get complete evaluation data
      const { data, error } = await client
        .rpc('get_evaluation_data', {
          p_vendor_evaluation_id: vendorEvaluationId
        });

      if (error) {
        throw new BadRequestException(`Failed to get evaluation data: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get evaluation data:', error);
      throw error;
    }
  }

  async updateEvaluationSection(
    userId: string,
    vendorEvaluationId: string,
    section: string,
    sectionData: any,
    accessToken: string
  ): Promise<any> {
    const client = this.supabaseService.getClient(accessToken);

    try {
      // Verify ownership
      const { data: evaluation } = await client
        .from('vendor_nomination_evaluations')
        .select('nomination_evaluation_id')
        .eq('id', vendorEvaluationId)
        .single();

      if (!evaluation) {
        throw new NotFoundException('Vendor evaluation not found');
      }

      await this.verifyNominationOwnership(userId, evaluation.nomination_evaluation_id, accessToken);

      // Update specific section
      const { data, error } = await client
        .rpc('update_evaluation_section', {
          p_vendor_evaluation_id: vendorEvaluationId,
          p_section: section,
          p_data: sectionData
        });

      if (error) {
        throw new BadRequestException(`Failed to update evaluation section: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to update evaluation section:', error);
      throw error;
    }
  }

  private async createBomParts(
    nominationId: string,
    bomParts: any[],
    accessToken: string
  ): Promise<void> {
    const client = this.supabaseService.getClient(accessToken);

    for (const bomPart of bomParts) {
      // Create BOM part record
      const { data: bomPartRecord, error: bomPartError } = await client
        .from('supplier_nomination_bom_parts')
        .insert({
          nomination_evaluation_id: nominationId,
          bom_item_id: bomPart.bomItemId,
          bom_item_name: bomPart.bomItemName,
          part_number: bomPart.partNumber,
          material: bomPart.material,
          quantity: bomPart.quantity
        })
        .select()
        .single();

      if (bomPartError) {
        throw new BadRequestException(`Failed to create BOM part: ${bomPartError.message}`);
      }

      // Create vendor assignments for this BOM part
      if (bomPart.vendorIds && bomPart.vendorIds.length > 0) {
        const vendorAssignments = bomPart.vendorIds.map((vendorId: string) => ({
          nomination_bom_part_id: bomPartRecord.id,
          vendor_id: vendorId
        }));

        const { error: vendorError } = await client
          .from('supplier_nomination_bom_part_vendors')
          .insert(vendorAssignments);

        if (vendorError) {
          throw new BadRequestException(`Failed to assign vendors to BOM part: ${vendorError.message}`);
        }
      }
    }
  }
}