'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { DataSource } from '@/lib/api/calculators';

type DatabaseRecord = {
  id: string;
  displayLabel: string;
  metadata?: Record<string, any>;
};

type DatabaseRecordPickerProps = {
  dataSource: DataSource | '';
  value?: string;
  onSelect: (record: DatabaseRecord | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function DatabaseRecordPicker({
  dataSource,
  value,
  onSelect,
  placeholder = 'Select record...',
  disabled = false,
}: DatabaseRecordPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DatabaseRecord | null>(null);
  const [lastFetchedSource, setLastFetchedSource] = useState<DataSource | null>(null);

  // Handle popover close
  const handleClose = () => {
    setOpen(false);
    setSearch(''); // Clear search when closing
  };

  // Fetch records based on data source
  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true);
      setError(null);
      let endpoint = '';

      try {
        // Special handling for processes - use hardcoded constants
        if (dataSource === 'processes') {
          const { MANUFACTURING_PROCESSES } = await import('@/lib/constants/manufacturingProcesses');

          const processRecords: DatabaseRecord[] = MANUFACTURING_PROCESSES.map((process) => ({
            id: String(process.id),
            displayLabel: `${process.name} - ${process.category}`,
            metadata: {
              category: process.category,
            },
          }));

          setRecords(processRecords);
          setError(null);
          setLastFetchedSource(dataSource);
          setIsLoading(false);
          return;
        }

        const { apiClient } = await import('@/lib/api/client');

        let mapFunction: (data: any) => DatabaseRecord;

        switch (dataSource) {
          case 'mhr':
            endpoint = '/mhr';
            mapFunction = (item: any) => ({
              id: item.id,
              displayLabel: `${item.machineName || 'Unknown'}${item.manufacturer ? ` - ${item.manufacturer}` : ''}`,
              metadata: {
                rate: `₹${item.calculations?.totalMachineHourRate?.toFixed(2) || 'N/A'}/hr`,
                location: item.location || 'N/A'
              },
            });
            break;
          case 'lhr':
            endpoint = '/lsr';
            mapFunction = (item: any) => ({
              id: item.id,
              displayLabel: `${item.labourCode || 'Unknown'}${item.labourType ? ` - ${item.labourType}` : ''}`,
              metadata: {
                rate: `₹${item.lhr?.toFixed(2) || 'N/A'}/hr`,
                type: item.labourType || 'N/A'
              },
            });
            break;
          case 'raw_materials':
            endpoint = '/raw-materials';
            mapFunction = (item: any) => ({
              id: item.id,
              displayLabel: `${item.material || 'Unknown'}${item.materialGrade ? ` - ${item.materialGrade}` : ''}`,
              metadata: {
                group: item.materialGroup || 'N/A',
                location: item.location || 'N/A'
              },
            });
            break;
          default:
            throw new Error(`Unsupported data source: ${dataSource}`);
        }

        const response = await apiClient.get<any>(endpoint);

        // Handle different response structures
        // MHR/LSR return { records: [], total, page, limit }
        // Others may return { items: [], total } or flat array
        let data: any[] = [];

        if (Array.isArray(response)) {
          data = response;
        } else if (response?.records && Array.isArray(response.records)) {
          data = response.records; // MHR response structure
        } else if (response?.items && Array.isArray(response.items)) {
          data = response.items; // Raw materials response structure
        } else if (response?.processes && Array.isArray(response.processes)) {
          data = response.processes; // Processes response structure
        } else if (response?.data) {
          // Fallback: check if data is an array or has nested structure
          if (Array.isArray(response.data)) {
            data = response.data;
          } else if (response.data.records) {
            data = response.data.records;
          } else if (response.data.items) {
            data = response.data.items;
          } else if (response.data.processes) {
            data = response.data.processes;
          }
        }

        if (!data || data.length === 0) {
          console.warn(`[DatabaseRecordPicker] No ${dataSource} records found in response`);
          setError(`No ${dataSource.replace('_', ' ')} records found in database`);
          setRecords([]);
        } else {
          const mappedRecords = data.map(mapFunction);
          setRecords(mappedRecords);
          setError(null);
        }

        setLastFetchedSource(dataSource);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[DatabaseRecordPicker] Failed to fetch ${dataSource} records:`, err);
        console.error(`[DatabaseRecordPicker] Error details:`, {
          name: err instanceof Error ? err.name : 'Unknown',
          message: errorMessage,
          endpoint,
        });
        setError(`Failed to load ${dataSource.replace('_', ' ')} records: ${errorMessage}`);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch records when dataSource changes (skip empty string)
    if (dataSource && typeof dataSource === 'string' && dataSource.length > 0 && dataSource !== lastFetchedSource) {
      fetchRecords();
    }
  }, [dataSource, lastFetchedSource]);

  // Find selected record by value
  useEffect(() => {
    if (value && records.length > 0) {
      const found = records.find(r => r.id === value);
      setSelectedRecord(found || null);
    } else {
      setSelectedRecord(null);
    }
  }, [value, records]);

  const filteredRecords = records.filter(record =>
    record.displayLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearch(''); // Clear search when closing
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
          onClick={() => {
          }}
        >
          {selectedRecord ? selectedRecord.displayLabel : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${dataSource} records...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-3">
                <div className="p-3 rounded-full bg-muted">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">No {dataSource.replace('_', ' ')} records yet</p>
                  <p className="text-xs text-muted-foreground">
                    Add records to use this data source in your calculator
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full pt-2">
                  {dataSource === 'mhr' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        window.open('/mhr-database', '_blank');
                        handleClose();
                      }}
                    >
                      Add MHR Records
                    </Button>
                  )}
                  {dataSource === 'lhr' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        window.open('/lhr-database', '_blank');
                        handleClose();
                      }}
                    >
                      Add LHR Records
                    </Button>
                  )}
                  {dataSource === 'processes' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        window.open('/process', '_blank');
                        handleClose();
                      }}
                    >
                      Add Process Records
                    </Button>
                  )}
                  {dataSource === 'raw_materials' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        window.open('/raw-materials', '_blank');
                        handleClose();
                      }}
                    >
                      Add Raw Material Records
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleClose()}
                  >
                    Continue Without Selection
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <CommandEmpty>No records found.</CommandEmpty>
                <CommandGroup>
                  {filteredRecords.map((record) => (
                    <CommandItem
                      key={record.id}
                      value={record.displayLabel.toLowerCase()}
                      onSelect={() => {

                        // Toggle selection: if already selected, deselect
                        const isSelected = value === record.id;

                        try {
                          if (isSelected) {
                            onSelect(null);
                          } else {
                            onSelect(record);
                          }
                        } catch (err) {
                          console.error('[DatabaseRecordPicker] Error in onSelect:', err);
                        }

                        // Force close popover with multiple methods
                        handleClose();
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === record.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{record.displayLabel}</div>
                        {record.metadata && (
                          <div className="text-xs text-muted-foreground">
                            {Object.entries(record.metadata)
                              .slice(0, 2)
                              .map(([key, val]) => `${key}: ${val}`)
                              .join(' | ')}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
