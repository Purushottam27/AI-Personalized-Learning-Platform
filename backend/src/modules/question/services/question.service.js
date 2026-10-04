import { Question } from "../models/question.model.js";
import { QuestionBank } from "../../questionBank/models/questionBank.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { Lesson } from "../../lesson/models/lesson.model.js";

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

async function getOwnedQuestionBankContext(instructorId, questionBankId) {
    const questionBank = await QuestionBank.findById(questionBankId);

    if (!questionBank) {
        throw new ApiError(
            404,
            "QUESTION_BANK_NOT_FOUND",
            "Question bank not found"
        );
    }

    const topic = await Topic.findById(questionBank.topicId);

    if (!topic) {
        throw new ApiError(
            404,
            "QUESTION_BANK_NOT_FOUND",
            "Question bank not found"
        );
    }

    const course = await Course.findById(questionBank.courseId);

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

async function getOwnedQuestionContext(instructorId, questionId) {
    const question = await Question.findById(questionId);

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
            question.questionBankId
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

async function validateLessonForTopic(lessonId, topicId) {
    if (!lessonId) {
        return null;
    }

    const lesson = await Lesson.findById(lessonId);

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
    const question = new Question(questionData);

    await question.validate();

    return question;
}

// CREATE QUESTION

export async function createQuestionService(  instructorId, questionBankId,questionData) {
    const {questionBank,topic,course} = await getOwnedQuestionBankContext(
        instructorId,
        questionBankId
    );

    ensureQuestionBankActive(questionBank);

    if (questionData.lessonId) {
        await validateLessonForTopic(
            questionData.lessonId,
            topic._id
        );
    }

    const questionPayload = {
        questionBankId: questionBank._id,
        courseId: course._id,
        topicId: topic._id,
        lessonId: questionData.lessonId ?? null,

        createdBy: instructorId,

        questionText: questionData.questionText,
        type: questionData.type,
        options: questionData.options ?? [],
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation ?? "",
        marks: questionData.marks,
        difficulty: questionData.difficulty
    };

    // Validate the complete question before saving.
     
    const question = await validateQuestionState(questionPayload);

    await question.save();

    return question;
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

export async function updateQuestionService( instructorId, questionId, updateData) {
    const {question,questionBank,topic} = await getOwnedQuestionContext(
        instructorId,
        questionId
    );

    ensureQuestionBankActive(questionBank);

    /*
     * Assessment immutability:
     *
     * A question that has already been included in an Assessment
     * must not be edited.
     *
     * The Assessment module is not implemented yet, so the actual
     * usage check will be added when Assessment is implemented.
     */

    /*
     * Create the complete next state by merging the current
     * question with the PATCH data.
     */
    const nextState = {
        questionBankId: question.questionBankId,
        courseId: question.courseId,
        topicId: question.topicId,
        lessonId:
            updateData.lessonId !== undefined
                ? updateData.lessonId
                : question.lessonId,

        createdBy: question.createdBy,

        questionText:
            updateData.questionText !== undefined
                ? updateData.questionText
                : question.questionText,

        type:
            updateData.type !== undefined
                ? updateData.type
                : question.type,

        options:
            updateData.options !== undefined
                ? updateData.options
                : question.options,

        correctAnswer:
            updateData.correctAnswer !== undefined
                ? updateData.correctAnswer
                : question.correctAnswer,

        explanation:
            updateData.explanation !== undefined
                ? updateData.explanation
                : question.explanation,

        marks:
            updateData.marks !== undefined
                ? updateData.marks
                : question.marks,

        difficulty:
            updateData.difficulty !== undefined
                ? updateData.difficulty
                : question.difficulty,

        status: question.status
    };

    // If lessonId is changed, verify that the new lesson belongs to the same topic.
     
    if (nextState.lessonId) {
        await validateLessonForTopic(
            nextState.lessonId,
            topic._id
        );
    }

    // Validate the COMPLETE merged question.
     
    const validatedQuestion = await validateQuestionState(nextState);

    question.questionText = validatedQuestion.questionText;
    question.type = validatedQuestion.type;
    question.options = validatedQuestion.options;
    question.correctAnswer = validatedQuestion.correctAnswer;
    question.explanation = validatedQuestion.explanation;
    question.marks = validatedQuestion.marks;
    question.difficulty = validatedQuestion.difficulty;
    question.lessonId = validatedQuestion.lessonId;

    await question.save();

    return question;
}

// ARCHIVE QUESTION

export async function archiveQuestionService(
    instructorId,
    questionId
) {
    const { question, questionBank } = await getOwnedQuestionContext(
        instructorId,
        questionId
    );

    // Assessment usage restriction will be checked here once the Assessment module exists.
     
    if (question.status === "ARCHIVED") {
        throw new ApiError(
            409,
            "QUESTION_ALREADY_ARCHIVED",
            "Question is already archived"
        );
    }

    question.status = "ARCHIVED";

    await question.save();

    return question;
}

// RESTORE QUESTION

export async function restoreQuestionService(
    instructorId,
    questionId
) {
    const {question,questionBank} = await getOwnedQuestionContext(
        instructorId,
        questionId
    );

    // A question can only be restored if its Question Bank  is active.
     
    ensureQuestionBankActive(questionBank);

    if (question.status === "ACTIVE") {
        throw new ApiError(
            409,
            "QUESTION_ALREADY_ACTIVE",
            "Question is already active"
        );
    }

    question.status = "ACTIVE";

    await question.save();

    return question;
}