/**
 * React Query hooks for RFQ API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rfqApi, type CreateRfqData, type RfqQuery } from '../rfq';
import { ApiError } from '../client';
import { toast } from 'sonner';
import { useAuthEnabled, useAuthEnabledWith } from './useAuthEnabled';
import { rfqTrackingKeys } from './useRfqTracking';

export const rfqKeys = {
  all: ['rfq'] as const,
  lists: () => [...rfqKeys.all, 'list'] as const,
  list: (query?: RfqQuery) => [...rfqKeys.lists(), query] as const,
  details: () => [...rfqKeys.all, 'detail'] as const,
  detail: (id: string) => [...rfqKeys.details(), id] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all RFQs with optional filtering
 */
export function useRfqs(query?: RfqQuery) {
  return useQuery({
    queryKey: rfqKeys.list(query),
    queryFn: () => rfqApi.getAll(query),
    staleTime: 1000 * 60 * 2, // Fresh for 2 minutes
    enabled: useAuthEnabled(),
  });
}

/**
 * Hook to fetch a single RFQ by ID
 */
export function useRfq(id: string) {
  return useQuery({
    queryKey: rfqKeys.detail(id),
    queryFn: () => rfqApi.getById(id),
    enabled: useAuthEnabledWith(!!id),
    staleTime: 1000 * 60 * 2,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new RFQ
 */
export function useCreateRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRfqData) => rfqApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.lists() });
      toast.success('RFQ created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create RFQ');
    },
  });
}

/**
 * Hook to send an RFQ to vendors
 */
export function useSendRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rfqApi.send(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.lists() });
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(variables) });
      toast.success('RFQ sent to vendors successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to send RFQ');
    },
  });
}

/**
 * Hook to close an RFQ
 */
export function useCloseRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rfqApi.close(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.lists() });
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(variables) });
      toast.success('RFQ closed successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to close RFQ');
    },
  });
}