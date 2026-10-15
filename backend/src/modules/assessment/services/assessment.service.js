import { Assessment } from "../models/assessment.model.js";
import { withTransaction } from "../../../shared/utils/withTransaction.js";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { QuestionBank } from "../../questionBank/models/questionBank.model.js";
import { Question } from "../../question/models/question.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

const TYPES = new Set(["TOPIC", "DIAGNOSTIC", "FINAL"]);
const EDITABLE = new Set([
    "title", "description", "questionIds", "questionsPerAttempt",
    "passingScore", "maxAttempts", "randomizeQuestions", "randomizeOptions",
    "timeLimitMinutes", "opensAt", "closesAt",
]);
const DIAGNOSTIC_POLICY_FIELDS = new Set([
    "passingScore", "questionsPerAttempt", "randomizeQuestions",
]);
const MAX_POOL = 200;

function error(status, code, message, details = null) {
    throw new ApiError(status, code, message, details);
}
function sameId(a, b) {
    return a != null && b != null && a.toString() === b.toString();
}
function requireId(value, field) {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(value.toString())) {
        error(400, "INVALID_ID", `${field} is invalid`);
    }
}
function normalizeIds(ids = []) {
    if (!Array.isArray(ids) || ids.length > MAX_POOL) {
        error(400, "INVALID_QUESTION_POOL", "questionIds must be an array of at most 200 questions");
    }
    const values = ids.map(String);
    if (new Set(values.map((v) => v.toLowerCase())).size !== values.length) {
        error(400, "DUPLICATE_QUESTION_IDS", "Duplicate question IDs are not allowed");
    }
    values.forEach((id) => requireId(id, "questionId"));
    return ids;
}
function assertUsableCourse(course) {
    if (!course || course.status === "ARCHIVED") {
        error(404, "COURSE_NOT_FOUND", "Course not found");
    }
}
async function ownedCourse(instructorId, courseId, session = null) {
    requireId(courseId, "courseId");
    const courseQuery = Course.findById(courseId);
    const course = await (session ? courseQuery.session(session) : courseQuery);
    if (!course || !sameId(course.createdBy, instructorId)) {
        error(404, "COURSE_NOT_FOUND", "Course not found");
    }
    assertUsableCourse(course);
    return course;
}
async function ownedAssessment(instructorId, assessmentId, session = null) {
    requireId(assessmentId, "assessmentId");
    const assessmentQuery = Assessment.findById(assessmentId);
    const assessment = await (session ? assessmentQuery.session(session) : assessmentQuery);
    if (!assessment || !sameId(assessment.createdBy, instructorId)) {
        error(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    }
    const courseQuery = Course.findById(assessment.courseId);
    const course = await (session ? courseQuery.session(session) : courseQuery);
    if (!course || !sameId(course.createdBy, instructorId)) {
        error(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    }
    return { assessment, course };
}
function diagnosticSettings(course) {
    const p = course.diagnosticPolicy;
    if (!p || p.enabled !== true) {
        error(409, "DIAGNOSTIC_ASSESSMENT_DISABLED", "Diagnostic assessment is disabled for this course");
    }
    if (
        !Number.isFinite(p.passingScore) || p.passingScore < 0 || p.passingScore > 100 ||
        !Number.isInteger(p.questionsPerAttempt) || p.questionsPerAttempt < 5 ||
        p.questionsPerAttempt > 10 || typeof p.randomizeQuestions !== "boolean"
    ) {
        error(400, "INVALID_DIAGNOSTIC_POLICY", "Enabled diagnosticPolicy must have passingScore 0-100, questionsPerAttempt 5-10, and boolean randomizeQuestions");
    }
    return {
        passingScore: p.passingScore,
        questionsPerAttempt: p.questionsPerAttempt,
        randomizeQuestions: p.randomizeQuestions,
    };
}
function validateConfig(a) {
    if (!TYPES.has(a.type)) error(400, "INVALID_ASSESSMENT_TYPE", "Unsupported assessment type");
    if (!Number.isInteger(a.questionsPerAttempt) || a.questionsPerAttempt < 5 || a.questionsPerAttempt > 10) {
        error(400, "INVALID_QUESTIONS_PER_ATTEMPT", "questionsPerAttempt must be an integer from 5 to 10");
    }
    if (!Number.isFinite(a.passingScore) || a.passingScore < 0 || a.passingScore > 100) {
        error(400, "INVALID_PASSING_SCORE", "passingScore must be between 0 and 100");
    }
    if (!Number.isInteger(a.maxAttempts) || a.maxAttempts < 1) {
        error(400, "INVALID_MAX_ATTEMPTS", "maxAttempts must be a positive integer");
    }
    if (a.timeLimitMinutes != null && (!Number.isInteger(a.timeLimitMinutes) || a.timeLimitMinutes < 1)) {
        error(400, "INVALID_TIME_LIMIT", "timeLimitMinutes must be a positive integer or null");
    }
    for (const key of ["opensAt", "closesAt"]) {
        if (a[key] != null && Number.isNaN(new Date(a[key]).getTime())) {
            error(400, "INVALID_AVAILABILITY_WINDOW", `${key} is not a valid date`);
        }
    }
    if (a.opensAt != null && a.closesAt != null && new Date(a.opensAt) >= new Date(a.closesAt)) {
        error(400, "INVALID_AVAILABILITY_WINDOW", "closesAt must be later than opensAt");
    }
    if (typeof a.randomizeQuestions !== "boolean" || typeof a.randomizeOptions !== "boolean") {
        error(400, "INVALID_RANDOMIZATION_SETTINGS", "Randomization settings must be booleans");
    }
}
async function scopeFor(instructorId, courseId, type, topicId = null, session = null) {
    const course = await ownedCourse(instructorId, courseId, session);
    if (type !== "TOPIC") {
        if (topicId != null) error(400, "TOPIC_NOT_ALLOWED", "Only TOPIC assessments can specify topicId");
        return { course, topic: null };
    }
    if (!topicId) error(400, "TOPIC_REQUIRED", "topicId is required for TOPIC assessments");
    requireId(topicId, "topicId");
    const topicQuery = Topic.findById(topicId);
    const topic = await (session ? topicQuery.session(session) : topicQuery);
    if (!topic || !sameId(topic.courseId, course._id)) {
        error(404, "TOPIC_NOT_FOUND", "Topic not found in this course");
    }
    const bankQuery = QuestionBank.findOne({ courseId: course._id, topicId: topic._id });
    const bank = await (session ? bankQuery.session(session) : bankQuery);
    if (!bank) error(404, "QUESTION_BANK_NOT_FOUND", "Question Bank not found for this topic");
    if (bank.status !== "ACTIVE" || !sameId(bank.createdBy, course.createdBy)) {
        error(409, "QUESTION_BANK_UNAVAILABLE", "The topic Question Bank must be active and owned by the course instructor");
    }
    return { course, topic, topicBank: bank };
}
async function validatePool(a, scope, { publishing = false, session = null } = {}) {
    const ids = normalizeIds(a.questionIds ?? []);
    if (publishing && ids.length < a.questionsPerAttempt) {
        error(400, "INSUFFICIENT_QUESTION_POOL", `At least ${a.questionsPerAttempt} eligible questions are required`);
    }
    if (!ids.length) return [];
    const questionQuery = Question.find({
        _id: { $in: ids }, courseId: scope.course._id, status: "ACTIVE",
    }).select("_id questionBankId courseId topicId status");
    const questions = await (session ? questionQuery.session(session) : questionQuery);
    if (questions.length !== ids.length) {
        error(400, "INVALID_ASSESSMENT_QUESTIONS", "A selected question is missing, archived, or outside this course");
    }
    if (a.type === "TOPIC" && questions.some((q) => !sameId(q.topicId, scope.topic._id))) {
        error(400, "INVALID_ASSESSMENT_QUESTIONS", "TOPIC assessments may only select questions from their assigned topic");
    }
    const bankIds = [...new Set(questions.map((q) => q.questionBankId.toString()))];
    const bankQuery = QuestionBank.find({ _id: { $in: bankIds } });
    const banks = await (session ? bankQuery.session(session) : bankQuery);
    if (banks.length !== bankIds.length) {
        error(400, "INVALID_ASSESSMENT_QUESTIONS", "A selected question has no valid Question Bank");
    }
    const byId = new Map(banks.map((b) => [b._id.toString(), b]));
    for (const q of questions) {
        const bank = byId.get(q.questionBankId.toString());
        if (!bank || bank.status !== "ACTIVE" ||
            !sameId(bank.courseId, scope.course._id) ||
            !sameId(bank.topicId, q.topicId) ||
            !sameId(bank.createdBy, scope.course.createdBy)) {
            error(409, "QUESTION_BANK_UNAVAILABLE", "Selected questions must belong to active Question Banks in this course");
        }
    }
    const topicIds = [...new Set(questions.map((q) => q.topicId.toString()))];
    const topicQuery = Topic.find({ _id: { $in: topicIds }, courseId: scope.course._id });
    const topics = await (session ? topicQuery.session(session) : topicQuery);
    if (topics.length !== topicIds.length) {
        error(400, "INVALID_ASSESSMENT_QUESTIONS", "A selected question references an invalid topic");
    }
    return questions;
}
async function validatePublishable(a, course, session = null) {
    validateConfig(a);
    const scope = await scopeFor(a.createdBy, a.courseId, a.type, a.topicId, session);
    if (!sameId(scope.course._id, course._id)) error(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    if (a.type === "DIAGNOSTIC") {
        const policy = diagnosticSettings(course);
        if (a.passingScore !== policy.passingScore ||
            a.questionsPerAttempt !== policy.questionsPerAttempt ||
            a.randomizeQuestions !== policy.randomizeQuestions) {
            error(409, "DIAGNOSTIC_POLICY_CHANGED", "Course diagnostic policy changed; reconcile this draft before publishing");
        }
    }
    await validatePool(a, scope, { publishing: true, session });
    return scope;
}
const PUBLISHED_EDITABLE = new Set([
    "title",
    "description",
    "opensAt",
    "closesAt",
    "maxAttempts",
]);

function assertEditable(a, keys = []) {
    if (a.status === "ARCHIVED") {
        error(409, "ASSESSMENT_ARCHIVED", "Archived assessments cannot be edited");
    }

    if (a.status === "PUBLISHED") {
        const forbidden = keys.filter((key) => !PUBLISHED_EDITABLE.has(key));
        if (forbidden.length) {
            error(
                409,
                "PUBLISHED_ASSESSMENT_CONFIG_LOCKED",
                `Published assessment configuration cannot be changed: ${forbidden.join(", ")}`
            );
        }
    }
}

export async function createAssessmentService(instructorId, data) {
    if (!TYPES.has(data.type)) error(400, "INVALID_ASSESSMENT_TYPE", "Unsupported assessment type");
    const scope = await scopeFor(instructorId, data.courseId, data.type, data.topicId ?? null);
    const questionIds = normalizeIds(data.questionIds ?? []);
    const config = {
        questionsPerAttempt: data.questionsPerAttempt ?? 5,
        passingScore: data.passingScore ?? 60,
        randomizeQuestions: data.randomizeQuestions ?? true,
        randomizeOptions: data.randomizeOptions ?? false,
        maxAttempts: data.maxAttempts ?? 1,
        timeLimitMinutes: data.timeLimitMinutes ?? null,
    };
    if (data.type === "DIAGNOSTIC") Object.assign(config, diagnosticSettings(scope.course));
    const candidate = {
        ...data,
        courseId: scope.course._id,
        topicId: data.type === "TOPIC" ? scope.topic._id : null,
        createdBy: instructorId,
        questionIds,
        ...config,
        opensAt: data.opensAt ?? null,
        closesAt: data.closesAt ?? null,
        status: "DRAFT",
    };
    validateConfig(candidate);
    await validatePool(candidate, scope);
    return Assessment.create(candidate);
}

export async function getAssessmentByIdService(instructorId, assessmentId) {
    return (await ownedAssessment(instructorId, assessmentId)).assessment;
}

export async function getAssessmentsByCourseService(instructorId, courseId) {
    const course = await ownedCourse(instructorId, courseId);
    return Assessment.find({ courseId: course._id }).sort({ createdAt: -1, _id: -1 });
}

export async function getAssessmentsByTopicService(instructorId, topicId) {
    requireId(topicId, "topicId");
    const topic = await Topic.findById(topicId);
    if (!topic) error(404, "TOPIC_NOT_FOUND", "Topic not found");
    const course = await ownedCourse(instructorId, topic.courseId);
    return Assessment.find({ courseId: course._id, topicId: topic._id }).sort({ createdAt: -1, _id: -1 });
}

export async function updateAssessmentService(instructorId, assessmentId, data) {
    const { assessment } = await ownedAssessment(instructorId, assessmentId);
    const keys = Object.keys(data ?? {});
    if (!keys.length) error(400, "EMPTY_UPDATE", "At least one field must be provided");

    assertEditable(assessment, keys);

    const forbidden = keys.filter((key) => !EDITABLE.has(key));
    if (forbidden.length) {
        error(400, "FIELD_NOT_EDITABLE", `These fields cannot be updated: ${forbidden.join(", ")}`);
    }
    if (assessment.type === "DIAGNOSTIC" && keys.some((key) => DIAGNOSTIC_POLICY_FIELDS.has(key))) {
        error(400, "DIAGNOSTIC_SETTINGS_CONTROLLED_BY_COURSE", "Diagnostic passing score, question count, and question randomization are controlled by Course.diagnosticPolicy");
    }
    if (
        assessment.status === "PUBLISHED" &&
        data.maxAttempts !== undefined &&
        data.maxAttempts < assessment.maxAttempts
    ) {
        error(
            409,
            "PUBLISHED_ATTEMPTS_CANNOT_DECREASE",
            "maxAttempts can be increased after publication but cannot be reduced"
        );
    }

    const scope = await scopeFor(instructorId, assessment.courseId, assessment.type, assessment.topicId);
    const candidate = { ...assessment.toObject(), ...data };
    if (data.questionIds !== undefined) candidate.questionIds = normalizeIds(data.questionIds);
    validateConfig(candidate);
    await validatePool(candidate, scope, { publishing: assessment.status === "PUBLISHED" });

    // Published assessments permit metadata/window/attempt-limit changes only.
    // Compare-and-swap prevents stale reads from overwriting newer writes.
    const set = Object.fromEntries(keys.map((key) => [key, candidate[key]]));
    const updated = await Assessment.findOneAndUpdate(
        {
            _id: assessment._id,
            createdBy: instructorId,
            status: assessment.status,
            __v: assessment.__v ?? 0,
        },
        { $set: set, $inc: { __v: 1 } },
        { returnDocument: "after", runValidators: true }
    );

    if (!updated) {
        error(409, "ASSESSMENT_STATE_CHANGED", "Assessment changed while being updated; reload and retry");
    }

    return updated;
}

export async function publishAssessmentService(instructorId, assessmentId) {
    return withTransaction(async (session) => {
        const { assessment: foundAssessment, course } = await ownedAssessment(instructorId, assessmentId, session);
        let assessment = foundAssessment;
        if (assessment.status === "PUBLISHED") error(409, "ASSESSMENT_ALREADY_PUBLISHED", "Assessment is already published");
        if (assessment.status === "ARCHIVED") error(409, "ASSESSMENT_ARCHIVED", "Archived assessments cannot be published");

        // Write fence against concurrent diagnosticPolicy edits on draft courses.
        // Both operations write the same Course document inside transactions.
        const courseFence = await Course.updateOne(
            { _id: course._id, status: { $ne: "ARCHIVED" } },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (courseFence.modifiedCount !== 1) error(409, "COURSE_STATE_CHANGED", "Course changed during assessment publication; retry");

        if (assessment.type === "DIAGNOSTIC") {
            const policy = diagnosticSettings(course);
            const stale = assessment.passingScore !== policy.passingScore ||
                assessment.questionsPerAttempt !== policy.questionsPerAttempt ||
                assessment.randomizeQuestions !== policy.randomizeQuestions;
            if (stale) {
                const synchronized = await Assessment.findOneAndUpdate(
                    { _id: assessment._id, createdBy: instructorId, status: "DRAFT", __v: assessment.__v ?? 0,
                      passingScore: assessment.passingScore, questionsPerAttempt: assessment.questionsPerAttempt,
                      randomizeQuestions: assessment.randomizeQuestions, questionIds: { $eq: assessment.questionIds } },
                    { $set: policy, $inc: { __v: 1 } },
                    { returnDocument: "after", runValidators: true, session }
                );
                if (!synchronized) error(409, "ASSESSMENT_STATE_CHANGED", "Assessment changed while diagnostic policy was synchronized; reload and retry");
                assessment = synchronized;
            }
        }
        await validatePublishable(assessment, course, session);
        const ids = normalizeIds(assessment.questionIds ?? []);
        const questionTouch = await Question.updateMany(
            { _id: { $in: ids }, status: "ACTIVE", courseId: course._id },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (questionTouch.modifiedCount !== ids.length) error(409, "ASSESSMENT_STATE_CHANGED", "A selected question changed during publication; reload and retry");
        const bankIds = [...new Set((await Question.find({ _id: { $in: ids } }).select("questionBankId").session(session)).map((q) => q.questionBankId.toString()))];
        const bankTouch = await QuestionBank.updateMany(
            { _id: { $in: bankIds }, status: "ACTIVE", courseId: course._id },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (bankTouch.modifiedCount !== bankIds.length) error(409, "QUESTION_BANK_UNAVAILABLE", "A selected Question Bank changed during publication; reload and retry");

        const published = await Assessment.findOneAndUpdate(
            { _id: assessment._id, createdBy: instructorId, status: "DRAFT", __v: assessment.__v ?? 0,
              type: assessment.type, courseId: assessment.courseId,
              questionsPerAttempt: assessment.questionsPerAttempt, passingScore: assessment.passingScore,
              randomizeQuestions: assessment.randomizeQuestions, questionIds: { $eq: assessment.questionIds },
              topicId: assessment.type === "TOPIC" ? assessment.topicId : null },
            { $set: { status: "PUBLISHED" }, $inc: { __v: 1 } },
            { returnDocument: "after", runValidators: true, session }
        );
        if (!published) error(409, "ASSESSMENT_STATE_CHANGED", "Assessment changed during publication; reload and retry");
        return published;
    });
}

export async function archiveAssessmentService(instructorId, assessmentId) {
    requireId(assessmentId, "assessmentId");
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment || !sameId(assessment.createdBy, instructorId)) {
        error(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    }
    if (assessment.status === "ARCHIVED") error(409, "ASSESSMENT_ALREADY_ARCHIVED", "Assessment is already archived");
    const archived = await Assessment.findOneAndUpdate(
        { _id: assessment._id, createdBy: instructorId, status: assessment.status, __v: assessment.__v ?? 0 },
        { $set: { status: "ARCHIVED" }, $inc: { __v: 1 } },
        { returnDocument: "after", runValidators: true }
    );
    if (!archived) error(409, "ASSESSMENT_STATE_CHANGED", "Assessment changed; reload and retry");
    return archived;
}

export async function restoreAssessmentService(instructorId, assessmentId) {
    const { assessment, course } = await ownedAssessment(instructorId, assessmentId);
    if (assessment.status !== "ARCHIVED") error(409, "ASSESSMENT_NOT_ARCHIVED", "Assessment is not archived");
    assertUsableCourse(course);
    if (assessment.type === "TOPIC") {
        const topic = await Topic.findById(assessment.topicId);
        if (!topic || !sameId(topic.courseId, course._id)) error(404, "TOPIC_NOT_FOUND", "Assessment topic no longer exists in this course");
    }
    const restored = await Assessment.findOneAndUpdate(
        { _id: assessment._id, createdBy: instructorId, status: "ARCHIVED", __v: assessment.__v ?? 0 },
        { $set: { status: "DRAFT" }, $inc: { __v: 1 } },
        { returnDocument: "after", runValidators: true }
    );
    if (!restored) error(409, "ASSESSMENT_STATE_CHANGED", "Assessment changed; reload and retry");
    return restored;
}
