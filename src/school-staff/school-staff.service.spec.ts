import { Test, TestingModule } from '@nestjs/testing';
import { SchoolStaffService } from './school-staff.service';

describe('SchoolStaffService', () => {
  let service: SchoolStaffService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchoolStaffService],
    }).compile();

    service = module.get<SchoolStaffService>(SchoolStaffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
