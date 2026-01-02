'use client';

import { useState, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Upload, Search, ArrowUpDown, Filter, Download, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import {
  useRawMaterials,
  useRawMaterialFilterOptions,
  useUploadRawMaterialsExcel,
  useCreateRawMaterial,
  useUpdateRawMaterial,
  useDeleteRawMaterial,
  useDeleteAllRawMaterials,
  RawMaterial,
} from '@/lib/api/hooks/useRawMaterials';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function RawMaterialsPage() {
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('material');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [newMaterial, setNewMaterial] = useState({
    materialGroup: '',
    material: '',
    materialAbbreviation: '',
    materialGrade: '',
    stockForm: '',
    matlState: '',
    application: '',
    regrinding: '',
    regrindingPercentage: '',
    clampingPressureMpa: '',
    ejectDeflectionTempC: '',
    meltingTempC: '',
    moldTempC: '',
    densityKgM3: '',
    specificHeatMelt: '',
    thermalConductivityMelt: '',
    location: '',
    year: '',
    q1Cost: '',
    q2Cost: '',
    q3Cost: '',
    q4Cost: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CONFIRM_DELETE_TEXT = 'delete';

  const { data: rawMaterialsData, isLoading } = useRawMaterials({
    search: search || undefined,
    materialGroup: filterGroup !== 'all' ? filterGroup : undefined,
    location: filterLocation !== 'all' ? filterLocation : undefined,
    year: filterYear !== 'all' ? parseInt(filterYear) : undefined,
    sortBy,
    sortOrder,
  });

  const { data: filterOptions } = useRawMaterialFilterOptions();
  const uploadMutation = useUploadRawMaterialsExcel();
  const createMutation = useCreateRawMaterial();
  const updateMutation = useUpdateRawMaterial();
  const deleteMutation = useDeleteRawMaterial();
  const deleteAllMutation = useDeleteAllRawMaterials();

  const rawMaterials = rawMaterialsData?.items || [];
  const totalCount = rawMaterialsData?.total || 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        setUploadDialogOpen(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const downloadTemplate = () => {
    // Create a sample template CSV
    const headers = [
      'MaterialGroup',
      'Material',
      'MaterialAbbreviation',
      'MaterialGrade',
      'StockForm',
      'MatlState',
      'Application',
      'Regrinding',
      'Regrinding%',
      'Clamping Pressure (MPa)',
      'Eject Deflection Temp (°C)',
      'Melting Temp (°C)',
      'Mold Temp (°C)',
      'Density (kg / m^3)',
      'Specific Heat of Melt',
      'Thermal Conductivity of Melt',
      'Location',
      'Year',
      'Q1',
      'Q2',
      'Q3',
      'Q4',
    ];

    const sampleRow = [
      'Plastic & Rubber',
      'Acrylonitrile Butadiene Styrene',
      'ABS',
      'General Purpose',
      'Pellet',
      'Amorphous',
      'General purpose applications',
      'Yes',
      '10',
      '50.5',
      '80',
      '220',
      '60',
      '1050',
      '2.1',
      '0.18',
      'USA',
      '2024',
      '2.5',
      '2.6',
      '2.7',
      '2.8',
    ];

    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw-materials-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Template downloaded! Use this format for your Excel file.');
  };

  const handleCreateMaterial = () => {
    if (!newMaterial.materialGroup || !newMaterial.material) {
      toast.error('Material Group and Material name are required');
      return;
    }

    // Convert string inputs to proper types
    const materialData: any = {
      materialGroup: newMaterial.materialGroup,
      material: newMaterial.material,
      materialAbbreviation: newMaterial.materialAbbreviation || undefined,
      materialGrade: newMaterial.materialGrade || undefined,
      stockForm: newMaterial.stockForm || undefined,
      matlState: newMaterial.matlState || undefined,
      application: newMaterial.application || undefined,
      regrinding: newMaterial.regrinding || undefined,
      regrindingPercentage: newMaterial.regrindingPercentage ? parseFloat(newMaterial.regrindingPercentage) : undefined,
      clampingPressureMpa: newMaterial.clampingPressureMpa ? parseFloat(newMaterial.clampingPressureMpa) : undefined,
      ejectDeflectionTempC: newMaterial.ejectDeflectionTempC ? parseFloat(newMaterial.ejectDeflectionTempC) : undefined,
      meltingTempC: newMaterial.meltingTempC ? parseFloat(newMaterial.meltingTempC) : undefined,
      moldTempC: newMaterial.moldTempC ? parseFloat(newMaterial.moldTempC) : undefined,
      densityKgM3: newMaterial.densityKgM3 ? parseFloat(newMaterial.densityKgM3) : undefined,
      specificHeatMelt: newMaterial.specificHeatMelt ? parseFloat(newMaterial.specificHeatMelt) : undefined,
      thermalConductivityMelt: newMaterial.thermalConductivityMelt ? parseFloat(newMaterial.thermalConductivityMelt) : undefined,
      location: newMaterial.location || undefined,
      year: newMaterial.year ? parseInt(newMaterial.year) : undefined,
      q1Cost: newMaterial.q1Cost ? parseFloat(newMaterial.q1Cost) : undefined,
      q2Cost: newMaterial.q2Cost ? parseFloat(newMaterial.q2Cost) : undefined,
      q3Cost: newMaterial.q3Cost ? parseFloat(newMaterial.q3Cost) : undefined,
      q4Cost: newMaterial.q4Cost ? parseFloat(newMaterial.q4Cost) : undefined,
    };

    createMutation.mutate(materialData, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setNewMaterial({
          materialGroup: '',
          material: '',
          materialAbbreviation: '',
          materialGrade: '',
          stockForm: '',
          matlState: '',
          application: '',
          regrinding: '',
          regrindingPercentage: '',
          clampingPressureMpa: '',
          ejectDeflectionTempC: '',
          meltingTempC: '',
          moldTempC: '',
          densityKgM3: '',
          specificHeatMelt: '',
          thermalConductivityMelt: '',
          location: '',
          year: '',
          q1Cost: '',
          q2Cost: '',
          q3Cost: '',
          q4Cost: '',
        });
      },
    });
  };

  const handleDeleteMaterial = (id: string, materialName: string) => {
    if (confirm(`Are you sure you want to delete "${materialName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (deleteConfirmText.toLowerCase() !== CONFIRM_DELETE_TEXT) {
      toast.error(`Please type "${CONFIRM_DELETE_TEXT}" to confirm`);
      return;
    }

    deleteAllMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteAllDialogOpen(false);
        setDeleteConfirmText('');
      },
    });
  };

  const handleDeleteAllDialogClose = (open: boolean) => {
    setDeleteAllDialogOpen(open);
    if (!open) {
      setDeleteConfirmText('');
    }
  };

  const handleEditMaterial = (material: RawMaterial) => {
    setEditingMaterial(material);
    setNewMaterial({
      materialGroup: material.materialGroup || '',
      material: material.material || '',
      materialAbbreviation: material.materialAbbreviation || '',
      materialGrade: material.materialGrade || '',
      stockForm: material.stockForm || '',
      matlState: material.matlState || '',
      application: material.application || '',
      regrinding: material.regrinding || '',
      regrindingPercentage: material.regrindingPercentage?.toString() || '',
      clampingPressureMpa: material.clampingPressureMpa?.toString() || '',
      ejectDeflectionTempC: material.ejectDeflectionTempC?.toString() || '',
      meltingTempC: material.meltingTempC?.toString() || '',
      moldTempC: material.moldTempC?.toString() || '',
      densityKgM3: material.densityKgM3?.toString() || '',
      specificHeatMelt: material.specificHeatMelt?.toString() || '',
      thermalConductivityMelt: material.thermalConductivityMelt?.toString() || '',
      location: material.location || '',
      year: material.year?.toString() || '',
      q1Cost: material.q1Cost?.toString() || '',
      q2Cost: material.q2Cost?.toString() || '',
      q3Cost: material.q3Cost?.toString() || '',
      q4Cost: material.q4Cost?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateMaterial = () => {
    if (!editingMaterial) return;
    if (!newMaterial.materialGroup || !newMaterial.material) {
      toast.error('Material Group and Material name are required');
      return;
    }

    // Convert string inputs to proper types
    const materialData: any = {
      materialGroup: newMaterial.materialGroup,
      material: newMaterial.material,
      materialAbbreviation: newMaterial.materialAbbreviation || undefined,
      materialGrade: newMaterial.materialGrade || undefined,
      stockForm: newMaterial.stockForm || undefined,
      matlState: newMaterial.matlState || undefined,
      application: newMaterial.application || undefined,
      regrinding: newMaterial.regrinding || undefined,
      regrindingPercentage: newMaterial.regrindingPercentage ? parseFloat(newMaterial.regrindingPercentage) : undefined,
      clampingPressureMpa: newMaterial.clampingPressureMpa ? parseFloat(newMaterial.clampingPressureMpa) : undefined,
      ejectDeflectionTempC: newMaterial.ejectDeflectionTempC ? parseFloat(newMaterial.ejectDeflectionTempC) : undefined,
      meltingTempC: newMaterial.meltingTempC ? parseFloat(newMaterial.meltingTempC) : undefined,
      moldTempC: newMaterial.moldTempC ? parseFloat(newMaterial.moldTempC) : undefined,
      densityKgM3: newMaterial.densityKgM3 ? parseFloat(newMaterial.densityKgM3) : undefined,
      specificHeatMelt: newMaterial.specificHeatMelt ? parseFloat(newMaterial.specificHeatMelt) : undefined,
      thermalConductivityMelt: newMaterial.thermalConductivityMelt ? parseFloat(newMaterial.thermalConductivityMelt) : undefined,
      location: newMaterial.location || undefined,
      year: newMaterial.year ? parseInt(newMaterial.year) : undefined,
      q1Cost: newMaterial.q1Cost ? parseFloat(newMaterial.q1Cost) : undefined,
      q2Cost: newMaterial.q2Cost ? parseFloat(newMaterial.q2Cost) : undefined,
      q3Cost: newMaterial.q3Cost ? parseFloat(newMaterial.q3Cost) : undefined,
      q4Cost: newMaterial.q4Cost ? parseFloat(newMaterial.q4Cost) : undefined,
    };

    updateMutation.mutate(
      { id: editingMaterial.id, data: materialData },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          setEditingMaterial(null);
          setNewMaterial({
            materialGroup: '',
            material: '',
            materialAbbreviation: '',
            materialGrade: '',
            stockForm: '',
            matlState: '',
            application: '',
            regrinding: '',
            regrindingPercentage: '',
            clampingPressureMpa: '',
            ejectDeflectionTempC: '',
            meltingTempC: '',
            moldTempC: '',
            densityKgM3: '',
            specificHeatMelt: '',
            thermalConductivityMelt: '',
            location: '',
            year: '',
            q1Cost: '',
            q2Cost: '',
            q3Cost: '',
            q4Cost: '',
          });
        },
      }
    );
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return <ArrowUpDown className={`h-3 w-3 ml-1 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Raw Materials Database - Injection Moulding"
        description="Material properties and cost data for Injection Moulding process"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Excel
          </Button>
          <Button
            variant="outline"
            disabled={totalCount === 0}
            className="text-red-600 hover:text-red-700"
            onClick={() => setDeleteAllDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>
      </PageHeader>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Materials from Excel</DialogTitle>
            <DialogDescription>
              Select an Excel file (.xlsx, .xls) or CSV file containing raw material data to import
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                Need help with the format?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template CSV
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Select Excel File (.xlsx, .xls, .csv)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Required columns: <strong>MaterialGroup</strong>, <strong>Material</strong></p>
              <p>Supports multiple column formats (e.g., "Material Group" or "MaterialGroup")</p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Dialog */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={handleDeleteAllDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete All Materials?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete all {totalCount} raw material(s) from your database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-900">
              <p className="text-sm text-red-900 dark:text-red-100 font-semibold">
                ⚠️ Warning: This will delete all {totalCount} materials
              </p>
              <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                All material data will be permanently removed from the database.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                Type <span className="font-mono font-bold text-red-600">delete</span> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                type="text"
                placeholder="Type 'delete' to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className={`font-mono ${deleteConfirmText && deleteConfirmText.toLowerCase() !== CONFIRM_DELETE_TEXT
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : deleteConfirmText.toLowerCase() === CONFIRM_DELETE_TEXT
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : ''
                  }`}
                autoComplete="off"
              />
              {deleteConfirmText && deleteConfirmText.toLowerCase() !== CONFIRM_DELETE_TEXT && (
                <p className="text-xs text-red-600">
                  Text doesn't match. Please type "delete" exactly.
                </p>
              )}
              {deleteConfirmText.toLowerCase() === CONFIRM_DELETE_TEXT && (
                <p className="text-xs text-green-600">
                  Confirmed. You can now proceed with deletion.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleDeleteAllDialogClose(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={
                  deleteAllMutation.isPending ||
                  deleteConfirmText.toLowerCase() !== CONFIRM_DELETE_TEXT
                }
                className="flex-1"
              >
                {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All Materials'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Material Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
            <DialogDescription>
              Create a new raw material entry with complete specifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Material Identification Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Material Identification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material Group *</Label>
                  <Input
                    placeholder="e.g., Plastic & Rubber"
                    value={newMaterial.materialGroup}
                    onChange={(e) => setNewMaterial({ ...newMaterial, materialGroup: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Material *</Label>
                  <Input
                    placeholder="e.g., Acrylonitrile Butadiene Styrene"
                    value={newMaterial.material}
                    onChange={(e) => setNewMaterial({ ...newMaterial, material: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abbreviation</Label>
                  <Input
                    placeholder="e.g., ABS"
                    value={newMaterial.materialAbbreviation}
                    onChange={(e) => setNewMaterial({ ...newMaterial, materialAbbreviation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input
                    placeholder="e.g., General Purpose"
                    value={newMaterial.materialGrade}
                    onChange={(e) => setNewMaterial({ ...newMaterial, materialGrade: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Material Properties Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Material Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Form</Label>
                  <Input
                    placeholder="e.g., Pellet, Granules"
                    value={newMaterial.stockForm}
                    onChange={(e) => setNewMaterial({ ...newMaterial, stockForm: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Material State</Label>
                  <Input
                    placeholder="e.g., Amorphous, Semi-Crystalline"
                    value={newMaterial.matlState}
                    onChange={(e) => setNewMaterial({ ...newMaterial, matlState: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Application</Label>
                  <Input
                    placeholder="e.g., General purpose applications"
                    value={newMaterial.application}
                    onChange={(e) => setNewMaterial({ ...newMaterial, application: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regrinding</Label>
                  <Select
                    value={newMaterial.regrinding}
                    onValueChange={(value) => setNewMaterial({ ...newMaterial, regrinding: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Regrinding %</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    value={newMaterial.regrindingPercentage}
                    onChange={(e) => setNewMaterial({ ...newMaterial, regrindingPercentage: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Processing Parameters Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Processing Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clamping Pressure (MPa)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 50.5"
                    value={newMaterial.clampingPressureMpa}
                    onChange={(e) => setNewMaterial({ ...newMaterial, clampingPressureMpa: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eject Deflection Temp (°C)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 80"
                    value={newMaterial.ejectDeflectionTempC}
                    onChange={(e) => setNewMaterial({ ...newMaterial, ejectDeflectionTempC: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Melting Temp (°C)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 220"
                    value={newMaterial.meltingTempC}
                    onChange={(e) => setNewMaterial({ ...newMaterial, meltingTempC: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mold Temp (°C)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 60"
                    value={newMaterial.moldTempC}
                    onChange={(e) => setNewMaterial({ ...newMaterial, moldTempC: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Physical Properties Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Physical Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Density (kg/m³)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1050"
                    value={newMaterial.densityKgM3}
                    onChange={(e) => setNewMaterial({ ...newMaterial, densityKgM3: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specific Heat of Melt (J/g·°C)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.1"
                    value={newMaterial.specificHeatMelt}
                    onChange={(e) => setNewMaterial({ ...newMaterial, specificHeatMelt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thermal Conductivity of Melt (W/m·°C)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="e.g., 0.18"
                    value={newMaterial.thermalConductivityMelt}
                    onChange={(e) => setNewMaterial({ ...newMaterial, thermalConductivityMelt: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Cost Data Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Cost Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., USA, India, China"
                    value={newMaterial.location}
                    onChange={(e) => setNewMaterial({ ...newMaterial, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2024"
                    value={newMaterial.year}
                    onChange={(e) => setNewMaterial({ ...newMaterial, year: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q1 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.5"
                    value={newMaterial.q1Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q1Cost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q2 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.6"
                    value={newMaterial.q2Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q2Cost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q3 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.7"
                    value={newMaterial.q3Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q3Cost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q4 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.8"
                    value={newMaterial.q4Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q4Cost: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 sticky bottom-0 bg-background pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMaterial}
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Material'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>
              Update the raw material specifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Material Identification Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Material Identification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material Group *</Label>
                  <Input
                    placeholder="e.g., Plastic & Rubber"
                    value={newMaterial.materialGroup}
                    onChange={(e) => setNewMaterial({ ...newMaterial, materialGroup: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Material *</Label>
                  <Input
                    placeholder="e.g., Acrylonitrile Butadiene Styrene"
                    value={newMaterial.material}
                    onChange={(e) => setNewMaterial({ ...newMaterial, material: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abbreviation</Label>
                  <Input
                    placeholder="e.g., ABS"
                    value={newMaterial.materialAbbreviation}
                    onChange={(e) => setNewMaterial({ ...newMaterial, materialAbbreviation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input
                    placeholder="e.g., General Purpose"
                    value={newMaterial.materialGrade}
                    onChange={(e) => setNewMaterial({ ...newMaterial, materialGrade: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Material Properties Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Material Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Form</Label>
                  <Input
                    placeholder="e.g., Pellet, Granules"
                    value={newMaterial.stockForm}
                    onChange={(e) => setNewMaterial({ ...newMaterial, stockForm: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Material State</Label>
                  <Input
                    placeholder="e.g., Amorphous, Semi-Crystalline"
                    value={newMaterial.matlState}
                    onChange={(e) => setNewMaterial({ ...newMaterial, matlState: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Application</Label>
                  <Input
                    placeholder="e.g., General purpose applications"
                    value={newMaterial.application}
                    onChange={(e) => setNewMaterial({ ...newMaterial, application: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regrinding</Label>
                  <Select
                    value={newMaterial.regrinding}
                    onValueChange={(value) => setNewMaterial({ ...newMaterial, regrinding: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Regrinding %</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    value={newMaterial.regrindingPercentage}
                    onChange={(e) => setNewMaterial({ ...newMaterial, regrindingPercentage: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Processing Parameters Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Processing Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clamping Pressure (MPa)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 50.5"
                    value={newMaterial.clampingPressureMpa}
                    onChange={(e) => setNewMaterial({ ...newMaterial, clampingPressureMpa: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eject Deflection Temp (°C)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 80"
                    value={newMaterial.ejectDeflectionTempC}
                    onChange={(e) => setNewMaterial({ ...newMaterial, ejectDeflectionTempC: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Melting Temp (°C)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 220"
                    value={newMaterial.meltingTempC}
                    onChange={(e) => setNewMaterial({ ...newMaterial, meltingTempC: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mold Temp (°C)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 60"
                    value={newMaterial.moldTempC}
                    onChange={(e) => setNewMaterial({ ...newMaterial, moldTempC: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Physical Properties Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Physical Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Density (kg/m³)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1050"
                    value={newMaterial.densityKgM3}
                    onChange={(e) => setNewMaterial({ ...newMaterial, densityKgM3: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specific Heat of Melt (J/g·°C)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.1"
                    value={newMaterial.specificHeatMelt}
                    onChange={(e) => setNewMaterial({ ...newMaterial, specificHeatMelt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thermal Conductivity of Melt (W/m·°C)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="e.g., 0.18"
                    value={newMaterial.thermalConductivityMelt}
                    onChange={(e) => setNewMaterial({ ...newMaterial, thermalConductivityMelt: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Cost Data Section */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground">Cost Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., USA, India, China"
                    value={newMaterial.location}
                    onChange={(e) => setNewMaterial({ ...newMaterial, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2024"
                    value={newMaterial.year}
                    onChange={(e) => setNewMaterial({ ...newMaterial, year: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q1 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.5"
                    value={newMaterial.q1Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q1Cost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q2 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.6"
                    value={newMaterial.q2Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q2Cost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q3 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.7"
                    value={newMaterial.q3Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q3Cost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Q4 Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.8"
                    value={newMaterial.q4Cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, q4Cost: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 sticky bottom-0 bg-background pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateMaterial}
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Material'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Filters */}
      <Card className="p-3">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Material Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilterGroup('all');
              }}
            >
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Materials
              </Label>
              <Input
                placeholder="Search by name, abbreviation, grade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Material Group
              </Label>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {filterOptions?.materialGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Location & Cost Filters */}
      <Card className="p-3 bg-secondary/30">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Location & Cost Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterLocation('all');
                setFilterYear('all');
              }}
            >
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {filterOptions?.locations.filter(Boolean).map((location) => (
                    <SelectItem key={location} value={location!}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cost Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {filterOptions?.years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {rawMaterials.length} of {totalCount} materials
        </p>
      </div>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-card hover:bg-card">
                <TableHead className="cursor-pointer h-9 px-2 text-xs" onClick={() => toggleSort('material_group')}>
                  <div className="flex items-center font-semibold">
                    Group
                    <SortIcon column="material_group" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer h-9 px-2 text-xs" onClick={() => toggleSort('material')}>
                  <div className="flex items-center font-semibold">
                    Material
                    <SortIcon column="material" />
                  </div>
                </TableHead>
                <TableHead className="h-9 px-2 text-xs">Abbr</TableHead>
                <TableHead className="h-9 px-2 text-xs">Grade</TableHead>
                <TableHead className="h-9 px-2 text-xs">Stock Form</TableHead>
                <TableHead className="h-9 px-2 text-xs">State</TableHead>
                <TableHead className="h-9 px-2 text-xs">Application</TableHead>
                <TableHead className="h-9 px-2 text-xs">Regrind</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Regrind %</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Clamp (MPa)</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Eject (°C)</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Melt (°C)</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Mold (°C)</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Density</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Sp. Heat</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Th. Cond.</TableHead>
                <TableHead className="h-9 px-2 text-xs">Location</TableHead>
                <TableHead className="h-9 px-2 text-xs">Year</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Q1</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Q2</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Q3</TableHead>
                <TableHead className="text-right h-9 px-2 text-xs">Q4</TableHead>
                <TableHead className="w-20 h-9 px-2 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={23} className="text-center py-8 text-muted-foreground">
                    Loading materials...
                  </TableCell>
                </TableRow>
              ) : rawMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={23} className="text-center py-8 text-muted-foreground">
                    No materials found. Upload an Excel file to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rawMaterials.map((material) => (
                  <TableRow key={material.id} className="hover:bg-secondary/30">
                    <TableCell className="font-medium p-2 text-xs">
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">{material.materialGroup}</Badge>
                    </TableCell>
                    <TableCell className="font-medium p-2 text-xs truncate max-w-[120px]" title={material.material}>{material.material}</TableCell>
                    <TableCell className="text-muted-foreground p-2 text-xs">
                      {material.materialAbbreviation || '-'}
                    </TableCell>
                    <TableCell className="p-2 text-xs truncate max-w-[100px]" title={material.materialGrade || ''}>{material.materialGrade || '-'}</TableCell>
                    <TableCell className="p-2 text-xs">{material.stockForm || '-'}</TableCell>
                    <TableCell className="p-2 text-xs">{material.matlState || '-'}</TableCell>
                    <TableCell className="max-w-[100px] truncate p-2 text-xs" title={material.application || ''}>
                      {material.application || '-'}
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      {material.regrinding === 'Yes' ? (
                        <Badge variant="default" className="bg-green-600 text-[10px] px-1 py-0 h-5">Yes</Badge>
                      ) : material.regrinding === 'No' ? (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">No</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.regrindingPercentage ? `${material.regrindingPercentage}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.clampingPressureMpa?.toFixed(1) || '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.ejectDeflectionTempC?.toFixed(0) || '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.meltingTempC?.toFixed(0) || '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.moldTempC?.toFixed(0) || '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.densityKgM3?.toFixed(0) || '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.specificHeatMelt?.toFixed(2) || '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.thermalConductivityMelt?.toFixed(3) || '-'}
                    </TableCell>
                    <TableCell className="p-2 text-xs">{material.location || '-'}</TableCell>
                    <TableCell className="p-2 text-xs">{material.year || '-'}</TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.q1Cost ? `₹${material.q1Cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.q2Cost ? `₹${material.q2Cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.q3Cost ? `₹${material.q3Cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right p-2 text-xs">
                      {material.q4Cost ? `₹${material.q4Cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMaterial(material)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMaterial(material.id, material.material)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
