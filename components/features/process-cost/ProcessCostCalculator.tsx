"use client";

/**
 * Process Cost Calculator Component
 *
 * Real-time process cost calculation with detailed breakdown
 * Follows manufacturing cost engineering best practices
 *
 * @author Manufacturing Cost Engineering Team
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  calculateProcessCost,
  validateProcessCostInput,
  formatCurrency,
  formatPercentage,
  type ProcessCostInput,
  type ProcessCostResult,
} from '@/lib/utils/processCostCalculations';
import { AlertCircle, Calculator, Info } from 'lucide-react';

interface ProcessCostCalculatorProps {
  initialValues?: Partial<ProcessCostInput>;
  onCalculate?: (result: ProcessCostResult) => void;
  readOnly?: boolean;
}

export function ProcessCostCalculator({
  initialValues,
  onCalculate,
  readOnly = false,
}: ProcessCostCalculatorProps) {
  // Form state
  const [formData, setFormData] = useState<ProcessCostInput>({
    directRate: initialValues?.directRate ?? 102,
    indirectRate: initialValues?.indirectRate ?? 0,
    fringeRate: initialValues?.fringeRate ?? 0,
    machineRate: initialValues?.machineRate ?? 80,
    machineValue: initialValues?.machineValue ?? 0,
    currency: initialValues?.currency ?? 'INR',
    setupManning: initialValues?.setupManning ?? 1,
    setupTime: initialValues?.setupTime ?? 120,
    batchSize: initialValues?.batchSize ?? 12500,
    heads: initialValues?.heads ?? 1,
    cycleTime: initialValues?.cycleTime ?? 80,
    partsPerCycle: initialValues?.partsPerCycle ?? 1,
    scrap: initialValues?.scrap ?? 2,
  });

  // Calculation result
  const [result, setResult] = useState<ProcessCostResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate whenever form data changes
  useEffect(() => {
    const validationErrors = validateProcessCostInput(formData);
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      try {
        const calculationResult = calculateProcessCost(formData);
        setResult(calculationResult);
        onCalculate?.(calculationResult);
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Calculation error']);
        setResult(null);
      }
    } else {
      setResult(null);
    }
  }, [formData, onCalculate]);

  // Handle input change
  const handleChange = (field: keyof ProcessCostInput, value: number | string) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' && field !== 'currency' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Process Cost Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Facility Rates Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Facility Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="directRate">Direct Rate (currency/hour) *</Label>
                <Input
                  id="directRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.directRate}
                  onChange={(e) => handleChange('directRate', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="indirectRate">Indirect Rate (currency/hour)</Label>
                <Input
                  id="indirectRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.indirectRate}
                  onChange={(e) => handleChange('indirectRate', e.target.value)}
                  readOnly={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fringeRate">Fringe Rate (currency/hour)</Label>
                <Input
                  id="fringeRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fringeRate}
                  onChange={(e) => handleChange('fringeRate', e.target.value)}
                  readOnly={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="machineRate">Machine Rate (currency/hour)</Label>
                <Input
                  id="machineRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.machineRate}
                  onChange={(e) => handleChange('machineRate', e.target.value)}
                  readOnly={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="machineValue">Machine Value (currency)</Label>
                <Input
                  id="machineValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.machineValue}
                  onChange={(e) => handleChange('machineValue', e.target.value)}
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>

          {/* Setup Parameters Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Setup Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="setupManning">Setup Manning *</Label>
                <Input
                  id="setupManning"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.setupManning}
                  onChange={(e) => handleChange('setupManning', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setupTime">Setup Time (minutes) *</Label>
                <Input
                  id="setupTime"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.setupTime}
                  onChange={(e) => handleChange('setupTime', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>
            </div>
          </div>

          {/* Production Parameters Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Production Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch Size *</Label>
                <Input
                  id="batchSize"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.batchSize}
                  onChange={(e) => handleChange('batchSize', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heads">Heads (Operators/Stations) *</Label>
                <Input
                  id="heads"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.heads}
                  onChange={(e) => handleChange('heads', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cycleTime">Cycle Time (seconds) *</Label>
                <Input
                  id="cycleTime"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.cycleTime}
                  onChange={(e) => handleChange('cycleTime', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partsPerCycle">Parts Per Cycle *</Label>
                <Input
                  id="partsPerCycle"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.partsPerCycle}
                  onChange={(e) => handleChange('partsPerCycle', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>
            </div>
          </div>

          {/* Quality Parameters Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Quality Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scrap">Scrap % *</Label>
                <Input
                  id="scrap"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99.99"
                  value={formData.scrap}
                  onChange={(e) => handleChange('scrap', e.target.value)}
                  readOnly={readOnly}
                  required
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Result */}
      {result && (
        <Card className="border-2 border-primary">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-2xl">
              Total Cost Per Part: {formatCurrency(result.totalCostPerPart, formData.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Quick Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Setup Cost/Part</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(result.setupCostPerPart, formData.currency)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cycle Cost/Part</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(result.totalCycleCostPerPart, formData.currency)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Scrap Adjustment</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(result.scrapAdjustment, formData.currency)}
                </p>
              </div>
            </div>

            {/* Batch Economics */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold mb-2">Batch Economics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Batch Size</p>
                  <p className="text-lg font-semibold">{result.batchSize.toLocaleString()} parts</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Batch Cost</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(result.totalBatchCost, formData.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Toggle Detailed Breakdown */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full"
              >
                <Info className="h-4 w-4 mr-2" />
                {showBreakdown ? 'Hide' : 'Show'} Detailed Breakdown
              </Button>
            </div>

            {/* Detailed Breakdown */}
            {showBreakdown && (
              <div className="space-y-6 border-t pt-4">
                {/* Setup Cost Breakdown */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Setup Cost Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup Time:</span>
                      <span className="font-medium">{result.setupTimeHours.toFixed(4)} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup Labor Cost:</span>
                      <span className="font-medium">{formatCurrency(result.setupLaborCost, formData.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup Overhead Cost:</span>
                      <span className="font-medium">{formatCurrency(result.setupOverheadCost, formData.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup Machine Cost:</span>
                      <span className="font-medium">{formatCurrency(result.setupMachineCost, formData.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Total Setup Cost:</span>
                      <span className="font-semibold">{formatCurrency(result.totalSetupCost, formData.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Cycle Cost Breakdown */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Cycle Cost Breakdown (Per Part)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cycle Time/Part:</span>
                      <span className="font-medium">{result.cycleTimePerPartSeconds.toFixed(4)} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cycle Labor Cost:</span>
                      <span className="font-medium">{formatCurrency(result.cycleLaborCostPerPart, formData.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cycle Overhead Cost:</span>
                      <span className="font-medium">{formatCurrency(result.cycleOverheadCostPerPart, formData.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cycle Machine Cost:</span>
                      <span className="font-medium">{formatCurrency(result.cycleMachineCostPerPart, formData.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Efficiency Metrics */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Efficiency Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup Time %:</span>
                      <span className="font-medium">{formatPercentage(result.setupTimePercentage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cycle Time %:</span>
                      <span className="font-medium">{formatPercentage(result.cycleTimePercentage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scrap Cost %:</span>
                      <span className="font-medium">{formatPercentage(result.scrapCostPercentage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labor Cost %:</span>
                      <span className="font-medium">{formatPercentage(result.laborCostPercentage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Machine Cost %:</span>
                      <span className="font-medium">{formatPercentage(result.machineCostPercentage)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
