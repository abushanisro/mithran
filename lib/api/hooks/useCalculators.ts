/**
 * React Query hooks for Calculators API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calculatorsApi } from '../calculators';
import type {
  CreateCalculatorData,
  UpdateCalculatorData,
  CreateFieldData,
  UpdateFieldData,
  CreateFormulaData,
  UpdateFormulaData,
  ExecuteCalculatorData,
  SaveExecutionData,
  ValidateFormulaData,
  CalculatorQuery,
  ExecutionQuery,
  ResolveDatabaseFieldData,
  GetLookupOptionsData,
} from '../calculators';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const calculatorKeys = {
  all: ['calculators'] as const,
  lists: () => [...calculatorKeys.all, 'list'] as const,
  list: (query?: CalculatorQuery) => [...calculatorKeys.lists(), query] as const,
  details: () => [...calculatorKeys.all, 'detail'] as const,
  detail: (id: string) => [...calculatorKeys.details(), id] as const,
  fields: (calculatorId: string) => [...calculatorKeys.detail(calculatorId), 'fields'] as const,
  formulas: (calculatorId: string) => [...calculatorKeys.detail(calculatorId), 'formulas'] as const,
  executions: () => [...calculatorKeys.all, 'executions'] as const,
  executionList: (query?: ExecutionQuery) => [...calculatorKeys.executions(), query] as const,
  execution: (id: string) => [...calculatorKeys.executions(), id] as const,
};

// ========================================
// CALCULATOR QUERIES
// ========================================

export function useCalculators(query?: CalculatorQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: calculatorKeys.list(query),
    queryFn: () => calculatorsApi.getAll(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled !== false,
  });
}

export function useCalculator(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: calculatorKeys.detail(id),
    queryFn: () => calculatorsApi.getById(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      const apiError = error as ApiError;
      if (apiError?.statusCode === 404 || apiError?.statusCode === 400) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useCalculatorFields(calculatorId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: calculatorKeys.fields(calculatorId),
    queryFn: () => calculatorsApi.getFields(calculatorId),
    enabled: options?.enabled !== false && !!calculatorId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCalculatorFormulas(calculatorId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: calculatorKeys.formulas(calculatorId),
    queryFn: () => calculatorsApi.getFormulas(calculatorId),
    enabled: options?.enabled !== false && !!calculatorId,
    staleTime: 1000 * 60 * 2,
  });
}

// ========================================
// CALCULATOR MUTATIONS
// ========================================

export function useCreateCalculator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCalculatorData) => calculatorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.lists() });
      toast.success('Calculator created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create calculator');
    },
  });
}

export function useUpdateCalculator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCalculatorData }) =>
      calculatorsApi.update(id, data),
    onSuccess: (updatedCalculator, variables) => {
      // Immediately update all list caches with the new data
      queryClient.setQueriesData(
        { queryKey: calculatorKeys.lists() },
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            calculators: oldData.calculators.map((calc: any) =>
              calc.id === variables.id ? updatedCalculator : calc
            ),
          };
        }
      );

      // Update detail cache
      queryClient.setQueryData(
        calculatorKeys.detail(variables.id),
        updatedCalculator
      );

      toast.success('Calculator updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update calculator');
    },
  });
}

export function useDeleteCalculator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => calculatorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.lists() });
      toast.success('Calculator deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete calculator');
    },
  });
}

// ========================================
// FIELD MUTATIONS
// ========================================

export function useCreateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFieldData) => calculatorsApi.createField(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.fields(variables.calculatorId) });
      queryClient.invalidateQueries({ queryKey: calculatorKeys.detail(variables.calculatorId) });
      toast.success('Field added successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to add field');
    },
  });
}

export function useUpdateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ calculatorId, fieldId, data }: { calculatorId: string; fieldId: string; data: UpdateFieldData }) =>
      calculatorsApi.updateField(calculatorId, fieldId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.fields(variables.calculatorId) });
      queryClient.invalidateQueries({ queryKey: calculatorKeys.detail(variables.calculatorId) });
      toast.success('Field updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update field');
    },
  });
}

export function useDeleteField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ calculatorId, fieldId }: { calculatorId: string; fieldId: string }) =>
      calculatorsApi.deleteField(calculatorId, fieldId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.fields(variables.calculatorId) });
      queryClient.invalidateQueries({ queryKey: calculatorKeys.detail(variables.calculatorId) });
      toast.success('Field deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete field');
    },
  });
}

// ========================================
// FORMULA MUTATIONS
// ========================================

export function useCreateFormula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFormulaData) => calculatorsApi.createFormula(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.formulas(variables.calculatorId) });
      queryClient.invalidateQueries({ queryKey: calculatorKeys.detail(variables.calculatorId) });
      toast.success('Formula added successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to add formula');
    },
  });
}

export function useUpdateFormula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ calculatorId, formulaId, data }: { calculatorId: string; formulaId: string; data: UpdateFormulaData }) =>
      calculatorsApi.updateFormula(calculatorId, formulaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.formulas(variables.calculatorId) });
      queryClient.invalidateQueries({ queryKey: calculatorKeys.detail(variables.calculatorId) });
      toast.success('Formula updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update formula');
    },
  });
}

export function useDeleteFormula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ calculatorId, formulaId }: { calculatorId: string; formulaId: string }) =>
      calculatorsApi.deleteFormula(calculatorId, formulaId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.formulas(variables.calculatorId) });
      queryClient.invalidateQueries({ queryKey: calculatorKeys.detail(variables.calculatorId) });
      toast.success('Formula deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete formula');
    },
  });
}

export function useValidateFormula() {
  return useMutation({
    mutationFn: (data: ValidateFormulaData) => calculatorsApi.validateFormula(data),
    // No toast for validation - handled by UI
  });
}

// ========================================
// EXECUTION QUERIES & MUTATIONS
// ========================================

export function useExecuteCalculator() {
  return useMutation({
    mutationFn: (data: ExecuteCalculatorData) => calculatorsApi.execute(data),
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to execute calculator');
    },
  });
}

export function useSaveExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveExecutionData) => calculatorsApi.saveExecution(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calculatorKeys.executions() });
      toast.success('Execution saved successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to save execution');
    },
  });
}

export function useExecutions(query?: ExecutionQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: calculatorKeys.executionList(query),
    queryFn: () => calculatorsApi.getExecutions(query),
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled !== false,
  });
}

export function useExecution(executionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: calculatorKeys.execution(executionId),
    queryFn: () => calculatorsApi.getExecution(executionId),
    enabled: options?.enabled !== false && !!executionId,
    staleTime: 1000 * 60 * 10,
  });
}

// ========================================
// DATABASE LOOKUP QUERIES
// ========================================

export function useResolveDatabaseField() {
  return useMutation({
    mutationFn: (data: ResolveDatabaseFieldData) => calculatorsApi.resolveDatabaseField(data),
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to resolve database field');
    },
  });
}

export function useDatabaseLookupOptions(data: GetLookupOptionsData, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['database-lookup', data.dataSource, data.search, data.limit],
    queryFn: () => calculatorsApi.getLookupOptions(data),
    enabled: options?.enabled !== false && !!data.dataSource,
    staleTime: 1000 * 60 * 5,
  });
}
