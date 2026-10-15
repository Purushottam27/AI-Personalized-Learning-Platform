import { Question } from "../models/question.model.js";
import { QuestionBank } from "../../questionBank/models/questionBank.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { Lesson } from "../../lesson/models/lesson.model.js";
import { normalizeQuestionText } from "../../../shared/utils/textNormalization.js";

import { Practice } from "../../practice/models/practice.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { withTransaction } from "../../../shared/utils/withTransaction.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

/*
|--------------------------------------------------------------------------
| Question Bank Context
|--------------------------------------------------------------------------
|
| Verifies:
| - Question bank exists
| - Instructor owns the question bank
| - Question bank's topic exists
| - Question bank's course exists
| - Topic belongs to the same course
| - Course belongs to the instructor
|
*/

export async function getOwnedQuestionBankContext(instructorId, questionBankId, session = null) {
    const bankQuery = QuestionBank.findById(questionBankId);
    const questionBank = await (session ? bankQuery.session(session) : bankQuery);

    if (!questionBank) {
        throw new ApiError(
            404,
            "QUESTION_BANK_NOT_FOUND",
            "Question bank not found"
        );
    }

    const topicQuery = Topic.findById(questionBank.topicId);
    const topic = await (session ? topicQuery.session(session) : topicQuery);

    if (!topic) {
        throw new ApiError(
            404,
            "QUESTION_BANK_NOT_FOUND",
            "Question bank not found"
        );
    }

    const courseQuery = Course.findById(questionBank.courseId);
    const course = await (session ? courseQuery.session(session) : courseQuery);

    if (!course) {
        throw new ApiError(
            404,
            "QUESTION_BANK_NOT_FOUND",
            "Question bank not found"
        );
    }

    
    // Verify that the Question Bank's topic actually belongs to the Question Bank's course.

    if (topic.courseId.toString() !== questionBank.courseId.toString()) {
        throw new ApiError(
            500,
            "QUESTION_BANK_DATA_INCONSISTENT",
            "Question bank data is inconsistent"
        );
    }

    // Do not reveal another instructor's question bank.
     
    if (course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(
            404,
            "QUESTION_BANK_NOT_FOUND",
            "Question bank not found"
        );
    }

    return {questionBank,topic,course};
}

// Question Context: Used when accessing an existing Question.

async function getOwnedQuestionContext(instructorId, questionId, session = null) {
    const questionQuery = Question.findById(questionId);
    const question = await (session ? questionQuery.session(session) : questionQuery);

    if (!question) {
        throw new ApiError(
            404,
            "QUESTION_NOT_FOUND",
            "Question not found"
        );
    }

    const { questionBank, topic, course } =
        await getOwnedQuestionBankContext(
            instructorId,
            question.questionBankId,
            session
        );

    // Verify that the Question's denormalized references are consistent with the Question Bank.
     
    if (
        question.topicId.toString() !== questionBank.topicId.toString() ||
        question.courseId.toString() !== questionBank.courseId.toString()
    ) {
        throw new ApiError(
            500,
            "QUESTION_DATA_INCONSISTENT",
            "Question data is inconsistent"
        );
    }

    // Verify that the question was created by the same instructor who owns the Question Bank.
     
    if (question.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(
            404,
            "QUESTION_NOT_FOUND",
            "Question not found"
        );
    }

    return { question,questionBank,topic,course };
}

/*
|--------------------------------------------------------------------------
| Lesson Validation
|--------------------------------------------------------------------------
|
| lessonId is optional.
|
| If supplied, the lesson must:
| - exist
| - belong to the same topic as the Question Bank
|
*/

