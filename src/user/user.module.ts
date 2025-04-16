import { Module, forwardRef } from '@nestjs/common'; // ✅ add forwardRef
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DbModule } from 'src/db/db.module';
import { UploadModule } from 'src/upload/upload.module';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    DbModule,
    UploadModule,
    forwardRef(() => AuthModule) // ✅ circular fix
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  exports: [UserService]
})
export class UserModule { }
