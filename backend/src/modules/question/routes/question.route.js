import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";

import {
    validateCreateQuestion,
    validateUpdateQuestion,
    validateQuestionId,
    validateQuestionBankId,
    validateImportId
} from "../validations/question.validation.middleware.js";

import {
    createQuestion,
    getQuestionsByQuestionBank,
    getQuestionById,
    updateQuestion,
    archiveQuestion,
    restoreQuestion
} from "../controllers/question.controller.js";

import {
    importQuestionsPreview,
    confirmQuestionImport
} from "../controllers/question-import.controller.js";
import questionImportUpload from "../middleware/questionImportUpload.middleware.js";

const questionRouter = Router();

questionRouter.post(
    "/question-banks/:questionBankId/questions",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionBankId,
    validateCreateQuestion,
    createQuestion
);

questionRouter.get(
    "/question-banks/:questionBankId/questions",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
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
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionBankId,
    questionImportUpload,
    importQuestionsPreview
);

/**
 * POST /api/v1/question-imports/:importId/confirm
 *
 * Stage 4: Confirm import preview and permanently create questions.
 */
questionRouter.post(
    "/question-imports/:importId/confirm",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateImportId,
    confirmQuestionImport
);


questionRouter.get(
    "/questions/:questionId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionId,
    getQuestionById
);

questionRouter.patch(
    "/questions/:questionId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionId,
    validateUpdateQuestion,
    updateQuestion
);

questionRouter.post(
    "/questions/:questionId/archive",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionId,
    archiveQuestion
);

questionRouter.post(
    "/questions/:questionId/restore",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionId,
    restoreQuestion
);

export { questionRouter };