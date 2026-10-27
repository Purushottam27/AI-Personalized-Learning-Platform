import mongoose from "mongoose";
import { Practice } from "../models/practice.model.js";
import { PracticeAttempt } from "../models/practiceAttempt.model.js";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { Question } from "../../question/models/question.model.js";
import { recordPracticeEvidenceService } from "../../learningEvidence/services/learningEvidence.service.js";
import { withTransaction } from "../../../shared/utils/withTransaction.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function fail(status, code, message, details = null) {
    throw new ApiError(status, code, message, details);
}

function sameId(a, b) {
    return a != null && b != null && a.toString() === b.toString();
}

function requireObjectId(value, field) {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        fail(400, "INVALID_ID", `${field} is invalid`);
    }
}

function cloneAnswer(answer) {
    return Array.isArray(answer) ? [...answer] : answer;
}

export function normalizeAnswer(type, answer) {
    if (answer == null) return null;
    if (type === "MCQ_SINGLE") {
        if (typeof answer !== "string" || !/^[A-Z]$/.test(answer)) {
            fail(400, "INVALID_ANSWER", "MCQ_SINGLE answers must be one option key");
        }
        return answer;
    }
    if (type === "TRUE_FALSE") {
        if (answer !== "TRUE" && answer !== "FALSE") {
            fail(400, "INVALID_ANSWER", "TRUE_FALSE answers must be TRUE or FALSE");
        }
        return answer;
    }
    if (type === "MCQ_MULTIPLE") {
        if (!Array.isArray(answer) || answer.length < 1 || answer.some((key) => typeof key !== "string" || !/^[A-Z]$/.test(key))) {
            fail(400, "INVALID_ANSWER", "MCQ_MULTIPLE answers must be an array of option keys");
        }
        if (new Set(answer).size !== answer.length) {
            fail(400, "INVALID_ANSWER", "Duplicate answer option keys are not allowed");
        }
        return [...answer].sort();
    }
    fail(400, "INVALID_ANSWER", "Unsupported question type");
}

export function answersEqual(type, actual, expected) {
    if (actual == null) return false;
    if (type === "MCQ_MULTIPLE") {
        if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
        const left = [...actual].sort();
        const right = [...expected].sort();
        return left.length === right.length && left.every((value, index) => value === right[index]);
    }
    return actual === expected;
}

function answerFor(attempt, questionId) {
    return attempt.answers.find((item) => sameId(item.questionId, questionId))?.answer ?? null;
}

function calculateResult(attempt) {
    let marksAwarded = 0;
    let correctCount = 0;
    for (const question of attempt.questions) {
        const submitted = answerFor(attempt, question.questionId);
        if (answersEqual(question.type, submitted, question.correctAnswer)) {
            marksAwarded += question.marks;
            correctCount += 1;
        }
    }
    const totalMarks = attempt.questions.reduce((sum, question) => sum + question.marks, 0);
    const scorePercent = totalMarks === 0 ? 0 : Number(((marksAwarded / totalMarks) * 100).toFixed(2));
    return { marksAwarded, totalMarks, scorePercent, correctCount };
}

function isVersionError(error) {
    return error?.name === "VersionError" || error instanceof mongoose.Error.VersionError;
}

function isDuplicateKey(error) {
    if (error?.code === 11000 || error?.code === 11001) return true;
    if (error?.errorResponse?.code === 11000 || error?.errorResponse?.code === 11001) return true;
    if (error?.writeErrors?.some((e) => e.code === 11000 || e.code === 11001)) return true;
    if (typeof error?.message === "string" && /E11000|E11001/.test(error.message)) return true;
    return false;
}

