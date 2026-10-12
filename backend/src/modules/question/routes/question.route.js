import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";

import {
    validateCreateQuestion,
    validateUpdateQuestion,
    validateQuestionId,
    validateQuestionBankId
} from "../validations/question.validation.middleware.js";

import {
    createQuestion,
    getQuestionsByQuestionBank,
    getQuestionById,
    updateQuestion,
    archiveQuestion,
    restoreQuestion
} from "../controllers/question.controller.js";

import { importQuestionsPreview } from "../controllers/question-import.controller.js";
import questionImportUpload from "../middleware/questionImportUpload.middleware.js";

const questionRouter = Router();

questionRouter.use(authMiddleware);
questionRouter.use(roleMiddleware("INSTRUCTOR"));


questionRouter.post(
    "/question-banks/:questionBankId/questions",
    validateQuestionBankId,
    validateCreateQuestion,
    createQuestion
);

questionRouter.get(
    "/question-banks/:questionBankId/questions",
    validateQuestionBankId,
    getQuestionsByQuestionBank
);

/**
 * POST /api/v1/question-banks/:questionBankId/import
 *
 * Stage 2 + Stage 3: Upload → Parse → Validate → Detect duplicates → Store preview.
 * Does NOT persist any Question documents; that is Stage 4 (confirmation).
 */
questionRouter.post(
    "/question-banks/:questionBankId/import",
    validateQuestionBankId,
    questionImportUpload,
    importQuestionsPreview
);


questionRouter.get(
    "/questions/:questionId",
    validateQuestionId,
    getQuestionById
);

questionRouter.patch(
    "/questions/:questionId",
    validateQuestionId,
    validateUpdateQuestion,
    updateQuestion
);

questionRouter.post(
    "/questions/:questionId/archive",
    validateQuestionId,
    archiveQuestion
);

questionRouter.post(
    "/questions/:questionId/restore",
    validateQuestionId,
    restoreQuestion
);

export { questionRouter };