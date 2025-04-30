import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  imports: [DbModule]
})
export class StudentsModule { }
