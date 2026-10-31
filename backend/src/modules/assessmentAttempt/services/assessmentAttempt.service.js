import mongoose from "mongoose";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../models/assessmentAttempt.model.js";
import { Course } from "../../course/models/course.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { assertTopicUnlockedForLearner, assertAllTopicsCompletedForCourse } from "../../topic/services/topicProgression.service.js";
import { assertTopicLearningReady } from "../../topic/services/topicLearningReadiness.service.js";
import { Question } from "../../question/models/question.model.js";
import { recordAssessmentEvidenceService } from "../../learningEvidence/services/learningEvidence.service.js";
import { withTransaction } from "../../../shared/utils/withTransaction.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function fail(status, code, message, details = null) { throw new ApiError(status, code, message, details); }
function sameId(a, b) { return a != null && b != null && a.toString() === b.toString(); }
function requireObjectId(value, field) {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) fail(400, "INVALID_ID", `${field} is invalid`);
}
function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
function cloneAnswer(answer) {
    return Array.isArray(answer) ? [...answer] : answer;
}
function normalizeAnswer(type, answer) {
    if (answer == null) return null;
    if (type === "MCQ_SINGLE") {
        if (typeof answer !== "string" || !/^[A-Z]$/.test(answer)) fail(400, "INVALID_ANSWER", "MCQ_SINGLE answers must be one option key");
        return answer;
    }
    if (type === "TRUE_FALSE") {
        if (answer !== "TRUE" && answer !== "FALSE") fail(400, "INVALID_ANSWER", "TRUE_FALSE answers must be TRUE or FALSE");
        return answer;
    }
    if (type === "MCQ_MULTIPLE") {
        if (!Array.isArray(answer) || answer.length < 1 || answer.some((key) => typeof key !== "string" || !/^[A-Z]$/.test(key))) {
            fail(400, "INVALID_ANSWER", "MCQ_MULTIPLE answers must be an array of option keys");
        }
        if (new Set(answer).size !== answer.length) fail(400, "INVALID_ANSWER", "Duplicate answer option keys are not allowed");
        return [...answer].sort();
    }
    fail(400, "INVALID_ANSWER", "Unsupported question type");
}
function answersEqual(type, actual, expected) {
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
    for (const question of attempt.questions) {
        const submitted = answerFor(attempt, question.questionId);
        if (answersEqual(question.type, submitted, question.correctAnswer)) marksAwarded += question.marks;
    }
    const totalMarks = attempt.questions.reduce((sum, question) => sum + question.marks, 0);
    const scorePercent = totalMarks === 0 ? 0 : Number(((marksAwarded / totalMarks) * 100).toFixed(2));
    return { marksAwarded, totalMarks, scorePercent, passed: scorePercent >= attempt.passingScore };
}
function isPastDeadline(attempt, now = new Date()) {
    return attempt.deadlineAt != null && now.getTime() >= new Date(attempt.deadlineAt).getTime();
}
function deadlineReason(attempt) {
    return attempt.deadlineReason ?? "TIME_LIMIT";
}
function isVersionError(error) {
    return error?.name === "VersionError" || error instanceof mongoose.Error.VersionError;
}

