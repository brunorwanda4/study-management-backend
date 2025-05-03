import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query, // Import Query decorator
  UsePipes, // Import UsePipes decorator
  ParseUUIDPipe, // Optional: If you want strict UUID validation for params
  ParseIntPipe, // Keep if needed elsewhere, but not for ObjectId strings
  NotFoundException, // Import for potential custom checks
  BadRequestException, // Import for parameter validation
} from '@nestjs/common';
import { StudentsService } from './students.service';
// Assuming your Zod DTOs are exported correctly
import { CreateStudentDto, createStudentSchema } from './dto/create-student.dto';
import { UpdateStudentDto, updateStudentSchema } from './dto/update-student.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
// You might need a custom ZodValidationPipe or configure ValidationPipe globally
// For this example, we'll apply the standard ValidationPipe, assuming setup elsewhere
// or that DTOs are class-validator based if not using a Zod pipe.

@Controller('students') // Route prefix for all methods in this controller
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /**
   * POST /students
   * Creates a new student. Applies validation pipe to the request body.
   * @param createStudentDto - Data for creating the student.
   */
  @Post()
  @UsePipes(new ZodValidationPipe(createStudentSchema))
  create(@Body() createStudentDto: CreateStudentDto) {
    // The DTO is validated by the pipe before this method runs
    return this.studentsService.create(createStudentDto);
  }

  /**
   * GET /students
   * Finds all students, optionally filtering by schoolId or userId from query parameters.
   * @param schoolId - Optional query parameter to filter by school.
   * @param userId - Optional query parameter to filter by user.
   */
  @Get()
  findAll(
    @Query('schoolId') schoolId?: string, // Get optional schoolId from query string (?schoolId=...)
    @Query('userId') userId?: string, // Get optional userId from query string (?userId=...)
    @Query('classId') classId?: string, // Get optional userId from query string (?userId=...)
  ) {
     // Optional: Add validation for query parameter formats if needed here or in the service
     if (schoolId && !/^[0-9a-fA-F]{24}$/.test(schoolId)) {
        throw new BadRequestException('Invalid School ID format in query parameter.');
     }
     if (userId && !/^[0-9a-fA-F]{24}$/.test(userId)) {
        throw new BadRequestException('Invalid User ID format in query parameter.');
     }
     if (classId && !/^[0-9a-fA-F]{24}$/.test(classId)) {
        throw new BadRequestException('Invalid class ID format in query parameter.');
     }
    // Pass the query parameters to the service method
    return this.studentsService.findAll(schoolId, userId,classId);
  }

  /**
   * GET /students/:id
   * Finds a single student by their ID (ObjectId string).
   * @param id - The student's ID from the URL path.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new BadRequestException('Invalid Student ID format.');
    }
    // Pass the string ID directly to the service (removed the `+` conversion)
    return this.studentsService.findOne(id);
  }

  /**
   * PATCH /students/:id
   * Updates a student by ID. Applies validation pipe to the request body.
   * @param id - The student's ID from the URL path.
   * @param updateStudentDto - Data to update the student with.
   */
  @Patch(':id')
  // Apply ValidationPipe to validate the incoming body against UpdateStudentDto rules
  @UsePipes(new ZodValidationPipe(updateStudentSchema))
  update(
    @Param('id') id: string, // Get ID from URL
    @Body() updateStudentDto: UpdateStudentDto, // Get update data from body
  ) {
     // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new BadRequestException('Invalid Student ID format.');
    }
    // Pass the string ID and validated DTO to the service (removed the `+` conversion)
    return this.studentsService.update(id, updateStudentDto);
  }

  /**
   * DELETE /students/:id
   * Removes a student by ID.
   * @param id - The student's ID from the URL path.
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
     // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new BadRequestException('Invalid Student ID format.');
    }
    // Pass the string ID directly to the service (removed the `+` conversion)
    return this.studentsService.remove(id);
  }
}
