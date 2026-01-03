'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Settings, Database, Calculator, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCalculator, useUpdateCalculator, useCreateField, useCreateFormula } from '@/lib/api/hooks';
import { FieldManager } from './FieldManager';
import type { CalculatorType, CalculatorField, CalculatorFormula } from '@/lib/api/calculators';

type CalculatorBuilderProps = {
  calculatorId: string;
};

export function CalculatorBuilder({ calculatorId }: CalculatorBuilderProps) {
  const router = useRouter();
  const { data: calculator, isLoading, error } = useCalculator(calculatorId);
  const updateCalculator = useUpdateCalculator();

  // Local state for editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [calcCategory, setCalcCategory] = useState('');
  const [calculatorType, setCalculatorType] = useState<CalculatorType>('single');
  const [isTemplate, setIsTemplate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [fields, setFields] = useState<CalculatorField[]>([]);
  const [formulas, setFormulas] = useState<CalculatorFormula[]>([]);

  // Initialize form data when calculator loads
  useEffect(() => {
    if (calculator) {
      setName(calculator.name);
      setDescription(calculator.description || '');
      setCalcCategory(calculator.calcCategory || '');
      setCalculatorType(calculator.calculatorType);
      setIsTemplate(calculator.isTemplate);
      setIsPublic(calculator.isPublic);
      setFields(calculator.fields || []);
      setFormulas(calculator.formulas || []);
    }
  }, [calculator]);

  const handleSave = async () => {
    try {
      await updateCalculator.mutateAsync({
        id: calculatorId,
        data: {
          name,
          description,
          calcCategory,
          calculatorType,
          isTemplate,
          isPublic,
        },
      });
      // Note: Fields and formulas are saved automatically when added/modified
      toast.success('Calculator saved successfully');
    } catch (err) {
      toast.error('Failed to save calculator');
      console.error('Save error:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Calculator className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading calculator...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !calculator) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Failed to load calculator' : 'Calculator not found'}
          </p>
          <Button onClick={() => router.push('/calculators')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/calculators')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{calculator.name}</h1>
            <p className="text-muted-foreground mt-1">Configure calculator settings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/calculators/${calculatorId}`)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Configure calculator name and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Calculator Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Total Manufacturing Cost Calculator"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={calcCategory} onValueChange={setCalcCategory}>
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

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this calculator does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calculatorType">Calculator Type</Label>
              <Select value={calculatorType} onValueChange={(v) => setCalculatorType(v as CalculatorType)}>
                <SelectTrigger id="calculatorType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Calculation</SelectItem>
                  <SelectItem value="multi_step">Multi-Step Calculation</SelectItem>
                  <SelectItem value="dashboard">Dashboard Style</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {calculatorType === 'single' && 'One calculator = one primary result'}
                {calculatorType === 'multi_step' && 'Sequential steps where output feeds into next step'}
                {calculatorType === 'dashboard' && 'Multiple related calculations displayed together'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isTemplate"
                  checked={isTemplate}
                  onCheckedChange={setIsTemplate}
                />
                <Label htmlFor="isTemplate">Save as template</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="isPublic">Make public (shareable)</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields & Formulas */}
      <Card>
        <CardHeader>
          <CardTitle>Fields & Formulas</CardTitle>
          <CardDescription>
            Add fields, connect them to your existing databases, and build calculation formulas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldManager
            calculatorId={calculatorId}
            fields={fields}
            onFieldsChange={setFields}
            formulas={formulas}
            onFormulasChange={setFormulas}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Calculator Preview</CardTitle>
          <CardDescription>Review your calculator configuration before saving</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{name || 'Unnamed Calculator'}</h3>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {calcCategory && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {calcCategory}
                  </span>
                )}
                <span className="text-xs bg-secondary px-2 py-1 rounded">
                  {calculatorType === 'single' && 'Single Calculation'}
                  {calculatorType === 'multi_step' && 'Multi-Step'}
                  {calculatorType === 'dashboard' && 'Dashboard'}
                </span>
                {isTemplate && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Template
                  </span>
                )}
                {isPublic && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Public
                  </span>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{fields.length}</div>
                <div className="text-sm text-muted-foreground">Input Fields</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formulas.length}</div>
                <div className="text-sm text-muted-foreground">Formulas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {fields.filter(f => f.dataSource).length}
                </div>
                <div className="text-sm text-muted-foreground">DB Connected</div>
              </div>
            </div>

            {/* Fields Summary */}
            {fields.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Input Fields</h4>
                <div className="space-y-1">
                  {fields.map(field => (
                    <div key={field.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <div>
                        <span className="font-medium">{field.displayLabel}</span>
                        <span className="text-muted-foreground ml-2">({field.fieldType})</span>
                      </div>
                      {field.dataSource && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {field.dataSource}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulas Summary */}
            {formulas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Formulas</h4>
                <div className="space-y-1">
                  {formulas.map(formula => (
                    <div key={formula.id} className="p-2 bg-muted/30 rounded text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formula.displayLabel}</span>
                        {formula.isPrimaryResult && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <code className="text-xs text-muted-foreground block">
                        {formula.formulaExpression}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation */}
            {fields.length === 0 && formulas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Add fields and formulas to see the calculator preview</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
