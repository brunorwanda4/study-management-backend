import { AuthUserDto, RegisterUserDto } from './../user/dto/user.dto';
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto, LoginUserSchema, RegisterUserSchema } from 'src/user/dto/user.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { PassportJswAuthGuard } from 'src/common/guards/passport-jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body(new ZodValidationPipe(LoginUserSchema)) loginUserDto: LoginUserDto) {
    return this.authService.authenticate(loginUserDto);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body(new ZodValidationPipe(RegisterUserSchema)) registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto)
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  @UseGuards(PassportJswAuthGuard)
  getUserInfo(@Request() request: {user : AuthUserDto}) {
    return request.user
  }
}
