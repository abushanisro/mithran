/**
 * React Query hooks for Shot Weight Calculator API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shotWeightApi } from '../shot-weight';
import type {
  CreateShotWeightData,
  UpdateShotWeightData,
  ShotWeightQuery,
} from '../shot-weight';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const shotWeightKeys = {
  all: ['shot-weight'] as const,
  lists: () => [...shotWeightKeys.all, 'list'] as const,
  list: (query?: ShotWeightQuery) => [...shotWeightKeys.lists(), query] as const,
  details: () => [...shotWeightKeys.all, 'detail'] as const,
  detail: (id: string) => [...shotWeightKeys.details(), id] as const,
};

export function useShotWeightCalculations(query?: ShotWeightQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: shotWeightKeys.list(query),
    queryFn: () => shotWeightApi.getAll(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled !== false,
  });
}

export function useShotWeightCalculation(id: string, options?: { enabled?: boolean; retry?: boolean }) {
  return useQuery({
    queryKey: shotWeightKeys.detail(id),
    queryFn: () => shotWeightApi.getById(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      if (options?.retry === false) return false;
      const apiError = error as ApiError;
      if (apiError?.statusCode === 404 || apiError?.statusCode === 400) {
        return false;
      }
      return failureCount < 3;
    },
    refetchOnWindowFocus: (query) => {
      return query.state.status !== 'error';
    },
  });
}

export function useCreateShotWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShotWeightData) => shotWeightApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotWeightKeys.lists() });
      toast.success('Shot weight calculation created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create shot weight calculation');
    },
  });
}

export function useUpdateShotWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShotWeightData }) =>
      shotWeightApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shotWeightKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shotWeightKeys.detail(variables.id) });
      toast.success('Shot weight calculation updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update shot weight calculation');
    },
  });
}

export function useDeleteShotWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shotWeightApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotWeightKeys.lists() });
      toast.success('Shot weight calculation deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete shot weight calculation');
    },
  });
}
