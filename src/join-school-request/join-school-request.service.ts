import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
// Import the types from Prisma Client
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { SchoolJoinRequest } from 'generated/prisma';
import { AuthUserDto } from 'src/user/dto/user.dto';
import { UpdateSchoolJoinRequestDto } from './dto/update-school-join-request.dto';
import { GetRequestsFilterDto } from './dto/filter-school-join-request.dto';
import { CreateJoinSchoolRequestDto } from './dto/join-school-request.dto';

// Assuming AuthUserDto is defined somewhere
// import { AuthUserDto } from '../auth/dto/auth-user.dto';


@Injectable()
export class SchoolJoinRequestService {
  constructor(
    private readonly dbService: DbService,
    private jwtService: JwtService,
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
  // findOne helper (keep this separate)
  async findOne(id: string): Promise<SchoolJoinRequest> {
    const request = await this.dbService.schoolJoinRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`SchoolJoinRequest with ID "${id}" not found`);
    }

    return request;
  }


  // UPDATE - Accept a request (Specific status update + user role creation)
  async acceptRequest(id: string, acceptingUser: AuthUserDto): Promise<{ token: string, acceptedRequest: SchoolJoinRequest }> {
    if (!acceptingUser || !acceptingUser.id) {
      throw new UnauthorizedException("You must be logged in to accept school join requests.");
    }

    // Find and Validate the Request BEFORE the transaction
    const request = await this.findOne(id);

    if (request.status !== 'pending') {
      throw new BadRequestException(`Sorry, this request is not pending. Current status: ${request.status}.`);
    }

    // if (!request.userId) {
    //   throw new BadRequestException("Cannot accept this request: it is not linked to a user.");
    // }

    // Optional: Authorization Check (Add your logic here)
    // await this.checkAcceptingUserAuthorization(acceptingUser.id, request.schoolId);


    try {
      // Use the functional transaction overload
      // The function passed here receives a transactional client instance ('transactionalPrisma')
      const results = await this.dbService.$transaction(async (transactionalPrisma) => {
        // Perform all database operations using 'transactionalPrisma' inside this block

        let createdRoleEntry; // Variable to hold the created role object

        // 4. Create the specific user role based on the request role
        switch (request.role) {
          case 'SchoolStaff':
            createdRoleEntry = await transactionalPrisma.schoolStaff.create({ // Use transactionalPrisma
              data: {
                userId: acceptingUser.id, // Use the userId from the request!
                schoolId: request.schoolId,
                role: request.role,
                email: request.email,
                name: request.name,
                phone: request.phone,
              },
            });
            break; // Use break to exit the switch

          case 'Teacher':
            createdRoleEntry = await transactionalPrisma.teacher.create({ // Use transactionalPrisma
              data: {
                userId: acceptingUser.id, // Use the userId from the request!
                schoolId: request.schoolId, // Note: Teacher schoolId is optional, but schema uses it
                email: request.email,
                name: request.name,
                phone: request.phone,
                // image: request.image, // Assuming image is not on join request
              },
            });
            break;

          case 'Student':
            // NOTE: Still need to handle classId assignment for students
            createdRoleEntry = await transactionalPrisma.student.create({ // Use transactionalPrisma
              data: {
                userId: acceptingUser.id, // Use the userId from the request!
                schoolId: request.schoolId, // Assuming schoolId is used even if optional in schema
                email: request.email,
                name: request.name,
                phone: request.phone,
                // image: request.image, // Assuming image is not on join request
                // classId: ???
              },
            });
            break;

          default:
            // Throw *inside* the transaction function to cause rollback
            throw new BadRequestException(`Unknown role "${request.role}" specified in the join request.`);
        }

        // 5. Update the join request status to 'accepted'
        const acceptedRequest = await transactionalPrisma.schoolJoinRequest.update({ // Use transactionalPrisma
          where: { id: request.id },
          data: { status: 'accepted' },
        });

        // Return the results you need from the transaction
        return { createdRoleEntry, acceptedRequest };
      });

      // Destructure the results returned from the transaction function
      const { createdRoleEntry, acceptedRequest } = results;


      // 6. Generate JWT token for the user whose request was accepted
      // This happens AFTER the transaction is successful
      const payload = {
        sub: request.userId, // Subject: the user ID
        schoolId: request.schoolId,
        role: request.role, // The role they just got assigned in this school
        // Add other claims as needed (e.g., permissions)
      };

      const token = this.jwtService.sign(payload); // Sign the payload to create the token

      // 7. Return the token and perhaps the accepted request details
      return {
        token,
        acceptedRequest, // You might want to return the updated request object
      };

    } catch (error) {
      // Handle specific Prisma errors, e.g., unique constraint violation
      if (error instanceof PrismaClientKnownRequestError) {
        // P2002 is the error code for unique constraint violation
        if (error.code === 'P2002') {
          // Check which constraint failed
          const target = (error.meta as any)?.target?.join(', ');
          throw new BadRequestException(`User already has a role (${request.role}) in this school. Unique constraint failed on: ${target}`);
        }
        // Handle other Prisma errors if necessary
        throw new BadRequestException(`Database error while accepting request: ${error.message}`);
      } else if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        // Re-throw our specific bad requests or unauthorized errors
        throw error;
      }
      // Catch any other unexpected errors
      console.error('Error accepting school join request:', error); // Log the unexpected error
      // Throw a generic error or re-throw the original error if debugging
      throw new BadRequestException({ // Use BadRequestException or InternalServerErrorException
        message: 'Something went wrong while accepting the school request.',
        error: error.message, // Expose error message for debugging, or mask in production
      });
    }
  }

  // rejectRequest remains the same as it's a single operation
  async rejectRequest(id: string): Promise<SchoolJoinRequest> {
    const request = await this.findOne(id);

    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot reject request with status "${request.status}". Only pending requests can be rejected.`);
    }

    return this.dbService.schoolJoinRequest.update({ // Use dbService
      where: { id: request.id },
      data: { status: 'rejected' },
    });
  }


  // ... (remove method remains the same) ...
  async remove(id: string): Promise<SchoolJoinRequest> {
    await this.findOne(id);

    return this.dbService.schoolJoinRequest.delete({ // Use dbService
      where: { id },
    });
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
}



