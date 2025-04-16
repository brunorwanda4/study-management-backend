import { Module } from '@nestjs/common';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  controllers: [SchoolController],
  providers: [SchoolService],
  imports: [DbModule]
})
export class SchoolModule {}
