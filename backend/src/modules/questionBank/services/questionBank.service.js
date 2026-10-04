import { QuestionBank } from "../models/questionBank.model.js";
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

async function getOwnedQuestionBankContext(instructorId, questionBankId) {
    const questionBank = await QuestionBank.findById(questionBankId);

    if (!questionBank) {
        throw new ApiError(404, "QUESTION_BANK_NOT_FOUND", "Question bank not found");
    }

    const course = await Course.findById(questionBank.courseId);

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
    const { questionBank } = await getOwnedQuestionBankContext(instructorId, questionBankId);

    if (questionBank.status === "ARCHIVED") {
    throw new ApiError(
        409,
        "QUESTION_BANK_ARCHIVED",
        "Archived question bank cannot be updated"
    );
}

    if (updateData.title !== undefined) {
        questionBank.title = updateData.title;
    }

    if (updateData.description !== undefined) {
        questionBank.description = updateData.description;
    }

    await questionBank.save();

    return questionBank;
}

export async function archiveQuestionBankService(instructorId, questionBankId) {
    const { questionBank } = await getOwnedQuestionBankContext(instructorId, questionBankId);

    if (questionBank.status === "ARCHIVED") {
        throw new ApiError(409, "QUESTION_BANK_ALREADY_ARCHIVED", "Question bank is already archived");
    }

    questionBank.status = "ARCHIVED";
    await questionBank.save();

    return questionBank;
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