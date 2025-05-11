import z from "zod";
import { ModuleType } from "./module.dto";

export const CreateModuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  classId: z.string().optional().nullable(), // Assuming IDs are strings (MongoDB ObjectId)
  code: z.string().min(1, "Code is required"), // Unique code for the module
  subjectType: z.nativeEnum(ModuleType).optional().nullable(),
  curriculum: z.string().optional().nullable(),
  copyright: z.string().optional().nullable(),
  learningHours: z.number().int().positive().optional().nullable(),
  teacherId: z.string().optional().nullable(),
});
export type CreateModuleDto = z.infer<typeof CreateModuleSchema>;
