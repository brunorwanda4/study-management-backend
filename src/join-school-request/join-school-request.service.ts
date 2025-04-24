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
import { validSchoolStaffRoles } from 'src/lib/context/school.context';
import { JoinSchoolDto, JoinSchoolSchema } from './dto/join-school-schema';
import { verifyCode } from 'src/common/utils/hash.util';


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

    const request = await this.findOne(id); // Find and Validate BEFORE transaction

    if (request.status !== 'pending') {
      throw new BadRequestException(`Sorry, this request is not pending. Current status: ${request.status}.`);
    }
    // Optional: Authorization Check (Add your logic here - e.g., check if acceptingUser is admin of schoolId)

    try {
      // Use the functional transaction overload
      const results = await this.dbService.$transaction(async (transactionalPrisma) => {
        // Use the 'transactionalPrisma' client for all operations inside this block

        let createdRoleEntry; // Variable to hold the created role object

        // 4. Create the specific user role based on the request role
        if (request.role === 'Teacher') {
          createdRoleEntry = await transactionalPrisma.teacher.create({ // Use transactionalPrisma
            data: {
              userId: acceptingUser.id,
              schoolId: request.schoolId,
              email: request.email,
              name: request.name,
              phone: request.phone,
              image: acceptingUser.image,
            },
          });
        } else if (request.role === 'Student') {
          createdRoleEntry = await transactionalPrisma.student.create({ // Use transactionalPrisma
            data: {
              userId: acceptingUser.id,
              schoolId: request.schoolId, // Assuming schoolId is used even if optional in schema
              email: request.email,
              name: request.name,
              phone: request.phone,
              image: acceptingUser.image,
              // classId: ??? // Handle student class assignment if necessary
            },
          });
        } else if (validSchoolStaffRoles.includes(request.role)) { // Check if the role is in the known staff roles list
          createdRoleEntry = await transactionalPrisma.schoolStaff.create({ // Use transactionalPrisma
            data: {
              userId: acceptingUser.id,
              schoolId: request.schoolId,
              role: request.role, // Store the specific staff role (HeadTeacher, Librarian, etc.)
              email: request.email,
              name: request.name,
              phone: request.phone,
              image: acceptingUser.image,
            },
          });
        }
        else {
          // If the role is not Teacher, Student, or a valid SchoolStaff role
          throw new BadRequestException(`Invalid or unknown role "${request.role}" specified in the join request.`);
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
      const { acceptedRequest } = results;


      // 6. Generate JWT token for the user whose request was accepted
      // This happens AFTER the transaction is successful
      const payload = {
        sub: request.userId, // Subject: the user ID
        schoolId: request.schoolId,
        role: request.role, // The role they just got assigned in this school (Teacher, Student, or specific staff role)
        name: request.name,
        email: request.email,
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
        if (error.code === 'P2002') {
          const target = (error.meta as any)?.target?.join(', ');
          // Be specific in the error message based on which unique constraint failed if possible
          let detail = `User already has a role in this school`;
          if (target) detail += `: constraint on ${target}`;
          throw new BadRequestException(`${detail}`);
        }
        // Handle other Prisma errors if necessary
        throw new BadRequestException(`Database error while accepting request: ${error.message}`);
      } else if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        // Re-throw our specific bad requests or unauthorized errors
        throw error;
      }
      // Throw a generic error or re-throw the original error if debugging
      throw new BadRequestException({
        message: 'Something went wrong while accepting the school request.',
        error: error, // Expose error message for debugging, or mask in production
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
      include: { school: true }, // Maybe include school details here
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

  async joinSchoolByCodeAndUsername(user: AuthUserDto, data: JoinSchoolDto) {
    const validation = JoinSchoolSchema.safeParse(data);
    if (!validation.success) throw new BadRequestException("Validation data for join school");
    const { username, code } = validation.data;

    try {
      const school = await this.dbService.school.findUnique({ where: { username } });
      if (!school) throw new BadRequestException("School not found, check if you write username correctly")
      switch (user.role) {
        case "STUDENT":
          if (!school.studentsCode) throw new BadRequestException(`${school.name} doesn't have join school student code, use other method`)
          const isCodeValid = await verifyCode(code, school.studentsCode);
          if (isCodeValid) {
            if (!school.requiredVerificationToJoinByCode) {
              const student = await this.dbService.student.create({
                data: {
                  schoolId: school.id,
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  userId: user.id,
                  image: user.image,
                }
              })
              const payload = {
                sub: student.id, // Subject: the user ID
                schoolId: student.schoolId,
                name: student.name,
                email: student.email,
                classId: student.classId,
              };

              const token = this.jwtService.sign(payload); 

              return {
                token,
                student,
              };
            }
            const request = await this.dbService.schoolJoinRequest.create({
              data: {
                email: user.email,
                name: user.name,
                phone: user.phone,
                fromUser: true,
                schoolId: school.id,
                userId: user.id,
                role: "STUDENT",
              },
            });
            return { request };
          }
          else {
            throw new BadRequestException("Invalid code, please check if you write it correctly")
          }
        case "TEACHER":
          if (!school.teachersCode) throw new BadRequestException(`${school.name} doesn't have join school teacher code, use other method`)
          const isCodeValidTeacher = await verifyCode(code, school.teachersCode);
          if (isCodeValidTeacher) {
            if (!school.requiredVerificationToJoinByCode) {
              return this.dbService.teacher.create({
                data: {
                  schoolId: school.id,
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  userId: user.id,
                  image: user.image,
                }
              })
            }
            const request = await this.dbService.schoolJoinRequest.create({
              data: {
                email: user.email,
                name: user.name,
                phone: user.phone,
                fromUser: true,
                schoolId: school.id,
                userId: user.id,
                role: "TEACHER",
              },
            });
            return request;
          } else {
            throw new BadRequestException("Invalid code, please check if you write it correctly")
          }
        case "SCHOOLSTAFF":
          if (!school.schoolStaffsCode) throw new BadRequestException(`${school.name} doesn't have join school staff code, use other method`)
          const isCodeValidStaff = await verifyCode(code, school.schoolStaffsCode);
          if (isCodeValidStaff) {
            const request = await this.dbService.schoolJoinRequest.create({
              data: {
                email: user.email,
                name: user.name,
                phone: user.phone,
                schoolId: school.id,
                fromUser: true,
                userId: user.id,
                role: "SCHOOLSTAFF",
              },
            });
            return request;
          } else {
            throw new BadRequestException("Invalid code, please check if you write it correctly")
          }
        default:
          throw new BadRequestException("Invalid role, please check if you write it correctly")
      }
    } catch (error) {
      throw new NotFoundException({
        message: 'Something went wrong while retrieving schools',
        error: error.message, // Provide error message in response
      });
    }
  }
}