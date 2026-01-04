import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateBOMItemDto, UpdateBOMItemDto } from './dto/bom-items.dto';
import { BOMItemResponseDto, BOMItemListResponseDto } from './dto/bom-item-response.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';

@Injectable()
export class BOMItemsService {
  private readonly logger = new Logger(BOMItemsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(
    bomId?: string,
    search?: string,
    itemType?: string,
    page = 1,
    limit = 50,
    userId?: string,
    accessToken?: string,
  ): Promise<BOMItemListResponseDto> {
    this.logger.log('Fetching BOM items', 'BOMItemsService');

    const client = this.supabaseService.getClient(accessToken);

    let query = client
      .from('bom_items')
      .select('*, bom:project_id!inner(name, description)')
      .order('created_at', { ascending: false });

    // Apply filters
    if (bomId) {
      query = query.eq('bom_id', bomId);
    }
    if (search) {
      query = query.or(`part_number.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    // Get total count with same filters
    let countQuery = client
      .from('bom_items')
      .select('*', { count: 'exact', head: true });

    if (bomId) countQuery = countQuery.eq('bom_id', bomId);
    if (search) countQuery = countQuery.or(`part_number.ilike.%${search}%,description.ilike.%${search}%`);
    if (itemType) countQuery = countQuery.eq('item_type', itemType);

    const { count } = await countQuery;

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Error fetching BOM items: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to fetch BOM items: ${error.message}`);
    }

    return {
      items: data || [],
      total: count || 0,
      page,
      limit,
    } as BOMItemListResponseDto;
  }

  async findOne(
    id: string,
    userId?: string,
    accessToken?: string,
  ): Promise<BOMItemResponseDto> {
    this.logger.log(`Fetching BOM item with ID: ${id}`, 'BOMItemsService');

    const client = this.supabaseService.getClient(accessToken);

    const { data, error } = await client
      .from('bom_items')
      .select('*, bom:project_id!inner(name, description)')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`Error fetching BOM item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to fetch BOM item: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`BOM item with ID ${id} not found`);
    }

    return data;
  }

  async create(
    createBOMItemDto: CreateBOMItemDto,
    userId?: string,
    accessToken?: string,
  ): Promise<BOMItemResponseDto> {
    this.logger.log(
      `Creating BOM item: ${createBOMItemDto.partNumber}`,
      'BOMItemsService',
    );

    const client = this.supabaseService.getClient(accessToken);

    const { data, error } = await client
      .from('bom_items')
      .insert({
        ...createBOMItemDto,
        created_by: userId,
      })
      .select('*, bom:project_id!inner(name, description)')
      .single();

    if (error) {
      this.logger.error(`Error creating BOM item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to create BOM item: ${error.message}`);
    }

    return data;
  }

  async update(
    id: string,
    updateBOMItemDto: UpdateBOMItemDto,
    userId?: string,
    accessToken?: string,
  ): Promise<BOMItemResponseDto> {
    this.logger.log(`Updating BOM item with ID: ${id}`, 'BOMItemsService');

    const client = this.supabaseService.getClient(accessToken);

    const { data, error } = await client
      .from('bom_items')
      .update({
        ...updateBOMItemDto,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, bom:project_id!inner(name, description)')
      .single();

    if (error) {
      this.logger.error(`Error updating BOM item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to update BOM item: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`BOM item with ID ${id} not found`);
    }

    return data;
  }

  async updateSortOrder(
    items: Array<{ id: string; sortOrder: number }>,
    userId?: string,
    accessToken?: string,
  ): Promise<{ updated: number }> {
    this.logger.log(`Updating sort order for ${items.length} BOM items`, 'BOMItemsService');

    const client = this.supabaseService.getClient(accessToken);
    let updated = 0;

    for (const item of items) {
      const { error } = await client
        .from('bom_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id);

      if (error) {
        this.logger.error(`Error updating sort order for item ${item.id}: ${error.message}`, 'BOMItemsService');
      } else {
        updated++;
      }
    }

    return { updated };
  }

  async getFileUrl(
    id: string,
    fileType: '2d' | '3d',
    userId?: string,
    accessToken?: string,
  ): Promise<{ url: string }> {
    this.logger.log(`Getting ${fileType} file URL for BOM item: ${id}`, 'BOMItemsService');

    const bomItem = await this.findOne(id, userId, accessToken);
    
    if (fileType === '2d' && bomItem.file2dPath) {
      const { data } = await this.supabaseService
        .getClient(accessToken)
        .storage
        .from('bom-files')
        .createSignedUrl(bomItem.file2dPath, 3600);
      return { url: data?.signedUrl || '' };
    }

    if (fileType === '3d' && bomItem.file3dPath) {
      const { data } = await this.supabaseService
        .getClient(accessToken)
        .storage
        .from('bom-files')
        .createSignedUrl(bomItem.file3dPath, 3600);
      return { url: data?.signedUrl || '' };
    }

    throw new NotFoundException(`${fileType} file not found for BOM item ${id}`);
  }

  async getProjectIdFromBomItem(
    bomItemId: string,
    accessToken?: string,
  ): Promise<string> {
    this.logger.log(`Getting project ID for BOM item: ${bomItemId}`, 'BOMItemsService');

    const client = this.supabaseService.getClient(accessToken);

    const { data, error } = await client
      .from('bom_items')
      .select('bom_id')
      .eq('id', bomItemId)
      .single();

    if (error) {
      this.logger.error(`Error fetching BOM ID for item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to fetch BOM ID: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`BOM item with ID ${bomItemId} not found`);
    }

    return data.bom_id;
  }

  async remove(
    id: string,
    userId?: string,
    accessToken?: string,
  ): Promise<void> {
    this.logger.log(`Removing BOM item with ID: ${id}`, 'BOMItemsService');

    const client = this.supabaseService.getClient(accessToken);

    const { error } = await client.from('bom_items').delete().eq('id', id);

    if (error) {
      this.logger.error(`Error removing BOM item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to remove BOM item: ${error.message}`);
    }
  }

  async getBOMIdForItem(
    itemId: string,
    userId?: string,
    accessToken?: string,
  ): Promise<string> {
    const client = this.supabaseService.getClient(accessToken);

    const { data, error } = await client
      .from('bom_items')
      .select('bom_id')
      .eq('id', itemId)
      .single();

    if (error) {
      this.logger.error(`Error fetching BOM ID for item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to fetch BOM ID: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`BOM item with ID ${itemId} not found`);
    }

    return data.bom_id;
  }

  async getProjectIdForBOM(
    bomId: string,
    userId?: string,
    accessToken?: string,
  ): Promise<string> {
    const client = this.supabaseService.getClient(accessToken);

    const { data, error } = await client
      .from('boms')
      .select('project_id')
      .eq('id', bomId)
      .single();

    if (error) {
      this.logger.error(`Error fetching project ID for BOM: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to fetch project ID: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`BOM with ID ${bomId} not found`);
    }

    return data.project_id;
  }
}