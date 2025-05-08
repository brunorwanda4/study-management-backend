import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { CreateSchoolStaffDto } from './dto/create-school-staff.dto';
import { UpdateSchoolStaffDto } from './dto/update-school-staff.dto';
import { Prisma, SchoolStaff } from 'generated/prisma';

@Injectable()
export class SchoolStaffService {
  constructor(private readonly dbService: DbService,) { }

  /**
   * Creates a new school staff record.
   * @param data The data for the new school staff.
   * @returns The created school staff record.
   */
  async create(data: CreateSchoolStaffDto): Promise<SchoolStaff> {
    return this.dbService.schoolStaff.create({
      data,
    });
  }

  /**
   * Retrieves all school staff records.
   * @returns A list of all school staff records.
   */
  async findAll(schoolId?: string, userId?: string,) {
    if (schoolId && !/^[0-9a-fA-F]{24}$/.test(schoolId)) {
      throw new BadRequestException('Invalid School ID format.');
    }
    if (userId && !/^[0-9a-fA-F]{24}$/.test(userId)) {
      throw new BadRequestException('Invalid User ID format.');
    }

    const where: Prisma.SchoolStaffWhereInput = {};
    if (schoolId) {
      where.schoolId = schoolId;
    } else if (userId) {
      where.userId = userId;
    }
    return this.dbService.schoolStaff.findMany({
      where, include: {
        user: {
          select: {
            username: true,
            id: true,
            name: true,
            image: true
          }
        },
        school: {
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
  }

  /**
   * Retrieves a single school staff record by its ID.
   * @param id The ID of the school staff.
   * @returns The school staff record, or null if not found.
   */
  async findOne(id: string): Promise<SchoolStaff | null> {
    return this.dbService.schoolStaff.findUnique({
      where: { id },
    });
  }

  /**
   * Retrieves a school staff record by userId and schoolId.
   * Uses the unique constraint defined in the Prisma schema.
   * @param userId The ID of the user.
   * @param schoolId The ID of the school.
   * @returns The school staff record, or null if not found.
   */
  async findByUserIdAndSchoolId(userId: string, schoolId: string): Promise<SchoolStaff | null> {
    return this.dbService.schoolStaff.findUnique({
      where: {
        userId_schoolId: {
          userId: userId,
          schoolId: schoolId,
        },
      },
    });
  }

  /**
   * Updates a school staff record.
   * @param id The ID of the school staff to update.
   * @param data The update data.
   * @returns The updated school staff record.
   * @throws NotFoundException if the school staff with the given ID is not found.
   */
  async update(id: string, data: UpdateSchoolStaffDto): Promise<SchoolStaff> {
    const existingStaff = await this.dbService.schoolStaff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      throw new NotFoundException(`School staff with ID ${id} not found`);
    }

    return this.dbService.schoolStaff.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes a school staff record by its ID.
   * @param id The ID of the school staff to delete.
   * @returns The deleted school staff record.
   * @throws NotFoundException if the school staff with the given ID is not found.
   */
  async remove(id: string): Promise<SchoolStaff> {
    const existingStaff = await this.dbService.schoolStaff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      throw new NotFoundException(`School staff with ID ${id} not found`);
    }

    return this.dbService.schoolStaff.delete({
      where: { id },
    });
  }
}
