import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { configureCloudinary } from './cloudinary.config';

configureCloudinary();
@Module({
  imports: [UserModule, DbModule, AuthModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
