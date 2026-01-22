/**
 * React hooks for Supplier Evaluation API
 *
 * Provides hooks for managing supplier evaluations with full CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/providers/auth';
import {
  createSupplierEvaluation,
  getSupplierEvaluations,
  getSupplierEvaluation,
  updateSupplierEvaluation,
  deleteSupplierEvaluation,
  completeSupplierEvaluation,
  approveSupplierEvaluation,
  type SupplierEvaluation,
  type CreateSupplierEvaluationData,
  type UpdateSupplierEvaluationData,
  type SupplierEvaluationQuery,
} from '../supplier-evaluation';

const QUERY_KEY = 'supplier-evaluations';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all supplier evaluations with optional filtering
 */
export function useSupplierEvaluations(query?: SupplierEvaluationQuery) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, query],
    queryFn: () => getSupplierEvaluations(query),
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch evaluations for a specific vendor
 */
export function useVendorEvaluations(vendorId: string) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, 'vendor', vendorId],
    queryFn: () => getSupplierEvaluations({ vendorId }),
    enabled: !authLoading && !!user && !!vendorId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch evaluations for a specific BOM item
 */
export function useBomItemEvaluations(bomItemId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'bomItem', bomItemId],
    queryFn: () => getSupplierEvaluations({ bomItemId }),
    enabled: !!bomItemId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single supplier evaluation by ID
 */
export function useSupplierEvaluation(id: string) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => getSupplierEvaluation(id),
    enabled: !authLoading && !!user && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new supplier evaluation
 */
export function useCreateSupplierEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierEvaluationData) => createSupplierEvaluation(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      if (data.vendorId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'vendor', data.vendorId] });
      }
      if (data.bomItemId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'bomItem', data.bomItemId] });
      }
      toast.success('Supplier evaluation created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create evaluation');
    },
  });
}

/**
 * Hook to update an existing supplier evaluation
 */
export function useUpdateSupplierEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierEvaluationData }) =>
      updateSupplierEvaluation(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      if (data.vendorId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'vendor', data.vendorId] });
      }
      if (data.bomItemId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'bomItem', data.bomItemId] });
      }
      toast.success('Evaluation updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update evaluation');
    },
  });
}

/**
 * Hook to delete a supplier evaluation
 */
export function useDeleteSupplierEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSupplierEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Evaluation deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete evaluation');
    },
  });
}

// ============================================================================
// COMMAND HOOKS (State Transitions)
// ============================================================================

/**
 * Hook to mark evaluation as completed
 */
export function useCompleteSupplierEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => completeSupplierEvaluation(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
      toast.success('Evaluation marked as completed');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to complete evaluation');
    },
  });
}

/**
 * Hook to approve and freeze evaluation (creates immutable snapshot)
 */
export function useApproveSupplierEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveSupplierEvaluation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
      toast.success('Evaluation approved and frozen. Snapshot created.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve evaluation');
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if evaluation can be edited
 */
export function useCanEditEvaluation(evaluation?: SupplierEvaluation): boolean {
  if (!evaluation) return false;
  return !evaluation.isFrozen;
}

/**
 * Hook to get evaluations for comparison (multiple vendors for same part)
 */
export function useEvaluationsForComparison(bomItemId: string, vendorIds: string[]) {
  const { data: evaluations, ...rest } = useBomItemEvaluations(bomItemId);

  const filteredEvaluations = evaluations?.filter(
    (evaluation) => vendorIds.includes(evaluation.vendorId)
  );

  return {
    data: filteredEvaluations || [],
    ...rest,
  };
}
