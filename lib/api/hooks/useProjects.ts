/**
 * React Query hooks for Projects API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../projects';
import type {
  CreateProjectData,
  UpdateProjectData,
  ProjectQuery,
} from '../projects';
import { ApiError } from '../client';
import { toast } from 'sonner';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (query?: ProjectQuery) => [...projectKeys.lists(), query] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  costAnalysis: (id: string) => [...projectKeys.detail(id), 'cost-analysis'] as const,
};

export function useProjects(query?: ProjectQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: () => projectsApi.getAll(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled !== false,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProjectCostAnalysis(id: string) {
  return useQuery({
    queryKey: projectKeys.costAnalysis(id),
    queryFn: () => projectsApi.getCostAnalysis(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectData) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create project');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
      projectsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      toast.success('Project updated successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update project');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project deleted successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete project');
    },
  });
}
