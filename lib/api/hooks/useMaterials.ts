/**
 * React Query hooks for Materials API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '../materials';
import type {
  CreateMaterialData,
  UpdateMaterialData,
  MaterialQuery,
} from '../materials';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const materialKeys = {
  all: ['materials'] as const,
  lists: () => [...materialKeys.all, 'list'] as const,
  list: (query?: MaterialQuery) => [...materialKeys.lists(), query] as const,
  details: () => [...materialKeys.all, 'detail'] as const,
  detail: (id: string) => [...materialKeys.details(), id] as const,
  suppliers: (id: string) => [...materialKeys.detail(id), 'suppliers'] as const,
  categories: () => [...materialKeys.all, 'categories'] as const,
};

export function useMaterials(query?: MaterialQuery) {
  return useQuery({
    queryKey: materialKeys.list(query),
    queryFn: () => materialsApi.getAll(query),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: materialKeys.detail(id),
    queryFn: () => materialsApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterialSuppliers(id: string) {
  return useQuery({
    queryKey: materialKeys.suppliers(id),
    queryFn: () => materialsApi.getSuppliers(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useMaterialCategories() {
  return useQuery({
    queryKey: materialKeys.categories(),
    queryFn: () => materialsApi.getCategories(),
    staleTime: 1000 * 60 * 30,
  });
}

export function useSearchMaterialsByPartNumber(partNumber: string) {
  return useQuery({
    queryKey: [...materialKeys.all, 'search', partNumber],
    queryFn: () => materialsApi.searchByPartNumber(partNumber),
    enabled: partNumber.length >= 3,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaterialData) => materialsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
      toast.success('Material created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create material');
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaterialData }) =>
      materialsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(variables.id) });
      toast.success('Material updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update material');
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => materialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
      toast.success('Material deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete material');
    },
  });
}
