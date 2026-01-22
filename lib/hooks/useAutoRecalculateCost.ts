/**
 * Auto-recalculate BOM costs hook
 *
 * Automatically triggers cost recalculation when cost components are added/updated
 * Used across all cost sections (Raw Materials, Process, Packaging, Child Parts, Procured Parts)
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface UseAutoRecalculateCostOptions {
  bomId: string;
  bomItemId?: string;
  enabled?: boolean;
}

export function useAutoRecalculateCost(options: UseAutoRecalculateCostOptions) {
  const { bomId, bomItemId, enabled = true } = options;
  const queryClient = useQueryClient();

  /**
   * Trigger automatic cost recalculation
   * This runs after any cost component is saved
   */
  const triggerRecalculation = useCallback(async () => {
    if (!enabled || !bomId) return;

    try {
      // Silently recalculate in the background
      await apiClient.post(`/bom/${bomId}/recalculate-all-costs`);

      // Invalidate all cost-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['bom-item-cost'] });
      queryClient.invalidateQueries({ queryKey: ['bom-cost-report'] });
      queryClient.invalidateQueries({ queryKey: ['bom-cost-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bom-item-cost-hierarchy'] });

      // If specific BOM item, also invalidate that
      if (bomItemId) {
        queryClient.invalidateQueries({ queryKey: ['bom-item-cost', bomItemId] });
      }

      // Show subtle success toast
      toast.success('Costs updated', {
        duration: 2000,
        description: 'BOM costs have been recalculated'
      });
    } catch (error) {
      // Silent fail - don't interrupt user workflow
      // The manual refresh will still work
    }
  }, [bomId, bomItemId, enabled, queryClient]);

  /**
   * Trigger recalculation for a specific BOM item only
   * Faster than full BOM recalculation
   */
  const triggerItemRecalculation = useCallback(async (targetBomItemId: string) => {
    if (!enabled) return;

    try {
      await apiClient.post(`/bom-items/${targetBomItemId}/cost/recalculate`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['bom-item-cost', targetBomItemId] });
      queryClient.invalidateQueries({ queryKey: ['bom-cost-report'] });
    } catch (error) {
      // Silent fail - recalculation will happen on next load
    }
  }, [enabled, queryClient]);

  return {
    triggerRecalculation,
    triggerItemRecalculation,
  };
}
