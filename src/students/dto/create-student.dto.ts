import { AgeSchema, GenderEnum } from 'src/user/dto/user.dto';
import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const createStudentSchema = z.object({
  userId: objectIdSchema.min(1, 'User ID is required'),
  classId: objectIdSchema.optional(), 
  schoolId: objectIdSchema.min(1, 'School ID is required'), 
  email: z.string().email('Invalid email format').optional().nullable(),
  name: z.string().min(2, 'Name must be at least 2 characters long').optional().nullable(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().nullable(), // E.164 format validation
  image: z.string().url('Invalid URL format for image').optional().nullable(),
  gender: GenderEnum.optional(),
  age: AgeSchema.optional(),
});

// Type inferred from the schema
export type CreateStudentDto = z.infer<typeof createStudentSchema>;
