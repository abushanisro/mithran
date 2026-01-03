'use client';

import { useState } from 'react';
import { Plus, Trash2, Code, Sparkles, Check, X } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { CalculatorFormula, CalculatorField, FormulaType, DisplayFormat } from '@/lib/api/calculators';

type FormulaBuilderProps = {
  calculatorId: string;
  fields: CalculatorField[];
  formulas: CalculatorFormula[];
  onFormulasChange: (formulas: CalculatorFormula[]) => void;
};

type FormulaFormData = {
  formulaName: string;
  displayLabel: string;
  description?: string;
  formulaType: FormulaType;
  formulaExpression: string;
  outputUnit?: string;
  decimalPlaces: number;
  displayFormat: DisplayFormat;
  displayInResults: boolean;
  isPrimaryResult: boolean;
};

const BUILT_IN_FUNCTIONS = [
  { name: 'SUM', description: 'Sum of all arguments', example: 'SUM(field1, field2, field3)' },
  { name: 'AVG', description: 'Average of all arguments', example: 'AVG(field1, field2)' },
  { name: 'MIN', description: 'Minimum value', example: 'MIN(field1, field2)' },
  { name: 'MAX', description: 'Maximum value', example: 'MAX(field1, field2)' },
  { name: 'ROUND', description: 'Round to decimal places', example: 'ROUND(field1, 2)' },
  { name: 'ABS', description: 'Absolute value', example: 'ABS(field1)' },
  { name: 'SQRT', description: 'Square root', example: 'SQRT(field1)' },
  { name: 'POW', description: 'Power', example: 'POW(field1, 2)' },
  { name: 'IF', description: 'Conditional', example: 'IF(field1 > 100, field2, field3)' },
];

