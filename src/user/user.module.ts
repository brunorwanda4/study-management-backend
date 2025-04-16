import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DbModule } from 'src/db/db.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [DbModule,UploadModule],
  exports: [UserService]
})
export class UserModule { }
