import { QuestionBank } from "../models/questionBank.model.js";
import { Practice } from "../../practice/models/practice.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { Question } from "../../question/models/question.model.js";
import { withTransaction } from "../../../shared/utils/withTransaction.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Course } from "../../course/models/course.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

async function getOwnedTopicAndCourse(instructorId, topicId) {
    const topic = await Topic.findById(topicId);

    if (!topic) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    const course = await Course.findById(topic.courseId);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    return { topic, course };
}

async function getOwnedQuestionBankContext(instructorId, questionBankId, session = null) {
    const query = QuestionBank.findById(questionBankId);
    const questionBank = await (session ? query.session(session) : query);

    if (!questionBank) {
        throw new ApiError(404, "QUESTION_BANK_NOT_FOUND", "Question bank not found");
    }

    const courseQuery = Course.findById(questionBank.courseId);
    const course = await (session ? courseQuery.session(session) : courseQuery);

    if (!course || course.createdBy.toString() !== instructorId.toString()) {
        throw new ApiError(404, "QUESTION_BANK_NOT_FOUND", "Question bank not found");
    }

    return { questionBank, course };
}

export async function createQuestionBankService(instructorId, topicId, questionBankData) {
    const { topic, course } = await getOwnedTopicAndCourse(instructorId, topicId);

    const existingBank = await QuestionBank.findOne({ topicId });

    if (existingBank) {
        throw new ApiError(
            409,
            "QUESTION_BANK_ALREADY_EXISTS",
            "A question bank already exists for this topic"
        );
    }

    try {
        const questionBank = await QuestionBank.create({
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            title: questionBankData.title,
            description: questionBankData.description ?? ""
        });

        return questionBank;
    } catch (error) {
        if (error.code === 11000) {
            throw new ApiError(
                409,
                "QUESTION_BANK_ALREADY_EXISTS",
                "A question bank already exists for this topic"
            );
        }

        throw error;
    }
}

export async function getQuestionBankByTopicService(instructorId, topicId) {
    await getOwnedTopicAndCourse(instructorId, topicId);

    const questionBank = await QuestionBank.findOne({ topicId });

    if (!questionBank) {
        throw new ApiError(404, "QUESTION_BANK_NOT_FOUND", "Question bank not found");
    }

    return questionBank;
}

export async function getQuestionBankByIdService(instructorId, questionBankId) {
    const { questionBank } = await getOwnedQuestionBankContext(instructorId, questionBankId);

    return questionBank;
}

export async function updateQuestionBankService(instructorId, questionBankId, updateData) {
    return withTransaction(async (session) => {
        const { questionBank } = await getOwnedQuestionBankContext(instructorId, questionBankId, session);
        if (questionBank.status === "ARCHIVED") {
            throw new ApiError(409, "QUESTION_BANK_ARCHIVED", "Archived question bank cannot be updated");
        }
        if (updateData.title !== undefined) questionBank.title = updateData.title;
        if (updateData.description !== undefined) questionBank.description = updateData.description;
        questionBank.lifecycleVersion = (questionBank.lifecycleVersion ?? 0) + 1;
        await questionBank.save({ session });
        return questionBank;
    });
}

export async function archiveQuestionBankService(instructorId, questionBankId) {
    return withTransaction(async (session) => {
        const { questionBank } = await getOwnedQuestionBankContext(instructorId, questionBankId, session);
        if (questionBank.status === "ARCHIVED") {
            throw new ApiError(409, "QUESTION_BANK_ALREADY_ARCHIVED", "Question bank is already archived");
        }
        // MongoDB's Node driver does not support parallel operations on the same
        // transaction session. Keep these reads sequential so the transaction's
        // behavior is deterministic and retry-safe.
        const practiceUsage = await Practice.exists({
            questionBankId: questionBank._id,
            status: "PUBLISHED",
        }).session(session);
        const questionIds = await getQuestionIdsForBank(questionBank._id, session);
        const assessmentUsage = await Assessment.exists({
            status: "PUBLISHED",
            questionIds: { $in: questionIds },
        }).session(session);
        if (practiceUsage) {
            throw new ApiError(409, "QUESTION_BANK_USED_IN_PUBLISHED_PRACTICE", "A question bank used by published practice cannot be archived");
        }
        if (assessmentUsage) {
            throw new ApiError(409, "QUESTION_BANK_USED_IN_PUBLISHED_ASSESSMENT", "A question bank used by a published assessment cannot be archived");
        }
        questionBank.status = "ARCHIVED";
        questionBank.lifecycleVersion = (questionBank.lifecycleVersion ?? 0) + 1;
        await questionBank.save({ session });
        return questionBank;
    });
}

async function getQuestionIdsForBank(questionBankId, session) {
    const query = Question.find({ questionBankId }).select("_id");
    const questions = await query.session(session);
    return questions.map((question) => question._id);
}

export async function restoreQuestionBankService(instructorId, questionBankId) {
    const { questionBank } = await getOwnedQuestionBankContext(instructorId, questionBankId);

    if (questionBank.status === "ACTIVE") {
        throw new ApiError(409, "QUESTION_BANK_ALREADY_ACTIVE", "Question bank is already active");
    }

    questionBank.status = "ACTIVE";
    await questionBank.save();

    return questionBank;
}