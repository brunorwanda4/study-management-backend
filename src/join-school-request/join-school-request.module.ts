import { Module } from '@nestjs/common';
import { SchoolJoinRequestService } from './join-school-request.service';
import { SchoolJoinRequestController } from './join-school-request.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  controllers: [SchoolJoinRequestController],
  providers: [SchoolJoinRequestService],
  imports : [DbModule]
})
export class JoinSchoolRequestModule {}
