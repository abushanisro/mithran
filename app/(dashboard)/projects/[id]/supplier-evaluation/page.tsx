'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { BomPartsSelectionCard } from '@/components/features/supplier-evaluation/BomPartsSelectionCard';
import { useBOMs } from '@/lib/api/hooks/useBOM';
import { useBOMItems } from '@/lib/api/hooks/useBOMItems';
import { useCreateSupplierEvaluationGroup } from '@/lib/api/hooks/useSupplierEvaluationGroups';
import { toast } from 'sonner';
import { type BomItemForEvaluation, type ProcessForEvaluation } from '@/lib/api/supplier-evaluation-groups';

export default function SupplierEvaluationPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id || '';

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedBomId, setSelectedBomId] = useState<string>('');

  // Fetch BOMs and BOM items
  const { data: bomsData } = useBOMs({ projectId });
  const { data: bomItemsData } = useBOMItems(selectedBomId);

  const createGroupMutation = useCreateSupplierEvaluationGroup();

  const boms = bomsData?.boms || [];
  const bomItems = bomItemsData?.items || [];

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
      console.error('Error creating evaluation group:', error);
      toast.error('Failed to create evaluation group');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Evaluation"
        description="Process-based supplier matching and evaluation groups"
      />

      <BomPartsSelectionCard
        bomItems={transformedBomItems}
        selectedItems={selectedItems}
        groupName={groupName}
        onItemToggle={handleItemToggle}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onGroupNameChange={handleGroupNameChange}
        onCreateGroup={handleCreateEvaluationGroup}
        isCreatingGroup={createGroupMutation.isPending}
      />
    </div>
  );
}