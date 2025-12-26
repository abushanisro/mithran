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
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto, QueryVendorsDto } from './dto/vendor.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller({ path: 'vendors', version: '1' })
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all vendors' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
  async findAll(@Query() query: QueryVendorsDto, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.vendorsService.findAll(query, user.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.vendorsService.findOne(id, user.id, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully' })
  async create(@Body() createVendorDto: CreateVendorDto, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.vendorsService.create(createVendorDto, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor' })
  @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.vendorsService.update(id, updateVendorDto, user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vendor' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.vendorsService.remove(id, user.id, token);
  }
}
