'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Edit2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCalculators, useCreateCalculator, useDeleteCalculator, useUpdateCalculator } from '@/lib/api/hooks';


export default function CalculatorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    calcCategory: '',
    isTemplate: false,
    isPublic: false,
  });

  const { data, isLoading } = useCalculators({
    search: searchQuery || undefined,
  });

  const createCalculatorMutation = useCreateCalculator();
  const deleteCalculatorMutation = useDeleteCalculator();
  const updateCalculatorMutation = useUpdateCalculator();

  const handleCreateCalculator = async () => {
    try {
      const newCalc = await createCalculatorMutation.mutateAsync({
        name: 'New Calculator',
        description: 'Enter description...',
        calculatorType: 'single',
      });
      router.push(`/calculators/builder/${newCalc.id}`);
    } catch (error) {
      console.error('Failed to create calculator:', error);
    }
  };

  const handleDeleteCalculator = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${name}"?`)) {
      try {
        await deleteCalculatorMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete calculator:', error);
      }
    }
  };

  const handleEditClick = (calc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(calc.id);
    setEditForm({
      name: calc.name,
      description: calc.description || '',
      calcCategory: calc.calcCategory || '',
      isTemplate: calc.isTemplate || false,
      isPublic: calc.isPublic || false,
    });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateCalculatorMutation.mutateAsync({
        id,
        data: editForm,
      });
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update calculator:', error);
    }
  };

  const calculators = data?.calculators || [];

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold">Calculators</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {calculators.length} {calculators.length === 1 ? 'calculator' : 'calculators'}
          </p>
        </div>
        <Button
          onClick={handleCreateCalculator}
          disabled={createCalculatorMutation.isPending}
          variant="default"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>


      {/* Calculator List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : calculators.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No calculators found' : 'No calculators'}
            </p>
            {!searchQuery && (
              <Button
                onClick={handleCreateCalculator}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Calculator
              </Button>
            )}
          </div>
        ) : (
          calculators.map((calc) => {
            const isEditing = editingId === calc.id;

            return (
              <Card
                key={calc.id}
                className="border"
              >
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Header with Actions */}
                    <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="h-8 text-sm font-medium"
                              placeholder="Calculator name"
                            />
                          </div>
                        ) : (
                          <h3 className="font-medium text-base">{calc.name}</h3>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 px-3 text-xs"
                              onClick={(e) => handleSaveEdit(calc.id, e)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => handleEditClick(calc, e)}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => handleDeleteCalculator(calc.id, calc.name, e)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase">Basic Information</h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          {isEditing ? (
                            <Select
                              value={editForm.calcCategory}
                              onValueChange={(value) => setEditForm({ ...editForm, calcCategory: value })}
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="costing">Costing</SelectItem>
                                <SelectItem value="material">Material</SelectItem>
                                <SelectItem value="process">Process</SelectItem>
                                <SelectItem value="tooling">Tooling</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-sm mt-1">
                              {calc.calcCategory ? (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {calc.calcCategory}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Options</Label>
                          {isEditing ? (
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={editForm.isTemplate}
                                  onCheckedChange={(checked) => setEditForm({ ...editForm, isTemplate: checked })}
                                  id={`template-${calc.id}`}
                                  className="scale-75"
                                />
                                <Label htmlFor={`template-${calc.id}`} className="text-xs">Template</Label>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-1">
                              {calc.isTemplate && (
                                <Badge variant="outline" className="text-xs bg-amber-400/10 text-amber-400 border-amber-400/20">
                                  Template
                                </Badge>
                              )}
                              {!calc.isTemplate && (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fields & Formulas */}
                    <div className="border-t border-border pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase">Configuration</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/calculators/builder/${calc.id}`);
                          }}
                        >
                          Edit Builder
                        </Button>
                      </div>

                      {/* Fields */}
                      {calc.fields && calc.fields.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {calc.fields.length} Field{calc.fields.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {calc.fields.map((field: any, idx: number) => (
                              <div key={field.id || idx} className="pl-3 border-l-2 border-primary/20 py-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium">{field.displayLabel || field.fieldName || 'Unnamed Field'}</span>
                                      <Badge variant="outline" className="text-[10px] capitalize">
                                        {field.fieldType === 'database_lookup' ? 'Database' :
                                         field.fieldType === 'calculated' ? 'Formula' :
                                         field.fieldType}
                                      </Badge>
                                      {field.unit && (
                                        <span className="text-[10px] text-muted-foreground">({field.unit})</span>
                                      )}
                                    </div>

                                    {/* Database Lookup Details */}
                                    {field.fieldType === 'database_lookup' && field.dataSource && (
                                      <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                                        <div className="flex items-center gap-1">
                                          <span className="font-medium">Source:</span>
                                          <span className="capitalize">{field.dataSource.replace('_', ' ')}</span>
                                        </div>
                                        {field.lookupConfig?.displayLabel && (
                                          <div className="flex items-center gap-1">
                                            <span className="font-medium">Record:</span>
                                            <span>{field.lookupConfig.displayLabel}</span>
                                          </div>
                                        )}
                                        {field.sourceField && (
                                          <div className="flex items-center gap-1">
                                            <span className="font-medium">Field:</span>
                                            <code className="px-1 bg-muted rounded">{field.sourceField}</code>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Custom Formula Details */}
                                    {field.fieldType === 'calculated' && field.defaultValue && (
                                      <div className="mt-1">
                                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-primary">
                                          {field.defaultValue}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground py-2">
                          No fields configured
                        </div>
                      )}

                      {/* Formulas */}
                      {calc.formulas && calc.formulas.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {calc.formulas.length} Formula{calc.formulas.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {calc.formulas.map((formula: any, idx: number) => (
                              <div key={formula.id || idx} className="pl-3 border-l-2 border-emerald-500/20 py-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium">{formula.displayLabel || formula.formulaName || 'Unnamed Formula'}</span>
                                      {formula.isPrimaryResult && (
                                        <Badge variant="default" className="text-[10px]">Primary</Badge>
                                      )}
                                      {formula.outputUnit && (
                                        <span className="text-[10px] text-muted-foreground">({formula.outputUnit})</span>
                                      )}
                                    </div>
                                    {formula.formulaExpression && (
                                      <div className="mt-1">
                                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400">
                                          {formula.formulaExpression}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>


                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
