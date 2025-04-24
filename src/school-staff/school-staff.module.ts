import { Module } from '@nestjs/common';
import { SchoolStaffService } from './school-staff.service';
import { SchoolStaffController } from './school-staff.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  controllers: [SchoolStaffController],
  providers: [SchoolStaffService],
  imports: [DbModule]
})
export class SchoolStaffModule { }
