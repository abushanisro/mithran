import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MHRService } from './mhr.service';
import { CreateMHRDto, UpdateMHRDto, QueryMHRDto } from './dto/mhr.dto';
import { MHRResponseDto, MHRListResponseDto } from './dto/mhr-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('MHR')
@ApiBearerAuth()
@Controller({ path: 'mhr', version: '1' })
export class MHRController {
  constructor(private readonly mhrService: MHRService) {}

  @Get()
  @ApiOperation({ summary: 'Get all MHR records with pagination and filters' })
  @ApiResponse({ status: 200, description: 'MHR records retrieved successfully', type: MHRListResponseDto })
  async findAll(@Query() query: QueryMHRDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<MHRListResponseDto> {
    return this.mhrService.findAll(query, user.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get MHR record by ID' })
  @ApiResponse({ status: 200, description: 'MHR record retrieved successfully', type: MHRResponseDto })
  @ApiResponse({ status: 404, description: 'MHR record not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string): Promise<MHRResponseDto> {
    return this.mhrService.findOne(id, user.id, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new MHR record' })
  @ApiResponse({ status: 201, description: 'MHR record created successfully', type: MHRResponseDto })
  async create(@Body() createMHRDto: CreateMHRDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<MHRResponseDto> {
    return this.mhrService.create(createMHRDto, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update MHR record' })
  @ApiResponse({ status: 200, description: 'MHR record updated successfully', type: MHRResponseDto })
  async update(@Param('id') id: string, @Body() updateMHRDto: UpdateMHRDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<MHRResponseDto> {
    return this.mhrService.update(id, updateMHRDto, user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete MHR record' })
  @ApiResponse({ status: 200, description: 'MHR record deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.mhrService.remove(id, user.id, token);
  }
}
