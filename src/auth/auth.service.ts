import { SchoolService } from './../school/school.service';
// Assuming FindByUserIdAndSchoolIdQuery is defined elsewhere if needed,
// but the service method likely just needs IDs.
// import { FindByUserIdAndSchoolIdQuery } from './../school-staff/dto/find-school-staff-by-userId-schoolId';
import { SchoolAuthPayloadDto } from './dto/auth-payloads'; // Assuming schema validation is handled by pipes
import {
    Injectable,
    UnauthorizedException,
    Inject,
    forwardRef,
    InternalServerErrorException, // Added for better error handling
    Logger,
    BadRequestException, // Added for logging issues
} from '@nestjs/common';
import { AuthUserDto, LoginUserDto, RegisterUserDto, CreateUserDto } from 'src/user/dto/user.dto';
import { verifyPassword } from 'src/common/utils/hash.util';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './../user/user.service';
import { User } from 'generated/prisma'; // Assuming this import is correct
import { SchoolStaffService } from 'src/school-staff/school-staff.service';
import { SchoolStaff, School } from 'generated/prisma'; // Assuming these types exist

@Injectable()
export class AuthService {
    // Add a logger for better debugging and monitoring
    private readonly logger = new Logger(AuthService.name);

    constructor(
        // Consider resolving the circular dependency if possible by restructuring modules
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly schoolStaffService: SchoolStaffService,
        private readonly schoolService: SchoolService,
    ) { }

    /**
     * Authenticates a user based on login credentials.
     * Input validation should be handled by ValidationPipe at the controller level.
     */
    async authenticate(input: LoginUserDto): Promise<AuthUserDto> {
        // Validation using Zod schema is removed, assuming ValidationPipe is used in the controller
        // e.g., @Post('login') login(@Body(new ValidationPipe()) loginUserDto: LoginUserDto) { ... }
        const user = await this.validateUserCredentials(input.email, input.password);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }
        return this.signIn(user);
    }

    /**
     * Validates user credentials against the database.
     * Separated credential validation from input format validation.
     */
    async validateUserCredentials(email: string, passwordInput: string): Promise<User | null> {
        // Fetch only necessary fields for validation and token generation if possible
        // Alternative if findOneByEmailWithSelect doesn't exist:
        const user = await this.userService.findOne(undefined, email);


        if (!user?.password) {
            // User not found or has no password set
            return null;
        }

        const isPasswordValid = await verifyPassword(passwordInput, user.password);
        if (!isPasswordValid) {
            return null;
        }

        return user; // Explicitly cast to the new type
    }

    /**
     * Creates the JWT payload and generates access tokens.
     */
    async signIn(user: User): Promise<AuthUserDto> {
        const basePayload: Omit<AuthUserDto, 'accessToken' | 'schoolAccessToken'> = {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            phone: user.phone ?? undefined,
            image: user.image ?? undefined,
            role: user.role ?? undefined,
        };

        const accessToken = await this.jwtService.signAsync(basePayload);

        const tokenResponse: AuthUserDto = {
            ...basePayload,
            accessToken,
        };

        // Check if school-specific token is needed
        if (user.currentSchoolId && (user.role === 'SCHOOLSTAFF' || user.role === 'TEACHER')) {
            try {
                const schoolAccessToken = await this.generateSchoolToken(user.id, user.currentSchoolId, user);
                if (schoolAccessToken) {
                    tokenResponse.schoolAccessToken = schoolAccessToken;
                } else {
                    // Log that expected school data was missing but proceed with base token
                    this.logger.warn(`Could not generate school token for user ${user.id} and school ${user.currentSchoolId}. School or Staff data missing.`);
                }
            } catch (error) {
                this.logger.error(`Failed to generate school token for user ${user.id}: ${error.message}`, error.stack);
                // Decide if you want to throw an error or just return the base token
                // throw new InternalServerErrorException('Failed to generate school-specific token');
            }
        }

        return tokenResponse;
    }

    /**
     * Helper method to generate the school-specific access token.
     * Optimization: Fetch SchoolStaff and related School in one go if possible.
     */
    private async generateSchoolToken(userId: string, schoolId: string, user: User): Promise<string | null> {
        // --- Optimization Point ---
        // Modify findByUserIdAndSchoolId to potentially include school data directly
        // using Prisma's `include` to reduce DB calls from 2 to 1.
        // Example assuming SchoolStaffService method is updated:
        /*
        const schoolStaffWithSchool = await this.schoolStaffService.findStaffAndSchool(userId, schoolId);
        if (!schoolStaffWithSchool || !schoolStaffWithSchool.school) {
             return null; // Or throw an error if this data is critical
        }
        const schoolStaff = schoolStaffWithSchool;
        const school = schoolStaffWithSchool.school;
        */

        // Original approach (2 DB calls):
        const schoolStaff = await this.schoolStaffService.findByUserIdAndSchoolId(userId, schoolId);
        if (!schoolStaff) {
            this.logger.debug(`SchoolStaff not found for userId: ${userId}, schoolId: ${schoolId}`);
            return null; // Or throw?
        }

        const school = await this.schoolService.findOne(schoolStaff.schoolId);
        if (!school) {
            this.logger.debug(`School not found for schoolId: ${schoolStaff.schoolId}`);
            return null; // Or throw?
        }
        // --- End of DB Calls ---


        const schoolPayload: SchoolAuthPayloadDto = {
            sub: schoolStaff.id, // Use staff ID as subject for school context
            schoolId: schoolStaff.schoolId,
            name: user.name, // User's name
            email: user.email, // User's email
            role: schoolStaff.role, // Role within the school
            schoolDescription: school.description ?? undefined,
            schoolEmail: school.contact?.email,
            schoolName: school.name,
            schoolUsername: school.username,
            schoolLogo: school.logo,
        };

        // Use async version for consistency, though signing is often fast
        return this.jwtService.signAsync(schoolPayload);
    }

    /**
     * Registers a new user.
     * Input validation should be handled by ValidationPipe at the controller level.
     */
    async register(input: RegisterUserDto): Promise<AuthUserDto> {
        // Again, assume ValidationPipe handles input validation (like password complexity, email format)
        const newUserInput: CreateUserDto = {
            email: input.email,
            name: input.name,
            password: input.password, // Password hashing should happen inside userService.create
            // Add other default fields if necessary for CreateUserDto
        };

        try {
            const newUser = await this.userService.create(newUserInput);
            // Sign in the newly created user
            return this.signIn(newUser);
        } catch (error) {
            // Handle potential errors during user creation (e.g., unique constraint violation)
            this.logger.error(`User registration failed for email ${input.email}: ${error.message}`, error.stack);
            // Re-throw or handle specific errors (like Prisma unique constraint)
            // Example: Check for Prisma error codes (e.g., P2002 for unique constraint)
            if (error.code === 'P2002') { // Adjust based on actual Prisma error codes
                throw new BadRequestException('Email already exists.');
            }
            throw new InternalServerErrorException('Could not register user.');
        }
    }

    
}