import { SchoolService } from './../school/school.service';
import { FindByUserIdAndSchoolIdQuery } from './../school-staff/dto/find-school-staff-by-userId-schoolId';
import { SchoolAuthPayloadDto, SchoolAuthPayloadSchema } from './dto/auth-payloads';
import { Injectable, UnauthorizedException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { AuthUserDto, LoginUserDto, LoginUserSchema, RegisterUserDto, CreateUserSchema, CreateUserDto } from 'src/user/dto/user.dto';
import { verifyPassword } from 'src/common/utils/hash.util';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './../user/user.service';
import { User } from 'generated/prisma';
import { SchoolStaffService } from 'src/school-staff/school-staff.service';
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly schoolStaffService: SchoolStaffService,
    private readonly schoolService: SchoolService
  ) { }

  async authenticate(input: LoginUserDto): Promise<AuthUserDto> {
    const user = await this.validateUser(input);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.signIn(user);
  }

  async validateUser(input: LoginUserDto): Promise<User | null> {
    const validation = LoginUserSchema.safeParse(input);
    if (!validation.success) {
      return null
    };

    const { email, password } = validation.data;
    const user = await this.userService.findOne(undefined, email);
    if (!user?.password) return null;

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) return null;

    return user;
  }

  async signIn(user: User): Promise<AuthUserDto> {
    const payload: AuthUserDto = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone ?? undefined,
      image: user?.image ?? undefined,
      role: user.role ?? undefined,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const token = {
      ...payload,
      accessToken,
    };
    if (user.currentSchoolId) {
      switch (user.role) {
        case "SCHOOLSTAFF":
          const schoolStaff = await this.schoolStaffService.findByUserIdAndSchoolId(user.id, user.currentSchoolId);
          if (!schoolStaff) { return token }
          const school = await this.schoolService.findOne(schoolStaff.schoolId);
          if (!school) { return token }

          const SchoolPayload: SchoolAuthPayloadDto = {
            sub: schoolStaff.id, // Subject: the user ID
            schoolId: schoolStaff.schoolId,
            name: user.name,
            email: user.email,
            role: schoolStaff.role,
            schoolDescription: school.description ?? undefined,
            schoolEmail: school.contact?.email,
            schoolName: school.name,
            schoolUsername: school.username,
            schoolLogo: school.logo,
          };

          const schoolAccessToken = this.jwtService.sign(SchoolPayload);
          return {
            ...payload,
            accessToken,
            schoolAccessToken
          }
        // TODO to add other user school token
        default: { return token }
      }
    }
    return token;
  }

  async register(input: RegisterUserDto) {
    const newUser: CreateUserDto = {
      email: input.email, name: input.name, password: input.password
    };
    const user = await this.userService.create(newUser);
    return this.signIn(user);
  }
}
