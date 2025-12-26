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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectsDto } from './dto/projects.dto';
import { ProjectResponseDto, ProjectListResponseDto } from './dto/project-response.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AccessToken } from '../../common/decorators/access-token.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects with pagination' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully', type: ProjectListResponseDto })
  async findAll(@Query() query: QueryProjectsDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ProjectListResponseDto> {
    return this.projectsService.findAll(query, user.id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, user.id, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully', type: ProjectResponseDto })
  async create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ProjectResponseDto> {
    return this.projectsService.create(createProjectDto, user.id, token);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully', type: ProjectResponseDto })
  async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @CurrentUser() user: any, @AccessToken() token: string): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, updateProjectDto, user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.projectsService.remove(id, user.id, token);
  }

  @Get(':id/cost-analysis')
  @ApiOperation({ summary: 'Get project cost analysis' })
  @ApiResponse({ status: 200, description: 'Cost analysis retrieved successfully' })
  async getCostAnalysis(@Param('id') id: string, @CurrentUser() user: any, @AccessToken() token: string) {
    return this.projectsService.getCostAnalysis(id, user.id, token);
  }
}
