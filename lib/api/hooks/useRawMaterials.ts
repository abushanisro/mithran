import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface RawMaterial {
  id: string;
  materialGroup: string;
  material: string;
  materialAbbreviation?: string;
  materialGrade?: string;
  stockForm?: string;
  matlState?: string;
  application?: string;
  regrinding?: string;
  regrindingPercentage?: number;
  clampingPressureMpa?: number;
  ejectDeflectionTempC?: number;
  meltingTempC?: number;
  moldTempC?: number;
  densityKgM3?: number;
  specificHeatMelt?: number;
  thermalConductivityMelt?: number;
  location?: string;
  year?: number;
  q1Cost?: number;
  q2Cost?: number;
  q3Cost?: number;
  q4Cost?: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RawMaterialListResponse {
  items: RawMaterial[];
  total: number;
}

export interface QueryRawMaterialsParams {
  search?: string;
  materialGroup?: string;
  material?: string;
  location?: string;
  year?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateRawMaterialData {
  materialGroup: string;
  material: string;
  materialAbbreviation?: string;
  materialGrade?: string;
  stockForm?: string;
  matlState?: string;
  application?: string;
  regrinding?: string;
  regrindingPercentage?: number;
  clampingPressureMpa?: number;
  ejectDeflectionTempC?: number;
  meltingTempC?: number;
  moldTempC?: number;
  densityKgM3?: number;
  specificHeatMelt?: number;
  thermalConductivityMelt?: number;
  location?: string;
  year?: number;
  q1Cost?: number;
  q2Cost?: number;
  q3Cost?: number;
  q4Cost?: number;
}

export interface UpdateRawMaterialData extends Partial<CreateRawMaterialData> {}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useRawMaterials(params?: QueryRawMaterialsParams) {
  return useQuery({
    queryKey: ['raw-materials', 'list', params],
    queryFn: async () => {
      const response = await apiClient.get<RawMaterialListResponse>('/raw-materials', { params });
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRawMaterial(id: string | undefined) {
  return useQuery({
    queryKey: ['raw-materials', 'detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Raw material ID is required');
      const response = await apiClient.get<RawMaterial>(`/raw-materials/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

export function useRawMaterialsGrouped() {
  return useQuery({
    queryKey: ['raw-materials', 'grouped'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/raw-materials/grouped');
      return response;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to get unique filter options for dropdowns
export function useRawMaterialFilterOptions() {
  return useQuery({
    queryKey: ['raw-materials', 'filter-options'],
    queryFn: async () => {
      const response = await apiClient.get<{
        materialGroups: string[];
        materialTypes: string[];
        locations: string[];
        grades: string[];
        years: number[];
      }>('/raw-materials/filter-options');

      return response;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRawMaterialData) => {
      const response = await apiClient.post<RawMaterial>('/raw-materials', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      toast.success('Raw material created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create raw material');
    },
  });
}

export function useUpdateRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRawMaterialData }) => {
      const response = await apiClient.put<RawMaterial>(`/raw-materials/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials', 'detail', variables.id] });
      toast.success('Raw material updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update raw material');
    },
  });
}

export function useDeleteRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/raw-materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      toast.success('Raw material deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete raw material');
    },
  });
}

export function useDeleteAllRawMaterials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<{ message: string; deleted: number }>('/raw-materials');

      if (!response) {
        throw new Error('Failed to delete all materials');
      }

      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      toast.success(`Successfully deleted ${data.deleted} materials`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete all materials');
    },
  });
}

export function useUploadRawMaterialsExcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      if (process.env.NODE_ENV === 'development') {
        console.log('[Excel Upload] Starting...');
      }

      const response = await apiClient.uploadFiles<{
        message: string;
        created: number;
        failed: number;
        errors?: any[];
      }>('/raw-materials/upload-excel', formData, {
        timeout: 300000, // 5 minutes timeout
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[Excel Upload] Completed:', response);
      }
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });

      // Log detailed errors to console for debugging (development only)
      if (process.env.NODE_ENV === 'development' && data.errors && data.errors.length > 0) {
        console.group('Excel Upload Errors');
        console.table(data.errors.slice(0, 10)); // Show first 10 in table format

        if (data.errors[0]) {

          if (data.errors[0].columns) {
          }

          if (data.errors[0].message) {
          }
        }

        console.groupEnd();
      }

      if (data.failed > 0) {
        const errorMsg = data.errors?.[0]?.message || 'Unknown error';
        toast.error(
          `Upload completed: ${data.created} created, ${data.failed} failed.\n${errorMsg}\nCheck browser console (F12) for full details.`,
          { duration: 10000 }
        );
      } else {
        toast.success(`Successfully imported ${data.created} materials`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload Excel file');
    },
  });
}
