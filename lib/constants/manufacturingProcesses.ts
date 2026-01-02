/**
 * Manufacturing Processes Database
 * Comprehensive process parameters, machine data, and cost calculations
 */

export const MANUFACTURING_PROCESSES = [
  { id: 1, name: 'Bending', category: 'Sheet Metal' },
  { id: 2, name: 'Casting', category: 'Casting' },
  { id: 3, name: 'CNC Machine', category: 'Machining' },
  { id: 4, name: 'Cutting', category: 'Sheet Metal' },
  { id: 5, name: 'Fabrication', category: 'Fabrication' },
  { id: 6, name: 'Finishing Options', category: 'Post Processing' },
  { id: 7, name: 'Forging', category: 'Forging' },
  { id: 8, name: 'Forming', category: 'Sheet Metal' },
  { id: 9, name: 'Grinding', category: 'Machining' },
  { id: 10, name: 'Heat Treatment', category: 'Post Processing' },
  { id: 11, name: 'Heating Furnace', category: 'Equipment' },
  { id: 12, name: 'Injection Molding', category: 'Plastic & Rubber' },
  { id: 13, name: 'Material Handling', category: 'Equipment' },
  { id: 14, name: 'Shearing', category: 'Sheet Metal' },
  { id: 15, name: 'Welding', category: 'Fabrication' },
] as const;

// BENDING PROCESS DATA
export const BENDING_MACHINES = [
  {
    type: 'Press Brake',
    tonnage: '40 Ton',
    maxLength: 1250,
    maxThickness: 3,
    cycleTime: 15,
    setupTime: 20,
    mhr: 450,
    powerConsumption: 5.5,
  },
  {
    type: 'Press Brake',
    tonnage: '63 Ton',
    maxLength: 2000,
    maxThickness: 4,
    cycleTime: 18,
    setupTime: 25,
    mhr: 550,
    powerConsumption: 7.5,
  },
  {
    type: 'Press Brake',
    tonnage: '100 Ton',
    maxLength: 3000,
    maxThickness: 6,
    cycleTime: 20,
    setupTime: 30,
    mhr: 650,
    powerConsumption: 11,
  },
  {
    type: 'Press Brake',
    tonnage: '160 Ton',
    maxLength: 4000,
    maxThickness: 8,
    cycleTime: 25,
    setupTime: 35,
    mhr: 800,
    powerConsumption: 15,
  },
] as const;

export const BENDING_COMPLEXITY_FACTORS = [
  { complexity: 'Simple', bendCount: '1-2', factor: 1.0 },
  { complexity: 'Medium', bendCount: '3-5', factor: 1.3 },
  { complexity: 'Complex', bendCount: '6-10', factor: 1.6 },
  { complexity: 'Very Complex', bendCount: '10+', factor: 2.0 },
] as const;

// CASTING PROCESS DATA
export const CASTING_PROCESSES = [
  {
    process: 'Sand Casting',
    materialYield: 0.70,
    toolingCost: 50000,
    minOrderQty: 100,
    cycleTime: 180,
    setupTime: 120,
    accuracy: '±1mm',
    surfaceFinish: 'Ra 12.5',
    mhr: 350,
  },
  {
    process: 'Die Casting',
    materialYield: 0.85,
    toolingCost: 300000,
    minOrderQty: 1000,
    cycleTime: 45,
    setupTime: 60,
    accuracy: '±0.3mm',
    surfaceFinish: 'Ra 3.2',
    mhr: 550,
  },
  {
    process: 'Investment Casting',
    materialYield: 0.75,
    toolingCost: 80000,
    minOrderQty: 200,
    cycleTime: 300,
    setupTime: 180,
    accuracy: '±0.5mm',
    surfaceFinish: 'Ra 6.3',
    mhr: 450,
  },
  {
    process: 'Gravity Casting',
    materialYield: 0.80,
    toolingCost: 150000,
    minOrderQty: 500,
    cycleTime: 90,
    setupTime: 90,
    accuracy: '±0.8mm',
    surfaceFinish: 'Ra 6.3',
    mhr: 400,
  },
] as const;

// CNC MACHINING DATA
export const CNC_MACHINES = [
  {
    type: 'CNC Lathe',
    capacity: 'Ø200 x 400mm',
    spindle: '3000 RPM',
    toolStations: 12,
    cycleTimePerPart: 8,
    setupTime: 45,
    mhr: 600,
    powerConsumption: 8,
  },
  {
    type: 'CNC Milling 3-Axis',
    capacity: '600 x 400 x 400mm',
    spindle: '8000 RPM',
    toolStations: 16,
    cycleTimePerPart: 15,
    setupTime: 60,
    mhr: 750,
    powerConsumption: 12,
  },
  {
    type: 'CNC Milling 5-Axis',
    capacity: '800 x 600 x 500mm',
    spindle: '12000 RPM',
    toolStations: 24,
    cycleTimePerPart: 20,
    setupTime: 90,
    mhr: 1200,
    powerConsumption: 18,
  },
  {
    type: 'VMC',
    capacity: '1000 x 600 x 600mm',
    spindle: '10000 RPM',
    toolStations: 20,
    cycleTimePerPart: 18,
    setupTime: 75,
    mhr: 850,
    powerConsumption: 15,
  },
] as const;

