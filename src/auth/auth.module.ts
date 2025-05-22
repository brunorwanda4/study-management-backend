import { Module, forwardRef } from '@nestjs/common'; // ✅ add forwardRef
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.stategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { SchoolStaffModule } from 'src/school-staff/school-staff.module';
import { SchoolStaffService } from 'src/school-staff/school-staff.service';
import { DbModule } from 'src/db/db.module';
import { SchoolService } from 'src/school/school.service';
import { SchoolModule } from 'src/school/school.module';
import { UploadService } from 'src/upload/upload.service';
import { UploadModule } from 'src/upload/upload.module';
import { ConfigModule } from '@nestjs/config';
import googleOauthConfig from './config/google-oauth.config';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    forwardRef(() => UserModule),
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.SECRET_KEY,
      signOptions: { expiresIn: '7d' }
    }),
    DbModule,
    SchoolStaffModule,
    SchoolModule,
    UploadModule,
    ConfigModule.forFeature(googleOauthConfig)
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SchoolStaffService,
    UploadService,
    SchoolService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy
  ],
  exports: [AuthService]
})
export class AuthModule { }
