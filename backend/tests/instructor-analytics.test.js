import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import dns from "node:dns";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ensure IPv4 first to prevent dual-stack DNS timeouts with MongoDB Atlas
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
import { LearningEvidence } from "../src/modules/learningEvidence/models/learningEvidence.model.js";
import { TopicMastery } from "../src/modules/topicMastery/models/topicMastery.model.js";
import { MASTERY_STATUS } from "../src/modules/topicMastery/constants/mastery.constants.js";
import { getInstructorCourseAnalyticsService } from "../src/modules/analytics/services/instructorAnalytics.service.js";

test("Instructor Course Analytics Test Suite", async (t) => {
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
    const createdEnrollmentIds = [];
    const createdEvidenceIds = [];
    const createdMasteryIds = [];

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

    // 1. Fixture Setup: Instructors, Course, Topics, Learners, Evidence, Mastery
    const instructor1Id = new mongoose.Types.ObjectId();
    const instructor2Id = new mongoose.Types.ObjectId();
    const learner1Id = new mongoose.Types.ObjectId();
    const learner2Id = new mongoose.Types.ObjectId();
    const learner3Id = new mongoose.Types.ObjectId(); // unattempted learner

    const course1Id = new mongoose.Types.ObjectId();
    const emptyCourseId = new mongoose.Types.ObjectId();

    const topic1Id = new mongoose.Types.ObjectId();
    const topic2Id = new mongoose.Types.ObjectId();

    createdUserIds.push(instructor1Id, instructor2Id, learner1Id, learner2Id, learner3Id);
    createdCourseIds.push(course1Id, emptyCourseId);
    createdTopicIds.push(topic1Id, topic2Id);

    const instructor1 = await User.create({
        _id: instructor1Id,
        name: "Professor Owner",
        email: "prof_owner@test.com",
        password: "password123",
        role: "INSTRUCTOR",
        status: "ACTIVE",
    });

    const instructor2 = await User.create({
        _id: instructor2Id,
        name: "Professor Other",
        email: "prof_other@test.com",
        password: "password123",
        role: "INSTRUCTOR",
        status: "ACTIVE",
    });

    const learner1 = await User.create({
        _id: learner1Id,
        name: "Learner Weak",
        email: "learner_weak@test.com",
        password: "password123",
        role: "LEARNER",
        status: "ACTIVE",
    });

    const learner2 = await User.create({
        _id: learner2Id,
        name: "Learner Strong",
        email: "learner_strong@test.com",
        password: "password123",
        role: "LEARNER",
        status: "ACTIVE",
    });

    const learner3 = await User.create({
        _id: learner3Id,
        name: "Learner New",
        email: "learner_new@test.com",
        password: "password123",
        role: "LEARNER",
        status: "ACTIVE",
    });

    const instructor1Token = makeToken(instructor1);
    const instructor2Token = makeToken(instructor2);
    const learner1Token = makeToken(learner1);

    // Course 1 owned by instructor1
    await Course.create({
        _id: course1Id,
        title: "Advanced Data Structures & Algorithms",
        description: "Master foundational and advanced data structures and algorithms in computer science.",
        createdBy: instructor1Id,
        domain: "Computer Science",
        category: "Algorithms",
        difficulty: "ADVANCED",
        status: "PUBLISHED",
    });

    // Empty Course owned by instructor1
    await Course.create({
        _id: emptyCourseId,
        title: "Empty Course with No Learners",
        description: "A newly created course that has no enrollments or student activity.",
        createdBy: instructor1Id,
        domain: "Mathematics",
        category: "Topology",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
    });

    // Two Topics for Course 1
    await Topic.create([
        {
            _id: topic1Id,
            courseId: course1Id,
            title: "Binary Search Trees",
            description: "Self-balancing binary search trees and tree traversals",
            order: 1,
        },
        {
            _id: topic2Id,
            courseId: course1Id,
            title: "Dynamic Programming",
            description: "Optimal substructure and memoization strategies",
            order: 2,
        },
    ]);

    // Enrollments: Learner 1, 2, 3 enrolled in Course 1
    const enr1 = await Enrollment.create({ learnerId: learner1Id, courseId: course1Id, status: "ACTIVE" });
    const enr2 = await Enrollment.create({ learnerId: learner2Id, courseId: course1Id, status: "ACTIVE" });
    const enr3 = await Enrollment.create({ learnerId: learner3Id, courseId: course1Id, status: "ACTIVE" });
    createdEnrollmentIds.push(enr1._id, enr2._id, enr3._id);

    // Evidence: Learner 1 has 1 attempt with low score on Topic 1
    const ev1 = await LearningEvidence.create({
        learnerId: learner1Id,
        courseId: course1Id,
        topicId: topic1Id,
        sourceType: "PRACTICE",
        sourceId: new mongoose.Types.ObjectId(),
        attemptId: new mongoose.Types.ObjectId(),
        totalQuestions: 5,
        correctCount: 2,
        totalMarks: 5,
        marksAwarded: 2,
        scorePercent: 40,
        contributeToLearningEvidence: true,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    });

    // Evidence: Learner 2 has 2 attempts with high scores on Topic 1 & 2
    const ev2 = await LearningEvidence.create({
        learnerId: learner2Id,
        courseId: course1Id,
        topicId: topic1Id,
        sourceType: "PRACTICE",
        sourceId: new mongoose.Types.ObjectId(),
        attemptId: new mongoose.Types.ObjectId(),
        totalQuestions: 5,
        correctCount: 5,
        totalMarks: 5,
        marksAwarded: 5,
        scorePercent: 100,
        contributeToLearningEvidence: true,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const ev3 = await LearningEvidence.create({
        learnerId: learner2Id,
        courseId: course1Id,
        topicId: topic2Id,
        sourceType: "ASSESSMENT",
        sourceId: new mongoose.Types.ObjectId(),
        attemptId: new mongoose.Types.ObjectId(),
        assessmentSubtype: "TOPIC",
        totalQuestions: 5,
        correctCount: 4,
        totalMarks: 10,
        marksAwarded: 8,
        scorePercent: 80,
        contributeToLearningEvidence: true,
        completedAt: new Date(),
    });
    createdEvidenceIds.push(ev1._id, ev2._id, ev3._id);

    // TopicMastery:
    // Topic 1: Learner 1 is NEEDS_IMPROVEMENT (40%), Learner 2 is STRONG (95%)
    // Topic 2: Learner 2 is STRONG (80%), Learner 1 has no record (insufficient evidence)
    // Learner 3 has no record anywhere (insufficient evidence)
    const tm1 = await TopicMastery.create({
        learnerId: learner1Id,
        courseId: course1Id,
        topicId: topic1Id,
        status: MASTERY_STATUS.NEEDS_IMPROVEMENT,
        masteryScore: 40,
        confidence: 0.5,
        evidenceCount: 1,
    });

    const tm2 = await TopicMastery.create({
        learnerId: learner2Id,
        courseId: course1Id,
        topicId: topic1Id,
        status: MASTERY_STATUS.STRONG,
        masteryScore: 95,
        confidence: 0.9,
        evidenceCount: 2,
    });

    const tm3 = await TopicMastery.create({
        learnerId: learner2Id,
        courseId: course1Id,
        topicId: topic2Id,
        status: MASTERY_STATUS.STRONG,
        masteryScore: 80,
        confidence: 0.8,
        evidenceCount: 1,
    });
    createdMasteryIds.push(tm1._id, tm2._id, tm3._id);

    // ==========================================
    // 2. Unit / Service Tests
    // ==========================================

    await t.test("getInstructorCourseAnalyticsService aggregates course metrics accurately", async () => {
        const data = await getInstructorCourseAnalyticsService(instructor1Id, course1Id);

        assert.equal(data.course.courseId, course1Id.toString());
        assert.equal(data.course.title, "Advanced Data Structures & Algorithms");
        assert.equal(data.course.totalTopicsCount, 2);

        // Overview metrics
        assert.equal(data.overview.totalEnrolledLearners, 3);
        assert.equal(data.overview.enrollmentBreakdown.active, 3);
        assert.equal(data.overview.activeLearners.totalActiveAllTime, 2); // Learner 1 & 2 have evidence; Learner 3 has 0
        assert.equal(data.overview.activeLearners.activeLast7Days, 2);
        assert.equal(data.overview.totalEligibleAttempts, 3);
        assert.ok(data.overview.overallAverageAccuracy > 0);
        assert.equal(data.overview.learnersNeedingAttentionCount, 1); // Learner 1 has NEEDS_IMPROVEMENT
        assert.equal(data.overview.learnersAwaitingEvidenceCount, 1); // Learner 3 has no scored topics
    });

    await t.test("Topic mastery distribution accurately calculates percentages and preserves INSUFFICIENT_EVIDENCE", async () => {
        const data = await getInstructorCourseAnalyticsService(instructor1Id, course1Id);

        const topic1 = data.topicsPerformance.find((t) => t.topicId === topic1Id.toString());
        assert.ok(topic1);
        assert.equal(topic1.totalEnrolled, 3);
        assert.equal(topic1.evaluatedLearnersCount, 2);
        assert.equal(topic1.averageMasteryScore, Math.round((40 + 95) / 2)); // 68

        // Distributions: 1 STRONG, 0 DEVELOPING, 1 NEEDS_IMPROVEMENT, 1 INSUFFICIENT_EVIDENCE (Learner 3)
        assert.equal(topic1.masteryDistribution.STRONG.count, 1);
        assert.equal(topic1.masteryDistribution.NEEDS_IMPROVEMENT.count, 1);
        assert.equal(topic1.masteryDistribution.INSUFFICIENT_EVIDENCE.count, 1);

        const topic2 = data.topicsPerformance.find((t) => t.topicId === topic2Id.toString());
        assert.ok(topic2);
        // Topic 2: Learner 2 has STRONG; Learner 1 & 3 have INSUFFICIENT_EVIDENCE
        assert.equal(topic2.masteryDistribution.STRONG.count, 1);
        assert.equal(topic2.masteryDistribution.INSUFFICIENT_EVIDENCE.count, 2);
    });

    await t.test("Evidence-based topic performance calculates needs-improvement distribution and does not invent arbitrary weak thresholds", async () => {
        const data = await getInstructorCourseAnalyticsService(instructor1Id, course1Id);

        // Topic 1 has 1 of 2 evaluated learners with NEEDS_IMPROVEMENT (50%)
        const topic1 = data.topicsPerformance.find((t) => t.topicId === topic1Id.toString());
        assert.equal(topic1.needsImprovementCount, 1);
        assert.equal(topic1.evaluatedLearnersCount, 2);
        assert.equal(topic1.needsImprovementPercentage, 50);

        // Topic 2 has 2 learners with INSUFFICIENT_EVIDENCE, but 0 NEEDS_IMPROVEMENT -> 0%
        const topic2 = data.topicsPerformance.find((t) => t.topicId === topic2Id.toString());
        assert.equal(topic2.needsImprovementCount, 0);
        assert.equal(topic2.evaluatedLearnersCount, 1);
        assert.equal(topic2.needsImprovementPercentage, 0);
    });

    await t.test("Learner breakdown includes privacy-safe identity, confidence, evidence count, and null-safe scores", async () => {
        const data = await getInstructorCourseAnalyticsService(instructor1Id, course1Id);

        assert.equal(data.learners.items.length, 3);

        const weakLearner = data.learners.items.find((l) => l.learnerId === learner1Id.toString());
        assert.ok(weakLearner);
        assert.equal(weakLearner.name, "Learner Weak");
        assert.equal(weakLearner.needsAttention, true);
        assert.equal(weakLearner.isAwaitingEvidence, false);
        assert.equal(weakLearner.averageMasteryScore, 40);

        // Verify topic details within learner
        const l1t1 = weakLearner.topics.find((t) => t.topicId === topic1Id.toString());
        assert.equal(l1t1.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
        assert.equal(l1t1.masteryScore, 40);
        assert.equal(l1t1.confidence, 0.5);
        assert.equal(l1t1.evidenceCount, 1);

        const l1t2 = weakLearner.topics.find((t) => t.topicId === topic2Id.toString());
        assert.equal(l1t2.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(l1t2.masteryScore, null); // Must be null, never 0%

        const newLearner = data.learners.items.find((l) => l.learnerId === learner3Id.toString());
        assert.ok(newLearner);
        assert.equal(newLearner.name, "Learner New");
        assert.equal(newLearner.isAwaitingEvidence, true);
        assert.equal(newLearner.averageMasteryScore, null);
        assert.equal(newLearner.insufficientEvidenceTopicsCount, 2);
    });

    await t.test("Empty course with no learners and no attempts returns clean zero/null aggregates without throwing", async () => {
        const data = await getInstructorCourseAnalyticsService(instructor1Id, emptyCourseId);

        assert.equal(data.course.courseId, emptyCourseId.toString());
        assert.equal(data.overview.totalEnrolledLearners, 0);
        assert.equal(data.overview.activeLearners.totalActiveAllTime, 0);
        assert.equal(data.overview.totalEligibleAttempts, 0);
        assert.equal(data.overview.overallAverageAccuracy, null);
        assert.equal(data.learners.items.length, 0);
        assert.equal(data.learners.pagination.totalItems, 0);
    });

    // ==========================================
    // Regression Tests
    // ==========================================

    await t.test("Regression: Learner with historical WITHDRAWN enrollment followed by current ACTIVE enrollment is counted exactly once", async () => {
        const reenrollLearnerId = new mongoose.Types.ObjectId();
        const reenrollCourseId = new mongoose.Types.ObjectId();
        const reenrollTopicId = new mongoose.Types.ObjectId();

        createdUserIds.push(reenrollLearnerId);
        createdCourseIds.push(reenrollCourseId);
        createdTopicIds.push(reenrollTopicId);

        await User.create({
            _id: reenrollLearnerId,
            name: "Reenrolled Learner",
            email: "reenrolled@test.com",
            password: "password123",
            role: "LEARNER",
            status: "ACTIVE",
        });

        await Course.create({
            _id: reenrollCourseId,
            title: "Course with Re-enrolled Learner",
            description: "Testing historical enrollment deduplication.",
            createdBy: instructor1Id,
            domain: "Computer Science",
            category: "Algorithms",
            difficulty: "INTERMEDIATE",
            status: "PUBLISHED",
        });

        await Topic.create({
            _id: reenrollTopicId,
            courseId: reenrollCourseId,
            title: "Reenroll Topic",
            order: 1,
        });

        // 1st historical enrollment: WITHDRAWN (created earlier)
        const oldEnr = await Enrollment.create({
            learnerId: reenrollLearnerId,
            courseId: reenrollCourseId,
            status: "WITHDRAWN",
            enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        });

        // 2nd current enrollment: ACTIVE (created later)
        const currentEnr = await Enrollment.create({
            learnerId: reenrollLearnerId,
            courseId: reenrollCourseId,
            status: "ACTIVE",
            enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        });
        createdEnrollmentIds.push(oldEnr._id, currentEnr._id);

        const data = await getInstructorCourseAnalyticsService(instructor1Id, reenrollCourseId);

        // Verify deduplication: single learner counted
        assert.equal(data.overview.totalEnrolledLearners, 1);
        assert.equal(data.overview.enrollmentBreakdown.active, 1);
        assert.equal(data.overview.enrollmentBreakdown.withdrawn, 0);

        // Topic performance totalEnrolled should not be inflated
        assert.equal(data.topicsPerformance[0].totalEnrolled, 1);

        // Learner items contains exactly one entry with current status ACTIVE
        assert.equal(data.learners.items.length, 1);
        assert.equal(data.learners.items[0].learnerId, reenrollLearnerId.toString());
        assert.equal(data.learners.items[0].enrollmentStatus, "ACTIVE");
    });

    await t.test("Regression: Overview metrics remain invariant when learner table filters and search are applied", async () => {
        // Query course1 with status=COMPLETED (which matches 0 learners)
        const filteredData = await getInstructorCourseAnalyticsService(instructor1Id, course1Id, {
            status: "COMPLETED",
        });

        // Learners items filtered down to 0
        assert.equal(filteredData.learners.items.length, 0);
        assert.equal(filteredData.learners.pagination.totalItems, 0);

        // Overview metrics MUST remain course-wide invariant
        assert.equal(filteredData.overview.totalEnrolledLearners, 3);
        assert.equal(filteredData.overview.enrollmentBreakdown.active, 3);
        assert.equal(filteredData.overview.learnersWithNeedsImprovementCount, 1);
        assert.equal(filteredData.overview.learnersAwaitingEvidenceCount, 1);

        // Query with search that matches no learners
        const searchedData = await getInstructorCourseAnalyticsService(instructor1Id, course1Id, {
            search: "NonexistentLearnerXYZ",
        });

        assert.equal(searchedData.learners.items.length, 0);
        assert.equal(searchedData.overview.totalEnrolledLearners, 3);
        assert.equal(searchedData.overview.learnersWithNeedsImprovementCount, 1);
        assert.equal(searchedData.overview.learnersAwaitingEvidenceCount, 1);
    });

    await t.test("Regression: Legacy FUNCTIONAL mastery status is preserved and not classified as INSUFFICIENT_EVIDENCE", async () => {
        const funcLearnerId = new mongoose.Types.ObjectId();
        const funcCourseId = new mongoose.Types.ObjectId();
        const funcTopicId = new mongoose.Types.ObjectId();

        createdUserIds.push(funcLearnerId);
        createdCourseIds.push(funcCourseId);
        createdTopicIds.push(funcTopicId);

        await User.create({
            _id: funcLearnerId,
            name: "Functional Learner",
            email: "functional@test.com",
            password: "password123",
            role: "LEARNER",
            status: "ACTIVE",
        });

        await Course.create({
            _id: funcCourseId,
            title: "Course with Functional Mastery",
            description: "Testing FUNCTIONAL mastery status preservation.",
            difficulty: "INTERMEDIATE",
            domain: "Computer Science",
            category: "Algorithms",
            createdBy: instructor1Id,
            status: "PUBLISHED",
        });

        await Topic.create({
            _id: funcTopicId,
            courseId: funcCourseId,
            title: "Functional Topic",
            order: 1,
        });

        const funcEnr = await Enrollment.create({
            learnerId: funcLearnerId,
            courseId: funcCourseId,
            status: "ACTIVE",
        });
        createdEnrollmentIds.push(funcEnr._id);

        const funcTm = await TopicMastery.create({
            learnerId: funcLearnerId,
            courseId: funcCourseId,
            topicId: funcTopicId,
            status: MASTERY_STATUS.FUNCTIONAL,
            masteryScore: 70,
            confidence: 0.7,
            evidenceCount: 2,
        });
        createdMasteryIds.push(funcTm._id);

        const data = await getInstructorCourseAnalyticsService(instructor1Id, funcCourseId);

        const topic = data.topicsPerformance[0];
        assert.equal(topic.evaluatedLearnersCount, 1);
        // FUNCTIONAL counted in STRONG/Proficient bucket
        assert.equal(topic.masteryDistribution.STRONG.count, 1);
        assert.equal(topic.masteryDistribution.INSUFFICIENT_EVIDENCE.count, 0);

        const learner = data.learners.items[0];
        assert.equal(learner.isAwaitingEvidence, false);
        assert.equal(learner.topics[0].status, "FUNCTIONAL");
        assert.equal(learner.topics[0].masteryScore, 70);
    });

    // ==========================================
    // 3. Authorization & HTTP API Tests
    // ==========================================

    await t.test("GET /api/v1/instructor/courses/:courseId/analytics: authorized owner succeeds with 200", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/courses/${course1Id}/analytics`,
            token: instructor1Token,
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.body.data.overview);
        assert.equal(res.body.data.course.courseId, course1Id.toString());
    });

    await t.test("GET /api/v1/instructor/courses/:courseId/analytics: unauthorized instructor is rejected with 403", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/courses/${course1Id}/analytics`,
            token: instructor2Token, // Does NOT own course1
        });

        assert.equal(res.statusCode, 403);
        assert.equal(res.body.error?.code, "COURSE_ACCESS_DENIED");
    });

    await t.test("GET /api/v1/instructor/courses/:courseId/analytics: learner role is rejected with 403", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/courses/${course1Id}/analytics`,
            token: learner1Token,
        });

        assert.equal(res.statusCode, 403);
    });

    await t.test("GET /api/v1/instructor/courses/:courseId/analytics: unauthenticated request is rejected with 401", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/courses/${course1Id}/analytics`,
        });

        assert.equal(res.statusCode, 401);
    });

    await t.test("GET /api/v1/instructor/courses/:courseId/analytics: invalid courseId param is rejected with 400", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/instructor/courses/not-an-objectid/analytics`,
            token: instructor1Token,
        });

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error?.code, "VALIDATION_ERROR");
    });

    // Cleanup fixtures
    await t.test("Cleanup test fixtures", async () => {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Course.deleteMany({ _id: { $in: createdCourseIds } });
        await Topic.deleteMany({ _id: { $in: createdTopicIds } });
        await Enrollment.deleteMany({ _id: { $in: createdEnrollmentIds } });
        await LearningEvidence.deleteMany({ _id: { $in: createdEvidenceIds } });
        await TopicMastery.deleteMany({ _id: { $in: createdMasteryIds } });

        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
    });
});
