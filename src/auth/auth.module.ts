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
  ],
  controllers: [AuthController],
  providers: [AuthService,SchoolStaffService, LocalStrategy, JwtStrategy],
  exports: [AuthService]
})
export class AuthModule { }
