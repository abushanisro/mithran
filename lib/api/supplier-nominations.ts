/**
 * Supplier Nominations API Client
 * Production-grade supplier evaluation and nomination system
 */

import { apiClient } from './client';

// Types
export enum NominationType {
  OEM = 'oem',
  MANUFACTURER = 'manufacturer',
  HYBRID = 'hybrid'
}

export enum NominationStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum VendorType {
  OEM = 'oem',
  MANUFACTURER = 'manufacturer',
  HYBRID = 'hybrid'
}

export enum Recommendation {
  APPROVED = 'approved',
  CONDITIONAL = 'conditional',
  REJECTED = 'rejected',
  PENDING = 'pending'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface CreateSupplierNominationData {
  nominationName: string;
  description?: string;
  nominationType: NominationType;
  projectId: string;
  evaluationGroupId?: string;
  rfqTrackingId?: string;
  vendorIds?: string[];
  bomParts?: Array<{
    bomItemId: string;
    bomItemName: string;
    partNumber?: string;
    material?: string;
    quantity: number;
    vendorIds: string[];
  }>;
}

export interface CreateCriteriaData {
  criteriaName: string;
  criteriaCategory: string;
  weightPercentage: number;
  maxScore?: number;
  displayOrder?: number;
  isMandatory?: boolean;
}

export interface UpdateVendorEvaluationData {
  vendorType?: VendorType;
  recommendation?: Recommendation;
  riskLevel?: RiskLevel;
  riskMitigationPercentage?: number;
  minorNcCount?: number;
  majorNcCount?: number;
  capabilityPercentage?: number;
  technicalFeasibilityScore?: number;
  evaluationNotes?: string;
  technicalDiscussion?: string;
}

export interface CreateEvaluationScoreData {
  criteriaId: string;
  score: number;
  evidenceText?: string;
  assessorNotes?: string;
}

export interface NominationCriteria {
  id: string;
  criteriaName: string;
  criteriaCategory: string;
  weightPercentage: number;
  maxScore: number;
  displayOrder: number;
  isMandatory: boolean;
  createdAt: Date;
}

export interface EvaluationScore {
  id: string;
  criteriaId: string;
  score: number;
  maxPossibleScore: number;
  weightedScore: number;
  evidenceText?: string;
  assessorNotes?: string;
  assessedAt: Date;
}

// Evaluation Data Types
export interface EvaluationData {
  id: string;
  vendor_id: string;
  overall_score: number;
  final_rank: number;
  overview: {
    overall_score: number;
    rank: number;
    recommendation: Recommendation;
    risk_level: RiskLevel;
    evaluation_notes?: string;
    last_updated: string;
  };
  cost_analysis: {
    score: number;
    weight_percentage: number;
    details: any;
    cost_per_unit?: number;
    total_cost?: number;
    cost_competitiveness?: number;
  };
  rating_engine: {
    score: number;
    weight_percentage: number;
    details: any;
    overall_rating?: number;
    quality_rating?: number;
    delivery_rating?: number;
    risk_level: RiskLevel;
    minor_nc_count?: number;
    major_nc_count?: number;
  };
  capability: {
    score: number;
    weight_percentage: number;
    details: any;
    manufacturing_capability?: number;
    process_maturity?: number;
    equipment_quality?: number;
  };
  technical: {
    score: number;
    discussion?: string;
    details: any;
    feasibility_score?: number;
    innovation_capacity?: number;
    technical_capabilities?: any;
  };
  criteria_scores: Array<{
    criterion_id: string;
    criterion_name: string;
    category: string;
    score: number;
    max_score: number;
    weighted_score: number;
    weight_percentage: number;
    evidence_notes?: string;
  }>;
}

export interface VendorEvaluation {
  id: string;
  vendorId: string;
  vendorType: VendorType;
  overallScore: number;
  overallRank?: number;
  recommendation?: Recommendation;
  riskLevel: RiskLevel;
  riskMitigationPercentage: number;
  minorNcCount: number;
  majorNcCount: number;
  capabilityPercentage: number;
  technicalFeasibilityScore: number;
  evaluationNotes?: string;
  technicalDiscussion?: string;
  scores: EvaluationScore[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierNomination {
  id: string;
  nominationName: string;
  description?: string;
  nominationType: NominationType;
  projectId: string;
  evaluationGroupId?: string;
  rfqTrackingId?: string;
  status: NominationStatus;
  criteria: NominationCriteria[];
  vendorEvaluations: VendorEvaluation[];
  bomParts?: Array<{
    bomItemId: string;
    bomItemName: string;
    partNumber?: string;
    material?: string;
    quantity: number;
    vendorIds: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
}

export interface SupplierNominationSummary {
  id: string;
  nominationName: string;
  nominationType: NominationType;
  status: NominationStatus;
  vendorCount: number;
  completionPercentage: number;
  bomPartsCount?: number; // Number of BOM parts if this is a BOM-based nomination
  createdAt: Date;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Create a new supplier nomination
 */
export async function createSupplierNomination(
  data: CreateSupplierNominationData
): Promise<SupplierNomination> {
  const response = await apiClient.post('/supplier-nominations', data);
  return response;
}

/**
 * Get all nominations for a project
 */
export async function getSupplierNominationsByProject(
  projectId: string
): Promise<SupplierNominationSummary[]> {
  const response = await apiClient.get(`/supplier-nominations/project/${projectId}`);
  return Array.isArray(response) ? response : [];
}

/**
 * Get supplier nomination by ID
 */
export async function getSupplierNomination(
  nominationId: string
): Promise<SupplierNomination> {
  const response = await apiClient.get(`/supplier-nominations/${nominationId}`);
  if (!response) {
    throw new Error(`Nomination ${nominationId} not found`);
  }
  return response;
}

/**
 * Update nomination criteria
 */
export async function updateNominationCriteria(
  nominationId: string,
  criteria: CreateCriteriaData[]
): Promise<NominationCriteria[]> {
  const response = await apiClient.put(`/supplier-nominations/${nominationId}/criteria`, criteria);
  return response || [];
}

/**
 * Update vendor evaluation
 */
export async function updateVendorEvaluation(
  evaluationId: string,
  data: UpdateVendorEvaluationData
): Promise<VendorEvaluation> {
  const response = await apiClient.put(`/supplier-nominations/evaluations/${evaluationId}`, data);
  return response;
}

/**
 * Update evaluation scores for a vendor
 */
export async function updateEvaluationScores(
  evaluationId: string,
  scores: CreateEvaluationScoreData[]
): Promise<EvaluationScore[]> {
  const response = await apiClient.put(`/supplier-nominations/evaluations/${evaluationId}/scores`, scores);
  return response || [];
}

/**
 * Add vendors to nomination
 */
export async function addVendorsToNomination(
  nominationId: string,
  vendorIds: string[]
): Promise<VendorEvaluation[]> {
  const response = await apiClient.post(`/supplier-nominations/${nominationId}/vendors`, { vendorIds });
  return response || [];
}

/**
 * Complete nomination process
 */
export async function completeSupplierNomination(
  nominationId: string
): Promise<SupplierNomination> {
  const response = await apiClient.post(`/supplier-nominations/${nominationId}/complete`);
  if (!response) {
    throw new Error(`Failed to complete nomination ${nominationId}`);
  }
  return response;
}

/**
 * Delete a supplier nomination
 */
export async function deleteSupplierNomination(
  nominationId: string
): Promise<void> {
  await apiClient.delete(`/supplier-nominations/${nominationId}`);
}

/**
 * Update supplier nomination basic details
 */
export async function updateSupplierNomination(
  nominationId: string,
  data: Partial<Pick<CreateSupplierNominationData, 'nominationName' | 'description' | 'nominationType'>>
): Promise<SupplierNomination> {
  const response = await apiClient.put(`/supplier-nominations/${nominationId}`, data);
  return response;
}

/**
 * Store complete evaluation data (Overview, Cost Analysis, Rating Engine, Capability, Technical)
 */
export async function storeEvaluationData(
  evaluationId: string,
  evaluationData: {
    overview?: any;
    costAnalysis?: any;
    ratingEngine?: any;
    capability?: any;
    technical?: any;
  }
): Promise<any> {
  const response = await apiClient.post(`/supplier-nominations/evaluations/${evaluationId}/data`, evaluationData);
  return response;
}

/**
 * Get complete evaluation data
 */
export async function getEvaluationData(
  evaluationId: string
): Promise<any> {
  const response = await apiClient.get(`/supplier-nominations/evaluations/${evaluationId}/data`);
  return response;
}

/**
 * Update specific evaluation section (overview, cost_analysis, rating_engine, capability, technical)
 */
export async function updateEvaluationSection(
  evaluationId: string,
  section: string,
  sectionData: any
): Promise<any> {
  const response = await apiClient.put(`/supplier-nominations/evaluations/${evaluationId}/sections/${section}`, sectionData);
  return response;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getStatusColor(status: NominationStatus): string {
  switch (status) {
    case NominationStatus.DRAFT:
      return 'gray';
    case NominationStatus.IN_PROGRESS:
      return 'blue';
    case NominationStatus.COMPLETED:
      return 'green';
    case NominationStatus.APPROVED:
      return 'emerald';
    case NominationStatus.REJECTED:
      return 'red';
    default:
      return 'gray';
  }
}

export function getStatusText(status: NominationStatus): string {
  switch (status) {
    case NominationStatus.DRAFT:
      return 'Draft';
    case NominationStatus.IN_PROGRESS:
      return 'In Progress';
    case NominationStatus.COMPLETED:
      return 'Completed';
    case NominationStatus.APPROVED:
      return 'Approved';
    case NominationStatus.REJECTED:
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

export function getRiskLevelColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case RiskLevel.LOW:
      return 'green';
    case RiskLevel.MEDIUM:
      return 'yellow';
    case RiskLevel.HIGH:
      return 'orange';
    case RiskLevel.CRITICAL:
      return 'red';
    default:
      return 'gray';
  }
}

export function getRecommendationColor(recommendation: Recommendation): string {
  switch (recommendation) {
    case Recommendation.APPROVED:
      return 'green';
    case Recommendation.CONDITIONAL:
      return 'yellow';
    case Recommendation.REJECTED:
      return 'red';
    case Recommendation.PENDING:
      return 'gray';
    default:
      return 'gray';
  }
}

export function getNominationTypeLabel(type: NominationType): string {
  switch (type) {
    case NominationType.OEM:
      return 'OEM';
    case NominationType.MANUFACTURER:
      return 'Manufacturer';
    case NominationType.HYBRID:
      return 'Hybrid';
    default:
      return 'Unknown';
  }
}