import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectsDto } from './dto/projects.dto';
import { ProjectResponseDto, ProjectListResponseDto } from './dto/project-response.dto';
import { validate as isValidUUID } from 'uuid';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) {}

  async findAll(query: QueryProjectsDto, userId: string, accessToken: string): Promise<ProjectListResponseDto> {
    this.logger.log('Fetching all projects', 'ProjectsService');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100); // Cap at 100 for performance
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Apply search filter
    if (query.search) {
      queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    }

    // Apply status filter
    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      this.logger.error(`Error fetching projects: ${error.message}`, 'ProjectsService');
      throw new InternalServerErrorException(`Failed to fetch projects: ${error.message}`);
    }

    // Transform using static DTO method (type-safe)
    const projects = (data || []).map(row => ProjectResponseDto.fromDatabase(row));

    return {
      projects,
      total: count || 0,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string, accessToken: string): Promise<ProjectResponseDto> {
    this.logger.log(`Fetching project: ${id}`, 'ProjectsService');

    // Validate UUID format
    if (!this.isValidUUID(id)) {
      this.logger.warn(`Invalid UUID format provided: ${id}`, 'ProjectsService');
      throw new BadRequestException('Invalid project ID format');
    }

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      // Distinguish between different error types
      if (error?.code === 'PGRST116') {
        // PostgreSQL "no rows returned" error
        this.logger.warn(`Project not found: ${id}`, 'ProjectsService');
      } else if (error) {
        this.logger.error(`Database error while fetching project ${id}: ${error.message}`, 'ProjectsService');
      } else {
        this.logger.warn(`Project not found (no data): ${id}`, 'ProjectsService');
      }
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return ProjectResponseDto.fromDatabase(data);
  }

  /**
   * Validate UUID format to prevent invalid queries
   */
  private isValidUUID(id: string): boolean {
    try {
      return isValidUUID(id);
    } catch {
      return false;
    }
  }

  async create(createProjectDto: CreateProjectDto, userId: string, accessToken: string): Promise<ProjectResponseDto> {
    this.logger.log(`Creating project for user: ${userId}`, 'ProjectsService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('projects')
      .insert({
        name: createProjectDto.name,
        description: createProjectDto.description,
        status: createProjectDto.status || 'draft',
        quoted_cost: createProjectDto.quotedCost,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating project: ${error.message}`, 'ProjectsService');
      throw new InternalServerErrorException(`Failed to create project: ${error.message}`);
    }

    if (!data) {
      this.logger.error('Project creation returned no data', 'ProjectsService');
      throw new InternalServerErrorException('Failed to create project: No data returned');
    }

    return ProjectResponseDto.fromDatabase(data);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string, accessToken: string): Promise<ProjectResponseDto> {
    this.logger.log(`Updating project: ${id}`, 'ProjectsService');

    // Validate UUID format early
    if (!this.isValidUUID(id)) {
      this.logger.warn(`Invalid UUID format for update: ${id}`, 'ProjectsService');
      throw new BadRequestException('Invalid project ID format');
    }

    // Verify project exists and belongs to user (RLS enforces ownership)
    await this.findOne(id, userId, accessToken);

    const updateData: any = {};
    if (updateProjectDto.name !== undefined) updateData.name = updateProjectDto.name;
    if (updateProjectDto.description !== undefined) updateData.description = updateProjectDto.description;
    if (updateProjectDto.status !== undefined) updateData.status = updateProjectDto.status;
    if (updateProjectDto.quotedCost !== undefined) updateData.quoted_cost = updateProjectDto.quotedCost;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating project: ${error.message}`, 'ProjectsService');
      throw new InternalServerErrorException(`Failed to update project: ${error.message}`);
    }

    return ProjectResponseDto.fromDatabase(data);
  }

  async remove(id: string, userId: string, accessToken: string) {
    this.logger.log(`Deleting project: ${id}`, 'ProjectsService');

    // Validate UUID format early
    if (!this.isValidUUID(id)) {
      this.logger.warn(`Invalid UUID format for delete: ${id}`, 'ProjectsService');
      throw new BadRequestException('Invalid project ID format');
    }

    // Verify project exists and belongs to user (RLS enforces ownership)
    await this.findOne(id, userId, accessToken);

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting project: ${error.message}`, 'ProjectsService');
      throw new InternalServerErrorException(`Failed to delete project: ${error.message}`);
    }

    return { message: 'Project deleted successfully' };
  }

  async getCostAnalysis(id: string, userId: string, accessToken: string) {
    this.logger.log(`Getting cost analysis for project: ${id}`, 'ProjectsService');

    // Validate UUID format early
    if (!this.isValidUUID(id)) {
      this.logger.warn(`Invalid UUID format for cost analysis: ${id}`, 'ProjectsService');
      throw new BadRequestException('Invalid project ID format');
    }

    // Verify user owns this project
    const project = await this.findOne(id, userId, accessToken);

    // Single optimized query using database function
    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .rpc('get_project_cost_analysis', { project_id_input: id });

    if (error) {
      this.logger.error(`Error fetching cost analysis: ${error.message}`, 'ProjectsService');
      throw new InternalServerErrorException(`Failed to fetch cost analysis: ${error.message}`);
    }

    // RPC returns array with single row
    const analysis = Array.isArray(data) ? data[0] : data;

    return {
      projectId: project.id,
      projectName: project.name,
      totalBOMs: Number(analysis?.total_boms || 0),
      totalItems: Number(analysis?.total_items || 0),
      estimatedCost: Number(analysis?.estimated_cost || 0),
      quotedCost: project.quotedCost || 0,
      costDifference: (project.quotedCost || 0) - Number(analysis?.estimated_cost || 0),
    };
  }
}
