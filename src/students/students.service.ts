import { DbService } from './../db/db.service'; // Adjust path as needed
import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common'; // Added BadRequestException
import { CreateStudentDto, createStudentSchema } from './dto/create-student.dto'; // Adjust path
import { UpdateStudentDto, updateStudentSchema } from './dto/update-student.dto'; // Adjust path
import { Prisma } from 'generated/prisma';

@Injectable()
export class StudentsService {
  constructor(
    private readonly db: DbService // Assuming DbService provides PrismaClient instance as 'db'
  ) { }

  /**
   * Creates a new student record.
   * @param createStudentDto - Data transfer object containing student details.
   * @returns The newly created student record.
   * @throws BadRequestException if validation fails.
   * @throws ConflictException if a student with the same userId and schoolId already exists.
   * @throws InternalServerErrorException for other database errors.
   */
  async create(createStudentDto: CreateStudentDto) {
    // Validate DTO using Zod schema (usually done via Pipe in controller)
    const validationResult = createStudentSchema.safeParse(createStudentDto);
    if (!validationResult.success) {
      // Throw BadRequestException with Zod error details
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors, // Provides detailed errors per field
      });
    }

    // Destructure validated data, separating relation IDs and other data
    const { userId, schoolId, classId, ...restData } = validationResult.data;

    // --- Start Fix ---
    // Build the data object for Prisma create operation
    const data: Prisma.StudentCreateInput = {
      ...restData, // Spread other fields like email, name, phone etc.
      user: { connect: { id: userId } },     // Connect to existing user
      school: { connect: { id: schoolId } }, // Connect to existing school
    };

    // Conditionally connect the class if classId is provided
    if (classId) {
      data.class = { connect: { id: classId } };
    }
    // --- End Fix ---

    try {
      const newStudent = await this.db.student.create({
        // Use the constructed data object
        data,
        include: { // Include related data in the response
          class: { select: { id: true, name: true, username: true } },
          user: { select: { id: true, username: true, name: true, image: true } },
          school: { select: { id: true, name: true } } // Include school info
        }
      });
      return newStudent;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A student profile for this user already exists in this school.');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Failed to create student: Related user, school, or class not found.');
        }
      }
      // Log the detailed error for debugging
      console.error("Error creating student:", error);
      throw new InternalServerErrorException('Could not create student. Please try again later.');
    }
  }

  /**
   * Retrieves all students, optionally filtered by schoolId or userId.
   * @param schoolId - Optional ID of the school to filter by.
   * @param userId - Optional ID of the user to filter by.
   * @returns A list of student records.
   * @throws NotFoundException if ID format is invalid.
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
      const where: Prisma.StudentWhereInput = {};
      if (schoolId) {
        where.schoolId = schoolId;
      } else if (userId) {
        where.userId = userId;
      }

      const students = await this.db.student.findMany({
        where,
        include: {
          class: {
            select: {
              name: true,
              username: true,
              id: true
            },
          },
          user: {
            select: {
              username: true,
              id: true,
              name: true,
              image: true
            }
          },
          school: { // Include school info
            select: {
              id: true,
              name: true,
              logo: true
            }
          }
        },
        orderBy: {
          createAt: 'desc'
        }
      });

      return students; // Returns empty array if none found, which is valid.
    } catch (error) {
      console.error("Error finding students:", error);
      throw new InternalServerErrorException('An error occurred while retrieving students.');
    }
  }

  /**
   * Retrieves a single student by their unique ID.
   * @param id - The unique ID of the student.
   * @returns The student record.
   * @throws BadRequestException if ID format is invalid.
   * @throws NotFoundException if the student with the given ID is not found.
   * @throws InternalServerErrorException for database errors.
   */
  async findOne(id: string) {
    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid Student ID format.'); // Use BadRequest for invalid format
    }

    try {
      const student = await this.db.student.findUniqueOrThrow({
        where: { id },
        include: {
          class: { select: { id: true, name: true, username: true } },
          user: { select: { id: true, username: true, name: true, image: true } },
          school: { select: { id: true, name: true } }
        }
      });
      return student;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Student with ID '${id}' not found.`);
      }
      console.error(`Error finding student with ID ${id}:`, error);
      throw new InternalServerErrorException('An error occurred while retrieving the student.');
    }
  }

  /**
   * Updates an existing student record.
   * @param id - The unique ID of the student to update.
   * @param updateStudentDto - Data transfer object containing fields to update.
   * @returns The updated student record.
   * @throws BadRequestException if ID format or DTO validation fails.
   * @throws NotFoundException if the student with the given ID is not found.
   * @throws InternalServerErrorException for other database errors.
   */
  async update(id: string, updateStudentDto: UpdateStudentDto) {
    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid Student ID format.'); // Use BadRequest for invalid format
    }

    // Validate DTO (usually done via Pipe)
    const validationResult = updateStudentSchema.safeParse(updateStudentDto);
    if (!validationResult.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    // --- Start Fix for Update ---
    // Separate classId if present, handle optional fields carefully
    const { classId, ...restData } = validationResult.data;
    const dataToUpdate: Prisma.StudentUpdateInput = { ...restData };

    // Handle class update: connect if classId is a string, disconnect if null, do nothing if undefined
    if (classId !== undefined) { // Check if classId was present in the DTO
      if (classId === null) {
        // Explicitly disconnect the relation if null is passed
        dataToUpdate.class = { disconnect: true };
      } else {
        // Connect to the new class if a valid ID string is passed
        dataToUpdate.class = { connect: { id: classId } };
      }
    }
    // --- End Fix for Update ---


    // Prevent updating userId or schoolId if necessary (business logic decision)
    // delete dataToUpdate.userId; // Prisma prevents this by default in StudentUpdateInput
    // delete dataToUpdate.schoolId; // Prisma prevents this by default in StudentUpdateInput

    try {
      // Perform the update. findUniqueOrThrow is implicitly handled by update operation's where clause.
      // Prisma throws P2025 if the record to update is not found.
      const updatedStudent = await this.db.student.update({
        where: { id },
        data: dataToUpdate, // Use the constructed data object
        include: { // Return updated data with relations
          class: { select: { id: true, name: true, username: true } },
          user: { select: { id: true, username: true, name: true, image: true } },
          school: { select: { id: true, name: true } }
        }
      });
      return updatedStudent;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Error P2025 can mean the student to update wasn't found,
          // OR a related record to connect (like classId) wasn't found.
          // Checking the meta target can sometimes give clues, but a generic message might be safer.
          const target = (error.meta?.target as string[])?.join(', '); // Attempt to get target field
          if (target?.includes('connect')) {
            throw new NotFoundException(`Failed to update student: Related record (e.g., Class) not found.`);
          } else {
            throw new NotFoundException(`Student with ID '${id}' not found.`);
          }
        }
      }
      console.error(`Error updating student with ID ${id}:`, error);
      throw new InternalServerErrorException('Could not update student. Please try again later.');
    }
  }

  /**
   * Removes a student record by their unique ID.
   * @param id - The unique ID of the student to remove.
   * @returns Confirmation message and the deleted student data.
   * @throws BadRequestException if ID format is invalid.
   * @throws NotFoundException if the student with the given ID is not found.
   * @throws InternalServerErrorException for other database errors.
   */
  async remove(id: string) {
    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid Student ID format.'); // Use BadRequest for invalid format
    }

    try {
      // Perform the deletion. findUniqueOrThrow is implicitly handled by delete operation's where clause.
      // Prisma throws P2025 if the record to delete is not found.
      const deletedStudent = await this.db.student.delete({
        where: { id },
      });
      return { message: `Successfully deleted student with ID '${id}'.`, deletedStudent };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Student with ID '${id}' not found.`);
      }
      console.error(`Error removing student with ID ${id}:`, error);
      throw new InternalServerErrorException('Could not remove student. Please try again later.');
    }
  }
}
