import { Practice } from "../models/practice.model.js";

import { QuestionBank } from "../../questionBank/models/questionBank.model.js";

import { Question } from "../../question/models/question.model.js";

import { Topic } from "../../topic/models/topic.model.js";

import { Course } from "../../course/models/course.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { assertTopicUnlockedForLearner } from "../../topic/services/topicProgression.service.js";

import { withTransaction } from "../../../shared/utils/withTransaction.js";
import { ApiError } from "../../../shared/errors/ApiError.js";


/*

|--------------------------------------------------------------------------

| Question Bank Context

|--------------------------------------------------------------------------

*/

async function getOwnedQuestionBankContext(instructorId, questionBankId, session = null) {

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
    const courseQuery = Course.findById(questionBank.courseId);
    const topic = await (session ? topicQuery.session(session) : topicQuery);
    const course = await (session ? courseQuery.session(session) : courseQuery);

    if (!topic || !course) {

        throw new ApiError(

            404,

            "QUESTION_BANK_NOT_FOUND",

            "Question bank not found"

        );

    }

    if (topic.courseId.toString() !== questionBank.courseId.toString()) {

        throw new ApiError(

            500,

            "QUESTION_BANK_DATA_INCONSISTENT",

            "Question bank data is inconsistent"

        );

    }

    if (course.createdBy.toString() !== instructorId.toString()) {

        throw new ApiError(

            404,

            "QUESTION_BANK_NOT_FOUND",

            "Question bank not found"

        );

    }

    return { questionBank, topic, course };

}

/*

|--------------------------------------------------------------------------

| Practice Context

|--------------------------------------------------------------------------

*/

async function getOwnedPracticeContext(instructorId, practiceId, session = null) {

    const practiceQuery = Practice.findById(practiceId);
    const practice = await (session ? practiceQuery.session(session) : practiceQuery);

    if (!practice || practice.createdBy.toString() !== instructorId.toString()) {
        
        throw new ApiError(404,
            "PRACTICE_NOT_FOUND",
            "Practice not found"
        );
    }

    const { questionBank, topic, course } =

        await getOwnedQuestionBankContext(

            instructorId,

            practice.questionBankId,
            session

        );

    if (

        practice.topicId.toString() !== questionBank.topicId.toString() ||

        practice.courseId.toString() !== questionBank.courseId.toString()

    ) {

        throw new ApiError(

            500,

            "PRACTICE_DATA_INCONSISTENT",

            "Practice data is inconsistent"

        );

    }

    return { practice, questionBank, topic, course };

}

/*

|--------------------------------------------------------------------------

| Question Bank State

|--------------------------------------------------------------------------

*/

function ensureQuestionBankActive(questionBank) {

    if (questionBank.status !== "ACTIVE") {

        throw new ApiError(

            409,

            "QUESTION_BANK_ARCHIVED",

            "The question bank must be active for this operation"

        );

    }

}

/*

|--------------------------------------------------------------------------

| Validate Selected Questions

|--------------------------------------------------------------------------

*/

async function validatePracticeQuestions(questionIds, context, session = null) {

    if (questionIds.length === 0) {

        return;

    }

    const questions = Question.find({

        _id: { $in: questionIds },

        questionBankId: context.questionBank._id,

        topicId: context.topic._id,

        courseId: context.course._id,

        status: "ACTIVE"

    }).select("_id");
    if (session) questions.session(session);
    const resolvedQuestions = await questions;

    if (resolvedQuestions.length !== questionIds.length) {

        throw new ApiError(

            400,

            "INVALID_PRACTICE_QUESTIONS",

            "One or more selected questions are unavailable or do not belong to this question bank"

        );

    }

}

/*

|--------------------------------------------------------------------------

| Create Practice

|--------------------------------------------------------------------------

*/

