'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { 
  BomPartsSelectionCard, 
  VendorSelectionCard, 
  NewEvaluationDialog,
  SupplierEvaluationDashboard,
  SimpleEvaluationView,
  EvaluationGroupView
} from '@/components/features/supplier-evaluation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useBOMs } from '@/lib/api/hooks/useBOM';
import { useBOMItems } from '@/lib/api/hooks/useBOMItems';
import { useVendors } from '@/lib/api/hooks/useVendors';
import { useCreateSupplierEvaluationGroup, useSupplierEvaluationGroups } from '@/lib/api/hooks/useSupplierEvaluationGroups';
import { toast } from 'sonner';
import { type BomItemForEvaluation, type ProcessForEvaluation } from '@/lib/api/supplier-evaluation-groups';

export default function SupplierEvaluationPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || '';

  // View state management
  const [currentView, setCurrentView] = useState<'dashboard' | 'evaluation' | 'legacy'>('legacy');
  const [selectedEvaluationGroupId, setSelectedEvaluationGroupId] = useState<string | null>(null);
  const [newEvaluationDialogOpen, setNewEvaluationDialogOpen] = useState(false);

  // Legacy form state (for backward compatibility)
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // Fixed: Start empty, no auto-selection
  const [groupName, setGroupName] = useState('');
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  // Fetch BOMs and BOM items
  const { data: bomsData } = useBOMs({ projectId });
  const { data: bomItemsData } = useBOMItems(selectedBomId);
  const { data: evaluationGroupsData, isLoading: isLoadingGroups } = useSupplierEvaluationGroups(projectId);

  const createGroupMutation = useCreateSupplierEvaluationGroup();

  const boms = bomsData?.boms || [];
  const bomItems = bomItemsData?.items || [];
  const evaluationGroups = evaluationGroupsData || [];
  
  // Get unique processes from selected BOM items with expanded mapping
  const selectedProcesses = React.useMemo(() => {
    if (selectedItems.length === 0) return [];
    const selectedBomItems = bomItems.filter(item => selectedItems.includes(item.id));
    const processes = selectedBomItems.flatMap(item => {
      // Map item types to multiple related processes for better vendor matching
      switch(item.itemType) {
        case 'assembly':
          return ['Assembly', 'Welding', 'Fastening'];
        case 'sub_assembly':
          return ['Machining', 'CNC Machining', 'CNC Turning', 'CNC Milling', 'Turning', 'Milling'];
        case 'child_part':
          return ['Casting', 'Investment Casting', 'Sand Casting', 'Die Casting', 'Forging', 'Stamping'];
        default:
          return ['Manufacturing', 'General Manufacturing', 'Fabrication'];
      }
    });
    return [...new Set(processes)];
  }, [bomItems, selectedItems]);
  
  // Fetch ALL vendors - filter on client side for performance
  const { data: vendorsData, isLoading: isLoadingVendors } = useVendors({
    status: 'active',
    limit: 1000 // Get all vendors, no process filtering on backend
  });

  const allVendors = vendorsData?.vendors || [];
  
  // Client-side vendor matching - ANY process match (not ALL)
  const matchedVendors = React.useMemo(() => {
    if (selectedItems.length === 0) return []; // Show empty until parts selected
    
    const selectedBomItems = bomItems.filter(item => selectedItems.includes(item.id));
    if (selectedBomItems.length === 0) return [];
    
    // Get actual processes from BOM items (simplified mapping)
    const requiredProcesses = selectedBomItems.map(item => {
      switch(item.itemType) {
        case 'assembly': return 'Assembly';
        case 'sub_assembly': return 'Machining'; 
        case 'child_part': return 'Casting';
        default: return 'Manufacturing';
      }
    });
    
    // Match vendors that support ANY of the required processes
    return allVendors.filter(vendor => 
      vendor.process?.some((vendorProcess: string) => 
        requiredProcesses.some(reqProcess => 
          vendorProcess.toLowerCase().includes(reqProcess.toLowerCase()) ||
          reqProcess.toLowerCase().includes(vendorProcess.toLowerCase()) ||
          // Fallback matches for common processes
          (reqProcess === 'Manufacturing' && vendorProcess.toLowerCase().includes('manufactur')) ||
          (reqProcess === 'Assembly' && vendorProcess.toLowerCase().includes('assembly')) ||
          (reqProcess === 'Machining' && (vendorProcess.toLowerCase().includes('machin') || vendorProcess.toLowerCase().includes('cnc'))) ||
          (reqProcess === 'Casting' && vendorProcess.toLowerCase().includes('cast'))
        )
      ) || 
      // Always include vendors without specific process data as potential matches
      !vendor.process || vendor.process.length === 0
    );
  }, [allVendors, selectedItems, bomItems]);

  // Production: Vendor matching monitoring (development only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && selectedItems.length === 0 && allVendors.length > 0) {
      // Log in development only if there are potential matching issues
    }
  }, [allVendors.length, selectedItems.length, matchedVendors.length]);

  // Set initial BOM selection
  useEffect(() => {
    if (boms.length > 0 && !selectedBomId) {
      const firstBom = boms[0];
      if (firstBom?.id) {
        setSelectedBomId(firstBom.id);
      }
    }
  }, [boms, selectedBomId]);

  // Transform BOM items to match our interface
  const transformedBomItems = bomItems.map(item => ({
    id: item.id,
    partNumber: item.partNumber || item.name,
    description: item.description || item.name,
    category: item.itemType || 'Other',
    processType: item.itemType === 'assembly' ? 'Assembly' :
      item.itemType === 'sub_assembly' ? 'Machining' :
        item.itemType === 'child_part' ? 'Casting' : 'Manufacturing',
    quantity: item.quantity || 1
  }));

  const handleItemToggle = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev =>
      selected
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedItems(transformedBomItems.map(item => item.id));
  }, [transformedBomItems]);

  const handleClearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const handleGroupNameChange = useCallback((name: string) => {
    setGroupName(name);
  }, []);

  const handleVendorToggle = useCallback((vendorId: string, selected: boolean) => {
    setSelectedVendorIds(prev =>
      selected
        ? [...prev, vendorId]
        : prev.filter(id => id !== vendorId)
    );
  }, []);

  const handleCreateEvaluationGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one BOM part');
      return;
    }

    try {
      const selectedBomItemsData: BomItemForEvaluation[] = bomItems
        .filter(item => selectedItems.includes(item.id))
        .map(item => ({
          id: item.id,
          name: item.name,
          partNumber: item.partNumber,
          material: (item as any).material, // item.material might not be in BOMItem type but might be in the real data
          quantity: item.quantity
        }));

      // For now, add a default process based on selected items
      const processes: ProcessForEvaluation[] = [{
        id: 'default-manufacturing',
        name: 'General Manufacturing',
        processGroup: 'Manufacturing',
        type: 'manufacturing',
        isPredefined: false
      }];

      await createGroupMutation.mutateAsync({
        projectId,
        name: groupName.trim(),
        bomItems: selectedBomItemsData,
        processes: processes
      });

      toast.success('Supplier evaluation group created successfully');

      // Reset form
      setGroupName('');
      setSelectedItems([]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating evaluation group:', error);
      }
      toast.error('Failed to create evaluation group');
    }
  };

  // View handlers
  const handleSelectEvaluationGroup = useCallback((groupId: string) => {
    setSelectedEvaluationGroupId(groupId);
    setCurrentView('evaluation');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedEvaluationGroupId(null);
  }, []);

  const handleNewEvaluation = useCallback(() => {
    setNewEvaluationDialogOpen(true);
  }, []);

  const handleEvaluationSuccess = useCallback(() => {
    // Reset forms and go back to dashboard
    setSelectedItems([]);
    setSelectedVendorIds([]);
    setGroupName('');
    setCurrentView('dashboard');
  }, []);

  const handleViewFile = useCallback((part: any, fileType: '2d' | '3d') => {
    const filePath = fileType === '2d' ? part.file2dPath : part.file3dPath;
    if (filePath) {
      // Open file in new tab/window
      window.open(filePath, '_blank');
    }
  }, []);

  const handleBackToSupplierDashboard = useCallback(() => {
    setCurrentView('dashboard');
  }, []);

  // Render based on current view - use clean block engine instead of stepped view
  if (currentView === 'evaluation' && selectedEvaluationGroupId) {
    return (
      <EvaluationGroupView
        projectId={projectId}
        bomParts={transformedBomItems.map(item => {
          const bomItem = bomItems.find(bi => bi.id === item.id);
          return {
            id: item.id,
            partNumber: item.partNumber,
            description: item.description,
            category: item.category,
            process: item.processType || 'Manufacturing',
            quantity: item.quantity,
            price: bomItem?.unitCost || undefined,
            file2dPath: bomItem?.file2dPath,
            file3dPath: bomItem?.file3dPath
          };
        })}
        onViewFile={handleViewFile}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Supplier Evaluation"
          description="Process-based supplier matching and evaluation groups"
        />
        
        <SupplierEvaluationDashboard
          projectId={projectId}
          evaluationGroups={evaluationGroups}
          isLoading={isLoadingGroups}
          onNewEvaluation={handleNewEvaluation}
          onSelectEvaluationGroup={handleSelectEvaluationGroup}
        />

        {/* New Evaluation Dialog */}
        <NewEvaluationDialog 
          open={newEvaluationDialogOpen}
          onOpenChange={setNewEvaluationDialogOpen}
          onSuccess={handleEvaluationSuccess}
        />
      </div>
    );
  }

  // Block engine single-page view (default) - now fetches vendors from API directly
  return (
    <EvaluationGroupView
      projectId={projectId}
      bomParts={transformedBomItems.map(item => {
        const bomItem = bomItems.find(bi => bi.id === item.id);
        return {
          id: item.id,
          partNumber: item.partNumber,
          description: item.description,
          category: item.category,
          process: item.processType || 'Manufacturing',
          quantity: item.quantity,
          price: bomItem?.unitCost || undefined,
          file2dPath: bomItem?.file2dPath,
          file3dPath: bomItem?.file3dPath
        };
      })}
      onViewFile={handleViewFile}
      onBack={handleBackToSupplierDashboard}
    />
  );
}