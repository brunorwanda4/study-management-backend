import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';

@Module({
  providers: [UploadService],
  exports: [UploadService], // 👈 export this to use it elsewhere
})
export class UploadModule {}
