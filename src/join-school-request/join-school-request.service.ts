import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSchoolJoinRequestDto } from './dto/update-school-join-request.dto';
import { GetRequestsFilterDto } from './dto/filter-school-join-request.dto';
import { DbService } from 'src/db/db.service';
import { SchoolJoinRequest } from 'generated/prisma';
import { CreateJoinSchoolRequestDto } from './dto/join-school-request.dto';
import { AuthUserDto } from 'src/user/dto/user.dto';

@Injectable()
export class SchoolJoinRequestService {
  constructor(
    private readonly dbService: DbService,
  ) { }

  // CREATE (assuming you have this)
  async create(data: CreateJoinSchoolRequestDto): Promise<SchoolJoinRequest> {
    // Add validation logic here before creating (e.g., check if user/email already requested for this school)
    // Prisma's @@unique constraint will also help here, throwing an error on duplicate
    return this.dbService.schoolJoinRequest.create({
      data: {
        ...data,
        status: 'pending', // Default status
      },
    });
  }

  // READ - Get all requests (with optional filtering)
  async findAll(filters?: GetRequestsFilterDto): Promise<SchoolJoinRequest[]> {
    // Construct the WHERE clause based on filters
    const where: any = {};
    if (filters?.schoolId) {
      where.schoolId = filters.schoolId;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.email) {
      where.email = filters.email;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    // Add logic for case-insensitive email search if needed

    return this.dbService.schoolJoinRequest.findMany({
      where,
      // Optionally add include: { school: true, user: true } to fetch relations
      // Optionally add orderBy, skip, take for pagination
    });
  }

  // READ - Get a single request by ID
  async findOne(id: string): Promise<SchoolJoinRequest> {
    const request = await this.dbService.schoolJoinRequest.findUnique({
      where: { id },
      // Optionally include relations
      // include: { school: true, user: true },
    });

    if (!request) {
      throw new NotFoundException(`SchoolJoinRequest with ID "${id}" not found`);
    }

    return request;
  }

  // READ - Get requests by School ID (Specific filter endpoint)
  async findBySchoolId(schoolId: string): Promise<SchoolJoinRequest[]> {
    return this.dbService.schoolJoinRequest.findMany({
      where: { schoolId },
      // include: { user: true }, // Maybe include user details here
    });
  }

  // READ - Get requests by User ID (Specific filter endpoint)
  async findByUserId(userId: string): Promise<SchoolJoinRequest[]> {
    return this.dbService.schoolJoinRequest.findMany({
      where: { userId },
      // include: { school: true }, // Maybe include school details here
    });
  }

  // READ - Get requests by Email (Specific filter endpoint)
  async findByEmail(email: string): Promise<SchoolJoinRequest[]> {
    return this.dbService.schoolJoinRequest.findMany({
      where: { email }, // Prisma handles null comparison
      include: { school: true, user: true }, // Maybe include details here
    });
  }


  // UPDATE - Update request fields
  async update(id: string, data: UpdateSchoolJoinRequestDto): Promise<SchoolJoinRequest> {
    // Check if request exists first
    await this.findOne(id); // This will throw NotFoundException if not found

    return this.dbService.schoolJoinRequest.update({
      where: { id },
      data,
    });
  }

  // UPDATE - Accept a request (Specific status update)
  async acceptRequest(id: string, user: AuthUserDto) {
    // to check user who accept using token 
    if (!user) {
      throw new BadRequestException("To accept school join request you have to login")
    }
    try {
      // Check if request exists and is pending first?
      const request = await this.findOne(id); // Ensure it exists
      // Optional: Check if status is pending before accepting
      if (request.status !== 'pending') {
        throw new BadRequestException(`Sorry this request in not pending.`);
      }

      // TODO : to check if join school request in not student or teacher

      const createSchoolStaff = await this.dbService.schoolStaff.create({
        data: {
          userId: user.id,
          schoolId: request.schoolId,
          role: request.role,
          email: request.email,
          name: request.name,
          phone: request.phone,
        }
      })

      return this.dbService.schoolJoinRequest.update({
        where: { id },
        data: { status: 'accepted' },
      });
      
    } catch (error) {
      throw new NotFoundException({
        message: 'Something went wrong while accept school request',
        error: error.message,
      });
    }
  }

  // UPDATE - Reject a request (Specific status update)
  async rejectRequest(id: string): Promise<SchoolJoinRequest> {
    // Check if request exists first
    await this.findOne(id); // Ensure it exists

    return this.dbService.schoolJoinRequest.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }


  // DELETE - Remove a request
  async remove(id: string): Promise<SchoolJoinRequest> {
    // Check if request exists first
    await this.findOne(id); // This will throw NotFoundException if not found

    return this.dbService.schoolJoinRequest.delete({
      where: { id },
    });
  }
}