import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { DbModule } from 'src/db/db.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  controllers: [ClassController],
  providers: [ClassService],
  imports: [DbModule,UploadModule],
})
export class ClassModule { }
