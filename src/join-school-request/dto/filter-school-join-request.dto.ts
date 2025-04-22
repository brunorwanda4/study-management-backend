import { z } from 'zod';

// Define potential filter criteria
const GetRequestsFilter = z.object({
  schoolId: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(), // e.g., "pending", "accepted", "rejected"
  // Add other potential filters like role if needed
});

export const GetRequestsFilterSchema = GetRequestsFilter; // Export schema for pipe
export type GetRequestsFilterDto = z.infer<typeof GetRequestsFilter>;