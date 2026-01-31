/**
 * React Hooks for Supplier Nominations
 * Production-ready hooks with optimistic updates and caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import SupplierNominationAPI, {
  type SupplierNomination,
  type NominationDetails,
  type VendorEvaluation,
  type CriterionScore,
  type CostAnalysis,
  type RatingEngine,
  type NominationAnalytics,
  type EvaluationCriteria
} from '@/lib/api/supplier-nominations-clean';

// Initialize API client
const API = new SupplierNominationAPI(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// QUERY KEYS
// ============================================================================

const KEYS = {
  nominations: (projectId: string) => ['nominations', projectId],
  nomination: (id: string) => ['nomination', id],
  analytics: (nominationId: string) => ['analytics', nominationId],
  comparison: (nominationId: string) => ['comparison', nominationId],
} as const;

// ============================================================================
// NOMINATION QUERIES
// ============================================================================

export const useNominations = (projectId: string) => {
  return useQuery({
    queryKey: KEYS.nominations(projectId),
    queryFn: () => API.listNominations(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useNomination = (nominationId: string) => {
  return useQuery({
    queryKey: KEYS.nomination(nominationId),
    queryFn: () => API.getNominationDetails(nominationId),
    enabled: !!nominationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

export const useNominationAnalytics = (nominationId: string) => {
  return useQuery({
    queryKey: KEYS.analytics(nominationId),
    queryFn: () => API.getNominationAnalytics(nominationId),
    enabled: !!nominationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useVendorComparison = (nominationId: string) => {
  return useQuery({
    queryKey: KEYS.comparison(nominationId),
    queryFn: () => API.getVendorComparison(nominationId),
    enabled: !!nominationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// ============================================================================
// NOMINATION MUTATIONS
// ============================================================================

export const useCreateNomination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      projectId, 
      name, 
      description 
    }: { 
      projectId: string; 
      name: string; 
      description?: string; 
    }) => API.createNomination(projectId, name, description),
    
    onSuccess: (newNomination) => {
      // Invalidate nominations list
      queryClient.invalidateQueries({ queryKey: KEYS.nominations(newNomination.project_id) });
      
      // Add to cache
      queryClient.setQueryData(KEYS.nomination(newNomination.id), {
        nomination: newNomination,
        criteria: [],
        evaluations: []
      });

      toast.success('Nomination created successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to create nomination: ${error.message}`);
    }
  });
};

export const useUpdateNomination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      nominationId, 
      updates 
    }: { 
      nominationId: string; 
      updates: Partial<Pick<SupplierNomination, 'name' | 'description' | 'status'>>; 
    }) => API.updateNomination(nominationId, updates),
    
    onMutate: async ({ nominationId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: KEYS.nomination(nominationId) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<NominationDetails>(KEYS.nomination(nominationId));

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<NominationDetails>(KEYS.nomination(nominationId), {
          ...previousData,
          nomination: { ...previousData.nomination, ...updates }
        });
      }

      return { previousData };
    },
    
    onError: (err, { nominationId }, context) => {
      // Rollback
      if (context?.previousData) {
        queryClient.setQueryData(KEYS.nomination(nominationId), context.previousData);
      }
      toast.error(`Failed to update nomination: ${err.message}`);
    },
    
    onSuccess: (updatedNomination) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: KEYS.nominations(updatedNomination.project_id) });
      toast.success('Nomination updated successfully');
    }
  });
};

export const useDeleteNomination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nominationId: string) => API.deleteNomination(nominationId),
    
    onSuccess: (_, nominationId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: KEYS.nomination(nominationId) });
      queryClient.removeQueries({ queryKey: KEYS.analytics(nominationId) });
      queryClient.removeQueries({ queryKey: KEYS.comparison(nominationId) });
      
      // Invalidate nominations lists
      queryClient.invalidateQueries({ queryKey: ['nominations'] });
      
      toast.success('Nomination deleted successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to delete nomination: ${error.message}`);
    }
  });
};

// ============================================================================
// VENDOR EVALUATION MUTATIONS
// ============================================================================

export const useAddVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      nominationId, 
      vendorId 
    }: { 
      nominationId: string; 
      vendorId: string; 
    }) => API.addVendorToNomination(nominationId, vendorId),
    
    onSuccess: (newEvaluation, { nominationId }) => {
      // Invalidate nomination data
      queryClient.invalidateQueries({ queryKey: KEYS.nomination(nominationId) });
      queryClient.invalidateQueries({ queryKey: KEYS.analytics(nominationId) });
      queryClient.invalidateQueries({ queryKey: KEYS.comparison(nominationId) });
      
      toast.success('Vendor added successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to add vendor: ${error.message}`);
    }
  });
};

export const useUpdateScores = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      evaluationId, 
      scores 
    }: { 
      evaluationId: string; 
      scores: Pick<CriterionScore, 'criterion_id' | 'score' | 'evidence_notes'>[]; 
    }) => API.updateEvaluationScores(evaluationId, scores),
    
    onSuccess: (updatedEvaluation, { evaluationId }) => {
      // Find which nomination this evaluation belongs to
      const nominations = queryClient.getQueriesData<NominationDetails>({ queryKey: ['nomination'] });
      
      for (const [queryKey, data] of nominations) {
        if (data?.evaluations.some(eval => eval.id === evaluationId)) {
          const nominationId = (queryKey as string[])[1];
          
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: KEYS.nomination(nominationId) });
          queryClient.invalidateQueries({ queryKey: KEYS.analytics(nominationId) });
          queryClient.invalidateQueries({ queryKey: KEYS.comparison(nominationId) });
          break;
        }
      }
      
      toast.success('Scores updated successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to update scores: ${error.message}`);
    }
  });
};

export const useRemoveVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evaluationId: string) => API.removeVendorFromNomination(evaluationId),
    
    onSuccess: (_, evaluationId) => {
      // Invalidate all nomination queries as we don't know which one this belongs to
      queryClient.invalidateQueries({ queryKey: ['nomination'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['comparison'] });
      
      toast.success('Vendor removed successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to remove vendor: ${error.message}`);
    }
  });
};

// ============================================================================
// ENGINE MUTATIONS
// ============================================================================

export const useUpdateCostAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      evaluationId, 
      costData 
    }: { 
      evaluationId: string; 
      costData: CostAnalysis; 
    }) => API.updateCostAnalysis(evaluationId, costData),
    
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['nomination'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Cost analysis updated successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to update cost analysis: ${error.message}`);
    }
  });
};

export const useUpdateRatingEngine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      evaluationId, 
      ratingData 
    }: { 
      evaluationId: string; 
      ratingData: RatingEngine; 
    }) => API.updateRatingEngine(evaluationId, ratingData),
    
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['nomination'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Rating engine updated successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to update rating engine: ${error.message}`);
    }
  });
};

// ============================================================================
// CRITERIA MUTATIONS
// ============================================================================

export const useUpdateCriteria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      nominationId, 
      criteria 
    }: { 
      nominationId: string; 
      criteria: Omit<EvaluationCriteria, 'id'>[]; 
    }) => API.updateEvaluationCriteria(nominationId, criteria),
    
    onSuccess: (_, { nominationId }) => {
      // Invalidate nomination data
      queryClient.invalidateQueries({ queryKey: KEYS.nomination(nominationId) });
      toast.success('Evaluation criteria updated successfully');
    },
    
    onError: (error) => {
      toast.error(`Failed to update criteria: ${error.message}`);
    }
  });
};