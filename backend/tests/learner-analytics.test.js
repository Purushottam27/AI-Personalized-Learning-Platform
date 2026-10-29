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
import { Practice } from "../src/modules/practice/models/practice.model.js";
import { PracticeAttempt } from "../src/modules/practice/models/practiceAttempt.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import { MASTERY_STATUS } from "../src/modules/topicMastery/constants/mastery.constants.js";
import {
    calculateStreak,
    calculateStudyMinutes,
    buildContinuousDailyTrends,
    getLearnerDashboardService,
    getLearnerCourseProgressService,
    getLearnerAnalyticsOverviewService,
} from "../src/modules/analytics/services/learnerAnalytics.service.js";
import { ANALYTICS_ERROR_CODES } from "../src/modules/analytics/constants/analytics.constants.js";

test("Stage 8 — Progress & Analytics Test Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    // Connect to test database
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    }

    const instructorId = new mongoose.Types.ObjectId();
    const newLearnerId = new mongoose.Types.ObjectId();
    const activeLearnerId = new mongoose.Types.ObjectId();
    const otherLearnerId = new mongoose.Types.ObjectId();

    const course1Id = new mongoose.Types.ObjectId();
    const draftCourseId = new mongoose.Types.ObjectId();
    const topic1Id = new mongoose.Types.ObjectId();
    const topic2Id = new mongoose.Types.ObjectId();
    const topic3Id = new mongoose.Types.ObjectId();
    const practice1Id = new mongoose.Types.ObjectId();

    const createdUserIds = [instructorId, newLearnerId, activeLearnerId, otherLearnerId];
    const createdCourseIds = [course1Id, draftCourseId];
    const createdTopicIds = [topic1Id, topic2Id, topic3Id];
    const createdPracticeIds = [practice1Id];
    const createdAttemptIds = [];
    const createdEvidenceIds = [];
    const createdMasteryIds = [];
    const createdEnrollmentIds = [];

    function createToken(userId, role) {
        return jwt.sign(
            { sub: userId.toString(), role },
            JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );
    }

    const newLearnerToken = createToken(newLearnerId, "LEARNER");
    const activeLearnerToken = createToken(activeLearnerId, "LEARNER");
    const otherLearnerToken = createToken(otherLearnerId, "LEARNER");
    const instructorToken = createToken(instructorId, "INSTRUCTOR");

    // Start local test server
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    function apiRequest({ method = "GET", reqPath, token, body }) {
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
                    res.on("data", (chunk) => {
                        raw += chunk;
                    });
                    res.on("end", () => {
                        let parsed;
                        try {
                            parsed = JSON.parse(raw);
                        } catch {
                            parsed = raw;
                        }
                        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
                    });
                }
            );
            req.on("error", reject);
            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    // Setup Fixtures
    await t.test("Setup test fixtures in isolated database", async () => {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Course.deleteMany({ _id: { $in: createdCourseIds } });
        await Topic.deleteMany({ _id: { $in: createdTopicIds } });
        await Practice.deleteMany({ _id: { $in: createdPracticeIds } });
        await Enrollment.deleteMany({ learnerId: { $in: createdUserIds } });
        await LearningEvidence.deleteMany({ learnerId: { $in: createdUserIds } });
        await TopicMastery.deleteMany({ learnerId: { $in: createdUserIds } });

        // Create Users
        await User.create([
            {
                _id: instructorId,
                name: "Instructor Alice",
                email: `instructor_alice_${Date.now()}@example.com`,
                role: "INSTRUCTOR",
                status: "ACTIVE",
            },
            {
                _id: newLearnerId,
                name: "New Learner Bob",
                email: `new_bob_${Date.now()}@example.com`,
                role: "LEARNER",
                status: "ACTIVE",
            },
            {
                _id: activeLearnerId,
                name: "Active Learner Charlie",
                email: `charlie_${Date.now()}@example.com`,
                role: "LEARNER",
                status: "ACTIVE",
            },
            {
                _id: otherLearnerId,
                name: "Other Learner Dave",
                email: `dave_${Date.now()}@example.com`,
                role: "LEARNER",
                status: "ACTIVE",
            },
        ]);

        // Create Courses
        await Course.create([
            {
                _id: course1Id,
                title: "Data Structures & Algorithms",
                description: "DSA Core Curriculum comprehensive course for intermediate developers",
                createdBy: instructorId,
                domain: "Computer Science",
                category: "Algorithms",
                difficulty: "INTERMEDIATE",
                objectives: ["Master BST and Graph Traversals", "Understand Dynamic Programming"],
                status: "PUBLISHED",
            },
            {
                _id: draftCourseId,
                title: "Advanced Distributed Systems",
                description: "Draft Course comprehensive curriculum for advanced developers",
                createdBy: instructorId,
                domain: "Systems",
                category: "Cloud",
                difficulty: "ADVANCED",
                objectives: ["Consensus algorithms", "Fault tolerance"],
                status: "DRAFT",
            },
        ]);

        // Create Topics for Course 1
        await Topic.create([
            {
                _id: topic1Id,
                courseId: course1Id,
                title: "Binary Search Trees",
                description: "BST operations",
                learningObjectives: ["Understand BST search, insertion, and deletion"],
                order: 1,
            },
            {
                _id: topic2Id,
                courseId: course1Id,
                title: "Graph Traversal",
                description: "BFS and DFS",
                learningObjectives: ["Understand BFS and DFS algorithms"],
                order: 2,
            },
            {
                _id: topic3Id,
                courseId: course1Id,
                title: "Dynamic Programming",
                description: "Memoization and Tabulation",
                learningObjectives: ["Understand optimal substructure and overlapping subproblems"],
                order: 3,
            },
        ]);

        // Active learner enrolls in course 1
        const enr = await Enrollment.create({
            learnerId: activeLearnerId,
            courseId: course1Id,
            status: "ACTIVE",
            enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        });
        createdEnrollmentIds.push(enr._id);

        // Practice attempt (completed)
        const practiceAttemptId = new mongoose.Types.ObjectId();
        createdAttemptIds.push(practiceAttemptId);
        await PracticeAttempt.create({
            _id: practiceAttemptId,
            practiceId: new mongoose.Types.ObjectId(),
            learnerId: activeLearnerId,
            courseId: course1Id,
            topicId: topic1Id,
            attemptNumber: 1,
            status: "SUBMITTED",
            startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 15 mins
            questions: [{
                questionId: new mongoose.Types.ObjectId(),
                questionText: "What is BST?",
                type: "MCQ_SINGLE",
                correctAnswer: "A",
                marks: 1,
                difficulty: "EASY",
            }],
            totalQuestions: 10,
            totalMarks: 10,
            marksAwarded: 9,
            scorePercent: 90,
            correctCount: 9,
            contributeToLearningEvidence: true,
        });

        // Evidence from Practice Attempt
        const ev1 = await LearningEvidence.create({
            learnerId: activeLearnerId,
            courseId: course1Id,
            topicId: topic1Id,
            sourceType: "PRACTICE",
            sourceId: new mongoose.Types.ObjectId(),
            attemptId: practiceAttemptId,
            scorePercent: 90,
            correctCount: 9,
            totalQuestions: 10,
            marksAwarded: 9,
            totalMarks: 10,
            passed: true,
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            contributeToLearningEvidence: true,
        });
        createdEvidenceIds.push(ev1._id);

        // Assessment attempt (completed)
        const assessmentAttemptId = new mongoose.Types.ObjectId();
        createdAttemptIds.push(assessmentAttemptId);
        const dummyQuestions = Array.from({ length: 5 }, (_, i) => ({
            questionId: new mongoose.Types.ObjectId(),
            questionText: `Question ${i + 1} text`,
            type: "MCQ_SINGLE",
            correctAnswer: "A",
            marks: 2,
        }));

        await AssessmentAttempt.create({
            _id: assessmentAttemptId,
            assessmentId: new mongoose.Types.ObjectId(),
            learnerId: activeLearnerId,
            courseId: course1Id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passingScore: 70,
            startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000), // 20 mins
            questions: dummyQuestions,
            totalMarks: 10,
            marksAwarded: 8,
            scorePercent: 80,
            passed: true,
        });

        // Evidence from Assessment Attempt
        const ev2 = await LearningEvidence.create({
            learnerId: activeLearnerId,
            courseId: course1Id,
            topicId: topic2Id,
            sourceType: "ASSESSMENT",
            assessmentSubtype: "TOPIC",
            sourceId: new mongoose.Types.ObjectId(),
            attemptId: assessmentAttemptId,
            scorePercent: 75,
            correctCount: 6,
            totalQuestions: 8,
            marksAwarded: 6,
            totalMarks: 8,
            passed: true,
            completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            contributeToLearningEvidence: true,
        });
        createdEvidenceIds.push(ev2._id);

        // TopicMastery records
        const tm1 = await TopicMastery.create({
            learnerId: activeLearnerId,
            courseId: course1Id,
            topicId: topic1Id,
            masteryScore: 88,
            confidence: 0.85,
            status: MASTERY_STATUS.MASTERED,
            evidenceCount: 1,
            practiceAttemptsCount: 1,
            assessmentAttemptsCount: 0,
            lastEvaluatedAt: new Date(),
        });
        createdMasteryIds.push(tm1._id);

        const tm2 = await TopicMastery.create({
            learnerId: activeLearnerId,
            courseId: course1Id,
            topicId: topic2Id,
            masteryScore: 72,
            confidence: 0.7,
            status: MASTERY_STATUS.STRONG,
            evidenceCount: 1,
            practiceAttemptsCount: 0,
            assessmentAttemptsCount: 1,
            lastEvaluatedAt: new Date(),
        });
        createdMasteryIds.push(tm2._id);

        const tm3 = await TopicMastery.create({
            learnerId: activeLearnerId,
            courseId: course1Id,
            topicId: topic3Id,
            masteryScore: 30,
            confidence: 0.5,
            status: MASTERY_STATUS.NEEDS_IMPROVEMENT,
            evidenceCount: 1,
            practiceAttemptsCount: 1,
            assessmentAttemptsCount: 0,
            lastEvaluatedAt: new Date(),
        });
        createdMasteryIds.push(tm3._id);
    });

    // --- Unit / Calculation Function Tests ---

    await t.test("Unit: calculateStreak correctly tracks consecutive study days", () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dayBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

        // Empty array returns 0
        assert.equal(calculateStreak([]), 0);
        assert.equal(calculateStreak(null), 0);

        // Active today and yesterday -> streak of 2
        assert.equal(calculateStreak([now, yesterday]), 2);

        // Active today, yesterday, and day before -> streak of 3
        assert.equal(calculateStreak([now, yesterday, dayBefore]), 3);

        // Broken streak: active 5 days ago only -> streak of 0
        const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        assert.equal(calculateStreak([fiveDaysAgo]), 0);
    });

    await t.test("Unit: calculateStudyMinutes respects attempt durations and question fallbacks", () => {
        const attemptMap = new Map();
        const start = new Date("2026-03-01T10:00:00Z");
        const end = new Date("2026-03-01T10:15:00Z"); // 15 mins
        const attemptId = new mongoose.Types.ObjectId().toString();
        attemptMap.set(attemptId, { startedAt: start, submittedAt: end });

        const evidenceWithAttempt = [{ attemptId, totalQuestions: 10 }];
        const minutes1 = calculateStudyMinutes(evidenceWithAttempt, attemptMap);
        assert.equal(minutes1, 15);

        // Fallback when attempt not in map (5 questions * 1.5 mins = 8 mins rounded)
        const evidenceFallback = [{ attemptId: new mongoose.Types.ObjectId().toString(), totalQuestions: 5 }];
        const minutes2 = calculateStudyMinutes(evidenceFallback, new Map());
        assert.equal(minutes2, 8);
    });

    await t.test("Unit: buildContinuousDailyTrends generates zero-filled days in the window", () => {
        const trends = buildContinuousDailyTrends([], 7);
        assert.equal(trends.length, 7);
        for (const day of trends) {
            assert.ok(typeof day.date === "string");
            assert.equal(day.practiceCount, 0);
            assert.equal(day.assessmentCount, 0);
            assert.equal(day.accuracyPercent, 0);
            assert.equal(day.averageScore, 0);
        }
    });

    // --- Endpoints Tests ---

    await t.test("GET /api/v1/learning/me/dashboard: returns valid empty state for new learner with no evidence", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: "/api/v1/learning/me/dashboard",
            token: newLearnerToken,
        });

        assert.equal(res.statusCode, 200);
        assert.ok(res.body.success);
        const data = res.body.data;

        assert.equal(data.continueLearning, null);
        assert.equal(data.progress, null);
        assert.deepEqual(data.strengths, []);
        assert.deepEqual(data.needsAttention, []);
        assert.deepEqual(data.recentActivity, []);
        assert.ok(data.summary !== null);
        assert.equal(data.summary.weeklyStudyMinutes, 0);
        assert.equal(data.summary.currentStreakDays, 0);
    });

    await t.test("GET /api/v1/learning/me/dashboard: returns unified aggregation for active learner", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: "/api/v1/learning/me/dashboard",
            token: activeLearnerToken,
        });

        assert.equal(res.statusCode, 200);
        assert.ok(res.body.success);
        const data = res.body.data;

        // Verify continueLearning and progress
        assert.ok(data.continueLearning);
        assert.equal(data.continueLearning.courseId, course1Id.toString());
        assert.equal(data.continueLearning.courseTitle, "Data Structures & Algorithms");
        assert.equal(data.continueLearning.totalTopics, 3);
        assert.equal(data.continueLearning.completedTopics, 2); // topic1 (MASTERED) and topic2 (STRONG)
        assert.equal(data.continueLearning.progressPercentage, 67); // 2/3 = 67%

        // Verify strengths and weaknesses
        assert.equal(data.strengths.length, 2);
        assert.equal(data.strengths[0].title, "Binary Search Trees");
        assert.equal(data.needsAttention.length, 1);
        assert.equal(data.needsAttention[0].title, "Dynamic Programming");

        // Verify summary
        assert.ok(data.summary.weeklyStudyMinutes > 0);
        assert.equal(data.summary.topicsCompletedThisWeek, 2);

        // Verify recentActivity contains the 2 evidence items + 1 enrollment item
        assert.ok(data.recentActivity.length >= 2);
        const types = data.recentActivity.map((a) => a.type);
        assert.ok(types.includes("PRACTICE_COMPLETED"));
        assert.ok(types.includes("ASSESSMENT_PASSED"));
        assert.ok(types.includes("COURSE_ENROLLED"));
    });

    await t.test("GET /api/v1/learning/me/courses/:courseId/progress: returns topic breakdown for enrolled course", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/learning/me/courses/${course1Id}/progress`,
            token: activeLearnerToken,
        });

        assert.equal(res.statusCode, 200);
        assert.ok(res.body.success);
        const data = res.body.data;

        assert.equal(data.courseId, course1Id.toString());
        assert.equal(data.courseTitle, "Data Structures & Algorithms");
        assert.equal(data.totalTopics, 3);
        assert.equal(data.evaluatedTopics, 3);
        assert.equal(data.masteredTopics, 2);
        assert.equal(data.progressPercentage, 67);
        assert.equal(data.topics.length, 3);

        const bstTopic = data.topics.find((t) => t.title === "Binary Search Trees");
        assert.ok(bstTopic);
        assert.equal(bstTopic.masteryScore, 88);
        assert.equal(bstTopic.status, MASTERY_STATUS.MASTERED);

        const dpTopic = data.topics.find((t) => t.title === "Dynamic Programming");
        assert.ok(dpTopic);
        assert.equal(dpTopic.masteryScore, 30);
        assert.equal(dpTopic.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
    });

    await t.test("GET /api/v1/learning/me/courses/:courseId/progress: rejects unenrolled learner with 403", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/learning/me/courses/${course1Id}/progress`,
            token: otherLearnerToken,
        });

        assert.equal(res.statusCode, 403);
        assert.equal(res.body.error?.code, ANALYTICS_ERROR_CODES.ACTIVE_ENROLLMENT_REQUIRED);
    });

    await t.test("GET /api/v1/learning/me/courses/:courseId/progress: rejects draft course with 404", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: `/api/v1/learning/me/courses/${draftCourseId}/progress`,
            token: activeLearnerToken,
        });

        assert.equal(res.statusCode, 404);
        assert.equal(res.body.error?.code, ANALYTICS_ERROR_CODES.COURSE_NOT_AVAILABLE);
    });

    await t.test("GET /api/v1/learning/me/courses/:courseId/progress: rejects invalid ObjectId with 400", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: "/api/v1/learning/me/courses/not-an-objectid/progress",
            token: activeLearnerToken,
        });

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error?.code, "VALIDATION_ERROR");
    });

    await t.test("GET /api/v1/learning/me/analytics/overview: returns metrics, mastery distribution, and continuous trends", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: "/api/v1/learning/me/analytics/overview?days=7",
            token: activeLearnerToken,
        });

        assert.equal(res.statusCode, 200);
        assert.ok(res.body.success);
        const data = res.body.data;

        // Activity totals
        assert.equal(data.activityTotals.activeCoursesCount, 1);
        assert.equal(data.activityTotals.totalPracticesCompleted, 1);
        assert.equal(data.activityTotals.totalAssessmentsCompleted, 1);
        assert.equal(data.activityTotals.totalQuestionsAttempted, 18); // 10 + 8
        assert.equal(data.activityTotals.totalQuestionsCorrect, 15); // 9 + 6
        assert.equal(data.activityTotals.overallAccuracy, 83); // 15/18 = 83%

        // Mastery distribution
        assert.equal(data.masteryDistribution.MASTERED, 1);
        assert.equal(data.masteryDistribution.STRONG, 1);
        assert.equal(data.masteryDistribution.NEEDS_IMPROVEMENT, 1);

        // Continuous trends
        assert.equal(data.dailyTrends.length, 7);

        // Course progress list
        assert.equal(data.courseProgressList.length, 1);
        assert.equal(data.courseProgressList[0].courseTitle, "Data Structures & Algorithms");
        assert.equal(data.courseProgressList[0].progressPercentage, 67);
    });

    await t.test("GET /api/v1/learning/me/analytics/overview: validates query days boundary (days > 30 returns 400)", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: "/api/v1/learning/me/analytics/overview?days=100",
            token: activeLearnerToken,
        });

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error?.code, "VALIDATION_ERROR");
    });

    await t.test("GET /api/v1/learning/me/dashboard: requires LEARNER role (rejects INSTRUCTOR with 403)", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: "/api/v1/learning/me/dashboard",
            token: instructorToken,
        });

        assert.equal(res.statusCode, 403);
    });

    await t.test("GET /api/v1/learning/me/dashboard: rejects unauthenticated request with 401", async () => {
        const res = await apiRequest({
            method: "GET",
            reqPath: "/api/v1/learning/me/dashboard",
        });

        assert.equal(res.statusCode, 401);
    });

    await t.test("Data-Integrity Check: analytics endpoints are read-only and never mutate evidence or mastery", async () => {
        const evidenceBefore = await LearningEvidence.countDocuments({ learnerId: activeLearnerId });
        const masteryBefore = await TopicMastery.countDocuments({ learnerId: activeLearnerId });

        // Invoke all three analytics endpoints
        await apiRequest({ method: "GET", reqPath: "/api/v1/learning/me/dashboard", token: activeLearnerToken });
        await apiRequest({ method: "GET", reqPath: `/api/v1/learning/me/courses/${course1Id}/progress`, token: activeLearnerToken });
        await apiRequest({ method: "GET", reqPath: "/api/v1/learning/me/analytics/overview", token: activeLearnerToken });

        const evidenceAfter = await LearningEvidence.countDocuments({ learnerId: activeLearnerId });
        const masteryAfter = await TopicMastery.countDocuments({ learnerId: activeLearnerId });

        assert.equal(evidenceAfter, evidenceBefore, "LearningEvidence records must not be mutated or created");
        assert.equal(masteryAfter, masteryBefore, "TopicMastery records must not be mutated or created");
    });

    // Cleanup fixtures
    await t.test("Cleanup test fixtures", async () => {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Course.deleteMany({ _id: { $in: createdCourseIds } });
        await Topic.deleteMany({ _id: { $in: createdTopicIds } });
        await Practice.deleteMany({ _id: { $in: createdPracticeIds } });
        await Enrollment.deleteMany({ _id: { $in: createdEnrollmentIds } });
        await LearningEvidence.deleteMany({ _id: { $in: createdEvidenceIds } });
        await TopicMastery.deleteMany({ _id: { $in: createdMasteryIds } });
        await PracticeAttempt.deleteMany({ _id: { $in: createdAttemptIds } });
        await AssessmentAttempt.deleteMany({ _id: { $in: createdAttemptIds } });

        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
    });
});
