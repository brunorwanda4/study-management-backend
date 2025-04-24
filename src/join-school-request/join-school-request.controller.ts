import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UsePipes, UseGuards, Request } from '@nestjs/common';
import { UpdateSchoolJoinRequestDto, UpdateSchoolJoinRequestSchema } from './dto/update-school-join-request.dto';
import { GetRequestsFilterDto, GetRequestsFilterSchema } from './dto/filter-school-join-request.dto';
import { SchoolJoinRequestService } from './join-school-request.service';
import { CreateJoinSchoolRequest, CreateJoinSchoolRequestDto } from './dto/join-school-request.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { PassportJswAuthGuard } from 'src/common/guards/passport-jwt.guard';
import { AuthUserDto } from 'src/user/dto/user.dto';
import { JoinSchoolDto, JoinSchoolSchema } from '../school/dto/join-school-schema';

@Controller('school-join-requests')
export class SchoolJoinRequestController {
  constructor(private readonly schoolJoinRequestService: SchoolJoinRequestService) { }

  // CREATE (assuming you have this)
  @Post()
  @UsePipes(new ZodValidationPipe(CreateJoinSchoolRequest))
  create(@Body() createSchoolJoinRequestDto: CreateJoinSchoolRequestDto) {
    return this.schoolJoinRequestService.create(createSchoolJoinRequestDto);
  }

  // READ - Get all requests (with optional filtering via query params)
  // GET /school-join-requests?schoolId=...&status=...
  @Get()
  @UsePipes(new ZodValidationPipe(GetRequestsFilterSchema))
  findAll(@Query() filterDto: GetRequestsFilterDto) {
    return this.schoolJoinRequestService.findAll(filterDto);
  }


  @Post('/join')
  @UseGuards(PassportJswAuthGuard)
  async join(
    @Request() request: { user: AuthUserDto },
    @Body(new ZodValidationPipe(JoinSchoolSchema)) joinSchoolDto: JoinSchoolDto,
  ) {
    return await this.schoolJoinRequestService.joinSchoolByCodeAndUsername(request.user, joinSchoolDto);
  }

  // READ - Get a single request by ID
  // GET /school-join-requests/:id
  @Get(':id')
  // Use ParseUUIDPipe if IDs are UUIDs, otherwise remove or use a custom validation pipe
  findOne(@Param('id') id: string) {
    return this.schoolJoinRequestService.findOne(id);
  }

  // READ - Get requests by School ID (Alternative specific endpoint)
  // GET /school-join-requests/by-school/:schoolId
  // You could also use the general filter endpoint: GET /school-join-requests?schoolId=...
  // Choose one approach. Using the filter endpoint is often more flexible.

  @Get('by-school/:schoolId')
  findBySchoolId(@Param('schoolId') schoolId: string) {
    return this.schoolJoinRequestService.findBySchoolId(schoolId);
  }


  // READ - Get requests by User ID (Alternative specific endpoint)
  // GET /school-join-requests/by-user/:userId
  /*
 @Get('by-user/:userId')
 findByUserId(@Param('userId') userId: string) {
     return this.schoolJoinRequestService.findByUserId(userId);
 }
 */

  // READ - Get requests by Email (Alternative specific endpoint)
  // GET /school-join-requests/by-email/:email - Note: Email in URL can be tricky, query param is safer.
  // Recommend using the filter endpoint: GET /school-join-requests?email=...
  @Get('by-email/:email')
  findByEmail(@Param('email') email: string) {
    return this.schoolJoinRequestService.findByEmail(email);
  }

  // UPDATE - Update request fields
  // PATCH /school-join-requests/:id
  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdateSchoolJoinRequestSchema))
  update(@Param('id') id: string, @Body() updateSchoolJoinRequestDto: UpdateSchoolJoinRequestDto) {
    return this.schoolJoinRequestService.update(id, updateSchoolJoinRequestDto);
  }

  // UPDATE - Accept a request
  // PATCH /school-join-requests/:id/accept
  @Patch(':id/accept')
  @UseGuards(PassportJswAuthGuard)
  acceptRequest(
    @Request() request: { user: AuthUserDto },
    @Param('id') id: string
  ) {
    return this.schoolJoinRequestService.acceptRequest(id, request.user);
  }

  // UPDATE - Reject a request
  // PATCH /school-join-requests/:id/reject
  @Patch(':id/reject')
  // Use ParseUUIDPipe or similar if needed
  rejectRequest(@Param('id') id: string) {
    return this.schoolJoinRequestService.rejectRequest(id);
  }

  // DELETE - Remove a request
  // DELETE /school-join-requests/:id
  @Delete(':id')
  // Use ParseUUIDPipe or similar if needed
  remove(@Param('id') id: string) {
    return this.schoolJoinRequestService.remove(id);
  }
}