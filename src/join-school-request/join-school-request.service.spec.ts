import { Test, TestingModule } from '@nestjs/testing';
import { JoinSchoolRequestService } from './join-school-request.service';

describe('JoinSchoolRequestService', () => {
  let service: JoinSchoolRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JoinSchoolRequestService],
    }).compile();

    service = module.get<JoinSchoolRequestService>(JoinSchoolRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
