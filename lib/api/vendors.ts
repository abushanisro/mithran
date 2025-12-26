/**
 * Vendors API
 */

import { apiClient } from './client';

export type Vendor = {
  id: string;
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVendorData = {
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status?: Vendor['status'];
};

export type UpdateVendorData = Partial<CreateVendorData>;

export type VendorQuery = {
  search?: string;
  status?: Vendor['status'];
  capabilities?: string[];
  minRating?: number;
  page?: number;
  limit?: number;
};

export type VendorsResponse = {
  vendors: Vendor[];
  total: number;
  page: number;
  limit: number;
};

export type VendorPerformance = {
  vendorId: string;
  totalOrders: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  averageLeadTime: number;
  costCompetitiveness: number;
};

export const vendorsApi = {
  /**
   * Get all vendors
   */
  getAll: async (query?: VendorQuery): Promise<VendorsResponse> => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.status) params.append('status', query.status);
    if (query?.capabilities) {
      query.capabilities.forEach((cap) => params.append('capabilities', cap));
    }
    if (query?.minRating) params.append('minRating', query.minRating.toString());
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    return apiClient.get<VendorsResponse>(
      `/vendors${queryString ? `?${queryString}` : ''}`,
    );
  },

  /**
   * Get vendor by ID
   */
  getById: async (id: string): Promise<Vendor> => {
    return apiClient.get<Vendor>(`/vendors/${id}`);
  },

  /**
   * Create new vendor
   */
  create: async (data: CreateVendorData): Promise<Vendor> => {
    return apiClient.post<Vendor>('/vendors', data);
  },

  /**
   * Update vendor
   */
  update: async (id: string, data: UpdateVendorData): Promise<Vendor> => {
    return apiClient.put<Vendor>(`/vendors/${id}`, data);
  },

  /**
   * Delete vendor
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/vendors/${id}`);
  },

  /**
   * Get vendor performance metrics
   */
  getPerformance: async (id: string): Promise<VendorPerformance> => {
    return apiClient.get<VendorPerformance>(`/vendors/${id}/performance`);
  },

  /**
   * Get vendor capabilities
   */
  getCapabilities: async (): Promise<string[]> => {
    return apiClient.get<string[]>('/vendors/capabilities');
  },
};