export function serializePublicAttempt(attempt, { revealResults = attempt.status === "SUBMITTED" } = {}) {
    const answers = new Map(attempt.answers.map((item) => [item.questionId.toString(), item.answer]));
    return {
        _id: attempt._id,
        practiceId: attempt.practiceId,
        learnerId: attempt.learnerId,
        courseId: attempt.courseId,
        topicId: attempt.topicId,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        submissionReason: attempt.submissionReason,
        totalQuestions: attempt.totalQuestions,
        totalMarks: attempt.totalMarks,
        marksAwarded: revealResults ? attempt.marksAwarded : null,
        scorePercent: revealResults ? attempt.scorePercent : null,
        correctCount: revealResults ? attempt.correctCount : null,
        contributeToLearningEvidence: attempt.contributeToLearningEvidence,
        questions: attempt.questions.map((question) => {
            const hasAnswer = answers.has(question.questionId.toString()) && answers.get(question.questionId.toString()) != null;
            const item = {
                questionId: question.questionId,
                questionText: question.questionText,
                type: question.type,
                options: question.options,
                marks: question.marks,
                difficulty: question.difficulty,
                answer: answers.get(question.questionId.toString()) ?? null,
            };
            if (revealResults || hasAnswer) {
                item.correctAnswer = question.correctAnswer;
                item.explanation = question.explanation;
                item.isCorrect = answersEqual(question.type, item.answer, question.correctAnswer);
            }
            return item;
        }),
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt,
    };
}


export async function startPracticeAttemptService(learnerId, practiceId) {
    requireObjectId(learnerId, "learnerId");
    requireObjectId(practiceId, "practiceId");

    try {
        const attempt = await withTransaction(async (session) => {
            const practice = await Practice.findById(practiceId).session(session);
            if (!practice || practice.status !== "PUBLISHED") {
                fail(404, "PRACTICE_NOT_FOUND", "Published practice not found");
            }

            const course = await Course.findById(practice.courseId).session(session);
            if (!course || course.status === "ARCHIVED") {
                fail(404, "COURSE_NOT_FOUND", "Course not found");
            }
            if (course.status !== "PUBLISHED") {
                fail(409, "COURSE_NOT_AVAILABLE", "The course is not available to learners");
            }

            const topic = await Topic.findById(practice.topicId).session(session);
            if (!topic || !sameId(topic.courseId, course._id)) {
                fail(404, "TOPIC_NOT_FOUND", "Topic not found for this practice");
            }

            const enrollment = await Enrollment.findOne({ learnerId, courseId: course._id, status: "ACTIVE" }).session(session);
            if (!enrollment) {
                fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to practice");
            }

            const inProgress = await PracticeAttempt.findOne({ practiceId, learnerId, status: "IN_PROGRESS" }).session(session);
            if (inProgress) {
                fail(409, "ATTEMPT_ALREADY_IN_PROGRESS", "Finish the existing attempt before starting another");
            }

            const priorCount = await PracticeAttempt.countDocuments({ practiceId, learnerId }).session(session);

            const ids = practice.questionIds ?? [];
            if (ids.length === 0) {
                fail(409, "PRACTICE_QUESTION_POOL_EMPTY", "This practice has no questions assigned");
            }

            const questionQuery = Question.find({
                _id: { $in: ids },
                status: "ACTIVE",
                courseId: course._id,
                topicId: topic._id,
                questionBankId: practice.questionBankId,
            });
            const sourceQuestions = await questionQuery.session(session);
            if (sourceQuestions.length === 0) {
                fail(409, "PRACTICE_QUESTION_POOL_EMPTY", "No active questions are currently available for this practice");
            }

            const byId = new Map(sourceQuestions.map((q) => [q._id.toString(), q]));
            const pool = ids.map((id) => byId.get(id.toString())).filter(Boolean);

            const questions = pool.map((question) => ({
                questionId: question._id,
                questionText: question.questionText,
                type: question.type,
                options: (question.options ?? []).map((o) => ({ key: o.key, text: o.text })),
                correctAnswer: cloneAnswer(question.correctAnswer),
                explanation: question.explanation ?? "",
                marks: question.marks ?? 1,
                difficulty: question.difficulty,
            }));

            const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

            const [created] = await PracticeAttempt.create([{
                practiceId: practice._id,
                learnerId,
                courseId: course._id,
                topicId: topic._id,
                attemptNumber: priorCount + 1,
                status: "IN_PROGRESS",
                startedAt: new Date(),
                questions,
                answers: [],
                totalQuestions: questions.length,
                totalMarks,
                contributeToLearningEvidence: practice.contributeToLearningEvidence ?? false,
            }], { session });

            return created;
        });

        return serializePublicAttempt(attempt, { revealResults: false });
    } catch (error) {
        if (isDuplicateKey(error)) {
            fail(409, "ATTEMPT_START_CONFLICT", "An attempt was started concurrently; refresh and try again");
        }
        throw error;
    }
}

