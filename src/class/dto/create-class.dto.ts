import { z } from 'zod';

// Assuming ClassType enum is defined elsewhere or define it here for Zod
// import { ClassType } from './your-enum-file';

// If you need to define it for Zod directly:
export const ClassType = {
    Private: 'Private',
    Public: 'Public',
    SchoolClass: 'SchoolClass',
    // add other types if they exist
  } as const; // Use as const for Zod nativeEnum
export const CreateClassSchema = z.object({
  schoolId: z.string({
    invalid_type_error: "School ID must be a string.",
  }).optional().nullable(), // Optional ObjectId string

  creatorId: z.string({
    invalid_type_error: "Creator ID must be a string.",
  }).optional().nullable(), // Optional ObjectId string

  name: z.string({
    required_error: "Class name is required.",
    invalid_type_error: "Class name must be a string.",
  }).min(1, { message: "Class name cannot be empty." }), // Required string

  username: z.string({
    required_error: "Class username is required.",
    invalid_type_error: "Class username must be a string.",
  }).min(1, { message: "Class username cannot be empty." }), // Required unique string

  image: z.string({
    invalid_type_error: "Image URL must be a string.",
  }).optional().nullable(), // Optional string

  classType: z.nativeEnum(ClassType, {
    invalid_type_error: `Invalid Class Type. Must be one of ${Object.keys(ClassType).join(', ')}.`,
  }).optional().nullable(), // Optional ClassType enum with potential null

  educationLever: z.string({
    invalid_type_error: "Education level must be a string.",
  }).optional().nullable(), // Optional string

  curriculum: z.string({
    invalid_type_error: "Curriculum must be a string.",
  }).optional().nullable(), // Optional string

  classTeacherId: z.string({
    invalid_type_error: "Class Teacher ID must be a string.",
  }).optional().nullable(), // Optional ObjectId string
});

export type CreateClassInput = z.infer<typeof CreateClassSchema>;