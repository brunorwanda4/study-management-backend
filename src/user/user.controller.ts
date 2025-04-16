import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, CreateUserSchema, UpdateUserDto, UpdateUserSchema, UserRoleDto } from './dto/user.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  create(@Body(new ZodValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll(@Query('role') role?: UserRoleDto) {
    return this.userService.findAll(role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(UpdateUserSchema)) updateUserDto: UpdateUserDto) {
    const user = await this.userService.update(id, updateUserDto);
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