async function validateLessonForTopic(lessonId, topicId, session = null) {
    if (!lessonId) {
        return null;
    }

    const lessonQuery = Lesson.findById(lessonId);
    const lesson = await (session ? lessonQuery.session(session) : lessonQuery);

    if (!lesson) {
        throw new ApiError(
            404,
            "LESSON_NOT_FOUND",
            "Lesson not found"
        );
    }

    if (lesson.topicId.toString() !== topicId.toString()) {
        throw new ApiError(
            400,
            "LESSON_TOPIC_MISMATCH",
            "Lesson does not belong to the selected topic"
        );
    }

    return lesson;
}

// Validate Question Bank State

function ensureQuestionBankActive(questionBank) {
    if (questionBank.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "QUESTION_BANK_ARCHIVED",
            "Cannot modify questions in an archived question bank"
        );
    }
}

/*
|--------------------------------------------------------------------------
| Validate Complete Question
|--------------------------------------------------------------------------
|
| The Mongoose schema already performs the final validation of:
| - type
| - options
| - correctAnswer
|
| We intentionally rely on the schema here after the complete
| question state has been assembled.
|
*/

async function validateQuestionState(questionData) {
    if (questionData.questionText) {
        questionData.normalizedQuestionText = normalizeQuestionText(questionData.questionText);
    }
    const question = new Question(questionData);

    await question.validate();

    return question;
}

// CREATE QUESTION

