'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataSource } from '@/lib/api/calculators';

type DatabaseFieldExtractorProps = {
  dataSource: DataSource;
  recordId?: string;
  selectedField?: string;
  onFieldSelect: (field: string) => void;
  disabled?: boolean;
};

// Define available fields for each data source
const DATA_SOURCE_FIELDS: Record<DataSource, Array<{ field: string; label: string; description: string }>> = {
  mhr: [
    { field: 'totalMachineHourRate', label: 'Total MHR', description: 'Complete machine hour rate' },
    { field: 'machineName', label: 'Machine Name', description: 'Name of the machine' },
    { field: 'manufacturer', label: 'Manufacturer', description: 'Machine manufacturer' },
    { field: 'location', label: 'Location', description: 'Machine location' },
    { field: 'powerConsumption', label: 'Power Consumption', description: 'Power usage in kW' },
    { field: 'maintenanceCost', label: 'Maintenance Cost', description: 'Annual maintenance cost' },
  ],
  lhr: [
    { field: 'lhr', label: 'Labor Hour Rate', description: 'Complete labor hour rate' },
    { field: 'labourCode', label: 'Labor Code', description: 'Unique labor identifier' },
    { field: 'labourType', label: 'Labor Type', description: 'Type of labor' },
    { field: 'minimumWagePerDay', label: 'Daily Wage', description: 'Minimum wage per day' },
    { field: 'minimumWagePerMonth', label: 'Monthly Wage', description: 'Minimum wage per month' },
    { field: 'dearnessAllowance', label: 'Dearness Allowance', description: 'DA component' },
  ],
  raw_materials: [
    { field: 'material', label: 'Material Name', description: 'Name of the material' },
    { field: 'materialGrade', label: 'Grade', description: 'Material grade/specification' },
    { field: 'materialGroup', label: 'Group', description: 'Material category' },
    { field: 'density', label: 'Density', description: 'Material density' },
    { field: 'costPerKg', label: 'Cost per KG', description: 'Price per kilogram' },
    { field: 'location', label: 'Location', description: 'Storage location' },
  ],
  processes: [
    { field: 'processName', label: 'Process Name', description: 'Name of the process' },
    { field: 'processCategory', label: 'Category', description: 'Process category' },
    { field: 'standardTimeMinutes', label: 'Standard Time', description: 'Standard time in minutes' },
    { field: 'setupTimeMinutes', label: 'Setup Time', description: 'Setup time in minutes' },
    { field: 'cycleTimeMinutes', label: 'Cycle Time', description: 'Cycle time in minutes' },
    { field: 'machineRequired', label: 'Machine Required', description: 'Whether machine is required' },
  ],
  manual: [],
};

export function DatabaseFieldExtractor({
  dataSource,
  recordId,
  selectedField,
  onFieldSelect,
  disabled = false,
}: DatabaseFieldExtractorProps) {
  const [availableFields, setAvailableFields] = useState<Array<{ field: string; label: string; description: string }>>([]);

  useEffect(() => {
    if (dataSource && dataSource !== 'manual') {
      setAvailableFields(DATA_SOURCE_FIELDS[dataSource] || []);
    } else {
      setAvailableFields([]);
    }
  }, [dataSource]);

  if (!dataSource || dataSource === 'manual' || availableFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-3 border-t border-primary/10">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold">Extract Specific Field</Label>
      </div>

      <div className="space-y-2">
        <Select value={selectedField || ''} onValueChange={onFieldSelect} disabled={disabled}>
          <SelectTrigger className={cn("h-9", disabled ? "bg-secondary/20" : "bg-primary/5 border-primary/10")}>
            <SelectValue placeholder="Select field to extract (optional)" />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => (
              <SelectItem key={field.field} value={field.field}>
                <div className="flex items-center gap-2">
                  <span>{field.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {field.field}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedField && (
          <div className="flex items-start gap-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">
                {availableFields.find(f => f.field === selectedField)?.label}:
              </span>{' '}
              {availableFields.find(f => f.field === selectedField)?.description}
            </div>
          </div>
        )}

        {!selectedField && (
          <p className="text-xs text-muted-foreground">
            Leave empty to use the entire record, or select a specific field to extract its value
          </p>
        )}
      </div>

      {/* Preview */}
      {selectedField && (
        <div className="bg-primary/5 border border-primary/10 rounded-md p-2">
          <div className="text-xs font-mono">
            <span className="text-muted-foreground">Formula:</span>{' '}
            <span className="text-primary">
              {recordId
                ? `LOOKUP("${dataSource}", "${recordId}", "${selectedField}")`
                : `LOOKUP("${dataSource}", "<record_id>", "${selectedField}")`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
