import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "../src/app.js";
import { User } from "../src/modules/identity/models/user.model.js";
import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("Diagnostic Enrollment Gate and Learner Discovery Integration", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const learnerId = new mongoose.Types.ObjectId();
    const otherLearnerId = new mongoose.Types.ObjectId();
    const courseWithDiagId = new mongoose.Types.ObjectId();
    const courseWithoutDiagId = new mongoose.Types.ObjectId();
    const otherCourseId = new mongoose.Types.ObjectId();
    const draftCourseId = new mongoose.Types.ObjectId();

    const createdUserIds = [instructorId, learnerId, otherLearnerId];
    const createdCourseIds = [courseWithDiagId, courseWithoutDiagId, otherCourseId, draftCourseId];

    let connected = false;
    let server;
    let baseUrl;
    let publishedDiagAssessmentId;
    let draftDiagAssessmentId;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await AssessmentAttempt.deleteMany({ learnerId: { $in: createdUserIds } });
            await Enrollment.deleteMany({ learnerId: { $in: createdUserIds } });
            await Assessment.deleteMany({ createdBy: instructorId });
            await Question.deleteMany({ createdBy: instructorId });
            await QuestionBank.deleteMany({ createdBy: instructorId });
            await Topic.deleteMany({ courseId: { $in: createdCourseIds } });
            await Course.deleteMany({ _id: { $in: createdCourseIds } });
            await User.deleteMany({ _id: { $in: createdUserIds } });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME);
    await Promise.all([
        User.init(),
        Course.init(),
        Topic.init(),
        Enrollment.init(),
        QuestionBank.init(),
        Question.init(),
        Assessment.init(),
        AssessmentAttempt.init(),
    ]);

    // Create users
    await User.create([
        {
            _id: instructorId,
            name: "Diag Test Instructor",
            email: `diag-instructor-${instructorId}@example.test`,
            role: "INSTRUCTOR",
            status: "ACTIVE",
        },
        {
            _id: learnerId,
            name: "Diag Test Learner",
            email: `diag-learner-${learnerId}@example.test`,
            role: "LEARNER",
            status: "ACTIVE",
        },
        {
            _id: otherLearnerId,
            name: "Other Diag Learner",
            email: `diag-other-learner-${otherLearnerId}@example.test`,
            role: "LEARNER",
            status: "ACTIVE",
        },
    ]);

    // Create Courses
    await Course.create([
        {
            _id: courseWithDiagId,
            title: "Course Requiring Diagnostic",
            description: "A course that mandates a passing diagnostic assessment before enrollment.",
            createdBy: instructorId,
            domain: "Computer Science",
            category: "Algorithms",
            difficulty: "INTERMEDIATE",
            status: "PUBLISHED",
            diagnosticPolicy: {
                enabled: true,
                passingScore: 70,
                questionsPerAttempt: 5,
                randomizeQuestions: false,
            },
        },
        {
            _id: courseWithoutDiagId,
            title: "Course Without Diagnostic",
            description: "A standard open enrollment course with diagnostic policy disabled.",
            createdBy: instructorId,
            domain: "Computer Science",
            category: "Web Development",
            difficulty: "BEGINNER",
            status: "PUBLISHED",
            diagnosticPolicy: {
                enabled: false,
            },
        },
        {
            _id: otherCourseId,
            title: "Unrelated Diagnostic Course",
            description: "Another published course with diagnostic enabled.",
            createdBy: instructorId,
            domain: "Data Science",
            category: "Machine Learning",
            difficulty: "ADVANCED",
            status: "PUBLISHED",
            diagnosticPolicy: {
                enabled: true,
                passingScore: 60,
                questionsPerAttempt: 5,
                randomizeQuestions: false,
            },
        },
        {
            _id: draftCourseId,
            title: "Draft Course With Diagnostic",
            description: "A draft course that is not yet published.",
            createdBy: instructorId,
            domain: "Computer Science",
            category: "Security",
            difficulty: "BEGINNER",
            status: "DRAFT",
            diagnosticPolicy: {
                enabled: true,
                passingScore: 50,
                questionsPerAttempt: 5,
                randomizeQuestions: false,
            },
        },
    ]);

    // Create Topics & Question Bank & Questions for pool
    const topic = await Topic.create({
        courseId: courseWithDiagId,
        title: "Diagnostic Topic",
        learningObjectives: [],
        order: 1,
    });

    const questionBank = await QuestionBank.create({
        courseId: courseWithDiagId,
        topicId: topic._id,
        createdBy: instructorId,
        title: "Diagnostic Question Bank",
        status: "ACTIVE",
    });

    const questionDocs = [];
    for (let i = 1; i <= 6; i++) {
        questionDocs.push({
            courseId: courseWithDiagId,
            topicId: topic._id,
            questionBankId: questionBank._id,
            createdBy: instructorId,
            questionText: `Diagnostic Question #${i} with sufficiently long description text`,
            normalizedQuestionText: `diagnostic question #${i} with sufficiently long description text`,
            type: "MCQ_SINGLE",
            options: [
                { key: "A", text: "Option A" },
                { key: "B", text: "Option B" },
            ],
            correctAnswer: "A",
            explanation: `Explanation for question #${i}`,
            marks: 1,
            difficulty: "MEDIUM",
            status: "ACTIVE",
        });
    }
    const createdQuestions = await Question.create(questionDocs);
    const questionIds = createdQuestions.map((q) => q._id);

    // Published Diagnostic Assessment for courseWithDiagId
    const publishedDiag = await Assessment.create({
        courseId: courseWithDiagId,
        createdBy: instructorId,
        type: "DIAGNOSTIC",
        title: "Published Diagnostic Assessment",
        description: "Verify your readiness before enrolling.",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 70,
        maxAttempts: 2,
        randomizeQuestions: false,
        timeLimitMinutes: 30,
        status: "PUBLISHED",
    });
    publishedDiagAssessmentId = publishedDiag._id;

    // Draft Diagnostic Assessment for otherCourseId
    const draftDiag = await Assessment.create({
        courseId: otherCourseId,
        createdBy: instructorId,
        type: "DIAGNOSTIC",
        title: "Draft Diagnostic Assessment",
        description: "Still in draft mode.",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 60,
        maxAttempts: 1,
        status: "DRAFT",
    });
    draftDiagAssessmentId = draftDiag._id;

    // Tokens
    const learnerToken = jwt.sign(
        { sub: learnerId.toString(), role: "LEARNER" },
        JWT_ACCESS_SECRET,
        { expiresIn: "1h" }
    );
    const instructorToken = jwt.sign(
        { sub: instructorId.toString(), role: "INSTRUCTOR" },
        JWT_ACCESS_SECRET,
        { expiresIn: "1h" }
    );

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const request = (pathUrl, { token = learnerToken, body, method = "GET", auth = true } = {}) => {
        const headers = {};
        if (body) headers["content-type"] = "application/json";
        if (auth && token) headers["authorization"] = `Bearer ${token}`;
        return fetch(`${baseUrl}${pathUrl}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    };

    // -------------------------------------------------------------
    // Part 1: Diagnostic Assessment Discovery Endpoint
    // -------------------------------------------------------------

    await t.test("Discovery: requires authentication", async () => {
        const res = await request(`/api/v1/courses/${courseWithDiagId}/diagnostic`, { auth: false });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.error?.code, "UNAUTHENTICATED_ACCESS");
    });

    await t.test("Discovery: forbids non-learner roles (e.g. INSTRUCTOR)", async () => {
        const res = await request(`/api/v1/courses/${courseWithDiagId}/diagnostic`, { token: instructorToken });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.error?.code, "UNAUTHORIZED_ACCESS");
    });

    await t.test("Discovery: rejects malformed courseId with 400 VALIDATION_ERROR", async () => {
        const res = await request("/api/v1/courses/not-a-valid-objectid/diagnostic");
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.error?.code, "VALIDATION_ERROR");
    });

    await t.test("Discovery: returns 404 when course does not exist", async () => {
        const missingCourseId = new mongoose.Types.ObjectId();
        const res = await request(`/api/v1/courses/${missingCourseId}/diagnostic`);
        assert.equal(res.status, 404);
        const data = await res.json();
        assert.equal(data.error?.code, "COURSE_NOT_FOUND");
    });

    await t.test("Discovery: returns 409 when course is in DRAFT status", async () => {
        const res = await request(`/api/v1/courses/${draftCourseId}/diagnostic`);
        assert.equal(res.status, 409);
        const data = await res.json();
        assert.equal(data.error?.code, "COURSE_NOT_AVAILABLE");
    });

    await t.test("Discovery: returns 409 when course has diagnostic disabled", async () => {
        const res = await request(`/api/v1/courses/${courseWithoutDiagId}/diagnostic`);
        assert.equal(res.status, 409);
        const data = await res.json();
        assert.equal(data.error?.code, "DIAGNOSTIC_ASSESSMENT_DISABLED");
    });

    await t.test("Discovery: returns 404 when course has diagnostic enabled but only DRAFT diagnostic exists", async () => {
        const res = await request(`/api/v1/courses/${otherCourseId}/diagnostic`);
        assert.equal(res.status, 404);
        const data = await res.json();
        assert.equal(data.error?.code, "ASSESSMENT_NOT_FOUND");
    });

    await t.test("Discovery: succeeds with safe metadata and does NOT leak answer keys or question pool", async () => {
        const res = await request(`/api/v1/courses/${courseWithDiagId}/diagnostic`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.ok(body.success);
        const diag = body.data;

        assert.equal(diag._id, publishedDiagAssessmentId.toString());
        assert.equal(diag.courseId, courseWithDiagId.toString());
        assert.equal(diag.type, "DIAGNOSTIC");
        assert.equal(diag.title, "Published Diagnostic Assessment");
        assert.equal(diag.description, "Verify your readiness before enrolling.");
        assert.equal(diag.questionsPerAttempt, 5);
        assert.equal(diag.passingScore, 70);
        assert.equal(diag.maxAttempts, 2);
        assert.equal(diag.timeLimitMinutes, 30);
        assert.equal(diag.status, "PUBLISHED");

        // Verify secrets and question details are NOT exposed
        assert.equal(diag.questionIds, undefined, "questionIds must not be exposed to learners");
        assert.equal(diag.questions, undefined, "questions must not be exposed in assessment discovery");
        assert.equal(diag.correctAnswer, undefined, "correctAnswer must never be exposed");
        assert.equal(diag.attemptVersion, undefined, "internal attemptVersion write fence must be hidden");

        // Also test the route alias: /courses/:courseId/assessments/diagnostic
        const resAlias = await request(`/api/v1/courses/${courseWithDiagId}/assessments/diagnostic`);
        assert.equal(resAlias.status, 200);
        const bodyAlias = await resAlias.json();
        assert.equal(bodyAlias.data._id, publishedDiagAssessmentId.toString());
    });

    // -------------------------------------------------------------
    // Part 2: Diagnostic Enrollment Eligibility Gate
    // -------------------------------------------------------------

    await t.test("Enrollment: diagnostic-disabled course allows direct enrollment", async () => {
        const res = await request(`/api/v1/courses/${courseWithoutDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 201);
        const body = await res.json();
        assert.ok(body.success);
        assert.equal(body.data.status, "ACTIVE");
        assert.equal(body.data.courseId, courseWithoutDiagId.toString());
        assert.equal(body.data.learnerId, learnerId.toString());
    });

    await t.test("Enrollment: rejects with 409 DIAGNOSTIC_REQUIRED when no attempt exists", async () => {
        const res = await request(`/api/v1/courses/${courseWithDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 409);
        const body = await res.json();
        assert.equal(body.error?.code, "DIAGNOSTIC_REQUIRED");
    });

    await t.test("Enrollment: rejects with 409 DIAGNOSTIC_REQUIRED when attempt is IN_PROGRESS", async () => {
        // Create an in-progress attempt for this learner and course
        const inProgressAttempt = await AssessmentAttempt.create({
            assessmentId: publishedDiagAssessmentId,
            learnerId,
            courseId: courseWithDiagId,
            assessmentType: "DIAGNOSTIC",
            attemptNumber: 1,
            status: "IN_PROGRESS",
            passingScore: 70,
            questions: createdQuestions.slice(0, 5).map((q) => ({
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
            })),
            totalMarks: 5,
        });

        const res = await request(`/api/v1/courses/${courseWithDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 409);
        const body = await res.json();
        assert.equal(body.error?.code, "DIAGNOSTIC_REQUIRED");

        // Clean up in-progress attempt
        await AssessmentAttempt.deleteOne({ _id: inProgressAttempt._id });
    });

    await t.test("Enrollment: rejects with 409 DIAGNOSTIC_REQUIRED when attempt is SUBMITTED but failed", async () => {
        // Create a failed submitted attempt (passed: false, score: 40%)
        const failedAttempt = await AssessmentAttempt.create({
            assessmentId: publishedDiagAssessmentId,
            learnerId,
            courseId: courseWithDiagId,
            assessmentType: "DIAGNOSTIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            submittedAt: new Date(),
            submissionReason: "MANUAL",
            passingScore: 70,
            questions: createdQuestions.slice(0, 5).map((q) => ({
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
            })),
            totalMarks: 5,
            marksAwarded: 2,
            scorePercent: 40,
            passed: false,
        });

        const res = await request(`/api/v1/courses/${courseWithDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 409);
        const body = await res.json();
        assert.equal(body.error?.code, "DIAGNOSTIC_REQUIRED");
    });

    await t.test("Enrollment: rejects with 409 DIAGNOSTIC_REQUIRED when passing attempt is for a DIFFERENT course", async () => {
        // Create a passing submitted attempt on otherCourseId
        const otherCourseAttempt = await AssessmentAttempt.create({
            assessmentId: draftDiagAssessmentId,
            learnerId,
            courseId: otherCourseId,
            assessmentType: "DIAGNOSTIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            submittedAt: new Date(),
            submissionReason: "MANUAL",
            passingScore: 60,
            questions: createdQuestions.slice(0, 5).map((q) => ({
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
            })),
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            passed: true,
        });

        const res = await request(`/api/v1/courses/${courseWithDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 409);
        const body = await res.json();
        assert.equal(body.error?.code, "DIAGNOSTIC_REQUIRED");

        await AssessmentAttempt.deleteOne({ _id: otherCourseAttempt._id });
    });

    await t.test("Enrollment: rejects with 409 DIAGNOSTIC_REQUIRED when passing attempt is TOPIC assessment, not DIAGNOSTIC", async () => {
        // Create a passing submitted attempt on the same course, but assessmentType: "TOPIC"
        const topicAttempt = await AssessmentAttempt.create({
            assessmentId: publishedDiagAssessmentId,
            learnerId,
            courseId: courseWithDiagId,
            assessmentType: "TOPIC",
            attemptNumber: 99,
            status: "SUBMITTED",
            submittedAt: new Date(),
            submissionReason: "MANUAL",
            passingScore: 70,
            questions: createdQuestions.slice(0, 5).map((q) => ({
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
            })),
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            passed: true,
        });

        const res = await request(`/api/v1/courses/${courseWithDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 409);
        const body = await res.json();
        assert.equal(body.error?.code, "DIAGNOSTIC_REQUIRED");

        await AssessmentAttempt.deleteOne({ _id: topicAttempt._id });
    });

    await t.test("Enrollment: retake scenario permits enrollment after second attempt passes", async () => {
        // Learner already had attempt 1 with passed: false from earlier test.
        // Now learner submits attempt 2 with passed: true.
        const passedRetakeAttempt = await AssessmentAttempt.create({
            assessmentId: publishedDiagAssessmentId,
            learnerId,
            courseId: courseWithDiagId,
            assessmentType: "DIAGNOSTIC",
            attemptNumber: 2,
            status: "SUBMITTED",
            submittedAt: new Date(),
            submissionReason: "MANUAL",
            passingScore: 70,
            questions: createdQuestions.slice(0, 5).map((q) => ({
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
            })),
            totalMarks: 5,
            marksAwarded: 4,
            scorePercent: 80,
            passed: true,
        });

        const res = await request(`/api/v1/courses/${courseWithDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 201);
        const body = await res.json();
        assert.ok(body.success);
        assert.equal(body.data.status, "ACTIVE");
        assert.equal(body.data.courseId, courseWithDiagId.toString());
        assert.equal(body.data.learnerId, learnerId.toString());
    });

    await t.test("Enrollment: duplicate enrollment returns 409 ALREADY_ENROLLED", async () => {
        const res = await request(`/api/v1/courses/${courseWithDiagId}/enroll`, { method: "POST" });
        assert.equal(res.status, 409);
        const body = await res.json();
        assert.equal(body.error?.code, "ALREADY_ENROLLED");
    });
});
