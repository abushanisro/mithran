'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Users,
  Award,
  Calendar,
  Building2,
  Factory,
  Zap,
  Edit2,
  Trash2
} from 'lucide-react';
import { useSupplierNominations, useDeleteSupplierNomination } from '@/lib/api/hooks/useSupplierNominations';
import {
  getStatusColor,
  getStatusText,
  getNominationTypeLabel,
  NominationType,
  NominationStatus,
  type SupplierNominationSummary,
} from '@/lib/api/supplier-nominations';
import { CreateNominationDialog } from './CreateNominationDialog';
import { EditNominationDialog } from './EditNominationDialog';

interface SupplierNominationsDashboardProps {
  projectId: string;
  evaluationGroupId?: string;
  onSelectNomination?: (nominationId: string) => void;
}

export function SupplierNominationsDashboard({
  projectId,
  evaluationGroupId,
  onSelectNomination,
}: SupplierNominationsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<NominationType | 'all'>('all');
  const [editingNomination, setEditingNomination] = useState<SupplierNominationSummary | null>(null);

  const { data: rawNominations = [], isLoading } = useSupplierNominations(projectId) as { data: SupplierNominationSummary[], isLoading: boolean };
  const deleteNominationMutation = useDeleteSupplierNomination();

  // Deduplicate nominations by ID to fix any cache issues
  const nominations = React.useMemo(() => {
    const seen = new Set();
    return rawNominations.filter(nomination => {
      if (seen.has(nomination.id)) {
        return false;
      }
      seen.add(nomination.id);
      return true;
    });
  }, [rawNominations]);

  // Filter nominations
  const filteredNominations = nominations.filter(nomination => {
    const matchesSearch = nomination.nominationName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || nomination.nominationType === selectedType;
    return matchesSearch && matchesType;
  });

  // Calculate dashboard stats
  const stats = {
    total: nominations.length,
    oem: nominations.filter(n => n.nominationType === NominationType.OEM).length,
    manufacturer: nominations.filter(n => n.nominationType === NominationType.MANUFACTURER).length,
    hybrid: nominations.filter(n => n.nominationType === NominationType.HYBRID).length,
    completed: nominations.filter(n => n.status === NominationStatus.COMPLETED || n.status === NominationStatus.APPROVED).length,
    inProgress: nominations.filter(n => n.status === NominationStatus.IN_PROGRESS).length,
    totalVendors: nominations.reduce((sum, n) => sum + n.vendorCount, 0)
  };

  const handleCreateSuccess = (nominationId: string) => {
    onSelectNomination?.(nominationId);
  };

  const handleDeleteNomination = (nomination: SupplierNominationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${nomination.nominationName}"? This action cannot be undone.`)) {
      deleteNominationMutation.mutate(nomination.id);
    }
  };

  const handleEditNomination = (nomination: SupplierNominationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNomination(nomination);
  };

  const getNominationTypeIcon = (type: NominationType) => {
    switch (type) {
      case NominationType.OEM:
        return <Award className="h-4 w-4 text-blue-400" />;
      case NominationType.MANUFACTURER:
        return <Factory className="h-4 w-4 text-green-400" />;
      case NominationType.HYBRID:
        return <Zap className="h-4 w-4 text-purple-400" />;
      default:
        return <Building2 className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading supplier nominations...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">Supplier Nominations</h1>
            <p className="text-gray-300 mt-1">
              Evaluate and nominate suppliers for OEM and manufacturing partnerships
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Nomination
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.oem}</div>
              <div className="text-sm text-gray-400">OEM</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.manufacturer}</div>
              <div className="text-sm text-gray-400">Manufacturers</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.hybrid}</div>
              <div className="text-sm text-gray-400">Hybrid</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{stats.inProgress}</div>
              <div className="text-sm text-gray-400">In Progress</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{stats.totalVendors}</div>
              <div className="text-sm text-gray-400">Total Vendors</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search nominations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('all')}
              className={selectedType === 'all' ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
            >
              All
            </Button>
            <Button
              variant={selectedType === NominationType.OEM ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(NominationType.OEM)}
              className={selectedType === NominationType.OEM ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
            >
              OEM
            </Button>
            <Button
              variant={selectedType === NominationType.MANUFACTURER ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(NominationType.MANUFACTURER)}
              className={selectedType === NominationType.MANUFACTURER ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
            >
              Manufacturer
            </Button>
            <Button
              variant={selectedType === NominationType.HYBRID ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(NominationType.HYBRID)}
              className={selectedType === NominationType.HYBRID ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
            >
              Hybrid
            </Button>
          </div>
        </div>

        {/* Nominations Grid */}
        {filteredNominations.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                {searchTerm || selectedType !== 'all' ? 'No nominations match your filters' : 'No supplier nominations found'}
              </div>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Nomination
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNominations.map((nomination) => (
              <Card
                key={nomination.id}
                className="bg-gray-800 border-gray-700 hover:border-gray-600 cursor-pointer transition-all duration-200 group"
                onClick={() => onSelectNomination?.(nomination.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getNominationTypeIcon(nomination.nominationType)}
                      <div>
                        <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                          {nomination.nominationName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs border-${getStatusColor(nomination.status)}-500 text-${getStatusColor(nomination.status)}-400`}
                          >
                            {getStatusText(nomination.status)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getNominationTypeLabel(nomination.nominationType)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEditNomination(nomination, e)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-400 hover:bg-gray-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteNomination(nomination, e)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Completion</span>
                      <span className="text-white font-medium">{nomination.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${nomination.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Vendor Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Vendors</span>
                    </div>
                    <span className="text-white font-medium">{nomination.vendorCount}</span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Created</span>
                    </div>
                    <span className="text-gray-300 text-sm">
                      {new Date(nomination.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Nomination Dialog */}
        <CreateNominationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={projectId}
          evaluationGroupId={evaluationGroupId}
          onSuccess={handleCreateSuccess}
        />

        {/* Edit Nomination Dialog */}
        <EditNominationDialog
          nomination={editingNomination}
          onClose={() => setEditingNomination(null)}
          projectId={projectId}
        />
      </div>
    </div>
  );
}