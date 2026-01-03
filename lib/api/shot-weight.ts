/**
 * Shot Weight Calculator API
 */

import { apiClient } from './client';

export type ShotWeightCalculation = {
  id: string;
  userId: string;
  calculationName: string;
  description?: string;
  materialGrade: string;

  // Material Properties
  density: number;
  densityUnit?: string;

  // Part Information
  volume: number;
  volumeUnit?: string;
  partWeight: number;
  partWeightUnit?: string;
  volumeSource?: string;

  // Cavity Information
  numberOfCavities: number;
  cavitySource?: string;

  // Runner Information
  runnerDiameter: number;
  runnerLengthPerPart: number;
  runnerProjectedAreaPerPart: number;
  runnerProjectedVolumePerPart: number;
  runnerWeightPerPart: number;
  runnerSource?: string;

  // Calculated Results
  totalPartWeight: number;
  totalRunnerWeight: number;
  totalShotWeight: number;
  runnerToPartRatio: number;

  // Optional: Sprue and Cold Slug
  includeSprue?: boolean;
  sprueDiameter?: number;
  sprueLength?: number;
  sprueWeight?: number;
  coldSlugWeight?: number;
  totalShotWeightWithSprue?: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
};

export type CreateShotWeightData = {
  calculationName: string;
  description?: string;
  materialGrade: string;
  density: number;
  densityUnit?: string;
  volume: number;
  volumeUnit?: string;
  partWeight: number;
  partWeightUnit?: string;
  volumeSource?: 'cad' | 'manual';
  numberOfCavities: number;
  cavitySource?: 'lookup' | 'manual';
  runnerDiameter: number;
  runnerLengthPerPart: number;
  runnerSource?: 'lookup' | 'manual';
  includeSprue?: boolean;
  sprueDiameter?: number;
  sprueLength?: number;
  coldSlugWeight?: number;
};

export type UpdateShotWeightData = Partial<CreateShotWeightData>;

export type ShotWeightQuery = {
  search?: string;
  materialGrade?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type ShotWeightListResponse = {
  data: ShotWeightCalculation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const shotWeightApi = {
  /**
   * Get all shot weight calculations
   */
  getAll: async (query?: ShotWeightQuery): Promise<ShotWeightListResponse> => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.materialGrade) params.append('materialGrade', query.materialGrade);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const queryString = params.toString();
    return apiClient.get<ShotWeightListResponse>(
      `/shot-weight${queryString ? `?${queryString}` : ''}`,
    );
  },

  /**
   * Get shot weight calculation by ID
   */
  getById: async (id: string): Promise<ShotWeightCalculation> => {
    return apiClient.get<ShotWeightCalculation>(`/shot-weight/${id}`);
  },

  /**
   * Create new shot weight calculation
   */
  create: async (data: CreateShotWeightData): Promise<ShotWeightCalculation> => {
    return apiClient.post<ShotWeightCalculation>('/shot-weight', data);
  },

  /**
   * Update shot weight calculation
   */
  update: async (id: string, data: UpdateShotWeightData): Promise<ShotWeightCalculation> => {
    return apiClient.put<ShotWeightCalculation>(`/shot-weight/${id}`, data);
  },

  /**
   * Delete shot weight calculation
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/shot-weight/${id}`);
  },
};
