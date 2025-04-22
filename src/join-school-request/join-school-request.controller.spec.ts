import { Test, TestingModule } from '@nestjs/testing';
import { JoinSchoolRequestController } from './join-school-request.controller';
import { JoinSchoolRequestService } from './join-school-request.service';

describe('JoinSchoolRequestController', () => {
  let controller: JoinSchoolRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JoinSchoolRequestController],
      providers: [JoinSchoolRequestService],
    }).compile();

    controller = module.get<JoinSchoolRequestController>(JoinSchoolRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
