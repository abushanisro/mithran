import { useState } from 'react';
import { ChevronDown, ChevronRight, Package, Layers, Box, FileText, Plus, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export type BOMItemType = 'assembly' | 'sub_assembly' | 'child_part' | 'bop';

export interface BOMItem {
  id: string;
  name: string;
  partNumber?: string;
  itemType: BOMItemType;
  quantity: number;
  unit?: string;
  material?: string;
  children?: BOMItem[];
}

interface BOMTreeViewProps {
  items: BOMItem[];
  onAddItem: (parentId: string | null, type: BOMItemType) => void;
  onEditItem: (item: BOMItem) => void;
  onDeleteItem: (id: string) => void;
}

function BOMTreeItem({
  item,
  onAddItem,
  onEditItem,
  onDeleteItem,
  level = 0,
}: {
  item: BOMItem;
  onAddItem: BOMTreeViewProps['onAddItem'];
  onEditItem: BOMTreeViewProps['onEditItem'];
  onDeleteItem: BOMTreeViewProps['onDeleteItem'];
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  const getIcon = () => {
    switch (item.itemType) {
      case 'assembly':
        return <Package className="h-4 w-4 text-primary" />;
      case 'sub_assembly':
        return <Layers className="h-4 w-4 text-blue-600" />;
      case 'child_part':
        return <Box className="h-4 w-4 text-orange-600" />;
      case 'bop':
        return <FileText className="h-4 w-4 text-green-600" />;
    }
  };

  const getChildType = (): BOMItemType | null => {
    if (item.itemType === 'assembly') return 'sub_assembly';
    if (item.itemType === 'sub_assembly') return 'child_part';
    return null;
  };

  const childType = getChildType();

  return (
    <div className={cn('relative', level > 0 && 'ml-6 border-l border-border/50 pl-4')}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="group flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
          {hasChildren || childType ? (
            <CollapsibleTrigger asChild>
              <button className="p-0.5 hover:bg-muted rounded">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5" />
          )}

          {getIcon()}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
              {item.partNumber && (
                <span className="text-xs text-muted-foreground">({item.partNumber})</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{item.quantity} {item.unit || 'pcs'}</span>
              {item.material && <span>{item.material}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {childType && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => onAddItem(item.id, childType)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEditItem(item)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteItem(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {(hasChildren || childType) && (
          <CollapsibleContent>
            {item.children?.map((child) => (
              <BOMTreeItem
                key={child.id}
                item={child}
                onAddItem={onAddItem}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                level={level + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function BOMTreeView({ items, onAddItem, onEditItem, onDeleteItem }: BOMTreeViewProps) {
  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm mb-3">No BOM items yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddItem(null, 'assembly')}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Assembly
          </Button>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <BOMTreeItem
              key={item.id}
              item={item}
              onAddItem={onAddItem}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddItem(null, 'assembly')}
            className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10 mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Assembly
          </Button>
        </>
      )}
    </div>
  );
}
