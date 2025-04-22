import { z } from 'zod';

// Define the fields that can be updated
const UpdateSchoolJoinRequest = z.object({
  role: z.string().min(1, { message: 'Desired role is required' }).optional(), // Can update role
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  // We won't allow direct update of status, userId, schoolId via this DTO
  // Status changes will have dedicated endpoints (accept/reject)
}).partial(); // Make all fields optional for partial updates

export const UpdateSchoolJoinRequestSchema = UpdateSchoolJoinRequest; // Export schema for pipe
export type UpdateSchoolJoinRequestDto = z.infer<typeof UpdateSchoolJoinRequest>;