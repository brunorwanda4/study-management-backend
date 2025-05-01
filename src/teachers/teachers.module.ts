import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  controllers: [TeachersController],
  providers: [TeachersService],
   imports: [DbModule]
})
export class TeachersModule {}