export function FormulaBuilder({ calculatorId, fields, formulas, onFormulasChange }: FormulaBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editMode, setEditMode] = useState<'visual' | 'text'>('visual');
  const [formData, setFormData] = useState<FormulaFormData>({
    formulaName: '',
    displayLabel: '',
    formulaType: 'expression',
    formulaExpression: '',
    decimalPlaces: 2,
    displayFormat: 'number',
    displayInResults: true,
    isPrimaryResult: false,
  });

  const handleAddFormula = () => {
    setIsAdding(true);
    setFormData({
      formulaName: '',
      displayLabel: '',
      formulaType: 'expression',
      formulaExpression: '',
      decimalPlaces: 2,
      displayFormat: 'number',
      displayInResults: true,
      isPrimaryResult: false,
    });
  };

  const handleSaveFormula = () => {
    if (!formData.formulaName || !formData.displayLabel || !formData.formulaExpression) {
      return;
    }

    const newFormula: CalculatorFormula = {
      id: crypto.randomUUID(),
      calculatorId,
      formulaName: formData.formulaName,
      displayLabel: formData.displayLabel,
      description: formData.description,
      formulaType: formData.formulaType,
      formulaExpression: formData.formulaExpression,
      visualFormula: {},
      dependsOnFields: extractFieldDependencies(formData.formulaExpression, fields),
      dependsOnFormulas: [],
      outputUnit: formData.outputUnit,
      decimalPlaces: formData.decimalPlaces,
      displayFormat: formData.displayFormat,
      executionOrder: formulas.length + 1,
      displayInResults: formData.displayInResults,
      isPrimaryResult: formData.isPrimaryResult,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onFormulasChange([...formulas, newFormula]);
    setIsAdding(false);
  };

  const handleDeleteFormula = (formulaId: string) => {
    onFormulasChange(formulas.filter(f => f.id !== formulaId));
  };

  const insertFieldIntoFormula = (fieldName: string) => {
    setFormData({
      ...formData,
      formulaExpression: formData.formulaExpression + `{${fieldName}}`,
    });
  };

  const insertFunctionIntoFormula = (functionName: string, example: string) => {
    const placeholder = example.replace(/field\d/g, match => `{${match}}`);
    setFormData({
      ...formData,
      formulaExpression: formData.formulaExpression + placeholder,
    });
  };

  const extractFieldDependencies = (expression: string, availableFields: CalculatorField[]): string[] => {
    const fieldNames = availableFields.map(f => f.fieldName);
    const dependencies: string[] = [];

    fieldNames.forEach(fieldName => {
      if (expression.includes(`{${fieldName}}`)) {
        dependencies.push(fieldName);
      }
    });

    return dependencies;
  };

  return (
    <div className="space-y-4">
      {/* Existing Formulas */}
      <div className="space-y-2">
        {formulas.map((formula) => (
          <div
            key={formula.id}
            className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{formula.displayLabel}</h4>
                  {formula.isPrimaryResult && (
                    <Badge variant="default">Primary Result</Badge>
                  )}
                  {!formula.displayInResults && (
                    <Badge variant="outline">Hidden</Badge>
                  )}
                </div>

                {formula.description && (
                  <p className="text-sm text-muted-foreground">{formula.description}</p>
                )}

                <div className="font-mono text-sm bg-background p-2 rounded border">
                  {formula.formulaExpression}
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Type: {formula.formulaType}</span>
                  <span>Format: {formula.displayFormat}</span>
                  <span>Decimals: {formula.decimalPlaces}</span>
                  {formula.outputUnit && <span>Unit: {formula.outputUnit}</span>}
                </div>

                {formula.dependsOnFields.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Uses:</span>
                    {formula.dependsOnFields.map(field => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteFormula(formula.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Formula Form */}
      {isAdding && (
        <div className="border rounded-lg p-6 bg-background space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Add New Formula</h4>
            <Tabs value={editMode} onValueChange={(v) => setEditMode(v as 'visual' | 'text')}>
              <TabsList>
                <TabsTrigger value="visual">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="text">
                  <Code className="h-4 w-4 mr-2" />
                  Text
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formulaName">Formula Name (Code)</Label>
              <Input
                id="formulaName"
                placeholder="e.g., totalCost"
                value={formData.formulaName}
                onChange={(e) => setFormData({ ...formData, formulaName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayLabel">Display Label</Label>
              <Input
                id="displayLabel"
                placeholder="e.g., Total Manufacturing Cost"
                value={formData.displayLabel}
                onChange={(e) => setFormData({ ...formData, displayLabel: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Explain what this formula calculates..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Formula Expression Builder */}
          <div className="space-y-3">
            <Label>Formula Expression</Label>

            {editMode === 'visual' && (
              <div className="grid grid-cols-2 gap-4">
                {/* Available Fields */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Available Fields</Label>
                  <div className="border rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                    {fields.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No fields added yet</p>
                    ) : (
                      fields.map(field => (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => insertFieldIntoFormula(field.fieldName)}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-accent rounded transition-colors"
                        >
                          <div className="font-medium">{field.displayLabel}</div>
                          <div className="text-xs text-muted-foreground">{`{${field.fieldName}}`}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Built-in Functions */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Built-in Functions</Label>
                  <div className="border rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                    {BUILT_IN_FUNCTIONS.map(func => (
                      <button
                        key={func.name}
                        type="button"
                        onClick={() => insertFunctionIntoFormula(func.name, func.example)}
                        className="w-full text-left px-2 py-1 text-sm hover:bg-accent rounded transition-colors"
                      >
                        <div className="font-medium">{func.name}</div>
                        <div className="text-xs text-muted-foreground">{func.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Textarea
              placeholder="e.g., ({machineRate} * {cycleTime}) + ({materialCost} * {weight})"
              value={formData.formulaExpression}
              onChange={(e) => setFormData({ ...formData, formulaExpression: e.target.value })}
              rows={4}
              className="font-mono text-sm"
            />

            <p className="text-xs text-muted-foreground">
              Use {'{fieldName}'} to reference fields. Example: {'{machineRate}'} * {'{cycleTime}'}
            </p>
          </div>

          {/* Formula Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayFormat">Display Format</Label>
              <Select
                value={formData.displayFormat}
                onValueChange={(value: DisplayFormat) =>
                  setFormData({ ...formData, displayFormat: value })
                }
              >
                <SelectTrigger id="displayFormat">
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
              <Label htmlFor="decimalPlaces">Decimal Places</Label>
              <Input
                id="decimalPlaces"
                type="number"
                min="0"
                max="10"
                value={formData.decimalPlaces}
                onChange={(e) =>
                  setFormData({ ...formData, decimalPlaces: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outputUnit">Unit (Optional)</Label>
              <Input
                id="outputUnit"
                placeholder="e.g., USD, kg, hrs"
                value={formData.outputUnit || ''}
                onChange={(e) => setFormData({ ...formData, outputUnit: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="displayInResults"
                checked={formData.displayInResults}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, displayInResults: checked })
                }
              />
              <Label htmlFor="displayInResults">Show in results</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPrimaryResult"
                checked={formData.isPrimaryResult}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPrimaryResult: checked })
                }
              />
              <Label htmlFor="isPrimaryResult">Primary result</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveFormula}>
              <Check className="h-4 w-4 mr-2" />
              Save Formula
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Formula Button */}
      {!isAdding && (
        <Button onClick={handleAddFormula} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Formula
        </Button>
      )}
    </div>
  );
}
