/**
 * Lookup Tables Constants
 * Manufacturing reference data and lookup tables
 */

export const COMMODITY_LIST = [
  { id: 1, name: 'Sheet Metal' },
  { id: 2, name: 'Fabrication' },
  { id: 3, name: 'Machining' },
  { id: 4, name: 'Casting + Machining' },
  { id: 5, name: 'Forging + Machining' },
  { id: 6, name: 'Plastic & Rubber' },
  { id: 7, name: 'Electrical' },
  { id: 8, name: 'Electronics' },
  { id: 9, name: 'Standard Parts' },
  { id: 10, name: 'Assembly' },
  { id: 11, name: 'Post Processing' },
] as const;

export const POST_PROCESSING_TYPES = [
  { code: 'PP1', description: 'Heat Treatment' },
  { code: 'PP2', description: 'Surface Coating' },
  { code: 'PP3', description: 'Painting' },
  { code: 'PP4', description: 'Plating' },
  { code: 'PP5', description: 'Anodizing' },
  { code: 'PP6', description: 'Polishing' },
  { code: 'PP7', description: 'Deburring' },
  { code: 'PP8', description: 'Other' },
] as const;

export const MATERIAL_CATEGORIES = [
  'Plastic',
  'Metal',
  'Rubber',
  'Composite',
] as const;

export const PLASTIC_FAMILIES = [
  'PP',
  'ABS',
  'PC',
  'PA',
  'PE',
  'POM',
  'PMMA',
  'PBT',
  'PS',
] as const;

export const PLASTIC_GRADES = [
  { grade: 'PP + 20%GF', density: 1.04, regrind: 'No' },
  { grade: 'PP Natural', density: 0.90, regrind: 'Yes' },
  { grade: 'ABS', density: 1.05, regrind: 'Yes' },
  { grade: 'PC', density: 1.20, regrind: 'No' },
  { grade: 'PA6', density: 1.13, regrind: 'Yes' },
  { grade: 'PA66', density: 1.14, regrind: 'Yes' },
  { grade: 'PE-HD', density: 0.95, regrind: 'Yes' },
  { grade: 'PE-LD', density: 0.92, regrind: 'Yes' },
  { grade: 'POM', density: 1.41, regrind: 'No' },
  { grade: 'PMMA', density: 1.18, regrind: 'No' },
] as const;

export const VISCOSITY_TABLE = [
  { material: 'GPPS', grade: 1.0 },
  { material: 'TPS', grade: 1.0 },
  { material: 'PE', grade: 1.0 },
  { material: 'HIPS', grade: 1.0 },
  { material: 'PS', grade: 1.0 },
  { material: 'PP', grade: 1.0 },
  { material: 'PA', grade: 1.33 },
  { material: 'PETP', grade: 1.33 },
  { material: 'PBT', grade: 1.33 },
  { material: 'CAB', grade: 1.4 },
  { material: 'CP', grade: 1.4 },
  { material: 'PEEL', grade: 1.4 },
  { material: 'TPU', grade: 1.4 },
  { material: 'CA', grade: 1.4 },
  { material: 'CAP', grade: 1.4 },
  { material: 'EVA', grade: 1.4 },
  { material: 'PUR', grade: 1.4 },
  { material: 'PPVC', grade: 1.4 },
  { material: 'ABS', grade: 1.5 },
  { material: 'ASA', grade: 1.5 },
  { material: 'MBS', grade: 1.5 },
  { material: 'PPOM', grade: 1.5 },
  { material: 'POM', grade: 1.5 },
  { material: 'SAN', grade: 1.5 },
  { material: 'PPS', grade: 1.5 },
  { material: 'BDS', grade: 1.5 },
  { material: 'PC', grade: 1.61 },
  { material: 'PC/PBT', grade: 1.61 },
  { material: 'PMMA', grade: 1.61 },
  { material: 'PC/ABS', grade: 1.61 },
  { material: 'PES', grade: 1.8 },
  { material: 'PEI', grade: 1.8 },
  { material: 'UPVC', grade: 1.8 },
  { material: 'PSU', grade: 1.8 },
  { material: 'PEEK', grade: 1.8 },
  { material: 'Add Fiber Glass', grade: 1.8 },
  { material: 'Other Engineering Plastic', grade: 1.8 },
] as const;

export const CAVITY_PRESSURE_TABLE = [
  { flowRatio: 50, pressure: 100 },
  { flowRatio: 60, pressure: 110 },
  { flowRatio: 70, pressure: 120 },
  { flowRatio: 80, pressure: 130 },
  { flowRatio: 90, pressure: 140 },
  { flowRatio: 100, pressure: 150 },
  { flowRatio: 110, pressure: 160 },
  { flowRatio: 120, pressure: 170 },
  { flowRatio: 130, pressure: 180 },
  { flowRatio: 140, pressure: 190 },
  { flowRatio: 150, pressure: 200 },
  { flowRatio: 160, pressure: 206 },
  { flowRatio: 170, pressure: 212 },
  { flowRatio: 180, pressure: 218 },
  { flowRatio: 190, pressure: 224 },
  { flowRatio: 200, pressure: 230 },
  { flowRatio: 210, pressure: 244 },
  { flowRatio: 220, pressure: 258 },
  { flowRatio: 230, pressure: 272 },
  { flowRatio: 240, pressure: 286 },
  { flowRatio: 250, pressure: 300 },
  { flowRatio: 260, pressure: 350 },
  { flowRatio: 270, pressure: 400 },
  { flowRatio: 280, pressure: 405 },
  { flowRatio: 290, pressure: 410 },
  { flowRatio: 300, pressure: 420 },
] as const;

export const CAVITIES_RECOMMENDATION = [
  { eau: '< 50,000', cavities: 1 },
  { eau: '50,000 - 2,00,000', cavities: 2 },
  { eau: '2,00,000 - 6,00,000', cavities: 4 },
  { eau: '6,00,000 - 30,00,000', cavities: 8 },
  { eau: '30,00,000 - 1,00,00,000', cavities: 16 },
  { eau: '> 1,00,00,000', cavities: 32 },
] as const;

export const RUNNER_DIA_TABLE = [
  { weight: '≤ 0', diameter: 0 },
  { weight: '≤ 20', diameter: 3 },
  { weight: '≤ 50', diameter: 4 },
  { weight: '≤ 100', diameter: 5 },
  { weight: '≤ 250', diameter: 6 },
  { weight: 'Above', diameter: 7 },
] as const;

export const INSPECTION_METHODS = [
  { code: 'Op-1', rate: 144 },
  { code: 'Op-2', rate: 289 },
  { code: 'Op-3', rate: 433 },
  { code: 'Se-1', rate: 216 },
  { code: 'Se-2', rate: 433 },
  { code: 'Se-3', rate: 649 },
  { code: 'USL-1', rate: 72 },
  { code: 'USL-2', rate: 144 },
  { code: 'SSL-1', rate: 108 },
  { code: 'SSL-2', rate: 216 },
  { code: 'Wel-1', rate: 144 },
  { code: 'Wel-2', rate: 289 },
  { code: 'Wel-3', rate: 433 },
  { code: 'NA', rate: 0 },
] as const;

export const MACHINE_PARAMETERS = {
  injectionRate: 130, // kg/hr
  pressureHoldingTime: 2, // seconds
  slideLifterTime: 4, // seconds
  dryCycleTime: 3, // seconds
  ejectionTime: 2.5, // seconds
  pickPlaceTime: 3, // seconds
  thermalConductivity: 0.127, // W/mC
  specificHeat: 1.8, // J/gC
  thermalDiffusivity: 0.07, // mm^2/s
} as const;
