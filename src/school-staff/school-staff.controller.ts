import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ParseUUIDPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { SchoolStaffService } from './school-staff.service';
import { SchoolStaff } from 'generated/prisma';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { CreateSchoolStaffDto, createSchoolStaffSchema } from './dto/create-school-staff.dto';
import { UpdateSchoolStaffDto, updateSchoolStaffSchema } from './dto/update-school-staff.dto';
import { FindByUserIdAndSchoolIdQuery, findByUserIdAndSchoolIdSchema } from './dto/find-school-staff-by-userId-schoolId';

@Controller('school-staff')
export class SchoolStaffController {
  constructor(private readonly schoolStaffService: SchoolStaffService) { }

  /**
   * Handles POST requests to create a new school staff.
   * Applies Zod validation using the createSchoolStaffSchema.
   * @param createSchoolStaffDto The data for the new school staff.
   * @returns The created school staff record.
   */
  @Post()
  @UsePipes(new ZodValidationPipe(createSchoolStaffSchema))
  async create(@Body() createSchoolStaffDto: CreateSchoolStaffDto): Promise<SchoolStaff> {
    return this.schoolStaffService.create(createSchoolStaffDto);
  }

  /**
   * Handles GET requests to retrieve all school staff records.
   * @returns A list of all school staff records.
   */
  @Get()
  async findAll(
    @Query('schoolId') schoolId?: string, // Get optional schoolId from query string (?schoolId=...)
    @Query('userId') userId?: string, 
  ): Promise<SchoolStaff[]> {
    return this.schoolStaffService.findAll(schoolId, userId);
  }

  @Get('find') // Use a specific path like 'find' to avoid conflict with the ':id' route
  @UsePipes(new ZodValidationPipe(findByUserIdAndSchoolIdSchema))
  async findByUserIdAndSchoolId(@Query() query: FindByUserIdAndSchoolIdQuery): Promise<SchoolStaff | null> {
    return this.schoolStaffService.findByUserIdAndSchoolId(query.userId, query.schoolId);
  }

  /**
   * Handles GET requests to retrieve a single school staff by ID.
   * Uses ParseUUIDPipe for basic ID format validation (though Zod schema also validates format).
   * @param id The ID of the school staff to retrieve.
   * @returns The school staff record.
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SchoolStaff | null> {
    return this.schoolStaffService.findOne(id);
  }

  /**
   * Handles PATCH requests to update a school staff record.
   * Applies Zod validation using the updateSchoolStaffSchema.
   * Uses ParseUUIDPipe for basic ID format validation.
   * @param id The ID of the school staff to update.
   * @param updateSchoolStaffDto The update data.
   * @returns The updated school staff record.
   */
  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateSchoolStaffSchema))
  async update(@Param('id') id: string, @Body() updateSchoolStaffDto: UpdateSchoolStaffDto): Promise<SchoolStaff> {
    return this.schoolStaffService.update(id, updateSchoolStaffDto);
  }

  /**
   * Handles DELETE requests to remove a school staff record.
   * Uses ParseUUIDPipe for basic ID format validation.
   * @param id The ID of the school staff to delete.
   * @returns The deleted school staff record.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Indicate successful deletion with no content
  async remove(@Param('id') id: string): Promise<void> {
    await this.schoolStaffService.remove(id);
  }
}
