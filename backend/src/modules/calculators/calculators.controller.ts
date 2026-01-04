import { Controller, Get, Post, Put, Delete, Body, Param, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CalculatorsServiceV2 } from './calculators.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';
import { CreateCalculatorDto, UpdateCalculatorDto, QueryCalculatorDto, ExecuteCalculatorDto } from './dto/calculator.dto';

@ApiTags('Calculators')
@ApiBearerAuth()
@Controller({ path: 'calculators', version: '1' })
export class CalculatorsController {
  constructor(
    @Inject(forwardRef(() => CalculatorsServiceV2))
    private readonly calculatorsService: CalculatorsServiceV2
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all calculators' })
  @ApiResponse({ status: 200, description: 'Calculators retrieved successfully' })
  async findAll(
    @Query() query: QueryCalculatorDto,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.calculatorsService.findAll(query, user.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get calculator by ID' })
  @ApiResponse({ status: 200, description: 'Calculator retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Calculator not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.calculatorsService.findOne(id, user.id, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new calculator' })
  @ApiResponse({ status: 201, description: 'Calculator created successfully' })
  async create(
    @Body() dto: CreateCalculatorDto,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.calculatorsService.create(dto, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update calculator' })
  @ApiResponse({ status: 200, description: 'Calculator updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCalculatorDto,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.calculatorsService.update(id, dto, user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete calculator' })
  @ApiResponse({ status: 200, description: 'Calculator deleted successfully' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.calculatorsService.remove(id, user.id, token);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute calculator formulas' })
  @ApiResponse({ status: 200, description: 'Calculator executed successfully' })
  async execute(
    @Param('id') id: string,
    @Body() dto: ExecuteCalculatorDto,
    @CurrentUser() user: any,
    @AccessToken() token: string,
  ) {
    return this.calculatorsService.execute(id, dto, user.id, token);
  }

}
