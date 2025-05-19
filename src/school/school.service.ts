import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CreateSchoolDto, CreateSchoolSchema, schoolTypeDto, SchoolMembersDto, curriculumEnumDto } from './dto/school.dto';
import { SchoolAcademicCreationDto, SchoolAcademicDto, SchoolAcademicSchema } from './dto/school-academic.dto';
import { DbService } from 'src/db/db.service';
import { generateCode, generateUsername } from 'src/common/utils/characters.util';
import { UploadService } from 'src/upload/upload.service';
import { ModuleType, Prisma } from 'generated/prisma';
import { SchoolAdministrationDto, SchoolAdministrationSchema } from './dto/school-administration.dto';
import { sendAdministrationJoinRequestsDto } from 'src/join-school-request/dto/join-school-request.dto';
import { hashCode } from 'src/common/utils/hash.util';
import { UpdateSchoolDto, UpdateSchoolSchema } from './dto/update.dto';

@Injectable()
export class SchoolService {
    constructor(
        private readonly dbService: DbService,
        private readonly uploadService: UploadService,
    ) { }

    async create(createSchoolDto: CreateSchoolDto,) {
        const validation = CreateSchoolSchema.safeParse(createSchoolDto);
        if (!validation.success) {
            throw new BadRequestException('Invalid school data provided');
        }
        const { name, creatorId, logo, username: initialUsername, ...rest } = validation.data;
        let username = initialUsername;
        try {
            const [creator, getSchoolByUsername] = await Promise.all([
                this.dbService.user.findUnique({ where: { id: creatorId } }),
                this.dbService.school.findUnique({ where: { username } })
            ]);

            if (!creator || (creator.role !== "SCHOOLSTAFF" && creator.role !== "ADMIN")) {
                throw new BadRequestException('you can not create school')
            }

            if (getSchoolByUsername) {
                username = generateUsername(name)
            }
            let imageUrl = logo;
            if (logo && typeof logo === 'string' && logo.startsWith('data:image')) {
                const uploaded = await this.uploadService.uploadBase64Image(logo, 'logos');
                imageUrl = uploaded.secure_url;
            }
            const studentsCode = await hashCode(generateCode());
            const teachersCode = await hashCode(generateCode());
            const schoolStaffsCode = await hashCode(generateCode());
            return await this.dbService.school.create({
                data: {
                    name,
                    creatorId,
                    logo: imageUrl,
                    username,
                    studentsCode,
                    teachersCode,
                    schoolStaffsCode,
                    ...rest,
                }
            })
        } catch (error) {
            if (error.code === 'P2002') {
                if (error.meta?.target?.includes('username')) {
                    throw new BadRequestException('School with this username already exists.');
                }
                if (error.meta?.target?.includes('code')) {
                    throw new BadRequestException('Generated school code is not unique, please try again.');
                }
            }
            throw new BadRequestException({
                message: 'Something went wrong while creating the school',
                error: error.message, // Provide error message in response
            });
        }
    }

    async findAll(schoolType?: schoolTypeDto, schoolMembers?: SchoolMembersDto, creatorId?: string) {
        try {
            const where: any = {};

            if (schoolType) {
                where.schoolType = schoolType;
            }

            if (schoolMembers) {
                where.schoolMembers = schoolMembers;
            }

            if (creatorId) {
                where.creatorId = creatorId;
            }

            const schools = await this.dbService.school.findMany({ where, orderBy: { createAt: 'desc' } });

            // Omit the code from the returned objects if it should be private
            const safeSchool = schools.map(({ studentsCode, teachersCode, schoolStaffsCode, ...rest }) => rest);
            return safeSchool;
        } catch (error) {
            throw new NotFoundException({
                message: 'Something went wrong while retrieving schools',
                error: error.message, // Provide error message in response
            });
        }
    }


