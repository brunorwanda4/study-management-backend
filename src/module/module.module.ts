import { Module } from '@nestjs/common';
import { ModuleService } from './module.service';
import { ModuleController } from './module.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  controllers: [ModuleController],
  providers: [ModuleService],
  imports: [DbModule]
})
export class ModuleModule {}
