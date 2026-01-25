'use client';

import React from 'react';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, X, Search, ChevronDown } from 'lucide-react';
import {
  useBOMs,
  useBOMItems
} from '@/lib/api/hooks';
import { useProcesses } from '@/lib/api/hooks/useProcesses';
import { ErrorBoundary } from '@/components/error-boundary';
import { useProcessCosts, useCreateProcessCost } from '@/lib/api/hooks/useProcessCosts';
import { useCreateSupplierEvaluationGroup } from '@/lib/api/hooks/useSupplierEvaluationGroups';
import { uuidValidator } from '@/lib/utils/uuid-validator';
import { ProcessCostDialog } from '@/components/features/process-planning/ProcessCostDialog';
import { toast } from 'sonner';

const evaluationFormSchema = z.object({
  supplierGroupName: z.string().min(1, 'Please enter a supplier group name').max(100, 'Name must be less than 100 characters'),
  bomId: z.string().min(1, 'Please select a BOM').refine((val) => {
    const validation = uuidValidator.validate(val, 'BOM ID');
    return validation.isValid;
  }, 'BOM ID must be a valid UUID'),
  bomItemIds: z.array(z.string()).min(1, 'Please select at least one part').refine((arr) => {
    const validation = uuidValidator.validateArray(arr, 'BOM Item IDs');
    return validation.errors.length === 0;
  }, 'All BOM Item IDs must be valid UUIDs'),
  processSelections: z.array(z.object({
    processGroup: z.string(),
    processRouteId: z.string().refine((val) => {
      // Validate as UUID (both global processes and process costs use UUIDs)
      const validation = uuidValidator.validate(val, 'Process Route ID');
      return validation.isValid;
    }, 'Process Route ID must be a valid UUID'),
  })).min(1, 'Please select at least one process'),
  notes: z.string().optional(),
});

type EvaluationFormData = z.infer<typeof evaluationFormSchema>;

