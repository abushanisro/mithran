import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ConflictException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateLSRDto, UpdateLSRDto } from './lsr.dto';
import { validate as isValidUUID } from 'uuid';

@Injectable()
export class LSRService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) {}

  async create(createLSRDto: CreateLSRDto, userId: string, accessToken: string) {
    this.logger.log(`Creating LSR record for user: ${userId}`, 'LSRService');

    // Check if labour code already exists
    const { data: existing } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .select('id')
      .eq('labour_code', createLSRDto.labourCode)
      .single();

    if (existing) {
      throw new ConflictException(`Labour code ${createLSRDto.labourCode} already exists`);
    }

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .insert({
        user_id: userId,
        labour_code: createLSRDto.labourCode,
        labour_type: createLSRDto.labourType,
        description: createLSRDto.description,
        minimum_wage_per_day: createLSRDto.minimumWagePerDay,
        minimum_wage_per_month: createLSRDto.minimumWagePerMonth,
        dearness_allowance: createLSRDto.dearnessAllowance,
        perks_percentage: createLSRDto.perksPercentage,
        lhr: createLSRDto.lhr,
        reference: createLSRDto.reference || null,
        location: createLSRDto.location || null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating LSR record: ${error.message}`, 'LSRService');
      throw new InternalServerErrorException(`Failed to create LSR record: ${error.message}`);
    }

    return this.mapDatabaseToResponse(data);
  }

  async findAll(search: string | undefined, userId: string, accessToken: string) {
    this.logger.log('Fetching all LSR records', 'LSRService');

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .select('*')
      .order('labour_code', { ascending: true });

    if (search) {
      queryBuilder = queryBuilder.or(`labour_code.ilike.%${search}%,labour_type.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      this.logger.error(`Error fetching LSR records: ${error.message}`, 'LSRService');
      throw new InternalServerErrorException(`Failed to fetch LSR records: ${error.message}`);
    }

    return (data || []).map(row => this.mapDatabaseToResponse(row));
  }

  async findOne(id: string, userId: string, accessToken: string) {
    this.logger.log(`Fetching LSR record: ${id}`, 'LSRService');

    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid LSR record ID format');
    }

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.warn(`LSR record not found: ${id}`, 'LSRService');
      throw new NotFoundException(`LSR record with ID ${id} not found`);
    }

    return this.mapDatabaseToResponse(data);
  }

  async findByLabourCode(labourCode: string, userId: string, accessToken: string) {
    this.logger.log(`Fetching LSR record by code: ${labourCode}`, 'LSRService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .select('*')
      .eq('labour_code', labourCode)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Labour code ${labourCode} not found`);
    }

    return this.mapDatabaseToResponse(data);
  }

  async update(id: string, updateLSRDto: UpdateLSRDto, userId: string, accessToken: string) {
    this.logger.log(`Updating LSR record: ${id}`, 'LSRService');

    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid LSR record ID format');
    }

    // Verify record exists
    await this.findOne(id, userId, accessToken);

    // Check for duplicate labour code if updating
    if (updateLSRDto.labourCode) {
      const { data: existing } = await this.supabaseService
        .getClient(accessToken)
        .from('lsr_records')
        .select('id')
        .eq('labour_code', updateLSRDto.labourCode)
        .neq('id', id)
        .single();

      if (existing) {
        throw new ConflictException(`Labour code ${updateLSRDto.labourCode} already exists`);
      }
    }

    const updateData: any = {};
    if (updateLSRDto.labourCode !== undefined) updateData.labour_code = updateLSRDto.labourCode;
    if (updateLSRDto.labourType !== undefined) updateData.labour_type = updateLSRDto.labourType;
    if (updateLSRDto.description !== undefined) updateData.description = updateLSRDto.description;
    if (updateLSRDto.minimumWagePerDay !== undefined) updateData.minimum_wage_per_day = updateLSRDto.minimumWagePerDay;
    if (updateLSRDto.minimumWagePerMonth !== undefined) updateData.minimum_wage_per_month = updateLSRDto.minimumWagePerMonth;
    if (updateLSRDto.dearnessAllowance !== undefined) updateData.dearness_allowance = updateLSRDto.dearnessAllowance;
    if (updateLSRDto.perksPercentage !== undefined) updateData.perks_percentage = updateLSRDto.perksPercentage;
    if (updateLSRDto.lhr !== undefined) updateData.lhr = updateLSRDto.lhr;
    if (updateLSRDto.reference !== undefined) updateData.reference = updateLSRDto.reference;
    if (updateLSRDto.location !== undefined) updateData.location = updateLSRDto.location;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating LSR record: ${error.message}`, 'LSRService');
      throw new InternalServerErrorException(`Failed to update LSR record: ${error.message}`);
    }

    return this.mapDatabaseToResponse(data);
  }

  async remove(id: string, userId: string, accessToken: string) {
    this.logger.log(`Deleting LSR record: ${id}`, 'LSRService');

    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid LSR record ID format');
    }

    // Verify record exists
    await this.findOne(id, userId, accessToken);

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting LSR record: ${error.message}`, 'LSRService');
      throw new InternalServerErrorException(`Failed to delete LSR record: ${error.message}`);
    }

    return { message: 'LSR record deleted successfully' };
  }

  async getStatistics(userId: string, accessToken: string) {
    this.logger.log('Fetching LSR statistics', 'LSRService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .select('labour_type, lhr');

    if (error) {
      this.logger.error(`Error fetching LSR statistics: ${error.message}`, 'LSRService');
      throw new InternalServerErrorException(`Failed to fetch LSR statistics: ${error.message}`);
    }

    const records = data || [];
    const total = records.length;

    // Group by type
    const byType = records.reduce((acc: any, record: any) => {
      const type = record.labour_type;
      if (!acc[type]) {
        acc[type] = { type, count: 0, totalLHR: 0 };
      }
      acc[type].count++;
      acc[type].totalLHR += parseFloat(record.lhr || 0);
      return acc;
    }, {});

    const byTypeArray = Object.values(byType).map((item: any) => ({
      type: item.type,
      count: item.count.toString(),
      avgLHR: (item.totalLHR / item.count).toFixed(2),
    }));

    // Calculate average LHR
    const totalLHR = records.reduce((sum, record) => sum + parseFloat(record.lhr || 0), 0);
    const averageLHR = total > 0 ? totalLHR / total : 0;

    return {
      total,
      byType: byTypeArray,
      averageLHR: parseFloat(averageLHR.toFixed(2)),
    };
  }

  async bulkCreate(data: CreateLSRDto[], userId: string, accessToken: string) {
    this.logger.log(`Bulk creating ${data.length} LSR records`, 'LSRService');

    const records = data.map(dto => ({
      user_id: userId,
      labour_code: dto.labourCode,
      labour_type: dto.labourType,
      description: dto.description,
      minimum_wage_per_day: dto.minimumWagePerDay,
      minimum_wage_per_month: dto.minimumWagePerMonth,
      dearness_allowance: dto.dearnessAllowance,
      perks_percentage: dto.perksPercentage,
      lhr: dto.lhr,
      reference: dto.reference || null,
      location: dto.location || null,
    }));

    const { data: inserted, error } = await this.supabaseService
      .getClient(accessToken)
      .from('lsr_records')
      .insert(records)
      .select();

    if (error) {
      this.logger.error(`Error bulk creating LSR records: ${error.message}`, 'LSRService');
      throw new InternalServerErrorException(`Failed to bulk create LSR records: ${error.message}`);
    }

    return (inserted || []).map(row => this.mapDatabaseToResponse(row));
  }

  private isValidUUID(id: string): boolean {
    try {
      return isValidUUID(id);
    } catch {
      return false;
    }
  }

  private mapDatabaseToResponse(row: any) {
    return {
      id: row.id,
      labourCode: row.labour_code,
      labourType: row.labour_type,
      description: row.description,
      minimumWagePerDay: parseFloat(row.minimum_wage_per_day),
      minimumWagePerMonth: parseFloat(row.minimum_wage_per_month),
      dearnessAllowance: parseFloat(row.dearness_allowance),
      perksPercentage: parseFloat(row.perks_percentage),
      lhr: parseFloat(row.lhr),
      reference: row.reference,
      location: row.location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
