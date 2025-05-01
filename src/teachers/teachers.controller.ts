import { ZodValidationPipe } from './../common/pipes/zod-validation.pipe';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, createTeacherSchema } from './dto/create-teacher.dto';
import { UpdateTeacherDto, updateTeacherSchema } from './dto/update-teacher.dto';

// Optional: Swagger decorators for API documentation
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Teachers') // Group endpoints in Swagger UI
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new teacher profile' })
  @ApiResponse({ status: 201, description: 'Teacher created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed.' })
  @ApiResponse({ status: 404, description: 'Not Found - Related User or School not found.' })
  @ApiResponse({ status: 409, description: 'Conflict - Teacher profile already exists for this user in this school.' })
  @UsePipes(new ZodValidationPipe(createTeacherSchema))
  create(@Body(new ZodValidationPipe(createTeacherSchema)) createTeacherDto: CreateTeacherDto) {
    return this.teachersService.create(createTeacherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teachers, optionally filtered by school or user' })
  @ApiQuery({ name: 'schoolId', required: false, description: 'Filter teachers by school ID', type: String })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter teachers by user ID', type: String })
  @ApiResponse({ status: 200, description: 'List of teachers.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid ID format.' })
  findAll(@Query('schoolId') schoolId?: string, @Query('userId') userId?: string) {
    return this.teachersService.findAll(schoolId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific teacher by ID' })
  @ApiParam({ name: 'id', description: 'The unique ID of the teacher', type: String })
  @ApiResponse({ status: 200, description: 'Teacher details.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid ID format.' })
  @ApiResponse({ status: 404, description: 'Not Found - Teacher not found.' })
  findOne(@Param('id') id: string) {
    // ID format validation happens in the service
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a teacher\'s profile' })
  @ApiParam({ name: 'id', description: 'The unique ID of the teacher to update', type: String })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid ID format or validation failed.' })
  @ApiResponse({ status: 404, description: 'Not Found - Teacher or related entity not found.' })
  @UsePipes(new ZodValidationPipe(updateTeacherSchema))
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    // ID format and DTO validation happen in the service
    return this.teachersService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a teacher profile' })
  @ApiParam({ name: 'id', description: 'The unique ID of the teacher to delete', type: String })
  @ApiResponse({ status: 200, description: 'Teacher deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid ID format.' })
  @ApiResponse({ status: 404, description: 'Not Found - Teacher not found.' })
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}