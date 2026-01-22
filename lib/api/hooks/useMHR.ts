/**
 * React Query hooks for MHR API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mhrApi } from '../mhr';
import type {
  CreateMHRData,
  UpdateMHRData,
  MHRQuery,
} from '../mhr';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const mhrKeys = {
  all: ['mhr'] as const,
  lists: () => [...mhrKeys.all, 'list'] as const,
  list: (query?: MHRQuery) => [...mhrKeys.lists(), query] as const,
  details: () => [...mhrKeys.all, 'detail'] as const,
  detail: (id: string) => [...mhrKeys.details(), id] as const,
};

export function useMHRRecords(query?: MHRQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mhrKeys.list(query),
    queryFn: () => mhrApi.getAll(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled !== false,
    retry: false, // 2026 Best Practice: Fail fast for list queries
    refetchOnWindowFocus: false,
    throwOnError: false, // Graceful error handling
  });
}

export function useMHRRecord(id: string, options?: { enabled?: boolean; retry?: boolean }) {
  return useQuery({
    queryKey: mhrKeys.detail(id),
    queryFn: () => mhrApi.getById(id),
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

export function useCreateMHR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMHRData) => mhrApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mhrKeys.lists() });
      toast.success('MHR record created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create MHR record');
    },
  });
}

export function useUpdateMHR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMHRData }) =>
      mhrApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mhrKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mhrKeys.detail(variables.id) });
      toast.success('MHR record updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update MHR record');
    },
  });
}

export function useDeleteMHR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mhrApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mhrKeys.lists() });
      toast.success('MHR record deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete MHR record');
    },
  });
}
