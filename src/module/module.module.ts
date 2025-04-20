import { Module } from '@nestjs/common';
import { ModuleService } from './module.service';
import { ModuleController } from './module.controller';

@Module({
  controllers: [ModuleController],
  providers: [ModuleService],
})
export class ModuleModule {}
