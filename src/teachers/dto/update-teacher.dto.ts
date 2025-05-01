import { AgeSchema, GenderEnum } from 'src/user/dto/user.dto';
import { z } from 'zod';

export const updateTeacherSchema = z.object({
  email: z.string().email().optional().nullable(),
  name: z.string().min(1).optional().nullable(),
  phone: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  age: AgeSchema.optional().nullable(),
  // You might add fields here if you want to allow connecting/disconnecting Classes/Modules
  // e.g., classIdsToConnect: z.array(objectIdSchema).optional(),
  //       classIdsToDisconnect: z.array(objectIdSchema).optional(),
}).partial(); // .partial() makes all fields optional

export type UpdateTeacherDto = z.infer<typeof updateTeacherSchema>;

export const validatedUpdateTeacherSchema = updateTeacherSchema.refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update.' }
);