interface NewEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewEvaluationDialog({
  open,
  onOpenChange,
  onSuccess
}: NewEvaluationDialogProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id || '';

  const form = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: {
      supplierGroupName: '',
      bomId: '',
      bomItemIds: [],
      processSelections: [],
      notes: '',
    },
    mode: 'onChange',
  });

  // Watch form values for dependent queries
  const selectedBomId = form.watch('bomId');
  const selectedBomItemIds = form.watch('bomItemIds');
  const processSelections = form.watch('processSelections');

  // Search states
  const [bomSearch, setBomSearch] = React.useState('');
  const [processSearch, setProcessSearch] = React.useState('');

  // Process Cost Dialog state
  const [processDialogOpen, setProcessDialogOpen] = React.useState(false);

  // Fetch real processes from database
  const { data: processesData } = useProcesses();
  const availableProcesses = processesData?.processes || [];

  // Fetch data
  const { data: bomsData, isLoading: bomsLoading } = useBOMs({
    projectId: projectId
  });

  const { data: bomItemsData, isLoading: bomItemsLoading } = useBOMItems(
    selectedBomId || undefined
  );

  // Fetch process costs for all selected BOM items
  const { data: processCostsData, isLoading: processCostsLoading, error: processCostsError } = useProcessCosts({
    bomItemIds: selectedBomItemIds.length > 0 ? selectedBomItemIds : undefined,
    isActive: true,
    enabled: selectedBomItemIds.length > 0,
  });

  // Production: Handle circuit breaker errors gracefully
  React.useEffect(() => {
    if (processCostsError?.message?.includes('Circuit breaker is OPEN')) {
      // Circuit breaker will reset automatically after timeout
      // No action needed in production
    }
  }, [processCostsError]);






  // Mutations
  const createProcessCostMutation = useCreateProcessCost();
  const createEvaluationGroupMutation = useCreateSupplierEvaluationGroup();

  const boms = bomsData?.boms || [];
  const bomItems = bomItemsData?.items || [];
  const processCosts = processCostsData?.records || [];

  // Filter BOM items based on search
  const filteredBomItems = bomItems.filter(item => {
    if (!bomSearch) return true;
    const searchLower = bomSearch.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.partNumber?.toLowerCase().includes(searchLower) ||
      item.material?.toLowerCase().includes(searchLower)
    );
  });

  // Filter process costs based on search
  const filteredProcessCosts = processCosts.filter(process => {
    if (!processSearch) return true;
    const searchLower = processSearch.toLowerCase();
    return (
      process.processRoute?.toLowerCase().includes(searchLower) ||
      process.operation?.toLowerCase().includes(searchLower) ||
      process.processGroup?.toLowerCase().includes(searchLower) ||
      process.description?.toLowerCase().includes(searchLower)
    );
  });

  // Get all available process groups and routes
  const allProcessGroups = Array.from(new Set(
    filteredProcessCosts.map(process => process.processGroup).filter((group): group is string => !!group)
  ));

  const allProcessRoutes = filteredProcessCosts.reduce((acc, process) => {
    const group = process.processGroup || 'unassigned';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(process);
    return acc;
  }, {} as Record<string, typeof processCosts>);





  const onSubmit = async (data: EvaluationFormData) => {
    try {
      // Sanitize all UUIDs before sending to API
      uuidValidator.assert(data.bomId, 'BOM ID');
      const sanitizedBomItemIds = uuidValidator.assertArray(data.bomItemIds, 'BOM Item IDs');
      const sanitizedProcessSelections = data.processSelections.map(selection => ({
        ...selection,
        processRouteId: uuidValidator.assert(selection.processRouteId, 'Process Route ID')
      }));

      // Prepare evaluation group data for database
      const evaluationGroupData = {
        projectId,
        name: data.supplierGroupName,
        notes: data.notes,
        bomItems: sanitizedBomItemIds.map(bomItemId => {
          const item = bomItems.find(b => b.id === bomItemId);
          return {
            id: bomItemId,
            bomId: data.bomId,
            name: item?.name || 'Unknown Part',
            partNumber: item?.partNumber || '',
            material: item?.material || '',
            quantity: item?.quantity || 1
          };
        }),
        processes: sanitizedProcessSelections.map(process => {
          const globalProcess = availableProcesses.find((p: any) => p.id === process.processRouteId);
          if (globalProcess) {
            return {
              id: process.processRouteId,
              processGroup: globalProcess.processName,
              name: globalProcess.processName,
              isPredefined: true,
              type: 'service' as const // Predefined global processes are treated as services
            };
          }

          const proc = processCosts.find(p => p.id === process.processRouteId);
          return {
            id: process.processRouteId,
            processGroup: process.processGroup,
            name: proc?.processRoute || proc?.operation || 'Unknown Process',
            isPredefined: false,
            type: 'manufacturing' as const
          };
        }),
      };

      // Create evaluation group in database
      await createEvaluationGroupMutation.mutateAsync(evaluationGroupData);

      // Show success message
      toast.success('Supplier evaluation created! Opening supplier dashboard.');

      // Reset form and close dialog
      form.reset({
        supplierGroupName: '',
        bomId: '',
        bomItemIds: [],
        processSelections: [],
        notes: '',
      });
      onOpenChange(false);
      onSuccess?.();

      // Navigate to supplier evaluation page
      router.push(`/projects/${projectId}/supplier-evaluation`);
    } catch (error) {
      toast.error('Failed to create supplier evaluation. Please try again.');
      
      // Log errors in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating supplier evaluation:', error);
        if (error instanceof Error && error.message.includes('UUID')) {
          console.error('UUID validation failed:', error.message);
        }
      }
    }
  };



  const handleBomChange = (bomId: string) => {
    form.setValue('bomId', bomId);
    // Reset dependent fields
    form.setValue('bomItemIds', []);
    form.setValue('processSelections', []);
  };

  const toggleBomItem = (bomItemId: string) => {
    const currentItems = form.getValues('bomItemIds');
    if (currentItems.includes(bomItemId)) {
      form.setValue('bomItemIds', currentItems.filter(id => id !== bomItemId));
    } else {
      form.setValue('bomItemIds', [...currentItems, bomItemId]);
    }
  };

  const addProcessSelection = (processGroup: string, processRouteId: string) => {
    const currentSelections = form.getValues('processSelections');
    const exists = currentSelections.some(s => s.processGroup === processGroup && s.processRouteId === processRouteId);

    if (!exists) {
      form.setValue('processSelections', [...currentSelections, { processGroup, processRouteId }]);
    }
  };

  const removeProcessSelection = (index: number) => {
    const currentSelections = form.getValues('processSelections');
    form.setValue('processSelections', currentSelections.filter((_, i) => i !== index));
  };

  const addGlobalProcess = (process: any) => {
    const currentSelections = form.getValues('processSelections');

    // Check if process already exists
    const exists = currentSelections.some(s => s.processRouteId === process.id);

    if (!exists) {
      const newSelection = {
        processGroup: process.processName,
        processRouteId: process.id // Use real process ID
      };

      form.setValue('processSelections', [...currentSelections, newSelection]);
    }
  };


  const handleProcessCostSubmit = async (processData: any) => {
    try {
      // Link the process cost to the selected BOM items if any are selected
      const bomItemId = selectedBomItemIds.length > 0 ? selectedBomItemIds[0] : undefined;

      await createProcessCostMutation.mutateAsync({
        ...processData,
        bomItemId,
        isActive: true,
      });

      // Close the dialog
      setProcessDialogOpen(false);

      // The useProcessCosts hook should automatically refresh and show the new process
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating process cost:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <ErrorBoundary
          onError={(error, errorInfo) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('[NewEvaluationDialog] Error:', error);
              console.error('[NewEvaluationDialog] Error Info:', errorInfo);
            }
          }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>New Supplier Evaluation</DialogTitle>
            <DialogDescription>
              Create a new supplier evaluation by selecting BOM parts and processes. You'll select vendors on the next page.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
                {/* Supplier Group Name */}
                <FormField
                  control={form.control}
                  name="supplierGroupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Group Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a name for this supplier evaluation group (e.g., 'Engine Block Suppliers', 'Q1 2026 Evaluation')"
                          value={field.value || ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Grid Layout for Multi-Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Left Column: BOM Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">1</div>
                      <h3 className="text-lg font-semibold">BOM Selection</h3>
                    </div>

                    <FormField
                      control={form.control}
                      name="bomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select BOM</FormLabel>
                          <Select
                            onValueChange={handleBomChange}
                            value={field.value}
                            disabled={bomsLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a BOM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {boms.map((bom) => (
                                <SelectItem key={bom.id} value={bom.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{bom.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      v{bom.version} • {bom.totalItems} items • {bom.status}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Multi-Select Parts */}
                    {selectedBomId && (
                      <FormField
                        control={form.control}
                        name="bomItemIds"
                        render={() => (
                          <FormItem>
                            <FormLabel>Select Parts (Multiple)</FormLabel>
                            <Card>
                              <CardHeader className="pb-3">
                                <CardDescription>
                                  Select multiple parts for supplier evaluation
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                {/* Search Bar for BOM Items */}
                                <div className="mb-3">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Search parts by name, part number, or material..."
                                      value={bomSearch}
                                      onChange={(e) => setBomSearch(e.target.value)}
                                      className="pl-8"
                                    />
                                  </div>
                                </div>
                                <div className="h-64 overflow-y-auto pr-2">
                                  <div className="space-y-2">
                                    {bomItemsLoading ? (
                                      <div className="text-sm text-muted-foreground p-4 text-center">
                                        Loading parts...
                                      </div>
                                    ) : filteredBomItems.length === 0 ? (
                                      <div className="text-sm text-muted-foreground p-4 text-center">
                                        {bomSearch ? 'No parts found matching search criteria' : 'No parts available'}
                                      </div>
                                    ) : (
                                      filteredBomItems.map((item) => (
                                        <div key={item.id} className="flex items-start space-x-2 p-2 hover:bg-muted/50 rounded">
                                          <Checkbox
                                            id={`part-${item.id}`}
                                            checked={selectedBomItemIds.includes(item.id)}
                                            onCheckedChange={() => toggleBomItem(item.id)}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <label
                                              htmlFor={`part-${item.id}`}
                                              className="text-sm font-medium cursor-pointer"
                                            >
                                              {item.name}
                                            </label>
                                            <div className="text-xs text-muted-foreground">
                                              {item.partNumber && `Part: ${item.partNumber} • `}
                                              {item.itemType} • Qty: {item.quantity}
                                              {item.material && ` • ${item.material}`}
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* Selected Parts Display */}
                                {selectedBomItemIds.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="text-xs font-medium text-muted-foreground mb-2">
                                      Selected Parts ({selectedBomItemIds.length}):
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedBomItemIds.map((itemId) => {
                                        const item = bomItems.find(b => b.id === itemId);
                                        return item ? (
                                          <Badge key={itemId} variant="secondary" className="text-xs">
                                            {item.name}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Right Column: Process Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">2</div>
                      <h3 className="text-lg font-semibold">Process Selection</h3>
                    </div>

                    {selectedBomItemIds.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>
                            Select processes for supplier evaluation
                            {processCosts.length > 0 && (
                              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                                {processCosts.length} total processes
                              </span>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Search Bar and Add Process Button */}
                          <div className="mb-3 space-y-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search processes by name, operation, or group..."
                                value={processSearch}
                                onChange={(e) => setProcessSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 w-full"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add New Process
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56" align="start" sideOffset={4}>
                                <div className="px-2 py-2">
                                  <div className="text-sm font-medium text-muted-foreground pb-2 border-b">Services</div>
                                  <div className="py-2 space-y-1 max-h-48 overflow-y-auto">
                                    {availableProcesses.filter((p: any) => p.type === 'service' || !p.type).map((process: any) => (
                                      <DropdownMenuItem
                                        key={process.id}
                                        onClick={() => addGlobalProcess(process)}
                                        className="cursor-pointer text-sm px-2 py-2 rounded hover:bg-accent focus:bg-accent transition-colors"
                                      >
                                        <span className="text-sm">{process.processName}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          {process.processCategory || 'service'}
                                        </span>
                                      </DropdownMenuItem>
                                    ))}
                                  </div>
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="h-80 overflow-y-auto pr-2">
                            {processCostsLoading ? (
                              <div className="text-sm text-muted-foreground p-4 text-center">
                                Loading processes...
                              </div>
                            ) : processCostsError ? (
                              <div className="text-sm text-destructive p-4 text-center">
                                Error loading processes: {processCostsError.message}
                              </div>
                            ) : allProcessGroups.length === 0 ? (
                              <div className="text-sm text-muted-foreground p-4 text-center">
                                {processSearch
                                  ? 'No processes found matching search criteria'
                                  : processCosts.length === 0
                                    ? 'No processes planned for selected parts. Click "Add New Process" to create one.'
                                    : 'No processes match the current filter'
                                }
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {allProcessGroups.map((group) => (
                                  <div key={group} className="space-y-2">
                                    <h4 className="font-medium text-sm capitalize border-b pb-1">
                                      {group.replace('_', ' ')}
                                    </h4>
                                    <div className="space-y-1 ml-2">
                                      {(allProcessRoutes[group] || []).map((process) => (
                                        <div key={process.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium">
                                              {process.processRoute || process.operation}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {process.operation && `${process.operation} • `}
                                              {process.totalCostPerPart && `₹${process.totalCostPerPart.toFixed(2)}`}
                                            </div>
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addProcessSelection(group, process.id)}
                                            disabled={processSelections.some(s => s.processGroup === group && s.processRouteId === process.id)}
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Selected Processes Display */}
                          {processSelections.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Selected Processes ({processSelections.length}):
                              </div>
                              <div className="space-y-2">
                                {processSelections.map((selection, index) => {
                                  const process = processCosts.find(p => p.id === selection.processRouteId);
                                  const globalProcess = availableProcesses.find((p: any) => p.id === selection.processRouteId);

                                  return (
                                    <div key={index} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium">
                                          {globalProcess ? globalProcess.processName : (process?.processRoute || process?.operation)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {globalProcess ? `Global ${globalProcess.processCategory || 'service'}` : `${selection.processGroup} • ${process?.totalCostPerPart && `₹${process.totalCostPerPart.toFixed(2)}`}`}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeProcessSelection(index)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>




                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evaluation Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any specific requirements or notes for this evaluation..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting}
              className="gap-2"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Continue to Vendor Selection
            </Button>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>

      {/* Process Cost Creation Dialog */}
      <ProcessCostDialog
        open={processDialogOpen}
        onOpenChange={setProcessDialogOpen}
        onSubmit={handleProcessCostSubmit}
      />
    </Dialog>
  );
}