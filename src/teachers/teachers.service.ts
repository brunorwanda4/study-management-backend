import { DbService } from './../db/db.service'; // Adjust path as needed
import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { CreateTeacherDto, createTeacherSchema } from './dto/create-teacher.dto'; // Adjust path
import { UpdateTeacherDto, validatedUpdateTeacherSchema } from './dto/update-teacher.dto'; // Adjust path
import { Prisma } from 'generated/prisma'; // Adjust import path if needed

@Injectable()
export class TeachersService {
  constructor(
    private readonly db: DbService // Assuming DbService provides PrismaClient instance as 'db'
  ) { }

  /**
   * Creates a new teacher record.
   * @param createTeacherDto - Data transfer object containing teacher details.
   * @returns The newly created teacher record.
   * @throws BadRequestException if validation fails.
   * @throws ConflictException if a teacher with the same userId and schoolId already exists.
   * @throws NotFoundException if related user or school not found.
   * @throws InternalServerErrorException for other database errors.
   */
  async create(createTeacherDto: CreateTeacherDto) {
    const validationResult = createTeacherSchema.safeParse(createTeacherDto);
    if (!validationResult.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { userId, schoolId, ...restData } = validationResult.data;

    const data: Prisma.TeacherCreateInput = {
      ...restData,
      user: { connect: { id: userId } },
      school: { connect: { id: schoolId } },
      // Initialize relations if needed, e.g., Classes: { connect: [] }
    };

    try {
      const newTeacher = await this.db.teacher.create({
        data,
        include: { // Include related data in the response
          user: { select: { id: true, username: true, name: true, image: true } },
          school: { select: { id: true, name: true, logo: true } }
        }
      });
      return newTeacher;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation (likely @@unique([userId, schoolId]))
          throw new ConflictException('A teacher profile for this user already exists in this school.');
        }
        if (error.code === 'P2025') {
          // Related record not found (User or School)
          throw new NotFoundException('Failed to create teacher: Related user or school not found.');
        }
      }
      console.error("Error creating teacher:", error);
      throw new InternalServerErrorException('Could not create teacher. Please try again later.');
    }
  }

  /**
   * Retrieves all teachers, optionally filtered by schoolId or userId.
   * @param schoolId - Optional ID of the school to filter by.
   * @param userId - Optional ID of the user to filter by.
   * @returns A list of teacher records.
   * @throws BadRequestException if ID format is invalid.
   * @throws InternalServerErrorException for database errors.
   */
  async findAll(schoolId?: string, userId?: string) {
    if (schoolId && !/^[0-9a-fA-F]{24}$/.test(schoolId)) {
      throw new BadRequestException('Invalid School ID format.');
    }
    if (userId && !/^[0-9a-fA-F]{24}$/.test(userId)) {
      throw new BadRequestException('Invalid User ID format.');
    }

    try {
      const where: Prisma.TeacherWhereInput = {};
      if (schoolId) {
        where.schoolId = schoolId;
      } else if (userId) { // Note: If both are provided, schoolId takes precedence here
        where.userId = userId;
      }

      const teachers = await this.db.teacher.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, name: true, image: true } },
          school: { select: { id: true, name: true, logo: true } },
          // Optionally include counts or basic info for Class/Module
          // _count: { select: { Class: true, Module: true } }
        },
        orderBy: {
          createAt: 'desc'
        }
      });
      return teachers;
    } catch (error) {
      console.error("Error finding teachers:", error);
      throw new InternalServerErrorException('An error occurred while retrieving teachers.');
    }
  }

  /**
   * Retrieves a single teacher by their unique ID.
   * @param id - The unique ID of the teacher.
   * @returns The teacher record.
   * @throws BadRequestException if ID format is invalid.
   * @throws NotFoundException if the teacher with the given ID is not found.
   * @throws InternalServerErrorException for database errors.
   */
  async findOne(id: string) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid Teacher ID format.');
    }

    try {
      const teacher = await this.db.teacher.findUniqueOrThrow({
        where: { id },
        include: {
          user: { select: { id: true, username: true, name: true, image: true } },
          school: { select: { id: true, name: true, logo: true } },
          Class: { select: { id: true, name: true } }, // Include related classes
          Module: { select: { id: true, name: true } } // Include related modules
        }
      });
      return teacher;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Teacher with ID '${id}' not found.`);
      }
      console.error(`Error finding teacher with ID ${id}:`, error);
      throw new InternalServerErrorException('An error occurred while retrieving the teacher.');
    }
  }

  /**
   * Updates an existing teacher record.
   * @param id - The unique ID of the teacher to update.
   * @param updateTeacherDto - Data transfer object containing fields to update.
   * @returns The updated teacher record.
   * @throws BadRequestException if ID format or DTO validation fails.
   * @throws NotFoundException if the teacher with the given ID is not found.
   * @throws InternalServerErrorException for other database errors.
   */
  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid Teacher ID format.');
    }

    // Use the refined schema that ensures at least one field is present
    const validationResult = validatedUpdateTeacherSchema.safeParse(updateTeacherDto);
    if (!validationResult.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const dataToUpdate: Prisma.TeacherUpdateInput = {
      ...validationResult.data, // Spread validated optional fields
      // Do not allow updating userId or schoolId here
      // If you need to manage relations like Class/Module, handle connect/disconnect logic here
    };

    try {
      const updatedTeacher = await this.db.teacher.update({
        where: { id },
        data: dataToUpdate,
        include: { // Return updated data with relations
          user: { select: { id: true, username: true, name: true, image: true } },
          school: { select: { id: true, name: true, logo: true } }
        }
      });
      return updatedTeacher;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Can be triggered if the teacher ID doesn't exist OR if trying to connect a non-existent related record
           const target = (error.meta?.target as string[])?.join(', ');
           if (target?.includes('connect')) {
             throw new NotFoundException(`Failed to update teacher: A related record was not found.`);
           } else {
            throw new NotFoundException(`Teacher with ID '${id}' not found.`);
           }
        }
        // Add handling for other potential errors like unique constraint violations if fields become unique
      }
      console.error(`Error updating teacher with ID ${id}:`, error);
      throw new InternalServerErrorException('Could not update teacher. Please try again later.');
    }
  }

  /**
   * Removes a teacher record by their unique ID.
   * @param id - The unique ID of the teacher to remove.
   * @returns Confirmation message and the deleted teacher data.
   * @throws BadRequestException if ID format is invalid.
   * @throws NotFoundException if the teacher with the given ID is not found.
   * @throws InternalServerErrorException for other database errors.
   */
  async remove(id: string) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid Teacher ID format.');
    }

    try {
      const deletedTeacher = await this.db.teacher.delete({
        where: { id },
      });
      return { message: `Successfully deleted teacher with ID '${id}'.`, deletedTeacher };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Teacher with ID '${id}' not found.`);
      }
      console.error(`Error removing teacher with ID ${id}:`, error);
      throw new InternalServerErrorException('Could not remove teacher. Please try again later.');
    }
  }
}