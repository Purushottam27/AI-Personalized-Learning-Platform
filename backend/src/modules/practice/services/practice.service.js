import { Practice } from "../models/practice.model.js";

import { QuestionBank } from "../../questionBank/models/questionBank.model.js";

import { Question } from "../../question/models/question.model.js";

import { Topic } from "../../topic/models/topic.model.js";

import { Course } from "../../course/models/course.model.js";

import { ApiError } from "../../../shared/errors/ApiError.js";

/*

|--------------------------------------------------------------------------

| Question Bank Context

|--------------------------------------------------------------------------

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

    const course = await Course.findById(questionBank.courseId);

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

async function getOwnedPracticeContext(instructorId, practiceId) {

    const practice = await Practice.findById(practiceId);

    if (!practice || practice.createdBy.toString() !== instructorId.toString()) {
        
        throw new ApiError(404,
            "PRACTICE_NOT_FOUND",
            "Practice not found"
        );
    }

    const { questionBank, topic, course } =

        await getOwnedQuestionBankContext(

            instructorId,

            practice.questionBankId

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

async function validatePracticeQuestions(questionIds, context) {

    if (questionIds.length === 0) {

        return;

    }

    const questions = await Question.find({

        _id: { $in: questionIds },

        questionBankId: context.questionBank._id,

        topicId: context.topic._id,

        courseId: context.course._id,

        status: "ACTIVE"

    }).select("_id");

    if (questions.length !== questionIds.length) {

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

export async function getPracticeByIdService(instructorId, practiceId) {

    const { practice } = await getOwnedPracticeContext(

        instructorId,

        practiceId

    );

    return practice;

}

/*

|--------------------------------------------------------------------------

| Get Practices By Topic

|--------------------------------------------------------------------------

*/

export async function getPracticesByTopicService(instructorId, topicId) {

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

    const practices = await Practice.find({

        topicId: topic._id

    }).sort({ createdAt: -1 });

    return practices;

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

export async function updatePracticeService(

    instructorId,

    practiceId,

    updateData

) {

    const { practice, questionBank, topic, course } =

        await getOwnedPracticeContext(instructorId, practiceId);

    if (practice.status === "ARCHIVED") {

        throw new ApiError(

            409,

            "PRACTICE_ARCHIVED",

            "Archived practice cannot be updated"

        );

    }

    ensureQuestionBankActive(questionBank);

    if (updateData.questionIds !== undefined) {

        if (

            practice.status === "PUBLISHED" &&

            updateData.questionIds.length === 0

        ) {

            throw new ApiError(

                400,

                "PRACTICE_REQUIRES_QUESTIONS",

                "A published practice must keep at least one question"

            );

        }

        await validatePracticeQuestions(updateData.questionIds, {

            questionBank,

            topic,

            course

        });

        practice.questionIds = updateData.questionIds;

    }

    if (updateData.title !== undefined) {

        practice.title = updateData.title;

    }

    if (updateData.description !== undefined) {

        practice.description = updateData.description;

    }

    if (updateData.contributeToLearningEvidence !== undefined) {

        practice.contributeToLearningEvidence =

            updateData.contributeToLearningEvidence;

    }

    await practice.save();

    return practice;

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

    const { practice, questionBank, topic, course } =

        await getOwnedPracticeContext(instructorId, practiceId);

    if (practice.status === "PUBLISHED") {

        throw new ApiError(

            409,

            "PRACTICE_ALREADY_PUBLISHED",

            "Practice is already published"

        );

    }

    if (practice.status === "ARCHIVED") {

        throw new ApiError(

            409,

            "PRACTICE_ARCHIVED",

            "Archived practice cannot be published"

        );

    }

    ensureQuestionBankActive(questionBank);

    if (practice.questionIds.length === 0) {

        throw new ApiError(

            400,

            "PRACTICE_REQUIRES_QUESTIONS",

            "Select at least one question before publishing practice"

        );

    }

    await validatePracticeQuestions(practice.questionIds, {

        questionBank,

        topic,

        course

    });

    const updatedPractice = await Practice.findOneAndUpdate(

        {

            _id: practice._id,

            status: "DRAFT",

            questionIds: { $eq: practice.questionIds }

        },

        {

            $set: { status: "PUBLISHED" }

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
