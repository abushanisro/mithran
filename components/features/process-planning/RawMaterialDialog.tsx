'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRawMaterials, useRawMaterialFilterOptions } from '@/lib/api/hooks/useRawMaterials';
import { useCalculators, useCalculator, useExecuteCalculator } from '@/lib/api/hooks/useCalculators';
import { Loader2, Calculator as CalculatorIcon, Play } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RawMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  estimateId?: string;
  editData?: any;
}

export function RawMaterialDialog({
  open,
  onOpenChange,
  onSubmit,
  editData,
}: RawMaterialDialogProps) {
  const [materialGroup, setMaterialGroup] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('q1');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [grossUsage, setGrossUsage] = useState<number>(0);
  const [netUsage, setNetUsage] = useState<number>(0);
  const [scrap, setScrap] = useState<number>(0);
  const [overhead, setOverhead] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);

  // Calculator state
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(false);
  const [calculatorTarget, setCalculatorTarget] = useState<'grossUsage' | 'netUsage' | null>(null);
  const [selectedCalculatorId, setSelectedCalculatorId] = useState<string>('');
  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, any>>({});
  const [calculatorResults, setCalculatorResults] = useState<Record<string, any> | null>(null);

  // Fetch calculators
  const { data: calculatorsData } = useCalculators();
  const { data: selectedCalculator } = useCalculator(selectedCalculatorId, { enabled: !!selectedCalculatorId });
  const executeCalculator = useExecuteCalculator();

  // Handle calculator value selection
  const handleUseCalculatorValue = (value: number) => {
    if (calculatorTarget === 'grossUsage') {
      setGrossUsage(value);
    } else if (calculatorTarget === 'netUsage') {
      setNetUsage(value);
    }
    setCalculatorOpen(false);
    setCalculatorResults(null);
    setCalculatorInputs({});
    setSelectedCalculatorId('');
  };

  // Handle calculator execution
  const handleExecuteCalculator = async () => {
    if (!selectedCalculatorId) return;

    try {
      const result = await executeCalculator.mutateAsync({
        calculatorId: selectedCalculatorId,
        inputValues: calculatorInputs,
      });

      if (result.success) {
        setCalculatorResults(result.results);
      }
    } catch (error) {
      console.error('Calculator execution error:', error);
    }
  };

  // Reset calculator when closed
  useEffect(() => {
    if (!calculatorOpen) {
      setSelectedCalculatorId('');
      setCalculatorInputs({});
      setCalculatorResults(null);
    }
  }, [calculatorOpen]);

  // Fetch raw materials from API
  const { data: rawMaterialsData, isLoading } = useRawMaterials();
  const { data: filterOptions, isLoading: isLoadingOptions } = useRawMaterialFilterOptions();

  // Debug logging

  // Get unique material groups
  const materialGroups = useMemo(() => {
    return filterOptions?.materialGroups || [];
  }, [filterOptions]);

  // Get unique locations
  const locations = useMemo(() => {
    return filterOptions?.locations || [];
  }, [filterOptions]);

  // Get materials filtered by selected group and location
  const materials = useMemo(() => {
    if (!rawMaterialsData?.items || !materialGroup) return [];
    let filtered = rawMaterialsData.items.filter(m => m.materialGroup === materialGroup);

    // Apply location filter if selected
    if (location) {
      filtered = filtered.filter(m => m.location === location);
    }

    return filtered;
  }, [rawMaterialsData, materialGroup, location]);

  // Get selected material details
  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialId || !materials.length) return null;
    return materials.find(m => m.id === selectedMaterialId);
  }, [selectedMaterialId, materials]);

  // Load edit data first (wait for data to be loaded AND options to be available)
  useEffect(() => {
    if (editData && open && !isLoading && !isLoadingOptions && materialGroups.length > 0) {
      setMaterialGroup(editData.materialGroup || '');
      setLocation(editData.location || '');
      setSelectedQuarter(editData.quarter || 'q1');
      setSelectedMaterialId(editData.materialId || '');
      setGrossUsage(editData.grossUsage || 0);
      setNetUsage(editData.netUsage || 0);
      setScrap(editData.scrap ?? 0);
      setOverhead(editData.overhead ?? 0);
      setTotalCost(editData.totalCost || 0);
    } else if (!editData && open) {
      // Reset for new entry
      setMaterialGroup('');
      setLocation('');
      setSelectedQuarter('q1');
      setSelectedMaterialId('');
      setGrossUsage(0);
      setNetUsage(0);
      setScrap(0);
      setOverhead(0);
      setTotalCost(0);
    }
  }, [editData, open, isLoading, isLoadingOptions, materialGroups]);

  // Reset material selection when filters change (but not during initial load with editData)
  useEffect(() => {
    if (!editData) {
      setSelectedMaterialId('');
    }
  }, [materialGroup, location, editData]);

  // Calculate total cost based on selected quarter
  useEffect(() => {
    if (selectedMaterial && grossUsage > 0) {
      // Get unit cost from selected quarter
      const unitCost =
        selectedQuarter === 'q1' ? selectedMaterial.q1Cost :
        selectedQuarter === 'q2' ? selectedMaterial.q2Cost :
        selectedQuarter === 'q3' ? selectedMaterial.q3Cost :
        selectedQuarter === 'q4' ? selectedMaterial.q4Cost : 0;

      if (!unitCost) {
        setTotalCost(0);
        return;
      }

      const materialCost = grossUsage * unitCost;
      const scrapCost = (materialCost * scrap) / 100;
      const overheadCost = (materialCost * overhead) / 100;
      const total = materialCost + scrapCost + overheadCost;
      setTotalCost(Math.max(0, total));
    } else {
      setTotalCost(0);
    }
  }, [selectedMaterial, selectedQuarter, grossUsage, netUsage, scrap, overhead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // For editing, we can submit even if selectedMaterial is not loaded yet
    if (editData) {
      // Use editData information if selectedMaterial is not available
      const materialInfo = selectedMaterial || {
        id: editData.materialId,
        material: editData.material,
        materialGroup: editData.materialGroup,
        materialGrade: editData.materialGrade || '',
        location: editData.location || '',
        q1Cost: 0,
        q2Cost: 0,
        q3Cost: 0,
        q4Cost: 0,
      };

      onSubmit({
        id: editData.id,
        materialId: editData.materialId || selectedMaterialId,
        materialName: materialInfo.material,
        materialGroup: materialInfo.materialGroup,
        material: materialInfo.material,
        materialGrade: materialInfo.materialGrade || '',
        location: materialInfo.location || '',
        quarter: selectedQuarter,
        unitCost: editData.unitCost, // Use the stored unit cost from editData
        grossUsage,
        netUsage,
        scrap,
        overhead,
        totalCost,
      });
    } else {
      // For new material, require selectedMaterial
      if (!materialGroup) {
        alert('Please select a material group');
        return;
      }
      if (!selectedMaterialId || !selectedMaterial) {
        alert('Please select a material');
        return;
      }
      if (grossUsage <= 0) {
        alert('Please enter gross usage');
        return;
      }

      // Get unit cost from selected quarter
      const unitCost =
        selectedQuarter === 'q1' ? selectedMaterial.q1Cost :
        selectedQuarter === 'q2' ? selectedMaterial.q2Cost :
        selectedQuarter === 'q3' ? selectedMaterial.q3Cost :
        selectedQuarter === 'q4' ? selectedMaterial.q4Cost : 0;

      onSubmit({
        materialId: selectedMaterialId,
        materialName: selectedMaterial.material,
        materialGroup: selectedMaterial.materialGroup,
        material: selectedMaterial.material,
        materialGrade: selectedMaterial.materialGrade || '',
        location: selectedMaterial.location || '',
        quarter: selectedQuarter,
        unitCost,
        grossUsage,
        netUsage,
        scrap,
        overhead,
        totalCost,
      });
    }

    // Reset form
    setMaterialGroup('');
    setLocation('');
    setSelectedQuarter('q1');
    setSelectedMaterialId('');
    setGrossUsage(0);
    setNetUsage(0);
    setScrap(0);
    setOverhead(0);
    setTotalCost(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {editData ? 'Edit Material Cost' : 'Create Material Cost'}
          </DialogTitle>
          <DialogDescription>
            Select raw materials and calculate costs with weight and scrap factors
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Loading State */}
            {(isLoading || isLoadingOptions) && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading materials...</span>
              </div>
            )}

            {!isLoading && !isLoadingOptions && (
              <>
                {/* Info Banner - Show when no data available */}
                {materialGroups.length === 0 && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            No Raw Materials Available
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            There are no raw materials in your database yet. Please add raw materials by uploading an Excel file or creating them manually in the Raw Materials management page.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Filters Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Material Group */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Material Group</label>
                    <Select value={materialGroup} onValueChange={setMaterialGroup}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material group" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialGroups.length > 0 ? (
                          materialGroups.map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem key="no-groups" value="none" disabled>
                            No material groups available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">
                      Location <span className="text-muted-foreground text-xs">(Optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.length > 0 ? (
                            locations.map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {loc}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem key="no-locations" value="none" disabled>
                              No locations available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {location && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation('')}
                          className="px-3"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Material Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Material
                    {!materialGroup && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (Select material group first)
                      </span>
                    )}
                  </label>
                  <Select
                    value={selectedMaterialId}
                    onValueChange={setSelectedMaterialId}
                    disabled={!materialGroup}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={materialGroup ? "Select material" : "Select material group first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.length > 0 ? (
                        materials.map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.material} {material.materialGrade ? `(${material.materialGrade})` : ''}
                            {material.location ? ` - ${material.location}` : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem key="no-materials" value="none" disabled>
                          {materialGroup ? 'No materials available' : 'Select material group first'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Material Details and Quarter Selection */}
            {selectedMaterial && (
              <div className="space-y-2 bg-secondary/20 p-4 rounded-lg">
                <label className="text-sm font-semibold block">Material Details</label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Material:</span>
                    <span className="ml-2 font-medium">{selectedMaterial.material}</span>
                  </div>
                  {selectedMaterial.materialGrade && (
                    <div>
                      <span className="text-muted-foreground">Grade:</span>
                      <span className="ml-2 font-medium">{selectedMaterial.materialGrade}</span>
                    </div>
                  )}
                  {selectedMaterial.location && (
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <span className="ml-2 font-medium">{selectedMaterial.location}</span>
                    </div>
                  )}
                  {selectedMaterial.densityKgM3 && (
                    <div>
                      <span className="text-muted-foreground">Density:</span>
                      <span className="ml-2 font-medium">{selectedMaterial.densityKgM3} kg/m³</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quarter Selection with Cost Preview */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Quarter & Cost</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'q1', label: 'Q1', cost: selectedMaterial?.q1Cost },
                  { value: 'q2', label: 'Q2', cost: selectedMaterial?.q2Cost },
                  { value: 'q3', label: 'Q3', cost: selectedMaterial?.q3Cost },
                  { value: 'q4', label: 'Q4', cost: selectedMaterial?.q4Cost },
                ].map(({ value, label, cost }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedQuarter(value)}
                    disabled={!selectedMaterialId && !editData}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedQuarter === value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    } ${!selectedMaterialId && !editData ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-lg font-bold text-primary">
                      {cost ? `₹${cost.toFixed(2)}` : 'N/A'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Usage and Cost Fields */}
            {!selectedMaterialId && !editData && (
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                Select a material above to enable usage and cost fields
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Gross Usage</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={grossUsage === 0 ? '' : grossUsage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGrossUsage(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="Enter gross usage"
                    className="flex-1"
                    disabled={!selectedMaterialId && !editData}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setCalculatorTarget('grossUsage');
                      setCalculatorOpen(true);
                    }}
                    title="Use Calculator"
                    disabled={!selectedMaterialId && !editData}
                  >
                    <CalculatorIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Net Usage</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={netUsage === 0 ? '' : netUsage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNetUsage(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="Enter net usage"
                    className="flex-1"
                    disabled={!selectedMaterialId && !editData}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setCalculatorTarget('netUsage');
                      setCalculatorOpen(true);
                    }}
                    title="Use Calculator"
                    disabled={!selectedMaterialId && !editData}
                  >
                    <CalculatorIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Scrap %</label>
                <Input
                  type="number"
                  step="0.01"
                  value={scrap === 0 ? '' : scrap}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScrap(val === '' ? 0 : parseFloat(val) || 0);
                  }}
                  placeholder="Enter scrap percentage"
                  disabled={!selectedMaterialId && !editData}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Overhead %</label>
                <Input
                  type="number"
                  step="0.01"
                  value={overhead === 0 ? '' : overhead}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOverhead(val === '' ? 0 : parseFloat(val) || 0);
                  }}
                  placeholder="Enter overhead percentage"
                  disabled={!selectedMaterialId && !editData}
                />
              </div>
            </div>

            {/* Total Cost Display */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <label className="text-sm font-semibold block mb-2">Total Cost</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">INR</span>
                <span className="text-lg font-bold">₹{totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                editData
                  ? grossUsage <= 0
                  : !materialGroup || !selectedMaterialId || grossUsage <= 0
              }
            >
              {editData ? 'Update Material' : 'Add Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Calculator Side Panel */}
      <Sheet open={calculatorOpen} onOpenChange={setCalculatorOpen}>
        <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Calculator - {calculatorTarget === 'grossUsage' ? 'Gross Usage' : 'Net Usage'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Calculator Selector */}
            <div className="space-y-2">
              <Label>Select Calculator</Label>
              <Select value={selectedCalculatorId} onValueChange={setSelectedCalculatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a calculator" />
                </SelectTrigger>
                <SelectContent>
                  {calculatorsData?.calculators?.map((calc: any) => (
                    <SelectItem key={calc.id} value={calc.id}>
                      {calc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calculator Inputs */}
            {selectedCalculator && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Input Values</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCalculator.fields
                      ?.filter((field: any) => field.fieldType !== 'calculated')
                      .map((field: any) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.fieldName}>
                            {field.displayName || field.fieldName}
                            {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
                          </Label>
                          <Input
                            id={field.fieldName}
                            type="number"
                            step="0.01"
                            value={calculatorInputs[field.fieldName] || ''}
                            onChange={(e) =>
                              setCalculatorInputs({
                                ...calculatorInputs,
                                [field.fieldName]: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder={`Enter ${field.displayName || field.fieldName}`}
                          />
                        </div>
                      ))}

                    <Button
                      onClick={handleExecuteCalculator}
                      disabled={executeCalculator.isPending}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {executeCalculator.isPending ? 'Calculating...' : 'Calculate'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Calculator Results */}
                {calculatorResults && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg">Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedCalculator.fields
                        ?.filter((field: any) => field.fieldType === 'calculated')
                        .map((field: any) => {
                          const result = calculatorResults[field.fieldName];
                          const value = result?.value !== undefined ? result.value : result;

                          return (
                            <div
                              key={field.id}
                              className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                            >
                              <div>
                                <div className="font-medium">{field.displayName || field.fieldName}</div>
                                {field.unit && (
                                  <div className="text-xs text-muted-foreground">{field.unit}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold text-primary">
                                  {typeof value === 'number' ? value.toFixed(4) : value || 'N/A'}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUseCalculatorValue(value)}
                                  disabled={typeof value !== 'number'}
                                >
                                  Use
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}
