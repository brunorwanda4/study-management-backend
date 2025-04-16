import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SchoolService } from './school.service';
import { CreateSchoolDto, createSchoolSchema, SchoolMembersDto, schoolTypeDto } from './dto/school.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createSchoolSchema)) createSchoolDto: CreateSchoolDto) {
    return this.schoolService.create(createSchoolDto);
  }

  @Get()
 async findAll(
    @Query('schoolType') schoolType?: schoolTypeDto,
    @Query('schoolMembers') schoolMembers?: SchoolMembersDto,
    @Query('creator') creatorId ?: string
  ) {
    return await this.schoolService.findAll(schoolType, schoolMembers, creatorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchoolDto: unknown) {
    return this.schoolService.update(id, updateSchoolDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schoolService.remove(id);
  }
}
