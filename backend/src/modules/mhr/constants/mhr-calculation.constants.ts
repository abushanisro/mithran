/**
 * MHR Calculation Constants
 * Industry-standard constants following manufacturing cost engineering best practices
 * Based on ISO 31000 and APQP guidelines
 */

export const MHR_CALCULATION_CONSTANTS = {
  /**
   * Precision standards for financial calculations
   * Following standard accounting practices
   */
  PRECISION: {
    CURRENCY: 2, // Indian Rupees - 2 decimal places
    PERCENTAGE: 2, // Percentages - 2 decimal places
    HOURS: 2, // Hours - 2 decimal places
    RATE: 2, // Rates per hour - 2 decimal places
  },

  /**
   * Default values based on industry standards
   * Source: Manufacturing Industry Standards (India)
   */
  DEFAULTS: {
    SHIFTS_PER_DAY: 3,
    HOURS_PER_SHIFT: 8,
    WORKING_DAYS_PER_YEAR: 260, // Excluding Sundays and national holidays
    CAPACITY_UTILIZATION_RATE: 85, // Conservative industry average
    PAYBACK_PERIOD_YEARS: 10,
    INTEREST_RATE: 8, // Current MCLR + spread
    INSURANCE_RATE: 1, // Standard industrial insurance
    ACCESSORIES_COST_PERCENTAGE: 6,
    INSTALLATION_COST_PERCENTAGE: 20,
    MAINTENANCE_COST_PERCENTAGE: 6,
  },

  /**
   * Validation ranges based on manufacturing standards
   */
  VALIDATION_RANGES: {
    SHIFTS_PER_DAY: { min: 1, max: 3, message: 'Shifts must be between 1 and 3' },
    HOURS_PER_SHIFT: { min: 4, max: 12, message: 'Hours per shift must be between 4 and 12' },
    WORKING_DAYS_PER_YEAR: { min: 200, max: 365, message: 'Working days must be between 200 and 365' },
    CAPACITY_UTILIZATION_RATE: { min: 50, max: 100, message: 'Capacity utilization must be between 50% and 100%' },
    PAYBACK_PERIOD_YEARS: { min: 3, max: 20, message: 'Payback period must be between 3 and 20 years' },
    INTEREST_RATE: { min: 5, max: 15, message: 'Interest rate must be between 5% and 15%' },
    INSURANCE_RATE: { min: 0.5, max: 3, message: 'Insurance rate must be between 0.5% and 3%' },
    ACCESSORIES_COST_PERCENTAGE: { min: 0, max: 20, message: 'Accessories cost must be between 0% and 20%' },
    INSTALLATION_COST_PERCENTAGE: { min: 10, max: 40, message: 'Installation cost must be between 10% and 40%' },
    MAINTENANCE_COST_PERCENTAGE: { min: 3, max: 15, message: 'Maintenance cost must be between 3% and 15%' },
    ADMIN_OVERHEAD_PERCENTAGE: { min: 0, max: 30, message: 'Admin overhead must be between 0% and 30%' },
    PROFIT_MARGIN_PERCENTAGE: { min: 0, max: 50, message: 'Profit margin must be between 0% and 50%' },
  },

  /**
   * Cost category classifications
   * Following standard cost accounting principles
   */
  COST_CATEGORIES: {
    FIXED: {
      DEPRECIATION: 'Depreciation & Amortization',
      INTEREST: 'Interest on Capital Invested',
      INSURANCE: 'Insurance of Assets',
      RENT: 'Rent of Land & Building',
      MAINTENANCE: 'MRO & Consumables',
    },
    VARIABLE: {
      ELECTRICITY: 'Electricity Cost',
    },
    OVERHEAD: {
      ADMIN: 'General Admin Overhead',
    },
    MARGIN: {
      PROFIT: 'Profit Margin',
    },
  },

  /**
   * Calculation method identifiers
   */
  CALCULATION_METHODS: {
    DEPRECIATION: 'STRAIGHT_LINE', // As per Companies Act
    INTEREST: 'ON_DEPRECIATION', // Interest on annual depreciation amount
    INSTALLATION: 'ON_BASE_PLUS_ACCESSORIES', // Installation on (Landed + Accessories)
    MAINTENANCE: 'ON_TOTAL_CAPITAL', // Maintenance on total capital investment
  },

  /**
   * Error tolerance for floating point calculations
   */
  EPSILON: 0.01,

  /**
   * Time constants
   */
  TIME: {
    MONTHS_PER_YEAR: 12,
    WEEKS_PER_YEAR: 52,
  },
} as const;

/**
 * Type definitions for better type safety
 */
export type CostCategory = keyof typeof MHR_CALCULATION_CONSTANTS.COST_CATEGORIES;
export type FixedCostType = keyof typeof MHR_CALCULATION_CONSTANTS.COST_CATEGORIES.FIXED;
export type VariableCostType = keyof typeof MHR_CALCULATION_CONSTANTS.COST_CATEGORIES.VARIABLE;
