/**
 * React Query hooks for BOM API
 * Handles BOM-level operations only (not items - see useBOMItems.ts)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bomApi } from '../bom';
import type { CreateBOMData, UpdateBOMData, BOMQuery } from '../bom';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const bomKeys = {
  all: ['bom'] as const,
  lists: () => [...bomKeys.all, 'list'] as const,
  list: (query?: BOMQuery) => [...bomKeys.lists(), query] as const,
  details: () => [...bomKeys.all, 'detail'] as const,
  detail: (id: string) => [...bomKeys.details(), id] as const,
  costBreakdown: (id: string) => [...bomKeys.detail(id), 'cost-breakdown'] as const,
};

export function useBOMs(query?: BOMQuery) {
  return useQuery({
    queryKey: bomKeys.list(query),
    queryFn: () => bomApi.getAll(query),
    staleTime: 1000 * 60 * 5,
  });
}

export function useBOM(id: string, includeItems = true) {
  return useQuery({
    queryKey: bomKeys.detail(id),
    queryFn: () => bomApi.getById(id, includeItems),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBOMCostBreakdown(bomId: string) {
  return useQuery({
    queryKey: bomKeys.costBreakdown(bomId),
    queryFn: () => bomApi.getCostBreakdown(bomId),
    enabled: !!bomId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateBOM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBOMData) => bomApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bomKeys.lists() });
      toast.success('BOM created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create BOM');
    },
  });
}

export function useUpdateBOM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBOMData }) =>
      bomApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bomKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bomKeys.detail(variables.id) });
      toast.success('BOM updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update BOM');
    },
  });
}

export function useDeleteBOM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bomApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bomKeys.lists() });
      toast.success('BOM deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete BOM');
    },
  });
}
