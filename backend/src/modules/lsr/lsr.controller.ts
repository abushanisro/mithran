import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LSRService } from './lsr.service';
import { CreateLSRDto, UpdateLSRDto } from './lsr.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';

@ApiTags('LSR')
@ApiBearerAuth()
@Controller({ path: 'lsr', version: '1' })
export class LSRController {
  constructor(private readonly lsrService: LSRService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new LSR record' })
  @ApiResponse({ status: 201, description: 'LSR record created successfully' })
  @ApiResponse({ status: 409, description: 'Labour code already exists' })
  async create(
    @Body() createLSRDto: CreateLSRDto,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.lsrService.create(createLSRDto, user.id, token);
  }

  @Get()
  @ApiOperation({ summary: 'Get all LSR records with optional search' })
  @ApiResponse({ status: 200, description: 'LSR records retrieved successfully' })
  async findAll(
    @Query('search') search: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.lsrService.findAll(search, user.id, token);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get LSR statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@CurrentUser() user: any, @AccessToken() token: string) {
    return this.lsrService.getStatistics(user.id, token);
  }

  @Get('code/:labourCode')
  @ApiOperation({ summary: 'Get LSR record by labour code' })
  @ApiResponse({ status: 200, description: 'LSR record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Labour code not found' })
  async findByLabourCode(
    @Param('labourCode') labourCode: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.lsrService.findByLabourCode(labourCode, user.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get LSR record by ID' })
  @ApiResponse({ status: 200, description: 'LSR record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'LSR record not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.lsrService.findOne(id, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update LSR record' })
  @ApiResponse({ status: 200, description: 'LSR record updated successfully' })
  @ApiResponse({ status: 404, description: 'LSR record not found' })
  async update(
    @Param('id') id: string,
    @Body() updateLSRDto: UpdateLSRDto,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.lsrService.update(id, updateLSRDto, user.id, token);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete LSR record' })
  @ApiResponse({ status: 204, description: 'LSR record deleted successfully' })
  @ApiResponse({ status: 404, description: 'LSR record not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.lsrService.remove(id, user.id, token);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create LSR records' })
  @ApiResponse({ status: 201, description: 'LSR records created successfully' })
  async bulkCreate(
    @Body() data: CreateLSRDto[],
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.lsrService.bulkCreate(data, user.id, token);
  }
}
