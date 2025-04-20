import { Injectable } from '@nestjs/common';

@Injectable()
export class ModuleService {
  create(createModuleDto: any) {
    return 'This action adds a new module';
  }

  findAll() {
    return `This action returns all module`;
  }

  findOne(id: number) {
    return `This action returns a #${id} module`;
  }

  update(id: number, updateModuleDto: any) {
    return `This action updates a #${id} module`;
  }

  remove(id: number) {
    return `This action removes a #${id} module`;
  }
}
