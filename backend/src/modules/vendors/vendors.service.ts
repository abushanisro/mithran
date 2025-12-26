import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateVendorDto, UpdateVendorDto, QueryVendorsDto } from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) {}

  async findAll(query: QueryVendorsDto, userId: string, accessToken: string) {
    this.logger.log('Fetching all vendors', 'VendorsService');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100); // Cap at 100 for performance
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('vendors')
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
      this.logger.error(`Error fetching vendors: ${error.message}`, 'VendorsService');
      throw new InternalServerErrorException(`Failed to fetch vendors: ${error.message}`);
    }

    return {
      vendors: data || [],
      total: count || 0,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string, accessToken: string) {
    this.logger.log(`Fetching vendor: ${id}`, 'VendorsService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`Vendor not found: ${id}`, 'VendorsService');
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return data;
  }

  async create(createVendorDto: CreateVendorDto, userId: string, accessToken: string) {
    this.logger.log('Creating vendor', 'VendorsService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('vendors')
      .insert({
        ...createVendorDto,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating vendor: ${error.message}`, 'VendorsService');
      throw new InternalServerErrorException(`Failed to create vendor: ${error.message}`);
    }

    return data;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto, userId: string, accessToken: string) {
    this.logger.log(`Updating vendor: ${id}`, 'VendorsService');

    // Verify vendor exists and belongs to user (RLS enforces ownership)
    await this.findOne(id, userId, accessToken);

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('vendors')
      .update(updateVendorDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating vendor: ${error.message}`, 'VendorsService');
      throw new InternalServerErrorException(`Failed to update vendor: ${error.message}`);
    }

    return data;
  }

  async remove(id: string, userId: string, accessToken: string) {
    this.logger.log(`Deleting vendor: ${id}`, 'VendorsService');

    // Verify vendor exists and belongs to user (RLS enforces ownership)
    await this.findOne(id, userId, accessToken);

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting vendor: ${error.message}`, 'VendorsService');
      throw new InternalServerErrorException(`Failed to delete vendor: ${error.message}`);
    }

    return { message: 'Vendor deleted successfully' };
  }
}
