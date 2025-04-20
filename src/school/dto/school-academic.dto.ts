import { z } from 'zod';

export const SchoolAcademicSchema = z.object({
    schoolId: z.string().min(1, { message: "School is required" }),
    assessmentTypes: z.array(z.string()).optional(),
    // Primary Education
    primarySubjectsOffered: z.array(z.string()).optional(),
    primaryPassMark: z.number().optional(),

    // Ordinary Level
    oLevelCoreSubjects: z.array(z.string()).optional(),
    oLevelOptionSubjects: z.array(z.string()).optional(),
    oLevelExaminationTypes: z.array(z.string()).optional(),
    oLevelAssessment: z.array(z.string()).optional(),

    // Advanced Level
    aLevelSubjectCombination: z
        .array(z.string())
        .min(1, {
            message: "Advance level is required"
        }).max(6, {
            message: "Maximum Trading all 6"
        })
        .optional(), // Make optional as not all schools have AL
    aLevelOptionSubjects: z.array(z.string()).optional(),
    aLevelPassMark: z.number().int().optional(),

    // TVET
    tvetSpecialization: z
        .array(z.string())
        .min(1, {
            message: "TVET Trading is required,"
        }).max(6, {
            message: "Maximum Trading all 6"
        })
        .optional(), // Make optional as not all schools have TVET
    tvetOptionSubjects: z.array(z.string()).optional(),
});

export type SchoolAcademicDto = z.infer<typeof SchoolAcademicSchema>;