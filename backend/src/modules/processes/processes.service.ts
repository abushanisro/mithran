import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import {
  CreateProcessDto,
  UpdateProcessDto,
  QueryProcessesDto,
  CreateReferenceTableDto,
  UpdateReferenceTableDto,
  CreateTableRowDto,
  UpdateTableRowDto,
  BulkUpdateTableRowsDto,
} from './dto/processes.dto';
import { ProcessResponseDto, ProcessListResponseDto } from './dto/process-response.dto';
import {
  CreateProcessCalculatorMappingDto,
  UpdateProcessCalculatorMappingDto,
  QueryProcessCalculatorMappingsDto,
  ProcessCalculatorMappingResponseDto,
  ProcessCalculatorMappingListResponseDto,
  ProcessHierarchyDto,
} from './dto/process-calculator-mapping.dto';

@Injectable()
export class ProcessesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) {}

  async findAll(query: QueryProcessesDto, userId?: string, accessToken?: string): Promise<ProcessListResponseDto> {
    this.logger.log('Fetching all processes', 'ProcessesService');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100); // Cap at 100 for performance
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('processes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Filter by category if specified
    if (query.category) {
      queryBuilder = queryBuilder.eq('process_category', query.category);
    }

    // Filter by machine type if specified
    if (query.machineType) {
      queryBuilder = queryBuilder.eq('machine_type', query.machineType);
    }

    // Apply search filter (search in process_name and description)
    if (query.search) {
      queryBuilder = queryBuilder.or(`process_name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      this.logger.error(`Error fetching processes: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to fetch processes: ${error.message}`);
    }

    // Transform using static DTO method
    const processes = (data || []).map(row => ProcessResponseDto.fromDatabase(row));

    return {
      processes,
      count: count || 0,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string, accessToken: string): Promise<ProcessResponseDto> {
    this.logger.log(`Fetching process: ${id}`, 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('processes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`Process not found: ${id}`, 'ProcessesService');
      throw new NotFoundException(`Process with ID ${id} not found`);
    }

    return ProcessResponseDto.fromDatabase(data);
  }

  async create(createProcessDto: CreateProcessDto, userId: string, accessToken: string): Promise<ProcessResponseDto> {
    this.logger.log('Creating process', 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('processes')
      .insert({
        process_name: createProcessDto.processName,
        process_category: createProcessDto.processCategory,
        description: createProcessDto.description,
        standard_time_minutes: createProcessDto.standardTimeMinutes,
        setup_time_minutes: createProcessDto.setupTimeMinutes,
        cycle_time_minutes: createProcessDto.cycleTimeMinutes,
        machine_required: createProcessDto.machineRequired,
        machine_type: createProcessDto.machineType,
        labor_required: createProcessDto.laborRequired,
        skill_level_required: createProcessDto.skillLevelRequired,
        user_id: userId || null,
      })
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error creating process: ${error?.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to create process: ${error?.message}`);
    }

    return ProcessResponseDto.fromDatabase(data);
  }

  async update(id: string, updateProcessDto: UpdateProcessDto, userId: string, accessToken: string): Promise<ProcessResponseDto> {
    this.logger.log(`Updating process: ${id}`, 'ProcessesService');

    // Build update object with only provided fields
    const updateData: any = {};
    if (updateProcessDto.processName !== undefined) updateData.process_name = updateProcessDto.processName;
    if (updateProcessDto.processCategory !== undefined) updateData.process_category = updateProcessDto.processCategory;
    if (updateProcessDto.description !== undefined) updateData.description = updateProcessDto.description;
    if (updateProcessDto.standardTimeMinutes !== undefined) updateData.standard_time_minutes = updateProcessDto.standardTimeMinutes;
    if (updateProcessDto.setupTimeMinutes !== undefined) updateData.setup_time_minutes = updateProcessDto.setupTimeMinutes;
    if (updateProcessDto.cycleTimeMinutes !== undefined) updateData.cycle_time_minutes = updateProcessDto.cycleTimeMinutes;
    if (updateProcessDto.machineRequired !== undefined) updateData.machine_required = updateProcessDto.machineRequired;
    if (updateProcessDto.machineType !== undefined) updateData.machine_type = updateProcessDto.machineType;
    if (updateProcessDto.laborRequired !== undefined) updateData.labor_required = updateProcessDto.laborRequired;
    if (updateProcessDto.skillLevelRequired !== undefined) updateData.skill_level_required = updateProcessDto.skillLevelRequired;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('processes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error updating process: ${error?.message}`, 'ProcessesService');
      throw new NotFoundException(`Failed to update process with ID ${id}`);
    }

    return ProcessResponseDto.fromDatabase(data);
  }

  async remove(id: string, userId: string, accessToken: string): Promise<{ message: string }> {
    this.logger.log(`Deleting process: ${id}`, 'ProcessesService');

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('processes')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting process: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to delete process: ${error.message}`);
    }

    return { message: 'Process deleted successfully' };
  }

  // ============================================================================
  // REFERENCE TABLES METHODS
  // ============================================================================

  /**
   * Get all reference tables for a process with their rows
   */
  async getReferenceTables(processId: string, accessToken: string): Promise<any[]> {
    this.logger.log(`Fetching reference tables for process: ${processId}`, 'ProcessesService');

    // Get all tables for this process
    const { data: tables, error: tablesError } = await this.supabaseService
      .getClient(accessToken)
      .from('process_reference_tables')
      .select('*')
      .eq('process_id', processId)
      .order('display_order', { ascending: true });

    if (tablesError) {
      this.logger.error(`Error fetching reference tables: ${tablesError.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to fetch reference tables: ${tablesError.message}`);
    }

    // For each table, get its rows
    const tablesWithRows = await Promise.all(
      (tables || []).map(async (table) => {
        const { data: rows, error: rowsError } = await this.supabaseService
          .getClient(accessToken)
          .from('process_table_rows')
          .select('*')
          .eq('table_id', table.id)
          .order('row_order', { ascending: true });

        if (rowsError) {
          this.logger.error(`Error fetching rows for table ${table.id}: ${rowsError.message}`, 'ProcessesService');
          return { ...table, rows: [] };
        }

        return { ...table, rows: rows || [] };
      })
    );

    return tablesWithRows;
  }

  /**
   * Get a specific reference table with its rows
   */
  async getReferenceTable(tableId: string, accessToken: string): Promise<any> {
    this.logger.log(`Fetching reference table: ${tableId}`, 'ProcessesService');

    const { data: table, error: tableError } = await this.supabaseService
      .getClient(accessToken)
      .from('process_reference_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      this.logger.error(`Reference table not found: ${tableId}`, 'ProcessesService');
      throw new NotFoundException(`Reference table with ID ${tableId} not found`);
    }

    // Get rows for this table
    const { data: rows, error: rowsError } = await this.supabaseService
      .getClient(accessToken)
      .from('process_table_rows')
      .select('*')
      .eq('table_id', tableId)
      .order('row_order', { ascending: true });

    if (rowsError) {
      this.logger.error(`Error fetching rows: ${rowsError.message}`, 'ProcessesService');
      return { ...table, rows: [] };
    }

    return { ...table, rows: rows || [] };
  }

  /**
   * Create a new reference table
   */
  async createReferenceTable(dto: CreateReferenceTableDto, accessToken: string): Promise<any> {
    this.logger.log('Creating reference table', 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_reference_tables')
      .insert({
        process_id: dto.processId,
        table_name: dto.tableName,
        table_description: dto.tableDescription,
        column_definitions: dto.columnDefinitions,
        display_order: dto.displayOrder || 0,
        is_editable: dto.isEditable !== undefined ? dto.isEditable : true,
      })
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error creating reference table: ${error?.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to create reference table: ${error?.message}`);
    }

    return data;
  }

  /**
   * Update a reference table
   */
  async updateReferenceTable(tableId: string, dto: UpdateReferenceTableDto, accessToken: string): Promise<any> {
    this.logger.log(`Updating reference table: ${tableId}`, 'ProcessesService');

    const updateData: any = {};
    if (dto.tableName !== undefined) updateData.table_name = dto.tableName;
    if (dto.tableDescription !== undefined) updateData.table_description = dto.tableDescription;
    if (dto.columnDefinitions !== undefined) updateData.column_definitions = dto.columnDefinitions;
    if (dto.displayOrder !== undefined) updateData.display_order = dto.displayOrder;
    if (dto.isEditable !== undefined) updateData.is_editable = dto.isEditable;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_reference_tables')
      .update(updateData)
      .eq('id', tableId)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error updating reference table: ${error?.message}`, 'ProcessesService');
      throw new NotFoundException(`Failed to update reference table with ID ${tableId}`);
    }

    return data;
  }

  /**
   * Delete a reference table (cascade deletes rows)
   */
  async deleteReferenceTable(tableId: string, accessToken: string): Promise<{ message: string }> {
    this.logger.log(`Deleting reference table: ${tableId}`, 'ProcessesService');

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_reference_tables')
      .delete()
      .eq('id', tableId);

    if (error) {
      this.logger.error(`Error deleting reference table: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to delete reference table: ${error.message}`);
    }

    return { message: 'Reference table deleted successfully' };
  }

  /**
   * Add a row to a reference table
   */
  async createTableRow(dto: CreateTableRowDto, accessToken: string): Promise<any> {
    this.logger.log('Creating table row', 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_table_rows')
      .insert({
        table_id: dto.tableId,
        row_data: dto.rowData,
        row_order: dto.rowOrder || 0,
      })
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error creating table row: ${error?.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to create table row: ${error?.message}`);
    }

    return data;
  }

  /**
   * Update a table row
   */
  async updateTableRow(rowId: string, dto: UpdateTableRowDto, accessToken: string): Promise<any> {
    this.logger.log(`Updating table row: ${rowId}`, 'ProcessesService');

    const updateData: any = {};
    if (dto.rowData !== undefined) updateData.row_data = dto.rowData;
    if (dto.rowOrder !== undefined) updateData.row_order = dto.rowOrder;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_table_rows')
      .update(updateData)
      .eq('id', rowId)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error updating table row: ${error?.message}`, 'ProcessesService');
      throw new NotFoundException(`Failed to update table row with ID ${rowId}`);
    }

    return data;
  }

  /**
   * Delete a table row
   */
  async deleteTableRow(rowId: string, accessToken: string): Promise<{ message: string }> {
    this.logger.log(`Deleting table row: ${rowId}`, 'ProcessesService');

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_table_rows')
      .delete()
      .eq('id', rowId);

    if (error) {
      this.logger.error(`Error deleting table row: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to delete table row: ${error.message}`);
    }

    return { message: 'Table row deleted successfully' };
  }

  /**
   * Bulk update table rows (delete old, insert new)
   */
  async bulkUpdateTableRows(dto: BulkUpdateTableRowsDto, accessToken: string): Promise<any[]> {
    this.logger.log(`Bulk updating rows for table: ${dto.tableId}`, 'ProcessesService');

    // Delete all existing rows for this table
    const { error: deleteError } = await this.supabaseService
      .getClient(accessToken)
      .from('process_table_rows')
      .delete()
      .eq('table_id', dto.tableId);

    if (deleteError) {
      this.logger.error(`Error deleting old rows: ${deleteError.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to delete old rows: ${deleteError.message}`);
    }

    // Insert new rows
    const rowsToInsert = dto.rows.map((row) => ({
      table_id: dto.tableId,
      row_data: row.row_data,
      row_order: row.row_order,
    }));

    const { data, error: insertError } = await this.supabaseService
      .getClient(accessToken)
      .from('process_table_rows')
      .insert(rowsToInsert)
      .select();

    if (insertError || !data) {
      this.logger.error(`Error inserting new rows: ${insertError?.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to insert new rows: ${insertError?.message}`);
    }

    return data;
  }

  // ============================================================================
  // PROCESS CALCULATOR MAPPING METHODS
  // ============================================================================

  /**
   * Get all process calculator mappings with optional filters
   */
  async getProcessCalculatorMappings(
    query: QueryProcessCalculatorMappingsDto,
    accessToken: string,
  ): Promise<ProcessCalculatorMappingListResponseDto> {
    this.logger.log('Fetching process calculator mappings', 'ProcessesService');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 1000);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('process_calculator_mappings')
      .select('*', { count: 'exact' })
      .order('display_order', { ascending: true })
      .range(from, to);

    // Apply filters
    if (query.processGroup) {
      queryBuilder = queryBuilder.eq('process_group', query.processGroup);
    }

    if (query.processRoute) {
      queryBuilder = queryBuilder.eq('process_route', query.processRoute);
    }

    if (query.operation) {
      queryBuilder = queryBuilder.eq('operation', query.operation);
    }

    if (query.calculatorId) {
      queryBuilder = queryBuilder.eq('calculator_id', query.calculatorId);
    }

    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.isActive);
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(
        `process_group.ilike.%${query.search}%,process_route.ilike.%${query.search}%,operation.ilike.%${query.search}%,calculator_name.ilike.%${query.search}%`,
      );
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      this.logger.error(`Error fetching process calculator mappings: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to fetch process calculator mappings: ${error.message}`);
    }

    const mappings = (data || []).map((row) => ProcessCalculatorMappingResponseDto.fromDatabase(row));

    return {
      mappings,
      count: count || 0,
      page,
      limit,
    };
  }

  /**
   * Get a specific process calculator mapping by ID
   */
  async getProcessCalculatorMapping(id: string, accessToken: string): Promise<ProcessCalculatorMappingResponseDto> {
    this.logger.log(`Fetching process calculator mapping: ${id}`, 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_calculator_mappings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`Process calculator mapping not found: ${id}`, 'ProcessesService');
      throw new NotFoundException(`Process calculator mapping with ID ${id} not found`);
    }

    return ProcessCalculatorMappingResponseDto.fromDatabase(data);
  }

  /**
   * Create a new process calculator mapping
   */
  async createProcessCalculatorMapping(
    dto: CreateProcessCalculatorMappingDto,
    accessToken: string,
  ): Promise<ProcessCalculatorMappingResponseDto> {
    this.logger.log('Creating process calculator mapping', 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_calculator_mappings')
      .insert({
        process_group: dto.processGroup,
        process_route: dto.processRoute,
        operation: dto.operation,
        calculator_id: dto.calculatorId || null,
        calculator_name: dto.calculatorName || null,
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        display_order: dto.displayOrder || 0,
      })
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error creating process calculator mapping: ${error?.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to create process calculator mapping: ${error?.message}`);
    }

    return ProcessCalculatorMappingResponseDto.fromDatabase(data);
  }

  /**
   * Update a process calculator mapping
   */
  async updateProcessCalculatorMapping(
    id: string,
    dto: UpdateProcessCalculatorMappingDto,
    accessToken: string,
  ): Promise<ProcessCalculatorMappingResponseDto> {
    this.logger.log(`Updating process calculator mapping: ${id}`, 'ProcessesService');

    const updateData: any = {};
    if (dto.processGroup !== undefined) updateData.process_group = dto.processGroup;
    if (dto.processRoute !== undefined) updateData.process_route = dto.processRoute;
    if (dto.operation !== undefined) updateData.operation = dto.operation;
    if (dto.calculatorId !== undefined) updateData.calculator_id = dto.calculatorId;
    if (dto.calculatorName !== undefined) updateData.calculator_name = dto.calculatorName;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.displayOrder !== undefined) updateData.display_order = dto.displayOrder;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_calculator_mappings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error updating process calculator mapping: ${error?.message}`, 'ProcessesService');
      throw new NotFoundException(`Failed to update process calculator mapping with ID ${id}`);
    }

    return ProcessCalculatorMappingResponseDto.fromDatabase(data);
  }

  /**
   * Delete a process calculator mapping
   */
  async deleteProcessCalculatorMapping(id: string, accessToken: string): Promise<{ message: string }> {
    this.logger.log(`Deleting process calculator mapping: ${id}`, 'ProcessesService');

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_calculator_mappings')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting process calculator mapping: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to delete process calculator mapping: ${error.message}`);
    }

    return { message: 'Process calculator mapping deleted successfully' };
  }

  /**
   * Get unique process hierarchy values for filter dropdowns
   */
  async getProcessHierarchy(accessToken: string): Promise<ProcessHierarchyDto> {
    this.logger.log('Fetching process hierarchy', 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('process_calculator_mappings')
      .select('process_group, process_route, operation')
      .eq('is_active', true);

    if (error) {
      this.logger.error(`Error fetching process hierarchy: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to fetch process hierarchy: ${error.message}`);
    }

    const processGroups = [...new Set(data.map((row) => row.process_group))].sort();
    const processRoutes = [...new Set(data.map((row) => row.process_route))].sort();
    const operations = [...new Set(data.map((row) => row.operation))].sort();

    return {
      processGroups,
      processRoutes,
      operations,
    };
  }

  // ============================================================================
  // VENDOR PROCESS CAPABILITIES
  // ============================================================================

  /**
   * Get vendors capable of performing a specific process
   * Uses database function: get_vendors_by_process
   */
  async getVendorsByProcess(processId: string, userId: string, accessToken: string) {
    this.logger.log(`Fetching vendors for process ${processId}`, 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .rpc('get_vendors_by_process', {
        p_process_id: processId,
        p_user_id: userId,
      });

    if (error) {
      this.logger.error(`Error fetching vendors by process: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to fetch vendors: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get processes that a vendor can perform
   * Uses database function: get_processes_by_vendor
   */
  async getProcessesByVendor(vendorId: string, userId: string, accessToken: string) {
    this.logger.log(`Fetching processes for vendor ${vendorId}`, 'ProcessesService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .rpc('get_processes_by_vendor', {
        p_vendor_id: vendorId,
        p_user_id: userId,
      });

    if (error) {
      this.logger.error(`Error fetching processes by vendor: ${error.message}`, 'ProcessesService');
      throw new InternalServerErrorException(`Failed to fetch processes: ${error.message}`);
    }

    return data || [];
  }
}
