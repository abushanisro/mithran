/**
 * MHR (Machine Hour Rate) API
 */

import { apiClient } from './client';

export type MHRCalculationResult = {
  workingHoursPerYear: number;
  availableHoursPerYear: number;
  effectiveHoursPerYear: number;
  depreciationPerHour: number;
  interestPerHour: number;
  insurancePerHour: number;
  rentPerHour: number;
  maintenancePerHour: number;
  electricityPerHour: number;
  costOfOwnershipPerHour: number;
  totalFixedCostPerHour: number;
  totalVariableCostPerHour: number;
  totalOperatingCostPerHour: number;
  adminOverheadPerHour: number;
  profitMarginPerHour: number;
  totalMachineHourRate: number;
  depreciationPerAnnum: number;
  interestPerAnnum: number;
  insurancePerAnnum: number;
  rentPerAnnum: number;
  maintenancePerAnnum: number;
  electricityPerAnnum: number;
  totalFixedCostPerAnnum: number;
  totalVariableCostPerAnnum: number;
  totalAnnualCost: number;
  accessoriesCost: number;
  installationCost: number;
  totalCapitalInvestment: number;
};

export type MHRRecord = {
  id: string;
  userId: string;
  location: string;
  commodityCode: string;
  machineDescription?: string;
  manufacturer?: string;
  model?: string;
  machineName: string;
  specification?: string;
  shiftsPerDay: number;
  hoursPerShift: number;
  workingDaysPerYear: number;
  plannedMaintenanceHoursPerYear: number;
  capacityUtilizationRate: number;
  landedMachineCost: number;
  accessoriesCostPercentage: number;
  installationCostPercentage: number;
  paybackPeriodYears: number;
  interestRatePercentage: number;
  insuranceRatePercentage: number;
  machineFootprintSqm: number;
  rentPerSqmPerMonth: number;
  maintenanceCostPercentage: number;
  powerKwhPerHour: number;
  electricityCostPerKwh: number;
  adminOverheadPercentage: number;
  profitMarginPercentage: number;
  calculations: MHRCalculationResult;
  createdAt: string;
  updatedAt: string;
};

export type CreateMHRData = {
  location: string;
  commodityCode: string;
  machineDescription?: string;
  manufacturer?: string;
  model?: string;
  machineName: string;
  specification?: string;
  shiftsPerDay: number;
  hoursPerShift: number;
  workingDaysPerYear: number;
  plannedMaintenanceHoursPerYear: number;
  capacityUtilizationRate: number;
  landedMachineCost: number;
  accessoriesCostPercentage: number;
  installationCostPercentage: number;
  paybackPeriodYears: number;
  interestRatePercentage: number;
  insuranceRatePercentage: number;
  machineFootprintSqm: number;
  rentPerSqmPerMonth: number;
  maintenanceCostPercentage: number;
  powerKwhPerHour: number;
  electricityCostPerKwh: number;
  adminOverheadPercentage: number;
  profitMarginPercentage: number;
};

export type UpdateMHRData = Partial<CreateMHRData>;

export type MHRQuery = {
  search?: string;
  location?: string;
  commodityCode?: string;
  page?: number;
  limit?: number;
};

export type MHRListResponse = {
  records: MHRRecord[];
  total: number;
  page: number;
  limit: number;
};

export const mhrApi = {
  /**
   * Get all MHR records
   */
  getAll: async (query?: MHRQuery): Promise<MHRListResponse> => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.location) params.append('location', query.location);
    if (query?.commodityCode) params.append('commodityCode', query.commodityCode);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    return apiClient.get<MHRListResponse>(
      `/mhr${queryString ? `?${queryString}` : ''}`,
    );
  },

  /**
   * Get MHR record by ID
   */
  getById: async (id: string): Promise<MHRRecord> => {
    return apiClient.get<MHRRecord>(`/mhr/${id}`);
  },

  /**
   * Create new MHR record
   */
  create: async (data: CreateMHRData): Promise<MHRRecord> => {
    return apiClient.post<MHRRecord>('/mhr', data);
  },

  /**
   * Update MHR record
   */
  update: async (id: string, data: UpdateMHRData): Promise<MHRRecord> => {
    return apiClient.put<MHRRecord>(`/mhr/${id}`, data);
  },

  /**
   * Delete MHR record
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/mhr/${id}`);
  },
};
