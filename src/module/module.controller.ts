import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  UsePipes, 
  ValidationPipe,
  ParseUUIDPipe 
} from '@nestjs/common';
import { ModuleService } from './module.service';
import { CreateModuleDto, CreateModuleSchema } from './dto/create-module.dto';
import { UpdateModuleDto, UpdateModuleSchema } from './dto/update-module.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Modules')
@Controller('modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new module' })
  @ApiResponse({ status: 201, description: 'Module created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed.' })
  @ApiResponse({ status: 409, description: 'Conflict - Module with this code already exists.' })
  @UsePipes(new ZodValidationPipe(CreateModuleSchema))
  create(@Body() createModuleDto: CreateModuleDto) {
    return this.moduleService.createModule(createModuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modules with optional filtering' })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip', type: Number })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take', type: Number })
  @ApiQuery({ name: 'teacherId', required: false, description: 'Filter by teacher ID', type: String })
  @ApiQuery({ name: 'classId', required: false, description: 'Filter by class ID', type: String })
  @ApiQuery({ name: 'schoolId', required: false, description: 'Filter by school ID', type: String })
  @ApiResponse({ status: 200, description: 'List of modules.' })
  findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('teacherId') teacherId?: string,
    @Query('classId') classId?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    if (teacherId) {
      return this.moduleService.getModulesByTeacher(teacherId, { skip, take });
    }
    if (classId) {
      return this.moduleService.getModulesByClass(classId, { skip, take });
    }
    if (schoolId) {
      return this.moduleService.getModulesBySchool(schoolId, { skip, take });
    }
    return this.moduleService.getAllModules({ skip, take });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search modules by name' })
  @ApiQuery({ name: 'name', required: true, description: 'Search query for module name', type: String })
  @ApiResponse({ status: 200, description: 'List of matching modules.' })
  searchByName(@Query('name') nameQuery: string) {
    return this.moduleService.searchModulesByName(nameQuery);
  }

  @Get('unassigned')
  @ApiOperation({ summary: 'Get unassigned modules (no teacher and no class)' })
  @ApiResponse({ status: 200, description: 'List of unassigned modules.' })
  getUnassigned() {
    return this.moduleService.getUnassignedModules();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a module by ID' })
  @ApiParam({ name: 'id', description: 'Module ID', type: String })
  @ApiResponse({ status: 200, description: 'Module details.' })
  @ApiResponse({ status: 404, description: 'Module not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleService.getModuleById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', description: 'Module ID', type: String })
  @ApiResponse({ status: 200, description: 'Module updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed.' })
  @ApiResponse({ status: 404, description: 'Module or related entity not found.' })
  @ApiResponse({ status: 409, description: 'Conflict - Unique constraint violation.' })
  @UsePipes(new ZodValidationPipe(UpdateModuleSchema))
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateModuleDto: UpdateModuleDto
  ) {
    return this.moduleService.updateModule(id, updateModuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a module' })
  @ApiParam({ name: 'id', description: 'Module ID', type: String })
  @ApiResponse({ status: 200, description: 'Module deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Module not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleService.deleteModule(id);
  }

  @Post(':moduleId/assign-teacher/:teacherId')
  @ApiOperation({ summary: 'Assign a teacher to a module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID', type: String })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID', type: String })
  @ApiResponse({ status: 200, description: 'Teacher assigned successfully.' })
  @ApiResponse({ status: 404, description: 'Module or Teacher not found.' })
  assignTeacher(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
  ) {
    return this.moduleService.assignModuleToTeacher(moduleId, teacherId);
  }

  @Post(':moduleId/remove-teacher')
  @ApiOperation({ summary: 'Remove teacher from a module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID', type: String })
  @ApiResponse({ status: 200, description: 'Teacher removed successfully.' })
  @ApiResponse({ status: 404, description: 'Module not found.' })
  removeTeacher(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.moduleService.removeModuleTeacher(moduleId);
  }

  @Post(':moduleId/assign-class/:classId')
  @ApiOperation({ summary: 'Assign a module to a class' })
  @ApiParam({ name: 'moduleId', description: 'Module ID', type: String })
  @ApiParam({ name: 'classId', description: 'Class ID', type: String })
  @ApiResponse({ status: 200, description: 'Module assigned to class successfully.' })
  @ApiResponse({ status: 404, description: 'Module or Class not found.' })
  assignToClass(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.moduleService.assignModuleToClass(moduleId, classId);
  }

  @Post(':moduleId/remove-class')
  @ApiOperation({ summary: 'Remove module from its class' })
  @ApiParam({ name: 'moduleId', description: 'Module ID', type: String })
  @ApiResponse({ status: 200, description: 'Module removed from class successfully.' })
  @ApiResponse({ status: 404, description: 'Module not found.' })
  removeFromClass(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.moduleService.removeModuleFromClass(moduleId);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple modules in bulk' })
  @ApiResponse({ status: 201, description: 'Bulk creation completed with results.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed for one or more items.' })
  bulkCreate(@Body() createModuleDtos: CreateModuleDto[]) {
    return this.moduleService.bulkCreateModules(createModuleDtos);
  }
}