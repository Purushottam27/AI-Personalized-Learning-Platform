import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import dns from "node:dns";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import app from "../src/app.js";
import { User } from "../src/modules/identity/models/user.model.js";
import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import { TopicMastery } from "../src/modules/topicMastery/models/topicMastery.model.js";
import { MASTERY_STATUS } from "../src/modules/topicMastery/constants/mastery.constants.js";
import {
    getInstructorAssessmentAnalyticsService,
    getInstructorQuestionAnalyticsService,
} from "../src/modules/analytics/services/instructorAssessmentAnalytics.service.js";

test("Instructor Assessment and Question Analytics Test Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    }

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const createdUserIds = [];
    const createdCourseIds = [];
    const createdTopicIds = [];
    const createdBankIds = [];
    const createdQuestionIds = [];
    const createdAssessmentIds = [];
    const createdAttemptIds = [];
    const createdMasteryIds = [];
    const createdEnrollmentIds = [];

    function makeToken(user) {
        return jwt.sign(
            { sub: user._id.toString(), role: user.role },
            JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );
    }

    async function apiRequest({ method, reqPath, token, body }) {
        return new Promise((resolve, reject) => {
            const req = http.request(
                {
                    hostname: "127.0.0.1",
                    port,
                    path: reqPath,
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                },
                (res) => {
                    let raw = "";
                    res.on("data", (chunk) => (raw += chunk));
                    res.on("end", () => {
                        let parsed = null;
                        try {
                            parsed = JSON.parse(raw);
                        } catch {
                            parsed = raw;
                        }
                        resolve({ statusCode: res.statusCode, body: parsed });
                    });
                }
            );
            req.on("error", reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    // Fixture Setup
    const instructor1Id = new mongoose.Types.ObjectId();
    const instructor2Id = new mongoose.Types.ObjectId();
    const learner1Id = new mongoose.Types.ObjectId();
    const learner2Id = new mongoose.Types.ObjectId();
    const learner3Id = new mongoose.Types.ObjectId();

    const course1Id = new mongoose.Types.ObjectId();
    const topic1Id = new mongoose.Types.ObjectId();
    const topic2Id = new mongoose.Types.ObjectId();
    const bank1Id = new mongoose.Types.ObjectId();

    createdUserIds.push(instructor1Id, instructor2Id, learner1Id, learner2Id, learner3Id);
    createdCourseIds.push(course1Id);
    createdTopicIds.push(topic1Id, topic2Id);
    createdBankIds.push(bank1Id);

    const instructor1 = await User.create({
        _id: instructor1Id,
        name: "Professor Analytics",
        email: "prof_analytics@test.com",
        password: "password123",
        role: "INSTRUCTOR",
        status: "ACTIVE",
    });

    const instructor2 = await User.create({
        _id: instructor2Id,
        name: "Professor Unauthorized",
        email: "prof_unauth@test.com",
        password: "password123",
        role: "INSTRUCTOR",
        status: "ACTIVE",
    });

    const learner1 = await User.create({
        _id: learner1Id,
        name: "Learner Passed",
        email: "learner_passed@test.com",
        password: "password123",
        role: "LEARNER",
        status: "ACTIVE",
    });

    const learner2 = await User.create({
        _id: learner2Id,
        name: "Learner Failed",
        email: "learner_failed@test.com",
        password: "password123",
        role: "LEARNER",
        status: "ACTIVE",
    });

    const learner3 = await User.create({
        _id: learner3Id,
        name: "Learner InProgress",
        email: "learner_inprogress@test.com",
        password: "password123",
        role: "LEARNER",
        status: "ACTIVE",
    });

    const instructor1Token = makeToken(instructor1);
    const instructor2Token = makeToken(instructor2);
    const learner1Token = makeToken(learner1);

    await Course.create({
        _id: course1Id,
        title: "Database Systems & Architecture",
        description: "Comprehensive database architecture and indexing.",
        domain: "Computer Science",
        category: "Databases",
        difficulty: "INTERMEDIATE",
        createdBy: instructor1Id,
        status: "PUBLISHED",
    });

    await Topic.create([
        { _id: topic1Id, courseId: course1Id, title: "Indexing & B-Trees", order: 1 },
        { _id: topic2Id, courseId: course1Id, title: "Query Optimization", order: 2 },
    ]);

    await QuestionBank.create({
        _id: bank1Id,
        courseId: course1Id,
        topicId: topic1Id,
        createdBy: instructor1Id,
        title: "Indexing Bank",
        status: "ACTIVE",
    });

    // Create 5 questions
    const questionDocs = [];
    for (let i = 1; i <= 5; i++) {
        const qid = new mongoose.Types.ObjectId();
        createdQuestionIds.push(qid);
        questionDocs.push({
            _id: qid,
            questionBankId: bank1Id,
            courseId: course1Id,
            topicId: topic1Id,
            createdBy: instructor1Id,
            questionText: `Question ${i}: Which indexing mechanism works best for range queries?`,
            normalizedQuestionText: `question ${i} which indexing mechanism works best for range queries`,
            type: "MCQ_SINGLE",
            options: [
                { key: "A", text: "B-Tree Index" },
                { key: "B", text: "Hash Index" },
            ],
            correctAnswer: "A",
            explanation: "B-Trees maintain sorted order suitable for range scans.",
            marks: 2,
            difficulty: "MEDIUM",
            status: "ACTIVE",
        });
    }
    await Question.create(questionDocs);

    // Create 3 Assessments:
    // 1. TOPIC assessment on topic1
    // 2. DIAGNOSTIC assessment
    // 3. FINAL assessment
    const topicAssessmentId = new mongoose.Types.ObjectId();
    const diagnosticAssessmentId = new mongoose.Types.ObjectId();
    const finalAssessmentId = new mongoose.Types.ObjectId();

    createdAssessmentIds.push(topicAssessmentId, diagnosticAssessmentId, finalAssessmentId);

    await Assessment.create([
        {
            _id: topicAssessmentId,
            courseId: course1Id,
            topicId: topic1Id,
            createdBy: instructor1Id,
            type: "TOPIC",
            title: "Topic 1 Mastery Assessment",
            questionIds: createdQuestionIds,
            questionsPerAttempt: 5,
            passingScore: 60,
            status: "PUBLISHED",
        },
        {
            _id: diagnosticAssessmentId,
            courseId: course1Id,
            topicId: null,
            createdBy: instructor1Id,
            type: "DIAGNOSTIC",
            title: "Prerequisite Knowledge Diagnostic",
            questionIds: createdQuestionIds,
            questionsPerAttempt: 5,
            passingScore: 50,
            status: "PUBLISHED",
        },
        {
            _id: finalAssessmentId,
            courseId: course1Id,
            topicId: null,
            createdBy: instructor1Id,
            type: "FINAL",
            title: "Final Comprehensive Exam",
            questionIds: createdQuestionIds,
            questionsPerAttempt: 5,
            passingScore: 70,
            status: "PUBLISHED",
        },
    ]);

    // Enroll learners in course
    const enr1 = await Enrollment.create({ learnerId: learner1Id, courseId: course1Id, status: "ACTIVE" });
    const enr2 = await Enrollment.create({ learnerId: learner2Id, courseId: course1Id, status: "ACTIVE" });
    const enr3 = await Enrollment.create({ learnerId: learner3Id, courseId: course1Id, status: "ACTIVE" });
    createdEnrollmentIds.push(enr1._id, enr2._id, enr3._id);

    // Build question snapshots for attempts
    const snapshots = questionDocs.map((q) => ({
        questionId: q._id,
        questionText: q.questionText,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
    }));

    // Attempt 1: Learner 1 submitted, passed (score: 100%)
    const att1 = await AssessmentAttempt.create({
        assessmentId: topicAssessmentId,
        learnerId: learner1Id,
        courseId: course1Id,
        assessmentType: "TOPIC",
        attemptNumber: 1,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 3600000),
        submittedAt: new Date(),
        passingScore: 60,
        questions: snapshots,
        answers: snapshots.map((s) => ({ questionId: s.questionId, answer: "A" })), // all correct
        totalMarks: 10,
        marksAwarded: 10,
        scorePercent: 100,
        passed: true,
    });

    // Attempt 2: Learner 2 submitted attempt 1, failed (score: 40%)
    const att2 = await AssessmentAttempt.create({
        assessmentId: topicAssessmentId,
        learnerId: learner2Id,
        courseId: course1Id,
        assessmentType: "TOPIC",
        attemptNumber: 1,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 7200000),
        submittedAt: new Date(Date.now() - 3600000),
        passingScore: 60,
        questions: snapshots,
        answers: [
            { questionId: snapshots[0].questionId, answer: "A" }, // correct
            { questionId: snapshots[1].questionId, answer: "A" }, // correct
            { questionId: snapshots[2].questionId, answer: "B" }, // incorrect
            { questionId: snapshots[3].questionId, answer: "B" }, // incorrect
            { questionId: snapshots[4].questionId, answer: null }, // unanswered
        ],
        totalMarks: 10,
        marksAwarded: 4,
        scorePercent: 40,
        passed: false,
    });

    // Attempt 3: Learner 2 submitted attempt 2 (retry), failed again (score: 40%)
    const att3 = await AssessmentAttempt.create({
        assessmentId: topicAssessmentId,
        learnerId: learner2Id,
        courseId: course1Id,
        assessmentType: "TOPIC",
        attemptNumber: 2,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 1800000),
        submittedAt: new Date(),
        passingScore: 60,
        questions: snapshots,
        answers: [
            { questionId: snapshots[0].questionId, answer: "A" }, // correct
            { questionId: snapshots[1].questionId, answer: "A" }, // correct
            { questionId: snapshots[2].questionId, answer: "B" }, // incorrect
            { questionId: snapshots[3].questionId, answer: "B" }, // incorrect
            { questionId: snapshots[4].questionId, answer: null }, // unanswered
        ],
        totalMarks: 10,
        marksAwarded: 4,
        scorePercent: 40,
        passed: false,
    });

    // Attempt 4: Learner 3 IN_PROGRESS (not submitted yet)
    const att4 = await AssessmentAttempt.create({
        assessmentId: topicAssessmentId,
        learnerId: learner3Id,
        courseId: course1Id,
        assessmentType: "TOPIC",
        attemptNumber: 1,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        passingScore: 60,
        questions: snapshots,
        answers: [],
        totalMarks: 10,
    });

    createdAttemptIds.push(att1._id, att2._id, att3._id, att4._id);

    // TopicMastery: Topic 1 is NEEDS_IMPROVEMENT for learner2
    const tm1 = await TopicMastery.create({
        learnerId: learner2Id,
        courseId: course1Id,
        topicId: topic1Id,
        status: MASTERY_STATUS.NEEDS_IMPROVEMENT,
        masteryScore: 40,
        confidence: 0.8,
        evidenceCount: 3,
    });
    createdMasteryIds.push(tm1._id);

    // ==========================================
    // 1. Assessment Analytics Service Tests
    // ==========================================

    await t.test("getInstructorAssessmentAnalyticsService aggregates metrics, retries, and unique learners accurately", async () => {
        const data = await getInstructorAssessmentAnalyticsService(instructor1Id, course1Id);

        assert.equal(data.courseId, course1Id.toString());
        assert.equal(data.totalEnrolledLearners, 3);
        assert.equal(data.totalAssessmentsCount, 3);
        assert.equal(data.totalSubmittedAttempts, 3); // 3 submitted attempts across all assessments

        const topicAssm = data.assessments.find((a) => a.assessmentId === topicAssessmentId.toString());
        assert.ok(topicAssm);
        assert.equal(topicAssm.type, "TOPIC");
        assert.equal(topicAssm.topicOrder, 1);
        assert.equal(topicAssm.totalAttempts, 3); // 3 completed attempts
        assert.equal(topicAssm.uniqueLearnersCount, 2); // Learner 1 and Learner 2 (learner 2 had 2 attempts)
        assert.equal(topicAssm.inProgressAttemptsCount, 1); // Learner 3 is in-progress
        assert.equal(topicAssm.passedCount, 1); // 1 passed attempt
        assert.equal(topicAssm.failedCount, 2); // 2 failed attempts
        assert.equal(topicAssm.passPercentage, 33); // 1/3 = 33%
        assert.equal(topicAssm.failPercentage, 67); // 2/3 = 67%
        assert.equal(topicAssm.averageScore, Math.round((100 + 40 + 40) / 3)); // 60%
        assert.equal(topicAssm.participationRate, Math.round((2 / 3) * 100)); // 2 unique / 3 enrolled = 67%
        assert.equal(topicAssm.completionRate, Math.round((3 / 4) * 100)); // 3 submitted / 4 started = 75%
    });

    await t.test("Preserves DIAGNOSTIC and FINAL assessment distinctions with empty attempts", async () => {
        const data = await getInstructorAssessmentAnalyticsService(instructor1Id, course1Id);

        const diag = data.assessments.find((a) => a.assessmentId === diagnosticAssessmentId.toString());
        assert.ok(diag);
        assert.equal(diag.type, "DIAGNOSTIC");
        assert.equal(diag.topicId, null);
        assert.equal(diag.totalAttempts, 0);
        assert.equal(diag.averageScore, null); // null-safe
        assert.equal(diag.hasSufficientData, false);

        const finalAssm = data.assessments.find((a) => a.assessmentId === finalAssessmentId.toString());
        assert.ok(finalAssm);
        assert.equal(finalAssm.type, "FINAL");
        assert.equal(finalAssm.topicId, null);
        assert.equal(finalAssm.totalAttempts, 0);
    });

    await t.test("Generates explainable, evidence-backed instructor insights with traceable references", async () => {
        const data = await getInstructorAssessmentAnalyticsService(instructor1Id, course1Id);
        assert.ok(data.insights.length > 0);

        // Verification of Insufficient Data insight for empty assessment
        const emptyInsight = data.insights.find((i) => i.reference.id === diagnosticAssessmentId.toString());
        assert.ok(emptyInsight);
        assert.equal(emptyInsight.category, "DATA_LIMITATION");

        // Verification of High Failure Rate insight for Topic assessment (fail rate: 67% >= 40%)
        const failInsight = data.insights.find(
            (i) => i.reference.id === topicAssessmentId.toString() && i.category === "PERFORMANCE"
        );
        assert.ok(failInsight);
        assert.match(failInsight.title, /High Failure Rate/);
        assert.ok(failInsight.suggestedAction.length > 10);
    });

    // ==========================================
    // 2. Question Analytics Service Tests
    // ==========================================

    await t.test("getInstructorQuestionAnalyticsService correctly aggregates correct, incorrect, and unanswered counts", async () => {
        const data = await getInstructorQuestionAnalyticsService(instructor1Id, topicAssessmentId);

        assert.equal(data.assessmentId, topicAssessmentId.toString());
        assert.equal(data.totalCompletedAttempts, 3);
        assert.equal(data.questions.length, 5);

        // Questions 1 & 2: Answered 'A' in all 3 attempts (correct in all 3)
        const q1 = data.questions.find((q) => q.questionId === createdQuestionIds[0].toString());
        assert.ok(q1);
        assert.equal(q1.totalExposures, 3);
        assert.equal(q1.correctCount, 3);
        assert.equal(q1.incorrectCount, 0);
        assert.equal(q1.unansweredCount, 0);
        assert.equal(q1.correctPercentage, 100);
        assert.equal(q1.responsePatternSignal, "HIGH_ACCURACY");

        // Question 3: Answered 'A' in att1 (correct), 'B' in att2 (incorrect), 'B' in att3 (incorrect)
        const q3 = data.questions.find((q) => q.questionId === createdQuestionIds[2].toString());
        assert.ok(q3);
        assert.equal(q3.correctCount, 1);
        assert.equal(q3.incorrectCount, 2);
        assert.equal(q3.unansweredCount, 0);
        assert.equal(q3.incorrectPercentage, 67); // 2/3 = 67%
        assert.equal(q3.responsePatternSignal, "HIGH_INCORRECT_RATE");

        // Question 5: Answered 'A' in att1 (correct), null in att2, null in att3 (unanswered)
        const q5 = data.questions.find((q) => q.questionId === createdQuestionIds[4].toString());
        assert.ok(q5);
        assert.equal(q5.correctCount, 1);
        assert.equal(q5.incorrectCount, 0);
        assert.equal(q5.unansweredCount, 2);
        assert.equal(q5.unansweredPercentage, 67); // 2/3 = 67%
        assert.equal(q5.responsePatternSignal, "HIGH_UNANSWERED_RATE");

        // Question insights check
        assert.ok(data.questionInsights.length >= 2);
        const incorrectInsight = data.questionInsights.find((qi) => qi.reference.id === createdQuestionIds[2].toString());
        assert.ok(incorrectInsight);
        assert.equal(incorrectInsight.category, "QUESTION_PERFORMANCE");
        assert.match(incorrectInsight.title, /High Incorrect Rate/);
    });

    // ==========================================
    // 3. Authorization & HTTP API Endpoints Tests
    // ==========================================

    await t.test("GET /api/v1/instructor/courses/:courseId/assessments/analytics: authorized owner succeeds with 200", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/courses/${course1Id}/assessments/analytics`,
            token: instructor1Token,
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.courseId, course1Id.toString());
        assert.equal(res.body.data.assessments.length, 3);
    });

    await t.test("GET /api/v1/instructor/courses/:courseId/assessments/analytics: unauthorized instructor rejected with 403", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/courses/${course1Id}/assessments/analytics`,
            token: instructor2Token,
        });

        assert.equal(res.statusCode, 403);
        assert.equal(res.body.error?.code, "COURSE_ACCESS_DENIED");
    });

    await t.test("GET /api/v1/instructor/assessments/:assessmentId/questions/analytics: authorized owner succeeds with 200", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/assessments/${topicAssessmentId}/questions/analytics`,
            token: instructor1Token,
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.assessmentId, topicAssessmentId.toString());
        assert.equal(res.body.data.questions.length, 5);
    });

    await t.test("GET /api/v1/instructor/assessments/:assessmentId/questions/analytics: unauthorized instructor rejected with 403", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/assessments/${topicAssessmentId}/questions/analytics`,
            token: instructor2Token,
        });

        assert.equal(res.statusCode, 403);
        assert.equal(res.body.error?.code, "COURSE_ACCESS_DENIED");
    });

    await t.test("GET /api/v1/instructor/assessments/:assessmentId/questions/analytics: learner role rejected with 403", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/assessments/${topicAssessmentId}/questions/analytics`,
            token: learner1Token,
        });

        assert.equal(res.statusCode, 403);
    });

    // Cleanup fixtures
    await t.test("Cleanup test fixtures", async () => {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Course.deleteMany({ _id: { $in: createdCourseIds } });
        await Topic.deleteMany({ _id: { $in: createdTopicIds } });
        await QuestionBank.deleteMany({ _id: { $in: createdBankIds } });
        await Question.deleteMany({ _id: { $in: createdQuestionIds } });
        await Assessment.deleteMany({ _id: { $in: createdAssessmentIds } });
        await AssessmentAttempt.deleteMany({ _id: { $in: createdAttemptIds } });
        await TopicMastery.deleteMany({ _id: { $in: createdMasteryIds } });
        await Enrollment.deleteMany({ _id: { $in: createdEnrollmentIds } });

        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
    });
});

