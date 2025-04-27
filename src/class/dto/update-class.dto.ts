import { z } from 'zod';
import { ClassType } from './create-class.dto';

// Assuming ClassType enum (or const) is defined as shown above

export const UpdateClassSchema = z.object({
  // All fields are optional for update
  schoolId: z.string({
    invalid_type_error: "School ID must be a string.",
  }).optional().nullable(), // Optional ObjectId string

  creatorId: z.string({
    invalid_type_error: "Creator ID must be a string.",
  }).optional().nullable(), // Optional ObjectId string

  code: z.string({
    invalid_type_error: "Class code must be a string.",
  }).min(1, { message: "Class code cannot be empty." }) // Add min length validation
    .optional(), // Code is optional in the update payload

  name: z.string({
    invalid_type_error: "Class name must be a string.",
  }).min(1, { message: "Class name cannot be empty." }) // Add min length validation
    .optional(), // Name is optional in the update payload

  username: z.string({
    invalid_type_error: "Class username must be a string.",
  }).min(1, { message: "Class username cannot be empty." }) // Add min length validation
    .optional(), // Username is optional in the update payload

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

export type UpdateClassInput = z.infer<typeof UpdateClassSchema>;

// You might also need a schema for the ID when processing the request
export const ClassIdSchema = z.string({
  required_error: "Class ID is required.",
  invalid_type_error: "Class ID must be a string.",
}).min(1, { message: "Class ID cannot be empty." });