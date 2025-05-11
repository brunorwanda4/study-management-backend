import z from "zod"
import { ModuleType } from "./module.dto";

export const UpdateModuleSchema = z.object({
    name: z.string().min(1).optional(),
    classId: z.string().optional().nullable(),
    subjectType: z.nativeEnum(ModuleType).optional().nullable(),
    curriculum: z.string().optional().nullable(),
    copyright: z.string().optional().nullable(),
    learningHours: z.number().int().positive().optional().nullable(),
    teacherId: z.string().optional().nullable(),
});
export type UpdateModuleDto = z.infer<typeof UpdateModuleSchema>;