async function finalizeDocument(attempt, reason, now = new Date(), retryCount = 0) {
    if (attempt.status !== "IN_PROGRESS") return attempt;
    const effectiveReason = isPastDeadline(attempt, now) ? deadlineReason(attempt) : reason;
    const result = calculateResult(attempt);
    attempt.status = "SUBMITTED";
    attempt.submittedAt = now;
    attempt.submissionReason = effectiveReason;
    attempt.marksAwarded = result.marksAwarded;
    attempt.totalMarks = result.totalMarks;
    attempt.scorePercent = result.scorePercent;
    attempt.passed = result.passed;
    try {
        await attempt.save();
        try {
            await recordAssessmentEvidenceService(attempt);
        } catch (evidenceError) {
            console.error("Failed to record learning evidence for assessment attempt:", evidenceError);
        }
        return attempt;
    } catch (error) {
        if (isVersionError(error)) {
            const fresh = await AssessmentAttempt.findOne({ _id: attempt._id, learnerId: attempt.learnerId });
            if (!fresh) throw error;
            if (fresh.status === "SUBMITTED") {
                try {
                    await recordAssessmentEvidenceService(fresh);
                } catch (evidenceError) {
                    console.error("Failed to record learning evidence for assessment attempt:", evidenceError);
                }
                return fresh;
            }
            if (retryCount < 1) {
                const retryNow = new Date();
                const retryReason = isPastDeadline(fresh, retryNow) ? deadlineReason(fresh) : reason;
                return finalizeDocument(fresh, retryReason, retryNow, retryCount + 1);
            }
            fail(409, "ATTEMPT_CHANGED", "Attempt changed concurrently; reload and submit again");
        }
        throw error;
    }
}
async function finalizeIfDeadlinePassed(attempt) {
    if (attempt.status === "IN_PROGRESS" && isPastDeadline(attempt)) {
        return finalizeDocument(attempt, deadlineReason(attempt));
    }
    return attempt;
}
function publicAttempt(attempt, { revealResults = attempt.status === "SUBMITTED" } = {}) {
    const answers = new Map(attempt.answers.map((item) => [item.questionId.toString(), item.answer]));
    return {
        _id: attempt._id,
        assessmentId: attempt.assessmentId,
        learnerId: attempt.learnerId,
        courseId: attempt.courseId,
        assessmentType: attempt.assessmentType,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        submittedAt: attempt.submittedAt,
        submissionReason: attempt.submissionReason,
        passingScore: attempt.passingScore,
        questions: attempt.questions.map((question) => {
            const item = {
                questionId: question.questionId,
                questionText: question.questionText,
                type: question.type,
                options: question.options,
                marks: question.marks,
                answer: answers.get(question.questionId.toString()) ?? null,
            };
            if (revealResults) {
                item.correctAnswer = question.correctAnswer;
                item.explanation = question.explanation;
                item.isCorrect = answersEqual(question.type, item.answer, question.correctAnswer);
            }
            return item;
        }),
        totalMarks: attempt.totalMarks,
        marksAwarded: revealResults ? attempt.marksAwarded : null,
        scorePercent: revealResults ? attempt.scorePercent : null,
        passed: revealResults ? attempt.passed : null,
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt,
    };
}
function isDuplicateKey(error) {
    if (error?.code === 11000 || error?.code === 11001) return true;
    if (error?.errorResponse?.code === 11000 || error?.errorResponse?.code === 11001) return true;
    if (error?.writeErrors?.some((e) => e.code === 11000 || e.code === 11001)) return true;
    if (typeof error?.message === "string" && /E11000|E11001/.test(error.message)) return true;
    return false;
}

