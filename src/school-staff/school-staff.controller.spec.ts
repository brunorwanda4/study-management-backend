import { Test, TestingModule } from '@nestjs/testing';
import { SchoolStaffController } from './school-staff.controller';
import { SchoolStaffService } from './school-staff.service';

describe('SchoolStaffController', () => {
  let controller: SchoolStaffController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolStaffController],
      providers: [SchoolStaffService],
    }).compile();

    controller = module.get<SchoolStaffController>(SchoolStaffController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
