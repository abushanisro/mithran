import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  Patch,
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
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('RFQ (Request for Quotation)')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('rfq')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new RFQ' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'RFQ created successfully',
    type: RfqRecord
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createRfqDto: CreateRfqDto
  ): Promise<RfqRecord> {
    return this.rfqService.create(userId, createRfqDto);
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
    @CurrentUser('sub') userId: string,
    @Query('projectId') projectId?: string
  ): Promise<RfqSummary[]> {
    return this.rfqService.findByUser(userId, projectId);
  }

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
    @CurrentUser('sub') userId: string
  ): Promise<RfqRecord> {
    return this.rfqService.findOne(id, userId);
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
    @CurrentUser('sub') userId: string
  ): Promise<{ message: string }> {
    await this.rfqService.sendRfq(id, userId);
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
    @CurrentUser('sub') userId: string
  ): Promise<{ message: string }> {
    await this.rfqService.closeRfq(id, userId);
    return { message: 'RFQ closed successfully' };
  }
}