import { z } from 'zod';

const EXPERIENCE_LEVELS = [
    'I have no prior knowledge',
    'I have a basic understanding',
    'I am comfortable with the fundamentals',
    'I have substantial experience',
    "I'm not sure"
]

const DAILY_STUDY_TIMES = [
    "Less than 1 hour",
    "1-2 hours",
    "2-3 hours",
    "3-4 hours",
    "5 or more hours"
]

const PREFERRED_LEARNING_FORMATS = [
    "Reading",
    "Videos",
    "Interactive Learning",
    "Practice Exercises",
    "Projects"
]

const updateLearnerProfileSchema = z.object({
    interests: z.array(z.string().trim().min(1, 'Interest cannot be empty')).optional(),
    goals: z.array(z.string().trim().min(1, 'Goal cannot be empty')).optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).nullable().optional(),
    studyPreferences: z.object({
        dailyStudyTime: z.enum(DAILY_STUDY_TIMES).nullable().optional(),
        preferredLearningFormat: z.array(z.enum(PREFERRED_LEARNING_FORMATS)).optional()
    }).optional()
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
);

const learnerOnboardingSchema = z.object({
    interests: z.array(z.string().trim().min(1, 'Interest cannot be empty')).nonempty('Interests cannot be empty').optional(),
    goals: z.array(z.string().trim().min(1, 'Goal cannot be empty')).nonempty('Goals cannot be empty').optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    studyPreferences: z.object({
        dailyStudyTime: z.enum(DAILY_STUDY_TIMES).optional(),
        preferredLearningFormat: z.array(z.enum(PREFERRED_LEARNING_FORMATS)).nonempty('Preferred learning format cannot be empty').optional()
    }).strict().optional()
}).strict().refine(
    (data) => {
        const keys = Object.keys(data);
        if (keys.length !== 1) return false;
        if (keys[0] === 'studyPreferences') {
            return Object.keys(data.studyPreferences).length === 1;
        }
        return true;
    },
    { message: 'Exactly one onboarding question field must be provided per request' }
);

export {
    updateLearnerProfileSchema,
    learnerOnboardingSchema
};