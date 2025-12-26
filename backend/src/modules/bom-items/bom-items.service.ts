import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateBOMItemDto, UpdateBOMItemDto, QueryBOMItemsDto } from './dto/bom-items.dto';
import { BOMItemResponseDto, BOMItemListResponseDto } from './dto/bom-item-response.dto';
import { FileStorageService } from './services/file-storage.service';

@Injectable()
export class BOMItemsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async findAll(query: QueryBOMItemsDto, userId: string, accessToken: string): Promise<BOMItemListResponseDto> {
    this.logger.log('Fetching all BOM items', 'BOMItemsService');

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('bom_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (query.bomId) {
      queryBuilder = queryBuilder.eq('bom_id', query.bomId);
    }

    if (query.itemType) {
      queryBuilder = queryBuilder.eq('item_type', query.itemType);
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,part_number.ilike.%${query.search}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      this.logger.error(`Error fetching BOM items: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to fetch BOM items: ${error.message}`);
    }

    const items = (data || []).map(row => BOMItemResponseDto.fromDatabase(row));

    return { items };
  }

  async findOne(id: string, userId: string, accessToken: string): Promise<BOMItemResponseDto> {
    this.logger.log(`Fetching BOM item: ${id}`, 'BOMItemsService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('bom_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`BOM item not found: ${id}`, 'BOMItemsService');
      throw new NotFoundException(`BOM item with ID ${id} not found`);
    }

    return BOMItemResponseDto.fromDatabase(data);
  }

  async create(createBOMItemDto: CreateBOMItemDto, userId: string, accessToken: string): Promise<BOMItemResponseDto> {
    this.logger.log('Creating BOM item', 'BOMItemsService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('bom_items')
      .insert({
        bom_id: createBOMItemDto.bomId,
        name: createBOMItemDto.name,
        part_number: createBOMItemDto.partNumber,
        description: createBOMItemDto.description,
        item_type: createBOMItemDto.itemType,
        parent_item_id: createBOMItemDto.parentItemId,
        quantity: createBOMItemDto.quantity,
        annual_volume: createBOMItemDto.annualVolume,
        unit: createBOMItemDto.unit || 'pcs',
        material: createBOMItemDto.material,
        material_grade: createBOMItemDto.materialGrade,
        sort_order: createBOMItemDto.sortOrder || 0,
        file_3d_path: createBOMItemDto.file3dPath,
        file_2d_path: createBOMItemDto.file2dPath,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating BOM item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to create BOM item: ${error.message}`);
    }

    return BOMItemResponseDto.fromDatabase(data);
  }

  async update(id: string, updateBOMItemDto: UpdateBOMItemDto, userId: string, accessToken: string): Promise<BOMItemResponseDto> {
    this.logger.log(`Updating BOM item: ${id}`, 'BOMItemsService');

    await this.findOne(id, userId, accessToken);

    const updateData: any = {};
    if (updateBOMItemDto.name !== undefined) updateData.name = updateBOMItemDto.name;
    if (updateBOMItemDto.partNumber !== undefined) updateData.part_number = updateBOMItemDto.partNumber;
    if (updateBOMItemDto.description !== undefined) updateData.description = updateBOMItemDto.description;
    if (updateBOMItemDto.itemType !== undefined) updateData.item_type = updateBOMItemDto.itemType;
    if (updateBOMItemDto.parentItemId !== undefined) updateData.parent_item_id = updateBOMItemDto.parentItemId;
    if (updateBOMItemDto.quantity !== undefined) updateData.quantity = updateBOMItemDto.quantity;
    if (updateBOMItemDto.annualVolume !== undefined) updateData.annual_volume = updateBOMItemDto.annualVolume;
    if (updateBOMItemDto.unit !== undefined) updateData.unit = updateBOMItemDto.unit;
    if (updateBOMItemDto.material !== undefined) updateData.material = updateBOMItemDto.material;
    if (updateBOMItemDto.materialGrade !== undefined) updateData.material_grade = updateBOMItemDto.materialGrade;
    if (updateBOMItemDto.sortOrder !== undefined) updateData.sort_order = updateBOMItemDto.sortOrder;
    if (updateBOMItemDto.file3dPath !== undefined) updateData.file_3d_path = updateBOMItemDto.file3dPath;
    if (updateBOMItemDto.file2dPath !== undefined) updateData.file_2d_path = updateBOMItemDto.file2dPath;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('bom_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating BOM item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to update BOM item: ${error.message}`);
    }

    return BOMItemResponseDto.fromDatabase(data);
  }

  async remove(id: string, userId: string, accessToken: string) {
    this.logger.log(`Deleting BOM item: ${id}`, 'BOMItemsService');

    // Fetch item first to get file paths for cleanup
    const item = await this.findOne(id, userId, accessToken);

    // Delete from database first
    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('bom_items')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting BOM item: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to delete BOM item: ${error.message}`);
    }

    // Clean up associated files (best effort - don't fail if files already deleted)
    try {
      if (item.file3dPath) {
        await this.fileStorageService.deleteFile(item.file3dPath);
        this.logger.log(`Deleted 3D file: ${item.file3dPath}`, 'BOMItemsService');
      }
      if (item.file2dPath) {
        await this.fileStorageService.deleteFile(item.file2dPath);
        this.logger.log(`Deleted 2D file: ${item.file2dPath}`, 'BOMItemsService');
      }
    } catch (fileError) {
      // Log warning but don't fail the operation - DB record is already deleted
      this.logger.warn(
        `Failed to delete files for BOM item ${id}, but item deleted from database: ${fileError.message}`,
        'BOMItemsService',
      );
    }

    return { message: 'BOM item deleted successfully' };
  }

  async updateSortOrder(items: Array<{ id: string; sortOrder: number }>, userId: string, accessToken: string) {
    this.logger.log('Updating BOM items sort order', 'BOMItemsService');

    if (!items || items.length === 0) {
      return { message: 'No items to update' };
    }

    // Verify first item exists and get its BOM ID
    const firstItem = await this.findOne(items[0].id, userId, accessToken);
    const bomId = firstItem.bomId;

    // Use atomic database function for transaction-safe update
    const { error } = await this.supabaseService
      .getClient(accessToken)
      .rpc('update_bom_items_sort_order', {
        item_updates: items,
        expected_bom_id: bomId,
      });

    if (error) {
      this.logger.error(`Error updating sort order: ${error.message}`, 'BOMItemsService');
      throw new InternalServerErrorException(`Failed to update sort order: ${error.message}`);
    }

    return { message: 'Sort order updated successfully' };
  }
}
