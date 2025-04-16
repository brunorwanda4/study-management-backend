import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, Request, UsePipes, UseGuards } from '@nestjs/common';
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
  @UsePipes(new ZodValidationPipe(UpdateUserSchema))
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Request() request: { user: AuthUserDto },
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    console.log(request)
    const user = await this.userService.update(id, updateUserDto,request.user);
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
