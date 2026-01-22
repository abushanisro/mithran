/**
 * React hooks for Process Cost API
 *
 * Provides hooks for managing process cost calculations linked to BOM items
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { toast } from 'sonner';

export interface ProcessCostInput {
  opNbr?: number;
  description?: string;
  processGroup?: string;
  processRoute?: string;
  operation?: string;
  directRate: number;
  indirectRate?: number;
  fringeRate?: number;
  machineRate?: number;
  machineValue?: number;
  laborRate?: number;
  currency?: string;
  shiftPatternHoursPerDay: number;
  setupManning: number;
  setupTime: number;
  batchSize: number;
  heads: number;
  cycleTime: number;
  partsPerCycle: number;
  scrap: number;
  facilityId?: string;
  facilityRateId?: string;
  shiftPatternId?: string;
}

export interface CreateProcessCostDto extends ProcessCostInput {
  bomItemId?: string;
  processId?: string;
  processRouteId?: string;
  facilityCategoryId?: string;
  facilityTypeId?: string;
  supplierId?: string;
  supplierLocationId?: string;
  isActive?: boolean;
  notes?: string;
}

export interface ProcessCostRecord {
  id: string;
  opNbr: number;
  description?: string;
  processGroup?: string;
  processRoute?: string;
  operation?: string;
  mhrId?: string;
  lsrId?: string;
  directRate: number;
  indirectRate: number;
  fringeRate: number;
  machineRate: number;
  machineValue: number;
  laborRate: number;
  currency: string;
  setupManning: number;
  setupTime: number;
  batchSize: number;
  heads: number;
  cycleTime: number;
  partsPerCycle: number;
  scrap: number;
  totalCostPerPart: number;
  setupCostPerPart: number;
  totalCycleCostPerPart: number;
  totalCostBeforeScrap: number;
  scrapAdjustment: number;
  totalBatchCost: number;
  calculationBreakdown?: any;
  bomItemId?: string;
  processId?: string;
  processRouteId?: string;
  isActive: boolean;
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessCostListResponse {
  records: ProcessCostRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Hook to calculate process cost without saving (preview)
 */
export function useCalculateProcessCost() {
  return useMutation<any, Error, ProcessCostInput>({
    mutationFn: async (input: ProcessCostInput) => {
      const result = await apiClient.post<any>('/process-costs/calculate', input);
      return result;
    },
  });
}

/**
 * Hook to create a process cost record
 */
export function useCreateProcessCost() {
  const queryClient = useQueryClient();

  return useMutation<ProcessCostRecord, Error, CreateProcessCostDto>({
    mutationFn: async (data: CreateProcessCostDto) => {
      const result = await apiClient.post<ProcessCostRecord>('/process-costs', data);
      return result;
    },
    onSuccess: () => {
      // Invalidate all process-costs queries
      queryClient.invalidateQueries({
        queryKey: ['process-costs'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['bom-item-costs'],
        exact: false
      });
      toast.success('Process cost added successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add process cost');
    },
  });
}

/**
 * Hook to update a process cost record
 */
export function useUpdateProcessCost() {
  const queryClient = useQueryClient();

  return useMutation<ProcessCostRecord, Error, { id: string; data: Partial<CreateProcessCostDto> }>({
    mutationFn: async ({ id, data }) => {
      const result = await apiClient.put<ProcessCostRecord>(`/process-costs/${id}`, data);
      return result;
    },
    onSuccess: () => {
      // Invalidate all process-costs queries
      queryClient.invalidateQueries({
        queryKey: ['process-costs'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['bom-item-costs'],
        exact: false
      });
      toast.success('Process cost updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update process cost');
    },
  });
}

/**
 * Hook to delete a process cost record
 */
export function useDeleteProcessCost() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (id: string) => {
      const result = await apiClient.delete<{ message: string }>(`/process-costs/${id}`);
      return result;
    },
    onSuccess: () => {
      // Invalidate all process-costs queries
      queryClient.invalidateQueries({
        queryKey: ['process-costs'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['bom-item-costs'],
        exact: false
      });
      toast.success('Process cost deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete process cost');
    },
  });
}

/**
 * Hook to get all process costs (paginated and filtered)
 */
export function useProcessCosts(options: {
  bomItemId?: string;
  bomItemIds?: string[];
  processId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { bomItemId, bomItemIds, processId, search, isActive = true, page = 1, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['process-costs', { bomItemId, bomItemIds, processId, search, isActive, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (bomItemId) params.append('bomItemId', bomItemId);
      if (bomItemIds && bomItemIds.length > 0) {
        bomItemIds.forEach(id => params.append('bomItemId', id));
      }
      if (processId) params.append('processId', processId);
      if (search) params.append('search', search);
      if (isActive !== undefined) params.append('isActive', String(isActive));
      params.append('page', String(page));
      params.append('limit', String(limit));

      const data = await apiClient.get<ProcessCostListResponse>(
        `/process-costs?${params.toString()}`
      );
      return data;
    },
    enabled: enabled && (!!bomItemId || (!!bomItemIds && bomItemIds.length > 0)),
  });
}

/**
 * Hook to get a single process cost by ID
 */
export function useProcessCost(id?: string) {
  return useQuery({
    queryKey: ['process-cost', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const result = await apiClient.get<ProcessCostRecord>(`/process-costs/${id}`);
      return result;
    },
    enabled: !!id,
  });
}
