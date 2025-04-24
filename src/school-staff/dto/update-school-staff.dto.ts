import { z } from 'zod';
export const updateSchoolStaffSchema = z.object({
    userId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid userId format (must be a 24-character hex string)',
    }).optional(),
    schoolId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid schoolId format (must be a 24-character hex string)',
    }).optional(),
    role: z.string().min(1, 'Role cannot be empty').optional(),
    email: z.string().email('Invalid email format').optional().nullable(),
    name: z.string().min(1, 'Name cannot be empty').optional().nullable(),
    phone: z.string().optional().nullable(),
    image: z.string().url('Invalid image URL format').optional().nullable(),
});

export type UpdateSchoolStaffDto = z.infer<typeof updateSchoolStaffSchema>;