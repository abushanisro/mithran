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
 * Hook to send an RFQ to vendors - Production-grade with tracking integration
 */
export function useSendRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rfqApi.send(id),
    onSuccess: async (data, variables) => {
      // 1. Update RFQ status immediately
      queryClient.setQueryData(
        rfqKeys.detail(variables),
        (old: any) => old ? { ...old, status: 'sent', sentAt: new Date() } : old
      );
      
      // 2. Update RFQ lists
      queryClient.setQueryData(
        rfqKeys.lists(),
        (old: any[]) => old?.map(rfq => 
          rfq.id === variables 
            ? { ...rfq, status: 'sent', sentAt: new Date() }
            : rfq
        ) || []
      );

      // 3. Wait for backend processing and aggressively refresh tracking
      const refreshTracking = async () => {
        // Wait for backend to create tracking record
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Force refresh all tracking data
        queryClient.refetchQueries({ queryKey: rfqTrackingKeys.all });
        
        // Additional refresh to ensure data loads
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: rfqTrackingKeys.all });
        }, 1500);
        
        // Final refresh for any delayed data
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: rfqTrackingKeys.all });
        }, 3000);
      };
      
      refreshTracking();
      
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
      // Update RFQ status immediately
      queryClient.setQueryData(
        rfqKeys.detail(variables),
        (old: any) => old ? { ...old, status: 'closed', closedAt: new Date() } : old
      );
      
      // Update RFQ lists
      queryClient.setQueryData(
        rfqKeys.lists(),
        (old: any[]) => old?.map(rfq => 
          rfq.id === variables 
            ? { ...rfq, status: 'closed', closedAt: new Date() }
            : rfq
        ) || []
      );

      // Update tracking status
      queryClient.invalidateQueries({ queryKey: rfqTrackingKeys.all });
      
      toast.success('RFQ closed successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to close RFQ');
    },
  });
}

/**
 * Hook to cancel RFQ by deleting tracking record
 */
export function useCancelRfqTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackingId: string) => {
      return fetch(`/api/v1/rfq/tracking/${trackingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        if (!res.ok) throw new Error('Failed to cancel RFQ');
        return res.json();
      });
    },
    onMutate: async (trackingId) => {
      // Optimistically remove from tracking list
      await queryClient.cancelQueries({ queryKey: rfqTrackingKeys.all });
      
      const previousData = queryClient.getQueryData(rfqTrackingKeys.all);
      
      queryClient.setQueriesData(
        { queryKey: rfqTrackingKeys.lists() },
        (old: any[]) => old?.filter(record => record.id !== trackingId) || []
      );
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqTrackingKeys.all });
      toast.success('RFQ cancelled successfully');
    },
    onError: (error, variables, context) => {
      // Restore previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(rfqTrackingKeys.all, context.previousData);
      }
      toast.error('Failed to cancel RFQ');
    },
  });
}