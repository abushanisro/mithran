'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit2, Trash2, GripVertical, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useBOMItems, deleteBOMItem, updateBOMItemsSortOrder, BOMItem } from '@/lib/api/hooks/useBOMItems';

interface BOMItemsTableProps {
  bomId: string;
  onEditItem: (item: any) => void;
}

export function BOMItemsTable({ bomId, onEditItem }: BOMItemsTableProps) {
  const { data, isLoading, refetch } = useBOMItems(bomId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BOMItem | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localItems, setLocalItems] = useState<BOMItem[]>([]);

  const bomItems = data?.items || [];
  // Use local items for drag-and-drop, fallback to fetched items
  const items: BOMItem[] = localItems.length > 0 ? localItems : bomItems;

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await deleteBOMItem(itemToDelete.id);
      await refetch(); // Refresh the data
      toast.success('Item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    if (!draggedItem) {
      setDraggedIndex(null);
      return;
    }

    newItems.splice(dropIndex, 0, draggedItem);

    // Update sort orders
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    setLocalItems(updatedItems); // Update local state for immediate UI feedback
    setDraggedIndex(null);

    try {
      const sortOrderPayload = updatedItems.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
      }));

      await updateBOMItemsSortOrder(sortOrderPayload);
      await refetch(); // Refresh from server
      setLocalItems([]); // Clear local state
      toast.success('Order updated successfully');
    } catch (error) {
      toast.error('Failed to update order');
      setLocalItems([]); // Revert to server data
    }
  };

  const getItemTypeBadge = (type: string) => {
    const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      assembly: { label: 'Assembly', variant: 'default' },
      sub_assembly: { label: 'Sub-Assembly', variant: 'secondary' },
      child_part: { label: 'Child Part', variant: 'outline' },
      bop: { label: 'BOP', variant: 'outline' },
    };

    const config = typeLabels[type] || { label: type, variant: 'outline' as const };
    return (
      <Badge variant={config.variant} className="font-normal">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground">Loading BOM items...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
        <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No items yet</h3>
        <p className="text-muted-foreground max-w-md mb-4">
          Start adding items to your BOM by clicking the "Add Item" button above.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Annual Volume</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
              >
                <TableCell>
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.partNumber}</TableCell>
                <TableCell>{getItemTypeBadge(item.itemType)}</TableCell>
                <TableCell>
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell>{item.annualVolume.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{item.material}</div>
                    <div className="text-muted-foreground text-xs">{item.materialGrade}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditItem(item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete BOM Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
