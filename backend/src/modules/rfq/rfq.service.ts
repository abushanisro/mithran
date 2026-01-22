import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { RfqRecord, RfqSummary, RfqStatus } from './dto/rfq-response.dto';

@Injectable()
export class RfqService {
  constructor(private readonly supabaseService: SupabaseService) { }

  async create(userId: string, createRfqDto: CreateRfqDto): Promise<RfqRecord> {
    const {
      rfqName,
      projectId,
      bomItemIds,
      vendorIds,
      quoteDeadline,
      selectionType,
      buyerName,
      emailBody,
      emailSubject
    } = createRfqDto;

    // Generate RFQ number
    const rfqNumber = await this.generateRfqNumber();

    // Validate BOM items and vendors exist
    await this.validateBomItems(bomItemIds);
    await this.validateVendors(vendorIds);


    const { data, error } = await this.supabaseService.client
      .from('rfq_records')
      .insert({
        user_id: userId,
        project_id: projectId,
        rfq_name: rfqName,
        rfq_number: rfqNumber,
        bom_item_ids: bomItemIds,
        vendor_ids: vendorIds,
        quote_deadline: quoteDeadline,
        selection_type: selectionType,
        buyer_name: buyerName,
        email_body: emailBody,
        email_subject: emailSubject,
        status: RfqStatus.DRAFT
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create RFQ: ${error.message}`);
    }

    return this.mapToRfqRecord(data);
  }

  async findByUser(userId: string, projectId?: string): Promise<RfqSummary[]> {
    let query = this.supabaseService.client
      .from('rfq_records')
      .select(`
        id,
        rfq_name,
        rfq_number,
        status,
        bom_item_ids,
        vendor_ids,
        created_at,
        sent_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch RFQs: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapToRfqSummary(row));
  }

  async findOne(id: string, userId: string): Promise<RfqRecord> {
    const { data, error } = await this.supabaseService.client
      .from('rfq_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('RFQ not found');
    }

    return this.mapToRfqRecord(data);
  }

  async sendRfq(id: string, userId: string): Promise<void> {
    // First validate the RFQ exists and belongs to the user
    const rfq = await this.findOne(id, userId);

    if (rfq.status !== RfqStatus.DRAFT) {
      throw new BadRequestException('RFQ has already been sent');
    }

    // Use the database function to mark as sent
    const { error } = await this.supabaseService.client
      .rpc('send_rfq', { p_rfq_id: id, p_user_id: userId });

    if (error) {
      throw new BadRequestException(`Failed to send RFQ: ${error.message}`);
    }

    // TODO: Implement email sending logic here
    // This would integrate with an email service to send the RFQ to vendors
  }

  async closeRfq(id: string, userId: string): Promise<void> {
    // Validate ownership first
    await this.findOne(id, userId);

    const { error } = await this.supabaseService.client
      .rpc('close_rfq', { p_rfq_id: id, p_user_id: userId });

    if (error) {
      throw new BadRequestException(`Failed to close RFQ: ${error.message}`);
    }
  }

  private async generateRfqNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const prefix = `RFQ-${year}${month}`;
    const { count, error } = await this.supabaseService.client
      .from('rfq_records')
      .select('*', { count: 'exact', head: true })
      .like('rfq_number', `${prefix}%`);

    if (error) {
      throw new BadRequestException(`Failed to generate RFQ number: ${error.message}`);
    }

    const nextNumber = (count || 0) + 1;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  }

  private async validateBomItems(bomItemIds: string[]): Promise<void> {
    const { count, error } = await this.supabaseService.client
      .from('bom_items')
      .select('*', { count: 'exact', head: true })
      .in('id', bomItemIds);

    if (error) {
      throw new BadRequestException(`Failed to validate BOM items: ${error.message}`);
    }

    if ((count || 0) !== bomItemIds.length) {
      throw new BadRequestException('Some BOM items do not exist');
    }
  }

  private async validateVendors(vendorIds: string[]): Promise<void> {
    const { count, error } = await this.supabaseService.client
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .in('id', vendorIds);

    if (error) {
      throw new BadRequestException(`Failed to validate vendors: ${error.message}`);
    }

    if ((count || 0) !== vendorIds.length) {
      throw new BadRequestException('Some vendors do not exist');
    }
  }

  private mapToRfqRecord(row: any): RfqRecord {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      rfqName: row.rfq_name,
      rfqNumber: row.rfq_number,
      bomItemIds: row.bom_item_ids,
      vendorIds: row.vendor_ids,
      quoteDeadline: row.quote_deadline,
      selectionType: row.selection_type,
      buyerName: row.buyer_name,
      emailBody: row.email_body,
      emailSubject: row.email_subject,
      status: row.status,
      sentAt: row.sent_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToRfqSummary(row: any): RfqSummary {
    return {
      id: row.id,
      rfqName: row.rfq_name,
      rfqNumber: row.rfq_number,
      status: row.status,
      itemCount: Array.isArray(row.bom_item_ids) ? row.bom_item_ids.length :
        (row.item_count ? parseInt(row.item_count) : 0),
      vendorCount: Array.isArray(row.vendor_ids) ? row.vendor_ids.length :
        (row.vendor_count ? parseInt(row.vendor_count) : 0),
      responseCount: row.response_count ? parseInt(row.response_count) : 0,
      createdAt: row.created_at,
      sentAt: row.sent_at,
    };
  }
}