export async function savePracticeAnswerService(learnerId, attemptId, questionId, rawAnswer) {
    requireObjectId(attemptId, "attemptId");
    requireObjectId(questionId, "questionId");

    const attempt = await PracticeAttempt.findOne({ _id: attemptId, learnerId });
    if (!attempt) {
        fail(404, "ATTEMPT_NOT_FOUND", "Practice attempt not found");
    }
    if (attempt.status !== "IN_PROGRESS") {
        fail(409, "ATTEMPT_NOT_IN_PROGRESS", "Answers cannot be changed after submission");
    }

    const course = await Course.findById(attempt.courseId);
    if (!course || course.status !== "PUBLISHED") {
        fail(409, "COURSE_NOT_AVAILABLE", "The course is not available to learners");
    }

    const enrollment = await Enrollment.findOne({ learnerId, courseId: attempt.courseId, status: "ACTIVE" });
    if (!enrollment) {
        fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to practice");
    }

    const question = attempt.questions.find((item) => sameId(item.questionId, questionId));
    if (!question) {
        fail(404, "ATTEMPT_QUESTION_NOT_FOUND", "Question does not belong to this attempt");
    }

    const answer = normalizeAnswer(question.type, rawAnswer);
    if (answer != null && question.type !== "TRUE_FALSE") {
        const validKeys = new Set(question.options.map((option) => option.key));
        const keys = Array.isArray(answer) ? answer : [answer];
        if (keys.some((key) => !validKeys.has(key))) {
            fail(400, "INVALID_ANSWER_OPTION", "Answer contains an option that is not available for this question");
        }
    }

    const existing = attempt.answers.find((item) => sameId(item.questionId, questionId));
    if (existing) {
        existing.answer = answer;
    } else {
        attempt.answers.push({ questionId: question.questionId, answer });
    }

    try {
        await attempt.save();
    } catch (error) {
        if (isVersionError(error)) {
            const fresh = await PracticeAttempt.findOne({ _id: attemptId, learnerId });
            if (fresh && fresh.status !== "IN_PROGRESS") {
                fail(409, "ATTEMPT_NOT_IN_PROGRESS", "Answers cannot be changed after submission");
            }
            fail(409, "ATTEMPT_CHANGED", "Attempt changed concurrently; reload and save the answer again");
        }
        throw error;
    }

    return serializePublicAttempt(attempt, { revealResults: false });
}

