'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMHRRecords } from '@/lib/api/hooks/useMHR';
import { useLSR } from '@/lib/api/hooks/useLSR';
import { useProcessHierarchy, useProcessCalculatorMappings } from '@/lib/api/hooks/useProcessCalculatorMappings';
import { useCalculators, useCalculator, useExecuteCalculator } from '@/lib/api/hooks/useCalculators';
import { Loader2, Calculator as CalculatorIcon, Play } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface ProcessCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  editData?: any;
}

export function ProcessCostDialog({
  open,
  onOpenChange,
  onSubmit,
  editData,
}: ProcessCostDialogProps) {
  const [opNbr, setOpNbr] = useState<number>(0);
  const [location, setLocation] = useState<string>('');
  // Hierarchical selections
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [selectedProcessCalculatorId, setSelectedProcessCalculatorId] = useState<string>('');

  // Resource selections
  const [selectedMHRId, setSelectedMHRId] = useState<string>('');
  const [selectedLSRId, setSelectedLSRId] = useState<string>('');
  const [setupManning, setSetupManning] = useState<number>(1);
  const [setupTime, setSetupTime] = useState<number>(0);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [heads, setHeads] = useState<number>(1);
  const [cycleTime, setCycleTime] = useState<number>(0);
  const [partsPerCycle, setPartsPerCycle] = useState<number>(1);
  const [scrap, setScrap] = useState<number>(0);
  const [machineValue, setMachineValue] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);

  // Preserve facilityId and facilityRateId from editData for updates
  const [facilityId, setFacilityId] = useState<string | undefined>(undefined);
  const [facilityRateId, setFacilityRateId] = useState<string | undefined>(undefined);

  // Calculator state
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(false);
  const [calculatorTarget, setCalculatorTarget] = useState<string | null>(null);
  const [selectedCalculatorId, setSelectedCalculatorId] = useState<string>('');
  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, any>>({});
  const [calculatorResults, setCalculatorResults] = useState<Record<string, any> | null>(null);

  // Fetch process hierarchy (processGroups, processRoutes, operations)
  const { data: hierarchyData, isLoading: isLoadingHierarchy, error: hierarchyError } = useProcessHierarchy();

  // Fetch ALL calculator mappings to enable proper filtering (set high limit to get all)
  const { data: allMappingsData } = useProcessCalculatorMappings({ limit: 1000 }, { enabled: open });

  // Fetch calculator mappings based on selections
  const { data: processCalculatorMappings } = useProcessCalculatorMappings(
    { processGroup: selectedGroup, processRoute: selectedRoute, operation: selectedOperation },
    { enabled: open && !!selectedGroup && !!selectedRoute && !!selectedOperation }
  );

  const { data: mhrData, isLoading: isLoadingMHR, error: mhrError } = useMHRRecords();
  const { data: lsrData, isLoading: isLoadingLSR, error: lsrError } = useLSR();
  const { data: calculatorsData } = useCalculators();
  const { data: selectedCalculator } = useCalculator(selectedCalculatorId, { enabled: !!selectedCalculatorId });
  const executeCalculator = useExecuteCalculator();

  // Check for errors
  const hasErrors = mhrError || lsrError || hierarchyError;

  // Get process groups from hierarchy
  const processGroups = useMemo(() => {
    return hierarchyData?.processGroups || [];
  }, [hierarchyData]);

  // Get process routes filtered by selected group
  const processRoutes = useMemo(() => {
    if (!selectedGroup || !allMappingsData?.mappings) return [];

    // Filter mappings by selected group and get unique process routes
    const routesForGroup = allMappingsData.mappings
      .filter((mapping: any) => mapping.processGroup === selectedGroup)
      .map((mapping: any) => mapping.processRoute);

    return [...new Set(routesForGroup)].sort();
  }, [allMappingsData, selectedGroup]);

  // Get operations filtered by selected route
  const operations = useMemo(() => {
    if (!selectedGroup || !selectedRoute || !allMappingsData?.mappings) return [];

    // Filter mappings by selected group and route, then get unique operations
    const operationsForRoute = allMappingsData.mappings
      .filter((mapping: any) =>
        mapping.processGroup === selectedGroup &&
        mapping.processRoute === selectedRoute
      )
      .map((mapping: any) => mapping.operation);

    return [...new Set(operationsForRoute)].sort();
  }, [allMappingsData, selectedGroup, selectedRoute]);

  // Get available calculators from mappings
  const availableCalculators = useMemo(() => {
    if (!processCalculatorMappings?.mappings) return [];
    return processCalculatorMappings.mappings;
  }, [processCalculatorMappings]);


  // Get unique locations from MHR and LSR data
  const locations = useMemo(() => {
    const locs = new Set<string>();
    mhrData?.records?.forEach(record => {
      if (record.location) locs.add(record.location);
    });
    lsrData?.forEach((record: any) => {
      if (record.location) locs.add(record.location);
    });
    return Array.from(locs).sort();
  }, [mhrData, lsrData]);

  // Filter MHR by location
  const filteredMHR = useMemo(() => {
    if (!mhrData?.records) return [];
    if (!location) return mhrData.records;
    return mhrData.records.filter(r => r.location === location);
  }, [mhrData, location]);

  // Filter LSR by location
  const filteredLSR = useMemo(() => {
    if (!lsrData) return [];
    if (!location) return lsrData;
    return lsrData.filter((r: any) => r.location === location);
  }, [lsrData, location]);

  // Get selected MHR and LSR
  const selectedMHR = useMemo(() => {
    return filteredMHR.find(r => r.id === selectedMHRId);
  }, [filteredMHR, selectedMHRId]);

  const selectedLSR = useMemo(() => {
    return filteredLSR.find((r: any) => String(r.id) === String(selectedLSRId));
  }, [filteredLSR, selectedLSRId]);


  useEffect(() => {
    if (hierarchyError) {
      console.error('[ProcessCostDialog] Hierarchy Error:', hierarchyError);
    }
  }, [hierarchyError]);

  // Calculator handlers
  const handleCalculatorValue = (value: number | string) => {
    if (calculatorTarget === 'setupManning') setSetupManning(Number(value));
    else if (calculatorTarget === 'setupTime') setSetupTime(Number(value));
    else if (calculatorTarget === 'batchSize') setBatchSize(Number(value));
    else if (calculatorTarget === 'cycleTime') setCycleTime(Number(value));
    else if (calculatorTarget === 'partsPerCycle') setPartsPerCycle(Number(value));
    else if (calculatorTarget === 'heads') setHeads(Number(value));
    else if (calculatorTarget === 'scrap') setScrap(Number(value));
    else if (calculatorTarget === 'machineValue') setMachineValue(Number(value));
    else if (calculatorTarget === 'operation') {
      // For operation, we might get an operation name
      if (typeof value === 'string') {
        setSelectedOperation(value);
      }
    }
    else if (calculatorTarget === 'processCalculator') {
      // For process calculator, the value is used automatically from calculator results
      // The calculator ID is already set, so we just close the panel
      // The actual values would be set from calculator results in handleExecuteCalculator
    }

    setCalculatorOpen(false);
    setCalculatorResults(null);
    setCalculatorInputs({});
    // Don't reset selectedCalculatorId for processCalculator as we want to keep it selected
    if (calculatorTarget !== 'processCalculator') {
      setSelectedCalculatorId('');
    }
    setCalculatorTarget(null);
  };

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
      setCalculatorTarget(null);
    }
  }, [calculatorOpen]);

  // Load edit data (wait for data to be loaded before populating)
  useEffect(() => {
    if (editData && open && !isLoadingHierarchy && !isLoadingMHR && !isLoadingLSR) {
      setOpNbr(editData.opNbr || 0);
      setLocation(editData.location || '');
      setSelectedGroup(editData.processGroup || '');
      setSelectedRoute(editData.processRoute || '');
      setSelectedOperation(editData.operation || '');
      setSelectedProcessCalculatorId(editData.processCalculatorId || '');
      setSelectedMHRId(editData.mhrId || '');
      setSelectedLSRId(editData.lsrId ? String(editData.lsrId) : '');
      setSetupManning(editData.setupManning || 1);
      setSetupTime(editData.setupTime || 0);
      setBatchSize(editData.batchSize || 1);
      setHeads(editData.heads || 1);
      setCycleTime(editData.cycleTime || 0);
      setPartsPerCycle(editData.partsPerCycle || 1);
      setScrap(editData.scrap || 0);
      setMachineValue(editData.machineValue || 0);
      setFacilityId(editData.facilityId);
      setFacilityRateId(editData.facilityRateId);
    } else if (!editData && open) {
      // Reset for new entry
      setOpNbr(0);
      setLocation('');
      setSelectedGroup('');
      setSelectedRoute('');
      setSelectedOperation('');
      setSelectedProcessCalculatorId('');
      setSelectedMHRId('');
      setSelectedLSRId('');
      setSetupManning(1);
      setSetupTime(0);
      setBatchSize(1);
      setHeads(1);
      setCycleTime(0);
      setPartsPerCycle(1);
      setScrap(0);
      setMachineValue(0);
      setFacilityId(undefined);
      setFacilityRateId(undefined);
    }
  }, [editData, open, isLoadingHierarchy, isLoadingMHR, isLoadingLSR]);

  // Calculate total cost using MHR and LSR
  useEffect(() => {
    if (selectedMHR && selectedLSR && cycleTime > 0 && batchSize > 0 && partsPerCycle > 0) {
      // Get rates
      const machineRate = selectedMHR.calculations.totalMachineHourRate;
      const labourRate = selectedLSR.lhr;

      // Setup cost (labour cost for setup time)
      const setupCostPerPart = (setupManning * setupTime * labourRate) / (60 * batchSize);

      // Cycle cost
      const cycleTimeHours = cycleTime / 3600; // Convert seconds to hours
      const labourCostPerCycle = cycleTimeHours * labourRate * heads;
      const machineCostPerCycle = cycleTimeHours * machineRate;
      const totalCycleCostPerPart = (labourCostPerCycle + machineCostPerCycle) / partsPerCycle;

      // Total before scrap
      const baseCost = setupCostPerPart + totalCycleCostPerPart;

      // Add scrap
      const scrapCost = (baseCost * scrap) / 100;
      const total = baseCost + scrapCost;

      setTotalCost(Math.max(0, total));
    } else {
      setTotalCost(0);
    }
  }, [selectedMHR, selectedLSR, setupManning, setupTime, batchSize, heads, cycleTime, partsPerCycle, scrap]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMHRId || !selectedLSRId || cycleTime <= 0 || batchSize <= 0) {
      alert('Please select machine, labour, and enter cycle time and batch size');
      return;
    }

    onSubmit({
      id: editData?.id,
      opNbr,
      location,
      group: selectedGroup,
      processRoute: selectedRoute,
      operation: selectedOperation,
      processCalculatorId: selectedProcessCalculatorId,
      mhrId: selectedMHRId,
      lsrId: selectedLSRId,
      machineName: selectedMHR?.machineName || '',
      operationName: selectedOperation || '',
      processRouteName: selectedRoute || '',
      machineRate: selectedMHR?.calculations.totalMachineHourRate || 0,
      laborRate: selectedLSR?.lhr || 0,
      setupManning,
      setupTime,
      batchSize,
      heads,
      cycleTime,
      partsPerCycle,
      scrap,
      machineValue,
      totalCost,
      facilityId,
      facilityRateId,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {editData ? 'Edit Process Cost' : 'Create Process Cost'}
          </DialogTitle>
          <DialogDescription>
            Configure process parameters, select resources, and calculate costs
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Op Nbr */}
            <div className="space-y-2">
              <Label>Op Nbr</Label>
              <Input
                type="number"
                value={opNbr}
                onChange={(e) => {
                  const val = e.target.value;
                  setOpNbr(val === '' ? 0 : parseInt(val) || 0);
                }}
                placeholder="Enter operation number"
              />
            </div>

            {/* Error State */}
            {hasErrors && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-destructive font-semibold mb-2">Error loading data</p>
                <p className="text-sm text-muted-foreground">
                  Please check your connection and try again
                </p>
              </div>
            )}

            {/* Loading State */}
            {!hasErrors && (isLoadingMHR || isLoadingLSR || isLoadingHierarchy) && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading data...</span>
              </div>
            )}

            {!hasErrors && !isLoadingMHR && !isLoadingLSR && !isLoadingHierarchy && (
              <>
                {/* Info Banner - Show when process groups exist but no routes */}
                {processGroups.length > 0 && selectedGroup && processRoutes.length === 0 && !hierarchyError && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            No Process Routes Available
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            There are no process routes defined for the "{selectedGroup}" group yet.
                            Please navigate to the <strong>Process Planning</strong> page to create process routes and add steps before using them here.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* HIERARCHICAL SECTION */}
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-md">Process Selection (Hierarchical)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 1. Group Selection */}
                    <div className="space-y-2">
                      <Label className="font-semibold">1. Group</Label>
                      <Select
                        value={selectedGroup}
                        onValueChange={(value) => {
                          setSelectedGroup(value);
                          setSelectedRoute('');
                          setSelectedOperation('');
                          setSelectedProcessCalculatorId('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select process group" />
                        </SelectTrigger>
                        <SelectContent>
                          {processGroups.length > 0 ? (
                            processGroups.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem key="no-groups" value="none" disabled>
                              No groups available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 2. Process Route Selection */}
                    <div className="space-y-2">
                      <Label className="font-semibold">
                        2. Process Route
                        {!selectedGroup && <span className="text-muted-foreground text-xs ml-2">(Select Group first)</span>}
                      </Label>
                      <Select
                        value={selectedRoute}
                        onValueChange={(value) => {
                          setSelectedRoute(value);
                          setSelectedOperation('');
                          setSelectedProcessCalculatorId('');
                        }}
                        disabled={!selectedGroup}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select process route" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingHierarchy ? (
                            <SelectItem key="loading" value="loading" disabled>
                              Loading routes...
                            </SelectItem>
                          ) : processRoutes.length > 0 ? (
                            processRoutes.map((route: string) => (
                              <SelectItem key={route} value={route}>
                                {route}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem key="no-routes" value="none" disabled>
                              No process routes for {selectedGroup}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {hierarchyError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Error loading hierarchy: {(hierarchyError as Error).message || 'Unknown error'}
                        </p>
                      )}
                      {selectedGroup && !isLoadingHierarchy && !hierarchyError && processRoutes.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          No routes found for "{selectedGroup}". Create process calculator mappings first.
                        </p>
                      )}
                    </div>

                    {/* 3. Operations Selection */}
                    <div className="space-y-2">
                      <Label className="font-semibold">
                        3. Operations
                        {!selectedRoute && <span className="text-muted-foreground text-xs ml-2">(Select Process Route first)</span>}
                      </Label>
                      <Select
                        value={selectedOperation}
                        onValueChange={(value) => {
                          setSelectedOperation(value);
                          setSelectedProcessCalculatorId('');
                        }}
                        disabled={!selectedRoute}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select operation" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingHierarchy ? (
                            <SelectItem key="loading" value="loading" disabled>
                              Loading operations...
                            </SelectItem>
                          ) : operations.length > 0 ? (
                            operations.map((op: string) => (
                              <SelectItem key={op} value={op}>
                                {op}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem key="no-operations" value="none" disabled>
                              No operations available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {hierarchyError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Error loading operations: {(hierarchyError as Error).message || 'Unknown error'}
                        </p>
                      )}
                      {selectedRoute && !isLoadingHierarchy && !hierarchyError && operations.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          No operations found for "{selectedRoute}". Create process calculator mappings first.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* RESOURCES SECTION */}
                <Card className="border-secondary/50">
                  <CardHeader>
                    <CardTitle className="text-md">Resources & Location</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Location Filter */}
                    <div className="space-y-2">
                      <Label>Location <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All locations</SelectItem>
                          {locations.map((loc) => (
                            <SelectItem key={loc} value={loc}>
                              {loc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Machine Value */}
                    <div className="space-y-2">
                      <Label>Machine Value</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={machineValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMachineValue(val === '' ? 0 : parseFloat(val) || 0);
                          }}
                          placeholder="Enter machine value"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setCalculatorTarget('machineValue');
                            setCalculatorOpen(true);
                          }}
                          title="Use Calculator"
                        >
                          <CalculatorIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Machine (MHR) Selection */}
                    <div className="space-y-2">
                      <Label>Machine</Label>
                      <Select value={selectedMHRId} onValueChange={setSelectedMHRId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredMHR.map((mhr) => (
                            <SelectItem key={mhr.id} value={mhr.id}>
                              {mhr.machineName} - ₹{mhr.calculations.totalMachineHourRate.toFixed(2)}/hr
                              {mhr.location ? ` (${mhr.location})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Labour (LSR) Selection */}
                    <div className="space-y-2">
                      <Label>Labour Type</Label>
                      <Select
                        value={selectedLSRId}
                        onValueChange={setSelectedLSRId}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select labour type" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredLSR.map((lsr: any) => (
                            <SelectItem key={lsr.id} value={String(lsr.id)}>
                              {lsr.labourType} - ₹{lsr.lhr.toFixed(2)}/hr
                              {lsr.location ? ` (${lsr.location})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Rate Information */}
            {selectedMHR && selectedLSR && (
              <>
                <Card className="bg-secondary/20">
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Rates</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Machine Rate:</span>
                      <span className="ml-2 font-bold">₹{selectedMHR.calculations.totalMachineHourRate.toFixed(2)}/hr</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Labour Rate:</span>
                      <span className="ml-2 font-bold">₹{selectedLSR.lhr.toFixed(2)}/hr</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Setup Manning</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={setupManning}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSetupManning(val === '' ? 0 : parseFloat(val) || 0);
                      }}
                      placeholder="Enter setup manning"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Setup Time (mins)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={setupTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSetupTime(val === '' ? 0 : parseFloat(val) || 0);
                      }}
                      placeholder="Enter setup time"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={batchSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchSize(val === '' ? 1 : parseFloat(val) || 1);
                      }}
                      placeholder="Enter batch size"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Heads</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={heads}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHeads(val === '' ? 0 : parseFloat(val) || 0);
                      }}
                      placeholder="Enter number of heads"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cycle Time (secs)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        value={cycleTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCycleTime(val === '' ? 0 : parseFloat(val) || 0);
                        }}
                        placeholder="Enter cycle time"
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCalculatorTarget('cycleTime');
                          setCalculatorOpen(true);
                        }}
                        title="Use Calculator"
                      >
                        <CalculatorIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Parts/Cycle</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={partsPerCycle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPartsPerCycle(val === '' ? 1 : parseFloat(val) || 1);
                      }}
                      placeholder="Enter parts per cycle"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Scrap %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={scrap}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScrap(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="Enter scrap percentage"
                  />
                </div>

                {/* Total Cost Display */}
                <Card className="bg-primary/10 border border-primary/20">
                  <CardContent className="pt-6">
                    <Label className="block mb-2">Total Cost</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">INR</span>
                      <span className="text-2xl font-bold text-primary">₹{totalCost.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedMHRId || !selectedLSRId || cycleTime <= 0 || batchSize <= 0}
            >
              {editData ? 'Update Process' : 'Add Process'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Calculator Side Panel */}
      <Sheet open={calculatorOpen} onOpenChange={setCalculatorOpen}>
        <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Calculator - {calculatorTarget}</SheetTitle>
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
                  {calculatorTarget === 'processCalculator' && availableCalculators && availableCalculators.length > 0 ? (
                    // Show mapped calculators if available
                    <>
                      {availableCalculators.map((mapping: any) => (
                        <SelectItem key={mapping.calculatorId} value={mapping.calculatorId}>
                          {mapping.calculatorName || 'Calculator'} (Mapped)
                        </SelectItem>
                      ))}
                      {((calculatorsData?.calculators ?? []).length > 0) && (
                        <>
                          <SelectItem key="divider" value="divider" disabled>
                            ─────────
                          </SelectItem>
                          {(calculatorsData?.calculators ?? []).map((calc: any) => (
                            <SelectItem key={calc.id} value={calc.id}>
                              {calc.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    // Show all calculators
                    ((calculatorsData?.calculators ?? []).length > 0) ? (
                      (calculatorsData?.calculators ?? []).map((calc: any) => (
                        <SelectItem key={calc.id} value={calc.id}>
                          {calc.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem key="no-calc" value="none" disabled>
                        No calculators available
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {calculatorTarget === 'processCalculator' && availableCalculators && availableCalculators.length === 0 && (
                <p className="text-xs text-amber-600">
                  No calculators are mapped to the selected operation. You can still use general calculators.
                </p>
              )}
              {calculatorTarget === 'processCalculator' && selectedCalculatorId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProcessCalculatorId(selectedCalculatorId);
                    setCalculatorOpen(false);
                    setCalculatorResults(null);
                    setCalculatorInputs({});
                    setCalculatorTarget(null);
                  }}
                  className="w-full"
                >
                  Use This Calculator
                </Button>
              )}
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
                                  onClick={() => handleCalculatorValue(value)}
                                  disabled={typeof value !== 'number' && typeof value !== 'string'}
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
