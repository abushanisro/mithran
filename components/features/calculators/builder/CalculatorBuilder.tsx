'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCalculator, useUpdateCalculator } from '@/lib/api/hooks';
import type { Calculator, CalculatorField, FieldType, DataSource } from '@/lib/api/calculators';
import { FormulaEditor } from './FormulaEditor';
import { DatabaseFieldExtractor } from './DatabaseFieldExtractor';
import { cn } from '@/lib/utils';

type CalculatorBuilderProps = {
  calculatorId: string;
};

/**
 * CalculatorBuilder - Enterprise Grade V2
 *
 * PRINCIPLES:
 * 1. Single source of truth (calculator object contains everything)
 * 2. Atomic saves (one Save button saves everything)
 * 3. Strict types (no any, no optional chaining abuse)
 * 4. Explicit state handling (loading, error, empty states)
 */
export function CalculatorBuilder({ calculatorId }: CalculatorBuilderProps) {
  const router = useRouter();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: calculator, isLoading, error } = useCalculator(calculatorId);
  const updateCalculator = useUpdateCalculator();

  // ============================================================================
  // LOCAL STATE (Transient Edit State - NOT Persisted Until Save)
  // ============================================================================

  // This is the ONLY state - one unified object
  const [draftCalculator, setDraftCalculator] = useState<Calculator | null>(null);

  // Track which field is being saved
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);

  // Track which fields are saved (not in edit mode)
  const [savedFieldIds, setSavedFieldIds] = useState<Set<string>>(new Set());

  // Track which fields are in edit mode
  const [editingFieldIds, setEditingFieldIds] = useState<Set<string>>(new Set());

  // Determine which data to use (draft or fetched)
  const currentData = draftCalculator || calculator;

  // Initialize saved fields when calculator loads (only on first load)
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (calculator?.fields && isInitialLoad) {
      const existingFieldIds = calculator.fields
        .map(f => f.id)
        .filter(id => !id.startsWith('temp-')); // Only mark persisted fields as saved
      setSavedFieldIds(new Set(existingFieldIds));
      setIsInitialLoad(false);
    }
  }, [calculator, isInitialLoad]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleMetadataChange = <K extends keyof Calculator>(key: K, value: Calculator[K]) => {
    if (!currentData) return;

    setDraftCalculator({
      ...currentData,
      [key]: value,
    });
  };

  const handleAddField = () => {
    if (!currentData) return;

    const fieldCount = currentData.fields?.length || 0;
    const newFieldId = `temp-${Date.now()}`;

    const newField: Partial<CalculatorField> = {
      id: newFieldId, // Temporary ID, will be replaced by backend
      fieldName: '', // Will be generated from displayLabel
      displayLabel: '',
      fieldType: 'number',
      isRequired: false,
      displayOrder: fieldCount,
      unit: '',
      defaultValue: '',
      sourceField: '',
      lookupConfig: {},
      inputConfig: { decimalPlaces: 2 },
    };

    setDraftCalculator({
      ...currentData,
      fields: [...(currentData.fields || []), newField as CalculatorField],
    });

    // New fields start in edit mode
    setEditingFieldIds(prev => new Set(prev).add(newFieldId));
  };

  const handleUpdateField = (index: number, updates: Partial<CalculatorField>) => {
    const fields = currentData?.fields;
    const field = fields?.[index];
    if (!field || !fields) return;

    // Use the exact display label as field name
    if (updates.displayLabel !== undefined) {
      updates.fieldName = updates.displayLabel;
    }

    const updatedFields = [...fields];
    const fieldId = field.id;
    updatedFields[index] = { ...field, ...updates } as CalculatorField;

    setDraftCalculator({
      ...currentData,
      fields: updatedFields,
    });

    // Mark field as being edited (remove from saved state)
    if (savedFieldIds.has(fieldId)) {
      setEditingFieldIds(prev => new Set(prev).add(fieldId));
      setSavedFieldIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldId);
        return newSet;
      });
    }
  };

  const handleDeleteField = (index: number) => {
    const fields = currentData?.fields;
    const field = fields?.[index];
    if (!field || !fields) return;

    const fieldId = field.id;

    setDraftCalculator({
      ...currentData,
      fields: fields.filter((_, i) => i !== index),
    });

    // Clean up tracking sets
    setSavedFieldIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldId);
      return newSet;
    });
    setEditingFieldIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldId);
      return newSet;
    });
  };

  // Formula management removed as it's now integrated into fields
  // handleAddFormula, handleUpdateFormula, handleDeleteFormula were unused

  /**
   * SAVE INDIVIDUAL FIELD
   * Saves a single field immediately
   */
  const handleSaveField = async (fieldId: string) => {
    if (!currentData || !currentData.fields) return;

    const field = currentData.fields.find(f => f.id === fieldId);
    if (!field) return;

    setSavingFieldId(fieldId);

    try {
      const response = await updateCalculator.mutateAsync({
        id: calculatorId,
        data: {
          name: currentData.name,
          description: currentData.description,
          calcCategory: currentData.calcCategory,
          calculatorType: currentData.calculatorType,
          isTemplate: currentData.isTemplate,
          isPublic: currentData.isPublic,
          displayConfig: currentData.displayConfig,
          fields: currentData.fields?.map(f => ({
            fieldName: f.fieldName || f.displayLabel || '',
            displayLabel: f.displayLabel || '',
            fieldType: f.fieldType,
            dataSource: f.dataSource,
            sourceTable: f.sourceTable,
            sourceField: f.sourceField,
            lookupConfig: f.lookupConfig,
            defaultValue: f.defaultValue,
            unit: f.unit,
            minValue: f.minValue,
            maxValue: f.maxValue,
            isRequired: f.isRequired,
            validationRules: f.validationRules,
            inputConfig: f.inputConfig,
            displayOrder: f.displayOrder,
            fieldGroup: f.fieldGroup,
          })),
          formulas: currentData.formulas?.map(f => ({
            formulaName: f.formulaName || f.displayLabel || '',
            displayLabel: f.displayLabel || '',
            description: f.description,
            formulaType: f.formulaType || 'expression',
            formulaExpression: f.formulaExpression || '',
            visualFormula: f.visualFormula,
            dependsOnFields: f.dependsOnFields,
            dependsOnFormulas: f.dependsOnFormulas,
            outputUnit: f.outputUnit,
            decimalPlaces: f.decimalPlaces,
            displayFormat: f.displayFormat,
            executionOrder: f.executionOrder,
            displayInResults: f.displayInResults,
            isPrimaryResult: f.isPrimaryResult,
            resultGroup: f.resultGroup,
          })),
        },
      });

      // Update draft calculator with the response to get any new IDs
      if (response && response.fields) {
        setDraftCalculator(response);

        // Find the saved field's new ID if it changed (was temp)
        const savedField = response.fields.find(f =>
          f.displayLabel === field.displayLabel && f.fieldType === field.fieldType
        );

        const newFieldId = savedField?.id || fieldId;

        // Mark only this specific field as saved
        setSavedFieldIds(prev => new Set(prev).add(newFieldId));
        setEditingFieldIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldId);
          newSet.delete(newFieldId);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Field save failed:', err);
    } finally {
      setSavingFieldId(null);
    }
  };

  /**
   * Enable editing mode for a field
   */
  const handleEditField = (fieldId: string) => {
    setEditingFieldIds(prev => new Set(prev).add(fieldId));
    setSavedFieldIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldId);
      return newSet;
    });
  };

  /**
   * ATOMIC SAVE
   * Saves calculator + fields + formulas in ONE request
   */
  const handleSave = async () => {
    if (!currentData) return;

    try {
      await updateCalculator.mutateAsync({
        id: calculatorId,
        data: {
          name: currentData.name,
          description: currentData.description,
          calcCategory: currentData.calcCategory,
          calculatorType: currentData.calculatorType,
          isTemplate: currentData.isTemplate,
          isPublic: currentData.isPublic,
          displayConfig: currentData.displayConfig,
          // ATOMIC: All fields and formulas in one payload
          fields: currentData.fields?.map(f => ({
            fieldName: f.fieldName || f.displayLabel || '',
            displayLabel: f.displayLabel || '',
            fieldType: f.fieldType,
            dataSource: f.dataSource,
            sourceTable: f.sourceTable,
            sourceField: f.sourceField,
            lookupConfig: f.lookupConfig,
            defaultValue: f.defaultValue,
            unit: f.unit,
            minValue: f.minValue,
            maxValue: f.maxValue,
            isRequired: f.isRequired,
            validationRules: f.validationRules,
            inputConfig: f.inputConfig,
            displayOrder: f.displayOrder,
            fieldGroup: f.fieldGroup,
          })),
          formulas: currentData.formulas?.map(f => ({
            formulaName: f.formulaName || f.displayLabel || '',
            displayLabel: f.displayLabel || '',
            description: f.description,
            formulaType: f.formulaType || 'expression',
            formulaExpression: f.formulaExpression || '',
            visualFormula: f.visualFormula,
            dependsOnFields: f.dependsOnFields,
            dependsOnFormulas: f.dependsOnFormulas,
            outputUnit: f.outputUnit,
            decimalPlaces: f.decimalPlaces,
            displayFormat: f.displayFormat,
            executionOrder: f.executionOrder,
            displayInResults: f.displayInResults,
            isPrimaryResult: f.isPrimaryResult,
            resultGroup: f.resultGroup,
          })),
        },
      });

      // Clear draft state after successful save
      setDraftCalculator(null);
    } catch (err) {
      console.error('Save failed:', err);
      // Error toast is handled by the mutation hook
    }
  };

  // ============================================================================
  // RENDER STATES (Explicit Handling)
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin mx-auto border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Loading calculator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-destructive">Failed to load calculator</p>
          <Button onClick={() => router.push('/calculators')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Button>
        </div>
      </div>
    );
  }

  // DEFENSIVE: This should never happen due to React Query, but TypeScript safety
  if (!currentData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Calculator not found</p>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/calculators')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{currentData.name}</h1>
          <p className="text-muted-foreground mt-1">Configure calculator settings</p>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Configure calculator name and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Calculator Name *</Label>
                <Input
                  id="name"
                  value={currentData.name}
                  onChange={(e) => handleMetadataChange('name', e.target.value)}
                  className="bg-primary/5 border-primary/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={currentData.calcCategory || ''}
                  onValueChange={(value) => handleMetadataChange('calcCategory', value)}
                >
                  <SelectTrigger id="category" className="bg-primary/5 border-primary/10">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="costing">Costing</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="tooling">Tooling</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={currentData.description || ''}
                onChange={(e) => handleMetadataChange('description', e.target.value)}
                placeholder="Enter a brief description of what this calculator does..."
                className="bg-primary/5 border-primary/10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isTemplate"
                checked={currentData.isTemplate}
                onCheckedChange={(checked) => handleMetadataChange('isTemplate', checked)}
              />
              <Label htmlFor="isTemplate">Save as template</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
          <CardDescription>Input fields for the calculator</CardDescription>
        </CardHeader>
        <CardContent>
          {currentData.fields && currentData.fields.length > 0 ? (
            <div className="space-y-3">
              {currentData.fields.map((field, index) => {
                const isFieldSaved = savedFieldIds.has(field.id) && !editingFieldIds.has(field.id);
                const isFieldEditing = editingFieldIds.has(field.id) || !savedFieldIds.has(field.id);

                return (
                  <div
                    key={field.id || index}
                    className={cn(
                      "p-4 border rounded-lg space-y-3 transition-all",
                      isFieldSaved && "bg-success/5 border-success/20",
                      isFieldEditing && "bg-primary/5 border-primary/20"
                    )}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-end mb-2 h-6">
                      {field.fieldName && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {field.fieldName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <Input
                            placeholder="Display Label"
                            value={field.displayLabel || ''}
                            onChange={(e) => handleUpdateField(index, { displayLabel: e.target.value })}
                            disabled={isFieldSaved}
                            className={cn(isFieldSaved ? "bg-secondary/20" : "bg-primary/5 border-primary/10")}
                          />
                          <Select
                            value={field.fieldType}
                            disabled={isFieldSaved}
                            onValueChange={(value: FieldType) => {
                              // Clear type-specific fields when switching types
                              if (value !== 'database_lookup') {
                                handleUpdateField(index, {
                                  fieldType: value,
                                  dataSource: undefined,
                                  sourceTable: undefined,
                                  sourceField: undefined,
                                  lookupConfig: {}
                                });
                              } else {
                                handleUpdateField(index, {
                                  fieldType: value,
                                  dataSource: 'raw_materials', // Set default data source
                                  lookupConfig: {}
                                });
                              }
                            }}
                          >
                            <SelectTrigger className={cn(isFieldSaved ? "bg-secondary/20" : "bg-primary/5 border-primary/10")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="text">User Input</SelectItem>
                              <SelectItem value="database_lookup">Database</SelectItem>
                              <SelectItem value="calculated">Custom Formula</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Unit (optional)"
                            value={field.unit || ''}
                            onChange={(e) => handleUpdateField(index, { unit: e.target.value })}
                            disabled={isFieldSaved}
                            className={cn(isFieldSaved ? "bg-secondary/20" : "bg-primary/5 border-primary/10")}
                          />
                        </div>

                        {/* Constant Number Input for Number type */}
                        {field.fieldType === 'number' && (
                          <div className="space-y-2">
                            <Label className="text-xs">Default/Constant Value (Optional)</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 3.14159 for Pi"
                              value={field.defaultValue || ''}
                              onChange={(e) => handleUpdateField(index, { defaultValue: e.target.value })}
                              className={cn("font-mono", isFieldSaved ? "bg-secondary/20" : "bg-primary/5 border-primary/10")}
                              disabled={isFieldSaved}
                            />
                          </div>
                        )}

                        {/* User Input for Text type */}
                        {field.fieldType === 'text' && (
                          <div className="space-y-2 p-3 bg-secondary/20 border border-primary/10 rounded-md">
                            <Label className="text-xs font-semibold">User Input</Label>
                            <p className="text-[10px] text-muted-foreground">
                              This field will accept user input during process planning calculations
                            </p>
                          </div>
                        )}

                      </div>
                      <div className="flex gap-2">
                        {isFieldEditing ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveField(field.id)}
                            disabled={savingFieldId === field.id || !field.displayLabel}
                            title="Save this field"
                            className="gap-2"
                          >
                            {savingFieldId === field.id ? (
                              <>
                                <span className="h-4 w-4 animate-spin">⏳</span>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Save
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditField(field.id)}
                            title="Edit this field"
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteField(index)}
                          className="text-destructive gap-2"
                          disabled={savingFieldId === field.id}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Database Lookup Configuration */}
                    {field.fieldType === 'database_lookup' && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Data Source *</Label>
                            <Select
                              value={field.dataSource || 'raw_materials'}
                              disabled={isFieldSaved}
                              onValueChange={(value: DataSource) => {
                                // Clear selected record when changing data source
                                handleUpdateField(index, {
                                  dataSource: value,
                                  lookupConfig: {}
                                });
                              }}
                            >
                              <SelectTrigger className={cn(isFieldSaved ? "bg-secondary/20" : "bg-primary/5 border-primary/10")}>
                                <SelectValue placeholder="Select data source..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="raw_materials">Raw Materials</SelectItem>
                                <SelectItem value="mhr">Machine Hour Rate (MHR)</SelectItem>
                                <SelectItem value="lhr">Labor Hour Rate (LHR)</SelectItem>
                                <SelectItem value="processes">Processes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {field.dataSource && field.dataSource !== 'manual' && (
                          <DatabaseFieldExtractor
                            dataSource={field.dataSource}
                            selectedField={field.sourceField}
                            onFieldSelect={(selectedField) => {
                              handleUpdateField(index, {
                                sourceField: selectedField
                              });
                            }}
                            disabled={isFieldSaved}
                          />
                        )}
                      </div>
                    )}

                    {/* Custom Formula Configuration */}
                    {field.fieldType === 'calculated' && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                        <FormulaEditor
                          value={field.defaultValue || ''}
                          onChange={(value) => handleUpdateField(index, { defaultValue: value })}
                          availableFields={
                            currentData.fields
                              ?.filter((f, i) => i !== index && f.fieldType !== 'calculated' && (f.displayLabel || f.fieldName))
                              .map((f) => ({
                                id: f.id,
                                name: f.fieldName || f.displayLabel || '',
                                type: f.fieldType,
                                label: f.displayLabel || f.fieldName || '',
                              })) || []
                          }
                          disabled={isFieldSaved}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No fields yet. Add one to get started.</p>
          )}

          {/* Add Field Button - Always at bottom */}
          <div className="mt-4 pt-4 border-t">
            <Button onClick={handleAddField} variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4 border-t">
        <Button variant="outline" onClick={() => router.push(`/calculators/${calculatorId}`)}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button onClick={handleSave} disabled={updateCalculator.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateCalculator.isPending ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
