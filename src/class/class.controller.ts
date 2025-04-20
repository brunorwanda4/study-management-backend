import { ZodValidationPipe } from './../common/pipes/zod-validation.pipe';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto, CreateClassSchema } from './dto/class.dto';

@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) { }

  @Post()
  create(@Body(new ZodValidationPipe(CreateClassSchema)) createClassDto: CreateClassDto) {
    return this.classService.create(createClassDto);
  }

  @Get()
  findAll() {
    return this.classService.findAll();
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