    async findOne(id?: string, username?: string,) {
        if (!id && !username) {
            throw new BadRequestException('You must provide id or username to find a school');
        }
        // Use findFirst or findUnique based on which fields are truly unique in your schema
        // Assuming id, username, and code are unique based on your create logic
        const where = id ? { id } : { username };

        try {
            const school = await this.dbService.school.findUnique({
                where,
                include: {
                    SchoolStaff: true,
                    Teacher: true,
                    Student: true,
                    SchoolJoinRequest: true
                }
            });

            if (!school) {
                const identifier = id || username;
                throw new NotFoundException(`School not found with identifier: ${identifier}`);
            }
            return school; // Return the safe school object
        } catch (error) {
            console.error('Error retrieving school:', error);
            // Re-throw NotFoundException if it originated from the "school not found" check
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new NotFoundException({
                message: 'Something went wrong while retrieving school',
                error: error.message, // Provide error message in response
            });
        }
    }

    async update(schoolId: string, updateSchoolDto: UpdateSchoolDto,) {
        const validation = UpdateSchoolSchema.safeParse(updateSchoolDto);
        if (!validation.success) {
            console.error("Validation Errors:", validation.error.flatten().fieldErrors);
            throw new BadRequestException({ message: 'Invalid school data provided for update', errors: validation.error.flatten().fieldErrors });
        }

        const { logo, username: newUsername, name, ...rest } = validation.data;

        try {
            // 1. Fetch the existing school
            const existingSchool = await this.dbService.school.findUnique({ where: { id: schoolId } });
            if (!existingSchool) {
                throw new BadRequestException('School not found.');
            }

            // 2. Check permissions (e.g., only creator or admin can update)
            // const updater = await this.dbService.user.findUnique({ where: { id: callingUserId } });
            // if (!updater) {
            //     throw new BadRequestException('Updater user not found.');
            // }
            // if (existingSchool.creatorId !== callingUserId && updater.role !== "ADMIN") {
            //     throw new BadRequestException('You do not have permission to update this school.');
            // }

            let finalUsername = existingSchool.username;
            // 3. Handle username update and potential conflicts
            if (newUsername && newUsername !== existingSchool.username) {
                const schoolWithNewUsername = await this.dbService.school.findUnique({ where: { username: newUsername } });
                if (schoolWithNewUsername && schoolWithNewUsername.id !== schoolId) {
                    // If the new username is taken by *another* school, generate a new one or throw error
                    // For this example, let's throw an error. You could also generate one like in create.
                    throw new BadRequestException(`Username '${newUsername}' is already taken.`);
                }
                finalUsername = newUsername;
            } else if (name && !newUsername && name !== existingSchool.name) {
                // Optional: If name changes and username is not explicitly set for update,
                // you might want to suggest or auto-update the username similarly to create.
                // For simplicity, we are not doing that here unless `newUsername` is provided.
            }


            // 4. Handle logo update
            let imageUrl = existingSchool.logo; // Keep existing logo by default
            if (logo && typeof logo === 'string') {
                if (logo.startsWith('data:image')) {
                    const uploaded = await this.uploadService.uploadBase64Image(logo, 'logos');
                    imageUrl = uploaded.secure_url;
                } else if (logo.startsWith('http://') || logo.startsWith('https://')) {
                    // If a new URL is provided directly
                    imageUrl = logo;
                } else if (logo === "") { // Allow explicitly clearing the logo
                    imageUrl = null; // Or null, depending on your DB schema
                }
            }


            // 5. Prepare data for update
            const dataToUpdate: any = {
                ...rest,
                username: finalUsername,
                logo: imageUrl,
            };

            // If name is part of the DTO, include it
            if (name !== undefined) {
                dataToUpdate.name = name;
            }

            // Remove undefined fields from dataToUpdate to prevent overwriting existing values with undefined
            for (const key in dataToUpdate) {
                if (dataToUpdate[key] === undefined) {
                    delete dataToUpdate[key];
                }
            }

            // If no actual data would be changed (e.g. DTO was empty or contained only existing values)
            // you might choose to return early, though Prisma handles this gracefully.
            if (Object.keys(dataToUpdate).length === 0) {
                console.log("No changes to apply for school:", schoolId);
                return existingSchool; // Or throw a message indicating no changes
            }


            // 6. Perform the update
            return await this.dbService.school.update({
                where: { id: schoolId },
                data: {
                    ...dataToUpdate,
                    updatedAt: new Date(), // Explicitly set updatedAt if your ORM doesn't do it automatically
                },
            });

        } catch (error: any) {
            if (error.code === 'P2002') { // Prisma unique constraint error
                const target = (error as any).meta?.target;
                if (target?.includes('username')) {
                    throw new BadRequestException('School with this username already exists.');
                }
                if (target?.includes('code') && validation.data.code) { // If code was part of the update and caused error
                    throw new BadRequestException('School with this code already exists.');
                }
            }
            console.error("Update School Error:", error);
            throw new BadRequestException({
                message: error.message || 'Something went wrong while updating the school',
                error: error.message,
            });
        }
    }

