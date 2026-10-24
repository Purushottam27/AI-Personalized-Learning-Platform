import { Router } from "express";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { roleMiddleware } from "../../../middleware/role.middleware.js";

import {
    validateCreateQuestionBank,
    validateUpdateQuestionBank,
    validateQuestionBankId,
    validateTopicId
} from "../validations/questionBank.validation.middleware.js";

import {
    createQuestionBank,
    getQuestionBankByTopic,
    getQuestionBankById,
    updateQuestionBank,
    archiveQuestionBank,
    restoreQuestionBank
} from "../controllers/questionBank.controller.js";

const questionBankRouter = Router();

questionBankRouter.post(
    "/topics/:topicId/question-bank",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateTopicId,
    validateCreateQuestionBank,
    createQuestionBank
);

questionBankRouter.get(
    "/topics/:topicId/question-bank",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateTopicId,
    getQuestionBankByTopic
);

questionBankRouter.get(
    "/question-banks/:questionBankId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionBankId,
    getQuestionBankById
);

questionBankRouter.patch(
    "/question-banks/:questionBankId",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionBankId,
    validateUpdateQuestionBank,
    updateQuestionBank
);

questionBankRouter.post(
    "/question-banks/:questionBankId/archive",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionBankId,
    archiveQuestionBank
);

questionBankRouter.post(
    "/question-banks/:questionBankId/restore",
    authMiddleware,
    roleMiddleware("INSTRUCTOR"),
    validateQuestionBankId,
    restoreQuestionBank
);

export { questionBankRouter };