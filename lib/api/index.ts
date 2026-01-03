/**
 * EMITHRAN API Client
 *
 * Centralized exports for all API modules
 */

export { apiClient, ApiError } from './client';
export { authApi } from './auth';
export { projectsApi } from './projects';
export { vendorsApi } from './vendors';
export { bomApi } from './bom';
export { calculatorsApi } from './calculators';

export type {
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from './auth';

export type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectQuery,
  ProjectsResponse,
} from './projects';

export type {
  Vendor,
  CreateVendorData,
  UpdateVendorData,
  VendorQuery,
  VendorsResponse,
  VendorPerformance,
} from './vendors';

export type {
  BOM,
  BOMItem,
  CreateBOMData,
  UpdateBOMData,
  BOMQuery,
  BOMsResponse,
  BOMCostBreakdown,
} from './bom';

export type {
  Calculator,
  CalculatorField,
  CalculatorFormula,
  CalculatorExecution,
  CreateCalculatorData,
  UpdateCalculatorData,
  CreateFieldData,
  UpdateFieldData,
  CreateFormulaData,
  UpdateFormulaData,
  ExecuteCalculatorData,
  SaveExecutionData,
  CalculatorQuery,
  ExecutionQuery,
  CalculatorListResponse,
  ExecutionListResponse,
  ExecutionResult,
  FormulaValidationResult,
  LookupRecord,
  CalculatorType,
  FieldType,
  DataSource,
  FormulaType,
  DisplayFormat,
} from './calculators';
