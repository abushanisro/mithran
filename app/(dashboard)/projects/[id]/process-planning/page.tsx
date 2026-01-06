'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw, Save, Calculator, ChevronRight, ChevronDown, Database } from 'lucide-react';
import { useBOMs } from '@/lib/api/hooks/useBOM';
import { useBOMItems } from '@/lib/api/hooks/useBOMItems';
import { ModelViewer } from '@/components/ui/model-viewer';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Available fields that can be extracted from reference tables and BOM data
const EXTRACTABLE_FIELDS = [
  { value: 'part_weight', label: 'Part Weight', category: 'Part Info' },
  { value: 'annual_volume', label: 'Annual Volume', category: 'Part Info' },
  { value: 'material_grade', label: 'Material Grade', category: 'Material' },
  { value: 'surface_area', label: 'Surface Area', category: 'Dimensions' },
  { value: 'max_length', label: 'Max Length', category: 'Dimensions' },
  { value: 'max_width', label: 'Max Width', category: 'Dimensions' },
  { value: 'max_height', label: 'Max Height', category: 'Dimensions' },
  { value: 'flow_path_ratio', label: 'Flow Path Ratio', category: 'Process Data' },
  { value: 'cavity_pressure', label: 'Cavity Pressure', category: 'Process Data' },
  { value: 'viscosity', label: 'Material Viscosity', category: 'Material' },
  { value: 'runner_diameter', label: 'Runner Diameter', category: 'Process Data' },
  { value: 'shot_weight', label: 'Shot Weight', category: 'Machine' },
  { value: 'cycle_time', label: 'Cycle Time', category: 'Machine' },
  { value: 'mhr', label: 'Machine Hour Rate', category: 'Machine' },
];

