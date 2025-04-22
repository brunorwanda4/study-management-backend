import { z } from 'zod';

export const CreateJoinSchoolRequest = z.object({
  schoolId: z.string().min(1, { message: 'School ID is required' }),
  role: z.string().min(1, { message: 'Desired role is required' }), // e.g., "Teacher", "Librarian", "SchoolStaff"
  name: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export type CreateJoinSchoolRequestDto = z.infer<typeof CreateJoinSchoolRequest>;

export const sendAdministrationJoinRequestsSchema = z.object({
  attempted: z.number(),
  created: z.number(),
  message: z.string().min(1)
})

export type sendAdministrationJoinRequestsDto = z.infer<typeof sendAdministrationJoinRequestsSchema>