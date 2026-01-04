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
import { ProcessesService } from './processes.service';
import { CreateProcessDto, UpdateProcessDto, QueryProcessesDto } from './dto/processes.dto';
import { ProcessResponseDto, ProcessListResponseDto } from './dto/process-response.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Processes')
@ApiBearerAuth()
@Controller({ path: 'processes', version: '1' })
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all processes' })
  @ApiResponse({ status: 200, description: 'Processes retrieved successfully', type: ProcessListResponseDto })
  async findAll(@Query() query: QueryProcessesDto, @CurrentUser() user?: any, @AccessToken() token?: string): Promise<ProcessListResponseDto> {
    return this.processesService.findAll(query, user?.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get process by ID' })
  @ApiResponse({ status: 200, description: 'Process retrieved successfully', type: ProcessResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string): Promise<ProcessResponseDto> {
    return this.processesService.findOne(id, user.id, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new process' })
  @ApiResponse({ status: 201, description: 'Process created successfully', type: ProcessResponseDto })
  async create(@Body() createProcessDto: CreateProcessDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ProcessResponseDto> {
    return this.processesService.create(createProcessDto, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update process' })
  @ApiResponse({ status: 200, description: 'Process updated successfully', type: ProcessResponseDto })
  async update(@Param('id') id: string, @Body() updateProcessDto: UpdateProcessDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ProcessResponseDto> {
    return this.processesService.update(id, updateProcessDto, user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete process' })
  @ApiResponse({ status: 200, description: 'Process deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.processesService.remove(id, user.id, token);
  }
}
