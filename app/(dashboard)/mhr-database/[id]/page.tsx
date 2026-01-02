'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileDown, FileText, Printer, Edit2, Save, X } from 'lucide-react';
import { useMHRRecord, useUpdateMHR } from '@/lib/api/hooks';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { exportSingleMHRToPDF } from '@/lib/utils/exportMHRToPDF';
import { getCommodityLabel, getManufacturingProcessLabel } from '@/lib/constants/commodityPresets';
import { MHRFormDialog } from '@/components/features/mhr/MHRFormDialog';
import { EditableValue } from '@/components/ui/editable-value';
import { calculateMHR, MHRInputs, MHRCalculations } from '@/lib/utils/mhrCalculations';

export default function MHRDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableInputs, setEditableInputs] = useState<MHRInputs | null>(null);
  const [liveCalculations, setLiveCalculations] = useState<MHRCalculations | null>(null);

  const { data: record, isLoading, error, isError } = useMHRRecord(id);
  const updateMHR = useUpdateMHR();

  // Initialize editable inputs and calculations from record
  useEffect(() => {
    if (record && !editableInputs) {
      const inputs: MHRInputs = {
        shiftsPerDay: record.shiftsPerDay,
        hoursPerShift: record.hoursPerShift,
        workingDaysPerYear: record.workingDaysPerYear,
        plannedMaintenanceHoursPerYear: record.plannedMaintenanceHoursPerYear,
        capacityUtilizationRate: record.capacityUtilizationRate,
        landedMachineCost: record.landedMachineCost,
        accessoriesCostPercentage: record.accessoriesCostPercentage,
        installationCostPercentage: record.installationCostPercentage,
        paybackPeriodYears: record.paybackPeriodYears,
        interestRatePercentage: record.interestRatePercentage,
        insuranceRatePercentage: record.insuranceRatePercentage,
        maintenanceCostPercentage: record.maintenanceCostPercentage,
        machineFootprintSqm: record.machineFootprintSqm,
        rentPerSqmPerMonth: record.rentPerSqmPerMonth,
        powerKwhPerHour: record.powerKwhPerHour,
        electricityCostPerKwh: record.electricityCostPerKwh,
        adminOverheadPercentage: record.adminOverheadPercentage,
        profitMarginPercentage: record.profitMarginPercentage,
      };
      setEditableInputs(inputs);
      setLiveCalculations(record.calculations);
    }
  }, [record, editableInputs]);

  // Recalculate when inputs change
  useEffect(() => {
    if (editableInputs && isEditMode) {
      const newCalculations = calculateMHR(editableInputs);
      setLiveCalculations(newCalculations);
    }
  }, [editableInputs, isEditMode]);

  const handleInputChange = (field: keyof MHRInputs, value: number) => {
    if (!editableInputs) return;
    setEditableInputs({
      ...editableInputs,
      [field]: value,
    });
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    if (record) {
      const inputs: MHRInputs = {
        shiftsPerDay: record.shiftsPerDay,
        hoursPerShift: record.hoursPerShift,
        workingDaysPerYear: record.workingDaysPerYear,
        plannedMaintenanceHoursPerYear: record.plannedMaintenanceHoursPerYear,
        capacityUtilizationRate: record.capacityUtilizationRate,
        landedMachineCost: record.landedMachineCost,
        accessoriesCostPercentage: record.accessoriesCostPercentage,
        installationCostPercentage: record.installationCostPercentage,
        paybackPeriodYears: record.paybackPeriodYears,
        interestRatePercentage: record.interestRatePercentage,
        insuranceRatePercentage: record.insuranceRatePercentage,
        maintenanceCostPercentage: record.maintenanceCostPercentage,
        machineFootprintSqm: record.machineFootprintSqm,
        rentPerSqmPerMonth: record.rentPerSqmPerMonth,
        powerKwhPerHour: record.powerKwhPerHour,
        electricityCostPerKwh: record.electricityCostPerKwh,
        adminOverheadPercentage: record.adminOverheadPercentage,
        profitMarginPercentage: record.profitMarginPercentage,
      };
      setEditableInputs(inputs);
      setLiveCalculations(record.calculations);
    }
  };

  const handleSaveChanges = async () => {
    if (!editableInputs || !record) return;

    try {
      await updateMHR.mutateAsync({
        id,
        data: editableInputs,
      });

      console.log('MHR record updated successfully');
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to update MHR record:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!record) return;

    exportSingleMHRToPDF(record, 'Your Company Name', 'Your Company Address');
  };

  const handleExport = () => {
    if (!record) return;

    const calc = record.calculations;

    const csvContent = [
      ['MHR Report'],
      [],
      ['Basic Information'],
      ['Machine Name', record.machineName],
      ['Location', record.location],
      ['Commodity Code', getCommodityLabel(record.commodityCode)],
      ['Manufacturer', record.manufacturer || '-'],
      ['Model', record.model || '-'],
      ['Manufacturing Process', record.specification ? getManufacturingProcessLabel(record.specification) : '-'],
      [],
      ['Machine Operating Hours'],
      ['Shifts per Day', record.shiftsPerDay],
      ['Hours per Shift', record.hoursPerShift],
      ['Working Days per Year', record.workingDaysPerYear],
      ['Working Hours per Year', calc.workingHoursPerYear],
      ['Planned Maintenance Hours', record.plannedMaintenanceHoursPerYear],
      ['Available Hours per Year', calc.availableHoursPerYear],
      ['Capacity Utilization Rate (%)', record.capacityUtilizationRate],
      ['Effective Hours per Year', calc.effectiveHoursPerYear],
      [],
      ['Cost of Ownership per Hour'],
      ['Depreciation (₹/hr)', calc.depreciationPerHour],
      ['Interest (₹/hr)', calc.interestPerHour],
      ['Insurance (₹/hr)', calc.insurancePerHour],
      ['Rent (₹/hr)', calc.rentPerHour],
      ['Total Cost of Ownership (₹/hr)', calc.costOfOwnershipPerHour],
      [],
      ['Operating Costs per Hour'],
      ['Maintenance (₹/hr)', calc.maintenancePerHour],
      ['Electricity (₹/hr)', calc.electricityPerHour],
      [],
      ['Total Machine Hour Rate'],
      ['Fixed Cost (₹/hr)', calc.totalFixedCostPerHour],
      ['Variable Cost (₹/hr)', calc.totalVariableCostPerHour],
      ['Operating Cost (₹/hr)', calc.totalOperatingCostPerHour],
      ['Admin Overhead (₹/hr)', calc.adminOverheadPerHour],
      ['Profit Margin (₹/hr)', calc.profitMarginPerHour],
      ['Total MHR (₹/hr)', calc.totalMachineHourRate],
      [],
      ['Annual Breakdown'],
      ['Depreciation (₹/year)', calc.depreciationPerAnnum],
      ['Interest (₹/year)', calc.interestPerAnnum],
      ['Insurance (₹/year)', calc.insurancePerAnnum],
      ['Rent (₹/year)', calc.rentPerAnnum],
      ['Maintenance (₹/year)', calc.maintenancePerAnnum],
      ['Electricity (₹/year)', calc.electricityPerAnnum],
      ['Total Fixed Cost (₹/year)', calc.totalFixedCostPerAnnum],
      ['Total Variable Cost (₹/year)', calc.totalVariableCostPerAnnum],
      ['Total Annual Cost (₹/year)', calc.totalAnnualCost],
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mhr-report-${record.machineName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !record) {
    const errorMessage = error?.message || 'MHR record not found';
    const is404 = (error as any)?.statusCode === 404;

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ArrowLeft className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {is404 ? 'MHR Record Not Found' : 'Error Loading MHR Record'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {is404
                  ? 'This record may have been deleted or you may not have access to it.'
                  : errorMessage}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/mhr-database')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MHR Database
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calc = liveCalculations || record.calculations;
  const inputs = editableInputs || {
    shiftsPerDay: record.shiftsPerDay,
    hoursPerShift: record.hoursPerShift,
    workingDaysPerYear: record.workingDaysPerYear,
    plannedMaintenanceHoursPerYear: record.plannedMaintenanceHoursPerYear,
    capacityUtilizationRate: record.capacityUtilizationRate,
    landedMachineCost: record.landedMachineCost,
    accessoriesCostPercentage: record.accessoriesCostPercentage,
    installationCostPercentage: record.installationCostPercentage,
    paybackPeriodYears: record.paybackPeriodYears,
    interestRatePercentage: record.interestRatePercentage,
    insuranceRatePercentage: record.insuranceRatePercentage,
    maintenanceCostPercentage: record.maintenanceCostPercentage,
    machineFootprintSqm: record.machineFootprintSqm,
    rentPerSqmPerMonth: record.rentPerSqmPerMonth,
    powerKwhPerHour: record.powerKwhPerHour,
    electricityCostPerKwh: record.electricityCostPerKwh,
    adminOverheadPercentage: record.adminOverheadPercentage,
    profitMarginPercentage: record.profitMarginPercentage,
  };

  return (
    <div className="space-y-3 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/mhr-database')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title="MHR Report"
            description={`${record.machineName} - ${record.location}`}
          />
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveChanges} disabled={updateMHR.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMHR.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleEnterEditMode}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Values
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <FileDown className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">MHR Report</h1>
        <p className="text-muted-foreground">{record.machineName} - {record.location}</p>
      </div>

      {/* Input Parameters Section */}
      <Card className={isEditMode ? "border-2 border-primary print:hidden mb-3" : "print:hidden mb-3"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Input Parameters {isEditMode && <span className="text-xs font-normal text-muted-foreground ml-2">(Click values to edit)</span>}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Operational Parameters */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-primary uppercase tracking-wide">Operational Parameters</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Shifts per Day:</span>
                  <EditableValue
                    value={inputs.shiftsPerDay}
                    onChange={(val) => handleInputChange('shiftsPerDay', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatNumber}
                    className="font-medium"
                    min={0}
                    max={4}
                    step={0.5}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Hours per Shift:</span>
                  <EditableValue
                    value={inputs.hoursPerShift}
                    onChange={(val) => handleInputChange('hoursPerShift', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatNumber}
                    className="font-medium"
                    min={0}
                    max={24}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Working Days/Year:</span>
                  <EditableValue
                    value={inputs.workingDaysPerYear}
                    onChange={(val) => handleInputChange('workingDaysPerYear', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatNumber}
                    className="font-medium"
                    min={0}
                    max={365}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Maintenance Hrs/Year:</span>
                  <EditableValue
                    value={inputs.plannedMaintenanceHoursPerYear}
                    onChange={(val) => handleInputChange('plannedMaintenanceHoursPerYear', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatNumber}
                    className="font-medium"
                    min={0}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Capacity Utilization:</span>
                  <EditableValue
                    value={inputs.capacityUtilizationRate}
                    onChange={(val) => handleInputChange('capacityUtilizationRate', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>

            {/* Capital & Financial Parameters */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-primary uppercase tracking-wide">Capital & Financial</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Landed Machine Cost:</span>
                  <EditableValue
                    value={inputs.landedMachineCost}
                    onChange={(val) => handleInputChange('landedMachineCost', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatCurrency}
                    className="font-medium"
                    min={0}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Accessories %:</span>
                  <EditableValue
                    value={inputs.accessoriesCostPercentage}
                    onChange={(val) => handleInputChange('accessoriesCostPercentage', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Installation %:</span>
                  <EditableValue
                    value={inputs.installationCostPercentage}
                    onChange={(val) => handleInputChange('installationCostPercentage', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payback Period:</span>
                  <EditableValue
                    value={inputs.paybackPeriodYears}
                    onChange={(val) => handleInputChange('paybackPeriodYears', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)} years`}
                    className="font-medium"
                    min={1}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <EditableValue
                    value={inputs.interestRatePercentage}
                    onChange={(val) => handleInputChange('interestRatePercentage', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Insurance Rate:</span>
                  <EditableValue
                    value={inputs.insuranceRatePercentage}
                    onChange={(val) => handleInputChange('insuranceRatePercentage', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Maintenance %:</span>
                  <EditableValue
                    value={inputs.maintenanceCostPercentage}
                    onChange={(val) => handleInputChange('maintenanceCostPercentage', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>

            {/* Physical & Other Parameters */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-primary uppercase tracking-wide">Physical & Other</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Machine Footprint:</span>
                  <EditableValue
                    value={inputs.machineFootprintSqm}
                    onChange={(val) => handleInputChange('machineFootprintSqm', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)} m²`}
                    className="font-medium"
                    min={0}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Rent per m²/month:</span>
                  <EditableValue
                    value={inputs.rentPerSqmPerMonth}
                    onChange={(val) => handleInputChange('rentPerSqmPerMonth', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatCurrency}
                    className="font-medium"
                    min={0}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Power KWH/hr:</span>
                  <EditableValue
                    value={inputs.powerKwhPerHour}
                    onChange={(val) => handleInputChange('powerKwhPerHour', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatNumber}
                    className="font-medium"
                    min={0}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Electricity Cost/KWH:</span>
                  <EditableValue
                    value={inputs.electricityCostPerKwh}
                    onChange={(val) => handleInputChange('electricityCostPerKwh', val)}
                    isEditable={isEditMode}
                    formatDisplay={formatCurrency}
                    className="font-medium"
                    min={0}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Admin Overhead:</span>
                  <EditableValue
                    value={inputs.adminOverheadPercentage}
                    onChange={(val) => handleInputChange('adminOverheadPercentage', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Profit Margin:</span>
                  <EditableValue
                    value={inputs.profitMarginPercentage}
                    onChange={(val) => handleInputChange('profitMarginPercentage', val)}
                    isEditable={isEditMode}
                    formatDisplay={(v) => `${formatNumber(v)}%`}
                    className="font-medium"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machine & Process Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Machine Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <div>
              <div className="font-bold text-lg leading-tight">{record.machineName}</div>
            </div>
            {record.manufacturer && (
              <div className="text-sm">
                <span className="font-medium">{record.manufacturer}</span>
                {record.model && <span className="text-muted-foreground"> • {record.model}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry & Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <div className="font-semibold text-base leading-tight">{getCommodityLabel(record.commodityCode)}</div>
            {record.specification && (
              <div className="text-sm text-muted-foreground">{getManufacturingProcessLabel(record.specification)}</div>
            )}
            <div className="text-sm font-medium">{record.location}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wide">Machine Hour Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary">{formatCurrency(calc.totalMachineHourRate)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">per operating hour</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Operational & Capital */}
        <div className="space-y-3">
          {/* Machine Operating Hours */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Operating Hours Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 py-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-slate-900 px-2 py-1.5 rounded">
                  <div className="text-xs text-muted-foreground">Shifts/Day</div>
                  <div className="font-bold text-base">{formatNumber(inputs.shiftsPerDay)}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-2 py-1.5 rounded">
                  <div className="text-xs text-muted-foreground">Hours/Shift</div>
                  <div className="font-bold text-base">{formatNumber(inputs.hoursPerShift)}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Working Days/Year</span>
                  <span className="font-semibold">{formatNumber(inputs.workingDaysPerYear)}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded">
                  <span className="text-sm font-medium">Working Hours</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{formatNumber(calc.workingHoursPerYear)} hrs</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Maintenance</span>
                  <span className="font-semibold text-orange-600">-{formatNumber(inputs.plannedMaintenanceHoursPerYear)} hrs</span>
                </div>
                <div className="flex justify-between items-center bg-green-50 dark:bg-green-950 px-2 py-1 rounded">
                  <span className="text-sm font-medium">Available Hours</span>
                  <span className="font-bold text-green-700 dark:text-green-300">{formatNumber(calc.availableHoursPerYear)} hrs</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Utilization</span>
                  <span className="font-semibold">{formatNumber(inputs.capacityUtilizationRate)}%</span>
                </div>
                <div className="flex justify-between items-center bg-primary px-3 py-2 rounded-lg">
                  <span className="text-sm font-bold text-white">Effective Hours</span>
                  <span className="font-black text-lg text-white">{formatNumber(calc.effectiveHoursPerYear)} hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capital Investment */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Capital Investment Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 py-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-base">Landed Machine Cost</span>
                  <span className="font-bold text-base">{formatCurrency(inputs.landedMachineCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base">Accessories ({formatNumber(inputs.accessoriesCostPercentage)}%)</span>
                  <span className="font-bold text-base">+{formatCurrency(calc.accessoriesCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base">Installation ({formatNumber(inputs.installationCostPercentage)}%)</span>
                  <span className="font-bold text-base">+{formatCurrency(calc.installationCost)}</span>
                </div>

                <div className="flex justify-between items-center bg-primary px-3 py-2 rounded-lg mt-1">
                  <span className="text-base font-bold text-white">Total Capital Investment</span>
                  <span className="font-black text-xl text-white">{formatCurrency(calc.totalCapitalInvestment)}</span>
                </div>
              </div>

              <div className="border-t pt-1 mt-1 space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-base">Payback Period</span>
                  <span className="font-bold text-base">{formatNumber(inputs.paybackPeriodYears)} years</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base">Depreciation Rate</span>
                  <span className="font-bold text-base">{formatNumber(100 / inputs.paybackPeriodYears)}% p.a.</span>
                </div>
                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded">
                  <span className="text-base font-semibold">Annual Depreciation</span>
                  <span className="font-black text-base">{formatCurrency(calc.depreciationPerAnnum)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cost Components */}
        <div className="space-y-3">
          {/* Hourly Cost Components */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Hourly Cost Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 py-3">
              {/* Fixed Costs */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Fixed Costs</div>
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Depreciation</span>
                    <span className="font-semibold text-sm">{formatCurrency(calc.depreciationPerHour)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Interest</span>
                    <span className="font-semibold text-sm">{formatCurrency(calc.interestPerHour)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Insurance</span>
                    <span className="font-semibold text-sm">{formatCurrency(calc.insurancePerHour)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rent</span>
                    <span className="font-semibold text-sm">{formatCurrency(calc.rentPerHour)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Maintenance</span>
                    <span className="font-semibold text-sm">{formatCurrency(calc.maintenancePerHour)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950 px-2 py-1.5 rounded mt-0.5">
                    <span className="text-sm font-bold">Total Fixed</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(calc.totalFixedCostPerHour)}</span>
                  </div>
                </div>
              </div>

              {/* Variable Costs */}
              <div className="border-t pt-1 mt-1">
                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Variable Costs</div>
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Electricity</span>
                    <span className="font-semibold text-sm">{formatCurrency(calc.electricityPerHour)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-950 px-2 py-1.5 rounded">
                    <span className="text-sm font-bold">Total Variable</span>
                    <span className="font-bold text-orange-700 dark:text-orange-300">{formatCurrency(calc.totalVariableCostPerHour)}</span>
                  </div>
                </div>
              </div>

              {/* Operating Cost */}
              <div className="border-t pt-1 mt-1">
                <div className="flex justify-between items-center bg-green-600 px-3 py-2 rounded-lg">
                  <span className="text-sm font-bold text-white">Operating Cost</span>
                  <span className="font-black text-lg text-white">{formatCurrency(calc.totalOperatingCostPerHour)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final MHR Calculation */}
          <Card className="border-2 border-primary shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2 bg-primary/10">
              <CardTitle className="text-base font-bold">Final Machine Hour Rate Calculation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 py-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Operating Cost</span>
                  <span className="font-semibold">{formatCurrency(calc.totalOperatingCostPerHour)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Admin Overhead ({formatNumber(inputs.adminOverheadPercentage)}%)</span>
                  <span className="font-semibold text-purple-600">+{formatCurrency(calc.adminOverheadPerHour)}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded">
                  <span className="text-sm font-bold">Subtotal</span>
                  <span className="font-bold">{formatCurrency(calc.totalOperatingCostPerHour + calc.adminOverheadPerHour)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Profit Margin ({formatNumber(inputs.profitMarginPercentage)}%)</span>
                  <span className="font-semibold text-emerald-600">+{formatCurrency(calc.profitMarginPerHour)}</span>
                </div>

                <div className="flex justify-between items-center bg-primary px-4 py-3 rounded-lg border-2 border-primary/50 mt-1">
                  <span className="text-base font-black text-white">MHR per Hour</span>
                  <span className="text-3xl font-black text-white">{formatCurrency(calc.totalMachineHourRate)}</span>
                </div>
              </div>

              {/* Annual Projection */}
              <div className="border-t pt-1 mt-1">
                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Annual Projection</div>
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Effective Hours/Year</span>
                    <span className="font-semibold">{formatNumber(calc.effectiveHoursPerYear)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/20 px-3 py-2 rounded-lg">
                    <span className="text-sm font-bold">Annual Revenue Potential</span>
                    <span className="font-black text-lg text-primary">{formatCurrency(calc.totalMachineHourRate * calc.effectiveHoursPerYear)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Annual Cost Analysis - Full Width */}
      <Card className="mt-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Annual Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fixed Costs */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Annual Fixed Costs</div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Depreciation</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.depreciationPerAnnum)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Interest</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.interestPerAnnum)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Insurance</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.insurancePerAnnum)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Rent</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.rentPerAnnum)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Maintenance</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.maintenancePerAnnum)}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950 px-2 py-1.5 rounded mt-0.5">
                <span className="text-sm font-bold">Total Fixed</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(calc.totalFixedCostPerAnnum)}</span>
              </div>
            </div>

            {/* Variable Costs */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Annual Variable Costs</div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Electricity</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.electricityPerAnnum)}</span>
              </div>
              <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-950 px-2 py-1.5 rounded">
                <span className="text-sm font-bold">Total Variable</span>
                <span className="font-bold text-orange-700 dark:text-orange-300">{formatCurrency(calc.totalVariableCostPerAnnum)}</span>
              </div>
            </div>

            {/* Total Annual Cost */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Total Annual Impact</div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Operating Cost</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.totalAnnualCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Admin Overhead</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.adminOverheadPerHour * calc.effectiveHoursPerYear)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Profit Margin</span>
                <span className="font-semibold text-sm">{formatCurrency(calc.profitMarginPerHour * calc.effectiveHoursPerYear)}</span>
              </div>
              <div className="flex justify-between items-center bg-primary px-3 py-2 rounded-lg mt-0.5">
                <span className="text-sm font-bold text-white">Total Annual Value</span>
                <span className="font-black text-lg text-white">{formatCurrency((calc.totalMachineHourRate * calc.effectiveHoursPerYear))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <MHRFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        editingId={id}
      />
    </div>
  );
}
