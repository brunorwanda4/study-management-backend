import { Module } from '@nestjs/common';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';
import { DbModule } from 'src/db/db.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  controllers: [SchoolController],
  providers: [SchoolService],
  imports: [DbModule, UploadModule]
})
export class SchoolModule { }
