import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import { 
  RfqTrackingResponseDto, 
  RfqTrackingStatsDto, 
  CreateRfqTrackingDto,
  RfqTrackingStatus 
} from '../dto/rfq-tracking.dto';

export interface CreateRfqTrackingData {
  rfqId: string;
  projectId?: string;
  rfqName: string;
  rfqNumber: string;
  vendors: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  parts: Array<{
    id: string;
    partNumber: string;
    description: string;
    process: string;
    quantity?: number;
    file2dPath?: string;
    file3dPath?: string;
  }>;
}

export interface RfqTrackingRecord {
  id: string;
  rfqId: string;
  userId: string;
  projectId?: string;
  rfqName: string;
  rfqNumber: string;
  status: string;
  vendorCount: number;
  partCount: number;
  responseCount: number;
  sentAt: Date;
  firstResponseAt?: Date;
  lastResponseAt?: Date;
  completedAt?: Date;
  vendors: Array<{
    id: string;
    name: string;
    email?: string;
    responded: boolean;
    responseReceivedAt?: Date;
    quoteAmount?: number;
    leadTimeDays?: number;
  }>;
  parts: Array<{
    id: string;
    partNumber: string;
    description: string;
    process: string;
    quantity: number;
    file2dPath?: string;
    file3dPath?: string;
    has2dFile: boolean;
    has3dFile: boolean;
  }>;
}

export interface UpdateVendorResponseData {
  responded: boolean;
  quoteAmount?: number;
  leadTimeDays?: number;
}

@Injectable()
export class RfqTrackingService {
  private readonly logger = new Logger(RfqTrackingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Create RFQ tracking record when RFQ is sent
   */
  async createTracking(
    userId: string,
    accessToken: string,
    data: CreateRfqTrackingData
  ): Promise<RfqTrackingResponseDto> {
    this.logger.log(`Creating RFQ tracking for RFQ: ${data.rfqId}`);

    const client = this.supabaseService.getClient(accessToken);

    try {
      // Start transaction
      const { data: trackingRecord, error: trackingError } = await client
        .from('rfq_tracking')
        .insert({
          rfq_id: data.rfqId,
          user_id: userId,
          project_id: data.projectId,
          rfq_name: data.rfqName,
          rfq_number: data.rfqNumber,
          vendor_count: data.vendors.length,
          part_count: data.parts.length,
          status: 'sent'
        })
        .select()
        .single();

      if (trackingError) {
        throw new BadRequestException(`Failed to create RFQ tracking: ${trackingError.message}`);
      }

      // Insert vendor records
      if (data.vendors.length > 0) {
        const vendorRecords = data.vendors.map(vendor => ({
          rfq_tracking_id: trackingRecord.id,
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          vendor_email: vendor.email
        }));

        const { error: vendorError } = await client
          .from('rfq_tracking_vendors')
          .insert(vendorRecords);

        if (vendorError) {
          this.logger.error(`Failed to insert vendor tracking: ${vendorError.message}`);
          // Continue execution - main tracking record is created
        }
      }

      // Insert part records
      if (data.parts.length > 0) {
        const partRecords = data.parts.map(part => ({
          rfq_tracking_id: trackingRecord.id,
          bom_item_id: part.id,
          part_number: part.partNumber,
          description: part.description,
          process: part.process,
          quantity: part.quantity || 1,
          file_2d_path: part.file2dPath,
          file_3d_path: part.file3dPath
        }));

        const { error: partError } = await client
          .from('rfq_tracking_parts')
          .insert(partRecords);

        if (partError) {
          this.logger.error(`Failed to insert part tracking: ${partError.message}`);
          // Continue execution - main tracking record is created
        }
      }

      // Fetch complete tracking record with relationships
      return this.getTrackingById(trackingRecord.id, userId, accessToken);

    } catch (error) {
      // If the table doesn't exist yet, log warning but don't throw error
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        this.logger.warn(`RFQ tracking tables not found. Please run the database migration. RFQ tracking will be skipped.`, 'RfqTrackingService');
        // Return a minimal tracking response so the RFQ send doesn't fail
        return {
          id: 'temp',
          rfqId: data.rfqId,
          userId,
          projectId: data.projectId,
          rfqName: data.rfqName,
          rfqNumber: data.rfqNumber,
          status: RfqTrackingStatus.SENT,
          vendorCount: data.vendors.length,
          partCount: data.parts.length,
          responseCount: 0,
          sentAt: new Date(),
          vendors: data.vendors.map(v => ({ ...v, responded: false })),
          parts: data.parts.map(p => ({ 
            ...p, 
            quantity: p.quantity || 1,
            has2dFile: !!p.file2dPath,
            has3dFile: !!p.file3dPath 
          }))
        } as RfqTrackingResponseDto;
      }
      this.logger.error(`Error creating RFQ tracking: ${error.message}`);
      throw new BadRequestException(`Failed to create RFQ tracking: ${error.message}`);
    }
  }

