import { z } from 'zod';

export const ClassTypeEnum = z.enum(['SchoolClass', 'Private', 'Public']);
export const CreateClassSchema = z.object({
  // code: z.string({
  //   required_error: "Code is required",
  // }).min(1, "Code cannot be empty"),
  name: z.string({
    required_error: "Name is required",
  }).min(1, "Name cannot be empty"),
  // username: z.string({
  //   required_error: "Username is required",
  // }).min(1, "Username cannot be empty"),

  schoolId: z.string().optional(),
  creatorId: z.string().optional(),
  image: z.string().optional().nullable(), // Added nullable
  classType: ClassTypeEnum.optional(),
  educationLever: z.string().optional(),
  curriculum: z.string().optional(), // curriculum is part of the Class entity
  classTeacherId: z.string().optional(),
});

export type CreateClassDto = z.infer<typeof CreateClassSchema>;
export const ClassSchema = z.object({
  id: z.string().optional(),
  schoolId: z.string().optional().nullable(), // Added nullable
  creatorId: z.string().optional().nullable(), // Added nullable
  code: z.string().optional(), // *** THIS SHOULD BE OPTIONAL ***
  name: z.string(),
  username: z.string(),
  image: z.string().optional().nullable(), // Added optional and nullable
  classType: ClassTypeEnum.default('Private').optional().nullable(), // Added optional and nullable
  educationLever: z.string().optional().nullable(), // Added optional and nullable
  curriculum: z.string().optional().nullable(), // Added optional and nullable
  classTeacherId: z.string().optional().nullable(), // Added optional and nullable
  createAt: z.preprocess((arg) => (arg instanceof Date ? arg.toISOString() : arg), z.string()).optional(), // Handle Date to string conversion
  updatedAt: z.preprocess((arg) => (arg instanceof Date ? arg.toISOString() : arg), z.string()).optional(), // Handle Date to string conversion
});

export type ClassDto = z.infer<typeof ClassSchema>;