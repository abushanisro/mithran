/**
 * React Query hooks for Vendors API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '../vendors';
import type { CreateVendorData, UpdateVendorData, VendorQuery } from '../vendors';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (query?: VendorQuery) => [...vendorKeys.lists(), query] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
  performance: (id: string) => [...vendorKeys.detail(id), 'performance'] as const,
  capabilities: () => [...vendorKeys.all, 'capabilities'] as const,
};

export function useVendors(query?: VendorQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: vendorKeys.list(query),
    queryFn: () => vendorsApi.getAll(query),
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled !== false,
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => vendorsApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useVendorPerformance(id: string) {
  return useQuery({
    queryKey: vendorKeys.performance(id),
    queryFn: () => vendorsApi.getPerformance(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useVendorCapabilities() {
  return useQuery({
    queryKey: vendorKeys.capabilities(),
    queryFn: () => vendorsApi.getCapabilities(),
    staleTime: 1000 * 60 * 30,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVendorData) => vendorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      toast.success('Vendor created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create vendor');
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorData }) =>
      vendorsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(variables.id) });
      toast.success('Vendor updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update vendor');
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      toast.success('Vendor deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete vendor');
    },
  });
}
