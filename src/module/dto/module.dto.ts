import { z } from 'zod';

export enum ModuleType {
    General = 'General',
    Optional = 'Optional',
}


// Assuming a Module schema for completeness, though not strictly needed for the fix
export const ModuleSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    classId: z.string().optional().nullable(),
    code: z.string(), // Assuming code is required for Module in DB
    subjectType: z.nativeEnum(ModuleType).optional().nullable(),
    curriculum: z.string().optional().nullable(),
    copyright: z.string().optional().nullable(),
    learningHours: z.number().int().optional().nullable(),
    createAt: z.preprocess((arg) => (arg instanceof Date ? arg.toISOString() : arg), z.string()).optional(),
    updatedAt: z.preprocess((arg) => (arg instanceof Date ? arg.toISOString() : arg), z.string()).optional(),
});

export type ModuleDto = z.infer<typeof ModuleSchema>;