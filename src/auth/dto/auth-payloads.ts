import * as z from "zod"

export const SchoolAuthPayloadSchema = z.object({
    sub: z.string().min(1), // Subject: the user ID
    schoolId: z.string().min(1),
    schoolName : z.string().optional().nullable(),
    schoolUsername : z.string().optional().nullable(),
    schoolDescription: z.string().optional().nullable(),
    schoolEmail : z.string().optional().nullable(),
    schoolLogo: z.string().optional().nullable(),
    name: z.string().min(1),
    email: z.string().min(1),
    classId: z.string().optional(),
    role : z.string(),
})

export type SchoolAuthPayloadDto = z.infer<typeof SchoolAuthPayloadSchema>