import { AuthUserDto, RegisterUserDto } from './../user/dto/user.dto';
import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto, LoginUserSchema, RegisterUserSchema } from 'src/user/dto/user.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { PassportJswAuthGuard } from 'src/common/guards/passport-jwt.guard';
import { Public } from './decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';

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
  getUserInfo(@Request() request: { user: AuthUserDto }) {
    return request.user
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() { }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback() { }

  // @Public()
  // @UseGuards(GoogleAuthGuard)
  // @Get('google/callback')
  // googleCallback(@Req() req, @Res() res) {
  //   // You can customize the logic here as needed
  //   // Example: redirect with token
  //   this.authService.login(req.user.id).then((response) => {
  //     res.redirect(`http://localhost:5173?token=${response.accessToken}`);
  //   });
  // }
}

// async googleCallback(
//   @Req() req, @Res() res) {
//   const response = await this.authService.login(req.user.id);
//   res.redirect(`http://localhost:5173?token=${response.accessToken}`);
// }
