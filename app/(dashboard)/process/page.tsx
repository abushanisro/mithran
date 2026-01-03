'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { X, Edit2, Trash2, Plus, Save, XCircle } from 'lucide-react';
import {
  MANUFACTURING_PROCESSES,
  BENDING_MACHINES,
  BENDING_COMPLEXITY_FACTORS,
  CASTING_PROCESSES,
  CNC_MACHINES,
  MACHINING_MATERIAL_FACTORS,
  CUTTING_MACHINES,
  WELDING_PROCESSES,
  FORGING_PROCESSES,
  GRINDING_MACHINES,
  HEAT_TREATMENT_PROCESSES,
  FINISHING_PROCESSES,
  INJECTION_MOLDING_MACHINES,
} from '@/lib/constants/manufacturingProcesses';

// Injection Molding - Cavity Pressure Data
const INITIAL_CAVITY_PRESSURE_DATA = [
  { flowPath: 50, pressure: 100 },
  { flowPath: 60, pressure: 110 },
  { flowPath: 70, pressure: 120 },
  { flowPath: 80, pressure: 130 },
  { flowPath: 90, pressure: 140 },
  { flowPath: 100, pressure: 150 },
  { flowPath: 110, pressure: 160 },
  { flowPath: 120, pressure: 170 },
  { flowPath: 130, pressure: 180 },
  { flowPath: 140, pressure: 190 },
  { flowPath: 150, pressure: 200 },
  { flowPath: 160, pressure: 206 },
  { flowPath: 170, pressure: 212 },
  { flowPath: 180, pressure: 218 },
  { flowPath: 190, pressure: 224 },
  { flowPath: 200, pressure: 230 },
  { flowPath: 210, pressure: 244 },
  { flowPath: 220, pressure: 258 },
  { flowPath: 230, pressure: 272 },
  { flowPath: 240, pressure: 286 },
  { flowPath: 250, pressure: 300 },
  { flowPath: 260, pressure: 350 },
  { flowPath: 270, pressure: 400 },
  { flowPath: 280, pressure: 405 },
  { flowPath: 290, pressure: 410 },
  { flowPath: 300, pressure: 420 },
];

// Injection Molding - Viscosity Data
const INITIAL_VISCOSITY_DATA = [
  { material: 'GPPS', viscosity: 1.00 },
  { material: 'TPS', viscosity: 1.00 },
  { material: 'PE', viscosity: 1.00 },
  { material: 'HIPS', viscosity: 1.00 },
  { material: 'PS', viscosity: 1.00 },
  { material: 'PP', viscosity: 1.00 },
  { material: 'PA', viscosity: 1.33 },
  { material: 'PETP', viscosity: 1.33 },
  { material: 'PBT', viscosity: 1.33 },
  { material: 'CAB', viscosity: 1.40 },
  { material: 'CP', viscosity: 1.40 },
  { material: 'PEEL', viscosity: 1.40 },
  { material: 'TPU', viscosity: 1.40 },
  { material: 'CA', viscosity: 1.40 },
  { material: 'CAP', viscosity: 1.40 },
  { material: 'EVA', viscosity: 1.40 },
  { material: 'PUR', viscosity: 1.40 },
  { material: 'PPVC', viscosity: 1.40 },
  { material: 'ABS', viscosity: 1.50 },
  { material: 'ASA', viscosity: 1.50 },
  { material: 'MBS', viscosity: 1.50 },
  { material: 'PPOM', viscosity: 1.50 },
  { material: 'POM', viscosity: 1.50 },
  { material: 'SAN', viscosity: 1.50 },
  { material: 'PPS', viscosity: 1.50 },
  { material: 'BDS', viscosity: 1.50 },
  { material: 'PC', viscosity: 1.61 },
  { material: 'PC/PBT', viscosity: 1.61 },
  { material: 'PMMA', viscosity: 1.61 },
  { material: 'PC/ABS', viscosity: 1.61 },
  { material: 'PES', viscosity: 1.80 },
  { material: 'PEI', viscosity: 1.80 },
  { material: 'UPVC', viscosity: 1.80 },
  { material: 'PSU', viscosity: 1.80 },
  { material: 'PEEK', viscosity: 1.80 },
  { material: 'Add Fiber Glass', viscosity: 1.80 },
  { material: 'Other Engineering Plastic', viscosity: 1.80 },
];

