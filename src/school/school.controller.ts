import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SchoolService } from './school.service';
import { CreateSchoolDto, CreateSchoolSchema, SchoolMembersDto, schoolTypeDto } from './dto/school.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { SchoolAcademicDto, SchoolAcademicSchema } from './dto/school-academic.dto';
import { SchoolAdministrationDto, SchoolAdministrationSchema } from './dto/school-administration.dto';
import { UpdateSchoolDto } from './dto/update.dto';

@Controller('school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) { }

  @Post()
  create(@Body(new ZodValidationPipe(CreateSchoolSchema)) createSchoolDto: CreateSchoolDto) {
    return this.schoolService.create(createSchoolDto);
  }

  @Get()
  async findAll(
    @Query('schoolType') schoolType?: schoolTypeDto,
    @Query('schoolMembers') schoolMembers?: SchoolMembersDto,
    @Query('creator') creatorId?: string
  ) {
    return await this.schoolService.findAll(schoolType, schoolMembers, creatorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolService.update(id, updateSchoolDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schoolService.remove(id);
  }

// TODO : add auth guid
  @Post("/academic")
  createAcademic(@Body(new ZodValidationPipe(SchoolAcademicSchema)) schoolAcademicDto: SchoolAcademicDto) {
    return this.schoolService.setupAcademicStructure(schoolAcademicDto);
  }

  // TODO : add auth guid
  @Post("/administration")
  createAdministration(@Body(new ZodValidationPipe(SchoolAdministrationSchema)) schoolAdministrationDto: SchoolAdministrationDto) {
    return this.schoolService.sendAdministrationJoinRequests(schoolAdministrationDto);
  }

}
