import { apiClient } from './client';

export interface LSREntry {
  id: number;
  labourCode: string;
  labourType: string;
  description: string;
  minimumWagePerDay: number;
  minimumWagePerMonth: number;
  dearnessAllowance: number;
  perksPercentage: number;
  lhr: number;
  reference?: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLSRDto {
  labourCode: string;
  labourType: string;
  description: string;
  minimumWagePerDay: number;
  minimumWagePerMonth: number;
  dearnessAllowance: number;
  perksPercentage: number;
  lhr: number;
  reference?: string;
  location?: string;
}

export interface UpdateLSRDto extends Partial<CreateLSRDto> {}

export interface LSRStatistics {
  total: number;
  byType: Array<{
    type: string;
    count: string;
    avgLHR: string;
  }>;
  averageLHR: number;
}

export const lsrApi = {
  getAll: async (search?: string): Promise<LSREntry[]> => {
    const params = search ? { search } : {};
    const response = await apiClient.get<LSREntry[]>('/lsr', { params });
    return response || [];
  },

  getById: async (id: number): Promise<LSREntry> => {
    const response = await apiClient.get<LSREntry>(`/lsr/${id}`);
    if (!response) throw new Error('LSR record not found');
    return response;
  },

  getByLabourCode: async (labourCode: string): Promise<LSREntry> => {
    const response = await apiClient.get<LSREntry>(`/lsr/code/${labourCode}`);
    if (!response) throw new Error('Labour code not found');
    return response;
  },

  create: async (data: CreateLSRDto): Promise<LSREntry> => {
    const response = await apiClient.post<LSREntry>('/lsr', data);
    if (!response) throw new Error('Failed to create LSR record');
    return response;
  },

  update: async (id: number, data: UpdateLSRDto): Promise<LSREntry> => {
    const response = await apiClient.put<LSREntry>(`/lsr/${id}`, data);
    if (!response) throw new Error('Failed to update LSR record');
    return response;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/lsr/${id}`);
  },

  getStatistics: async (): Promise<LSRStatistics> => {
    const response = await apiClient.get<LSRStatistics>('/lsr/statistics');
    return response || { total: 0, byType: [], averageLHR: 0 };
  },

  bulkCreate: async (data: CreateLSRDto[]): Promise<LSREntry[]> => {
    const response = await apiClient.post<LSREntry[]>('/lsr/bulk', data);
    return response || [];
  },
};
