import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lsrApi, CreateLSRDto, UpdateLSRDto } from '../lsr';
import { toast } from 'sonner';
import { ApiError } from '../client';

/**
 * Extract error message from ApiError or generic error
 */
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

/**
 * Check if error is a conflict error (409)
 */
const isConflictError = (error: unknown): boolean => {
  return error instanceof ApiError && error.statusCode === 409;
};

export const useLSR = (search?: string) => {
  return useQuery({
    queryKey: ['lsr', search],
    queryFn: () => lsrApi.getAll(search),
    retry: 1,
    staleTime: 30000,
  });
};

export const useLSRById = (id: number) => {
  return useQuery({
    queryKey: ['lsr', id],
    queryFn: () => lsrApi.getById(id),
    enabled: !!id,
  });
};

export const useLSRStatistics = () => {
  return useQuery({
    queryKey: ['lsr', 'statistics'],
    queryFn: () => lsrApi.getStatistics(),
  });
};

export const useCreateLSR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLSRDto) => lsrApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsr'] });
      toast.success('Labour entry created successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Failed to create labour entry');

      if (isConflictError(error)) {
        toast.error(message, {
          description: 'Please use a different labour code or update the existing entry.',
          duration: 5000,
        });
      } else {
        toast.error(message);
      }
    },
  });
};

export const useUpdateLSR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLSRDto }) =>
      lsrApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsr'] });
      toast.success('Labour entry updated successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Failed to update labour entry');

      if (isConflictError(error)) {
        toast.error(message, {
          description: 'Please use a different labour code.',
          duration: 5000,
        });
      } else {
        toast.error(message);
      }
    },
  });
};

export const useDeleteLSR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => lsrApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsr'] });
      toast.success('Labour entry deleted successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Failed to delete labour entry');
      toast.error(message);
    },
  });
};

export const useBulkCreateLSR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLSRDto[]) => lsrApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsr'] });
      toast.success('Labour entries created successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, 'Failed to create labour entries');

      if (isConflictError(error)) {
        toast.error(message, {
          description: 'One or more labour codes already exist. Please check your data.',
          duration: 5000,
        });
      } else {
        toast.error(message);
      }
    },
  });
};
