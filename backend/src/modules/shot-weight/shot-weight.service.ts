import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateShotWeightDto, UpdateShotWeightDto, QueryShotWeightDto } from './dto/shot-weight.dto';
import { ShotWeightResponseDto, ShotWeightListResponseDto } from './dto/shot-weight-response.dto';
import { validate as isValidUUID } from 'uuid';
import { ShotWeightCalculationEngine } from './engines/shot-weight-calculation.engine';

/**
 * Shot Weight Service
 *
 * Implements injection molding shot weight calculation business logic.
 * Provides CRUD operations with automatic shot weight calculation.
 *
 * Calculation Formulas:
 * - Runner Weight = (π × (D/2)² × L / 1000) × (ρ / 1000)
 * - Total Shot Weight = (Part Weight × Cavities) + (Runner Weight × Cavities)
 * - With optional sprue and cold slug calculations
 *
 * @version 1.0.0
 */
@Injectable()
export class ShotWeightService {
  private readonly calculationEngine: ShotWeightCalculationEngine;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) {
    this.calculationEngine = new ShotWeightCalculationEngine();
  }

  /**
   * Calculate shot weight metrics
   */
  private calculateShotWeight(dto: CreateShotWeightDto | UpdateShotWeightDto) {
    try {
      // Validate inputs
      const validation = this.calculationEngine.validateInputs(dto as CreateShotWeightDto);
      if (!validation.valid) {
        throw new BadRequestException(validation.errors.join(', '));
      }

      // Calculate
      const result = this.calculationEngine.calculate(dto as CreateShotWeightDto);

      this.logger.log('Shot weight calculation completed successfully', 'ShotWeightService');

      return result;
    } catch (error) {
      this.logger.error(`Shot weight calculation failed: ${error.message}`, 'ShotWeightService');
      throw error;
    }
  }

  /**
   * Get all shot weight calculations with pagination and filters
   */
  async findAll(query: QueryShotWeightDto, userId: string, accessToken: string): Promise<ShotWeightListResponseDto> {
    this.logger.log('Fetching all shot weight calculations', 'ShotWeightService');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('shot_weight_calculations')
      .select('*', { count: 'exact' })
      .order(query.sortBy || 'created_at', { ascending: query.sortOrder === 'asc' })
      .range(from, to);

    if (query.search) {
      queryBuilder = queryBuilder.or(`calculation_name.ilike.%${query.search}%,material_grade.ilike.%${query.search}%`);
    }

    if (query.materialGrade) {
      queryBuilder = queryBuilder.eq('material_grade', query.materialGrade);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      this.logger.error(`Error fetching shot weight calculations: ${error.message}`, 'ShotWeightService');
      throw new InternalServerErrorException(`Failed to fetch shot weight calculations: ${error.message}`);
    }

    const records = (data || []).map(row => this.mapDatabaseRowToDto(row));

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: records,
      total: count || 0,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a single shot weight calculation by ID
   */
  async findOne(id: string, userId: string, accessToken: string): Promise<ShotWeightResponseDto> {
    this.logger.log(`Fetching shot weight calculation with ID: ${id}`, 'ShotWeightService');

    if (!isValidUUID(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('shot_weight_calculations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`Shot weight calculation not found: ${id}`, 'ShotWeightService');
      throw new NotFoundException(`Shot weight calculation with ID ${id} not found`);
    }

    return this.mapDatabaseRowToDto(data);
  }

  /**
   * Create a new shot weight calculation
   */
  async create(dto: CreateShotWeightDto, userId: string, accessToken: string): Promise<ShotWeightResponseDto> {
    this.logger.log('Creating new shot weight calculation', 'ShotWeightService');

    // Calculate shot weight
    const calculationResult = this.calculateShotWeight(dto);

    // Prepare data for database
    const dbData = {
      user_id: userId,
      calculation_name: dto.calculationName,
      description: dto.description,
      material_grade: dto.materialGrade,
      density: dto.density,
      density_unit: dto.densityUnit || 'kg/m3',
      volume: dto.volume,
      volume_unit: dto.volumeUnit || 'mm3',
      part_weight: dto.partWeight,
      part_weight_unit: dto.partWeightUnit || 'grams',
      volume_source: dto.volumeSource,
      number_of_cavities: dto.numberOfCavities,
      cavity_source: dto.cavitySource,
      runner_diameter: dto.runnerDiameter,
      runner_length_per_part: dto.runnerLengthPerPart,
      runner_source: dto.runnerSource,
      runner_projected_area_per_part: calculationResult.runnerProjectedAreaPerPart,
      runner_projected_volume_per_part: calculationResult.runnerProjectedVolumePerPart,
      runner_weight_per_part: calculationResult.runnerWeightPerPart,
      total_part_weight: calculationResult.totalPartWeight,
      total_runner_weight: calculationResult.totalRunnerWeight,
      total_shot_weight: calculationResult.totalShotWeight,
      runner_to_part_ratio: calculationResult.runnerToPartRatio,
      include_sprue: dto.includeSprue || false,
      sprue_diameter: dto.sprueDiameter,
      sprue_length: dto.sprueLength,
      sprue_weight: calculationResult.sprueWeight,
      cold_slug_weight: dto.coldSlugWeight,
      total_shot_weight_with_sprue: calculationResult.totalShotWeightWithSprue,
    };

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('shot_weight_calculations')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating shot weight calculation: ${error.message}`, 'ShotWeightService');
      throw new InternalServerErrorException(`Failed to create shot weight calculation: ${error.message}`);
    }

    this.logger.log(`Shot weight calculation created with ID: ${data.id}`, 'ShotWeightService');

    return this.mapDatabaseRowToDto(data);
  }

  /**
   * Update an existing shot weight calculation
   */
  async update(id: string, dto: UpdateShotWeightDto, userId: string, accessToken: string): Promise<ShotWeightResponseDto> {
    this.logger.log(`Updating shot weight calculation with ID: ${id}`, 'ShotWeightService');

    if (!isValidUUID(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    // Check if record exists
    await this.findOne(id, userId, accessToken);

    // Recalculate shot weight if relevant fields are updated
    let calculationResult = null;
    if (this.hasCalculationFields(dto)) {
      // Fetch existing record to merge with update
      const existing = await this.findOne(id, userId, accessToken);
      const mergedDto = this.mergeWithExisting(existing, dto);
      calculationResult = this.calculateShotWeight(mergedDto);
    }

    // Prepare update data
    const dbData: any = {
      calculation_name: dto.calculationName,
      description: dto.description,
      material_grade: dto.materialGrade,
      density: dto.density,
      volume: dto.volume,
      part_weight: dto.partWeight,
      volume_source: dto.volumeSource,
      number_of_cavities: dto.numberOfCavities,
      cavity_source: dto.cavitySource,
      runner_diameter: dto.runnerDiameter,
      runner_length_per_part: dto.runnerLengthPerPart,
      runner_source: dto.runnerSource,
      include_sprue: dto.includeSprue,
      sprue_diameter: dto.sprueDiameter,
      sprue_length: dto.sprueLength,
      cold_slug_weight: dto.coldSlugWeight,
    };

    // Add calculated fields if recalculated
    if (calculationResult) {
      dbData.runner_projected_area_per_part = calculationResult.runnerProjectedAreaPerPart;
      dbData.runner_projected_volume_per_part = calculationResult.runnerProjectedVolumePerPart;
      dbData.runner_weight_per_part = calculationResult.runnerWeightPerPart;
      dbData.total_part_weight = calculationResult.totalPartWeight;
      dbData.total_runner_weight = calculationResult.totalRunnerWeight;
      dbData.total_shot_weight = calculationResult.totalShotWeight;
      dbData.runner_to_part_ratio = calculationResult.runnerToPartRatio;
      dbData.sprue_weight = calculationResult.sprueWeight;
      dbData.total_shot_weight_with_sprue = calculationResult.totalShotWeightWithSprue;
    }

    // Remove undefined values
    Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('shot_weight_calculations')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating shot weight calculation: ${error.message}`, 'ShotWeightService');
      throw new InternalServerErrorException(`Failed to update shot weight calculation: ${error.message}`);
    }

    this.logger.log(`Shot weight calculation updated: ${id}`, 'ShotWeightService');

    return this.mapDatabaseRowToDto(data);
  }

  /**
   * Delete a shot weight calculation
   */
  async remove(id: string, userId: string, accessToken: string) {
    this.logger.log(`Deleting shot weight calculation with ID: ${id}`, 'ShotWeightService');

    if (!isValidUUID(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    // Check if record exists
    await this.findOne(id, userId, accessToken);

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('shot_weight_calculations')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting shot weight calculation: ${error.message}`, 'ShotWeightService');
      throw new InternalServerErrorException(`Failed to delete shot weight calculation: ${error.message}`);
    }

    this.logger.log(`Shot weight calculation deleted: ${id}`, 'ShotWeightService');

    return { message: 'Shot weight calculation deleted successfully', id };
  }

  /**
   * Map database row to DTO (snake_case to camelCase)
   */
  private mapDatabaseRowToDto(row: any): ShotWeightResponseDto {
    return {
      id: row.id,
      userId: row.user_id,
      calculationName: row.calculation_name,
      description: row.description,
      materialGrade: row.material_grade,
      density: Number(row.density),
      densityUnit: row.density_unit,
      volume: Number(row.volume),
      volumeUnit: row.volume_unit,
      partWeight: Number(row.part_weight),
      partWeightUnit: row.part_weight_unit,
      volumeSource: row.volume_source,
      numberOfCavities: Number(row.number_of_cavities),
      cavitySource: row.cavity_source,
      runnerDiameter: Number(row.runner_diameter),
      runnerLengthPerPart: Number(row.runner_length_per_part),
      runnerProjectedAreaPerPart: Number(row.runner_projected_area_per_part),
      runnerProjectedVolumePerPart: Number(row.runner_projected_volume_per_part),
      runnerWeightPerPart: Number(row.runner_weight_per_part),
      runnerSource: row.runner_source,
      totalPartWeight: Number(row.total_part_weight),
      totalRunnerWeight: Number(row.total_runner_weight),
      totalShotWeight: Number(row.total_shot_weight),
      runnerToPartRatio: Number(row.runner_to_part_ratio),
      includeSprue: row.include_sprue,
      sprueDiameter: row.sprue_diameter ? Number(row.sprue_diameter) : undefined,
      sprueLength: row.sprue_length ? Number(row.sprue_length) : undefined,
      sprueWeight: row.sprue_weight ? Number(row.sprue_weight) : undefined,
      coldSlugWeight: row.cold_slug_weight ? Number(row.cold_slug_weight) : undefined,
      totalShotWeightWithSprue: row.total_shot_weight_with_sprue ? Number(row.total_shot_weight_with_sprue) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Check if DTO has fields that require recalculation
   */
  private hasCalculationFields(dto: UpdateShotWeightDto): boolean {
    return !!(
      dto.density ||
      dto.volume ||
      dto.partWeight ||
      dto.numberOfCavities ||
      dto.runnerDiameter ||
      dto.runnerLengthPerPart ||
      dto.includeSprue ||
      dto.sprueDiameter ||
      dto.sprueLength ||
      dto.coldSlugWeight
    );
  }

  /**
   * Merge existing record with update DTO
   */
  private mergeWithExisting(existing: ShotWeightResponseDto, dto: UpdateShotWeightDto): CreateShotWeightDto {
    return {
      calculationName: dto.calculationName || existing.calculationName,
      description: dto.description || existing.description,
      materialGrade: dto.materialGrade || existing.materialGrade,
      density: dto.density || existing.density,
      densityUnit: dto.densityUnit || existing.densityUnit,
      volume: dto.volume || existing.volume,
      volumeUnit: dto.volumeUnit || existing.volumeUnit,
      partWeight: dto.partWeight || existing.partWeight,
      partWeightUnit: dto.partWeightUnit || existing.partWeightUnit,
      volumeSource: dto.volumeSource || existing.volumeSource,
      numberOfCavities: dto.numberOfCavities || existing.numberOfCavities,
      cavitySource: dto.cavitySource || existing.cavitySource,
      runnerDiameter: dto.runnerDiameter || existing.runnerDiameter,
      runnerLengthPerPart: dto.runnerLengthPerPart || existing.runnerLengthPerPart,
      runnerSource: dto.runnerSource || existing.runnerSource,
      includeSprue: dto.includeSprue !== undefined ? dto.includeSprue : existing.includeSprue,
      sprueDiameter: dto.sprueDiameter || existing.sprueDiameter,
      sprueLength: dto.sprueLength || existing.sprueLength,
      coldSlugWeight: dto.coldSlugWeight || existing.coldSlugWeight,
    };
  }
}
