/**
 * Frontend MHR Calculation Utility
 * Mirrors backend calculation engine for real-time calculations
 */

export interface MHRInputs {
  // Operational Parameters
  shiftsPerDay: number;
  hoursPerShift: number;
  workingDaysPerYear: number;
  plannedMaintenanceHoursPerYear: number;
  capacityUtilizationRate: number;

  // Capital & Financial
  landedMachineCost: number;
  accessoriesCostPercentage: number;
  installationCostPercentage: number;
  paybackPeriodYears: number;
  interestRatePercentage: number;
  insuranceRatePercentage: number;
  maintenanceCostPercentage: number;

  // Physical & Other
  machineFootprintSqm: number;
  rentPerSqmPerMonth: number;
  powerKwhPerHour: number;
  electricityCostPerKwh: number;
  adminOverheadPercentage: number;
  profitMarginPercentage: number;
}

export interface MHRCalculations {
  // Working Hours
  workingHoursPerYear: number;
  availableHoursPerYear: number;
  effectiveHoursPerYear: number;

  // Capital Investment
  accessoriesCost: number;
  installationCost: number;
  totalCapitalInvestment: number;

  // Annual Costs
  depreciationPerAnnum: number;
  interestPerAnnum: number;
  insurancePerAnnum: number;
  rentPerAnnum: number;
  maintenancePerAnnum: number;
  electricityPerAnnum: number;
  totalFixedCostPerAnnum: number;
  totalVariableCostPerAnnum: number;
  totalAnnualCost: number;

  // Per Hour Costs
  depreciationPerHour: number;
  interestPerHour: number;
  insurancePerHour: number;
  rentPerHour: number;
  maintenancePerHour: number;
  electricityPerHour: number;

  // Cost Categories
  costOfOwnershipPerHour: number;
  totalFixedCostPerHour: number;
  totalVariableCostPerHour: number;
  totalOperatingCostPerHour: number;

  // Overheads and Margins
  adminOverheadPerHour: number;
  profitMarginPerHour: number;
  totalMachineHourRate: number;
}

const PRECISION = {
  HOURS: 2,
  CURRENCY: 2,
  RATE: 2,
  PERCENTAGE: 2,
};

const MONTHS_PER_YEAR = 12;

