import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSchoolDto, CreateSchoolSchema, schoolTypeDto, SchoolMembersDto } from './dto/school.dto';
import { DbService } from 'src/db/db.service';
import { generateCode, generateUsername } from 'src/common/utils/characters.util';
import { UploadService } from 'src/upload/upload.service';

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
      throw new BadRequestException({
        message: 'Something went wrong while retrieving school',
        error,
      });
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

      const safeSchool = schools.map(({ code, ...rest }) => rest);
      return safeSchool;
    } catch (error) {
      throw new NotFoundException({
        message: 'Something went wrong while retrieving schools',
        error,
      });
    }
  }


  async findOne(id: string, username?: string, code?: string) {
    if (!id && !code && !username) {
      throw new BadRequestException('You must provide id, code or username to find a school');
    }
    const where = id ? { id } : code ? { code } : { username };
    try {
      const school = await this.dbService.school.findUnique({ where });

      if (!school) {
        const identifier = id || code || username;
        throw new NotFoundException(`User not found with identifier: ${identifier}`);
      }

      return school;
    } catch (error) {
      throw new NotFoundException({
        message: 'Something went wrong while retrieving school',
        error,
      });
    }
  }

  update(id: string, updateSchoolDto: unknown) {
    return `This action updates a #${id} school`;
  }

  remove(id: string) {
    return `This action removes a #${id} school`;
  }
}
