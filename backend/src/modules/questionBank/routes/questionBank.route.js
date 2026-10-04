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

questionBankRouter.use(authMiddleware);
questionBankRouter.use(roleMiddleware("INSTRUCTOR"));

questionBankRouter.post(
    "/topics/:topicId/question-bank",
    validateTopicId,
    validateCreateQuestionBank,
    createQuestionBank
);

questionBankRouter.get(
    "/topics/:topicId/question-bank",
    validateTopicId,
    getQuestionBankByTopic
);

questionBankRouter.get(
    "/question-banks/:questionBankId",
    validateQuestionBankId,
    getQuestionBankById
);

questionBankRouter.patch(
    "/question-banks/:questionBankId",
    validateQuestionBankId,
    validateUpdateQuestionBank,
    updateQuestionBank
);

questionBankRouter.post(
    "/question-banks/:questionBankId/archive",
    validateQuestionBankId,
    archiveQuestionBank
);

questionBankRouter.post(
    "/question-banks/:questionBankId/restore",
    validateQuestionBankId,
    restoreQuestionBank
);

export { questionBankRouter };