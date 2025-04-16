import z from "zod"

export const SchoolType = z.enum(["PUBLIC", "PRIVATE", "INTERNATIONAL"])
export type schoolTypeDto = z.infer<typeof SchoolType>
export const SchoolMembers = z.enum(["BOYS", "GIRLS", "MIXED"])
export type SchoolMembersDto = z.infer<typeof SchoolMembers>

export const createSchoolSchema = z.object({
    name: z.string().min(1, {
        message: "School name is required"
    }).max(50, {
        message: "Maximum characters are 50"
    }),
    description: z.string().max(500, {
        message: "Maximum characters are 500"
    }),
    schoolType: SchoolType,
    logo: z.string(),
    creatorId : z.string().min(1, {
        message : "Creator id is required"
    }),
    curriculum: z.array(z.string()),
    educationLevel: z.array(z.string()),
    affiliation: z.string(),
    schoolMembers: SchoolMembers.optional(),
    accreditationNumber: z.string().max(35, {
        message: "Maximum characters are 35"
    }),
})

export type CreateSchoolDto = z.infer<typeof createSchoolSchema>