export async function createPracticeService(

    instructorId,

    topicId,

    practiceData

) {

    const topic = await Topic.findById(topicId);

    if (!topic) {

        throw new ApiError(

            404,

            "TOPIC_NOT_FOUND",

            "Topic not found"

        );

    }

    const course = await Course.findById(topic.courseId);

    if (

        !course ||

        course.createdBy.toString() !== instructorId.toString()

    ) {

        throw new ApiError(

            404,

            "TOPIC_NOT_FOUND",

            "Topic not found"

        );

    }

const questionBank = await QuestionBank.findOne({

        topicId: topic._id

    });

    if (!questionBank) {

        throw new ApiError(

            404,

            "QUESTION_BANK_NOT_FOUND",

            "Question bank not found for this topic"

        );

    }

    if (

        questionBank.courseId.toString() !== course._id.toString()

    ) {

        throw new ApiError(

            500,

            "QUESTION_BANK_DATA_INCONSISTENT",

            "Question bank data is inconsistent"

        );

    }

    ensureQuestionBankActive(questionBank);

    const questionIds = practiceData.questionIds ?? [];

    await validatePracticeQuestions(questionIds, {

        questionBank,

        topic,

        course

    });

    const practice = await Practice.create({

        courseId: course._id,

        topicId: topic._id,

        questionBankId: questionBank._id,

        createdBy: instructorId,

        title: practiceData.title,

        description: practiceData.description ?? "",

        questionIds,

        contributeToLearningEvidence:

            practiceData.contributeToLearningEvidence ?? false

    });

    return practice;

}

/*

|--------------------------------------------------------------------------

| Get Practice By ID

|--------------------------------------------------------------------------

*/

export function serializeLearnerPractice(practice) {
    return {
        _id: practice._id,
        courseId: practice.courseId,
        topicId: practice.topicId,
        title: practice.title,
        description: practice.description ?? "",
        questionCount: practice.questionIds ? practice.questionIds.length : 0,
        contributeToLearningEvidence: practice.contributeToLearningEvidence ?? false,
        status: practice.status,
        createdAt: practice.createdAt,
        updatedAt: practice.updatedAt,
    };
}

/*

|--------------------------------------------------------------------------

| Get Practice By ID

|--------------------------------------------------------------------------

*/

