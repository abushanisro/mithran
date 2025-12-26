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
import { BOMsService } from './boms.service';
import { CreateBOMDto, UpdateBOMDto, QueryBOMsDto } from './dto/boms.dto';
import { BOMResponseDto, BOMListResponseDto } from './dto/bom-response.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';

@ApiTags('BOMs')
@ApiBearerAuth()
@Controller({ path: 'bom', version: '1' })
export class BOMsController {
  constructor(private readonly bomsService: BOMsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all BOMs' })
  @ApiResponse({ status: 200, description: 'BOMs retrieved successfully', type: BOMListResponseDto })
  async findAll(@Query() query: QueryBOMsDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<BOMListResponseDto> {
    return this.bomsService.findAll(query, user.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get BOM by ID' })
  @ApiResponse({ status: 200, description: 'BOM retrieved successfully', type: BOMResponseDto })
  @ApiResponse({ status: 404, description: 'BOM not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string): Promise<BOMResponseDto> {
    return this.bomsService.findOne(id, user.id, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new BOM' })
  @ApiResponse({ status: 201, description: 'BOM created successfully', type: BOMResponseDto })
  async create(@Body() createBOMDto: CreateBOMDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<BOMResponseDto> {
    return this.bomsService.create(createBOMDto, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update BOM' })
  @ApiResponse({ status: 200, description: 'BOM updated successfully', type: BOMResponseDto })
  async update(@Param('id') id: string, @Body() updateBOMDto: UpdateBOMDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<BOMResponseDto> {
    return this.bomsService.update(id, updateBOMDto, user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete BOM' })
  @ApiResponse({ status: 200, description: 'BOM deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.bomsService.remove(id, user.id, token);
  }
}
