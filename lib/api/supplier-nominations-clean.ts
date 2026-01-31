/**
 * Clean Supplier Nominations API
 * Production-ready client for B2B Enterprise SaaS
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierNomination {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'evaluation' | 'completed' | 'archived';
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationCriteria {
  id: string;
  category: 'cost_analysis' | 'vendor_rating' | 'technical_capability' | 'quality_systems' | 'delivery_performance';
  name: string;
  weight_percentage: number;
  max_score: number;
  is_mandatory: boolean;
  display_order: number;
}

export interface VendorEvaluation {
  id: string;
  vendor_id: string;
  overall_score: number;
  cost_score: number;
  vendor_rating_score: number;
  capability_score: number;
  technical_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'approved' | 'conditional' | 'rejected' | 'pending';
  final_rank: number;
  cost_analysis: CostAnalysis;
  rating_engine: RatingEngine;
  technical_assessment: TechnicalAssessment;
  scores: CriterionScore[];
}

export interface CriterionScore {
  criterion_id: string;
  score: number;
  weighted_score: number;
  evidence_notes?: string;
}

export interface CostAnalysis {
  cost_per_unit?: number;
  total_cost?: number;
  cost_breakdown?: Record<string, number>;
  cost_competitiveness?: number;
  pricing_model?: string;
}

export interface RatingEngine {
  overall_rating?: number;
  quality_rating?: number;
  delivery_rating?: number;
  communication_rating?: number;
  financial_stability?: number;
  certifications?: string[];
}

export interface TechnicalAssessment {
  technical_score?: number;
  capabilities?: string[];
  equipment_quality?: number;
  process_maturity?: number;
  innovation_capacity?: number;
}

export interface NominationDetails {
  nomination: SupplierNomination;
  criteria: EvaluationCriteria[];
  evaluations: VendorEvaluation[];
}

export interface NominationAnalytics {
  total_vendors: number;
  avg_overall_score: number;
  avg_cost_score: number;
  avg_vendor_rating: number;
  avg_capability_score: number;
  recommendations: {
    approved: number;
    conditional: number;
    rejected: number;
    pending: number;
  };
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

// ============================================================================
// API CLIENT
// ============================================================================

export class SupplierNominationAPI {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ========================================================================
  // NOMINATION MANAGEMENT
  // ========================================================================

  async createNomination(
    projectId: string, 
    name: string, 
    description?: string
  ): Promise<SupplierNomination> {
    const { data, error } = await this.supabase
      .rpc('create_supplier_nomination', {
        p_project_id: projectId,
        p_name: name,
        p_description: description
      });

    if (error) throw new Error(`Failed to create nomination: ${error.message}`);
    return data;
  }

  async getNominationDetails(nominationId: string): Promise<NominationDetails> {
    const { data, error } = await this.supabase
      .rpc('get_nomination_details', {
        p_nomination_id: nominationId
      });

    if (error) throw new Error(`Failed to get nomination: ${error.message}`);
    return data;
  }

  async listNominations(projectId: string): Promise<SupplierNomination[]> {
    const { data, error } = await this.supabase
      .from('supplier_nominations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list nominations: ${error.message}`);
    return data || [];
  }

  async updateNomination(
    nominationId: string, 
    updates: Partial<Pick<SupplierNomination, 'name' | 'description' | 'status'>>
  ): Promise<SupplierNomination> {
    const { data, error } = await this.supabase
      .from('supplier_nominations')
      .update(updates)
      .eq('id', nominationId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update nomination: ${error.message}`);
    return data;
  }

  async deleteNomination(nominationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('supplier_nominations')
      .delete()
      .eq('id', nominationId);

    if (error) throw new Error(`Failed to delete nomination: ${error.message}`);
  }

  // ========================================================================
  // VENDOR EVALUATION MANAGEMENT
  // ========================================================================

  async addVendorToNomination(
    nominationId: string, 
    vendorId: string
  ): Promise<VendorEvaluation> {
    const { data, error } = await this.supabase
      .rpc('add_vendor_to_nomination', {
        p_nomination_id: nominationId,
        p_vendor_id: vendorId
      });

    if (error) throw new Error(`Failed to add vendor: ${error.message}`);
    return data;
  }

  async updateEvaluationScores(
    evaluationId: string, 
    scores: Pick<CriterionScore, 'criterion_id' | 'score' | 'evidence_notes'>[]
  ): Promise<VendorEvaluation> {
    const { data, error } = await this.supabase
      .rpc('update_evaluation_scores', {
        p_evaluation_id: evaluationId,
        p_scores: JSON.stringify(scores)
      });

    if (error) throw new Error(`Failed to update scores: ${error.message}`);
    return data;
  }

  async removeVendorFromNomination(evaluationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_evaluations')
      .delete()
      .eq('id', evaluationId);

    if (error) throw new Error(`Failed to remove vendor: ${error.message}`);
  }

  // ========================================================================
  // COST ENGINE
  // ========================================================================

  async updateCostAnalysis(
    evaluationId: string, 
    costData: CostAnalysis
  ): Promise<{ cost_score: number; cost_analysis: CostAnalysis }> {
    const { data, error } = await this.supabase
      .rpc('update_cost_analysis', {
        p_evaluation_id: evaluationId,
        p_cost_data: JSON.stringify(costData)
      });

    if (error) throw new Error(`Failed to update cost analysis: ${error.message}`);
    return data;
  }

  // ========================================================================
  // RATING ENGINE
  // ========================================================================

  async updateRatingEngine(
    evaluationId: string, 
    ratingData: RatingEngine
  ): Promise<{ vendor_rating_score: number; risk_level: string; rating_engine: RatingEngine }> {
    const { data, error } = await this.supabase
      .rpc('update_rating_engine', {
        p_evaluation_id: evaluationId,
        p_rating_data: JSON.stringify(ratingData)
      });

    if (error) throw new Error(`Failed to update rating engine: ${error.message}`);
    return data;
  }

  // ========================================================================
  // ANALYTICS & REPORTING
  // ========================================================================

  async getNominationAnalytics(nominationId: string): Promise<NominationAnalytics> {
    const { data, error } = await this.supabase
      .rpc('get_nomination_analytics', {
        p_nomination_id: nominationId
      });

    if (error) throw new Error(`Failed to get analytics: ${error.message}`);
    return data;
  }

  async getVendorComparison(nominationId: string): Promise<VendorEvaluation[]> {
    const { data, error } = await this.supabase
      .from('vendor_evaluations')
      .select(`
        *,
        criterion_scores (
          criterion_id,
          score,
          weighted_score,
          evidence_notes
        )
      `)
      .eq('nomination_id', nominationId)
      .order('final_rank', { ascending: true });

    if (error) throw new Error(`Failed to get vendor comparison: ${error.message}`);
    return data || [];
  }

  // ========================================================================
  // CRITERIA MANAGEMENT
  // ========================================================================

  async updateEvaluationCriteria(
    nominationId: string,
    criteria: Omit<EvaluationCriteria, 'id'>[]
  ): Promise<EvaluationCriteria[]> {
    // Delete existing criteria
    await this.supabase
      .from('evaluation_criteria')
      .delete()
      .eq('nomination_id', nominationId);

    // Insert new criteria
    const { data, error } = await this.supabase
      .from('evaluation_criteria')
      .insert(
        criteria.map((c, index) => ({
          nomination_id: nominationId,
          category: c.category,
          name: c.name,
          weight_percentage: c.weight_percentage,
          max_score: c.max_score,
          is_mandatory: c.is_mandatory,
          display_order: index
        }))
      )
      .select();

    if (error) throw new Error(`Failed to update criteria: ${error.message}`);
    return data;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const calculateOverallScore = (
  costScore: number,
  vendorScore: number, 
  capabilityScore: number,
  costWeight: number = 70,
  vendorWeight: number = 20,
  capabilityWeight: number = 10
): number => {
  return (costScore * costWeight + vendorScore * vendorWeight + capabilityScore * capabilityWeight) / 100;
};

export const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'low': return 'green';
    case 'medium': return 'yellow';
    case 'high': return 'orange';
    case 'critical': return 'red';
    default: return 'gray';
  }
};

export const getRecommendationColor = (recommendation: string): string => {
  switch (recommendation) {
    case 'approved': return 'green';
    case 'conditional': return 'yellow';
    case 'rejected': return 'red';
    case 'pending': return 'gray';
    default: return 'gray';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'blue';
    case 'evaluation': return 'purple';
    case 'completed': return 'green';
    case 'archived': return 'gray';
    default: return 'gray';
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default SupplierNominationAPI;