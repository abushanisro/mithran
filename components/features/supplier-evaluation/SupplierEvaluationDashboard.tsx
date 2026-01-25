'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, Users, FileText, Search, Plus, ChevronRight, Edit, Trash2, Loader2 } from 'lucide-react';
import { useUpdateSupplierEvaluationGroup } from '@/lib/api/hooks/useSupplierEvaluationGroups';
import { useVendors } from '@/lib/api/hooks/useVendors';
import { BOMItemDialog } from '@/components/features/bom/BOMItemDialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SupplierEvaluationDashboardProps {
  projectId: string;
  evaluationGroups: any[];
  isLoading?: boolean;
  onNewEvaluation: () => void;
  onSelectEvaluationGroup: (groupId: string) => void;
}

export function SupplierEvaluationDashboard({
  projectId,
  evaluationGroups,
  isLoading = false,
  onNewEvaluation,
  onSelectEvaluationGroup
}: SupplierEvaluationDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Delete state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Fetch vendors separately (now optimized)
  const { data: vendorsData } = useVendors({ status: 'active', limit: 1000 });
  
  // Mutations
  const updateGroupMutation = useUpdateSupplierEvaluationGroup();

  const vendors = vendorsData?.vendors || [];
  const totalVendorsInDb = vendorsData?.total || vendors.length;

  // Filter evaluation groups
  const filteredGroups = (evaluationGroups || []).filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Simple stats
  const totalParts = (evaluationGroups || []).reduce((acc, group) => acc + (group.bomItems?.length || 0), 0);
  const activeVendors = totalVendorsInDb;

  // Simple stats cards
  const statsCards = [
    { title: 'Total Parts', value: totalParts, icon: Package },
    { title: 'Active Vendors', value: activeVendors, icon: Users },
    { title: 'Evaluations', value: evaluationGroups.length, icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Simple Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <div className="p-3 rounded-lg bg-teal-600/20">
                  <stat.icon className="h-6 w-6 text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evaluation Groups */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Evaluation Groups</h2>
            <p className="text-sm text-gray-300">Your supplier evaluations</p>
          </div>
          <Button 
            onClick={onNewEvaluation}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Evaluation
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search evaluations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
          />
        </div>

        {/* Groups List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-700 rounded mb-3"></div>
                  <div className="h-3 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card className="text-center py-12 bg-gray-800 border-gray-700">
            <CardContent>
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm ? 'No matches found' : 'No evaluations yet'}
              </h3>
              {!searchTerm && (
                <p className="text-gray-300 mb-6">
                  Create your first supplier evaluation to get started
                </p>
              )}
              {!searchTerm && (
                <Button 
                  onClick={onNewEvaluation}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Evaluation
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <EvaluationCard
                key={group.id}
                group={group}
                onClick={() => onSelectEvaluationGroup(group.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EvaluationCardProps {
  group: any;
  onClick: () => void;
}

function EvaluationCard({ group, onClick }: EvaluationCardProps) {
  // Use real data from API - the hook returns summary data with counts
  const partsCount = group.bomItemsCount || group.bomItems?.length || 0;
  const processesCount = group.processesCount || group.processes?.length || 0;
  const [deletingGroup, setDeletingGroup] = useState(false);
  const queryClient = useQueryClient();

  // Get status info
  const status = group.status || 'draft';
  const statusColor = {
    draft: 'text-yellow-400',
    active: 'text-green-400', 
    completed: 'text-blue-400',
    archived: 'text-gray-400'
  }[status] || 'text-gray-400';

  const handleEditGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement edit group functionality
    toast.info('Edit functionality coming soon');
  };

  const handleDeleteGroup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setDeletingGroup(true);
    try {
      // Import the validation and delete functions
      const { validateSupplierEvaluationGroupDeletion, deleteSupplierEvaluationGroup } = await import('@/lib/api/supplier-evaluation-groups');
      
      // Validate deletion first
      const validation = await validateSupplierEvaluationGroupDeletion(group.id);
      
      // Check if deletion is blocked
      if (!validation.canDelete) {
        toast.error('Cannot delete evaluation group: ' + validation.blockers.join(', '));
        setDeletingGroup(false);
        return;
      }
      
      // Build confirmation message with warnings
      let confirmMessage = `Are you sure you want to delete "${group.name || 'Unnamed Evaluation'}"?\n\nThis action cannot be undone.`;
      
      if (validation.warnings.length > 0) {
        confirmMessage += '\n\nWarnings:\n' + validation.warnings.map(w => `• ${w}`).join('\n');
      }
      
      if (validation.impactSummary.length > 0) {
        confirmMessage += '\n\nThe following will be permanently deleted:\n' + 
          validation.impactSummary.map(i => `• ${i.count} ${i.label}`).join('\n');
      }
      
      const confirmed = window.confirm(confirmMessage);
      
      if (!confirmed) {
        setDeletingGroup(false);
        return;
      }

      await deleteSupplierEvaluationGroup(group.id);
      
      // Refresh the list
      await queryClient.invalidateQueries({ queryKey: ['supplier-evaluation-groups'] });
      toast.success('Evaluation group deleted successfully');
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete evaluation group');
    } finally {
      setDeletingGroup(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 hover:bg-teal-900 hover:border-teal-600 cursor-pointer transition-colors aspect-square relative group" onClick={onClick}>
      {/* Edit/Delete buttons - top right corner */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={handleEditGroup}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
          onClick={handleDeleteGroup}
          disabled={deletingGroup}
        >
          {deletingGroup ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      <CardContent className="p-4 h-full flex flex-col justify-between">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-white text-base leading-tight pr-16">
            {group.name || 'Unnamed Evaluation'}
          </h3>
          
          {/* Status Badge */}
          <Badge 
            variant="outline" 
            className={`border-gray-600 ${statusColor} text-xs capitalize`}
          >
            {status}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-700/50 rounded">
            <div className="font-medium text-white text-sm">{partsCount}</div>
            <div className="text-gray-300">BOM Items</div>
          </div>
          <div className="text-center p-2 bg-gray-700/50 rounded">
            <div className="font-medium text-white text-sm">{processesCount}</div>
            <div className="text-gray-300">Processes</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center space-y-1">
          {group.description && (
            <p className="text-xs text-gray-400 line-clamp-2">{group.description}</p>
          )}
          
          {/* Created Date */}
          <div className="text-xs text-gray-500">
            Created: {new Date(group.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        {/* Action Button */}
        <Button
          size="sm"
          variant="outline"
          className="border-teal-600 text-teal-400 hover:bg-teal-600 hover:text-white w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <ChevronRight className="h-3 w-3 mr-1" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}