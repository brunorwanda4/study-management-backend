import * as z from "zod"
import { objectIdSchema } from "./create-student.dto";
import { AgeSchema, GenderEnum } from "src/user/dto/user.dto";

export const updateStudentSchema = z.object({
    classId: objectIdSchema.optional().nullable(), // Allow setting classId to null
    email: z.string().email('Invalid email format').optional().nullable(),
    name: z.string().min(2, 'Name must be at least 2 characters long').optional().nullable(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().nullable(),
    image: z.string().url('Invalid URL format for image').optional().nullable(),
    gender:  GenderEnum.optional().nullable(),
    age: AgeSchema.optional().nullable(),
  }).partial(); 
  
  export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
  
  