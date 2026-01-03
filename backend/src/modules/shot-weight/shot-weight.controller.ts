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
import { ShotWeightService } from './shot-weight.service';
import { CreateShotWeightDto, UpdateShotWeightDto, QueryShotWeightDto } from './dto/shot-weight.dto';
import { ShotWeightResponseDto, ShotWeightListResponseDto } from './dto/shot-weight-response.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';

@ApiTags('Shot Weight Calculator')
@ApiBearerAuth()
@Controller({ path: 'shot-weight', version: '1' })
export class ShotWeightController {
  constructor(private readonly shotWeightService: ShotWeightService) {}

  @Get()
  @ApiOperation({ summary: 'Get all shot weight calculations with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Shot weight calculations retrieved successfully', type: ShotWeightListResponseDto })
  async findAll(@Query() query: QueryShotWeightDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ShotWeightListResponseDto> {
    return this.shotWeightService.findAll(query, user.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shot weight calculation by ID' })
  @ApiResponse({ status: 200, description: 'Shot weight calculation retrieved successfully', type: ShotWeightResponseDto })
  @ApiResponse({ status: 404, description: 'Shot weight calculation not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string): Promise<ShotWeightResponseDto> {
    return this.shotWeightService.findOne(id, user.id, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new shot weight calculation' })
  @ApiResponse({ status: 201, description: 'Shot weight calculation created successfully', type: ShotWeightResponseDto })
  async create(@Body() createDto: CreateShotWeightDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ShotWeightResponseDto> {
    return this.shotWeightService.create(createDto, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update shot weight calculation' })
  @ApiResponse({ status: 200, description: 'Shot weight calculation updated successfully', type: ShotWeightResponseDto })
  async update(@Param('id') id: string, @Body() updateDto: UpdateShotWeightDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ShotWeightResponseDto> {
    return this.shotWeightService.update(id, updateDto, user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete shot weight calculation' })
  @ApiResponse({ status: 200, description: 'Shot weight calculation deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.shotWeightService.remove(id, user.id, token);
  }
}
