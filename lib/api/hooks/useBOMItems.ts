import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface BOMItem {
  id: string;
  bomId: string;
  name: string;
  partNumber?: string;
  description?: string;
  itemType: 'assembly' | 'sub_assembly' | 'child_part' | 'bop';
  quantity: number;
  annualVolume: number;
  unit: string;
  material?: string;
  materialGrade?: string;
  parentId?: string;
  sortOrder: number;
  file3dPath?: string;
  file2dPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBOMItemDto {
  bomId: string;
  name: string;
  partNumber?: string;
  description?: string;
  itemType: 'assembly' | 'sub_assembly' | 'child_part' | 'bop';
  quantity: number;
  annualVolume: number;
  unit?: string;
  material?: string;
  materialGrade?: string;
  parentItemId?: string;
  sortOrder?: number;
}

export interface UpdateBOMItemDto {
  name?: string;
  partNumber?: string;
  description?: string;
  itemType?: 'assembly' | 'sub_assembly' | 'child_part' | 'bop';
  quantity?: number;
  annualVolume?: number;
  unit?: string;
  material?: string;
  materialGrade?: string;
  parentItemId?: string;
  sortOrder?: number;
}

const bomItemKeys = {
  all: ['bom-items'] as const,
  lists: () => [...bomItemKeys.all, 'list'] as const,
  list: (bomId?: string) => [...bomItemKeys.lists(), bomId] as const,
  details: () => [...bomItemKeys.all, 'detail'] as const,
  detail: (id: string) => [...bomItemKeys.details(), id] as const,
};

/**
 * Hook to fetch BOM items for a specific BOM
 */
export function useBOMItems(bomId?: string) {
  return useQuery({
    queryKey: bomItemKeys.list(bomId),
    queryFn: async () => {
      if (!bomId) return { items: [] };
      return apiClient.get<{ items: BOMItem[] }>(`/bom-items?bomId=${bomId}`);
    },
    enabled: !!bomId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to fetch a single BOM item
 */
export function useBOMItem(itemId?: string) {
  return useQuery({
    queryKey: bomItemKeys.detail(itemId!),
    queryFn: async () => {
      return apiClient.get<BOMItem>(`/bom-items/${itemId}`);
    },
    enabled: !!itemId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Create a new BOM item
 */
export function useCreateBOMItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBOMItemDto) => {
      return apiClient.post<BOMItem>('/bom-items', dto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bomItemKeys.list(variables.bomId) });
    },
  });
}

/**
 * Update an existing BOM item
 */
export function useUpdateBOMItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBOMItemDto }) => {
      return apiClient.put<BOMItem>(`/bom-items/${id}`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bomItemKeys.list(data.bomId) });
      queryClient.invalidateQueries({ queryKey: bomItemKeys.detail(data.id) });
    },
  });
}

/**
 * Delete a BOM item
 */
export function useDeleteBOMItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/bom-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bomItemKeys.lists() });
    },
  });
}

// Standalone functions for non-hook usage
export function createBOMItem(dto: CreateBOMItemDto): Promise<BOMItem> {
  return apiClient.post<BOMItem>('/bom-items', dto);
}

export function updateBOMItem(id: string, dto: UpdateBOMItemDto): Promise<BOMItem> {
  return apiClient.put<BOMItem>(`/bom-items/${id}`, dto);
}

export function deleteBOMItem(id: string): Promise<void> {
  return apiClient.delete(`/bom-items/${id}`);
}

export function updateBOMItemsSortOrder(items: Array<{ id: string; sortOrder: number }>): Promise<void> {
  return apiClient.patch('/bom-items/reorder', { items });
}
