import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateProcessDto, UpdateProcessDto, QueryProcessesDto } from './dto/processes.dto';
import { ProcessResponseDto, ProcessListResponseDto } from './dto/process-response.dto';

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
        user_id: userId,
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
}
