/**
 * Materials API
 */

import { apiClient } from './client';

export type Material = {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  specifications?: Record<string, any>;
  unitOfMeasure: string;
  standardCost?: number;
  leadTime?: number;
  minimumOrderQuantity?: number;
  status: 'active' | 'inactive' | 'obsolete';
  createdAt: string;
  updatedAt: string;
};

export type CreateMaterialData = {
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  specifications?: Record<string, any>;
  unitOfMeasure: string;
  standardCost?: number;
  leadTime?: number;
  minimumOrderQuantity?: number;
  status?: Material['status'];
};

export type UpdateMaterialData = Partial<CreateMaterialData>;

export type MaterialQuery = {
  search?: string;
  category?: string;
  manufacturer?: string;
  status?: Material['status'];
  minCost?: number;
  maxCost?: number;
  page?: number;
  limit?: number;
};

export type MaterialsResponse = {
  materials: Material[];
  total: number;
  page: number;
  limit: number;
};

export type MaterialSupplier = {
  id: string;
  materialId: string;
  vendorId: string;
  vendorName: string;
  partNumber?: string;
  unitPrice: number;
  minimumOrderQuantity?: number;
  leadTimeDays: number;
  isPrimary: boolean;
  lastUpdated: string;
};

export const materialsApi = {
  /**
   * Get all materials
   */
  getAll: async (query?: MaterialQuery): Promise<MaterialsResponse> => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.category) params.append('category', query.category);
    if (query?.manufacturer) params.append('manufacturer', query.manufacturer);
    if (query?.status) params.append('status', query.status);
    if (query?.minCost) params.append('minCost', query.minCost.toString());
    if (query?.maxCost) params.append('maxCost', query.maxCost.toString());
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    return apiClient.get<MaterialsResponse>(
      `/materials${queryString ? `?${queryString}` : ''}`,
    );
  },

  /**
   * Get material by ID
   */
  getById: async (id: string): Promise<Material> => {
    return apiClient.get<Material>(`/materials/${id}`);
  },

  /**
   * Create new material
   */
  create: async (data: CreateMaterialData): Promise<Material> => {
    return apiClient.post<Material>('/materials', data);
  },

  /**
   * Update material
   */
  update: async (id: string, data: UpdateMaterialData): Promise<Material> => {
    return apiClient.put<Material>(`/materials/${id}`, data);
  },

  /**
   * Delete material
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/materials/${id}`);
  },

  /**
   * Get material suppliers
   */
  getSuppliers: async (id: string): Promise<MaterialSupplier[]> => {
    return apiClient.get<MaterialSupplier[]>(`/materials/${id}/suppliers`);
  },

  /**
   * Get material categories
   */
  getCategories: async (): Promise<string[]> => {
    return apiClient.get<string[]>('/materials/categories');
  },

  /**
   * Search materials by part number
   */
  searchByPartNumber: async (partNumber: string): Promise<Material[]> => {
    return apiClient.get<Material[]>(`/materials/search?partNumber=${encodeURIComponent(partNumber)}`);
  },
};