export const MACHINING_MATERIAL_FACTORS = [
  { material: 'Aluminum', machinabilityIndex: 1.0, toolLife: 1.0 },
  { material: 'Mild Steel', machinabilityIndex: 0.7, toolLife: 0.8 },
  { material: 'Stainless Steel 304', machinabilityIndex: 0.5, toolLife: 0.6 },
  { material: 'Brass', machinabilityIndex: 1.2, toolLife: 1.1 },
  { material: 'Copper', machinabilityIndex: 0.9, toolLife: 0.9 },
  { material: 'Titanium', machinabilityIndex: 0.3, toolLife: 0.4 },
  { material: 'Cast Iron', machinabilityIndex: 0.6, toolLife: 0.7 },
] as const;

// CUTTING PROCESS DATA
export const CUTTING_MACHINES = [
  {
    type: 'Laser Cutting',
    power: '3 kW',
    maxThickness: { steel: 12, aluminum: 8, stainless: 10 },
    cuttingSpeed: { steel: 4, aluminum: 6, stainless: 3.5 },
    setupTime: 15,
    mhr: 850,
    powerConsumption: 20,
    accuracy: '±0.1mm',
  },
  {
    type: 'Plasma Cutting',
    power: '100 A',
    maxThickness: { steel: 25, aluminum: 20, stainless: 20 },
    cuttingSpeed: { steel: 2.5, aluminum: 3, stainless: 2 },
    setupTime: 10,
    mhr: 450,
    powerConsumption: 15,
    accuracy: '±0.5mm',
  },
  {
    type: 'Water Jet',
    pressure: '4000 Bar',
    maxThickness: { steel: 150, aluminum: 150, stainless: 150 },
    cuttingSpeed: { steel: 1.5, aluminum: 2, stainless: 1.2 },
    setupTime: 20,
    mhr: 950,
    powerConsumption: 30,
    accuracy: '±0.2mm',
  },
  {
    type: 'Shearing Machine',
    capacity: '6mm x 3000mm',
    maxThickness: { steel: 6, aluminum: 8, stainless: 5 },
    cuttingSpeed: { steel: 15, aluminum: 20, stainless: 12 },
    setupTime: 5,
    mhr: 350,
    powerConsumption: 7.5,
    accuracy: '±0.5mm',
  },
] as const;

// WELDING DATA
export const WELDING_PROCESSES = [
  {
    process: 'MIG Welding',
    wireConsumption: 1.2, // kg/hr
    gasConsumption: 15, // L/min
    efficiency: 0.85,
    weldSpeed: 250, // mm/min
    setupTime: 10,
    mhr: 400,
    powerConsumption: 5,
  },
  {
    process: 'TIG Welding',
    wireConsumption: 0.8,
    gasConsumption: 10,
    efficiency: 0.75,
    weldSpeed: 150,
    setupTime: 15,
    mhr: 550,
    powerConsumption: 4,
  },
  {
    process: 'Spot Welding',
    efficiency: 0.90,
    cycleTime: 5, // seconds
    setupTime: 20,
    mhr: 450,
    powerConsumption: 25,
  },
  {
    process: 'Arc Welding',
    electrodeConsumption: 1.5,
    efficiency: 0.70,
    weldSpeed: 200,
    setupTime: 10,
    mhr: 350,
    powerConsumption: 6,
  },
] as const;

// FORGING DATA
export const FORGING_PROCESSES = [
  {
    process: 'Hot Forging',
    temperature: '1200°C',
    materialYield: 0.75,
    cycleTime: 45,
    setupTime: 90,
    toolingCost: 200000,
    mhr: 650,
    energyConsumption: 50, // kWh per ton
  },
  {
    process: 'Cold Forging',
    temperature: 'Room Temp',
    materialYield: 0.90,
    cycleTime: 25,
    setupTime: 60,
    toolingCost: 250000,
    mhr: 700,
    energyConsumption: 30,
  },
  {
    process: 'Warm Forging',
    temperature: '750°C',
    materialYield: 0.85,
    cycleTime: 35,
    setupTime: 75,
    toolingCost: 220000,
    mhr: 675,
    energyConsumption: 40,
  },
] as const;

// GRINDING DATA
export const GRINDING_MACHINES = [
  {
    type: 'Surface Grinder',
    tableSize: '600 x 300mm',
    accuracy: '±0.002mm',
    surfaceFinish: 'Ra 0.4',
    cycleTime: 25,
    setupTime: 30,
    mhr: 550,
    powerConsumption: 5,
  },
  {
    type: 'Cylindrical Grinder',
    capacity: 'Ø200 x 500mm',
    accuracy: '±0.001mm',
    surfaceFinish: 'Ra 0.2',
    cycleTime: 20,
    setupTime: 40,
    mhr: 650,
    powerConsumption: 6,
  },
  {
    type: 'Centerless Grinder',
    capacity: 'Ø3-100mm',
    accuracy: '±0.005mm',
    surfaceFinish: 'Ra 0.8',
    cycleTime: 15,
    setupTime: 45,
    mhr: 700,
    powerConsumption: 8,
  },
] as const;

