import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, Request, UsePipes, UseGuards, Headers } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto, CreateUserDto, CreateUserSchema, UpdateUserDto, UpdateUserSchema, UserRoleDto } from './dto/user.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { PassportJswAuthGuard } from 'src/common/guards/passport-jwt.guard';

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
  @UseGuards(PassportJswAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Request() request: { user: AuthUserDto },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) updateUserDto: UpdateUserDto,
    @Headers('role') role: string
  ) {

    return await this.userService.update(id, updateUserDto, request.user, role);

  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
