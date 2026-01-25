import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  Patch,
  Delete,
  UseGuards,
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { RfqService } from './rfq.service';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { RfqRecord, RfqSummary } from './dto/rfq-response.dto';
import { 
  CreateRfqTrackingDto, 
  UpdateVendorResponseDto, 
  UpdateTrackingStatusDto,
  RfqTrackingResponseDto,
  RfqTrackingStatsDto 
} from './dto/rfq-tracking.dto';
import { RfqTrackingService } from './services/rfq-tracking.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';

@ApiTags('RFQ (Request for Quotation)')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('rfq')
export class RfqController {
  constructor(
    private readonly rfqService: RfqService,
    private readonly rfqTrackingService: RfqTrackingService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new RFQ' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'RFQ created successfully',
    type: RfqRecord
  })
  async create(
    @CurrentUser() user: any,
    @Body() createRfqDto: CreateRfqDto
  ): Promise<RfqRecord> {
    return this.rfqService.create(user.id, createRfqDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all RFQs for the current user' })
  @ApiQuery({ 
    name: 'projectId', 
    required: false, 
    description: 'Filter by project ID' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'RFQs retrieved successfully',
    type: [RfqSummary]
  })
  async findAll(
    @CurrentUser() user: any,
    @Query('projectId') projectId?: string
  ): Promise<RfqSummary[]> {
    return this.rfqService.findByUser(user.id, projectId);
  }

  // ============================================================================
  // RFQ TRACKING ENDPOINTS (Must be before parameterized routes)
  // ============================================================================

  @Post('tracking')
  @ApiOperation({ summary: 'Create RFQ tracking record' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'RFQ tracking created successfully',
    type: RfqTrackingResponseDto
  })
  async createTracking(
    @CurrentUser() user: any,
    @AccessToken() token: string,
    @Body() createTrackingDto: CreateRfqTrackingDto
  ): Promise<RfqTrackingResponseDto> {
    return this.rfqTrackingService.createTracking(user.id, token, createTrackingDto);
  }

  @Get('tracking')
  @ApiOperation({ summary: 'Get all RFQ tracking records for user' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ tracking records retrieved successfully',
    type: [RfqTrackingResponseDto]
  })
  async getTracking(
    @CurrentUser() user: any,
    @AccessToken() token: string,
    @Query('projectId') projectId?: string
  ): Promise<RfqTrackingResponseDto[]> {
    return this.rfqTrackingService.getTrackingByUser(user.id, token, projectId);
  }

  @Get('tracking/stats')
  @ApiOperation({ summary: 'Get RFQ tracking statistics' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ tracking statistics retrieved successfully',
    type: RfqTrackingStatsDto
  })
  async getTrackingStats(
    @CurrentUser() user: any,
    @AccessToken() token: string,
    @Query('projectId') projectId?: string
  ): Promise<RfqTrackingStatsDto> {
    return this.rfqTrackingService.getTrackingStats(user.id, token, projectId);
  }

  @Get('tracking/:id')
  @ApiOperation({ summary: 'Get RFQ tracking record by ID' })
  @ApiParam({ name: 'id', description: 'RFQ tracking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ tracking record retrieved successfully',
    type: RfqTrackingResponseDto
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'RFQ tracking not found' })
  async getTrackingById(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string
  ): Promise<RfqTrackingResponseDto> {
    return this.rfqTrackingService.getTrackingById(id, user.id, token);
  }

  @Patch('tracking/:id/status')
  @ApiOperation({ summary: 'Update RFQ tracking status' })
  @ApiParam({ name: 'id', description: 'RFQ tracking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ tracking status updated successfully'
  })
  async updateTrackingStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
    @Body() updateStatusDto: UpdateTrackingStatusDto
  ): Promise<{ message: string }> {
    await this.rfqTrackingService.updateTrackingStatus(id, user.id, token, updateStatusDto.status);
    return { message: 'RFQ tracking status updated successfully' };
  }

  @Patch('tracking/:trackingId/vendors/:vendorId/response')
  @ApiOperation({ summary: 'Update vendor response information' })
  @ApiParam({ name: 'trackingId', description: 'RFQ tracking ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor response updated successfully'
  })
  async updateVendorResponse(
    @Param('trackingId') trackingId: string,
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
    @Body() updateResponseDto: UpdateVendorResponseDto
  ): Promise<{ message: string }> {
    await this.rfqTrackingService.updateVendorResponse(
      trackingId,
      vendorId,
      user.id,
      token,
      updateResponseDto
    );
    return { message: 'Vendor response updated successfully' };
  }

  @Delete('tracking/:id')
  @ApiOperation({ summary: 'Delete RFQ tracking record (cancel RFQ)' })
  @ApiParam({ name: 'id', description: 'RFQ tracking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ tracking record deleted successfully'
  })
  async deleteTracking(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string
  ): Promise<{ message: string }> {
    await this.rfqTrackingService.deleteTracking(id, user.id, token);
    return { message: 'RFQ tracking record deleted successfully' };
  }

  // ============================================================================
  // STANDARD RFQ ENDPOINTS
  // ============================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Get RFQ details by ID' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'RFQ details retrieved successfully',
    type: RfqRecord
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'RFQ not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any
  ): Promise<RfqRecord> {
    return this.rfqService.findOne(id, user.id);
  }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Send RFQ to vendors' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'RFQ sent successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'RFQ already sent or invalid status' 
  })
  async sendRfq(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string
  ): Promise<{ message: string }> {
    await this.rfqService.sendRfq(id, user.id, token);
    return { message: 'RFQ sent successfully to vendors' };
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close RFQ (no more responses accepted)' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'RFQ closed successfully' 
  })
  async closeRfq(
    @Param('id') id: string,
    @CurrentUser() user: any
  ): Promise<{ message: string }> {
    await this.rfqService.closeRfq(id, user.id);
    return { message: 'RFQ closed successfully' };
  }
}