export async function submitPracticeAttemptService(learnerId, attemptId, answersPayload = null, reason = "MANUAL") {
    requireObjectId(attemptId, "attemptId");

    let attempt = await PracticeAttempt.findOne({ _id: attemptId, learnerId });
    if (!attempt) {
        fail(404, "ATTEMPT_NOT_FOUND", "Practice attempt not found");
    }

    // Idempotent submission: if already submitted, return finalized results
    if (attempt.status === "SUBMITTED") {
        return serializePublicAttempt(attempt, { revealResults: true });
    }

    const course = await Course.findById(attempt.courseId);
    if (!course || course.status !== "PUBLISHED") {
        fail(409, "COURSE_NOT_AVAILABLE", "The course is not available to learners");
    }

    const enrollment = await Enrollment.findOne({ learnerId, courseId: attempt.courseId, status: "ACTIVE" });
    if (!enrollment) {
        fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to submit practice");
    }

    // Apply batch answers if provided in submission payload
    if (Array.isArray(answersPayload)) {
        for (const item of answersPayload) {
            if (!item?.questionId) continue;
            const question = attempt.questions.find((q) => sameId(q.questionId, item.questionId));
            if (!question) {
                fail(404, "ATTEMPT_QUESTION_NOT_FOUND", `Question ${item.questionId} does not belong to this attempt`);
            }
            const normalized = normalizeAnswer(question.type, item.answer);
            if (normalized != null && question.type !== "TRUE_FALSE") {
                const validKeys = new Set(question.options.map((option) => option.key));
                const keys = Array.isArray(normalized) ? normalized : [normalized];
                if (keys.some((key) => !validKeys.has(key))) {
                    fail(400, "INVALID_ANSWER_OPTION", "Answer contains an option that is not available for this question");
                }
            }
            const existing = attempt.answers.find((a) => sameId(a.questionId, item.questionId));
            if (existing) {
                existing.answer = normalized;
            } else {
                attempt.answers.push({ questionId: question.questionId, answer: normalized });
            }
        }
    }

    const result = calculateResult(attempt);
    attempt.status = "SUBMITTED";
    attempt.submittedAt = new Date();
    attempt.submissionReason = reason;
    attempt.marksAwarded = result.marksAwarded;
    attempt.totalMarks = result.totalMarks;
    attempt.scorePercent = result.scorePercent;
    attempt.correctCount = result.correctCount;

    try {
        await attempt.save();
    } catch (error) {
        if (isVersionError(error)) {
            const fresh = await PracticeAttempt.findOne({ _id: attemptId, learnerId });
            if (fresh && fresh.status === "SUBMITTED") {
                if (fresh.contributeToLearningEvidence) {
                    try {
                        await recordPracticeEvidenceService(fresh);
                    } catch (evidenceError) {
                        console.error("Failed to record learning evidence for practice attempt:", evidenceError);
                    }
                }
                return serializePublicAttempt(fresh, { revealResults: true });
            }
            fail(409, "ATTEMPT_CHANGED", "Attempt changed concurrently; reload and submit again");
        }
        throw error;
    }

    if (attempt.contributeToLearningEvidence) {
        try {
            await recordPracticeEvidenceService(attempt);
        } catch (evidenceError) {
            console.error("Failed to record learning evidence for practice attempt:", evidenceError);
        }
    }

    return serializePublicAttempt(attempt, { revealResults: true });
}

export async function getPracticeAttemptService(learnerId, attemptId) {
    requireObjectId(attemptId, "attemptId");
    const attempt = await PracticeAttempt.findOne({ _id: attemptId, learnerId });
    if (!attempt) {
        fail(404, "ATTEMPT_NOT_FOUND", "Practice attempt not found");
    }
    const course = await Course.findById(attempt.courseId);
    if (!course || course.status === "ARCHIVED") {
        fail(404, "COURSE_NOT_FOUND", "Course not found");
    }
    const enrollment = await Enrollment.findOne({ learnerId, courseId: attempt.courseId, status: "ACTIVE" });
    if (!enrollment) {
        fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view this practice attempt");
    }
    return serializePublicAttempt(attempt);
}

export async function getPracticeAttemptHistoryService(learnerId, practiceId) {
    requireObjectId(practiceId, "practiceId");
    const practice = await Practice.findById(practiceId).select("_id courseId topicId title description contributeToLearningEvidence status");
    if (!practice || practice.status !== "PUBLISHED") {
        fail(404, "PRACTICE_NOT_FOUND", "Practice not found");
    }

    const course = await Course.findById(practice.courseId);
    if (!course || course.status !== "PUBLISHED") {
        fail(404, "PRACTICE_NOT_FOUND", "Practice not found");
    }

    const enrollment = await Enrollment.findOne({ learnerId, courseId: course._id, status: "ACTIVE" });
    if (!enrollment) {
        fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required to view practice history");
    }

    const attempts = await PracticeAttempt.find({ practiceId, learnerId }).sort({ attemptNumber: -1 });
    const results = attempts.map((attempt) => ({
        _id: attempt._id,
        practiceId: attempt.practiceId,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        submissionReason: attempt.submissionReason,
        totalQuestions: attempt.totalQuestions,
        totalMarks: attempt.totalMarks,
        marksAwarded: attempt.status === "SUBMITTED" ? attempt.marksAwarded : null,
        scorePercent: attempt.status === "SUBMITTED" ? attempt.scorePercent : null,
        correctCount: attempt.status === "SUBMITTED" ? attempt.correctCount : null,
        contributeToLearningEvidence: attempt.contributeToLearningEvidence,
    }));

    return {
        practice: {
            _id: practice._id,
            courseId: practice.courseId,
            topicId: practice.topicId,
            title: practice.title,
            description: practice.description,
            contributeToLearningEvidence: practice.contributeToLearningEvidence,
        },
        attempts: results,
    };
}