export async function startAssessmentAttemptService(learnerId, assessmentId) {
    requireObjectId(learnerId, "learnerId");
    requireObjectId(assessmentId, "assessmentId");
    try {
        const attempt = await withTransaction(async (session) => {
            const assessment = await Assessment.findById(assessmentId).session(session);
            if (!assessment || assessment.status !== "PUBLISHED") fail(404, "ASSESSMENT_NOT_AVAILABLE", "Published assessment not found");
            const course = await Course.findById(assessment.courseId).session(session);
            if (!course || course.status !== "PUBLISHED") fail(409, "COURSE_NOT_AVAILABLE", "The course is not available to learners");

            // Write fences serialize attempt creation against assessment/course lifecycle changes.
            const assessmentFence = await Assessment.updateOne(
                { _id: assessment._id, status: "PUBLISHED" },
                { $inc: { attemptVersion: 1 } },
                { session }
            );
            if (assessmentFence.modifiedCount !== 1) fail(409, "ASSESSMENT_STATE_CHANGED", "Assessment changed while the attempt was starting; retry");
            const courseFence = await Course.updateOne(
                { _id: course._id, status: "PUBLISHED" },
                { $inc: { lifecycleVersion: 1 } },
                { session }
            );
            if (courseFence.modifiedCount !== 1) fail(409, "COURSE_STATE_CHANGED", "Course changed while the attempt was starting; retry");

            if (assessment.type === "DIAGNOSTIC") {
                if (!course.diagnosticPolicy?.enabled) fail(409, "DIAGNOSTIC_ASSESSMENT_DISABLED", "Diagnostic assessment is disabled for this course");
            } else {
                const enrollment = await Enrollment.findOne({ learnerId, courseId: course._id, status: "ACTIVE" }).session(session);
                if (!enrollment) fail(403, "ACTIVE_ENROLLMENT_REQUIRED", "An active course enrollment is required for this assessment");
                const enrollmentFence = await Enrollment.updateOne(
                    { _id: enrollment._id, status: "ACTIVE" },
                    { $inc: { attemptVersion: 1 } },
                    { session }
                );
                if (enrollmentFence.modifiedCount !== 1) fail(409, "ENROLLMENT_STATE_CHANGED", "Enrollment changed while the attempt was starting; retry");

                if (assessment.type === "TOPIC" && assessment.topicId) {
                    await assertTopicUnlockedForLearner(learnerId, course, assessment.topicId, session);
                    await assertTopicLearningReady(learnerId, assessment.topicId, session);
                } else if (assessment.type === "FINAL") {
                    await assertAllTopicsCompletedForCourse(learnerId, course, session);
                }
            }
            const now = new Date();
            if (assessment.opensAt && now < new Date(assessment.opensAt)) fail(409, "ASSESSMENT_NOT_OPEN", "Assessment is not open yet");
            if (assessment.closesAt && now >= new Date(assessment.closesAt)) fail(409, "ASSESSMENT_CLOSED", "The assessment start window has closed");
            const inProgress = await AssessmentAttempt.findOne({ assessmentId, learnerId, status: "IN_PROGRESS" }).session(session);
            if (inProgress) fail(409, "ATTEMPT_ALREADY_IN_PROGRESS", "Finish the existing attempt before starting another");
            const priorCount = await AssessmentAttempt.countDocuments({ assessmentId, learnerId }).session(session);
            if (priorCount >= assessment.maxAttempts) fail(409, "MAX_ATTEMPTS_REACHED", "No attempts remain for this assessment");
            const ids = assessment.questionIds ?? [];
            const questionQuery = Question.find({ _id: { $in: ids }, status: "ACTIVE", courseId: course._id });
            const sourceQuestions = await questionQuery.session(session);
            if (sourceQuestions.length !== ids.length || sourceQuestions.length < assessment.questionsPerAttempt) {
                fail(409, "ASSESSMENT_QUESTION_POOL_CHANGED", "The published assessment no longer has enough eligible questions");
            }
            const byId = new Map(sourceQuestions.map((question) => [question._id.toString(), question]));
            let pool = ids.map((id) => byId.get(id.toString())).filter(Boolean);
            if (assessment.randomizeQuestions) pool = shuffle(pool);
            pool = pool.slice(0, assessment.questionsPerAttempt);
            const questions = pool.map((question) => {
                let options = (question.options ?? []).map((option) => ({ key: option.key, text: option.text }));
                if (assessment.randomizeOptions) options = shuffle(options);
                return {
                    questionId: question._id,
                    questionText: question.questionText,
                    type: question.type,
                    options,
                    correctAnswer: cloneAnswer(question.correctAnswer),
                    explanation: question.explanation ?? "",
                    marks: question.marks,
                };
            });
            const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
            let deadlineAt = null;
            let attemptDeadlineReason = null;
            if (assessment.timeLimitMinutes != null) {
                deadlineAt = new Date(now.getTime() + assessment.timeLimitMinutes * 60_000);
                attemptDeadlineReason = "TIME_LIMIT";
            }
            if (assessment.closesAt && (!deadlineAt || new Date(assessment.closesAt) < deadlineAt)) {
                deadlineAt = new Date(assessment.closesAt);
                attemptDeadlineReason = "WINDOW_CLOSED";
            }
            const [created] = await AssessmentAttempt.create([{
                assessmentId: assessment._id,
                learnerId,
                courseId: course._id,
                assessmentType: assessment.type,
                attemptNumber: priorCount + 1,
                status: "IN_PROGRESS",
                startedAt: now,
                deadlineAt,
                deadlineReason: attemptDeadlineReason,
                passingScore: assessment.passingScore,
                questions,
                answers: [],
                totalMarks,
            }], { session });
            return created;
        });
        return publicAttempt(attempt, { revealResults: false });
    } catch (error) {
        if (isDuplicateKey(error)) fail(409, "ATTEMPT_START_CONFLICT", "An attempt was started concurrently; refresh the assessment and try again");
        throw error;
    }
}

