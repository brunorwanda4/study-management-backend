import { AgeSchema, GenderEnum } from 'src/user/dto/user.dto';
import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const createTeacherSchema = z.object({
  userId: objectIdSchema,
  schoolId: objectIdSchema,
  email: z.string().email().optional().nullable(),
  name: z.string().min(1).optional().nullable(),
  phone: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  age: AgeSchema.optional().nullable(),
});

export type CreateTeacherDto = z.infer<typeof createTeacherSchema>;