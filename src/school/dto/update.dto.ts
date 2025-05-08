import { z } from 'zod';
import { SchoolSchema } from './school.dto';

export const UpdateSchoolSchema = SchoolSchema.partial().omit({
    id: true, // ID is used to find the record, not update it
    creatorId: true, // Creator should generally not change
});

export type UpdateSchoolDto = z.infer<typeof UpdateSchoolSchema>;