export async function saveAssessmentAnswerService(learnerId, attemptId, questionId, rawAnswer) {
    requireObjectId(attemptId, "attemptId");
    requireObjectId(questionId, "questionId");
    let attempt = await AssessmentAttempt.findOne({ _id: attemptId, learnerId });
    if (!attempt) fail(404, "ATTEMPT_NOT_FOUND", "Assessment attempt not found");
    attempt = await finalizeIfDeadlinePassed(attempt);
    if (attempt.status !== "IN_PROGRESS") fail(409, "ATTEMPT_NOT_IN_PROGRESS", "Answers cannot be changed after submission");
    const question = attempt.questions.find((item) => sameId(item.questionId, questionId));
    if (!question) fail(404, "ATTEMPT_QUESTION_NOT_FOUND", "Question does not belong to this attempt");
    const answer = normalizeAnswer(question.type, rawAnswer);
    if (answer != null && question.type !== "TRUE_FALSE") {
        const validKeys = new Set(question.options.map((option) => option.key));
        const keys = Array.isArray(answer) ? answer : [answer];
        if (keys.some((key) => !validKeys.has(key))) fail(400, "INVALID_ANSWER_OPTION", "Answer contains an option that is not available for this question");
    }
    const existing = attempt.answers.find((item) => sameId(item.questionId, questionId));
    if (existing) existing.answer = answer;
    else attempt.answers.push({ questionId: question.questionId, answer });
    try {
        await attempt.save();
    } catch (error) {
        if (isVersionError(error)) {
            let fresh = await AssessmentAttempt.findOne({ _id: attemptId, learnerId });
            if (fresh) {
                fresh = await finalizeIfDeadlinePassed(fresh);
                if (fresh.status !== "IN_PROGRESS") {
                    fail(409, "ATTEMPT_NOT_IN_PROGRESS", "Answers cannot be changed after submission");
                }
            }
            fail(409, "ATTEMPT_CHANGED", "Attempt changed concurrently; reload and save the answer again");
        }
        throw error;
    }
    return publicAttempt(attempt, { revealResults: false });
}

export async function submitAssessmentAttemptService(learnerId, attemptId, reason = "MANUAL") {
    requireObjectId(attemptId, "attemptId");
    if (!["MANUAL", "LEFT"].includes(reason)) fail(400, "INVALID_SUBMISSION_REASON", "Submission reason must be MANUAL or LEFT");
    let attempt = await AssessmentAttempt.findOne({ _id: attemptId, learnerId });
    if (!attempt) fail(404, "ATTEMPT_NOT_FOUND", "Assessment attempt not found");
    if (attempt.status === "IN_PROGRESS" && isPastDeadline(attempt)) {
        attempt = await finalizeDocument(attempt, deadlineReason(attempt));
    } else if (attempt.status === "IN_PROGRESS") {
        attempt = await finalizeDocument(attempt, reason);
    }
    return publicAttempt(attempt, { revealResults: true });
}

export async function getAssessmentAttemptService(learnerId, attemptId) {
    requireObjectId(attemptId, "attemptId");
    let attempt = await AssessmentAttempt.findOne({ _id: attemptId, learnerId });
    if (!attempt) fail(404, "ATTEMPT_NOT_FOUND", "Assessment attempt not found");
    attempt = await finalizeIfDeadlinePassed(attempt);
    return publicAttempt(attempt);
}

export async function getAssessmentAttemptHistoryService(learnerId, assessmentId) {
    requireObjectId(assessmentId, "assessmentId");
    const assessment = await Assessment.findById(assessmentId).select("_id courseId type title");
    if (!assessment) fail(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    const attempts = await AssessmentAttempt.find({ assessmentId, learnerId }).sort({ attemptNumber: -1 });
    const results = [];
    for (let attempt of attempts) {
        attempt = await finalizeIfDeadlinePassed(attempt);
        results.push({
            _id: attempt._id,
            assessmentId: attempt.assessmentId,
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            startedAt: attempt.startedAt,
            deadlineAt: attempt.deadlineAt,
            submittedAt: attempt.submittedAt,
            submissionReason: attempt.submissionReason,
            totalMarks: attempt.totalMarks,
            marksAwarded: attempt.status === "SUBMITTED" ? attempt.marksAwarded : null,
            scorePercent: attempt.status === "SUBMITTED" ? attempt.scorePercent : null,
            passed: attempt.status === "SUBMITTED" ? attempt.passed : null,
        });
    }
    return { assessment: { _id: assessment._id, courseId: assessment.courseId, type: assessment.type, title: assessment.title }, attempts: results };
}