export default function ProcessPlanningPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedPartNumber, setSelectedPartNumber] = useState<string>('');
  const [selectedPP, setSelectedPP] = useState<string>('PP1');
  const [file3dUrl, setFile3dUrl] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const hasExpandedRef = useRef(false);

  // State to store extracted fields for each process step (indexed by process route index)
  const [extractedFields, setExtractedFields] = useState<Record<number, string>>({});

  // State to store extracted values for use in calculations
  const [extractedValues, setExtractedValues] = useState<Record<number, any>>({});

  const { data: bomsData } = useBOMs({ projectId });
  const boms = bomsData?.boms || [];
  const firstBomId = boms[0]?.id;

  const { data: bomItemsData } = useBOMItems(firstBomId);
  const bomItems = bomItemsData?.items || [];

  const selectedItem = bomItems.find((item) => item.partNumber === selectedPartNumber) || bomItems[0];

  // Build tree structure
  const buildTree = (items: any[]) => {
    const itemMap = new Map();
    const roots: any[] = [];

    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    items.forEach(item => {
      const node = itemMap.get(item.id);
      if (item.parentItemId) {
        const parent = itemMap.get(item.parentItemId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const treeItems = buildTree(bomItems);

  // Auto-expand all items on first load
  useEffect(() => {
    if (bomItems.length > 0 && !hasExpandedRef.current) {
      const allIds = bomItems
        .filter(item => bomItems.some(child => child.parentItemId === item.id))
        .map(item => item.id);
      setExpandedItems(new Set(allIds));
      hasExpandedRef.current = true;
    }
  }, [bomItems]);

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assembly':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'sub_assembly':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'child_part':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'assembly':
        return 'Assembly';
      case 'sub_assembly':
        return 'Sub-Assembly';
      case 'child_part':
        return 'Part';
      default:
        return type;
    }
  };

  // Handler to update extracted field selection
  const handleFieldExtractionChange = (processIndex: number, fieldValue: string) => {
    setExtractedFields(prev => ({
      ...prev,
      [processIndex]: fieldValue
    }));

    // Auto-extract value from BOM data or process data
    if (fieldValue && selectedItem) {
      let extractedValue: any = null;

      // Map field values to actual data properties
      switch (fieldValue) {
        case 'annual_volume':
          extractedValue = selectedItem.annualVolume;
          break;
        case 'material_grade':
          extractedValue = selectedItem.materialGrade;
          break;
        case 'part_weight':
          extractedValue = selectedItem.weight;
          break;
        // Add more mappings as needed
        default:
          extractedValue = selectedItem[fieldValue];
      }

      setExtractedValues(prev => ({
        ...prev,
        [processIndex]: extractedValue
      }));
    }
  };

  useEffect(() => {
    if (!selectedItem) {
      setFile3dUrl(null);
      return;
    }

    const loadFile3dUrl = async () => {
      try {
        if (selectedItem.file3dPath) {
          const response = await apiClient.get<{ url: string }>(`/bom-items/${selectedItem.id}/file-url/3d`);
          setFile3dUrl(response.url);
        } else {
          setFile3dUrl(null);
        }
      } catch (error) {
        console.error('Failed to load 3D file URL:', error);
      }
    };

    loadFile3dUrl();
  }, [selectedItem]);

  const partInfoFields = [
    { label: 'Description', value: selectedItem?.name || '-', colSpan: 'col-span-2' },
    { label: 'Scar', value: '-', colSpan: 'col-span-1' },
    { label: 'Annual volume', value: selectedItem?.annualVolume?.toString() || '-', colSpan: 'col-span-1', dark: true },
    { label: 'Process group', value: selectedItem?.material || 'N/A', colSpan: 'col-span-2', isSelect: true },
    { label: 'MOQ', value: '-', colSpan: 'col-span-1', dark: true },
    { label: 'Part Weight', value: '-', colSpan: 'col-span-1' },
    { label: 'Max Length in mm', value: '-', colSpan: 'col-span-1' },
    { label: 'Max Width in mm', value: '-', colSpan: 'col-span-1', dark: true },
    { label: 'Max Height in mm', value: '-', colSpan: 'col-span-1' },
    { label: 'Surface Area in MM2', value: '-', colSpan: 'col-span-1' },
    { label: 'Material Grade', value: selectedItem?.materialGrade || 'N/A', colSpan: 'col-span-1', isSelect: true, dark: true },
  ];

  const processRoutes = [
    {
      opNo: 'Raw Material',
      processRoute: 'Raw Material',
      operations: 'Granules / Pellets',
      calculator: 'Input weight calculator',
      equipment: '',
    },
    {
      opNo: 'Process',
      processRoute: 'Injection Molding',
      operations: 'Injection Molding-Cold Runner',
      calculator: 'Machine Selection Calculator',
      equipment: 'Machine Selection',
    },
    {
      opNo: '',
      processRoute: 'Trimming / Degating',
      operations: 'Manual',
      calculator: 'Process Calculator',
      equipment: '',
    },
    {
      opNo: '',
      processRoute: 'Inspection',
      operations: 'CMM Inspection',
      calculator: 'Process Calculator',
      equipment: 'Machine Selection',
    },
    {
      opNo: 'Packing & Delivery',
      processRoute: 'Packing',
      operations: 'Corrugated box packing',
      calculator: 'Process Calculator',
      equipment: '',
    },
    {
      opNo: '',
      processRoute: 'Delivery',
      operations: 'Road',
      calculator: '',
      equipment: '',
    },
  ];

  const renderTreeItem = (item: any, depth: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedItem?.id === item.id;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 cursor-pointer rounded-md transition-colors ${
            isSelected ? 'bg-primary/20 border-l-2 border-l-primary' : 'hover:bg-secondary/50'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => setSelectedPartNumber(item.partNumber || item.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.id);
              }}
              className="p-0.5 hover:bg-secondary rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${getTypeColor(item.itemType)}`}>
              {getTypeLabel(item.itemType)}
            </Badge>
            <span className="text-sm font-medium truncate">{item.name}</span>
            {item.partNumber && (
              <span className="text-xs text-muted-foreground">#{item.partNumber}</span>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {item.children.map((child: any) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 p-6 bg-background min-h-screen">
      {/* Left Sidebar - BOM Hierarchy */}
      <div className="w-80 flex-shrink-0">
        <Card className="sticky top-6 p-4 max-h-[calc(100vh-3rem)] overflow-y-auto">
          <h3 className="text-sm font-semibold mb-3 text-foreground">BOM Structure</h3>
          <div className="space-y-1">
            {treeItems.length > 0 ? (
              treeItems.map(item => renderTreeItem(item))
            ) : (
              <p className="text-sm text-muted-foreground">No BOM items</p>
            )}
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground whitespace-nowrap">Part Number</Label>
            <Select value={selectedPartNumber} onValueChange={setSelectedPartNumber}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select part" />
              </SelectTrigger>
              <SelectContent>
                {bomItems.map((item) => (
                  <SelectItem key={item.id} value={item.partNumber || item.id}>
                    {item.partNumber || item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground whitespace-nowrap">PP</Label>
            <Select value={selectedPP} onValueChange={setSelectedPP}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PP1">PP1</SelectItem>
                <SelectItem value="PP2">PP2</SelectItem>
                <SelectItem value="PP3">PP3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <div className="overflow-hidden shadow-md border border-border rounded-lg">
            <div className="grid grid-cols-4 gap-0">
              {partInfoFields.map((field, index) => (
                <div
                  key={index}
                  className={`${field.colSpan} border-b border-r last:border-r-0 border-border`}
                >
                  <div className={`p-2.5 ${field.dark ? 'bg-primary' : 'bg-primary/80'}`}>
                    <Label className="text-xs font-semibold text-primary-foreground">{field.label}</Label>
                  </div>
                  <div className="p-2.5 bg-card">
                    {field.isSelect ? (
                      <Select defaultValue={field.value}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={field.value}>{field.value}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        defaultValue={field.value}
                        className="h-8 text-sm"
                        readOnly={field.label === 'Description'}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden shadow-md border border-border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary text-foreground">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border">OP NO</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border">Process Route</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border">Operations</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border">Calculator</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border">Equipment</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border">Extract Field</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold">DFM Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {processRoutes.map((route, index) => (
                    <tr key={index} className="hover:bg-secondary/50 border-b border-border transition-colors">
                      <td className="px-3 py-2.5 text-sm font-medium border-r border-border">
                        {route.opNo}
                      </td>
                      <td className="px-3 py-2 border-r border-border">
                        <Select defaultValue={route.processRoute}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={route.processRoute}>{route.processRoute}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 border-r border-border">
                        <Select defaultValue={route.operations}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={route.operations}>{route.operations}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-primary border-r border-border">
                        {route.calculator}
                      </td>
                      <td className="px-3 py-2.5 text-sm border-r border-border">
                        {route.equipment}
                      </td>
                      <td className="px-3 py-2 border-r border-border">
                        <div className="space-y-2">
                          <Select
                            value={extractedFields[index] || ''}
                            onValueChange={(value) => handleFieldExtractionChange(index, value)}
                          >
                            <SelectTrigger className="h-8 text-sm w-full">
                              <SelectValue placeholder="Select field (optional)">
                                {extractedFields[index] ? (
                                  <span className="flex items-center gap-1.5">
                                    <Database className="h-3 w-3 text-primary" />
                                    {EXTRACTABLE_FIELDS.find(f => f.value === extractedFields[index])?.label}
                                  </span>
                                ) : (
                                  'Select field'
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {EXTRACTABLE_FIELDS.reduce((acc, field) => {
                                const lastCategory = acc.length > 0 ? acc[acc.length - 1].category : null;
                                if (lastCategory !== field.category) {
                                  acc.push(
                                    <div key={`category-${field.category}`} className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary/50">
                                      {field.category}
                                    </div>
                                  );
                                }
                                acc.push(
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                );
                                return acc;
                              }, [] as React.ReactNode[])}
                            </SelectContent>
                          </Select>
                          {extractedValues[index] !== undefined && extractedValues[index] !== null && (
                            <div className="text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded border border-primary/20">
                              <span className="font-semibold text-primary">Value:</span> {extractedValues[index]}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <Input className="h-8 text-sm" placeholder="-" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Extracted Data Summary */}
          {Object.keys(extractedValues).length > 0 && (
            <div className="mt-4 p-4 bg-secondary/30 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Extracted Data for Calculations</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(extractedValues).map(([processIndex, value]) => {
                  const fieldKey = extractedFields[Number(processIndex)];
                  const field = EXTRACTABLE_FIELDS.find(f => f.value === fieldKey);
                  const process = processRoutes[Number(processIndex)];

                  if (!field || value === undefined || value === null) return null;

                  return (
                    <div
                      key={processIndex}
                      className="p-2.5 bg-card border border-border rounded-md"
                    >
                      <div className="text-xs text-muted-foreground mb-0.5">{process.processRoute}</div>
                      <div className="text-xs font-medium text-foreground">{field.label}</div>
                      <div className="text-sm font-bold text-primary mt-1">{value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="destructive"
              size="lg"
              className="gap-2 px-6"
              onClick={() => {
                setExtractedFields({});
                setExtractedValues({});
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              size="lg"
              className="gap-2 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                // Save process planning data including extracted fields
                const planningData = {
                  partNumber: selectedPartNumber,
                  pp: selectedPP,
                  extractedFields,
                  extractedValues,
                  processRoutes,
                };
                console.log('Saving process planning:', planningData);
                // TODO: Implement save API call
              }}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button
              size="lg"
              className="gap-2 px-6 bg-warning hover:bg-warning/90 text-warning-foreground"
              onClick={() => {
                // Calculate using extracted values
                console.log('Calculating with extracted data:', extractedValues);
                // TODO: Implement calculation logic
              }}
            >
              <Calculator className="h-4 w-4" />
              Calculate
              {Object.keys(extractedValues).length > 0 && (
                <Badge className="ml-2 bg-warning-foreground text-warning">
                  {Object.keys(extractedValues).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="p-3 shadow-md border border-border bg-card rounded-lg">
            <div className="aspect-square bg-secondary border border-border rounded flex items-center justify-center mb-2 overflow-hidden">
              {selectedItem?.file3dPath && file3dUrl ? (
                <ModelViewer
                  fileUrl={file3dUrl}
                  fileName={selectedItem.file3dPath.split('/').pop() || selectedItem.name || 'model'}
                  fileType={selectedItem.file3dPath.split('.').pop() || 'step'}
                  bomItemId={selectedItem.id}
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">No 3D file available</p>
                </div>
              )}
            </div>
            <p className="text-xs text-center text-foreground font-medium">3D File Viewer .Step</p>
          </div>

          <div className="p-3 shadow-md border border-border bg-card rounded-lg">
            <div className="aspect-square bg-secondary border border-border rounded flex items-center justify-center mb-2">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">2D Drawing Preview</p>
              </div>
            </div>
            <p className="text-xs text-center text-foreground font-medium">2D File Viewer-PDF, Word</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