function round(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

export function calculateMHR(inputs: MHRInputs): MHRCalculations {
  // Step 1: Calculate working hours
  const workingHoursPerYear = inputs.shiftsPerDay * inputs.hoursPerShift * inputs.workingDaysPerYear;
  const availableHoursPerYear = workingHoursPerYear - inputs.plannedMaintenanceHoursPerYear;
  const effectiveHoursPerYear = availableHoursPerYear * (inputs.capacityUtilizationRate / 100);

  // Step 2: Calculate capital investment
  const accessoriesCost = inputs.landedMachineCost * (inputs.accessoriesCostPercentage / 100);
  const baseForInstallation = inputs.landedMachineCost + accessoriesCost;
  const installationCost = baseForInstallation * (inputs.installationCostPercentage / 100);
  const totalCapitalInvestment = inputs.landedMachineCost + accessoriesCost + installationCost;

  // Step 3: Calculate annual costs
  const depreciationPerAnnum = totalCapitalInvestment / inputs.paybackPeriodYears;
  const interestPerAnnum = depreciationPerAnnum * (inputs.interestRatePercentage / 100); // Interest on depreciation
  const insurancePerAnnum = totalCapitalInvestment * (inputs.insuranceRatePercentage / 100);
  const rentPerAnnum = inputs.machineFootprintSqm * inputs.rentPerSqmPerMonth * MONTHS_PER_YEAR;
  const maintenancePerAnnum = totalCapitalInvestment * (inputs.maintenanceCostPercentage / 100); // On total capital
  const electricityPerAnnum = inputs.powerKwhPerHour * inputs.electricityCostPerKwh * effectiveHoursPerYear;

  const totalFixedCostPerAnnum =
    depreciationPerAnnum +
    interestPerAnnum +
    insurancePerAnnum +
    rentPerAnnum +
    maintenancePerAnnum;

  const totalVariableCostPerAnnum = electricityPerAnnum;
  const totalAnnualCost = totalFixedCostPerAnnum + totalVariableCostPerAnnum;

  // Step 4: Calculate per-hour costs
  const depreciationPerHour = effectiveHoursPerYear > 0 ? depreciationPerAnnum / effectiveHoursPerYear : 0;
  const interestPerHour = effectiveHoursPerYear > 0 ? interestPerAnnum / effectiveHoursPerYear : 0;
  const insurancePerHour = effectiveHoursPerYear > 0 ? insurancePerAnnum / effectiveHoursPerYear : 0;
  const rentPerHour = effectiveHoursPerYear > 0 ? rentPerAnnum / effectiveHoursPerYear : 0;
  const maintenancePerHour = effectiveHoursPerYear > 0 ? maintenancePerAnnum / effectiveHoursPerYear : 0;
  const electricityPerHour = effectiveHoursPerYear > 0 ? electricityPerAnnum / effectiveHoursPerYear : 0;

  // Step 5: Calculate cost categories
  const costOfOwnershipPerHour =
    depreciationPerHour +
    interestPerHour +
    insurancePerHour +
    rentPerHour;

  const totalFixedCostPerHour = costOfOwnershipPerHour + maintenancePerHour;
  const totalVariableCostPerHour = electricityPerHour;
  const totalOperatingCostPerHour = totalFixedCostPerHour + totalVariableCostPerHour;

  // Step 6: Calculate final MHR with overheads and margins
  const adminOverheadPerHour = totalOperatingCostPerHour * (inputs.adminOverheadPercentage / 100);
  const subtotalBeforeProfit = totalOperatingCostPerHour + adminOverheadPerHour;
  const profitMarginPerHour = subtotalBeforeProfit * (inputs.profitMarginPercentage / 100);
  const totalMachineHourRate = subtotalBeforeProfit + profitMarginPerHour;

  // Return with proper rounding
  return {
    workingHoursPerYear: round(workingHoursPerYear, PRECISION.HOURS),
    availableHoursPerYear: round(availableHoursPerYear, PRECISION.HOURS),
    effectiveHoursPerYear: round(effectiveHoursPerYear, PRECISION.HOURS),

    accessoriesCost: round(accessoriesCost, PRECISION.CURRENCY),
    installationCost: round(installationCost, PRECISION.CURRENCY),
    totalCapitalInvestment: round(totalCapitalInvestment, PRECISION.CURRENCY),

    depreciationPerAnnum: round(depreciationPerAnnum, PRECISION.CURRENCY),
    interestPerAnnum: round(interestPerAnnum, PRECISION.CURRENCY),
    insurancePerAnnum: round(insurancePerAnnum, PRECISION.CURRENCY),
    rentPerAnnum: round(rentPerAnnum, PRECISION.CURRENCY),
    maintenancePerAnnum: round(maintenancePerAnnum, PRECISION.CURRENCY),
    electricityPerAnnum: round(electricityPerAnnum, PRECISION.CURRENCY),
    totalFixedCostPerAnnum: round(totalFixedCostPerAnnum, PRECISION.CURRENCY),
    totalVariableCostPerAnnum: round(totalVariableCostPerAnnum, PRECISION.CURRENCY),
    totalAnnualCost: round(totalAnnualCost, PRECISION.CURRENCY),

    depreciationPerHour: round(depreciationPerHour, PRECISION.RATE),
    interestPerHour: round(interestPerHour, PRECISION.RATE),
    insurancePerHour: round(insurancePerHour, PRECISION.RATE),
    rentPerHour: round(rentPerHour, PRECISION.RATE),
    maintenancePerHour: round(maintenancePerHour, PRECISION.RATE),
    electricityPerHour: round(electricityPerHour, PRECISION.RATE),

    costOfOwnershipPerHour: round(costOfOwnershipPerHour, PRECISION.RATE),
    totalFixedCostPerHour: round(totalFixedCostPerHour, PRECISION.RATE),
    totalVariableCostPerHour: round(totalVariableCostPerHour, PRECISION.RATE),
    totalOperatingCostPerHour: round(totalOperatingCostPerHour, PRECISION.RATE),

    adminOverheadPerHour: round(adminOverheadPerHour, PRECISION.RATE),
    profitMarginPerHour: round(profitMarginPerHour, PRECISION.RATE),
    totalMachineHourRate: round(totalMachineHourRate, PRECISION.RATE),
  };
}
