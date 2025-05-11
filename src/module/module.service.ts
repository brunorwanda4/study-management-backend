import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { DbService } from 'src/db/db.service'; // Your Prisma service
import { Prisma, Module, } from '../../generated/prisma'; // Adjust path as per your `output` in schema.prisma
import { CreateModuleDto, CreateModuleSchema } from './dto/create-module.dto';
import { UpdateModuleDto, UpdateModuleSchema } from './dto/update-module.dto';
@Injectable()
export class ModuleService {
  constructor(
    private readonly db: DbService // This is your PrismaClient instance
  ) { }

  /**
   * Creates a new module.
   * @param data Data for creating the module, validated by CreateModuleSchema.
   * @returns The created module.
   * @throws ConflictException if a module with the same code already exists.
   * @throws BadRequestException if input data is invalid.
   */
  async createModule(data: CreateModuleDto): Promise<Module> {
    // Validate input data using Zod schema
    const validationResult = CreateModuleSchema.safeParse(data);
    if (!validationResult.success) {
      throw new BadRequestException({
        message: 'Invalid input data for creating module.',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }
    const { name, code, classId, teacherId, ...restData } = validationResult.data;

    try {
      const moduleData: Prisma.ModuleCreateInput = {
        name,
        code,
        ...restData,
      };
      if (classId) {
        moduleData.class = { connect: { id: classId } };
      }
      if (teacherId) {
        moduleData.teacher = { connect: { id: teacherId } };
      }

      return await this.db.module.create({
        data: moduleData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002' && error.meta?.target === 'Module_code_key') { // Specific to unique constraint on 'code'
          throw new ConflictException(`A module with code "${data.code}" already exists.`);
        }
        // Handle other potential known errors, e.g., foreign key constraint if classId or teacherId is invalid (P2025 on connect)
        if (error.code === 'P2025') {
          throw new NotFoundException(`Could not create module. Ensure Class or Teacher ID exists if provided.`);
        }
      }
      throw new InternalServerErrorException('Could not create module.');
    }
  }

  /**
   * Retrieves all modules with optional filtering, pagination, and sorting.
   * @param params Options for findMany (skip, take, cursor, where, orderBy, include).
   * @returns A list of modules.
   */
  async getAllModules(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ModuleWhereUniqueInput;
    where?: Prisma.ModuleWhereInput;
    orderBy?: Prisma.ModuleOrderByWithRelationInput;
    include?: Prisma.ModuleInclude;
  }): Promise<Module[]> {
    const { skip, take, cursor, where, orderBy, include } = params || {};
    try {
      return await this.db.module.findMany({
        skip,
        take,
        cursor,
        where,
        orderBy,
        include: include ?? {
          class: {
            select: {
              name: true,
              id: true,
              image: true,
              username: true,
              classTeacherId: true,
              teacher: {
                select: {
                  id: true,
                  name: true,
                  userId: true,
                  image: true,
                }
              }

            }
          }, teacher: {
            select: {
              name: true,
              email: true,
              image: true,
              id: true,
              userId: true
            }
          }
        }, // Default include
      });
    } catch (error) {
      throw new InternalServerErrorException('Could not retrieve modules.');
    }
  }

  /**
   * Retrieves a single module by its ID.
   * @param id The ID of the module.
   * @param include Relations to include.
   * @returns The found module.
   * @throws NotFoundException if the module is not found.
   */
  async getModuleById(id: string, include?: Prisma.ModuleInclude): Promise<Module> {
    const module = await this.db.module.findUnique({
      where: { id },
      include: include ?? { class: true, teacher: true }, // Default include
    });
    if (!module) {
      throw new NotFoundException(`Module with ID "${id}" not found.`);
    }
    return module;
  }

  /**
   * Updates an existing module.
   * @param id The ID of the module to update.
   * @param data Data for updating the module, validated by UpdateModuleSchema.
   * @returns The updated module.
   * @throws NotFoundException if the module is not found.
   * @throws BadRequestException if input data is invalid.
   * @throws ConflictException if a unique constraint (e.g., code) is violated.
   */
  async updateModule(id: string, data: UpdateModuleDto): Promise<Module> {
    const validationResult = UpdateModuleSchema.safeParse(data);
    if (!validationResult.success) {
      throw new BadRequestException({
        message: 'Invalid input data for updating module.',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { classId, teacherId, ...restData } = validationResult.data;

    // Ensure module exists before trying to update
    await this.getModuleById(id); // Throws NotFoundException if not found

    try {
      const updateData: Prisma.ModuleUpdateInput = { ...restData };
      if (classId === null) { // Explicitly set to null
        updateData.class = { disconnect: true };
      } else if (classId) {
        updateData.class = { connect: { id: classId } };
      }

      if (teacherId === null) { // Explicitly set to null
        updateData.teacher = { disconnect: true };
      } else if (teacherId) {
        updateData.teacher = { connect: { id: teacherId } };
      }

      return await this.db.module.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // This can happen if a connect operation fails because the related record doesn't exist
          throw new NotFoundException(`Could not update module. Ensure Class or Teacher ID exists if provided for connection.`);
        }
        // If 'code' were updatable and unique constraint violated:
        // if (error.code === 'P2002' && error.meta?.target === 'Module_code_key') {
        //   throw new ConflictException(`A module with code "${data.code}" already exists.`);
        // }
      }
      throw new InternalServerErrorException(`Could not update module with ID "${id}".`);
    }
  }

  /**
   * Deletes a module by its ID.
   * @param id The ID of the module to delete.
   * @returns The deleted module.
   * @throws NotFoundException if the module is not found.
   */
  async deleteModule(id: string): Promise<Module> {
    // Ensure module exists before trying to delete
    await this.getModuleById(id); // Throws NotFoundException if not found
    try {
      return await this.db.module.delete({
        where: { id },
      });
    } catch (error) {
      // P2025 is 'Record to delete not found', already handled by getModuleById
      throw new InternalServerErrorException(`Could not delete module with ID "${id}".`);
    }
  }

  /**
   * Assigns a module to a specific teacher. This can also be used to change the teacher.
   * @param moduleId The ID of the module.
   * @param teacherId The ID of the teacher.
   * @returns The updated module.
   */
  async assignModuleToTeacher(moduleId: string, teacherId: string): Promise<Module> {
    // Validate existence of module and teacher
    await this.getModuleById(moduleId);
    const teacher = await this.db.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${teacherId}" not found.`);
    }

    try {
      return await this.db.module.update({
        where: { id: moduleId },
        data: { teacher: { connect: { id: teacherId } } },
        include: { teacher: true, class: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not assign teacher "${teacherId}" to module "${moduleId}".`);
    }
  }

  /**
   * Alias for assignModuleToTeacher, makes intent clearer if changing an existing teacher.
   */
  async changeModuleTeacher(moduleId: string, newTeacherId: string): Promise<Module> {
    return this.assignModuleToTeacher(moduleId, newTeacherId);
  }

  /**
   * Removes a teacher from a module.
   * @param moduleId The ID of the module.
   * @returns The updated module.
   */
  async removeModuleTeacher(moduleId: string): Promise<Module> {
    const module = await this.getModuleById(moduleId); // Ensures module exists
    if (!module.teacherId) {
      // Consider if this should be an error or just return the module
      // For now, return module as no action needed if no teacher is assigned.
      return module;
    }
    try {
      return await this.db.module.update({
        where: { id: moduleId },
        data: { teacher: { disconnect: true } },
        include: { teacher: true, class: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not remove teacher from module "${moduleId}".`);
    }
  }

  /**
   * Assigns a module to a specific class.
   * @param moduleId The ID of the module.
   * @param classId The ID of the class.
   * @returns The updated module.
   */
  async assignModuleToClass(moduleId: string, classId: string): Promise<Module> {
    await this.getModuleById(moduleId);
    const classExists = await this.db.class.findUnique({ where: { id: classId } });
    if (!classExists) {
      throw new NotFoundException(`Class with ID "${classId}" not found.`);
    }

    try {
      return await this.db.module.update({
        where: { id: moduleId },
        data: { class: { connect: { id: classId } } },
        include: { teacher: true, class: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not assign module "${moduleId}" to class "${classId}".`);
    }
  }

  /**
   * Removes a module from its class.
   * @param moduleId The ID of the module.
   * @returns The updated module.
   */
  async removeModuleFromClass(moduleId: string): Promise<Module> {
    const module = await this.getModuleById(moduleId);
    if (!module.classId) {
      return module; // No class assigned, no action needed
    }
    try {
      return await this.db.module.update({
        where: { id: moduleId },
        data: { class: { disconnect: true } },
        include: { teacher: true, class: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not remove module "${moduleId}" from its class.`);
    }
  }

  /**
   * Retrieves modules taught by a specific teacher.
   * @param teacherId The ID of the teacher.
   * @param params Optional query parameters (pagination, etc.).
   * @returns A list of modules.
   */
  async getModulesByTeacher(teacherId: string, params?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ModuleOrderByWithRelationInput;
    include?: Prisma.ModuleInclude;
  }): Promise<Module[]> {
    const teacher = await this.db.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${teacherId}" not found.`);
    }
    const { skip, take, orderBy, include } = params || {};
    try {
      return await this.db.module.findMany({
        where: { teacherId },
        skip,
        take,
        orderBy,
        include: include ?? {
          class: {
            select: {
              name: true,
              username: true,
              id: true,
              image: true
            },
            include: {
              school: {
                select: {
                  name: true,
                  username: true,
                  logo: true,
                  id: true,
                }
              }
            }
          }, teacher: {
            select: {
              name: true,
              image: true,
              userId: true,
              email: true
            }
          }
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not retrieve modules for teacher "${teacherId}".`);
    }
  }

  /**
   * Retrieves modules belonging to a specific class.
   * @param classId The ID of the class.
   * @param params Optional query parameters.
   * @returns A list of modules.
   */
  async getModulesByClass(classId: string, params?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ModuleOrderByWithRelationInput;
    include?: Prisma.ModuleInclude;
  }): Promise<Module[]> {
    const classExists = await this.db.class.findUnique({ where: { id: classId } });
    if (!classExists) {
      throw new NotFoundException(`Class with ID "${classId}" not found.`);
    }
    const { skip, take, orderBy, include } = params || {};
    try {
      return await this.db.module.findMany({
        where: { classId },
        skip,
        take,
        orderBy,
        include: include ?? {
          class: {
            select: {
              name: true,
              username: true,
              id: true,
              image: true,
              classTeacherId: true,
              curriculum: true,
              schoolId: true,
              school: {
                select: {
                  name: true,
                  username: true,
                  logo: true,
                }
              },
              teacher: {
                select: {
                  name: true,
                  email: true,
                  image: true,
                  id: true,
                  userId: true
                }
              }
            }
          }, teacher: {
            select: {
              name: true,
              email: true,
              image: true,
              id: true,
              userId: true
            }
          }
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not retrieve modules for class "${classId}".`);
    }
  }

  /**
   * Retrieves modules belonging to a specific school (via classes).
   * @param schoolId The ID of the school.
   * @param params Optional query parameters.
   * @returns A list of modules.
   */
  async getModulesBySchool(schoolId: string, params?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ModuleOrderByWithRelationInput;
    include?: Prisma.ModuleInclude;
  }): Promise<Module[]> {
    const schoolExists = await this.db.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      throw new NotFoundException(`School with ID "${schoolId}" not found.`);
    }
    const { skip, take, orderBy, include } = params || {};
    try {
      // Find modules where their class's schoolId matches
      return await this.db.module.findMany({
        where: {
          class: {
            schoolId: schoolId,
          },
        },
        skip,
        take,
        orderBy,
        include: include ?? {
          class: {
            select: {
              name: true,
              username: true,
              id: true,
            },
            include: {
              school: {
                select: {
                  name: true,
                  username: true,
                  logo: true,
                  id: true,
                }
              }
            }
          }, teacher: {
            select: {
              name: true,
              image: true,
              userId: true,
              email: true
            }
          }
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not retrieve modules for school "${schoolId}".`);
    }
  }

  /**
   * Creates multiple modules in bulk.
   * Note: This implementation creates modules one by one to provide individual error handling for unique constraints.
   * Prisma's `createMany` for MongoDB does not support `skipDuplicates` for non-@id unique fields effectively.
   * @param dataList An array of module creation data.
   * @returns An object with successfully created modules and any errors encountered.
   */
  async bulkCreateModules(dataList: CreateModuleDto[]): Promise<{ createdModules: Module[], errors: any[] }> {
    const createdModules: Module[] = [];
    const errors: any[] = [];

    for (const data of dataList) {
      try {
        // Validate each DTO
        const validationResult = CreateModuleSchema.safeParse(data);
        if (!validationResult.success) {
          errors.push({
            input: data,
            error: 'Validation failed',
            details: validationResult.error.flatten().fieldErrors,
          });
          continue;
        }
        const createdModule = await this.createModule(validationResult.data); // Uses the single createModule for its logic
        createdModules.push(createdModule);
      } catch (error) {
        errors.push({ input: data, error: error.message, status: error.status });
      }
    }
    return { createdModules, errors };
  }

  /**
   * Searches for modules by name (case-insensitive contains).
   * @param nameQuery The search query for the module name.
   * @param params Optional query parameters.
   * @returns A list of matching modules.
   */
  async searchModulesByName(nameQuery: string, params?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ModuleOrderByWithRelationInput;
    include?: Prisma.ModuleInclude;
  }): Promise<Module[]> {
    const { skip, take, orderBy, include } = params || {};
    try {
      return await this.db.module.findMany({
        where: {
          name: {
            contains: nameQuery,
            mode: 'insensitive', // For case-insensitive search in MongoDB
          },
        },
        skip,
        take,
        orderBy,
        include: include ?? { class: true, teacher: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Could not search modules by name "${nameQuery}".`);
    }
  }

  /**
   * Retrieves modules that are not assigned to any teacher AND not assigned to any class.
   * @param params Optional query parameters.
   * @returns A list of unassigned modules.
   */
  async getUnassignedModules(params?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ModuleOrderByWithRelationInput;
    include?: Prisma.ModuleInclude;
  }): Promise<Module[]> {
    const { skip, take, orderBy, include } = params || {};
    try {
      return await this.db.module.findMany({
        where: {
          teacherId: null,
          classId: null,
        },
        skip,
        take,
        orderBy,
        include: include ?? { class: true, teacher: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Could not retrieve unassigned modules.');
    }
  }
}
