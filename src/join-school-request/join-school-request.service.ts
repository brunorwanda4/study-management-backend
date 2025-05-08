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
import { SchoolJoinRequest, SchoolStaff, Student, Teacher } from 'generated/prisma';
import { AuthUserDto } from 'src/user/dto/user.dto';
import { UpdateSchoolJoinRequestDto } from './dto/update-school-join-request.dto';
import { GetRequestsFilterDto } from './dto/filter-school-join-request.dto';
import { CreateJoinSchoolRequest, CreateJoinSchoolRequestDto } from './dto/join-school-request.dto';
import { validSchoolStaffRoles } from 'src/lib/context/school.context';
import { JoinSchoolDto, JoinSchoolSchema } from '../school/dto/join-school-schema';
import { verifyCode } from 'src/common/utils/hash.util';


@Injectable()
export class SchoolJoinRequestService {
  constructor(
    private readonly dbService: DbService,
    private jwtService: JwtService,
  ) { }

  // CREATE (assuming you have this)
  async create(data: CreateJoinSchoolRequestDto): Promise<SchoolJoinRequest> {
    // Validate the data here if needed
    const validation = CreateJoinSchoolRequest.safeParse(data);
    if (!validation.success) {
      throw new BadRequestException("Validation data for create school join request");
    }
    // Check if the user already has a request for this school
    const [existingRequest, exitUser] = await Promise.all([
      this.dbService.schoolJoinRequest.findFirst({
        where: {
          email: data.email,
          schoolId: data.schoolId,
          status: 'pending',
          fromUser: false,
        },
      }),
      this.dbService.user.findUnique({
        where: {
          email: data.email,
        },
      }),
    ])

    if (existingRequest) {
      const remove = await this.remove(existingRequest.id);
      if (remove) {
        return this.dbService.schoolJoinRequest.create({
          data: {
            userId: exitUser?.id,
            name: exitUser?.name,
            status: 'pending',
            ...data,
          },
        });
      }
    }
    return this.dbService.schoolJoinRequest.create({
      data: {
        userId: exitUser?.id,
        name: exitUser?.name,
        status: 'pending',
        ...data,
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
      orderBy: { createAt: "desc" },
      include: {
        school: {
          select: {
            name: true, logo: true, id: true, username: true, website: true
          }
        },
        user: {
          select: {
            name: true, image: true, id: true, gender: true, age: true, email: true
          }
        },
        class: {
          select: {
            id: true, name: true, image: true, teacher: true, username: true
          }
        }
      }
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
  async acceptRequest(id: string, user: AuthUserDto): Promise<{ token: string; acceptedRequest: SchoolJoinRequest }> {
    if (!user?.id) {
      throw new UnauthorizedException("You must be logged in to accept school join requests.");
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid Request ID format.');
    }

    try {
      const [request, acceptingUser] = await Promise.all([
        this.findOne(id),
        this.dbService.user.findUnique({ where: { id: user.id } }),
      ]);

      if (!/^[0-9a-fA-F]{24}$/.test(request.schoolId)) {
        throw new BadRequestException('Invalid School ID format.');
      }

      if (!acceptingUser) {
        throw new BadRequestException("Sorry, your user ID doesn't exist. Please make sure you have an account.");
      }

      if (request.status !== 'pending') {
        throw new BadRequestException(`This request is not pending. Current status: ${request.status}.`);
      }

      if (acceptingUser.email !== request.email) {
        throw new BadRequestException("This request does not belong to you.");
      }

      return await this.dbService.$transaction(async (tx) => {
        const commonData = {
          schoolId: request.schoolId,
          userId: acceptingUser.id,
          email: acceptingUser.email,
          name: acceptingUser.name,
          phone: acceptingUser.phone,
          image: acceptingUser.image,
          age: acceptingUser.age,
          gender: acceptingUser.gender,
          classId: request.role !== 'STUDENT' ? undefined : request.classId,
        };

        let roleEntity;
        let payload: any;

        if (request.role === 'TEACHER') {
          roleEntity = await tx.teacher.create({ data: commonData });
          payload = {
            sub: roleEntity.id,
            schoolId: request.schoolId,
            name: acceptingUser.name,
            email: acceptingUser.email,
            image: acceptingUser.image,
            age: acceptingUser.age,
            phone: acceptingUser.phone,
            gender: acceptingUser.gender,
          };
        } else if (request.role === 'STUDENT') {
          roleEntity = await tx.student.create({ data: commonData });
          payload = {
            sub: roleEntity.id,
            schoolId: request.schoolId,
            name: acceptingUser.name,
            email: acceptingUser.email,
            classId: request.classId,
            age: acceptingUser.age,
            gender: acceptingUser.gender,
            image: acceptingUser.image,

          };
        } else if (validSchoolStaffRoles.includes(request.role)) {
          roleEntity = await tx.schoolStaff.create({ data: { ...commonData, role: request.role } });
          payload = {
            sub: roleEntity.id,
            schoolId: request.schoolId,
            name: acceptingUser.name,
            email: acceptingUser.email,
            image: acceptingUser.image,
            age: acceptingUser.age,
            phone: acceptingUser.phone,
            gender: acceptingUser.gender,
          };
        } else {
          throw new BadRequestException(`Invalid or unknown role "${request.role}" specified.`);
        }

        const acceptedRequest = await tx.schoolJoinRequest.update({
          where: { id: request.id },
          data: { status: 'accepted' },
        });

        await tx.user.update({
          where: { id: acceptingUser.id },
          data: { currentSchoolId: request.schoolId },
        });

        const token = this.jwtService.sign(payload);

        return { token, acceptedRequest };
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta as any)?.target?.join(', ');
          let detail = `User already has a role in this school`;
          if (target) detail += `: constraint on ${target}`;
          throw new BadRequestException(detail);
        }
        throw new BadRequestException(`Database error: ${error.message}`);
      } else if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'An unexpected error occurred while accepting the school request.',
        error,
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
      orderBy: { updatedAt: 'desc' }
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
      const [school, requestUser] = await Promise.all([
        this.dbService.school.findUnique({ where: { username } }),
        this.dbService.user.findUnique({ where: { id: user.id } })
      ]);
      if (!school) throw new BadRequestException("School not found, check if you write username correctly");
      if (!requestUser) throw new BadRequestException("Sorry, Your account doesn't exit, create new ones");
      switch (user.role) {
        case "STUDENT":
          if (!school.studentsCode) throw new BadRequestException(`${school.name} doesn't have join school student code, use other method`)
          const isCodeValid = await verifyCode(code, school.studentsCode);
          if (isCodeValid) {
            if (!school.requiredVerificationToJoinByCode) {
              const student = await this.dbService.student.create({
                data: {
                  schoolId: school.id,
                  name: requestUser.name,
                  email: requestUser.email,
                  phone: requestUser.phone,
                  userId: requestUser.id,
                  image: requestUser.image,
                  age: requestUser.age,
                  gender: requestUser.gender,
                }
              })
              const payload = {
                sub: student.id,
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
              const teacher = await this.dbService.teacher.create({
                data: {
                  schoolId: school.id,
                  name: requestUser.name,
                  email: requestUser.email,
                  phone: requestUser.phone,
                  userId: requestUser.id,
                  image: requestUser.image,
                  gender: requestUser.gender,
                  age: requestUser.age,
                }
              })
              const payload = {
                sub: teacher.id,
                schoolId: teacher.schoolId,
                name: teacher.name,
                email: teacher.email,
              };

              const token = this.jwtService.sign(payload);

              return {
                token,
                teacher,
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
                email: requestUser.email,
                name: requestUser.name,
                phone: requestUser.phone,
                schoolId: school.id,
                fromUser: true,
                userId: requestUser.id,
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