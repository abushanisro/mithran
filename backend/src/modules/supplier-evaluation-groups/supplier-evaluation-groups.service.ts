import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { Logger } from '../../common/logger/logger.service';
import {
  CreateSupplierEvaluationGroupDto,
  UpdateSupplierEvaluationGroupDto,
  SupplierEvaluationGroupDto,
  SupplierEvaluationGroupSummaryDto,
} from './dto/supplier-evaluation-group.dto';

@Injectable()
export class SupplierEvaluationGroupsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) {}

  async create(
    userId: string,
    createDto: CreateSupplierEvaluationGroupDto,
    accessToken: string,
  ): Promise<SupplierEvaluationGroupDto> {
    this.logger.log(`Creating supplier evaluation group for user ${userId}`);

    try {
      // Generate evaluation group name if not provided
      const evaluationName = createDto.name || `Evaluation ${new Date().toISOString().slice(0, 16)}`;

      // 1. Create the main evaluation group
      const supabase = this.supabaseService.getClient(accessToken);
      const { data: groupData, error: groupError } = await supabase
        .from('supplier_evaluation_groups')
        .insert({
          user_id: userId,
          project_id: createDto.projectId,
          name: evaluationName,
          description: createDto.description,
          notes: createDto.notes,
          status: 'active',
        })
        .select('*')
        .single();

      if (groupError) {
        this.logger.error('Error creating evaluation group:', groupError);
        throw new Error(`Failed to create evaluation group: ${groupError.message}`);
      }

      const groupId = groupData.id;

      // 2. Insert BOM items
      if (createDto.bomItems?.length > 0) {
        const bomItemsData = createDto.bomItems.map(item => ({
          evaluation_group_id: groupId,
          bom_item_id: item.id,
          bom_item_name: item.name,
          part_number: item.partNumber,
          material: item.material,
          quantity: item.quantity,
        }));

        const { error: bomError } = await supabase
          .from('supplier_evaluation_group_bom_items')
          .insert(bomItemsData);

        if (bomError) {
          this.logger.error('Error creating BOM items:', bomError);
          throw new Error(`Failed to create BOM items: ${bomError.message}`);
        }
      }

      // 3. Insert processes
      if (createDto.processes?.length > 0) {
        const processesData = createDto.processes.map(process => ({
          evaluation_group_id: groupId,
          process_id: process.id,
          process_name: process.name,
          process_group: process.processGroup,
          process_type: process.type,
          is_predefined: process.isPredefined,
        }));

        const { error: processError } = await supabase
          .from('supplier_evaluation_group_processes')
          .insert(processesData);

        if (processError) {
          this.logger.error('Error creating processes:', processError);
          throw new Error(`Failed to create processes: ${processError.message}`);
        }
      }

      // 4. Return the complete evaluation group
      return this.findOne(userId, groupId, accessToken);
    } catch (error) {
      this.logger.error('Failed to create supplier evaluation group:', error);
      throw error;
    }
  }

  async findByProject(
    userId: string,
    projectId: string,
    accessToken: string,
  ): Promise<SupplierEvaluationGroupSummaryDto[]> {
    this.logger.log(`Finding evaluation groups for project ${projectId}`);

    try {
      const supabase = this.supabaseService.getClient(accessToken);
      const { data, error } = await supabase.rpc(
        'get_supplier_evaluation_groups_by_project',
        {
          p_project_id: projectId,
          p_user_id: userId,
        },
      );

      if (error) {
        this.logger.error('Error fetching evaluation groups:', error);
        throw new Error(`Failed to fetch evaluation groups: ${error.message}`);
      }

      return (data || []).map(group => ({
        id: group.id,
        projectId: group.project_id,
        name: group.name,
        description: group.description,
        notes: group.notes,
        status: group.status,
        createdAt: new Date(group.created_at),
        updatedAt: new Date(group.updated_at),
        bomItemsCount: parseInt(group.bom_items_count) || 0,
        processesCount: parseInt(group.processes_count) || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to find evaluation groups by project:', error);
      throw error;
    }
  }

  async findOne(userId: string, groupId: string, accessToken: string): Promise<SupplierEvaluationGroupDto> {
    this.logger.log(`Finding evaluation group ${groupId}`);

    try {
      const supabase = this.supabaseService.getClient(accessToken);
      const { data, error } = await supabase.rpc(
        'get_supplier_evaluation_group',
        {
          p_group_id: groupId,
          p_user_id: userId,
        },
      );

      if (error) {
        this.logger.error('Error fetching evaluation group:', error);
        throw new Error(`Failed to fetch evaluation group: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new NotFoundException(`Evaluation group ${groupId} not found`);
      }

      const group = data[0];

      return {
        id: group.id,
        projectId: group.project_id,
        name: group.name,
        description: group.description,
        notes: group.notes,
        status: group.status,
        createdAt: new Date(group.created_at),
        updatedAt: new Date(group.updated_at),
        bomItems: group.bom_items || [],
        processes: group.processes || [],
      };
    } catch (error) {
      this.logger.error('Failed to find evaluation group:', error);
      throw error;
    }
  }

  async update(
    userId: string,
    groupId: string,
    updateDto: UpdateSupplierEvaluationGroupDto,
    accessToken: string,
  ): Promise<SupplierEvaluationGroupDto> {
    this.logger.log(`Updating evaluation group ${groupId}`);

    try {
      const supabase = this.supabaseService.getClient(accessToken);
      const { error } = await supabase
        .from('supplier_evaluation_groups')
        .update({
          name: updateDto.name,
          description: updateDto.description,
          notes: updateDto.notes,
          status: updateDto.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Error updating evaluation group:', error);
        throw new Error(`Failed to update evaluation group: ${error.message}`);
      }

      return this.findOne(userId, groupId, accessToken);
    } catch (error) {
      this.logger.error('Failed to update evaluation group:', error);
      throw error;
    }
  }

  async remove(userId: string, groupId: string, accessToken: string): Promise<void> {
    this.logger.log(`Removing evaluation group ${groupId}`);

    try {
      const supabase = this.supabaseService.getClient(accessToken);
      const { error } = await supabase
        .from('supplier_evaluation_groups')
        .delete()
        .eq('id', groupId)
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Error removing evaluation group:', error);
        throw new Error(`Failed to remove evaluation group: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Failed to remove evaluation group:', error);
      throw error;
    }
  }

  async getLatestByProject(userId: string, projectId: string, accessToken: string): Promise<SupplierEvaluationGroupDto | null> {
    this.logger.log(`Getting latest evaluation group for project ${projectId}`);

    try {
      const groups = await this.findByProject(userId, projectId, accessToken);
      
      if (groups.length === 0) {
        return null;
      }

      // Get the most recent group
      const latestGroup = groups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return this.findOne(userId, latestGroup.id, accessToken);
    } catch (error) {
      this.logger.error('Failed to get latest evaluation group:', error);
      throw error;
    }
  }
}