'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, ArrowLeft, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCalculator, useExecuteCalculator } from '@/lib/api/hooks';

type CalculatorExecutorProps = {
  calculatorId: string;
};

type FieldValues = Record<string, string | number | null>;

export function CalculatorExecutor({ calculatorId }: CalculatorExecutorProps) {
  const router = useRouter();
  const { data: calculator, isLoading, error } = useCalculator(calculatorId);
  const executeCalculatorMutation = useExecuteCalculator();

  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [results, setResults] = useState<Record<string, any> | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Initialize field values when calculator loads
  useEffect(() => {
    if (calculator?.fields) {
      const initialValues: FieldValues = {};
      calculator.fields.forEach((field) => {
        initialValues[field.fieldName] = field.defaultValue ?? null;
      });
      setFieldValues(initialValues);
    }
  }, [calculator]);

  const handleExecute = async () => {
    if (!calculator) return;

    // Clear previous errors
    setExecutionError(null);

    try {
      const result = await executeCalculatorMutation.mutateAsync({
        calculatorId,
        inputValues: fieldValues,
      });

      if (result.success) {
        setResults(result.results);
        toast.success(`Calculation complete in ${result.durationMs}ms`);
      } else {
        const errorMsg = result.error || 'Failed to execute calculator';
        setExecutionError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to execute calculator';
      setExecutionError(errorMsg);
      toast.error(errorMsg);
      console.error('Execution error:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Calculator className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground font-medium">Loading calculator...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !calculator) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <div>
            <p className="text-lg font-semibold text-destructive mb-2">
              {error ? 'Failed to load calculator' : 'Calculator not found'}
            </p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'The calculator you requested could not be found.'}
            </p>
          </div>
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
            {calculator.description && (
              <p className="text-muted-foreground mt-1">{calculator.description}</p>
            )}
          </div>
        </div>
        <Button onClick={handleExecute} disabled={executeCalculatorMutation.isPending}>
          <Play className="h-4 w-4 mr-2" />
          {executeCalculatorMutation.isPending ? 'Calculating...' : 'Calculate'}
        </Button>
      </div>

      {/* Execution Error Alert */}
      {executionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Execution Failed</AlertTitle>
          <AlertDescription>{executionError}</AlertDescription>
        </Alert>
      )}

      {/* Input Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Input Values</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {calculator.fields?.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.fieldName}>
                {field.displayLabel || field.fieldName}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={field.fieldName}
                type={field.fieldType === 'number' ? 'number' : 'text'}
                value={fieldValues[field.fieldName]?.toString() || ''}
                onChange={(e) =>
                  setFieldValues((prev) => ({
                    ...prev,
                    [field.fieldName]: field.fieldType === 'number' ? parseFloat(e.target.value) : e.target.value,
                  }))
                }
                placeholder={field.displayLabel}
              />
              {field.unit && (
                <p className="text-xs text-muted-foreground">Unit: {field.unit}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                  <span className="font-medium">{key}:</span>
                  <span className="text-lg font-bold">
                    {typeof value === 'object' ? value.value : value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