export async function createQuestionService(instructorId, questionBankId, questionData) {
    return withTransaction(async (session) => {
        const { questionBank, topic, course } = await getOwnedQuestionBankContext(instructorId, questionBankId, session);
        ensureQuestionBankActive(questionBank);
        if (questionData.lessonId) await validateLessonForTopic(questionData.lessonId, topic._id, session);

        const questionPayload = {
            questionBankId: questionBank._id, courseId: course._id, topicId: topic._id,
            lessonId: questionData.lessonId ?? null, createdBy: instructorId,
            questionText: questionData.questionText, type: questionData.type,
            options: questionData.options ?? [], correctAnswer: questionData.correctAnswer,
            explanation: questionData.explanation ?? "", marks: questionData.marks,
            difficulty: questionData.difficulty,
        };
        const question = await validateQuestionState(questionPayload);
        const bankFence = await QuestionBank.updateOne(
            { _id: questionBank._id, status: "ACTIVE" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (bankFence.modifiedCount !== 1) throw new ApiError(409, "QUESTION_BANK_ARCHIVED", "Question bank changed during question creation; reload and retry");
        await question.save({ session });
        return question;
    });
}

// GET QUESTIONS BY QUESTION BANK

export async function getQuestionsByQuestionBankService( instructorId, questionBankId) {
    const { questionBank } =
        await getOwnedQuestionBankContext(
            instructorId,
            questionBankId
        );

    const questions = await Question.find({
        questionBankId: questionBank._id
    }).sort({ createdAt: 1 });

    return questions;
}

// GET QUESTION BY ID

export async function getQuestionByIdService(instructorId,questionId) {
    const { question } =
        await getOwnedQuestionContext(
            instructorId,
            questionId
        );

    return question;
}

// UPDATE QUESTION

export async function updateQuestionService(instructorId, questionId, updateData) {
    return withTransaction(async (session) => {
        const { question, questionBank, topic } = await getOwnedQuestionContext(instructorId, questionId, session);
        ensureQuestionBankActive(questionBank);

        // Published Assessment questions are immutable: historical and future attempts
        // must continue to refer to the same question definition.
        const assessmentUsage = await Assessment.exists({
            status: "PUBLISHED",
            questionIds: question._id,
        }).session(session);
        if (assessmentUsage) {
            throw new ApiError(409, "QUESTION_USED_IN_PUBLISHED_ASSESSMENT", "A question used by a published assessment cannot be edited");
        }

        const nextState = {
            questionBankId: question.questionBankId,
            courseId: question.courseId,
            topicId: question.topicId,
            lessonId: updateData.lessonId !== undefined ? updateData.lessonId : question.lessonId,
            createdBy: question.createdBy,
            questionText: updateData.questionText !== undefined ? updateData.questionText : question.questionText,
            type: updateData.type !== undefined ? updateData.type : question.type,
            options: updateData.options !== undefined ? updateData.options : question.options,
            correctAnswer: updateData.correctAnswer !== undefined ? updateData.correctAnswer : question.correctAnswer,
            explanation: updateData.explanation !== undefined ? updateData.explanation : question.explanation,
            marks: updateData.marks !== undefined ? updateData.marks : question.marks,
            difficulty: updateData.difficulty !== undefined ? updateData.difficulty : question.difficulty,
            status: question.status,
        };
        if (nextState.lessonId) await validateLessonForTopic(nextState.lessonId, topic._id, session);
        const validatedQuestion = await validateQuestionState(nextState);
        question.questionText = validatedQuestion.questionText;
        question.normalizedQuestionText = validatedQuestion.normalizedQuestionText;
        question.type = validatedQuestion.type;
        question.options = validatedQuestion.options;
        question.correctAnswer = validatedQuestion.correctAnswer;
        question.explanation = validatedQuestion.explanation;
        question.marks = validatedQuestion.marks;
        question.difficulty = validatedQuestion.difficulty;
        question.lessonId = validatedQuestion.lessonId;
        const bankFence = await QuestionBank.updateOne(
            { _id: questionBank._id, status: "ACTIVE" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (bankFence.modifiedCount !== 1) throw new ApiError(409, "QUESTION_BANK_ARCHIVED", "Question bank changed during question update; reload and retry");
        question.lifecycleVersion = (question.lifecycleVersion ?? 0) + 1;
        await question.save({ session });
        return question;
    });
}

// ARCHIVE QUESTION

export async function archiveQuestionService(instructorId, questionId) {
    return withTransaction(async (session) => {
        const { question, questionBank } = await getOwnedQuestionContext(instructorId, questionId, session);
        if (question.status === "ARCHIVED") {
            throw new ApiError(409, "QUESTION_ALREADY_ARCHIVED", "Question is already archived");
        }
        // Keep transaction operations sequential; the MongoDB driver does not
        // support parallel operations on one transaction session.
        const assessmentUsage = await Assessment.exists({ status: "PUBLISHED", questionIds: question._id }).session(session);
        const practiceUsage = await Practice.exists({ status: "PUBLISHED", questionIds: question._id }).session(session);
        if (assessmentUsage) throw new ApiError(409, "QUESTION_USED_IN_PUBLISHED_ASSESSMENT", "A question used by a published assessment cannot be archived");
        if (practiceUsage) throw new ApiError(409, "QUESTION_USED_IN_PUBLISHED_PRACTICE", "A question used by published practice cannot be archived");
        const bankFence = await QuestionBank.updateOne(
            { _id: questionBank._id, status: "ACTIVE" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (bankFence.modifiedCount !== 1) throw new ApiError(409, "QUESTION_BANK_ARCHIVED", "Question bank changed during question archival; reload and retry");
        question.status = "ARCHIVED";
        question.lifecycleVersion = (question.lifecycleVersion ?? 0) + 1;
        await question.save({ session });
        return question;
    });
}

// RESTORE QUESTION

export async function restoreQuestionService(instructorId, questionId) {
    return withTransaction(async (session) => {
        const { question, questionBank } = await getOwnedQuestionContext(instructorId, questionId, session);
        ensureQuestionBankActive(questionBank);
        if (question.status === "ACTIVE") throw new ApiError(409, "QUESTION_ALREADY_ACTIVE", "Question is already active");
        const bankFence = await QuestionBank.updateOne(
            { _id: questionBank._id, status: "ACTIVE" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (bankFence.modifiedCount !== 1) throw new ApiError(409, "QUESTION_BANK_ARCHIVED", "Question bank changed during question restoration; reload and retry");
        question.status = "ACTIVE";
        question.lifecycleVersion = (question.lifecycleVersion ?? 0) + 1;
        await question.save({ session });
        return question;
    });
}