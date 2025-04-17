import z, { string } from "zod";

export const UserRoleEnum = z.enum(["STUDENT", "TEACHER", "ADMIN", "SCHOOLSTAFF"], {
    required_error: "User role is required",
    invalid_type_error: "Invalid user role",
});
export type UserRoleDto = z.infer<typeof UserRoleEnum>

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

// auth
export const LoginUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, {
        message: "Password is required"
    })
})

export type LoginUserDto = z.infer<typeof LoginUserSchema>;

export const RegisterUserSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(8, {
        message: "Minimum 8 characters"
    })
})

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;

export const AuthUserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().min(1, {
        message: " Minimum 1 character"
    }),
    role: UserRoleEnum.optional(),
    accessToken: z.string().optional(),
})

export type AuthUserDto = z.infer<typeof AuthUserSchema>;

export const GenderEnum = z.enum(["FEMALE", "MALE", "OTHER"], {
    required_error: "Gender is required",
    invalid_type_error: "Invalid gender",
});

// Nested types
export const AgeSchema = z.object({
    year: z.number({
        required_error: "Year is required",
        invalid_type_error: "Year must be a number",
    }),
    month: z.number({
        required_error: "Month is required",
        invalid_type_error: "Month must be a number",
    }),
    day: z.number({
        required_error: "Day is required",
        invalid_type_error: "Day must be a number",
    }),
});

export const AddressSchema = z.object({
    country: z.string().min(1, { message: "Country is required" }),
    province: z.string().optional(),
    district: z.string().optional(),
    sector: z.string().optional(),
    cell: z.string().optional(),
    village: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    googleMapUrl: z.string().url({ message: "Invalid URL" }).optional(),
});

// Main User Schema
export const UserSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }).max(50, {
        message: "Maximum characters allowed for name is 50",
    }),
    email: z.string().email({ message: "Invalid email address" }),
    username: z.string().min(3, {
        message: "Username must be at least 3 characters",
    }),
    password: z.string().min(6, {
        message: "Password must be at least 6 characters",
    }).optional(),
    role: UserRoleEnum.optional(),
    image: z.string().url({ message: "Image must be a valid URL" }).optional(),
    phone: z.string().optional(),
    gender: GenderEnum.optional(),
    age: AgeSchema.optional(),
    address: AddressSchema.optional(),
    bio: z.string().max(500, {
        message: "Bio cannot exceed 500 characters",
    }).optional(),
    createAt: z.string(),
    updatedAt: z.string()
});

export type UserDto = z.infer<typeof UserSchema>;

export const UpdateUserSchema = z.object({
    name: z.string().min(1, { message: "Name cannot be empty" }).max(50, {
        message: "Maximum characters allowed for name is 50",
    }).optional(),

    email: z.string().email({ message: "Invalid email address" }).optional(),

    username: z.string().min(3, {
        message: "Username must be at least 3 characters",
    }).optional(),

    password: z.string().min(6, {
        message: "Password must be at least 6 characters",
    }).optional(),

    role: UserRoleEnum.optional(),

    image: z.string().optional().refine(
        (val) =>
            !val || val.startsWith('data:image/') && val.length < 2 * 1024 * 1024,
        { message: 'Invalid image format or image too large (max 2MB)' }
    ),

    phone: z.string().optional(),

    gender: GenderEnum.optional(),

    age: AgeSchema.optional(),

    address: AddressSchema.optional(),

    bio: z.string().max(500, {
        message: "Bio cannot exceed 500 characters",
    }).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;