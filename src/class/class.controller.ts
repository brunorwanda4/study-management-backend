import { ZodValidationPipe } from './../common/pipes/zod-validation.pipe';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ClassService } from './class.service';
import {  CreateClassInput, CreateClassSchema } from './dto/create-class.dto';
import { ClassType } from 'generated/prisma';

@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) { }

  @Post()
  create(@Body(new ZodValidationPipe(CreateClassSchema)) createClassDto: CreateClassInput) {
    return this.classService.create(createClassDto);
  }

  @Get()
  findAll(
    @Query('schoolId') schoolId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('classType') classType?: ClassType,
  ) {
    return this.classService.findAll(schoolId, creatorId, classType);
  }

  @Get('/school/:schoolId/view-data')
  findAllBySchoolIdNeededData(
    @Param('schoolId') schoolId: string,
  ) {
    return this.classService.findAllBySchoolIdNeededData(schoolId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClassDto: any) {
    return this.classService.update(id, updateClassDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classService.remove(id);
  }
}
