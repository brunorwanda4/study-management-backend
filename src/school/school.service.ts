import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSchoolDto, createSchoolSchema, schoolTypeDto, SchoolMembersDto } from './dto/school.dto';
import { DbService } from 'src/db/db.service';
import { generateCode, generateUsername } from 'src/common/utils/characters.util';

@Injectable()
export class SchoolService {
  constructor(private readonly dbService: DbService,) { }

  async create(createSchoolDto: CreateSchoolDto,) {
    const validation = createSchoolSchema.safeParse(createSchoolDto);
    if (!validation.success) {
      throw new BadRequestException('Invalid school data provided');
    }
    const { name, creatorId, ...rest } = validation.data
    try {
      const creator = await this.dbService.user.findUnique({ where: { id: creatorId } });
      if (!creator || (creator.role !== "SCHOOLSTAFF" && creator.role !== "ADMIN")) {
        throw new BadRequestException('you can not create school')
      }
      return await this.dbService.school.create({
        data: {
          name,
          username: generateUsername(name),
          code: generateCode(),
          creatorId,
          ...rest
        }
      })
    } catch (error) {
      throw new BadRequestException({
        message: 'Something went wrong while retrieving school',
        error,
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
