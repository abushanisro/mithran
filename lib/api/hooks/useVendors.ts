/**
 * React Query hooks for Vendors API - Comprehensive Vendor Management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '../vendors';
import type {
  CreateVendorData,
  UpdateVendorData,
  VendorQuery,
  VendorEquipment,
  VendorService,
  VendorContact,
} from '../vendors';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (query?: VendorQuery) => [...vendorKeys.lists(), query] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
  equipment: (vendorId: string) => [...vendorKeys.detail(vendorId), 'equipment'] as const,
  services: (vendorId: string) => [...vendorKeys.detail(vendorId), 'services'] as const,
  contacts: (vendorId: string) => [...vendorKeys.detail(vendorId), 'contacts'] as const,
  performance: (id: string) => [...vendorKeys.detail(id), 'performance'] as const,
  capabilities: () => [...vendorKeys.all, 'capabilities'] as const,
  equipmentTypes: () => [...vendorKeys.all, 'equipment-types'] as const,
};

// ============================================================================
// VENDOR HOOKS
// ============================================================================

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

export function useEquipmentTypes() {
  return useQuery({
    queryKey: vendorKeys.equipmentTypes(),
    queryFn: () => vendorsApi.getEquipmentTypes(),
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

export function useDeleteAllVendors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => vendorsApi.deleteAll(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      toast.success(`Successfully deleted ${data.deleted} vendors`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete all vendors');
    },
  });
}

export function useUploadVendorsCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => vendorsApi.uploadCsv(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });

      if (data.errors && data.errors.length > 0) {
        console.group('Vendor CSV Upload Errors');
        console.table(data.errors.slice(0, 10));
        console.groupEnd();
      }

      // Build comprehensive status message
      const parts = [];
      if (data.created > 0) parts.push(`${data.created} created`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
      if (data.failed > 0) parts.push(`${data.failed} failed`);

      const summary = parts.join(', ');

      if (data.failed > 0) {
        toast.error(
          `Upload completed: ${summary}. Check console for error details.`,
          { duration: 10000 }
        );
      } else if (data.created > 0 || data.updated > 0) {
        toast.success(`Successfully imported vendors: ${summary}`);
      } else {
        toast.info(`No changes made: ${summary}`);
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to upload CSV file');
    },
  });
}

// ============================================================================
// VENDOR EQUIPMENT HOOKS
// ============================================================================

export function useVendorEquipment(vendorId: string | undefined) {
  return useQuery({
    queryKey: vendorKeys.equipment(vendorId || ''),
    queryFn: () => vendorsApi.getEquipment(vendorId!),
    enabled: !!vendorId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateVendorEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<VendorEquipment>) => vendorsApi.createEquipment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.equipment(data.vendorId) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(data.vendorId) });
      toast.success('Equipment added successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to add equipment');
    },
  });
}

export function useUpdateVendorEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendorEquipment> }) =>
      vendorsApi.updateEquipment(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.equipment(data.vendorId) });
      toast.success('Equipment updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update equipment');
    },
  });
}

export function useDeleteVendorEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, vendorId }: { id: string; vendorId: string }) => {
      return vendorsApi.deleteEquipment(id).then(() => ({ vendorId }));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.equipment(data.vendorId) });
      toast.success('Equipment deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete equipment');
    },
  });
}

// ============================================================================
// VENDOR SERVICES HOOKS
// ============================================================================

export function useVendorServices(vendorId: string | undefined) {
  return useQuery({
    queryKey: vendorKeys.services(vendorId || ''),
    queryFn: () => vendorsApi.getServices(vendorId!),
    enabled: !!vendorId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<VendorService>) => vendorsApi.createService(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.services(data.vendorId) });
      toast.success('Service added successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to add service');
    },
  });
}

export function useUpdateVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendorService> }) =>
      vendorsApi.updateService(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.services(data.vendorId) });
      toast.success('Service updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update service');
    },
  });
}

export function useDeleteVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, vendorId }: { id: string; vendorId: string }) => {
      return vendorsApi.deleteService(id).then(() => ({ vendorId }));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.services(data.vendorId) });
      toast.success('Service deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete service');
    },
  });
}

// ============================================================================
// VENDOR CONTACTS HOOKS
// ============================================================================

export function useVendorContacts(vendorId: string | undefined) {
  return useQuery({
    queryKey: vendorKeys.contacts(vendorId || ''),
    queryFn: () => vendorsApi.getContacts(vendorId!),
    enabled: !!vendorId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateVendorContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<VendorContact>) => vendorsApi.createContact(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.contacts(data.vendorId) });
      toast.success('Contact added successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to add contact');
    },
  });
}

export function useUpdateVendorContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendorContact> }) =>
      vendorsApi.updateContact(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.contacts(data.vendorId) });
      toast.success('Contact updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update contact');
    },
  });
}

export function useDeleteVendorContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, vendorId }: { id: string; vendorId: string }) => {
      return vendorsApi.deleteContact(id).then(() => ({ vendorId }));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.contacts(data.vendorId) });
      toast.success('Contact deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete contact');
    },
  });
}
