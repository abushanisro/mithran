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
  dataSource: DataSource;
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
  const [selectedRecord, setSelectedRecord] = useState<DatabaseRecord | null>(null);

  // Fetch records based on data source
  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        const { apiClient } = await import('@/lib/api/client');

        let endpoint = '';
        let mapFunction: (data: any) => DatabaseRecord;

        switch (dataSource) {
          case 'mhr':
            endpoint = '/mhr';
            mapFunction = (item: any) => ({
              id: item.id,
              displayLabel: `${item.machineName || 'Unknown'} - ${item.manufacturer || ''}`,
              metadata: { hourlyRate: item.hourlyRate, tonnage: item.tonnage },
            });
            break;
          case 'lhr':
            endpoint = '/lsr';
            mapFunction = (item: any) => ({
              id: item.id,
              displayLabel: `${item.labourCode || 'Unknown'} - ${item.labourType || ''}`,
              metadata: { hourlyRate: item.hourlyRate, skillLevel: item.skillLevel },
            });
            break;
          case 'raw_materials':
            endpoint = '/raw-materials';
            mapFunction = (item: any) => ({
              id: item.id,
              displayLabel: `${item.materialName || 'Unknown'} - ${item.grade || ''}`,
              metadata: { pricePerKg: item.pricePerKg, density: item.density },
            });
            break;
          case 'processes':
            endpoint = '/processes';
            mapFunction = (item: any) => ({
              id: item.id,
              displayLabel: `${item.processName || 'Unknown'} - ${item.processType || ''}`,
              metadata: { cycleTime: item.cycleTime, setupTime: item.setupTime },
            });
            break;
          default:
            throw new Error(`Unsupported data source: ${dataSource}`);
        }

        const response = await apiClient.get<any>(endpoint);
        const data = Array.isArray(response) ? response : response?.data || [];
        const mappedRecords = data.map(mapFunction);
        setRecords(mappedRecords);
      } catch (error) {
        console.error(`Failed to fetch ${dataSource} records:`, error);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && records.length === 0) {
      fetchRecords();
    }
  }, [dataSource, open]);

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
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
            ) : (
              <>
                <CommandEmpty>No records found.</CommandEmpty>
                <CommandGroup>
                  {filteredRecords.map((record) => (
                    <CommandItem
                      key={record.id}
                      value={record.id}
                      onSelect={() => {
                        onSelect(record.id === value ? null : record);
                        setOpen(false);
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
