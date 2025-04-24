import { z } from 'zod';

// Define the Zod schema for creating a SchoolStaff
export const createSchoolStaffSchema = z.object({
    userId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid userId format (must be a 24-character hex string)',
    }), // Assuming ObjectId format
    schoolId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid schoolId format (must be a 24-character hex string)',
    }), // Assuming ObjectId format
    role: z.string().min(1, 'Role cannot be empty'),
    email: z.string().email('Invalid email format').optional().nullable(),
    name: z.string().min(1, 'Name cannot be empty').optional().nullable(),
    phone: z.string().optional().nullable(), // Add more specific phone validation if needed
    image: z.string().url('Invalid image URL format').optional().nullable(),
});

export type CreateSchoolStaffDto = z.infer<typeof createSchoolStaffSchema>;