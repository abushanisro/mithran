'use client';

import { useState, useMemo } from 'react';
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
import { Plus, Pencil, Trash2, Search, Calculator, Package, Save } from 'lucide-react';
import {
  useShotWeightCalculations,
  useCreateShotWeight,
  useUpdateShotWeight,
  useDeleteShotWeight
} from '@/lib/api/hooks';
import { CreateShotWeightData, ShotWeightCalculation } from '@/lib/api/shot-weight';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function ShotWeightCalculatorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<ShotWeightCalculation | null>(null);

  const { data: calculationsData, isLoading } = useShotWeightCalculations({
    search: searchQuery
  });
  const createMutation = useCreateShotWeight();
  const updateMutation = useUpdateShotWeight();
  const deleteMutation = useDeleteShotWeight();

  const calculations = calculationsData?.data || [];

  const [formData, setFormData] = useState<CreateShotWeightData>({
    calculationName: '',
    description: '',
    materialGrade: 'ABS',
    density: 0,
    volume: 0,
    partWeight: 0,
    volumeSource: 'manual',
    numberOfCavities: 1,
    cavitySource: 'manual',
    runnerDiameter: 0,
    runnerLengthPerPart: 0,
    runnerSource: 'manual',
    includeSprue: false,
  });

  // Real-time calculation of shot weight
  const calculatedValues = useMemo(() => {
    const runnerRadius = formData.runnerDiameter / 2;
    const runnerProjectedAreaPerPart = Math.PI * Math.pow(runnerRadius, 2);
    const runnerProjectedVolumePerPart = runnerProjectedAreaPerPart * formData.runnerLengthPerPart;
    const runnerWeightPerPart = (runnerProjectedVolumePerPart / 1000) * (formData.density / 1000);
    const totalPartWeight = formData.partWeight * formData.numberOfCavities;
    const totalRunnerWeight = runnerWeightPerPart * formData.numberOfCavities;
    const totalShotWeight = totalPartWeight + totalRunnerWeight;
    const runnerToPartRatio = totalPartWeight > 0 ? (totalRunnerWeight / totalPartWeight) * 100 : 0;

    let sprueWeight = 0;
    let totalShotWeightWithSprue = totalShotWeight;

    if (formData.includeSprue && formData.sprueDiameter && formData.sprueLength) {
      const sprueRadius = formData.sprueDiameter / 2;
      const sprueVolume = Math.PI * Math.pow(sprueRadius, 2) * formData.sprueLength;
      sprueWeight = (sprueVolume / 1000) * (formData.density / 1000);
      totalShotWeightWithSprue = totalShotWeight + sprueWeight + (formData.coldSlugWeight || 0);
    }

    return {
      runnerProjectedAreaPerPart: runnerProjectedAreaPerPart.toFixed(4),
      runnerProjectedVolumePerPart: runnerProjectedVolumePerPart.toFixed(4),
      runnerWeightPerPart: runnerWeightPerPart.toFixed(4),
      totalPartWeight: totalPartWeight.toFixed(4),
      totalRunnerWeight: totalRunnerWeight.toFixed(4),
      totalShotWeight: totalShotWeight.toFixed(4),
      runnerToPartRatio: runnerToPartRatio.toFixed(2),
      sprueWeight: sprueWeight.toFixed(4),
      totalShotWeightWithSprue: totalShotWeightWithSprue.toFixed(4),
    };
  }, [formData]);

  const handleInputChange = (field: keyof CreateShotWeightData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof CreateShotWeightData, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData(prev => ({ ...prev, [field]: isNaN(numValue) ? 0 : numValue }));
  };

  const resetForm = () => {
    setFormData({
      calculationName: '',
      description: '',
      materialGrade: 'ABS',
      density: 0,
      volume: 0,
      partWeight: 0,
      volumeSource: 'manual',
      numberOfCavities: 1,
      cavitySource: 'manual',
      runnerDiameter: 0,
      runnerLengthPerPart: 0,
      runnerSource: 'manual',
      includeSprue: false,
    });
    setEditingEntry(null);
  };

  const handleCreate = () => {
    if (!formData.calculationName.trim()) {
      toast.error('Please enter a calculation name');
      return;
    }

    if (formData.density <= 0) {
      toast.error('Density must be greater than 0');
      return;
    }

    if (formData.volume <= 0) {
      toast.error('Volume must be greater than 0');
      return;
    }

    if (formData.partWeight <= 0) {
      toast.error('Part weight must be greater than 0');
      return;
    }

    if (formData.runnerDiameter <= 0) {
      toast.error('Runner diameter must be greater than 0');
      return;
    }

    if (formData.runnerLengthPerPart <= 0) {
      toast.error('Runner length must be greater than 0');
      return;
    }

    createMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      },
    });
  };

  const handleEdit = (entry: ShotWeightCalculation) => {
    setEditingEntry(entry);
    setFormData({
      calculationName: entry.calculationName,
      description: entry.description,
      materialGrade: entry.materialGrade,
      density: entry.density,
      volume: entry.volume,
      partWeight: entry.partWeight,
      volumeSource: entry.volumeSource as 'cad' | 'manual',
      numberOfCavities: entry.numberOfCavities,
      cavitySource: entry.cavitySource as 'lookup' | 'manual',
      runnerDiameter: entry.runnerDiameter,
      runnerLengthPerPart: entry.runnerLengthPerPart,
      runnerSource: entry.runnerSource as 'lookup' | 'manual',
      includeSprue: entry.includeSprue,
      sprueDiameter: entry.sprueDiameter,
      sprueLength: entry.sprueLength,
      coldSlugWeight: entry.coldSlugWeight,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingEntry) return;

    updateMutation.mutate(
      { id: editingEntry.id, data: formData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
      },
    });
  };

  const materialGrades = ['ABS', 'PP', 'PC', 'PE', 'PS', 'PVC', 'POM', 'PA', 'PMMA', 'PET'];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shot Weight Calculator"
        description="Calculate total shot weight for injection molding including runners and optional sprue"
      />

      {/* Calculator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            New Calculation
          </CardTitle>
          <CardDescription>
            Enter part and runner details to calculate total shot weight
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calculationName">Calculation Name *</Label>
              <Input
                id="calculationName"
                value={formData.calculationName}
                onChange={(e) => handleInputChange('calculationName', e.target.value)}
                placeholder="e.g., Housing Cover - ABS"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialGrade">Material Grade *</Label>
              <Select
                value={formData.materialGrade}
                onValueChange={(value) => handleInputChange('materialGrade', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {materialGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="density">Density (kg/m³) *</Label>
              <Input
                id="density"
                type="number"
                value={formData.density}
                onChange={(e) => handleNumberChange('density', e.target.value)}
                placeholder="e.g., 1040"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">From Raw Materials Database</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Volume (mm³) *</Label>
              <Input
                id="volume"
                type="number"
                value={formData.volume}
                onChange={(e) => handleNumberChange('volume', e.target.value)}
                placeholder="e.g., 95000"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">From CAD or manual input</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partWeight">Part Weight (grams) *</Label>
              <Input
                id="partWeight"
                type="number"
                step="0.01"
                value={formData.partWeight}
                onChange={(e) => handleNumberChange('partWeight', e.target.value)}
                placeholder="e.g., 98.8"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfCavities">Number of Cavities *</Label>
              <Input
                id="numberOfCavities"
                type="number"
                value={formData.numberOfCavities}
                onChange={(e) => handleNumberChange('numberOfCavities', e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="runnerDiameter">Runner Diameter (mm) *</Label>
              <Input
                id="runnerDiameter"
                type="number"
                step="0.1"
                value={formData.runnerDiameter}
                onChange={(e) => handleNumberChange('runnerDiameter', e.target.value)}
                placeholder="e.g., 7"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="runnerLength">Runner Length/Part (mm) *</Label>
              <Input
                id="runnerLength"
                type="number"
                step="0.1"
                value={formData.runnerLengthPerPart}
                onChange={(e) => handleNumberChange('runnerLengthPerPart', e.target.value)}
                placeholder="e.g., 125"
                min="0"
              />
            </div>
          </div>

          {/* Sprue Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSprue"
                checked={formData.includeSprue}
                onCheckedChange={(checked) => handleInputChange('includeSprue', checked)}
              />
              <Label htmlFor="includeSprue" className="cursor-pointer">
                Include Sprue and Cold Slug
              </Label>
            </div>

            {formData.includeSprue && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="sprueDiameter">Sprue Diameter (mm)</Label>
                  <Input
                    id="sprueDiameter"
                    type="number"
                    step="0.1"
                    value={formData.sprueDiameter || ''}
                    onChange={(e) => handleNumberChange('sprueDiameter', e.target.value)}
                    placeholder="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sprueLength">Sprue Length (mm)</Label>
                  <Input
                    id="sprueLength"
                    type="number"
                    step="0.1"
                    value={formData.sprueLength || ''}
                    onChange={(e) => handleNumberChange('sprueLength', e.target.value)}
                    placeholder="80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coldSlugWeight">Cold Slug Weight (g)</Label>
                  <Input
                    id="coldSlugWeight"
                    type="number"
                    step="0.01"
                    value={formData.coldSlugWeight || ''}
                    onChange={(e) => handleNumberChange('coldSlugWeight', e.target.value)}
                    placeholder="2.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Calculated Results */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Calculated Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardDescription>Runner Projected Area/Part</CardDescription>
                  <CardTitle className="text-2xl">{calculatedValues.runnerProjectedAreaPerPart} mm²</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardDescription>Runner Projected Volume/Part</CardDescription>
                  <CardTitle className="text-2xl">{calculatedValues.runnerProjectedVolumePerPart} mm³</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardDescription>Runner Weight/Part</CardDescription>
                  <CardTitle className="text-2xl">{calculatedValues.runnerWeightPerPart} g</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardDescription>Total Part Weight</CardDescription>
                  <CardTitle className="text-2xl">{calculatedValues.totalPartWeight} g</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardDescription>Total Runner Weight</CardDescription>
                  <CardTitle className="text-2xl">{calculatedValues.totalRunnerWeight} g</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-primary text-primary-foreground">
                <CardHeader className="pb-3">
                  <CardDescription className="text-primary-foreground/80">Total Shot Weight</CardDescription>
                  <CardTitle className="text-2xl">{calculatedValues.totalShotWeight} g</CardTitle>
                </CardHeader>
              </Card>

              {formData.includeSprue && (
                <>
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardDescription>Sprue Weight</CardDescription>
                      <CardTitle className="text-2xl">{calculatedValues.sprueWeight} g</CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-primary-foreground/80">
                        Total with Sprue & Cold Slug
                      </CardDescription>
                      <CardTitle className="text-2xl">{calculatedValues.totalShotWeightWithSprue} g</CardTitle>
                    </CardHeader>
                  </Card>
                </>
              )}

              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardDescription>Runner to Part Ratio</CardDescription>
                  <CardTitle className="text-2xl">{calculatedValues.runnerToPartRatio}%</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add notes or remarks about this calculation"
              rows={3}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !formData.calculationName}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? 'Saving...' : 'Save Calculation'}
          </Button>
        </CardContent>
      </Card>

      {/* Saved Calculations */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Saved Calculations</CardTitle>
              <CardDescription>View and manage your shot weight calculations</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calculations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : calculations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No saved calculations yet</p>
              <p className="text-sm">Create your first calculation above</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Cavities</TableHead>
                    <TableHead>Part Weight</TableHead>
                    <TableHead>Shot Weight</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.map((calc) => (
                    <TableRow key={calc.id}>
                      <TableCell className="font-medium">{calc.calculationName}</TableCell>
                      <TableCell>{calc.materialGrade}</TableCell>
                      <TableCell>{calc.numberOfCavities}</TableCell>
                      <TableCell>{calc.partWeight} g</TableCell>
                      <TableCell className="font-semibold">{calc.totalShotWeight.toFixed(2)} g</TableCell>
                      <TableCell>{new Date(calc.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(calc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(calc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calculation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this calculation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
