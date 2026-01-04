'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCalculator, useUpdateCalculator } from '@/lib/api/hooks';
import type { Calculator, CalculatorField, CalculatorFormula, FieldType, DataSource } from '@/lib/api/calculators';
import { DatabaseRecordPicker } from './DatabaseRecordPicker';
import { FormulaEditor } from './FormulaEditor';
import { DatabaseFieldExtractor } from './DatabaseFieldExtractor';

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

  // Determine which data to use (draft or fetched)
  const currentData = draftCalculator || calculator;

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
    const defaultFieldName = `field${fieldCount + 1}`;

    const newField: Partial<CalculatorField> = {
      id: `temp-${Date.now()}`, // Temporary ID, will be replaced by backend
      fieldName: defaultFieldName, // Auto-generate field name
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
  };

  const handleUpdateField = (index: number, updates: Partial<CalculatorField>) => {
    if (!currentData || !currentData.fields) return;

    const updatedFields = [...currentData.fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };

    setDraftCalculator({
      ...currentData,
      fields: updatedFields,
    });
  };

  const handleDeleteField = (index: number) => {
    if (!currentData || !currentData.fields) return;

    setDraftCalculator({
      ...currentData,
      fields: currentData.fields.filter((_, i) => i !== index),
    });
  };

  const handleAddFormula = () => {
    if (!currentData) return;

    const newFormula: Partial<CalculatorFormula> = {
      id: `temp-${Date.now()}`,
      formulaName: '',
      displayLabel: '',
      formulaExpression: '',
      executionOrder: currentData.formulas?.length || 0,
      displayInResults: true,
      isPrimaryResult: false,
      decimalPlaces: 2,
      displayFormat: 'number',
    };

    setDraftCalculator({
      ...currentData,
      formulas: [...(currentData.formulas || []), newFormula as CalculatorFormula],
    });
  };

  const handleUpdateFormula = (index: number, updates: Partial<CalculatorFormula>) => {
    if (!currentData || !currentData.formulas) return;

    const updatedFormulas = [...currentData.formulas];

    // Auto-generate formulaName from displayLabel if displayLabel is being updated
    if (updates.displayLabel !== undefined) {
      updates.formulaName = updates.displayLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    updatedFormulas[index] = { ...updatedFormulas[index], ...updates };

    setDraftCalculator({
      ...currentData,
      formulas: updatedFormulas,
    });
  };

  const handleDeleteFormula = (index: number) => {
    if (!currentData || !currentData.formulas) return;

    setDraftCalculator({
      ...currentData,
      formulas: currentData.formulas.filter((_, i) => i !== index),
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={currentData.calcCategory || ''}
                  onValueChange={(value) => handleMetadataChange('calcCategory', value)}
                >
                  <SelectTrigger id="category">
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
              {currentData.fields.map((field, index) => (
                <div key={field.id || index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          placeholder="Display Label"
                          value={field.displayLabel || ''}
                          onChange={(e) => handleUpdateField(index, { displayLabel: e.target.value })}
                        />
                        <Select
                          value={field.fieldType}
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="database_lookup">Database</SelectItem>
                            <SelectItem value="calculated">Custom Formula</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Unit (optional)"
                          value={field.unit || ''}
                          onChange={(e) => handleUpdateField(index, { unit: e.target.value })}
                        />
                      </div>

                      {/* Field Name for Formulas */}
                      <div className="flex items-center gap-2 text-xs">
                        <Label className="text-muted-foreground shrink-0">Formula ID:</Label>
                        <code className="bg-muted px-2 py-1 rounded font-mono">{`{${field.fieldName}}`}</code>
                        <span className="text-muted-foreground">← Use this in formulas</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteField(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Database Lookup Configuration */}
                  {field.fieldType === 'database_lookup' && (
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Data Source *</Label>
                          <Select
                            value={field.dataSource || 'raw_materials'}
                            onValueChange={(value: DataSource) => {
                              // Clear selected record when changing data source
                              handleUpdateField(index, {
                                dataSource: value,
                                lookupConfig: {}
                              });
                            }}
                          >
                            <SelectTrigger>
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
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs">Select Record</Label>
                            <DatabaseRecordPicker
                              dataSource={field.dataSource}
                              value={field.lookupConfig?.recordId}
                              onSelect={(record) => {
                                handleUpdateField(index, {
                                  lookupConfig: {
                                    ...field.lookupConfig,
                                    recordId: record?.id || undefined,
                                    displayLabel: record?.displayLabel || undefined,
                                  }
                                });
                              }}
                              placeholder={`Select from ${field.dataSource.replace('_', ' ')}...`}
                            />
                          </div>

                          <DatabaseFieldExtractor
                            dataSource={field.dataSource}
                            recordId={field.lookupConfig?.recordId}
                            selectedField={field.sourceField}
                            onFieldSelect={(selectedField) => {
                              handleUpdateField(index, {
                                sourceField: selectedField
                              });
                            }}
                          />
                        </>
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
                            ?.filter((f, i) => i !== index && f.fieldType !== 'calculated')
                            .map((f) => ({
                              name: f.fieldName || f.displayLabel || '',
                              type: f.fieldType,
                            })) || []
                        }
                        availableFormulas={
                          currentData.formulas?.map((f) => ({
                            name: f.formulaName || f.displayLabel || '',
                          })) || []
                        }
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Decimal Places</Label>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={field.inputConfig?.decimalPlaces || 2}
                            onChange={(e) => handleUpdateField(index, {
                              inputConfig: {
                                ...field.inputConfig,
                                decimalPlaces: parseInt(e.target.value) || 2
                              }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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

      {/* Formulas (Results) */}
      <Card>
        <CardHeader>
          <CardTitle>Formulas (Results)</CardTitle>
          <CardDescription>Define what to calculate and display as results</CardDescription>
        </CardHeader>
        <CardContent>
          {currentData.formulas && currentData.formulas.length > 0 ? (
            <div className="space-y-3">
              {currentData.formulas.map((formula, index) => (
                <div key={formula.id || index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Display Label (e.g., Shot Weight)"
                          value={formula.displayLabel || ''}
                          onChange={(e) => handleUpdateFormula(index, { displayLabel: e.target.value })}
                        />
                        <Input
                          placeholder="Unit (e.g., grams)"
                          value={formula.outputUnit || ''}
                          onChange={(e) => handleUpdateFormula(index, { outputUnit: e.target.value })}
                        />
                      </div>

                      {/* Formula Name for Reference */}
                      <div className="flex items-center gap-2 text-xs">
                        <Label className="text-muted-foreground shrink-0">Formula ID:</Label>
                        <code className="bg-muted px-2 py-1 rounded font-mono">{`{${formula.formulaName}}`}</code>
                        <span className="text-muted-foreground">← Use in other formulas</span>
                      </div>

                      {/* Formula Expression Editor */}
                      <div className="space-y-2">
                        <Label className="text-xs">Formula Expression</Label>
                        <FormulaEditor
                          value={formula.formulaExpression || ''}
                          onChange={(value) => handleUpdateFormula(index, { formulaExpression: value })}
                          availableFields={
                            currentData.fields
                              ?.filter((f) => f.fieldType !== 'calculated')
                              .map((f) => ({
                                name: f.fieldName || f.displayLabel || '',
                                type: f.fieldType,
                              })) || []
                          }
                          availableFormulas={
                            currentData.formulas
                              ?.filter((_, i) => i !== index)
                              .map((f) => ({
                                name: f.formulaName || f.displayLabel || '',
                              })) || []
                          }
                        />
                      </div>

                      {/* Display Options */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Decimal Places</Label>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={formula.decimalPlaces || 2}
                            onChange={(e) => handleUpdateFormula(index, {
                              decimalPlaces: parseInt(e.target.value) || 2
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Display Format</Label>
                          <Select
                            value={formula.displayFormat || 'number'}
                            onValueChange={(value: any) => handleUpdateFormula(index, { displayFormat: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Execution Order</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formula.executionOrder || 0}
                            onChange={(e) => handleUpdateFormula(index, {
                              executionOrder: parseInt(e.target.value) || 0
                            })}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFormula(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No formulas yet. Add one to calculate results.</p>
          )}

          {/* Add Formula Button - Always at bottom */}
          <div className="mt-4 pt-4 border-t">
            <Button onClick={handleAddFormula} variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Formula
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