    remove(id: string) {
        return `This action removes a #${id} school`;
    }

    /**
     * Sets up the academic structure (classes and modules) for a school based on the provided configuration.
     * @param schoolAcademicDto The academic configuration for the school.
     * @returns An object containing the created classes and modules.
     */
    async setupAcademicStructure(
        schoolAcademicDto: SchoolAcademicDto,
    ): Promise<SchoolAcademicCreationDto> {
        const validation = SchoolAcademicSchema.safeParse(schoolAcademicDto);
        if (!validation.success) {
            console.error("Zod validation failed:", validation.error.format());
            throw new BadRequestException('Invalid school academic data provided');
        }

        const {
            schoolId,
            primarySubjectsOffered,
            oLevelCoreSubjects,
            aLevelSubjectCombination,
            tvetSpecialization,
        } = validation.data;

        try {
            const school = await this.dbService.school.findUnique({
                where: { id: schoolId },
                select: { id: true, name: true },
            });

            if (!school) {
                throw new NotFoundException(`School with ID "${schoolId}" not found`);
            }

            const currentYear = new Date().getFullYear();
            const academicYear = `${currentYear}-${currentYear + 1}`;

            const classesToCreate: Prisma.ClassCreateManyInput[] = [];
            // We'll now store modules with their intended class level/type
            const modulesByClass: { className: string; modules: Prisma.ModuleCreateManyInput[] }[] = [];

            // --- Prepare Classes and Module Instances based on Education Level ---

            // Primary Education (6 classes: P1 to P6)
            if (primarySubjectsOffered && primarySubjectsOffered.length > 0) {
                for (let i = 1; i <= 6; i++) {
                    const level = `P${i}`;
                    const className = `${level} ${school.name.replace(/\s+/g, '')} ${academicYear}`;
                    const classUsername = generateUsername(className);

                    classesToCreate.push({
                        name: className,
                        username: classUsername,
                        schoolId: school.id,
                        code: generateCode(),
                        classType: 'SchoolClass',
                        educationLever: 'Primary',
                        curriculum: 'REB',
                    });

                    // Create modules specific to this class
                    const classModules = primarySubjectsOffered.map(subjectName => ({
                        name: subjectName,
                        code: generateCode(),
                        subjectType: ModuleType.General,
                        curriculum: 'REB',
                    }));

                    modulesByClass.push({
                        className,
                        modules: classModules
                    });
                }
            }

            // Ordinary Level (3 classes: S1 to S3)
            if (oLevelCoreSubjects && oLevelCoreSubjects.length > 0) {
                for (let i = 1; i <= 3; i++) {
                    const level = `S${i}`;
                    const className = `${level} ${school.name.replace(/\s+/g, '')} ${academicYear}`;
                    const classUsername = generateUsername(className);

                    classesToCreate.push({
                        name: className,
                        username: classUsername,
                        schoolId: school.id,
                        code: generateCode(),
                        classType: 'SchoolClass',
                        educationLever: 'OLevel',
                        curriculum: 'REB',
                    });

                    // Create modules specific to this class
                    const classModules = oLevelCoreSubjects.map(subjectName => ({
                        name: subjectName,
                        code: generateCode(),
                        subjectType: ModuleType.General,
                        curriculum: 'REB',
                    }));

                    // Add optional subjects if they exist
                    if (validation.data.oLevelOptionSubjects && validation.data.oLevelOptionSubjects.length > 0) {
                        validation.data.oLevelOptionSubjects.forEach(subjectName => {
                            classModules.push({
                                name: subjectName,
                                code: generateCode(),
                                subjectType: ModuleType.General,
                                curriculum: 'REB',
                            });
                        });
                    }

                    modulesByClass.push({
                        className,
                        modules: classModules
                    });
                }
            }

            // Advanced Level (S4, S5, S6 for each combination)
            if (aLevelSubjectCombination && aLevelSubjectCombination.length > 0) {
                const aLevelLevels = [4, 5, 6]; // Representing S4, S5, S6

                aLevelSubjectCombination.forEach(combination => {
                    aLevelLevels.forEach(levelNumber => {
                        const level = `S${levelNumber}`;
                        const className = `${level} ${combination} ${school.name.replace(/\s+/g, '')} ${academicYear}`;
                        const classUsername = generateUsername(className);

                        classesToCreate.push({
                            name: className,
                            username: classUsername,
                            schoolId: school.id,
                            code: generateCode(),
                            classType: 'SchoolClass',
                            educationLever: 'ALevel',
                            curriculum: 'REB',
                        });

                        // Create modules specific to this class
                        const classModules = [{
                            name: combination,
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'REB',
                        }];

                        // Add optional subjects if they exist
                        if (validation.data.aLevelOptionSubjects && validation.data.aLevelOptionSubjects.length > 0) {
                            validation.data.aLevelOptionSubjects.forEach(subjectName => {
                                classModules.push({
                                    name: subjectName,
                                    code: generateCode(),
                                    subjectType: ModuleType.General,
                                    curriculum: 'REB',
                                });
                            });
                        }

                        modulesByClass.push({
                            className,
                            modules: classModules
                        });
                    });
                });
            }

            // TVET (L3, L4, L5 for each specialization)
            if (tvetSpecialization && tvetSpecialization.length > 0) {
                const tvetLevels = ['L3', 'L4', 'L5'];
                tvetLevels.forEach(level => {
                    tvetSpecialization.forEach(specializationName => {
                        const className = `${level} ${specializationName.replace(/\s+/g, '')} ${school.name.replace(/\s+/g, '')} ${academicYear}`;
                        const classUsername = generateUsername(className);

                        classesToCreate.push({
                            name: className,
                            username: classUsername,
                            schoolId: school.id,
                            code: generateCode(),
                            classType: 'SchoolClass',
                            educationLever: 'TVET',
                            curriculum: 'TVET',
                        });

                        // Create modules specific to this class
                        const classModules = [{
                            name: specializationName,
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'TVET',
                        }];

                        // Add optional subjects if they exist
                        if (validation.data.tvetOptionSubjects && validation.data.tvetOptionSubjects.length > 0) {
                            validation.data.tvetOptionSubjects.forEach(subjectName => {
                                classModules.push({
                                    name: subjectName,
                                    code: generateCode(),
                                    subjectType: ModuleType.General,
                                    curriculum: 'TVET',
                                });
                            });
                        }

                        modulesByClass.push({
                            className,
                            modules: classModules
                        });
                    });
                });
            }

            // --- Create Classes in the Database ---
            let createdClassesCount = 0;
            if (classesToCreate.length > 0) {
                const result = await this.dbService.class.createMany({
                    data: classesToCreate,
                });
                createdClassesCount = result.count;
            }

            // Retrieve the created classes to link modules
            const classNamesCreated = classesToCreate.map(c => c.name);
            const classesInDb = await this.dbService.class.findMany({
                where: {
                    schoolId: school.id,
                    name: { in: classNamesCreated }
                },
                select: { id: true, name: true }
            });

            const finalModuleInstancesToCreate: Prisma.ModuleCreateManyInput[] = [];

            // Match modules to their specific classes
            modulesByClass.forEach(classModuleData => {
                const classInDb = classesInDb.find(c => c.name === classModuleData.className);
                if (classInDb) {
                    classModuleData.modules.forEach(module => {
                        finalModuleInstancesToCreate.push({
                            ...module,
                            classId: classInDb.id,
                        });
                    });
                }
            });

            // --- Create Module Instances in the Database ---
            let createdModulesCount = 0;
            if (finalModuleInstancesToCreate.length > 0) {
                const result = await this.dbService.module.createMany({
                    data: finalModuleInstancesToCreate,
                });
                createdModulesCount = result.count;
            }

            // --- Update the School record with Academic Profile and Counts ---
            const academicProfileData = {
                primarySubjectsOffered: validation.data.primarySubjectsOffered ?? [],
                primaryPassMark: validation.data.primaryPassMark,

                oLevelCoreSubjects: validation.data.oLevelCoreSubjects ?? [],
                oLevelOptionSubjects: validation.data.oLevelOptionSubjects ?? [],
                oLevelExaminationTypes: validation.data.oLevelExaminationTypes ?? [],
                oLevelAssessment: validation.data.oLevelAssessment ?? [],

                aLevelSubjectCombination: validation.data.aLevelSubjectCombination ?? [],
                aLevelOptionSubjects: validation.data.aLevelOptionSubjects ?? [],
                aLevelPassMark: validation.data.aLevelPassMark,

                tvetSpecialization: validation.data.tvetSpecialization ?? [],
                tvetOptionSubjects: validation.data.tvetOptionSubjects ?? [],
            };

            await this.dbService.school.update({
                where: { id: schoolId },
                data: {
                    academicProfile: academicProfileData,
                    totalClasses: createdClassesCount,
                    totalModules: createdModulesCount,
                },
            });

            return { totalClasses: createdClassesCount, totalModule: createdModulesCount };

        } catch (error) {
            console.error("Error in setupAcademicStructure:", error);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const target = error.meta?.target as string[] | string | undefined;
                let fieldMessage = "a generated value";
                if (target && Array.isArray(target) && target.length > 0) {
                    fieldMessage = target.join(', ');
                } else if (typeof target === 'string') {
                    fieldMessage = target;
                }
                throw new BadRequestException(`A unique constraint violation occurred on ${fieldMessage}. Please try again or check data.`);
            }

            throw new InternalServerErrorException('Something went wrong while setting up the school academic structure.', error.message);
        }
    }

    /**
    * Sends multiple join requests for school administration personnel based on provided data.
    * This function is typically used by a school administrator or during initial school setup.
    * Creates SchoolJoinRequest entries with userId as null, using provided contact details.
    * @param schoolAdministrationDto The DTO containing school administration contact details.
    * @returns A result indicating the number of requests attempted and created.
    */
    async sendAdministrationJoinRequests(schoolAdministrationDto: SchoolAdministrationDto): Promise<sendAdministrationJoinRequestsDto> {
        // 1. Validate input
        const validation = SchoolAdministrationSchema.safeParse(schoolAdministrationDto);
        if (!validation.success) {
            // Use format() to get detailed Zod errors
            throw new BadRequestException('Invalid school administration data provided',);
        }
        const { schoolId, headmasterName, headmasterEmail, headmasterPhone,
            DirectorOfStudies, principalEmail, principalPhone, // Note: using principalEmail/Phone for DirectorOfStudies
            additionalAdministration } = validation.data; // Destructure validated data

        try {
            // 2. Verify school existence
            const school = await this.dbService.school.findUnique({ where: { id: schoolId } });

            if (!school) {
                throw new NotFoundException(`School with ID "${schoolId}" not found`);
            }

            // 3. Prepare data for join requests
            const requestsToCreate: Prisma.SchoolJoinRequestCreateManyInput[] = []; // Use Prisma type for createMany

            // Prepare data for Headmaster (if email is provided, as it's part of unique constraint)
            if (headmasterEmail) {
                requestsToCreate.push({
                    schoolId: school.id,
                    role: 'Headmaster', // Assign a specific role string
                    name: headmasterName,
                    email: headmasterEmail,
                    phone: headmasterPhone,
                    userId: null, // No authenticated user ID for this type of request
                    // status defaults to 'pending'
                });
            }


            // Prepare data for Director of Studies (if email is provided)
            if (principalEmail) { // Using principalEmail for check as per schema structure
                requestsToCreate.push({
                    schoolId: school.id,
                    role: 'DirectorOfStudies', // Assign a specific role string
                    name: DirectorOfStudies,
                    email: principalEmail, // Using principalEmail as per schema
                    phone: principalPhone, // Using principalPhone as per schema
                    userId: null, // No authenticated user ID
                    // status defaults to 'pending'
                });
            }


            // Prepare data for additional administration personnel (if email is provided for each)
            if (additionalAdministration && additionalAdministration.length > 0) {
                additionalAdministration.forEach(admin => {
                    if (admin.email) { // Ensure email is provided for each additional admin
                        requestsToCreate.push({
                            schoolId: school.id,
                            role: admin.role, // Use the role from the additionalAdministration object
                            name: admin.name,
                            email: admin.email,
                            phone: admin.phone,
                            userId: null, // No authenticated user ID
                            // status defaults to 'pending'
                        });
                    } else {
                        console.warn(`Skipping additional administration entry due to missing email:`, admin);
                        // Optionally, you could throw a BadRequestException here or track skipped entries
                    }
                });
            }

            // If no valid requests were prepared
            if (requestsToCreate.length === 0) {
                // This might happen if required emails (headmaster, director, additional) were missing
                throw new BadRequestException('No valid administration contact emails provided to send join requests.');
            }


            // 4. Create the join requests in the database
            let createdCount = 0;
            // Rely on createMany with skipDuplicates for efficiency.
            // The unique constraint @@unique([userId, schoolId, email]) on SchoolJoinRequest
            // will prevent duplicate requests with the same schoolId and email (when userId is null).
            try {
                const result = await this.dbService.schoolJoinRequest.createMany({
                    data: requestsToCreate as Prisma.Enumerable<Prisma.SchoolJoinRequestCreateManyInput>, // Cast for type safety
                });
                createdCount = result.count;
            } catch (error) {
                // P2002 errors for createMany with skipDuplicates are suppressed (skipped),
                // so this catch block will handle other potential database errors during createMany.
                console.error('Error during bulk creation of administration join requests:', error);
                throw new InternalServerErrorException('Something went wrong during the bulk creation of administration join requests.');
            }
            return { attempted: requestsToCreate.length, created: createdCount, message: `Attempted to create ${requestsToCreate.length} administration join requests.` };

        } catch (error) {
            // Re-throw known exceptions
            if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            // Handle other potential errors not caught by createMany's skipDuplicates
            console.error('Unexpected error in sendAdministrationJoinRequests:', error);
            throw new InternalServerErrorException('An unexpected error occurred while processing administration join requests.');
        }
    }
    // private extractCloudinaryPublicId(imageUrl?: string | null): string | null {
    //   if (!imageUrl || !imageUrl.includes('cloudinary')) return null;

    //   const parts = imageUrl.split('/');
    //   const filename = parts[parts.length - 1];
    //   const publicId = filename.split('.')[0];
    //   const folder = parts[parts.length - 2];

    //   return `${folder}/${publicId}`;
    // }
}
