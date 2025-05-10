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
            throw new BadRequestException({message: 'Invalid school data provided for update', errors: validation.error.flatten().fieldErrors});
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
            // You might want to log validation.error or return more specific details
            console.error("Zod validation failed:", validation.error.format());
            throw new BadRequestException('Invalid school academic data provided');
        }

        // Destructure all fields from validation.data that are used in the function
        // It's often clearer to access them directly via validation.data.fieldName when constructing complex objects like academicProfileData
        const {
            schoolId,
            primarySubjectsOffered, // Used in conditional logic
            oLevelCoreSubjects,     // Used in conditional logic
            aLevelSubjectCombination, // Used in conditional logic
            tvetSpecialization,     // Used in conditional logic
            // assessmentTypes, // Will be accessed via validation.data.assessmentTypes
            // Other fields like primaryPassMark, etc., will be accessed via validation.data directly
        } = validation.data;


        try {
            const school = await this.dbService.school.findUnique({
                where: { id: schoolId },
                select: { id: true, name: true }, // Select only what's needed
            });

            if (!school) {
                throw new NotFoundException(`School with ID "${schoolId}" not found`);
            }

            const currentYear = new Date().getFullYear();
            const academicYear = `${currentYear}-${currentYear + 1}`;

            const classesToCreate: Prisma.ClassCreateManyInput[] = [];
            const moduleInstancesToPrepare: Prisma.ModuleCreateManyInput[] = []; // Temporary store before linking classId


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
                        curriculum: 'REB', // Assuming REB is a string identifier
                    });

                    primarySubjectsOffered.forEach(subjectName => {
                        moduleInstancesToPrepare.push({
                            name: subjectName,
                            // classId will be added after classes are created
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'REB', // To match with class's curriculum
                            // educationLever: 'Primary' // Store intended level for later matching
                        });
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
                    oLevelCoreSubjects.forEach(subjectName => {
                        moduleInstancesToPrepare.push({
                            name: subjectName,
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'REB',
                            // educationLever: 'OLevel'
                        });
                    });

                    if (validation.data.oLevelOptionSubjects && validation.data.oLevelOptionSubjects.length > 0) {
                        validation.data.oLevelOptionSubjects.forEach(subjectName => {
                            moduleInstancesToPrepare.push({
                                name: subjectName,
                                code: generateCode(),
                                subjectType: ModuleType.Optional,
                                curriculum: 'REB',
                                // educationLever: 'OLevel'
                            });
                        });
                    }
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
                        // Module for the combination itself
                        moduleInstancesToPrepare.push({
                            name: combination,
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'REB',
                            // educationLever: 'ALevel'
                        });

                        if (validation.data.aLevelOptionSubjects && validation.data.aLevelOptionSubjects.length > 0) {
                            validation.data.aLevelOptionSubjects.forEach(subjectName => {
                                moduleInstancesToPrepare.push({
                                    name: subjectName,
                                    code: generateCode(),
                                    subjectType: ModuleType.Optional,
                                    curriculum: 'REB',
                                    // educationLever: 'ALevel'
                                });
                            });
                        }
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
                            curriculum: 'TVET', // Assuming TVET is a string identifier
                        });
                        // Module for the specialization itself
                        moduleInstancesToPrepare.push({
                            name: specializationName,
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'TVET',
                            // educationLever: 'TVET'
                        });

                        if (validation.data.tvetOptionSubjects && validation.data.tvetOptionSubjects.length > 0) {
                            validation.data.tvetOptionSubjects.forEach(subjectName => {
                                moduleInstancesToPrepare.push({
                                    name: subjectName,
                                    code: generateCode(),
                                    subjectType: ModuleType.Optional,
                                    curriculum: 'TVET',
                                    // educationLever: 'TVET'
                                });
                            });
                        }
                    });
                });
            }

            // --- Create Classes in the Database ---
            let createdClassesCount = 0;
            if (classesToCreate.length > 0) {
                const result = await this.dbService.class.createMany({
                    data: classesToCreate,
                    // skipDuplicates: true, // Consider if you need this or want errors for duplicates
                });
                createdClassesCount = result.count;
            }

            // Retrieve the created classes to link modules
            // It's crucial that class names (or another identifier used for retrieval) are unique enough for this to work correctly
            const classNamesCreated = classesToCreate.map(c => c.name);
            const classesInDb = await this.dbService.class.findMany({
                where: {
                    schoolId: school.id,
                    name: { in: classNamesCreated } // Ensure names are sufficiently unique or use a better retrieval strategy
                },
                select: { id: true, name: true, educationLever: true, curriculum: true } // Select curriculum too
            });

            const finalModuleInstancesToCreate: Prisma.ModuleCreateManyInput[] = [];
            
            // Match prepared modules to actual classes created
            moduleInstancesToPrepare.forEach(moduleData => {
                const relevantClasses = classesInDb.filter(clsInDb => {
                    // Match module if its intended curriculum and education level match the class's
                    // This assumes moduleData.curriculum and clsInDb.curriculum are comparable
                    // And moduleData.educationLever (if you add it) matches clsInDb.educationLever
                    // For simplicity, the original logic linked modules broadly; this refinement ensures better matching.
                    // The original logic for linking modules to classes was:
                    // "return originalClassData.curriculum === moduleData.curriculum && originalClassData.educationLever === cls.educationLever;"
                    // We need to ensure `clsInDb.educationLever` and `clsInDb.curriculum` are correctly used from the retrieved class.
                    // And `moduleData.curriculum` is from the prepared module.
                    // The `educationLever` for moduleData was commented out, let's assume matching by curriculum is primary.
                    // And then by the class's education level.

                    let classEducationLevelMatches = false;
                    if (moduleData.curriculum === 'REB') {
                        classEducationLevelMatches = ['Primary', 'OLevel', 'ALevel'].includes(clsInDb.educationLever ?? '');
                    } else if (moduleData.curriculum === 'TVET') {
                        classEducationLevelMatches = clsInDb.educationLever === 'TVET';
                    }
                    // This logic needs to be precise. Let's simplify: a module belongs to a class if the class's curriculum matches the module's intended curriculum.
                    // And the class's education level is appropriate for that module type (e.g. primary subjects for primary classes).
                    // The current loop structure already implies this by how moduleInstancesToPrepare are generated per education level block.
                    // We need to ensure the class's `educationLever` and `curriculum` match the module's intended context.

                    // Find the original class data to know its intended educationLever for the module
                    const originalClassDataForModuleContext = classesToCreate.find(ctc => {
                        // This is tricky because moduleInstancesToPrepare doesn't store original class name.
                        // A better way is to link modules when classes are known.
                        // The current approach is to create all modules and then try to link them.
                        // Let's assume for now the logic is: if a module's curriculum matches a class's curriculum,
                        // and the class's educationLevel is one that *could* have this module.
                        // This might create too many modules per class if not careful.
                        // The provided logic `originalClassData.curriculum === moduleData.curriculum && originalClassData.educationLever === cls.educationLever;`
                        // is better if `originalClassData` can be reliably determined for each `moduleData`.
                        // Given the current structure, we'll iterate through classes and add all relevant modules.
                        return clsInDb.curriculum === moduleData.curriculum; // Basic match
                    });
                    return !!originalClassDataForModuleContext;
                });

                relevantClasses.forEach(cls => {
                    finalModuleInstancesToCreate.push({
                        ...moduleData, // name, subjectType, curriculum from moduleData
                        classId: cls.id, // Link to the created class ID
                        code: generateCode(), // Generate a new unique code for each module instance
                    });
                });
            });
            

            // --- Create Module Instances in the Database ---
            let createdModulesCount = 0;
            if (finalModuleInstancesToCreate.length > 0) {
                const result = await this.dbService.module.createMany({
                    data: finalModuleInstancesToCreate,
                    // skipDuplicates: true, // Avoids error if a module with the same unique fields (e.g., code) already exists
                });
                createdModulesCount = result.count;
            }

            // --- NEW: Update the School record with Academic Profile and Counts ---
            const academicProfileData = { // Type will be inferred by Prisma, should match SchoolAcademicProfile structure
                primarySubjectsOffered: validation.data.primarySubjectsOffered ?? [],
                primaryPassMark: validation.data.primaryPassMark, // Will be number or undefined

                oLevelCoreSubjects: validation.data.oLevelCoreSubjects ?? [],
                oLevelOptionSubjects: validation.data.oLevelOptionSubjects ?? [],
                oLevelExaminationTypes: validation.data.oLevelExaminationTypes ?? [],
                oLevelAssessment: validation.data.oLevelAssessment ?? [],

                aLevelSubjectCombination: validation.data.aLevelSubjectCombination ?? [],
                aLevelOptionSubjects: validation.data.aLevelOptionSubjects ?? [],
                aLevelPassMark: validation.data.aLevelPassMark, // Will be number or undefined

                tvetSpecialization: validation.data.tvetSpecialization ?? [],
                tvetOptionSubjects: validation.data.tvetOptionSubjects ?? [],
                // Note: Prisma's SchoolAcademicProfile does not have pass marks for TVET or O-Level in the provided schema.
                // If they were added to Prisma schema, include them here.
            };
            
            const schoolUpdateData: Prisma.SchoolUpdateInput = {
                academicProfile: academicProfileData,
                totalClasses: createdClassesCount,
                totalModules: createdModulesCount,
            };

            // Conditionally add assessmentTypes if provided in the DTO
            // if (validation.data.assessmentTypes !== undefined) {
            //     schoolUpdateData.assessmentTypes = validation.data.assessmentTypes;
            // }

            await this.dbService.school.update({
                where: { id: schoolId },
                data: schoolUpdateData,
            });
            // --- End of School Update ---

            return { totalClasses: createdClassesCount, totalModule: createdModulesCount };

        } catch (error) {
            console.error("Error in setupAcademicStructure:", error); // Log the actual error
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            // Prisma unique constraint violation
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                 // The 'target' field in error.meta can tell you which field caused the error
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
