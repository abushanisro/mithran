'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { DatabaseRecordPicker } from './DatabaseRecordPicker';
import { FormulaBuilder } from './FormulaBuilder';
import type { CalculatorField, FieldType, DataSource, CalculatorFormula } from '@/lib/api/calculators';

type FieldManagerProps = {
  calculatorId: string;
  fields: CalculatorField[];
  onFieldsChange: (fields: CalculatorField[]) => void;
  formulas: CalculatorFormula[];
  onFormulasChange: (formulas: CalculatorFormula[]) => void;
};

type FieldFormData = {
  fieldName: string;
  displayLabel: string;
  fieldType: FieldType;
  dataSource?: DataSource;
  sourceRecordId?: string;
  sourceField?: string;
  unit?: string;
  defaultValue?: string;
  remarks?: string;
  selectOptions?: string[];
  isRequired: boolean;
};

export function FieldManager({ calculatorId, fields, onFieldsChange, formulas, onFormulasChange }: FieldManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingField, setEditingField] = useState<CalculatorField | null>(null);
  const [formData, setFormData] = useState<FieldFormData>({
    fieldName: '',
    displayLabel: '',
    fieldType: 'number',
    isRequired: false,
  });

  const fieldTypes: { value: FieldType; label: string; description?: string }[] = [
    { value: 'number', label: 'Number Input', description: 'Manual numeric input' },
    { value: 'text', label: 'Text Input', description: 'Manual text input' },
    { value: 'select', label: 'Dropdown Selection', description: 'Choose from predefined options' },
    { value: 'database_lookup', label: 'Database Lookup', description: 'Fetch value from database' },
    { value: 'calculated', label: 'Formula Calculated', description: 'Calculated from other fields' },
  ];

  const dataSources: { value: DataSource; label: string }[] = [
    { value: 'mhr', label: 'Machine Hour Rate (MHR)' },
    { value: 'lhr', label: 'Labour Hour Rate (LHR)' },
    { value: 'raw_materials', label: 'Raw Materials' },
    { value: 'processes', label: 'Processes' },
  ];

  const getAvailableFieldsForDataSource = (dataSource: DataSource): { value: string; label: string }[] => {
    switch (dataSource) {
      case 'mhr':
        return [
          { value: 'hourlyRate', label: 'Hourly Rate' },
          { value: 'tonnage', label: 'Tonnage' },
          { value: 'machineName', label: 'Machine Name' },
          { value: 'manufacturer', label: 'Manufacturer' },
        ];
      case 'lhr':
        return [
          { value: 'hourlyRate', label: 'Hourly Rate' },
          { value: 'labourCode', label: 'Labour Code' },
          { value: 'labourType', label: 'Labour Type' },
          { value: 'skillLevel', label: 'Skill Level' },
        ];
      case 'raw_materials':
        return [
          { value: 'pricePerKg', label: 'Price per Kg' },
          { value: 'density', label: 'Density' },
          { value: 'materialName', label: 'Material Name' },
          { value: 'grade', label: 'Grade' },
        ];
      case 'processes':
        return [
          { value: 'cycleTime', label: 'Cycle Time' },
          { value: 'setupTime', label: 'Setup Time' },
          { value: 'processName', label: 'Process Name' },
          { value: 'processType', label: 'Process Type' },
        ];
      default:
        return [];
    }
  };

  const handleAddField = () => {
    setIsAdding(true);
    setEditingField(null);
    setFormData({
      fieldName: '',
      displayLabel: '',
      fieldType: 'number',
      isRequired: false,
    });
  };

  const handleSaveField = () => {
    if (!formData.fieldName || !formData.displayLabel) {
      return;
    }

    const newField: CalculatorField = {
      id: editingField?.id || crypto.randomUUID(),
      calculatorId,
      fieldName: formData.fieldName,
      displayLabel: formData.displayLabel,
      fieldType: formData.fieldType,
      dataSource: formData.dataSource,
      sourceTable: formData.dataSource,
      sourceField: formData.sourceField,
      lookupConfig: formData.sourceRecordId ? { recordId: formData.sourceRecordId } : {},
      unit: formData.unit,
      defaultValue: formData.defaultValue,
      isRequired: formData.isRequired,
      validationRules: {},
      inputConfig: formData.selectOptions ? { options: formData.selectOptions, remarks: formData.remarks } : { remarks: formData.remarks },
      displayOrder: fields.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingField) {
      const updatedFields = fields.map(f => f.id === editingField.id ? newField : f);
      onFieldsChange(updatedFields);
    } else {
      onFieldsChange([...fields, newField]);
    }

    setIsAdding(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    onFieldsChange(fields.filter(f => f.id !== fieldId));
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingField(null);
  };

  return (
    <div className="space-y-4">
      {/* Existing Fields */}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-1" />
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium">{field.displayLabel}</div>
                  <div className="text-xs text-muted-foreground">{field.fieldName}</div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Type:</span> {field.fieldType}
                </div>
                <div className="text-sm">
                  {field.dataSource && (
                    <div>
                      <span className="text-muted-foreground">Source:</span> {field.dataSource}
                    </div>
                  )}
                  {field.unit && (
                    <div>
                      <span className="text-muted-foreground">Unit:</span> {field.unit}
                    </div>
                  )}
                  {field.defaultValue && (
                    <div>
                      <span className="text-muted-foreground">Default:</span> {field.defaultValue}
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  {field.isRequired && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                </div>
              </div>
              {field.inputConfig?.remarks && (
                <div className="text-xs text-muted-foreground italic">
                  {field.inputConfig.remarks}
                </div>
              )}
              {field.inputConfig?.options && Array.isArray(field.inputConfig.options) && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Options:</span>{' '}
                  {field.inputConfig.options.join(', ')}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteField(field.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add/Edit Field Form */}
      {isAdding && (
        <div className="border rounded-lg p-6 bg-background space-y-4">
          <h4 className="font-semibold">Add New Field</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">Field Name (Code)</Label>
              <Input
                id="fieldName"
                placeholder="e.g., machineRate"
                value={formData.fieldName}
                onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayLabel">Display Label</Label>
              <Input
                id="displayLabel"
                placeholder="e.g., Machine Hourly Rate"
                value={formData.displayLabel}
                onChange={(e) => setFormData({ ...formData, displayLabel: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(value: FieldType) => setFormData({ ...formData, fieldType: value })}
              >
                <SelectTrigger id="fieldType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.fieldType === 'database_lookup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source</Label>
                  <Select
                    value={formData.dataSource}
                    onValueChange={(value: DataSource) =>
                      setFormData({ ...formData, dataSource: value, sourceField: undefined })
                    }
                  >
                    <SelectTrigger id="dataSource">
                      <SelectValue placeholder="Select database..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.dataSource && (
                  <>
                    <div className="space-y-2 col-span-2">
                      <Label>Select Record</Label>
                      <DatabaseRecordPicker
                        dataSource={formData.dataSource}
                        value={formData.sourceRecordId}
                        onSelect={(record) =>
                          setFormData({ ...formData, sourceRecordId: record?.id })
                        }
                        placeholder={`Search ${formData.dataSource} records...`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sourceField">Field to Use</Label>
                      <Select
                        value={formData.sourceField}
                        onValueChange={(value) => setFormData({ ...formData, sourceField: value })}
                      >
                        <SelectTrigger id="sourceField">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableFieldsForDataSource(formData.dataSource).map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}

            {formData.fieldType === 'calculated' && (
              <div className="col-span-2 pt-6 mt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Calculation Formulas</h3>
                <FormulaBuilder
                  calculatorId={calculatorId}
                  fields={fields}
                  formulas={formulas}
                  onFormulasChange={onFormulasChange}
                />
              </div>
            )}

            {formData.fieldType === 'select' && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="selectOptions">Dropdown Options</Label>
                <Textarea
                  id="selectOptions"
                  placeholder="Enter options, one per line. E.g.,&#10;Cold Runner, Cashew Edge&#10;Hot Runner, Pin Point&#10;Hot Runner, Submarine"
                  value={formData.selectOptions?.join('\n') || ''}
                  onChange={(e) => setFormData({ ...formData, selectOptions: e.target.value.split('\n').filter(o => o.trim()) })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Enter each option on a new line</p>
              </div>
            )}

            {(formData.fieldType === 'number' || formData.fieldType === 'text') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit (Optional)</Label>
                  <Input
                    id="unit"
                    placeholder="e.g., kg, hrs, mm, Kg/CM^3"
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultValue">Default Value (Optional)</Label>
                  <Input
                    id="defaultValue"
                    placeholder="e.g., 0, 1"
                    value={formData.defaultValue || ''}
                    onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="col-span-2 space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Input
                id="remarks"
                placeholder="e.g., Lookup from RM Database, From CAD or Manual input, Based on default formula"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Explain where this value comes from (e.g., database lookup, CAD input, formula)
              </p>
            </div>

            <div className="flex items-center space-x-2 col-span-2">
              <Switch
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
              />
              <Label htmlFor="isRequired">Required field</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveField}>Save Field</Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Field Button */}
      {!isAdding && (
        <Button onClick={handleAddField} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      )}
    </div>
  );
}
