import { z } from 'zod';

const updateInstructorProfileSchema = z.object({
    professionalTitle: z.string().trim().min(1, 'Professional title cannot be empty').nullable().optional(),
    expertiseAreas: z.array(z.string().trim().min(1, 'Expertise area cannot be empty')).optional(),
    bio: z.string().trim().min(1, 'Bio cannot be empty').nullable().optional(),
    experienceYears: z.coerce.number().min(0, 'Experience years cannot be negative').nullable().optional(),
    organization: z.string().trim().min(1, 'Organization cannot be empty').nullable().optional(),
    socialLinks: z.record(z.string().trim(), z.string().trim().url('Must be a valid URL')).optional()
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
);

const instructorOnboardingSchema = z.object({
    professionalTitle: z.string().trim().min(1, 'Professional title cannot be empty').optional(),
    expertiseAreas: z.array(z.string().trim().min(1, 'Expertise area cannot be empty')).nonempty('Expertise areas cannot be empty').optional()
}).strict().refine(
    (data) => {
        const keys = Object.keys(data);
        return keys.length === 1;
    },
    { message: 'Exactly one onboarding question field must be provided per request' }
);

export {
    updateInstructorProfileSchema,
    instructorOnboardingSchema
};