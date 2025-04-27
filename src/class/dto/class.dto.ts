import { z } from 'zod';
import { ClassType } from './create-class.dto';

export const ClassSchema = z.object({
  id: z.string(), // MongoDB ObjectId as a string
  schoolId: z.string().optional().nullable(), // Optional ObjectId string
  creatorId: z.string().optional().nullable(), // Optional ObjectId string
  code: z.string(), // Required unique string
  name: z.string(), // Required string
  username: z.string(), // Required unique string
  image: z.string().optional().nullable(), // Optional string
  classType: z.nativeEnum(ClassType).optional().nullable(), // Optional ClassType enum with potential null
  educationLever: z.string().optional().nullable(), // Optional string
  curriculum: z.string().optional().nullable(), // Optional string
  classTeacherId: z.string().optional().nullable(), // Optional ObjectId string

  createAt: z.date(), // DateTime represented as a Date object
  updatedAt: z.date(), // DateTime represented as a Date object

});

export type ClassDto = z.infer<typeof ClassSchema>;