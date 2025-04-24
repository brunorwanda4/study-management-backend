import * as z from "zod"
export const findByUserIdAndSchoolIdSchema = z.object({
    userId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid userId format (must be a 24-character hex string)',
    }),
    schoolId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid schoolId format (must be a 24-character hex string)',
    }),
});

// Infer the type for the query parameters
export type FindByUserIdAndSchoolIdQuery = z.infer<typeof findByUserIdAndSchoolIdSchema>;
