'use client';

import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, TrendingUp, Users } from 'lucide-react';
import { useLSR, useCreateLSR, useUpdateLSR, useDeleteLSR, useLSRStatistics } from '@/lib/api/hooks';
import { CreateLSRDto, LSREntry } from '@/lib/api/lsr';

export default function LSRDatabasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<LSREntry | null>(null);

  // Working Hours Configuration - User Input Required
  // No defaults - user must enter their actual values
  // Examples shown as placeholders: 281 days, 2 shifts, 9 hours = 5,058 hours/year
  const [workingConfig, setWorkingConfig] = useState({
    workingDaysPerYear: 0,
    shiftsPerDay: 0,
    hoursPerShift: 0,
  });

  // Real-time calculation of total working hours per year
  const workingHoursPerYear = React.useMemo(
    () =>
      workingConfig.workingDaysPerYear *
      workingConfig.shiftsPerDay *
      workingConfig.hoursPerShift,
    [workingConfig.workingDaysPerYear, workingConfig.shiftsPerDay, workingConfig.hoursPerShift]
  );

  const { data: lsrEntries = [], isLoading, error: lsrError } = useLSR(searchQuery);
  const { data: statistics, error: statsError } = useLSRStatistics();
  const createMutation = useCreateLSR();
  const updateMutation = useUpdateLSR();
  const deleteMutation = useDeleteLSR();

  // Load draft from localStorage on mount
  const loadDraft = () => {
    if (typeof window === 'undefined') return null;
    try {
      const draft = localStorage.getItem('lsr-form-draft');
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  };

  const [formData, setFormData] = useState<CreateLSRDto & {
    minimumWagePerDay: number | '';
    minimumWagePerMonth: number | '';
    dearnessAllowance: number | '';
    perksPercentage: number | '';
    lhr: number | '';
  }>(() => loadDraft() || {
    labourCode: '',
    labourType: '',
    description: '',
    minimumWagePerDay: '',
    minimumWagePerMonth: '',
    dearnessAllowance: '',
    perksPercentage: '',
    lhr: '',
    location: '',
  });

  // Check if labour code already exists (for real-time validation)
  const isDuplicateLabourCode = React.useMemo(() => {
    const trimmedCode = formData.labourCode.trim();
    if (!trimmedCode) return false;

    return lsrEntries.some(entry => {
      // For edit mode, exclude the current entry being edited
      if (editingEntry && entry.id === editingEntry.id) return false;
      return entry.labourCode.toLowerCase() === trimmedCode.toLowerCase();
    });
  }, [formData.labourCode, lsrEntries, editingEntry]);

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lsr-form-draft', JSON.stringify(formData));
    }
  }, [formData]);

  const handleInputChange = (field: keyof CreateLSRDto, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle number inputs - allows empty strings
  const handleNumberChange = (field: keyof CreateLSRDto, value: string) => {
    if (value === '') {
      setFormData(prev => ({ ...prev, [field]: '' }));
    } else {
      const numValue = parseFloat(value);
      setFormData(prev => ({ ...prev, [field]: isNaN(numValue) ? '' : numValue }));
    }
  };

  // Standard conversion: 30 days/month (industry standard for wage calculation)
  // Note: This is different from working days - it's the legal/standard wage conversion factor
  const daysPerMonthForWage = 30;

  // Handle daily wage change - auto-calculate monthly wage
  const handleDailyWageChange = (value: string) => {
    if (value === '') {
      setFormData(prev => ({ ...prev, minimumWagePerDay: '', minimumWagePerMonth: '' }));
    } else {
      const dailyWage = parseFloat(value);
      if (!isNaN(dailyWage)) {
        const monthlyWage = dailyWage * daysPerMonthForWage;
        setFormData(prev => ({
          ...prev,
          minimumWagePerDay: dailyWage,
          minimumWagePerMonth: parseFloat(monthlyWage.toFixed(2))
        }));
      }
    }
  };

  // Handle monthly wage change - auto-calculate daily wage
  const handleMonthlyWageChange = (value: string) => {
    if (value === '') {
      setFormData(prev => ({ ...prev, minimumWagePerMonth: '', minimumWagePerDay: '' }));
    } else {
      const monthlyWage = parseFloat(value);
      if (!isNaN(monthlyWage)) {
        const dailyWage = monthlyWage / daysPerMonthForWage;
        setFormData(prev => ({
          ...prev,
          minimumWagePerMonth: monthlyWage,
          minimumWagePerDay: parseFloat(dailyWage.toFixed(2))
        }));
      }
    }
  };

  /**
   * LHR Calculation - Exact Excel Formula Match
   *
   * Excel: =+(F39+G39+((F39+G39)*H39))*12/$B$5
   *
   * Where:
   * - F39 = Monthly Base Wage (minimumWagePerMonth)
   * - G39 = Dearness Allowance (dearnessAllowance)
   * - H39 = Perks Percentage as decimal (perksPercentage / 100)
   * - B5 = Working Hours Per Year (user-configured)
   *
   * Expanded: (Base + DA + ((Base + DA) * Perks)) * 12 / Hours
   * Simplified: (Base + DA) * (1 + Perks) * 12 / Hours
   */
  const calculatedLHR = useMemo(() => {
    const monthlyWage = typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0;
    const da = typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0;
    const perks = typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0;

    // Require working hours to be configured
    if (workingHoursPerYear === 0 || (monthlyWage === 0 && da === 0)) {
      return 0;
    }

    // Excel formula: (F39+G39+((F39+G39)*H39))*12/B5
    const baseAndDA = monthlyWage + da;
    const perksAsDecimal = perks / 100; // Convert user input (30) to decimal (0.30)
    const totalWithPerks = baseAndDA + (baseAndDA * perksAsDecimal); // = baseAndDA * (1 + perksAsDecimal)
    const annualCost = totalWithPerks * 12;
    const lhr = annualCost / workingHoursPerYear;

    return parseFloat(lhr.toFixed(2));
  }, [
    formData.minimumWagePerMonth,
    formData.dearnessAllowance,
    formData.perksPercentage,
    workingHoursPerYear,
  ]);

  // Sync calculated LHR to form data in real-time
  useEffect(() => {
    setFormData(prev => {
      if (prev.lhr !== calculatedLHR) {
        return { ...prev, lhr: calculatedLHR };
      }
      return prev;
    });
  }, [calculatedLHR]);

  const resetForm = () => {
    const emptyForm = {
      labourCode: '',
      labourType: '',
      description: '',
      minimumWagePerDay: '',
      minimumWagePerMonth: '',
      dearnessAllowance: '',
      perksPercentage: '',
      lhr: '',
      location: '',
    };
    setFormData(emptyForm);
    // Clear localStorage draft
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lsr-form-draft');
    }
  };

  const handleCreate = async () => {
    // Validate labour code doesn't already exist
    const trimmedLabourCode = formData.labourCode.trim();
    const existingEntry = lsrEntries.find(
      entry => entry.labourCode.toLowerCase() === trimmedLabourCode.toLowerCase()
    );

    if (existingEntry) {
      toast.error(`Labour code "${trimmedLabourCode}" already exists`, {
        description: 'Please use a different labour code or edit the existing entry.',
        duration: 5000,
      });
      return;
    }

    // Validate required fields
    if (!trimmedLabourCode || !formData.labourType || !formData.description) {
      toast.error('Please fill in all required fields', {
        description: 'Labour code, type, and description are required.',
        duration: 4000,
      });
      return;
    }

    // Convert empty strings to 0 before submitting
    const submitData = {
      ...formData,
      labourCode: trimmedLabourCode,
      minimumWagePerDay: typeof formData.minimumWagePerDay === 'number' ? formData.minimumWagePerDay : 0,
      minimumWagePerMonth: typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0,
      dearnessAllowance: typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0,
      perksPercentage: typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0,
      lhr: typeof formData.lhr === 'number' ? formData.lhr : 0,
    };

    await createMutation.mutateAsync(submitData);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = (entry: LSREntry) => {
    setEditingEntry(entry);
    setFormData({
      labourCode: entry.labourCode,
      labourType: entry.labourType,
      description: entry.description,
      minimumWagePerDay: entry.minimumWagePerDay,
      minimumWagePerMonth: entry.minimumWagePerMonth,
      dearnessAllowance: entry.dearnessAllowance,
      perksPercentage: entry.perksPercentage,
      lhr: entry.lhr,
      location: entry.location,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;

    // Validate labour code doesn't already exist (excluding current entry)
    const trimmedLabourCode = formData.labourCode.trim();
    const existingEntry = lsrEntries.find(
      entry =>
        entry.id !== editingEntry.id &&
        entry.labourCode.toLowerCase() === trimmedLabourCode.toLowerCase()
    );

    if (existingEntry) {
      toast.error(`Labour code "${trimmedLabourCode}" already exists`, {
        description: 'Please use a different labour code.',
        duration: 5000,
      });
      return;
    }

    // Validate required fields
    if (!trimmedLabourCode || !formData.labourType || !formData.description) {
      toast.error('Please fill in all required fields', {
        description: 'Labour code, type, and description are required.',
        duration: 4000,
      });
      return;
    }

    // Convert empty strings to 0 before submitting
    const submitData = {
      ...formData,
      labourCode: trimmedLabourCode,
      minimumWagePerDay: typeof formData.minimumWagePerDay === 'number' ? formData.minimumWagePerDay : 0,
      minimumWagePerMonth: typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0,
      dearnessAllowance: typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0,
      perksPercentage: typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0,
      lhr: typeof formData.lhr === 'number' ? formData.lhr : 0,
    };

    await updateMutation.mutateAsync({ id: editingEntry.id, data: submitData });
    setIsEditDialogOpen(false);
    setEditingEntry(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  // Check for database setup errors
  const hasError = lsrError || statsError;
  const errorMessage = lsrError?.message || statsError?.message || '';
  const isTableMissing = errorMessage.includes('lsr_records') || errorMessage.includes('table');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labour Cost Database (LSR)"
        description="Manage labour skill rates and hourly costs"
      />

      {/* Database Setup Error Alert */}
      {hasError && isTableMissing && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Database Setup Required</CardTitle>
            <CardDescription>
              The LSR database table has not been created yet. Follow these steps to complete setup:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Quick Setup (5 minutes):</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Dashboard</a></li>
                <li>Click <strong>SQL Editor</strong> → <strong>New Query</strong></li>
                <li>Open file: <code className="bg-muted px-1 py-0.5 rounded">backend/src/database/migrations/002c_fix_lsr_table.sql</code></li>
                <li>Copy all contents and paste into SQL Editor</li>
                <li>Click <strong>Run</strong> and wait for success message</li>
                <li>Restart your backend server and refresh this page</li>
              </ol>
            </div>
            <div className="p-3 bg-muted rounded text-sm">
              <strong>Error:</strong> {errorMessage}
            </div>
            <p className="text-sm text-muted-foreground">
              For detailed instructions, see: <code className="bg-muted px-1 py-0.5 rounded">backend/src/database/migrations/README.md</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Working Hours Configuration Card - User Input Required */}
      <Card className={workingHoursPerYear === 0 ? 'border-orange-500/50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Working Hours Configuration
            {workingHoursPerYear === 0 && (
              <span className="text-xs font-normal text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Required - Enter your values
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Enter your actual working schedule. LHR will auto-calculate based on these values.
            <br />
            <span className="text-xs text-muted-foreground">
              Example: 281 days × 2 shifts × 9 hrs = 5,058 hrs/year
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="workingDays" className="text-sm font-medium">
                Working Days/Year *
              </Label>
              <Input
                id="workingDays"
                type="number"
                min="1"
                max="365"
                placeholder="e.g., 281"
                value={workingConfig.workingDaysPerYear || ''}
                onChange={(e) =>
                  setWorkingConfig((prev) => ({
                    ...prev,
                    workingDaysPerYear: parseInt(e.target.value) || 0,
                  }))
                }
                className="text-xl font-bold h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shiftsPerDay" className="text-sm font-medium">
                Shifts/Day *
              </Label>
              <Input
                id="shiftsPerDay"
                type="number"
                min="1"
                max="3"
                placeholder="e.g., 2"
                value={workingConfig.shiftsPerDay || ''}
                onChange={(e) =>
                  setWorkingConfig((prev) => ({
                    ...prev,
                    shiftsPerDay: parseInt(e.target.value) || 0,
                  }))
                }
                className="text-xl font-bold h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoursPerShift" className="text-sm font-medium">
                Hours/Shift *
              </Label>
              <Input
                id="hoursPerShift"
                type="number"
                min="1"
                max="24"
                step="0.5"
                placeholder="e.g., 9"
                value={workingConfig.hoursPerShift || ''}
                onChange={(e) =>
                  setWorkingConfig((prev) => ({
                    ...prev,
                    hoursPerShift: parseFloat(e.target.value) || 0,
                  }))
                }
                className="text-xl font-bold h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Total Hours/Year
              </Label>
              <div className={`text-xl font-bold h-12 flex items-center justify-center rounded-md ${workingHoursPerYear > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                {workingHoursPerYear > 0 ? workingHoursPerYear.toLocaleString() : '---'}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {workingHoursPerYear > 0 ? 'Auto-calculated ' : 'Waiting for input'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Labour Types</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average LHR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{statistics.averageLHR.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">per hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.byType.length}</div>
              <p className="text-xs text-muted-foreground">different types</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Labour Entries</CardTitle>
              <CardDescription>Manage labour skill rates and costs</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Labour Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Labour Entry</DialogTitle>
                    <DialogDescription>
                      Create a new labour entry with skill rate information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="labourCode">Labour Code*</Label>
                        <Input
                          id="labourCode"
                          value={formData.labourCode}
                          onChange={(e) => handleInputChange('labourCode', e.target.value)}
                          placeholder="UN-L-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="labourType">Labour Type*</Label>
                        <Input
                          id="labourType"
                          value={formData.labourType}
                          onChange={(e) => handleInputChange('labourType', e.target.value)}
                          placeholder="Unskilled, Semi-Skilled, etc."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description*</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Job responsibilities and tasks..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minimumWagePerDay">
                          Min Wage (₹/Day)* <span className="text-xs text-muted-foreground font-normal">(Auto-syncs)</span>
                        </Label>
                        <Input
                          id="minimumWagePerDay"
                          type="number"
                          value={formData.minimumWagePerDay}
                          onChange={(e) => handleDailyWageChange(e.target.value)}
                          placeholder="e.g., 400"
                        />
                        <p className="text-xs text-muted-foreground">
                          Calculated: Monthly ÷ {daysPerMonthForWage} days
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minimumWagePerMonth">
                          Min Wage (₹/Month)* <span className="text-xs text-muted-foreground font-normal">(Auto-syncs)</span>
                        </Label>
                        <Input
                          id="minimumWagePerMonth"
                          type="number"
                          value={formData.minimumWagePerMonth}
                          onChange={(e) => handleMonthlyWageChange(e.target.value)}
                          placeholder="e.g., 12000"
                        />
                        <p className="text-xs text-muted-foreground">
                          Calculated: Daily × {daysPerMonthForWage} days
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dearnessAllowance">D.A (₹/Month)*</Label>
                        <Input
                          id="dearnessAllowance"
                          type="number"
                          value={formData.dearnessAllowance}
                          onChange={(e) => handleNumberChange('dearnessAllowance', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="perksPercentage">Perks (%)*</Label>
                        <Input
                          id="perksPercentage"
                          type="number"
                          value={formData.perksPercentage}
                          onChange={(e) => handleNumberChange('perksPercentage', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lhr">
                          LHR (₹/Hour)* <span className="text-xs text-muted-foreground font-normal">(Auto-calculated)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="lhr"
                            type="number"
                            value={formData.lhr || 0}
                            disabled
                            className="bg-muted/50 font-semibold text-primary"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            ₹{formData.lhr || '0.00'}/hr
                          </div>
                        </div>
                        {workingHoursPerYear === 0 ? (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded text-xs">
                            <div className="font-semibold text-orange-800 mb-1">⚠️ Configure Working Hours First</div>
                            <p className="text-orange-700">
                              Please set your working hours configuration above (days/year, shifts/day, hours/shift) to calculate LHR accurately.
                            </p>
                          </div>
                        ) : calculatedLHR > 0 ? (
                          <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs space-y-1">
                            <div className="font-semibold text-primary mb-1">Calculation Breakdown:</div>
                            <div className="font-mono space-y-0.5">
                              <div>① Base + DA = ₹{((typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0) + (typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0)).toLocaleString()}/mo</div>
                              <div>② With Perks ({typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0}%) = ₹{(((typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0) + (typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0)) * (1 + (typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0) / 100)).toLocaleString()}/mo</div>
                              <div>③ Annual = ₹{(((typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0) + (typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0)) * (1 + (typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0) / 100) * 12).toLocaleString()}/yr</div>
                              <div>④ Hours/Year = {workingConfig.workingDaysPerYear} days × {workingConfig.shiftsPerDay} shifts × {workingConfig.hoursPerShift} hrs = {workingHoursPerYear.toLocaleString()} hrs</div>
                              <div className="border-t border-primary/20 pt-1 mt-1 text-primary font-bold">
                                → LHR = ₹{calculatedLHR.toFixed(2)}/hr
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Enter wage data to see real-time calculation
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="e.g., India - Bangalore"
                        />
                      </div>
                    </div>

                  </div>
                  <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                      className="sm:mr-auto"
                    >
                      Clear Form
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreate} disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, type, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Labour Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Min Wage/Day (₹)</TableHead>
                  <TableHead className="text-right">Min Wage/Month (₹)</TableHead>
                  <TableHead className="text-right">D.A (₹)</TableHead>
                  <TableHead className="text-right">Perks (%)</TableHead>
                  <TableHead className="text-right">LHR (₹/hr)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : lsrEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No labour entries found. Click "Add Labour Entry" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  lsrEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.labourCode}</TableCell>
                      <TableCell>{entry.labourType}</TableCell>
                      <TableCell className="max-w-xs truncate" title={entry.description}>
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right">{entry.minimumWagePerDay.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{entry.minimumWagePerMonth.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{entry.dearnessAllowance.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{entry.perksPercentage}%</TableCell>
                      <TableCell className="text-right font-semibold">{entry.lhr.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(entry.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Labour Entry</DialogTitle>
            <DialogDescription>Update labour entry information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-labourCode">Labour Code*</Label>
                <Input
                  id="edit-labourCode"
                  value={formData.labourCode}
                  onChange={(e) => handleInputChange('labourCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-labourType">Labour Type*</Label>
                <Input
                  id="edit-labourType"
                  value={formData.labourType}
                  onChange={(e) => handleInputChange('labourType', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description*</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-minimumWagePerDay">
                  Min Wage (₹/Day)* <span className="text-xs text-muted-foreground font-normal">(Auto-syncs)</span>
                </Label>
                <Input
                  id="edit-minimumWagePerDay"
                  type="number"
                  value={formData.minimumWagePerDay}
                  onChange={(e) => handleDailyWageChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Calculated: Monthly ÷ {daysPerMonthForWage} days
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minimumWagePerMonth">
                  Min Wage (₹/Month)* <span className="text-xs text-muted-foreground font-normal">(Auto-syncs)</span>
                </Label>
                <Input
                  id="edit-minimumWagePerMonth"
                  type="number"
                  value={formData.minimumWagePerMonth}
                  onChange={(e) => handleMonthlyWageChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Calculated: Daily × {daysPerMonthForWage} days
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dearnessAllowance">D.A (₹/Month)*</Label>
                <Input
                  id="edit-dearnessAllowance"
                  type="number"
                  value={formData.dearnessAllowance}
                  onChange={(e) => handleNumberChange('dearnessAllowance', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-perksPercentage">Perks (%)*</Label>
                <Input
                  id="edit-perksPercentage"
                  type="number"
                  value={formData.perksPercentage}
                  onChange={(e) => handleNumberChange('perksPercentage', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lhr">
                  LHR (₹/Hour)* <span className="text-xs text-muted-foreground font-normal">(Auto-calculated)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="edit-lhr"
                    type="number"
                    value={formData.lhr || 0}
                    disabled
                    className="bg-muted/50 font-semibold text-primary"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ₹{formData.lhr || '0.00'}/hr
                  </div>
                </div>
                {workingHoursPerYear === 0 ? (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded text-xs">
                    <div className="font-semibold text-orange-800 mb-1">⚠️ Configure Working Hours First</div>
                    <p className="text-orange-700">
                      Please set your working hours configuration above (days/year, shifts/day, hours/shift) to calculate LHR accurately.
                    </p>
                  </div>
                ) : calculatedLHR > 0 ? (
                  <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs space-y-1">
                    <div className="font-semibold text-primary mb-1">Calculation Breakdown:</div>
                    <div className="font-mono space-y-0.5">
                      <div>① Base + DA = ₹{((typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0) + (typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0)).toLocaleString()}/mo</div>
                      <div>② With Perks ({typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0}%) = ₹{(((typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0) + (typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0)) * (1 + (typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0) / 100)).toLocaleString()}/mo</div>
                      <div>③ Annual = ₹{(((typeof formData.minimumWagePerMonth === 'number' ? formData.minimumWagePerMonth : 0) + (typeof formData.dearnessAllowance === 'number' ? formData.dearnessAllowance : 0)) * (1 + (typeof formData.perksPercentage === 'number' ? formData.perksPercentage : 0) / 100) * 12).toLocaleString()}/yr</div>
                      <div>④ Hours/Year = {workingConfig.workingDaysPerYear} days × {workingConfig.shiftsPerDay} shifts × {workingConfig.hoursPerShift} hrs = {workingHoursPerYear.toLocaleString()} hrs</div>
                      <div className="border-t border-primary/20 pt-1 mt-1 text-primary font-bold">
                        → LHR = ₹{calculatedLHR.toFixed(2)}/hr
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Enter wage data to see real-time calculation
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., India - Bangalore"
                />
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingEntry(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the labour entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