export async function getPracticeByIdService(userId, practiceId, userRole = "INSTRUCTOR") {
    if (userRole === "INSTRUCTOR") {
        const { practice } = await getOwnedPracticeContext(
            userId,
            practiceId
        );
        return practice;
    }

    if (userRole === "LEARNER") {
        const practice = await Practice.findById(practiceId);
        if (!practice || practice.status !== "PUBLISHED") {
            throw new ApiError(404, "PRACTICE_NOT_FOUND", "Practice not found");
        }
        const course = await Course.findById(practice.courseId);
        if (!course || course.status !== "PUBLISHED") {
            throw new ApiError(404, "PRACTICE_NOT_FOUND", "Practice not found");
        }
        const enrollment = await Enrollment.findOne({ learnerId: userId, courseId: course._id, status: "ACTIVE" });
        if (!enrollment) {
            throw new ApiError(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view this practice");
        }
        await assertTopicUnlockedForLearner(userId, course, practice.topicId);
        return serializeLearnerPractice(practice);
    }

    if (userRole === "ADMIN") {
        const practice = await Practice.findById(practiceId);
        if (!practice) throw new ApiError(404, "PRACTICE_NOT_FOUND", "Practice not found");
        return practice;
    }

    throw new ApiError(403, "FORBIDDEN", "Access denied");
}

/*

|--------------------------------------------------------------------------

| Get Practices By Topic

|--------------------------------------------------------------------------

*/

export async function getPracticesByTopicService(userId, topicId, userRole = "INSTRUCTOR") {
    const topic = await Topic.findById(topicId);
    if (!topic) {
        throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    const course = await Course.findById(topic.courseId);
    if (!course || course.status === "ARCHIVED") {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (userRole === "INSTRUCTOR") {
        if (course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
        }
        return Practice.find({ topicId: topic._id }).sort({ createdAt: -1 });
    }

    if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED") {
            throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
        }
        const enrollment = await Enrollment.findOne({ learnerId: userId, courseId: course._id, status: "ACTIVE" });
        if (!enrollment) {
            throw new ApiError(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view topic practices");
        }
        await assertTopicUnlockedForLearner(userId, course, topic);
        const practices = await Practice.find({ topicId: topic._id, status: "PUBLISHED" }).sort({ createdAt: -1 });
        return practices.map(serializeLearnerPractice);
    }

    if (userRole === "ADMIN") {
        return Practice.find({ topicId: topic._id }).sort({ createdAt: -1 });
    }

    throw new ApiError(403, "FORBIDDEN", "Access denied");
}

/*

|--------------------------------------------------------------------------

| Get Practices By Course

|--------------------------------------------------------------------------

*/

export async function getPracticesByCourseService(userId, courseId, userRole = "INSTRUCTOR") {
    const course = await Course.findById(courseId);
    if (!course || course.status === "ARCHIVED") {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (userRole === "INSTRUCTOR") {
        if (course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
        }
        return Practice.find({ courseId: course._id }).sort({ createdAt: -1 });
    }

    if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED") {
            throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
        }
        const enrollment = await Enrollment.findOne({ learnerId: userId, courseId: course._id, status: "ACTIVE" });
        if (!enrollment) {
            throw new ApiError(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view course practices");
        }
        const practices = await Practice.find({ courseId: course._id, status: "PUBLISHED" }).sort({ createdAt: -1 });
        return practices.map(serializeLearnerPractice);
    }

    if (userRole === "ADMIN") {
        return Practice.find({ courseId: course._id }).sort({ createdAt: -1 });
    }

    throw new ApiError(403, "FORBIDDEN", "Access denied");
}


/*

|--------------------------------------------------------------------------

| Update Practice

|--------------------------------------------------------------------------

|

| Published practices remain editable, but cannot be emptied.

| Archived practices cannot be edited.

|

*/

export async function updatePracticeService(instructorId, practiceId, updateData) {
    return withTransaction(async (session) => {
        const { practice, questionBank, topic, course } = await getOwnedPracticeContext(instructorId, practiceId, session);
        if (practice.status === "ARCHIVED") throw new ApiError(409, "PRACTICE_ARCHIVED", "Archived practice cannot be updated");
        ensureQuestionBankActive(questionBank);

        const oldQuestionIds = practice.questionIds.map((id) => id.toString());
        let nextQuestionIds = practice.questionIds;
        if (updateData.questionIds !== undefined) {
            if (practice.status === "PUBLISHED" && updateData.questionIds.length === 0) {
                throw new ApiError(400, "PRACTICE_REQUIRES_QUESTIONS", "A published practice must keep at least one question");
            }
            await validatePracticeQuestions(updateData.questionIds, { questionBank, topic, course }, session);
            nextQuestionIds = updateData.questionIds;
        }

        // Lock existing and newly selected questions when changing the pool. This
        // shares writes with question archive and Practice/Assessment publication.
        if (updateData.questionIds !== undefined) {
            const unionIds = [...new Set([...oldQuestionIds, ...nextQuestionIds.map((id) => id.toString())])];
            const existingQuery = Question.find({ _id: { $in: unionIds } }).select("_id");
            const existing = await existingQuery.session(session);
            if (existing.length) {
                await Question.updateMany(
                    { _id: { $in: existing.map((question) => question._id) } },
                    { $inc: { lifecycleVersion: 1 } },
                    { session }
                );
            }
            practice.questionIds = nextQuestionIds;
        }
        if (updateData.title !== undefined) practice.title = updateData.title;
        if (updateData.description !== undefined) practice.description = updateData.description;
        if (updateData.contributeToLearningEvidence !== undefined) {
            practice.contributeToLearningEvidence = updateData.contributeToLearningEvidence;
        }
        const bankFence = await QuestionBank.updateOne(
            { _id: questionBank._id, status: "ACTIVE" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (bankFence.modifiedCount !== 1) throw new ApiError(409, "QUESTION_BANK_ARCHIVED", "Question bank changed during Practice update; reload and retry");
        await practice.save({ session });
        return practice;
    });
}

/*

|--------------------------------------------------------------------------

| Publish Practice

|--------------------------------------------------------------------------

|

| Publication requires at least one active, eligible question.

| The status transition is conditional to prevent duplicate concurrent

| publish transitions.

|

*/

export async function publishPracticeService(instructorId, practiceId) {
    return withTransaction(async (session) => {
        const { practice, questionBank, topic, course } = await getOwnedPracticeContext(instructorId, practiceId, session);
        if (practice.status === "PUBLISHED") throw new ApiError(409, "PRACTICE_ALREADY_PUBLISHED", "Practice is already published");
        if (practice.status === "ARCHIVED") throw new ApiError(409, "PRACTICE_ARCHIVED", "Archived practice cannot be published");
        ensureQuestionBankActive(questionBank);
        if (practice.questionIds.length === 0) throw new ApiError(400, "PRACTICE_REQUIRES_QUESTIONS", "Select at least one question before publishing practice");
        await validatePracticeQuestions(practice.questionIds, { questionBank, topic, course }, session);

        // Shared writes serialize this publication with question/bank archive operations.
        const questionTouch = await Question.updateMany(
            { _id: { $in: practice.questionIds }, status: "ACTIVE" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (questionTouch.modifiedCount !== practice.questionIds.length) {
            throw new ApiError(409, "PRACTICE_STATE_CHANGED", "A selected question changed during publication; reload and retry");
        }
        const bankTouch = await QuestionBank.updateOne(
            { _id: questionBank._id, status: "ACTIVE" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (bankTouch.modifiedCount !== 1) throw new ApiError(409, "QUESTION_BANK_ARCHIVED", "The question bank changed during publication; reload and retry");

        const updatedPractice = await Practice.findOneAndUpdate(
            { _id: practice._id, status: "DRAFT", questionIds: { $eq: practice.questionIds } },
            { $set: { status: "PUBLISHED" } },
            { returnDocument: "after", runValidators: true, session }
        );
        if (!updatedPractice) throw new ApiError(409, "PRACTICE_STATE_CHANGED", "Practice status changed, please retry");
        return updatedPractice;
    });
}

/*

|--------------------------------------------------------------------------

| Archive Practice

|--------------------------------------------------------------------------

|

| Ownership is checked using the Practice record itself. Archiving does

| not require its Topic, Course or Question Bank to still exist.

|

*/

export async function archivePracticeService(instructorId, practiceId) {

    const practice = await Practice.findById(practiceId);

    if (

        !practice ||

        practice.createdBy.toString() !== instructorId.toString()

    ) {

        throw new ApiError(

            404,

            "PRACTICE_NOT_FOUND",

            "Practice not found"

        );

    }

    if (practice.status === "ARCHIVED") {

        throw new ApiError(

            409,

            "PRACTICE_ALREADY_ARCHIVED",

            "Practice is already archived"

        );

    }

    const updatedPractice = await Practice.findOneAndUpdate(

        {

            _id: practice._id,

            status: practice.status

        },

        {

            $set: { status: "ARCHIVED" }

        },

        {

            returnDocument: "after",

            runValidators: true

        }

    );

    if (!updatedPractice) {

        throw new ApiError(

            409,

            "PRACTICE_STATE_CHANGED",

            "Practice status changed, please retry"

        );

    }

    return updatedPractice;

}

/*

|--------------------------------------------------------------------------

| Restore Practice

|--------------------------------------------------------------------------

|

| Restoring returns the practice to DRAFT. Question eligibility is checked

| again at publication, allowing instructors to repair archived selections.

|

*/

export async function restorePracticeService(instructorId, practiceId) {

    const { practice, questionBank } =

        await getOwnedPracticeContext(instructorId, practiceId);

    if (practice.status !== "ARCHIVED") {

        throw new ApiError(

            409,

            "PRACTICE_NOT_ARCHIVED",

            "Practice is not archived"

        );

    }

    ensureQuestionBankActive(questionBank);

    const updatedPractice = await Practice.findOneAndUpdate(

        {

            _id: practice._id,

            status: "ARCHIVED"

        },

        {

            $set: { status: "DRAFT" }

        },

        {

            returnDocument: "after",

            runValidators: true

        }

    );

    if (!updatedPractice) {

        throw new ApiError(

            409,

            "PRACTICE_STATE_CHANGED",

            "Practice status changed, please retry"

        );

    }

    return updatedPractice;

}
