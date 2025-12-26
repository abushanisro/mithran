'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Upload, X, ChevronDown, File, Image as ImageIcon } from 'lucide-react';
import { createBOMItem, updateBOMItem } from '@/lib/api/hooks/useBOMItems';

export enum BOMItemType {
  ASSEMBLY = 'assembly',
  SUB_ASSEMBLY = 'sub_assembly',
  CHILD_PART = 'child_part',
  BOP = 'bop',
}

const ITEM_TYPE_LABELS = {
  [BOMItemType.ASSEMBLY]: 'Assembly',
  [BOMItemType.SUB_ASSEMBLY]: 'Sub-Assembly',
  [BOMItemType.CHILD_PART]: 'Child Part',
  [BOMItemType.BOP]: 'BOP (Bill of Process)',
};

interface BOMItemDialogProps {
  bomId: string;
  item?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BOMItemDialog({ bomId, item, open, onOpenChange, onSuccess }: BOMItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [file3d, setFile3d] = useState<File | null>(null);
  const [file2d, setFile2d] = useState<File | null>(null);
  const [file3dDetailsOpen, setFile3dDetailsOpen] = useState(false);
  const [file2dDetailsOpen, setFile2dDetailsOpen] = useState(false);
  const [imagePreview2d, setImagePreview2d] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    description: '',
    itemType: BOMItemType.ASSEMBLY,
    quantity: 1,
    annualVolume: 1000,
    unit: 'pcs',
    material: '',
    materialGrade: '',
  });

  useEffect(() => {
    if (file2d && file2d.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview2d(reader.result as string);
      };
      reader.readAsDataURL(file2d);
    } else {
      setImagePreview2d(null);
    }
  }, [file2d]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        partNumber: item.partNumber || '',
        description: item.description || '',
        itemType: item.itemType || BOMItemType.ASSEMBLY,
        quantity: item.quantity || 1,
        annualVolume: item.annualVolume || 1000,
        unit: item.unit || 'pcs',
        material: item.material || '',
        materialGrade: item.materialGrade || '',
      });
    } else {
      setFormData({
        name: '',
        partNumber: '',
        description: '',
        itemType: BOMItemType.ASSEMBLY,
        quantity: 1,
        annualVolume: 1000,
        unit: 'pcs',
        material: '',
        materialGrade: '',
      });
      setFile3d(null);
      setFile2d(null);
      setFile3dDetailsOpen(false);
      setFile2dDetailsOpen(false);
      setImagePreview2d(null);
    }
  }, [item, open]);

  const handleFile3dDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile3d(droppedFile);
      setFile3dDetailsOpen(true);
    }
  }, []);

  const handleFile2dDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile2d(droppedFile);
      setFile2dDetailsOpen(true);
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        bomId,
        name: formData.name,
        partNumber: formData.partNumber || undefined,
        description: formData.description || undefined,
        itemType: formData.itemType,
        quantity: formData.quantity,
        annualVolume: formData.annualVolume,
        unit: formData.unit,
        material: formData.material || undefined,
        materialGrade: formData.materialGrade || undefined,
      };

      // TODO: Implement file upload functionality
      if (file3d || file2d) {
        toast.info('File upload will be implemented in next phase');
      }

      if (item) {
        await updateBOMItem(item.id, payload);
        toast.success('Item updated successfully');
      } else {
        await createBOMItem(payload);
        toast.success('Item added successfully');
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving BOM item:', error);
      toast.error(error?.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit BOM Item' : 'Create BOM Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update item details' : 'Add a new item to the Bill of Materials'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Cylinder Head Assembly"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                placeholder="e.g., CH-2024-001"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the part..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="materialGrade">Material Grade</Label>
              <Input
                id="materialGrade"
                placeholder="e.g., EN-GJL-250, AlSi10Mg"
                value={formData.materialGrade}
                onChange={(e) => setFormData({ ...formData, materialGrade: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="annualVolume">Annual Volume *</Label>
                <Input
                  id="annualVolume"
                  type="number"
                  min="1"
                  value={formData.annualVolume}
                  onChange={(e) => setFormData({ ...formData, annualVolume: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">UOM</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="lbs">Pounds</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="ft">Feet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="itemType">Type *</Label>
                <Select
                  value={formData.itemType}
                  onValueChange={(value) => setFormData({ ...formData, itemType: value as BOMItemType })}
                >
                  <SelectTrigger id="itemType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Upload 3D File</Label>
              {!file3d ? (
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFile3dDrop}
                  onClick={() => document.getElementById('file3d')?.click()}
                >
                  <input
                    id="file3d"
                    type="file"
                    className="hidden"
                    accept=".stp,.step,.stl,.obj,.iges,.igs"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] || null;
                      setFile3d(selectedFile);
                      if (selectedFile) setFile3dDetailsOpen(true);
                    }}
                  />
                  <div className="space-y-1">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Drag 'n' drop file here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">STEP, STL, OBJ, IGES</p>
                  </div>
                </div>
              ) : (
                <Collapsible open={file3dDetailsOpen} onOpenChange={setFile3dDetailsOpen}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                            <File className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{file3d.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file3d.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`h-4 w-4 transition-transform ${file3dDetailsOpen ? 'rotate-180' : ''}`} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile3d(null);
                              setFile3dDetailsOpen(false);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Type:</span> {file3d.type || 'Unknown'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Modified:</span> {new Date(file3d.lastModified).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Upload 2D File</Label>
              {!file2d ? (
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFile2dDrop}
                  onClick={() => document.getElementById('file2d')?.click()}
                >
                  <input
                    id="file2d"
                    type="file"
                    className="hidden"
                    accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] || null;
                      setFile2d(selectedFile);
                      if (selectedFile) setFile2dDetailsOpen(true);
                    }}
                  />
                  <div className="space-y-1">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Drag 'n' drop file here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DWG, DXF, PNG, JPG</p>
                  </div>
                </div>
              ) : (
                <Collapsible open={file2dDetailsOpen} onOpenChange={setFile2dDetailsOpen}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          {imagePreview2d ? (
                            <div className="h-10 w-10 rounded border overflow-hidden">
                              <img src={imagePreview2d} alt={file2d.name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                              {file2d.type.includes('pdf') ? (
                                <File className="h-5 w-5 text-red-600" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">{file2d.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file2d.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`h-4 w-4 transition-transform ${file2dDetailsOpen ? 'rotate-180' : ''}`} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile2d(null);
                              setFile2dDetailsOpen(false);
                              setImagePreview2d(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2">
                        {imagePreview2d && (
                          <div className="rounded border overflow-hidden">
                            <img src={imagePreview2d} alt={file2d.name} className="w-full h-auto" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Type:</span> {file2d.type || 'Unknown'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Modified:</span> {new Date(file2d.lastModified).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  {item ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                item ? 'Update Item' : 'Create Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
