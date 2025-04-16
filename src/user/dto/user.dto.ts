import z, { string } from "zod";

export type UserRoleDto = "STUDENT" | "TEACHER" | "ADMIN" | "SCHOOLSTAFF"

export const CreateUserSchema = z.object({
    name: z.string().min(1, {
        message: "Name is required"
    }).max(50, {
        message: "Maximum characters are 50"
    }),
    email: z.string().email(),
    password: z.string().optional()
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
    name: z.string().min(1, {
        message: "Name is required"
    }).max(50, {
        message: "Maximum characters are 50"
    }).optional(),
    email: z.string().email().optional(),
    password: z.string().optional().optional(),
    username: string().min(1, {
        message: "Username is required"
    }).max(50, {
        message: "Maximum characters are 50"
    }).optional(),
    role: z.enum(["STUDENT", "TEACHER", "ADMIN", "SCHOOLSTAFF"]).optional()
})

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>

// auth
export const LoginUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, {
        message: "Password is required"
    })
})

export type LoginUserDto = z.infer<typeof LoginUserSchema>;

export const RegisterUserSchema = z.object({
    name : z.string(),
    email: z.string().email(),
    password: z.string().min(1, {
        message: "Password is required"
    })
})

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;

export const AuthUserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().min(1, {
        message: " Minimum 1 character"
    }),
    role: z.enum(["STUDENT", "TEACHER", "ADMIN", "SCHOOLSTAFF"]).optional(),
    accessToken: z.string().optional(),
})

export type AuthUserDto = z.infer<typeof AuthUserSchema>;