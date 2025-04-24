import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { configureCloudinary } from './cloudinary.config';
import { SchoolModule } from './school/school.module';
import { ClassModule } from './class/class.module';
import { ModuleModule } from './module/module.module';
import { JoinSchoolRequestModule } from './join-school-request/join-school-request.module';
import { SchoolStaffModule } from './school-staff/school-staff.module';

configureCloudinary();
@Module({
  imports: [UserModule, DbModule, AuthModule, UploadModule, SchoolModule, ClassModule, ModuleModule, JoinSchoolRequestModule, SchoolStaffModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
