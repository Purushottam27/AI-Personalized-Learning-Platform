import { ApiError } from "../../../shared/errors/ApiError.js";
import {
    createLessonSchema,
    lessonIdSchema,
    reorderLessonsSchema,
    topicIdSchema,
    updateLessonSchema
} from "./lesson.validation.js";


const validateLesson = (req, res, next) => {
    const result = createLessonSchema.safeParse(req.body);

    if (!result.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid request body",
            result.error.format()
        );
    }

    req.body = result.data;
    next();
};


const validateLessonUpdates = (req, res, next) => {
    const paramResult = lessonIdSchema.safeParse(req.params);

    if (!paramResult.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid path parameters",
            paramResult.error.format()
        );
    }

    const bodyResult = updateLessonSchema.safeParse(req.body);

    if (!bodyResult.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid request body",
            bodyResult.error.format()
        );
    }

    req.params = paramResult.data;
    req.body = bodyResult.data;

    next();
};


const validateLessonId = (req, res, next) => {
    const result = lessonIdSchema.safeParse(req.params);

    if (!result.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid path parameters",
            result.error.format()
        );
    }

    req.params = result.data;
    next();
};


const validateLessonReorder = (req, res, next) => {
    const paramResult = topicIdSchema.safeParse(req.params);

    if (!paramResult.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid path parameters",
            paramResult.error.format()
        );
    }

    const bodyResult = reorderLessonsSchema.safeParse(req.body);

    if (!bodyResult.success) {
        throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid request body",
            bodyResult.error.format()
        );
    }

    req.params = paramResult.data;
    req.body = bodyResult.data;

    next();
};


export {
    validateLesson,
    validateLessonId,
    validateLessonUpdates,
    validateLessonReorder
};