import { z } from 'zod';

// Define the Zod enum for ClassType
export const ClassTypeEnum = z.enum(['SchoolClass', 'Private', 'Public']);
export type ClassTypeDto = z.infer<typeof ClassSchema>
export const CreateClassSchema = z.object({
  name: z.string({
    required_error: "Name is required",
  }).min(1, "Name cannot be empty"),
  schoolId: z.string().optional(),
  creatorId: z.string().optional(),
  image: z.string().optional(),
  classType: ClassTypeEnum.optional(),
  educationLever: z.string().optional(), 
  curriculum: z.string().optional(),
  classTeacherId: z.string().optional(),
});

export type CreateClassDto = z.infer<typeof CreateClassSchema>;

// Define the Zod schema for the Class model
export const ClassSchema = z.object({
  id: z.string().optional(),
  schoolId: z.string().optional(), 
  creatorId: z.string().optional(),
  code: z.string(),
  name: z.string(),
  username: z.string(),
  image: z.string().optional(),
  classType: ClassTypeEnum.default('Private').optional(),
  educationLever: z.string().optional(),
  curriculum: z.string().optional(),
  classTeacherId: z.string().optional(),
  createAt: z.string().optional(), 
  updatedAt: z.string().optional(),
});

export type ClassDto = z.infer<typeof ClassSchema>;
