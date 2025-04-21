import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CreateSchoolDto, CreateSchoolSchema, schoolTypeDto, SchoolMembersDto, curriculumEnumDto } from './dto/school.dto';
import { SchoolAcademicCreationDto, SchoolAcademicDto, SchoolAcademicSchema } from './dto/school-academic.dto';
import { DbService } from 'src/db/db.service';
import { generateCode, generateUsername } from 'src/common/utils/characters.util';
import { UploadService } from 'src/upload/upload.service';
import { ClassDto } from 'src/class/dto/class.dto'; // Assuming ClassDto is in class/dto/class.dto
import { Module, ModuleType, Prisma } from 'generated/prisma';

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

            return await this.dbService.school.create({
                data: {
                    name,
                    creatorId,
                    logo: imageUrl,
                    username,
                    code: generateCode(),
                    ...rest,
                }
            })
        } catch (error) {
            console.error('Error creating school:', error); // Log the error
            // Check for unique constraint violation on username or code if applicable
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

            const schools = await this.dbService.school.findMany({ where });

            // Omit the code from the returned objects if it should be private
            const safeSchool = schools.map(({ code, ...rest }) => rest);
            return safeSchool;
        } catch (error) {
            console.error('Error retrieving schools:', error);
            throw new NotFoundException({
                message: 'Something went wrong while retrieving schools',
                error: error.message, // Provide error message in response
            });
        }
    }


    async findOne(id?: string, username?: string, code?: string) {
        if (!id && !code && !username) {
            throw new BadRequestException('You must provide id, code or username to find a school');
        }
        // Use findFirst or findUnique based on which fields are truly unique in your schema
        // Assuming id, username, and code are unique based on your create logic
        const where = id ? { id } : code ? { code } : { username };

        try {
            const school = await this.dbService.school.findUnique({ where });

            if (!school) {
                const identifier = id || code || username;
                throw new NotFoundException(`School not found with identifier: ${identifier}`);
            }

            // Omit the code if it should be private
            const { code: schoolCode, ...safeSchool } = school;
            return safeSchool; // Return the safe school object

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

    update(id: string, updateSchoolDto: unknown) {
        return `This action updates a #${id} school`;
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
            // Use format() to get detailed Zod errors
            throw new BadRequestException('Invalid school academic data provided');
        }

        const { schoolId, primarySubjectsOffered, oLevelCoreSubjects, oLevelOptionSubjects,
            aLevelSubjectCombination, aLevelOptionSubjects, tvetSpecialization, tvetOptionSubjects,
            // assessmentTypes,
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

            const classesToCreate: Prisma.ClassCreateManyInput[] = []; // Use Prisma type
            const moduleInstancesToPrepare: Prisma.ModuleCreateManyInput[] = []; // Use Prisma type


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
                        educationLever: 'Primary Education',
                        curriculum: 'REB',
                    });

                    primarySubjectsOffered.forEach(subjectName => {
                        moduleInstancesToPrepare.push({
                            name: subjectName,
                            // classId will be added after classes are created
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'REB',
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
                        curriculum: 'REB', // Assign curriculum as a string value
                    });
                    oLevelCoreSubjects.forEach(subjectName => {
                        moduleInstancesToPrepare.push({
                            name: subjectName,
                            // classId will be added after classes are created
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'REB',
                        });
                    });

                    if (oLevelOptionSubjects && oLevelOptionSubjects.length > 0) {
                        oLevelOptionSubjects.forEach(subjectName => {
                            moduleInstancesToPrepare.push({
                                name: subjectName,
                                // classId will be added after classes are created
                                code: generateCode(),
                                subjectType: ModuleType.Optional,
                                curriculum: 'REB',
                            });
                        });
                    }
                }
            }


            // Advanced Level (Classes per subject combination, S4 to S6)
            if (aLevelSubjectCombination && aLevelSubjectCombination.length > 0) {
                const aLevelLevels = [4, 5, 6]; // Representing S4, S5, S6

                aLevelSubjectCombination.forEach(combination => {
                    // const combinationNameClean = combination.replace(/\s+/g, ''); // Clean combination name for URL/username


                    aLevelLevels.forEach(levelNumber => {
                        const level = `S${levelNumber}`;
                        const className = `${level} ${combination} ${school.name.replace(/\s+/g, '')} ${academicYear}`;
                        const classUsername = generateUsername(className);

                        // Prepare class data for this specific combination and level
                        classesToCreate.push({
                            name: className,
                            username: classUsername,
                            schoolId: school.id,
                            code: generateCode(),
                            classType: 'SchoolClass',
                            educationLever: 'Advanced Level', // Use 'Advanced Level' as the education lever identifier
                            curriculum: 'REB', // Assign curriculum
                        });

                        // Prepare module instances for the subjects *within* this combination
                        // NOTE: The schema only provides the combination names (e.g., 'PCM'),
                        // not the individual subjects (Physics, Chemistry, Math).
                        // Assuming for this logic that the combination string itself,
                        // and the optional subjects, are the module names to create.
                        // A more robust solution would require a mapping from combination strings to subject lists.

                        // Create a module instance for the combination name itself (e.g., 'PCM')
                        moduleInstancesToPrepare.push({
                            name: combination, // Use the combination name as a module name
                            // classId will be added after classes are created
                            code: generateCode(), // Unique code for module instance
                            subjectType: ModuleType.General, // Consider combination as a general module
                            curriculum: 'REB', // Assign curriculum
                        });


                        // Prepare optional module instances for this combination and level
                        if (aLevelOptionSubjects && aLevelOptionSubjects.length > 0) {
                            aLevelOptionSubjects.forEach(subjectName => {
                                moduleInstancesToPrepare.push({
                                    name: subjectName, // Use the optional subject name as a module name
                                    // classId will be added after classes are created
                                    code: generateCode(), // Unique code for module instance
                                    subjectType: ModuleType.Optional, // Mark as optional
                                    curriculum: 'REB', // Assign curriculum
                                });
                            });
                        }
                    });
                });
            }


            // TVET (3 classes: L3 to L5, based on specialization)
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

                        moduleInstancesToPrepare.push({
                            name: specializationName,
                            // classId will be added after classes are created
                            code: generateCode(),
                            subjectType: ModuleType.General,
                            curriculum: 'TVET Curriculum',
                        });

                        if (tvetOptionSubjects && tvetOptionSubjects.length > 0) {
                            tvetOptionSubjects.forEach(subjectName => {
                                moduleInstancesToPrepare.push({
                                    name: subjectName,
                                    // classId will be added after classes are created
                                    code: generateCode(),
                                    subjectType: ModuleType.Optional,
                                    curriculum: 'TVET Curriculum',
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
                    //  skipDuplicates: true,
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
                // **Include educationLever in the select**
                select: { id: true, name: true, educationLever: true }
            });


            // --- Link Module Instances to Created Classes ---
            // Filter and map prepared module instances to the created classes by education level
            const finalModuleInstancesToCreate: Prisma.ModuleCreateManyInput[] = []; // Use Prisma type


            moduleInstancesToPrepare.forEach(moduleData => {
                // Find the class(es) this module instance should be linked to
                // This assumes a module prepared for a certain level should be linked to
                // ALL classes created for that level in this operation based on the module's assigned curriculum.
                // We'll use the curriculum assigned during preparation to match the class's curriculum and education level.

                const relevantClasses = classesInDb.filter(cls => {
                    // Find the original class data from classesToCreate to get the intended education level and curriculum
                    const originalClassData = classesToCreate.find(c => c.name === cls.name);

                    if (!originalClassData) return false; // Should not happen if logic is correct

                    // Link module instance if its intended curriculum matches the class's curriculum and level
                    return originalClassData.curriculum === moduleData.curriculum && originalClassData.educationLever === cls.educationLever;

                    // This linking logic might need adjustment based on how subjects truly relate to classes in your system.
                    // For example, if 'Mathematics' is a primary subject and also an O Level subject,
                    // you need to ensure the Primary 'Mathematics' module instance is linked only to Primary classes
                    // and the O Level 'Mathematics' module instance is linked only to O Level classes.
                    // The current approach relies on the curriculum assigned during preparation and the class's curriculum/educationLever.
                });

                relevantClasses.forEach(cls => {
                    finalModuleInstancesToCreate.push({
                        ...moduleData,
                        classId: cls.id, // Link to the created class ID
                        // Ensure unique codes for module instances if necessary, although linking to classId should make them unique with classId+name or classId+code in DB
                        code: generateCode(), // Generate a new unique code for each module instance if code must be unique globally or per class
                    });
                });
            });


            // --- Create Module Instances in the Database ---
            let createdModulesCount = 0;
            if (finalModuleInstancesToCreate.length > 0) {
                // Cast to the expected type to help TypeScript
                const dataToCreate = finalModuleInstancesToCreate as Prisma.Enumerable<Prisma.ModuleCreateManyInput>;
                const result = await this.dbService.module.createMany({
                    data: dataToCreate,
                    //  skipDuplicates: true,
                });
                createdModulesCount = result.count;
            }
            // Note: assessmentTypes are part of SchoolAcademicSchema but not directly
            // linked to Class or Module in your provided schema. They are not
            // used in the class/module creation logic here. You might need
            // a separate table or field in the School model to store these,
            // or they might be used elsewhere in your application logic.

            // Retrieve the full created class and module objects to return
            // const classes = await this.dbService.class.findMany({
            //     where: { schoolId: school.id, name: { in: classNamesCreated } } // Retrieve classes created in this run
            // });

            // const modules = await this.dbService.module.findMany({
            //     where: { classId: { in: classes.map(c => c.id) } } // Retrieve modules linked to these classes
            // });

            // Omit code from returned classes as per requirement
            // The cast to ClassDto[] should now work if ClassDto has code as optional
            // const safeClasses = classes.map(({ code, ...rest }) => rest) as unknown as ClassDto[];


            // console.log(`Attempted to create ${classesToCreate.length} classes and ${moduleInstancesToPrepare.length} initial module instances.`);
            // console.log(`Successfully created ${createdClassesCount} classes and ${createdModulesCount} module instances for school ${school.name}.`);


            return { totalClasses: createdClassesCount, totalModule: createdModulesCount };

        } catch (error) {
            // Re-throw known exceptions or wrap others
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            // Check for unique constraint violation on class username or code
            if (error.code === 'P2002') {
                if (error.meta?.target?.includes('username')) {
                    throw new BadRequestException('A generated class username was not unique, please try again.');
                }
                if (error.meta?.target?.includes('code')) {
                    // This might indicate a unique code issue on either Class or Module
                    throw new BadRequestException('A generated code was not unique, please try again.');
                }
            }

            throw new InternalServerErrorException('Something went wrong while setting up the school academic structure.', error.message);
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
