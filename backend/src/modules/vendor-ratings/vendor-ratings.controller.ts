import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { VendorRatingsService, VendorRating, VendorRatingAggregate } from './vendor-ratings.service';
import { CreateVendorRatingDto, UpdateVendorRatingDto, VendorRatingQueryDto, VendorRatingAggregateQueryDto } from './dto';

enum PerformanceTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  INSUFFICIENT_DATA = 'insufficient_data',
}

@Controller('vendor-ratings')
export class VendorRatingsController {
  constructor(private readonly vendorRatingsService: VendorRatingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createVendorRatingDto: CreateVendorRatingDto,
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
    data: VendorRating;
  }> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const rating = await this.vendorRatingsService.create(createVendorRatingDto, token);
    return {
      success: true,
      message: 'Vendor rating created successfully',
      data: rating,
    };
  }

  @Get()
  async findAll(@Query() query: VendorRatingQueryDto, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return this.vendorRatingsService.findAll(query, token);
  }

  @Get('aggregates')
  async findAggregates(@Query() query: VendorRatingAggregateQueryDto, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return this.vendorRatingsService.findAggregates(query, token);
  }

  @Get('top-performers')
  async getTopPerformers(
    @Query('limit') limit?: string,
  ): Promise<{
    success: boolean;
    data: VendorRatingAggregate[];
  }> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const topPerformers = await this.vendorRatingsService.getTopPerformingVendors(limitNum);
    return {
      success: true,
      data: topPerformers,
    };
  }

  @Get('vendor/:vendorId')
  async getVendorRatings(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<{
    success: boolean;
    data: VendorRating[];
  }> {
    const ratings = await this.vendorRatingsService.findByVendor(vendorId);
    return {
      success: true,
      data: ratings,
    };
  }

  @Get('vendor/:vendorId/aggregate')
  async getVendorAggregate(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<{
    success: boolean;
    data: VendorRatingAggregate | null;
  }> {
    const aggregate = await this.vendorRatingsService.getVendorAggregate(vendorId);
    return {
      success: true,
      data: aggregate,
    };
  }

  @Get('vendor/:vendorId/stats')
  async getVendorStats(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<{
    success: boolean;
    data: {
      totalRatings: number;
      averageRating: number;
      ratingBreakdown: Record<string, number>;
      recentTrend: string;
    };
  }> {
    const stats = await this.vendorRatingsService.getVendorStats(vendorId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('vendor/:vendorId/trends')
  async getVendorTrends(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('months') months?: string,
  ): Promise<{
    success: boolean;
    data: {
      labels: string[];
      avgRatings: number[];
      ratingCounts: number[];
    };
  }> {
    const monthsNum = months ? parseInt(months, 10) : 12;
    const trends = await this.vendorRatingsService.getRatingTrends(vendorId, monthsNum);
    return {
      success: true,
      data: trends,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    data: VendorRating;
  }> {
    const rating = await this.vendorRatingsService.findOne(id);
    return {
      success: true,
      data: rating,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVendorRatingDto: UpdateVendorRatingDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: VendorRating;
  }> {
    const rating = await this.vendorRatingsService.update(id, updateVendorRatingDto);
    return {
      success: true,
      message: 'Vendor rating updated successfully',
      data: rating,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.vendorRatingsService.remove(id);
    return {
      success: true,
      message: 'Vendor rating deleted successfully',
    };
  }

  @Post('refresh-aggregates')
  @HttpCode(HttpStatus.OK)
  async refreshAggregates(): Promise<{
    success: boolean;
    message: string;
  }> {
    // This would normally be protected by admin guards
    await this.vendorRatingsService['refreshRatingAggregates']();
    return {
      success: true,
      message: 'Rating aggregates refreshed successfully',
    };
  }
}