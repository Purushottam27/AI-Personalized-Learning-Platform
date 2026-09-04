import { getUsersQuerySchema, getUserByIdParamSchema, updateUserStatusSchema, updateCurrentUserSchema } from '../validations/user.validation.js';
import { ApiError } from '../../../shared/errors/ApiError.js';

const validateUsersQuerySchema = (req,res,next)=>{
    const result = getUsersQuerySchema.safeParse(req?.query)

    if(!result.success){
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid query parameters',
            result.error.format()
        );
    }

    req.validatedQuery = result.data
    next()
}

const validateUserIdParam = (req, res, next) => {
    const result = getUserByIdParamSchema.safeParse(req?.params);

    if (!result.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid path parameters',
            result.error.format()
        );
    }

    req.params = result.data;
    next();
};

const validateUserStatusRequest = (req, res, next) => {
    // validate userId param
    const paramResult = getUserByIdParamSchema.safeParse(req?.params);

    if (!paramResult.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid path parameters',
            paramResult.error.format()
        );
    }

    // validate request body
    const bodyResult = updateUserStatusSchema.safeParse(req?.body);

    if (!bodyResult.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid request body',
            bodyResult.error.format()
        );
    }

    req.params = paramResult.data;
    req.body = bodyResult.data;
    next();
};

const validateUpdateCurrentUser = (req, res, next) => {
    const result = updateCurrentUserSchema.safeParse(req?.body);

    if (!result.success) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid request body',
            result.error.format()
        );
    }

    req.body = result.data;
    next();
};

export {
    validateUsersQuerySchema,
    validateUserIdParam,
    validateUserStatusRequest,
    validateUpdateCurrentUser
}