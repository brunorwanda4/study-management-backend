import * as z from "zod";

export const SchoolAdministrationSchema = z.object({
    schoolId : z.string().min(1),
    headmasterName: z
        .string()
        .min(2, { message: "Headmaster name is required." }),
    headmasterEmail: z.string().email({ message: "Invalid email address." }),
    headmasterPhone: z
        .string()
        .min(10, {
            message: "Minimum character are 10", // Corrected typo
        })
        .regex(/^\d+$/, "Phone number must contain only numbers"),

    DirectorOfStudies: z
        .string()
        .min(2, { message: "Director of Studies name is required." }),
    principalEmail: z.string().email({ message: "Invalid email address." }),
    principalPhone: z
        .string()
        .min(10, {
            message: "Minimum character are 10", // Corrected typo
        })
        .regex(/^\d+$/, "Phone number must contain only numbers"),

    numberOfTeachers: z.coerce
        .number()
        .int()
        .min(0, { message: "Number of teachers cannot be negative." }),

    additionalAdministration: z
        .array(
            z.object({
                role: z.string().min(1, { message: "Please select a role." }),
                name: z.string().min(2, { message: "Name is required." }),
                email: z.string().email({ message: "Invalid email address." }),
                phone: z
                    .string()
                    .min(10, {
                        message: "Minimum character are 10", // Corrected typo
                    })
                    .regex(/^\d+$/, "Phone number must contain only numbers"),
            })
        )
        .default([])
        .optional(),
});

// Define the DTO type based on the schema
export type SchoolAdministrationDto = z.infer<typeof SchoolAdministrationSchema>;