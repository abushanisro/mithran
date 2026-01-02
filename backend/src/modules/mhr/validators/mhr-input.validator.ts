/**
 * MHR Input Validation Service
 * Implements manufacturing cost engineering validation rules
 * Following industry best practices and data integrity standards
 */

import { BadRequestException } from '@nestjs/common';
import { MHR_CALCULATION_CONSTANTS } from '../constants/mhr-calculation.constants';
import { CreateMHRDto, UpdateMHRDto } from '../dto/mhr.dto';

export interface ValidationError {
  field: string;
  value: any;
  message: string;
  expectedRange?: { min: number; max: number };
}

export class MHRInputValidator {
  private errors: ValidationError[] = [];

  /**
   * Validate all input parameters according to industry standards
   */
  validate(dto: CreateMHRDto | UpdateMHRDto): { isValid: boolean; errors: ValidationError[] } {
    this.errors = [];

    // Validate operational parameters
    this.validateOperationalHours(dto);

    // Validate financial parameters
    this.validateFinancialParameters(dto);

    // Validate physical parameters
    this.validatePhysicalParameters(dto);

    // Validate business logic rules
    this.validateBusinessRules(dto);

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
    };
  }

  /**
   * Validate and throw exception if validation fails
   */
  validateAndThrow(dto: CreateMHRDto | UpdateMHRDto): void {
    const result = this.validate(dto);
    if (!result.isValid) {
      const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }
  }

  /**
   * Validate operational hours parameters
   */
  private validateOperationalHours(dto: CreateMHRDto | UpdateMHRDto): void {
    const { VALIDATION_RANGES } = MHR_CALCULATION_CONSTANTS;

    // Shifts per day
    if (dto.shiftsPerDay !== undefined) {
      this.validateRange(
        'shiftsPerDay',
        dto.shiftsPerDay,
        VALIDATION_RANGES.SHIFTS_PER_DAY
      );
    }

    // Hours per shift
    if (dto.hoursPerShift !== undefined) {
      this.validateRange(
        'hoursPerShift',
        dto.hoursPerShift,
        VALIDATION_RANGES.HOURS_PER_SHIFT
      );
    }

    // Working days per year
    if (dto.workingDaysPerYear !== undefined) {
      this.validateRange(
        'workingDaysPerYear',
        dto.workingDaysPerYear,
        VALIDATION_RANGES.WORKING_DAYS_PER_YEAR
      );
    }

    // Capacity utilization rate
    if (dto.capacityUtilizationRate !== undefined) {
      this.validateRange(
        'capacityUtilizationRate',
        dto.capacityUtilizationRate,
        VALIDATION_RANGES.CAPACITY_UTILIZATION_RATE
      );
    }

    // Planned maintenance hours
    if (dto.plannedMaintenanceHoursPerYear !== undefined && dto.shiftsPerDay !== undefined && dto.hoursPerShift !== undefined && dto.workingDaysPerYear !== undefined) {
      const maxWorkingHours = (dto.shiftsPerDay || 3) * (dto.hoursPerShift || 8) * (dto.workingDaysPerYear || 260);
      if (dto.plannedMaintenanceHoursPerYear < 0) {
        this.addError('plannedMaintenanceHoursPerYear', dto.plannedMaintenanceHoursPerYear, 'Planned maintenance hours cannot be negative');
      }
      if (dto.plannedMaintenanceHoursPerYear >= maxWorkingHours) {
        this.addError('plannedMaintenanceHoursPerYear', dto.plannedMaintenanceHoursPerYear, `Planned maintenance hours (${dto.plannedMaintenanceHoursPerYear}) cannot exceed total working hours (${maxWorkingHours})`);
      }
    }
  }

  /**
   * Validate financial parameters
   */
  private validateFinancialParameters(dto: CreateMHRDto | UpdateMHRDto): void {
    const { VALIDATION_RANGES } = MHR_CALCULATION_CONSTANTS;

    // Landed machine cost (must be positive)
    if (dto.landedMachineCost !== undefined && dto.landedMachineCost <= 0) {
      this.addError('landedMachineCost', dto.landedMachineCost, 'Landed machine cost must be greater than zero');
    }

    // Payback period
    if (dto.paybackPeriodYears !== undefined) {
      this.validateRange(
        'paybackPeriodYears',
        dto.paybackPeriodYears,
        VALIDATION_RANGES.PAYBACK_PERIOD_YEARS
      );
    }

    // Interest rate
    if (dto.interestRatePercentage !== undefined) {
      this.validateRange(
        'interestRatePercentage',
        dto.interestRatePercentage,
        VALIDATION_RANGES.INTEREST_RATE
      );
    }

    // Insurance rate
    if (dto.insuranceRatePercentage !== undefined) {
      this.validateRange(
        'insuranceRatePercentage',
        dto.insuranceRatePercentage,
        VALIDATION_RANGES.INSURANCE_RATE
      );
    }

    // Accessories cost percentage
    if (dto.accessoriesCostPercentage !== undefined) {
      this.validateRange(
        'accessoriesCostPercentage',
        dto.accessoriesCostPercentage,
        VALIDATION_RANGES.ACCESSORIES_COST_PERCENTAGE
      );
    }

    // Installation cost percentage
    if (dto.installationCostPercentage !== undefined) {
      this.validateRange(
        'installationCostPercentage',
        dto.installationCostPercentage,
        VALIDATION_RANGES.INSTALLATION_COST_PERCENTAGE
      );
    }

    // Maintenance cost percentage
    if (dto.maintenanceCostPercentage !== undefined) {
      this.validateRange(
        'maintenanceCostPercentage',
        dto.maintenanceCostPercentage,
        VALIDATION_RANGES.MAINTENANCE_COST_PERCENTAGE
      );
    }

    // Admin overhead percentage
    if (dto.adminOverheadPercentage !== undefined) {
      this.validateRange(
        'adminOverheadPercentage',
        dto.adminOverheadPercentage,
        VALIDATION_RANGES.ADMIN_OVERHEAD_PERCENTAGE
      );
    }

    // Profit margin percentage
    if (dto.profitMarginPercentage !== undefined) {
      this.validateRange(
        'profitMarginPercentage',
        dto.profitMarginPercentage,
        VALIDATION_RANGES.PROFIT_MARGIN_PERCENTAGE
      );
    }
  }

  /**
   * Validate physical parameters
   */
  private validatePhysicalParameters(dto: CreateMHRDto | UpdateMHRDto): void {
    // Machine footprint (must be non-negative)
    if (dto.machineFootprintSqm !== undefined && dto.machineFootprintSqm < 0) {
      this.addError('machineFootprintSqm', dto.machineFootprintSqm, 'Machine footprint cannot be negative');
    }

    // Rent per sqm per month (must be non-negative)
    if (dto.rentPerSqmPerMonth !== undefined && dto.rentPerSqmPerMonth < 0) {
      this.addError('rentPerSqmPerMonth', dto.rentPerSqmPerMonth, 'Rent per sqm cannot be negative');
    }

    // Power consumption (must be non-negative)
    if (dto.powerKwhPerHour !== undefined && dto.powerKwhPerHour < 0) {
      this.addError('powerKwhPerHour', dto.powerKwhPerHour, 'Power consumption cannot be negative');
    }

    // Electricity cost (must be non-negative)
    if (dto.electricityCostPerKwh !== undefined && dto.electricityCostPerKwh < 0) {
      this.addError('electricityCostPerKwh', dto.electricityCostPerKwh, 'Electricity cost cannot be negative');
    }
  }

  /**
   * Validate complex business rules
   */
  private validateBusinessRules(dto: CreateMHRDto | UpdateMHRDto): void {
    // Rule: Total cost percentages should be reasonable
    const totalPercentages =
      (dto.accessoriesCostPercentage || 0) +
      (dto.installationCostPercentage || 0) +
      (dto.maintenanceCostPercentage || 0) +
      (dto.adminOverheadPercentage || 0) +
      (dto.profitMarginPercentage || 0);

    if (totalPercentages > 150) {
      this.addError('totalPercentages', totalPercentages, 'Combined cost percentages exceed reasonable limits (>150%)');
    }

    // Rule: If power consumption exists, electricity cost must exist
    if ((dto.powerKwhPerHour || 0) > 0 && (dto.electricityCostPerKwh || 0) === 0) {
      this.addError('electricityCostPerKwh', dto.electricityCostPerKwh, 'Electricity cost per KWH must be specified when power consumption is provided');
    }

    // Rule: If footprint exists, rent should exist (warning level)
    if ((dto.machineFootprintSqm || 0) > 0 && (dto.rentPerSqmPerMonth || 0) === 0) {
      // This is a warning, not an error - could be owned land
      // We don't add to errors, but could be logged
    }
  }

  /**
   * Validate a value against a defined range
   */
  private validateRange(
    field: string,
    value: number,
    range: { min: number; max: number; message: string }
  ): void {
    if (value < range.min || value > range.max) {
      this.addError(field, value, range.message, { min: range.min, max: range.max });
    }
  }

  /**
   * Add a validation error
   */
  private addError(
    field: string,
    value: any,
    message: string,
    expectedRange?: { min: number; max: number }
  ): void {
    this.errors.push({
      field,
      value,
      message,
      expectedRange,
    });
  }
}