  /**
   * Get RFQ tracking by ID with full details
   */
  async getTrackingById(
    trackingId: string,
    userId: string,
    accessToken: string
  ): Promise<RfqTrackingResponseDto> {
    const client = this.supabaseService.getClient(accessToken);

    const { data, error } = await client
      .from('rfq_tracking_summary')
      .select('*')
      .eq('id', trackingId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`RFQ tracking record not found: ${trackingId}`);
    }

    return this.mapToTrackingResponseDto(data);
  }

  /**
   * Get all RFQ tracking records for a user
   */
  async getTrackingByUser(
    userId: string,
    accessToken: string,
    projectId?: string
  ): Promise<RfqTrackingResponseDto[]> {
    const client = this.supabaseService.getClient(accessToken);

    let query = client
      .from('rfq_tracking_summary')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      // If the table doesn't exist yet, return empty array instead of throwing error
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        this.logger.warn(`RFQ tracking tables not found. Please run the database migration.`, 'RfqTrackingService');
        return [];
      }
      throw new BadRequestException(`Failed to fetch RFQ tracking: ${error.message}`);
    }

    return (data || []).map(record => this.mapToTrackingResponseDto(record));
  }

  /**
   * Update vendor response information
   */
  async updateVendorResponse(
    trackingId: string,
    vendorId: string,
    userId: string,
    accessToken: string,
    responseData: UpdateVendorResponseData
  ): Promise<void> {
    const client = this.supabaseService.getClient(accessToken);

    // Verify user owns this RFQ tracking record
    const { data: tracking, error: trackingError } = await client
      .from('rfq_tracking')
      .select('id')
      .eq('id', trackingId)
      .eq('user_id', userId)
      .single();

    if (trackingError || !tracking) {
      throw new NotFoundException(`RFQ tracking record not found: ${trackingId}`);
    }

    // Update vendor response
    const updateData: any = {
      responded: responseData.responded,
      updated_at: new Date().toISOString()
    };

    if (responseData.responded) {
      updateData.response_received_at = new Date().toISOString();
      if (responseData.quoteAmount) {
        updateData.quote_amount = responseData.quoteAmount;
      }
      if (responseData.leadTimeDays) {
        updateData.lead_time_days = responseData.leadTimeDays;
      }
    }

    const { error: updateError } = await client
      .from('rfq_tracking_vendors')
      .update(updateData)
      .eq('rfq_tracking_id', trackingId)
      .eq('vendor_id', vendorId);

    if (updateError) {
      throw new BadRequestException(`Failed to update vendor response: ${updateError.message}`);
    }

    // Update response counts and timestamps in main tracking record
    await this.updateTrackingStats(trackingId, accessToken);
  }

  /**
   * Update RFQ tracking status
   */
  async updateTrackingStatus(
    trackingId: string,
    userId: string,
    accessToken: string,
    status: 'sent' | 'responded' | 'evaluated' | 'completed' | 'cancelled'
  ): Promise<void> {
    const client = this.supabaseService.getClient(accessToken);

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await client
      .from('rfq_tracking')
      .update(updateData)
      .eq('id', trackingId)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(`Failed to update tracking status: ${error.message}`);
    }
  }

  /**
   * Delete RFQ tracking record (for cancel operation)
   */
  async deleteTracking(
    trackingId: string,
    userId: string,
    accessToken: string
  ): Promise<void> {
    const client = this.supabaseService.getClient(accessToken);

    // First verify the user owns this tracking record
    const { data: tracking, error: findError } = await client
      .from('rfq_tracking')
      .select('id')
      .eq('id', trackingId)
      .eq('user_id', userId)
      .single();

    if (findError || !tracking) {
      throw new NotFoundException(`RFQ tracking record not found: ${trackingId}`);
    }

    // Delete the tracking record (cascading will delete related vendor and part records)
    const { error: deleteError } = await client
      .from('rfq_tracking')
      .delete()
      .eq('id', trackingId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new BadRequestException(`Failed to delete RFQ tracking: ${deleteError.message}`);
    }

    this.logger.log(`RFQ tracking record deleted: ${trackingId}`);
  }

  /**
   * Get RFQ tracking statistics for dashboard
   */
  async getTrackingStats(
    userId: string,
    accessToken: string,
    projectId?: string
  ): Promise<RfqTrackingStatsDto> {
    const client = this.supabaseService.getClient(accessToken);

    let query = client
      .from('rfq_tracking')
      .select('status, sent_at, first_response_at')
      .eq('user_id', userId);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      // If the table doesn't exist yet, return default stats
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        this.logger.warn(`RFQ tracking tables not found. Please run the database migration.`, 'RfqTrackingService');
        return {
          totalSent: 0,
          totalResponded: 0,
          totalCompleted: 0,
          avgResponseTime: 0,
          recentActivity: 0
        };
      }
      throw new BadRequestException(`Failed to fetch tracking stats: ${error.message}`);
    }

    const totalSent = (data || []).length;
    const totalResponded = (data || []).filter(r => r.first_response_at).length;
    const totalCompleted = (data || []).filter(r => r.status === 'completed').length;

    // Calculate average response time
    const respondedRecords = (data || []).filter(r => r.first_response_at);
    const avgResponseTime = respondedRecords.length > 0
      ? respondedRecords.reduce((acc, record) => {
          const sentDate = new Date(record.sent_at);
          const responseDate = new Date(record.first_response_at);
          const diffDays = (responseDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
          return acc + diffDays;
        }, 0) / respondedRecords.length
      : 0;

    // Count recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = (data || []).filter(r => new Date(r.sent_at) >= sevenDaysAgo).length;

    return {
      totalSent,
      totalResponded,
      totalCompleted,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10, // Round to 1 decimal
      recentActivity
    };
  }

  /**
   * Private helper to update tracking statistics
   */
  private async updateTrackingStats(trackingId: string, accessToken: string): Promise<void> {
    const client = this.supabaseService.getClient(accessToken);

    // Get response statistics
    const { data: responseStats } = await client
      .from('rfq_tracking_vendors')
      .select('responded, response_received_at')
      .eq('rfq_tracking_id', trackingId);

    if (!responseStats) return;

    const responseCount = responseStats.filter(r => r.responded).length;
    const responseDates = responseStats
      .filter(r => r.response_received_at)
      .map(r => new Date(r.response_received_at))
      .sort();

    const updateData: any = {
      response_count: responseCount,
      updated_at: new Date().toISOString()
    };

    if (responseDates.length > 0) {
      updateData.first_response_at = responseDates[0].toISOString();
      updateData.last_response_at = responseDates[responseDates.length - 1].toISOString();
    }

    await client
      .from('rfq_tracking')
      .update(updateData)
      .eq('id', trackingId);
  }

  /**
   * Private helper to map database record to DTO
   */
  private mapToTrackingResponseDto(data: any): RfqTrackingResponseDto {
    return {
      id: data.id,
      rfqId: data.rfq_id,
      userId: data.user_id,
      projectId: data.project_id,
      rfqName: data.rfq_name,
      rfqNumber: data.rfq_number,
      status: data.status as RfqTrackingStatus,
      vendorCount: data.vendor_count,
      partCount: data.part_count,
      responseCount: data.response_count,
      sentAt: new Date(data.sent_at),
      firstResponseAt: data.first_response_at ? new Date(data.first_response_at) : undefined,
      lastResponseAt: data.last_response_at ? new Date(data.last_response_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      vendors: Array.isArray(data.vendors) ? data.vendors.map((v: any) => ({
        id: v.vendor_id,
        name: v.vendor_name,
        email: v.vendor_email,
        responded: v.responded || false,
        responseReceivedAt: v.response_received_at ? new Date(v.response_received_at) : undefined,
        quoteAmount: v.quote_amount,
        leadTimeDays: v.lead_time_days
      })) : [],
      parts: Array.isArray(data.parts) ? data.parts.map((p: any) => ({
        id: p.bom_item_id,
        partNumber: p.part_number,
        description: p.description,
        process: p.process,
        quantity: p.quantity || 1,
        file2dPath: p.file_2d_path,
        file3dPath: p.file_3d_path,
        has2dFile: !!p.file_2d_path,
        has3dFile: !!p.file_3d_path
      })) : []
    };
  }
}