// HEAT TREATMENT DATA
export const HEAT_TREATMENT_PROCESSES = [
  {
    process: 'Annealing',
    temperature: '700-900°C',
    soakTime: 60, // minutes per 25mm thickness
    coolingMethod: 'Furnace Cooling',
    cycleTime: 240,
    costPerKg: 25,
    energyPerKg: 0.8, // kWh
  },
  {
    process: 'Hardening',
    temperature: '800-950°C',
    soakTime: 30,
    coolingMethod: 'Oil/Water Quench',
    cycleTime: 180,
    costPerKg: 35,
    energyPerKg: 1.2,
  },
  {
    process: 'Tempering',
    temperature: '150-650°C',
    soakTime: 45,
    coolingMethod: 'Air Cooling',
    cycleTime: 120,
    costPerKg: 20,
    energyPerKg: 0.6,
  },
  {
    process: 'Normalizing',
    temperature: '850-950°C',
    soakTime: 40,
    coolingMethod: 'Air Cooling',
    cycleTime: 150,
    costPerKg: 30,
    energyPerKg: 1.0,
  },
  {
    process: 'Carburizing',
    temperature: '900-950°C',
    soakTime: 120,
    coolingMethod: 'Oil Quench',
    cycleTime: 360,
    costPerKg: 55,
    energyPerKg: 2.0,
  },
] as const;

// FINISHING OPTIONS
export const FINISHING_PROCESSES = [
  {
    process: 'Powder Coating',
    coverage: 5, // m² per kg
    thickness: '60-120 microns',
    cycleTime: 30,
    cureTime: 15,
    costPerSqm: 45,
    setupCost: 500,
  },
  {
    process: 'Wet Painting',
    coverage: 8,
    thickness: '40-80 microns',
    cycleTime: 25,
    cureTime: 60,
    costPerSqm: 35,
    setupCost: 300,
  },
  {
    process: 'Electroplating',
    thickness: '5-25 microns',
    cycleTime: 45,
    costPerSqm: 120,
    setupCost: 800,
  },
  {
    process: 'Anodizing',
    thickness: '10-25 microns',
    cycleTime: 60,
    costPerSqm: 85,
    setupCost: 600,
  },
  {
    process: 'Polishing',
    surfaceFinish: 'Ra 0.1-0.4',
    cycleTime: 20,
    costPerSqm: 150,
    setupCost: 200,
  },
] as const;

// INJECTION MOLDING DETAILED DATA
export const INJECTION_MOLDING_MACHINES = [
  {
    tonnage: 80,
    shotWeight: 86, // grams
    dayLightOpening: 300, // mm
    tieBarSpacing: 280,
    cycleTime: 30,
    mhr: 450,
    powerConsumption: 12,
  },
  {
    tonnage: 120,
    shotWeight: 130,
    dayLightOpening: 380,
    tieBarSpacing: 350,
    cycleTime: 35,
    mhr: 520,
    powerConsumption: 16,
  },
  {
    tonnage: 180,
    shotWeight: 220,
    dayLightOpening: 450,
    tieBarSpacing: 420,
    cycleTime: 40,
    mhr: 600,
    powerConsumption: 22,
  },
  {
    tonnage: 250,
    shotWeight: 350,
    dayLightOpening: 550,
    tieBarSpacing: 520,
    cycleTime: 45,
    mhr: 700,
    powerConsumption: 28,
  },
] as const;

// RAW MATERIAL DATABASE
export const RAW_MATERIALS = [
  {
    category: 'Steel',
    grade: 'MS (IS 2062)',
    density: 7850,
    pricePerKg: 65,
    yieldStrength: 250,
    tensileStrength: 410,
  },
  {
    category: 'Steel',
    grade: 'SS 304',
    density: 8000,
    pricePerKg: 320,
    yieldStrength: 215,
    tensileStrength: 505,
  },
  {
    category: 'Aluminum',
    grade: '6061-T6',
    density: 2700,
    pricePerKg: 280,
    yieldStrength: 276,
    tensileStrength: 310,
  },
  {
    category: 'Plastic',
    grade: 'ABS',
    density: 1050,
    pricePerKg: 180,
    meltingPoint: 210,
    moldTemp: 70,
  },
  {
    category: 'Plastic',
    grade: 'PP',
    density: 900,
    pricePerKg: 120,
    meltingPoint: 160,
    moldTemp: 50,
  },
] as const;

// MATERIAL HANDLING EQUIPMENT
export const MATERIAL_HANDLING = [
  {
    equipment: 'Overhead Crane',
    capacity: '5 Ton',
    operatingCostPerHour: 250,
    setupTime: 10,
    safetyFactor: 1.5,
  },
  {
    equipment: 'Forklift',
    capacity: '3 Ton',
    operatingCostPerHour: 180,
    setupTime: 5,
    safetyFactor: 1.3,
  },
  {
    equipment: 'Conveyor System',
    capacity: '500 kg/hr',
    operatingCostPerHour: 120,
    setupTime: 15,
    efficiency: 0.90,
  },
] as const;
