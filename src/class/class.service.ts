import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { UploadService } from 'src/upload/upload.service';
import { generateCode, generateUsername } from 'src/common/utils/characters.util';
import { z } from 'zod';
import { CreateClassInput, CreateClassSchema } from './dto/create-class.dto';
import { ClassDto } from './dto/class.dto';
import { ClassType } from 'generated/prisma';

@Injectable()
export class ClassService {
  constructor(
    private readonly dbService: DbService,
    private readonly uploadService: UploadService,
  ) { }

  async create(createClassDto: CreateClassInput) {
    const validation = CreateClassSchema.safeParse(createClassDto);
    if (!validation.success) {
      throw new BadRequestException('Invalid class data provided');
    }

    const { name, schoolId, creatorId, classTeacherId, image: initialImage, username, ...rest } = validation.data;
    if (!creatorId && !schoolId && !classTeacherId) {
      throw new BadRequestException("Invalid Create of classes because it any connections of user")
    }
    let imageUrl = initialImage;

    try {
      // Check if school exists if schoolId is provided
      if (schoolId) {
        const school = await this.dbService.school.findUnique({ where: { id: schoolId } });
        if (!school) {
          throw new NotFoundException(`School with ID "${schoolId}" not found`);
        }
      }

      // Check if creator exists if creatorId is provided
      if (creatorId) {
        const creator = await this.dbService.user.findUnique({ where: { id: creatorId } });
        if (!creator) {
          throw new NotFoundException(`User with ID "${creatorId}" not found`);
        }
        // Optional: Add role check for creator if only certain roles can create classes
        if (creator.role !== "TEACHER" && creator.role !== "SCHOOLSTAFF" && creator.role !== "ADMIN") {
          throw new BadRequestException('You do not have permission to create a class');
        }
      }
      // Upload image if it's a base64 string
      if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('data:image')) {
        try {
          const uploaded = await this.uploadService.uploadBase64Image(imageUrl, 'class-images');
          imageUrl = uploaded.secure_url;
        } catch (uploadError) {
          // Log the upload error and proceed or throw, depending on requirements
          console.error('Image upload failed:', uploadError);
          // Optionally throw a BadRequestException or handle differently
          throw new BadRequestException('Failed to upload class image');
        }
      }


      const createdClass = await this.dbService.class.create({
        data: {
          name,
          username: generateUsername(name),
          schoolId: schoolId || undefined,
          creatorId: creatorId || undefined,
          classTeacherId: classTeacherId || undefined,
          image: imageUrl,
          code: generateCode(),
          ...rest,
        },
      });

      const { code, ...safeClass } = createdClass;
      return safeClass;

    } catch (error) {
      // Re-throw known exceptions or wrap others in a generic BadRequestException
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({ message: 'Something went wrong while creating the class', error: error });
    }
  }

  async findAll(schoolId?: string, creatorId?: string, classType?: ClassType) {
    try {
      const where: any = {};

      if (schoolId) {
        where.schoolId = schoolId;
      }

      if (creatorId) {
        where.creatorId = creatorId;
      }

      if (classType) {
        where.classType = classType;
      }

      const classes = await this.dbService.class.findMany({ where });

      // Omit the code from the returned objects if it should be private
      const safeClasses = classes.map(({ code, ...rest }) => rest);
      return safeClasses;

    } catch (error) {
      console.error('Error retrieving classes:', error);
      throw new NotFoundException({
        message: 'Something went wrong while retrieving classes',
        error,
      });
    }
  }


  async findOne(id?: string, username?: string, code?: string) {
    if (!id && !code && !username) {
      throw new BadRequestException('You must provide id, code, or username to find a class');
    }

    const where = id ? { id } : code ? { code } : { username };

    try {
      const classFound = await this.dbService.class.findUnique({ where });

      if (!classFound) {
        const identifier = id || code || username;
        throw new NotFoundException(`Class not found with identifier: ${identifier}`);
      }

      // Omit the code from the returned object if it should be private
      const { code: classCode, ...safeClass } = classFound;
      return safeClass;

    } catch (error) {
      // Re-throw known exceptions or wrap others in a generic NotFoundException
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error retrieving class:', error);
      throw new NotFoundException({
        message: 'Something went wrong while retrieving class',
        error,
      });
    }
  }

  async update(id: string, updateClassDto: unknown): Promise<ClassDto> {
    // Define a Zod schema for update if specific fields are allowed to be updated
    // For a generic update, you might skip Zod validation here or use a partial schema
    // const updateValidation = UpdateClassSchema.safeParse(updateClassDto);
    // if (!updateValidation.success) {
    //   throw new BadRequestException('Invalid class data provided for update');
    // }
    // const updateData = updateValidation.data;


    // Basic validation to ensure updateClassDto is an object
    if (typeof updateClassDto !== 'object' || updateClassDto === null) {
      throw new BadRequestException('Invalid update data provided');
    }

    // Cast to a more specific type if you have a defined UpdateClassDto
    const updateData = updateClassDto as Partial<CreateClassInput>;


    try {
      // Optional: Handle image update if present in updateData
      if (updateData.image && typeof updateData.image === 'string' && updateData.image.startsWith('data:image')) {
        try {
          // Optional: Delete old image if it exists
          const classToUpdate = await this.dbService.class.findUnique({ where: { id } });
          if (classToUpdate?.image) {
            await this.uploadService.deleteImage(classToUpdate.image);
          }

          const uploaded = await this.uploadService.uploadBase64Image(updateData.image, 'class-images');
          updateData.image = uploaded.secure_url;
        } catch (uploadError) {
          console.error('Image upload for update failed:', uploadError);
          throw new BadRequestException('Failed to upload updated class image');
        }
      } else if (updateData.image === null || updateData.image === '') {
        // Handle case where image is explicitly set to null or empty string to remove it
        // Optional: Delete old image if it exists
        const classToUpdate = await this.dbService.class.findUnique({ where: { id } });
        if (classToUpdate?.image) {
          await this.uploadService.deleteImage(classToUpdate.image); // Implement deleteImage in UploadService
        }
        updateData.image = undefined;
      }


      const updatedClass = await this.dbService.class.update({
        where: { id },
        data: updateData,
      });

      // Omit the code from the returned object if it should be private
      return updatedClass as unknown as ClassDto;

    } catch (error) {
      if (error.code === 'P2025') { // Prisma error code for "An operation failed because it depends on one or more records that were required but not found."
        throw new NotFoundException(`Class with ID "${id}" not found`);
      }
      console.error(`Error updating class with ID "${id}":`, error);
      throw new BadRequestException(`Something went wrong while updating class with ID "${id}"`);
    }
  }

  async remove(id: string) {
    try {
      // Optional: Delete associated image before removing the class
      const classToDelete = await this.dbService.class.findUnique({ where: { id } });
      if (classToDelete?.image) {
        await this.uploadService.deleteImage(classToDelete.image); // Implement deleteImage in UploadService
      }

      const deletedClass = await this.dbService.class.delete({
        where: { id },
      });

      // Omit the code from the returned object if it should be private
      const { code, ...safeClass } = deletedClass;
      return safeClass

    } catch (error) {
      if (error.code === 'P2025') { // Prisma error code for "An operation failed because it depends on one or more records that were required but not found."
        throw new NotFoundException(`Class with ID "${id}" not found`);
      }
      console.error(`Error removing class with ID "${id}":`, error);
      throw new BadRequestException(`Something went wrong while removing class with ID "${id}"`);
    }
  }
}
