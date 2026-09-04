import { z } from 'zod';

const getUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(['STUDENT', 'TEACHER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

const getUserByIdParamSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
});

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  suspensionReason: z.string().trim().min(1, 'Suspension reason cannot be empty').optional()
});

const updateCurrentUserSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty'),
})


export {
  getUserByIdParamSchema,
  getUsersQuerySchema,
  updateUserStatusSchema,
  updateCurrentUserSchema
}