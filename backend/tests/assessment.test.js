import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import {
    createAssessmentService,
    getAssessmentByIdService,
    getAssessmentsByCourseService,
    getAssessmentsByTopicService,
    updateAssessmentService,
    publishAssessmentService,
    archiveAssessmentService,
    restoreAssessmentService,
} from "../src/modules/assessment/services/assessment.service.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { Course } from "../src/modules/course/models/course.model.js";
import { normalizeQuestionText } from "../src/shared/utils/textNormalization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TEST_DB_NAME = process.env.TEST_DB_NAME;
const MONGODB_URI = process.env.MONGODB_URI;

function apiError(error, code, status) {
    return error?.code === code && error?.statusCode === status;
}
function sameId(a, b) {
    return a?.toString() === b?.toString();
}
function questionData(text) {
    return {
        questionText: text,
        normalizedQuestionText: normalizeQuestionText(text),
        type: "TRUE_FALSE",
        options: [],
        correctAnswer: "TRUE",
        explanation: "",
        marks: 1,
        difficulty: "EASY",
    };
}

test("Assessment service integration tests", async (t) => {
    const instructorId = new mongoose.Types.ObjectId();
    const otherInstructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    let connected = false;
    let course;
    let otherCourse;
    let topic1;
    let topic2;
    let bank1;
    let bank2;
    let otherTopic;
    let otherBank;
    let questionCounter = 0;

    t.after(async () => {
        if (!connected) return;
        try {
            await Assessment.deleteMany({ createdBy: instructorId });
            await Question.deleteMany({ createdBy: { $in: [instructorId, otherInstructorId] } });
            await QuestionBank.deleteMany({ createdBy: { $in: [instructorId, otherInstructorId] } });
            await Topic.deleteMany({ courseId: { $in: [courseId, otherCourse?._id].filter(Boolean) } });
            await Course.deleteMany({ _id: { $in: [courseId, otherCourse?._id].filter(Boolean) } });
        } finally {
            await mongoose.disconnect();
        }
    });

    assert.ok(MONGODB_URI, "MONGODB_URI is missing from backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with '_test'");
    assert.notEqual(TEST_DB_NAME, process.env.DB_NAME, "TEST_DB_NAME must differ from DB_NAME");
    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME, "Refusing to write to an unexpected database");

    await Promise.all([Assessment.init(), Question.init(), QuestionBank.init(), Topic.init(), Course.init()]);

    course = await Course.create({
        _id: courseId,
        title: "Assessment Integration Test Course",
        description: "Course created for isolated assessment integration tests.",
        createdBy: instructorId,
        domain: "Testing",
        category: "Testing",
        difficulty: "BEGINNER",
        objectives: [],
        diagnosticPolicy: { enabled: true, passingScore: 65, questionsPerAttempt: 5, randomizeQuestions: true },
    });
    otherCourse = await Course.create({
        title: "Other Assessment Test Course",
        description: "Separate course for assessment authorization tests.",
        createdBy: otherInstructorId,
        domain: "Testing",
        category: "Testing",
        difficulty: "BEGINNER",
        objectives: [],
    });

    topic1 = await Topic.create({ courseId: course._id, title: "Assessment Test Topic One", learningObjectives: [], order: 1 });
    topic2 = await Topic.create({ courseId: course._id, title: "Assessment Test Topic Two", learningObjectives: [], order: 2 });
    otherTopic = await Topic.create({ courseId: otherCourse._id, title: "Other Assessment Test Topic", learningObjectives: [], order: 1 });
    bank1 = await QuestionBank.create({ courseId: course._id, topicId: topic1._id, createdBy: instructorId, title: "Assessment Test Bank One" });
    bank2 = await QuestionBank.create({ courseId: course._id, topicId: topic2._id, createdBy: instructorId, title: "Assessment Test Bank Two" });
    otherBank = await QuestionBank.create({ courseId: otherCourse._id, topicId: otherTopic._id, createdBy: otherInstructorId, title: "Other Assessment Test Bank" });

    async function createQuestion({ topic = topic1, bank = bank1, owner = instructorId } = {}) {
        questionCounter += 1;
        const text = `Assessment integration question ${questionCounter}`;
        return Question.create({
            questionBankId: bank._id,
            courseId: topic.courseId,
            topicId: topic._id,
            createdBy: owner,
            ...questionData(text),
        });
    }
    async function pool(count, context = {}) {
        const questions = [];
        for (let i = 0; i < count; i += 1) questions.push(await createQuestion(context));
        return questions;
    }
    const topicDraft = (overrides = {}) => createAssessmentService(instructorId, {
        courseId: course._id, topicId: topic1._id, type: "TOPIC",
        title: "Topic assessment draft", ...overrides,
    });
    const courseDraft = (type, overrides = {}) => createAssessmentService(instructorId, {
        courseId: course._id, type, title: `${type} assessment draft`, ...overrides,
    });

    await t.test("creates incomplete TOPIC draft with defaults", async () => {
        const a = await topicDraft();
        assert.equal(a.status, "DRAFT");
        assert.equal(a.questionsPerAttempt, 5);
        assert.equal(a.passingScore, 60);
        assert.equal(a.maxAttempts, 1);
        assert.equal(a.randomizeQuestions, true);
        assert.equal(a.randomizeOptions, false);
        assert.equal(a.questionIds.length, 0);
    });

    await t.test("creates a draft with a valid eligible pool", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        assert.equal(a.questionIds.length, 5);
    });

    await t.test("rejects invalid assessment type", async () => {
        await assert.rejects(
            createAssessmentService(instructorId, { courseId: course._id, type: "PRACTICE", title: "Invalid type" }),
            (e) => apiError(e, "INVALID_ASSESSMENT_TYPE", 400)
        );
    });

    await t.test("rejects course not owned by instructor", async () => {
        await assert.rejects(
            createAssessmentService(instructorId, { courseId: otherCourse._id, type: "FINAL", title: "Not mine" }),
            (e) => apiError(e, "COURSE_NOT_FOUND", 404)
        );
    });

    await t.test("rejects a topic from another course", async () => {
        await assert.rejects(
            createAssessmentService(instructorId, { courseId: course._id, topicId: otherTopic._id, type: "TOPIC", title: "Wrong scope" }),
            (e) => apiError(e, "TOPIC_NOT_FOUND", 404)
        );
    });

    await t.test("requires topicId for TOPIC assessments", async () => {
        await assert.rejects(
            createAssessmentService(instructorId, { courseId: course._id, type: "TOPIC", title: "Missing topic" }),
            (e) => apiError(e, "TOPIC_REQUIRED", 400)
        );
    });

    await t.test("does not allow topicId for course-level types", async () => {
        await assert.rejects(
            createAssessmentService(instructorId, { courseId: course._id, topicId: topic1._id, type: "FINAL", title: "Wrong scope" }),
            (e) => apiError(e, "TOPIC_NOT_ALLOWED", 400)
        );
    });

    await t.test("rejects archived course", async () => {
        course.status = "ARCHIVED";
        await course.save();
        try {
            await assert.rejects(topicDraft(), (e) => apiError(e, "COURSE_NOT_FOUND", 404));
        } finally {
            course.status = "DRAFT";
            await course.save();
        }
    });

    await t.test("diagnostic creation requires enabled course policy", async () => {
        course.diagnosticPolicy.enabled = false;
        await course.save();
        try {
            await assert.rejects(courseDraft("DIAGNOSTIC"), (e) => apiError(e, "DIAGNOSTIC_ASSESSMENT_DISABLED", 409));
        } finally {
            course.diagnosticPolicy.enabled = true;
            await course.save();
        }
    });

    await t.test("diagnostic settings come from Course policy, not request overrides", async () => {
        const a = await courseDraft("DIAGNOSTIC", { passingScore: 5, questionsPerAttempt: 10, randomizeQuestions: false });
        assert.equal(a.passingScore, 65);
        assert.equal(a.questionsPerAttempt, 5);
        assert.equal(a.randomizeQuestions, true);
        assert.equal(a.topicId, null);
    });

    await t.test("rejects invalid enabled diagnostic policy", async () => {
        course.diagnosticPolicy.questionsPerAttempt = 4;
        await course.save();
        try {
            await assert.rejects(courseDraft("DIAGNOSTIC"), (e) => apiError(e, "INVALID_DIAGNOSTIC_POLICY", 400));
        } finally {
            course.diagnosticPolicy.questionsPerAttempt = 5;
            await course.save();
        }
    });

    await t.test("creates course-level FINAL assessment", async () => {
        const a = await courseDraft("FINAL");
        assert.equal(a.type, "FINAL");
        assert.equal(a.topicId, null);
    });

    await t.test("rejects question from another course", async () => {
        const q = await createQuestion({ topic: otherTopic, bank: otherBank, owner: otherInstructorId });
        await assert.rejects(topicDraft({ questionIds: [q._id] }), (e) => apiError(e, "INVALID_ASSESSMENT_QUESTIONS", 400));
    });

    await t.test("rejects archived question in a draft pool", async () => {
        const q = await createQuestion();
        q.status = "ARCHIVED";
        await q.save();
        await assert.rejects(topicDraft({ questionIds: [q._id] }), (e) => apiError(e, "INVALID_ASSESSMENT_QUESTIONS", 400));
    });

    await t.test("rejects a question from a different topic in TOPIC assessment", async () => {
        const q = await createQuestion({ topic: topic2, bank: bank2 });
        await assert.rejects(topicDraft({ questionIds: [q._id] }), (e) => apiError(e, "INVALID_ASSESSMENT_QUESTIONS", 400));
    });

    await t.test("rejects duplicate question IDs", async () => {
        const q = await createQuestion();
        await assert.rejects(topicDraft({ questionIds: [q._id, q._id] }), (e) => apiError(e, "DUPLICATE_QUESTION_IDS", 400));
    });

    await t.test("rejects a question pool larger than 200", async () => {
        const ids = Array.from({ length: 201 }, () => new mongoose.Types.ObjectId());
        await assert.rejects(topicDraft({ questionIds: ids }), (e) => apiError(e, "INVALID_QUESTION_POOL", 400));
    });

    await t.test("gets owned assessment and hides another instructor's assessment", async () => {
        const a = await topicDraft();
        assert.equal((await getAssessmentByIdService(instructorId, a._id))._id.toString(), a._id.toString());
        await assert.rejects(getAssessmentByIdService(otherInstructorId, a._id), (e) => apiError(e, "ASSESSMENT_NOT_FOUND", 404));
    });

    await t.test("lists course assessments newest first", async () => {
        const a = await topicDraft({ title: "First list assessment" });
        await new Promise((resolve) => setTimeout(resolve, 5));
        const b = await topicDraft({ title: "Second list assessment" });
        const list = await getAssessmentsByCourseService(instructorId, course._id);
        assert.ok(list.findIndex((item) => item._id.equals(b._id)) < list.findIndex((item) => item._id.equals(a._id)));
    });

    await t.test("lists assessments for the requested topic only", async () => {
        const a = await topicDraft();
        const b = await createAssessmentService(instructorId, {
            courseId: course._id, topicId: topic2._id, type: "TOPIC", title: "Second topic assessment",
        });
        const list = await getAssessmentsByTopicService(instructorId, topic1._id);
        assert.ok(list.some((item) => item._id.equals(a._id)));
        assert.ok(!list.some((item) => item._id.equals(b._id)));
    });

    await t.test("updates supplied fields and preserves omitted fields", async () => {
        const a = await topicDraft({ description: "Original description" });
        const updated = await updateAssessmentService(instructorId, a._id, { title: "Updated assessment title" });
        assert.equal(updated.title, "Updated assessment title");
        assert.equal(updated.description, "Original description");
    });

    await t.test("published assessment allows instructor metadata and operational updates", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        await publishAssessmentService(instructorId, a._id);
        const updated = await updateAssessmentService(instructorId, a._id, {
            title: "Revised published title",
            description: "Updated instructions",
            maxAttempts: 3,
            opensAt: new Date("2026-10-20T09:00:00.000Z"),
            closesAt: new Date("2026-10-25T09:00:00.000Z"),
        });
        assert.equal(updated.title, "Revised published title");
        assert.equal(updated.maxAttempts, 3);
        assert.equal(updated.status, "PUBLISHED");
    });

    await t.test("published assessment cannot reduce maxAttempts", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id), maxAttempts: 3 });
        await publishAssessmentService(instructorId, a._id);
        await assert.rejects(
            updateAssessmentService(instructorId, a._id, { maxAttempts: 2 }),
            (e) => apiError(e, "PUBLISHED_ATTEMPTS_CANNOT_DECREASE", 409)
        );
    });

    await t.test("published assessment rejects changes to assessment-defining configuration", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        await publishAssessmentService(instructorId, a._id);
        await assert.rejects(
            updateAssessmentService(instructorId, a._id, { questionIds: qs.slice(1).map((q) => q._id) }),
            (e) => apiError(e, "PUBLISHED_ASSESSMENT_CONFIG_LOCKED", 409)
        );
        await assert.rejects(
            updateAssessmentService(instructorId, a._id, { timeLimitMinutes: 30 }),
            (e) => apiError(e, "PUBLISHED_ASSESSMENT_CONFIG_LOCKED", 409)
        );
    });

    await t.test("rejects a stale update instead of overwriting a concurrent change", async () => {
        const a = await topicDraft({ title: "Original title" });
        const originalFindOneAndUpdate = Assessment.findOneAndUpdate;
        let injected = false;
        Assessment.findOneAndUpdate = async function (filter, update, options) {
            if (!injected && filter?._id?.toString() === a._id.toString() && update?.$set?.title === "Requested title") {
                injected = true;
                await Assessment.updateOne(
                    { _id: a._id, status: "DRAFT" },
                    { $set: { title: "Concurrent title" }, $inc: { __v: 1 } }
                );
            }
            return originalFindOneAndUpdate.call(this, filter, update, options);
        };
        try {
            await assert.rejects(
                updateAssessmentService(instructorId, a._id, { title: "Requested title" }),
                (e) => apiError(e, "ASSESSMENT_STATE_CHANGED", 409)
            );
            assert.equal((await Assessment.findById(a._id)).title, "Concurrent title");
        } finally {
            Assessment.findOneAndUpdate = originalFindOneAndUpdate;
        }
    });

    await t.test("rejects empty update", async () => {
        const a = await topicDraft();
        await assert.rejects(updateAssessmentService(instructorId, a._id, {}), (e) => apiError(e, "EMPTY_UPDATE", 400));
    });

    await t.test("rejects immutable fields in updates", async () => {
        const a = await topicDraft();
        await assert.rejects(updateAssessmentService(instructorId, a._id, { type: "FINAL" }), (e) => apiError(e, "FIELD_NOT_EDITABLE", 400));
    });

    await t.test("rejects editing diagnostic policy-owned fields", async () => {
        const a = await courseDraft("DIAGNOSTIC");
        await assert.rejects(updateAssessmentService(instructorId, a._id, { passingScore: 70 }), (e) => apiError(e, "DIAGNOSTIC_SETTINGS_CONTROLLED_BY_COURSE", 400));
    });

    await t.test("rejects update to archived assessment", async () => {
        const a = await topicDraft();
        await archiveAssessmentService(instructorId, a._id);
        await assert.rejects(updateAssessmentService(instructorId, a._id, { title: "No edit" }), (e) => apiError(e, "ASSESSMENT_ARCHIVED", 409));
    });

    await t.test("rejects an update that races with archiving", async () => {
        const a = await topicDraft({ title: "Before archive race" });
        const originalFindOneAndUpdate = Assessment.findOneAndUpdate;
        let injected = false;
        Assessment.findOneAndUpdate = async function (filter, update, options) {
            if (!injected && filter?._id?.toString() === a._id.toString() && update?.$set?.title === "Late update") {
                injected = true;
                await Assessment.updateOne(
                    { _id: a._id, status: "DRAFT" },
                    { $set: { status: "ARCHIVED" }, $inc: { __v: 1 } }
                );
            }
            return originalFindOneAndUpdate.call(this, filter, update, options);
        };
        try {
            await assert.rejects(
                updateAssessmentService(instructorId, a._id, { title: "Late update" }),
                (e) => apiError(e, "ASSESSMENT_STATE_CHANGED", 409)
            );
            assert.equal((await Assessment.findById(a._id)).status, "ARCHIVED");
        } finally {
            Assessment.findOneAndUpdate = originalFindOneAndUpdate;
        }
    });

    await t.test("publishes valid TOPIC assessment", async () => {
        const qs = await pool(6);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id), questionsPerAttempt: 5 });
        assert.equal((await publishAssessmentService(instructorId, a._id)).status, "PUBLISHED");
    });

    await t.test("rejects publication with insufficient pool", async () => {
        const qs = await pool(4);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id), questionsPerAttempt: 5 });
        await assert.rejects(publishAssessmentService(instructorId, a._id), (e) => apiError(e, "INSUFFICIENT_QUESTION_POOL", 400));
    });

    await t.test("rejects invalid questionsPerAttempt", async () => {
        await assert.rejects(topicDraft({ questionsPerAttempt: 11 }), (e) => apiError(e, "INVALID_QUESTIONS_PER_ATTEMPT", 400));
    });

    await t.test("rejects invalid passingScore", async () => {
        await assert.rejects(topicDraft({ passingScore: 101 }), (e) => apiError(e, "INVALID_PASSING_SCORE", 400));
    });

    await t.test("rejects invalid maxAttempts", async () => {
        await assert.rejects(topicDraft({ maxAttempts: 0 }), (e) => apiError(e, "INVALID_MAX_ATTEMPTS", 400));
    });

    await t.test("rejects invalid time limit", async () => {
        await assert.rejects(topicDraft({ timeLimitMinutes: 0 }), (e) => apiError(e, "INVALID_TIME_LIMIT", 400));
    });

    await t.test("rejects closesAt earlier than opensAt", async () => {
        await assert.rejects(
            topicDraft({ opensAt: new Date("2026-01-02"), closesAt: new Date("2026-01-01") }),
            (e) => apiError(e, "INVALID_AVAILABILITY_WINDOW", 400)
        );
    });

    await t.test("rejects publication if selected question was archived after draft creation", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        qs[0].status = "ARCHIVED";
        await qs[0].save();
        await assert.rejects(publishAssessmentService(instructorId, a._id), (e) => apiError(e, "INVALID_ASSESSMENT_QUESTIONS", 400));
    });

    await t.test("rejects publication if Question Bank is archived", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        bank1.status = "ARCHIVED";
        await bank1.save();
        try {
            await assert.rejects(publishAssessmentService(instructorId, a._id), (e) => apiError(e, "QUESTION_BANK_UNAVAILABLE", 409));
        } finally {
            bank1.status = "ACTIVE";
            await bank1.save();
        }
    });

    await t.test("rejects republishing already published assessment", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        await publishAssessmentService(instructorId, a._id);
        await assert.rejects(publishAssessmentService(instructorId, a._id), (e) => apiError(e, "ASSESSMENT_ALREADY_PUBLISHED", 409));
    });

    await t.test("rejects publishing archived assessment", async () => {
        const a = await topicDraft();
        await archiveAssessmentService(instructorId, a._id);
        await assert.rejects(publishAssessmentService(instructorId, a._id), (e) => apiError(e, "ASSESSMENT_ARCHIVED", 409));
    });

    await t.test("publishes FINAL assessment without requiring every course topic to be represented", async () => {
        const qs = await pool(5);
        const a = await courseDraft("FINAL", { questionIds: qs.map((q) => q._id) });
        assert.equal((await publishAssessmentService(instructorId, a._id)).status, "PUBLISHED");
    });

    await t.test("diagnostic publication fails if policy is disabled after creation", async () => {
        const qs = await pool(5);
        const a = await courseDraft("DIAGNOSTIC", { questionIds: qs.map((q) => q._id) });
        course.diagnosticPolicy.enabled = false;
        await course.save();
        try {
            await assert.rejects(publishAssessmentService(instructorId, a._id), (e) => apiError(e, "DIAGNOSTIC_ASSESSMENT_DISABLED", 409));
        } finally {
            course.diagnosticPolicy.enabled = true;
            await course.save();
        }
    });

    await t.test("refreshes a stale diagnostic draft from the current Course policy before publishing", async () => {
        const qs = await pool(5);
        const a = await courseDraft("DIAGNOSTIC", { questionIds: qs.map((q) => q._id) });
        course.diagnosticPolicy.passingScore = 70;
        await course.save();
        try {
            const published = await publishAssessmentService(instructorId, a._id);
            assert.equal(published.status, "PUBLISHED");
            assert.equal(published.passingScore, 70);
        } finally {
            course.diagnosticPolicy.passingScore = 65;
            await course.save();
        }
    });

    await t.test("rejects publication if selected pool changes between validation and state transition", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        const original = Assessment.findOneAndUpdate;
        Assessment.findOneAndUpdate = async function (filter, update, options) {
            await Assessment.updateOne({ _id: a._id, status: "DRAFT" }, { $set: { questionIds: [] } });
            return original.call(this, filter, update, options);
        };
        try {
            await assert.rejects(
                publishAssessmentService(instructorId, a._id),
                (e) =>
                    apiError(e, "ASSESSMENT_STATE_CHANGED", 409) ||
                    // A transaction retry can observe the changed empty pool
                    // before the conditional state transition is reached.
                    apiError(e, "INSUFFICIENT_QUESTION_POOL", 400)
            );
        } finally {
            Assessment.findOneAndUpdate = original;
        }

        const unchanged = await Assessment.findById(a._id);
        assert.equal(unchanged.status, "DRAFT");
        assert.deepEqual(unchanged.questionIds, []);
    });

    await t.test("archives draft and restores it to DRAFT", async () => {
        const a = await topicDraft();
        assert.equal((await archiveAssessmentService(instructorId, a._id)).status, "ARCHIVED");
        assert.equal((await restoreAssessmentService(instructorId, a._id)).status, "DRAFT");
    });

    await t.test("archives a published assessment", async () => {
        const qs = await pool(5);
        const a = await topicDraft({ questionIds: qs.map((q) => q._id) });
        await publishAssessmentService(instructorId, a._id);
        assert.equal((await archiveAssessmentService(instructorId, a._id)).status, "ARCHIVED");
    });

    await t.test("rejects archiving an already archived assessment", async () => {
        const a = await topicDraft();
        await archiveAssessmentService(instructorId, a._id);
        await assert.rejects(archiveAssessmentService(instructorId, a._id), (e) => apiError(e, "ASSESSMENT_ALREADY_ARCHIVED", 409));
    });

    await t.test("rejects archiving another instructor's assessment", async () => {
        const a = await topicDraft();
        await assert.rejects(archiveAssessmentService(otherInstructorId, a._id), (e) => apiError(e, "ASSESSMENT_NOT_FOUND", 404));
    });

    await t.test("rejects restoring a non-archived assessment", async () => {
        const a = await topicDraft();
        await assert.rejects(restoreAssessmentService(instructorId, a._id), (e) => apiError(e, "ASSESSMENT_NOT_ARCHIVED", 409));
    });

    await t.test("restored assessment returns to draft and must pass publication validation again", async () => {
        const a = await topicDraft();
        await archiveAssessmentService(instructorId, a._id);
        assert.equal((await restoreAssessmentService(instructorId, a._id)).status, "DRAFT");
        await assert.rejects(publishAssessmentService(instructorId, a._id), (e) => apiError(e, "INSUFFICIENT_QUESTION_POOL", 400));
    });
});