// Injection Molding - Cavities Recommendation Data
const INITIAL_CAVITIES_RECOMMENDATION_DATA = [
  { eau: '< 50,000', cavities: 1 },
  { eau: '50,000 - 2,00,000', cavities: 2 },
  { eau: '2,00,000 - 6,00,000', cavities: 4 },
  { eau: '6,00,000 - 30,00,000', cavities: 8 },
  { eau: '30,00,000 - 1,00,00,000', cavities: 16 },
  { eau: '> 1,00,00,000', cavities: 32 },
];

// Injection Molding - Runner Diameter Data
const INITIAL_RUNNER_DIA_DATA = [
  { partWeight: '≤ 20', runnerDia: 3 },
  { partWeight: '≤ 50', runnerDia: 4 },
  { partWeight: '≤ 100', runnerDia: 5 },
  { partWeight: '≤ 250', runnerDia: 6 },
  { partWeight: 'Above 250', runnerDia: '7-9' },
];

export default function ProcessPage() {
  const [selectedProcess, setSelectedProcess] = useState<number | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);

  // State for editable tables
  const [cavityPressureData, setCavityPressureData] = useState(INITIAL_CAVITY_PRESSURE_DATA);
  const [viscosityData, setViscosityData] = useState(INITIAL_VISCOSITY_DATA);
  const [cavitiesRecommendationData, setCavitiesRecommendationData] = useState(INITIAL_CAVITIES_RECOMMENDATION_DATA);
  const [runnerDiaData, setRunnerDiaData] = useState(INITIAL_RUNNER_DIA_DATA);

  const handleProcessClick = (processId: number) => {
    setSelectedProcess(processId === selectedProcess ? null : processId);
    setEditingTable(null);
  };

  const handleEditTable = (tableName: string) => {
    setEditingTable(tableName);
  };

  const handleCancelEdit = () => {
    setEditingTable(null);
  };

  const handleSaveTable = () => {
    setEditingTable(null);
    // Here you would typically save to backend/localStorage
    console.log('Table saved successfully');
  };

  // Add new row handlers
  const handleAddCavityPressureRow = () => {
    setCavityPressureData([...cavityPressureData, { flowPath: 0, pressure: 0 }]);
  };

  const handleAddViscosityRow = () => {
    setViscosityData([...viscosityData, { material: '', viscosity: 1.0 }]);
  };

  const handleAddCavitiesRecommendationRow = () => {
    setCavitiesRecommendationData([...cavitiesRecommendationData, { eau: '', cavities: 1 }]);
  };

  const handleAddRunnerDiaRow = () => {
    setRunnerDiaData([...runnerDiaData, { partWeight: '', runnerDia: '' }]);
  };

  // Delete row handlers
  const handleDeleteCavityPressureRow = (index: number) => {
    setCavityPressureData(cavityPressureData.filter((_, i) => i !== index));
  };

  const handleDeleteViscosityRow = (index: number) => {
    setViscosityData(viscosityData.filter((_, i) => i !== index));
  };

  const handleDeleteCavitiesRecommendationRow = (index: number) => {
    setCavitiesRecommendationData(cavitiesRecommendationData.filter((_, i) => i !== index));
  };

  const handleDeleteRunnerDiaRow = (index: number) => {
    setRunnerDiaData(runnerDiaData.filter((_, i) => i !== index));
  };

  // Update row handlers
  const updateCavityPressureRow = (index: number, field: string, value: any) => {
    const updated = [...cavityPressureData];
    updated[index] = { ...updated[index], [field]: Number(value) } as typeof updated[number];
    setCavityPressureData(updated);
  };

  const updateViscosityRow = (index: number, field: string, value: any) => {
    const updated = [...viscosityData];
    updated[index] = { ...updated[index], [field]: field === 'viscosity' ? Number(value) : value } as typeof updated[number];
    setViscosityData(updated);
  };

  const updateCavitiesRecommendationRow = (index: number, field: string, value: any) => {
    const updated = [...cavitiesRecommendationData];
    updated[index] = { ...updated[index], [field]: field === 'cavities' ? Number(value) : value } as typeof updated[number];
    setCavitiesRecommendationData(updated);
  };

  const updateRunnerDiaRow = (index: number, field: string, value: any) => {
    const updated = [...runnerDiaData];
    updated[index] = { ...updated[index], [field]: value } as typeof updated[number];
    setRunnerDiaData(updated);
  };

  const renderEditableTable = (
    tableName: string,
    tableTitle: string,
    columns: { key: string; label: string; type?: string }[],
    data: any[],
    onUpdate: (index: number, field: string, value: any) => void,
    onDelete: (index: number) => void,
    onAdd: () => void
  ) => {
    const isEditing = editingTable === tableName;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{tableTitle}</CardTitle>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTable(tableName)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveTable}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.key !== columns[0]?.key ? 'text-right' : ''}>
                      {col.label}
                    </TableHead>
                  ))}
                  {isEditing && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.key !== columns[0]?.key ? 'text-right' : ''}>
                        {isEditing ? (
                          <Input
                            type={col.type || 'text'}
                            value={row[col.key]}
                            onChange={(e) => onUpdate(idx, col.key, e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          <span className={col.key === columns[0]?.key ? 'font-medium' : ''}>
                            {row[col.key]}
                          </span>
                        )}
                      </TableCell>
                    ))}
                    {isEditing && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(idx)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isEditing && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Row
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderProcessTables = () => {
    if (!selectedProcess) return null;

    const process = MANUFACTURING_PROCESSES.find(p => p.id === selectedProcess);
    if (!process) return null;

    return (
      <Card className="mt-6 border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{process.name} - Reference Tables</CardTitle>
              <CardDescription>Click Edit to modify tables, add or remove rows</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedProcess(null)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {process.name === 'Injection Molding' && (
              <>
                {/* Cavity Pressure Table */}
                {renderEditableTable(
                  'cavityPressure',
                  'Cavity Pressure Table',
                  [
                    { key: 'flowPath', label: 'Flow Path Ratio', type: 'number' },
                    { key: 'pressure', label: 'Pressure (Bar)', type: 'number' },
                  ],
                  cavityPressureData,
                  updateCavityPressureRow,
                  handleDeleteCavityPressureRow,
                  handleAddCavityPressureRow
                )}

                {/* Viscosity Table */}
                {renderEditableTable(
                  'viscosity',
                  'Material Viscosity Table',
                  [
                    { key: 'material', label: 'Material', type: 'text' },
                    { key: 'viscosity', label: 'Viscosity (K₀)', type: 'number' },
                  ],
                  viscosityData,
                  updateViscosityRow,
                  handleDeleteViscosityRow,
                  handleAddViscosityRow
                )}

                {/* Machine Specifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Specifications</CardTitle>
                    <CardDescription>Injection molding machine parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tonnage</TableHead>
                          <TableHead className="text-right">Shot Weight (g)</TableHead>
                          <TableHead className="text-right">Cycle Time (s)</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {INJECTION_MOLDING_MACHINES.map((machine, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{machine.tonnage} Ton</TableCell>
                            <TableCell className="text-right">{machine.shotWeight}</TableCell>
                            <TableCell className="text-right">{machine.cycleTime}</TableCell>
                            <TableCell className="text-right">₹{machine.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Cavities Recommendation */}
                {renderEditableTable(
                  'cavitiesRecommendation',
                  'Cavities Recommendation',
                  [
                    { key: 'eau', label: 'EAU (Annual Usage)', type: 'text' },
                    { key: 'cavities', label: 'Cavities', type: 'number' },
                  ],
                  cavitiesRecommendationData,
                  updateCavitiesRecommendationRow,
                  handleDeleteCavitiesRecommendationRow,
                  handleAddCavitiesRecommendationRow
                )}

                {/* Runner Diameter */}
                <div className="lg:col-span-2">
                  {renderEditableTable(
                    'runnerDia',
                    'Runner Diameter Selection',
                    [
                      { key: 'partWeight', label: 'Part Weight (grams)', type: 'text' },
                      { key: 'runnerDia', label: 'Runner Diameter (mm)', type: 'text' },
                    ],
                    runnerDiaData,
                    updateRunnerDiaRow,
                    handleDeleteRunnerDiaRow,
                    handleAddRunnerDiaRow
                  )}
                </div>
              </>
            )}

            {process.name === 'Bending' && (
              <>
                {/* Bending Machines */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Press Brake Specifications</CardTitle>
                    <CardDescription>Available bending machines and parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tonnage</TableHead>
                          <TableHead>Max Length (mm)</TableHead>
                          <TableHead>Max Thickness (mm)</TableHead>
                          <TableHead className="text-right">Cycle Time (s)</TableHead>
                          <TableHead className="text-right">Setup (min)</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {BENDING_MACHINES.map((machine, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{machine.tonnage}</TableCell>
                            <TableCell>{machine.maxLength}</TableCell>
                            <TableCell>{machine.maxThickness}</TableCell>
                            <TableCell className="text-right">{machine.cycleTime}</TableCell>
                            <TableCell className="text-right">{machine.setupTime}</TableCell>
                            <TableCell className="text-right">₹{machine.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Complexity Factors */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Complexity Factors</CardTitle>
                    <CardDescription>Time multipliers based on bend complexity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Complexity Level</TableHead>
                          <TableHead>Bend Count</TableHead>
                          <TableHead className="text-right">Time Factor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {BENDING_COMPLEXITY_FACTORS.map((factor, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{factor.complexity}</TableCell>
                            <TableCell>{factor.bendCount}</TableCell>
                            <TableCell className="text-right">{factor.factor}x</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'Casting' && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Casting Process Parameters</CardTitle>
                    <CardDescription>Different casting methods and specifications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          <TableHead className="text-right">Yield %</TableHead>
                          <TableHead className="text-right">Tooling (₹)</TableHead>
                          <TableHead className="text-right">Min Order</TableHead>
                          <TableHead className="text-right">Accuracy</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {CASTING_PROCESSES.map((proc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{proc.process}</TableCell>
                            <TableCell className="text-right">{(proc.materialYield * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-right">₹{proc.toolingCost.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{proc.minOrderQty}</TableCell>
                            <TableCell className="text-right">{proc.accuracy}</TableCell>
                            <TableCell className="text-right">₹{proc.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'CNC Machine' && (
              <>
                {/* CNC Machines */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>CNC Machine Specifications</CardTitle>
                    <CardDescription>Available CNC machines and capabilities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Machine Type</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Spindle Speed</TableHead>
                          <TableHead className="text-right">Tools</TableHead>
                          <TableHead className="text-right">Setup (min)</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {CNC_MACHINES.map((machine, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{machine.type}</TableCell>
                            <TableCell>{machine.capacity}</TableCell>
                            <TableCell>{machine.spindle}</TableCell>
                            <TableCell className="text-right">{machine.toolStations}</TableCell>
                            <TableCell className="text-right">{machine.setupTime}</TableCell>
                            <TableCell className="text-right">₹{machine.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Material Factors */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Machining Material Factors</CardTitle>
                    <CardDescription>Machinability and tool life by material</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Machinability Index</TableHead>
                          <TableHead className="text-right">Tool Life Factor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MACHINING_MATERIAL_FACTORS.map((material, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{material.material}</TableCell>
                            <TableCell className="text-right">{material.machinabilityIndex}</TableCell>
                            <TableCell className="text-right">{material.toolLife}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'Cutting' && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Cutting Machine Specifications</CardTitle>
                    <CardDescription>Laser, plasma, water jet, and shearing capabilities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Machine Type</TableHead>
                          <TableHead>Power/Capacity</TableHead>
                          <TableHead className="text-right">Steel Thickness (mm)</TableHead>
                          <TableHead className="text-right">Speed (m/min)</TableHead>
                          <TableHead className="text-right">Accuracy</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {CUTTING_MACHINES.map((machine, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{machine.type}</TableCell>
                            <TableCell>{(machine as any).power || (machine as any).capacity || (machine as any).pressure}</TableCell>
                            <TableCell className="text-right">{machine.maxThickness.steel}</TableCell>
                            <TableCell className="text-right">{machine.cuttingSpeed.steel}</TableCell>
                            <TableCell className="text-right">{machine.accuracy}</TableCell>
                            <TableCell className="text-right">₹{machine.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'Welding' && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Welding Process Parameters</CardTitle>
                    <CardDescription>MIG, TIG, Spot, and Arc welding specifications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          <TableHead className="text-right">Efficiency %</TableHead>
                          <TableHead className="text-right">Weld Speed (mm/min)</TableHead>
                          <TableHead className="text-right">Setup (min)</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {WELDING_PROCESSES.map((proc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{proc.process}</TableCell>
                            <TableCell className="text-right">{(proc.efficiency * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-right">{(proc as any).weldSpeed || (proc as any).cycleTime || '-'}</TableCell>
                            <TableCell className="text-right">{proc.setupTime}</TableCell>
                            <TableCell className="text-right">₹{proc.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'Forging' && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Forging Process Parameters</CardTitle>
                    <CardDescription>Hot, cold, and warm forging specifications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          <TableHead>Temperature</TableHead>
                          <TableHead className="text-right">Yield %</TableHead>
                          <TableHead className="text-right">Cycle (s)</TableHead>
                          <TableHead className="text-right">Tooling (₹)</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {FORGING_PROCESSES.map((proc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{proc.process}</TableCell>
                            <TableCell>{proc.temperature}</TableCell>
                            <TableCell className="text-right">{(proc.materialYield * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-right">{proc.cycleTime}</TableCell>
                            <TableCell className="text-right">₹{proc.toolingCost.toLocaleString()}</TableCell>
                            <TableCell className="text-right">₹{proc.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'Grinding' && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Grinding Machine Specifications</CardTitle>
                    <CardDescription>Surface, cylindrical, and centerless grinding</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Machine Type</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead className="text-right">Accuracy</TableHead>
                          <TableHead className="text-right">Surface Finish</TableHead>
                          <TableHead className="text-right">Cycle (min)</TableHead>
                          <TableHead className="text-right">MHR (₹/hr)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {GRINDING_MACHINES.map((machine, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{machine.type}</TableCell>
                            <TableCell>{machine.tableSize || machine.capacity}</TableCell>
                            <TableCell className="text-right">{machine.accuracy}</TableCell>
                            <TableCell className="text-right">{machine.surfaceFinish}</TableCell>
                            <TableCell className="text-right">{machine.cycleTime}</TableCell>
                            <TableCell className="text-right">₹{machine.mhr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'Heat Treatment' && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Heat Treatment Processes</CardTitle>
                    <CardDescription>Annealing, hardening, tempering, normalizing, carburizing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          <TableHead>Temperature</TableHead>
                          <TableHead>Cooling Method</TableHead>
                          <TableHead className="text-right">Soak Time (min)</TableHead>
                          <TableHead className="text-right">Cost/kg (₹)</TableHead>
                          <TableHead className="text-right">Energy (kWh/kg)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {HEAT_TREATMENT_PROCESSES.map((proc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{proc.process}</TableCell>
                            <TableCell>{proc.temperature}</TableCell>
                            <TableCell>{proc.coolingMethod}</TableCell>
                            <TableCell className="text-right">{proc.soakTime}</TableCell>
                            <TableCell className="text-right">₹{proc.costPerKg}</TableCell>
                            <TableCell className="text-right">{proc.energyPerKg}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {process.name === 'Finishing Options' && (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Surface Finishing Processes</CardTitle>
                    <CardDescription>Powder coating, painting, plating, anodizing, polishing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          <TableHead>Thickness</TableHead>
                          <TableHead className="text-right">Cycle Time (min)</TableHead>
                          <TableHead className="text-right">Cost/m² (₹)</TableHead>
                          <TableHead className="text-right">Setup (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {FINISHING_PROCESSES.map((proc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{proc.process}</TableCell>
                            <TableCell>{proc.thickness || '-'}</TableCell>
                            <TableCell className="text-right">{proc.cycleTime}</TableCell>
                            <TableCell className="text-right">₹{proc.costPerSqm}</TableCell>
                            <TableCell className="text-right">₹{proc.setupCost}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Default message for processes without detailed tables */}
            {!['Injection Molding', 'Bending', 'Casting', 'CNC Machine', 'Cutting', 'Welding', 'Forging', 'Grinding', 'Heat Treatment', 'Finishing Options'].includes(process.name) && (
              <Card className="lg:col-span-2">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Detailed reference tables for {process.name} will be added soon.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process"
        description="Click on any process to view, edit, and manage detailed specifications"
      />

      <div className="space-y-6">
        {/* MANUFACTURING PROCESSES */}
        <Card>
          <CardHeader>
            <CardTitle>Manufacturing Processes</CardTitle>
            <CardDescription>Click on a process to view and edit reference tables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {MANUFACTURING_PROCESSES.map((process) => (
                <Card
                  key={process.id}
                  className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedProcess === process.id
                      ? 'border-l-primary bg-primary/5 shadow-md'
                      : 'border-l-primary/30'
                  }`}
                  onClick={() => handleProcessClick(process.id)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{process.name}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {process.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PROCESS-SPECIFIC TABLES */}
        {renderProcessTables()}
      </div>
    </div>
  );
}
