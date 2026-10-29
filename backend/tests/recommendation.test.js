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
import { Lesson } from "../src/modules/lesson/models/lesson.model.js";
import { Practice } from "../src/modules/practice/models/practice.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { LearningEvidence } from "../src/modules/learningEvidence/models/learningEvidence.model.js";
import { LearnerProfile } from "../src/modules/learner/models/learnerProfile.model.js";
import { TopicMastery } from "../src/modules/topicMastery/models/topicMastery.model.js";
import { MASTERY_STATUS } from "../src/modules/topicMastery/constants/mastery.constants.js";
import { getLearnerRecommendationsService } from "../src/modules/recommendation/services/recommendation.service.js";
import {
    RECOMMENDATION_ACTION_TYPES,
    RECOMMENDATION_REASON_CODES,
    RECOMMENDATION_TIERS,
} from "../src/modules/recommendation/constants/recommendation.constants.js";

test("Stage 6 — Personalization & Recommendation Service Test Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const learner1Id = new mongoose.Types.ObjectId();
    const learner2Id = new mongoose.Types.ObjectId();
    const unenrolledLearnerId = new mongoose.Types.ObjectId();

    const course1Id = new mongoose.Types.ObjectId();
    const course2Id = new mongoose.Types.ObjectId();
    const draftCourseId = new mongoose.Types.ObjectId();

    const topic1Id = new mongoose.Types.ObjectId(); // weak topic
    const topic2Id = new mongoose.Types.ObjectId(); // developing topic
    const topic3Id = new mongoose.Types.ObjectId(); // insufficient evidence topic
    const topic4Id = new mongoose.Types.ObjectId(); // functional / strong topic
    const topic5Id = new mongoose.Types.ObjectId(); // mastered topic

    const lesson1Id = new mongoose.Types.ObjectId();
    const lesson2Id = new mongoose.Types.ObjectId();
    const lesson3Id = new mongoose.Types.ObjectId();

    const qBankId = new mongoose.Types.ObjectId();
    const practice1Id = new mongoose.Types.ObjectId();
    const practice2Id = new mongoose.Types.ObjectId();

    const createdUserIds = [instructorId, learner1Id, learner2Id, unenrolledLearnerId];
    const createdCourseIds = [course1Id, course2Id, draftCourseId];
    const createdTopicIds = [topic1Id, topic2Id, topic3Id, topic4Id, topic5Id];
    const createdLessonIds = [lesson1Id, lesson2Id, lesson3Id];
    const createdPracticeIds = [practice1Id, practice2Id];
    const createdBankIds = [qBankId];

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });

    // Ensure database isolation
    assert.equal(
        mongoose.connection.name,
        TEST_DB_NAME,
        "Mongoose must be connected to the dedicated test database"
    );

    function createToken(userId, role) {
        return jwt.sign({ sub: userId.toString(), role }, JWT_ACCESS_SECRET, { expiresIn: "1h" });
    }

    const learner1Token = createToken(learner1Id, "LEARNER");
    const learner2Token = createToken(learner2Id, "LEARNER");
    const unenrolledLearnerToken = createToken(unenrolledLearnerId, "LEARNER");
    const instructorToken = createToken(instructorId, "INSTRUCTOR");

    // Start HTTP test server
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    async function apiRequest({ method = "GET", path, reqPath, token, body }) {
        const effectivePath = path || reqPath || "/";
        return new Promise((resolve, reject) => {
            const req = http.request(
                {
                    hostname: "127.0.0.1",
                    port,
                    path: effectivePath,
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

    // Fixture setup
    await t.test("Setup test fixtures in isolated database", async () => {
        // Users
        await User.create([
            { _id: instructorId, name: "Recom Instructor", email: "recom_inst@test.com", passwordHash: "hash123", role: "INSTRUCTOR" },
            { _id: learner1Id, name: "Recom Learner 1", email: "recom_l1@test.com", passwordHash: "hash123", role: "LEARNER" },
            { _id: learner2Id, name: "Recom Learner 2", email: "recom_l2@test.com", passwordHash: "hash123", role: "LEARNER" },
            { _id: unenrolledLearnerId, name: "Recom Unenrolled", email: "recom_unenrolled@test.com", passwordHash: "hash123", role: "LEARNER" },
        ]);

        // Courses
        await Course.create([
            {
                _id: course1Id,
                title: "Personalization Course 1",
                description: "A comprehensive course designed to test personalization and recommendations.",
                createdBy: instructorId,
                domain: "Computer Science",
                category: "Databases",
                difficulty: "INTERMEDIATE",
                status: "PUBLISHED",
            },
            {
                _id: course2Id,
                title: "Personalization Course 2",
                description: "A second published course to test multi-course recommendations.",
                createdBy: instructorId,
                domain: "Computer Science",
                category: "Algorithms",
                difficulty: "BEGINNER",
                status: "PUBLISHED",
            },
            {
                _id: draftCourseId,
                title: "Draft Course Unpublished",
                description: "A draft course that must not be recommended to learners.",
                createdBy: instructorId,
                domain: "Computer Science",
                category: "Security",
                difficulty: "ADVANCED",
                status: "DRAFT",
            },
        ]);

        // Topics for Course 1:
        // Topic 1: Order 1 (Weakness)
        // Topic 2: Order 2 (Developing)
        // Topic 3: Order 3 (Insufficient evidence)
        // Topic 4: Order 4 (Functional / Strong)
        // Topic 5: Order 5 (Mastered)
        await Topic.create([
            { _id: topic1Id, courseId: course1Id, title: "SQL Joins & Grouping", order: 1, learningObjectives: ["Master SQL Joins"] },
            { _id: topic2Id, courseId: course1Id, title: "SQL Aggregations & Having", order: 2, learningObjectives: ["Aggregate functions"] },
            { _id: topic3Id, courseId: course1Id, title: "Database Indexing & B-Trees", order: 3, learningObjectives: ["Indexing concepts"] },
            { _id: topic4Id, courseId: course1Id, title: "Transaction Isolation Levels", order: 4, learningObjectives: ["ACID isolation"] },
            { _id: topic5Id, courseId: course1Id, title: "Query Optimization", order: 5, learningObjectives: ["EXPLAIN queries"] },
        ]);

        // Lessons
        await Lesson.create([
            { _id: lesson1Id, topicId: topic1Id, title: "Deep Dive into INNER & OUTER Joins", order: 1, content: [{ type: "TEXT", value: "Join explanations" }] },
            { _id: lesson2Id, topicId: topic2Id, title: "Using GROUP BY and HAVING effectively", order: 1, content: [{ type: "TEXT", value: "Aggregation basics" }] },
            { _id: lesson3Id, topicId: topic3Id, title: "Introduction to B-Tree Indexes", order: 1, content: [{ type: "TEXT", value: "Index structures" }] },
        ]);

        // Question bank & Practices
        await QuestionBank.create({
            _id: qBankId,
            courseId: course1Id,
            topicId: topic1Id,
            createdBy: instructorId,
            title: "Join Question Bank",
            status: "ACTIVE",
        });

        await Practice.create([
            {
                _id: practice1Id,
                courseId: course1Id,
                topicId: topic1Id,
                questionBankId: qBankId,
                createdBy: instructorId,
                title: "Practice: Complex SQL Joins",
                status: "PUBLISHED",
                contributeToLearningEvidence: true,
                questionIds: [],
            },
            {
                _id: practice2Id,
                courseId: course1Id,
                topicId: topic2Id,
                questionBankId: qBankId,
                createdBy: instructorId,
                title: "Practice: Aggregation Functions",
                status: "PUBLISHED",
                contributeToLearningEvidence: true,
                questionIds: [],
            },
        ]);

        // Enrollments: Learner 1 is enrolled in Course 1 and Course 2; Learner 2 in Course 1; Unenrolled in none
        await Enrollment.create([
            { learnerId: learner1Id, courseId: course1Id, status: "ACTIVE" },
            { learnerId: learner1Id, courseId: course2Id, status: "ACTIVE" },
            { learnerId: learner2Id, courseId: course1Id, status: "ACTIVE" },
        ]);

        // Mastery records for Learner 1 in Course 1:
        // Topic 1: NEEDS_IMPROVEMENT (score 35)
        // Topic 2: DEVELOPING (score 55)
        // Topic 3: INSUFFICIENT_EVIDENCE (score 0, confidence 0.1)
        // Topic 4: STRONG (score 82)
        // Topic 5: MASTERED (score 95)
        await TopicMastery.create([
            {
                learnerId: learner1Id,
                courseId: course1Id,
                topicId: topic1Id,
                masteryScore: 35.0,
                status: MASTERY_STATUS.NEEDS_IMPROVEMENT,
                confidence: 0.8,
                evidenceCount: 5,
                totalQuestionsAttempted: 15,
                totalQuestionsCorrect: 5,
                totalMarksAwarded: 5,
                totalMarksPossible: 15,
                practiceAttemptsCount: 3,
                assessmentAttemptsCount: 1,
            },
            {
                learnerId: learner1Id,
                courseId: course1Id,
                topicId: topic2Id,
                masteryScore: 55.0,
                status: MASTERY_STATUS.DEVELOPING,
                confidence: 0.7,
                evidenceCount: 4,
                totalQuestionsAttempted: 12,
                totalQuestionsCorrect: 7,
                totalMarksAwarded: 7,
                totalMarksPossible: 12,
                practiceAttemptsCount: 2,
                assessmentAttemptsCount: 1,
            },
            {
                learnerId: learner1Id,
                courseId: course1Id,
                topicId: topic3Id,
                masteryScore: 0,
                status: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
                confidence: 0.1,
                evidenceCount: 1,
                totalQuestionsAttempted: 2,
                totalQuestionsCorrect: 0,
                totalMarksAwarded: 0,
                totalMarksPossible: 2,
                practiceAttemptsCount: 1,
                assessmentAttemptsCount: 0,
            },
            {
                learnerId: learner1Id,
                courseId: course1Id,
                topicId: topic4Id,
                masteryScore: 82.0,
                status: MASTERY_STATUS.STRONG,
                confidence: 0.9,
                evidenceCount: 6,
                totalQuestionsAttempted: 18,
                totalQuestionsCorrect: 15,
                totalMarksAwarded: 15,
                totalMarksPossible: 18,
                practiceAttemptsCount: 3,
                assessmentAttemptsCount: 2,
            },
            {
                learnerId: learner1Id,
                courseId: course1Id,
                topicId: topic5Id,
                masteryScore: 95.0,
                status: MASTERY_STATUS.MASTERED,
                confidence: 0.95,
                evidenceCount: 8,
                totalQuestionsAttempted: 24,
                totalQuestionsCorrect: 23,
                totalMarksAwarded: 23,
                totalMarksPossible: 24,
                practiceAttemptsCount: 4,
                assessmentAttemptsCount: 2,
            },
        ]);
    });

    // Test Group 1: Recommendation Rules & Priorities
    await t.test("1. Recommendation rules and priority ranking", async (t) => {
        await t.test("1.1 Weak topic prioritizes eligible recovery practice and has highest priority", async () => {
            const res = await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });
            assert.ok(res.nextBestAction, "Must return a next best action");
            assert.equal(res.nextBestAction.actionType, RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE);
            assert.equal(res.nextBestAction.topicId.toString(), topic1Id.toString());
            assert.equal(res.nextBestAction.targetId.toString(), practice1Id.toString());
            assert.equal(res.nextBestAction.reasonCode, RECOMMENDATION_REASON_CODES.WEAKNESS_PRACTICE);
            assert.equal(res.nextBestAction.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
            assert.equal(res.nextBestAction.score, 35.0);
            assert.equal(res.nextBestAction.isActionable, true);

            // In recommendations array, first item must be the weak topic
            const firstRec = res.recommendations[0];
            assert.equal(firstRec.tier, RECOMMENDATION_TIERS.DEMONSTRATED_WEAKNESS.key);
            assert.equal(firstRec.priority, 1);
            assert.equal(firstRec.topicId.toString(), topic1Id.toString());
        });

        await t.test("1.2 Developing topic is ranked second with targeted practice", async () => {
            const res = await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });
            const devRec = res.recommendations.find((r) => r.topicId.toString() === topic2Id.toString());
            assert.ok(devRec, "Must contain recommendation for developing topic");
            assert.equal(devRec.tier, RECOMMENDATION_TIERS.DEVELOPING_MASTERY.key);
            assert.equal(devRec.actionType, RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE);
            assert.equal(devRec.targetId.toString(), practice2Id.toString());
            assert.equal(devRec.reasonCode, RECOMMENDATION_REASON_CODES.DEVELOPING_PRACTICE);
            assert.equal(devRec.masteryScore, 55.0);
            assert.equal(devRec.isActionable, true);
        });

        await t.test("1.3 Insufficient evidence topic recommends introductory lesson and is not labeled weak", async () => {
            const res = await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });
            const ieRec = res.recommendations.find((r) => r.topicId.toString() === topic3Id.toString());
            assert.ok(ieRec, "Must contain recommendation for insufficient evidence topic");
            assert.equal(ieRec.tier, RECOMMENDATION_TIERS.INSUFFICIENT_EVIDENCE.key);
            assert.equal(ieRec.actionType, RECOMMENDATION_ACTION_TYPES.REVIEW_LESSON);
            assert.equal(ieRec.targetId.toString(), lesson3Id.toString());
            assert.equal(ieRec.reasonCode, RECOMMENDATION_REASON_CODES.INTRODUCTORY_LESSON);
            assert.doesNotMatch(ieRec.explanation, /weak/i, "Must not falsely claim topic is weak");
            assert.match(ieRec.explanation, /insufficient evidence/i);
            assert.equal(ieRec.isActionable, true);
        });

        await t.test("1.4 Functional / Strong topic recommends progressing to next topic in curriculum order", async () => {
            const res = await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });
            const strongRec = res.recommendations.find((r) => r.topicId.toString() === topic4Id.toString());
            assert.ok(strongRec, "Must contain recommendation for strong topic");
            assert.equal(strongRec.tier, RECOMMENDATION_TIERS.MASTERY_PROGRESSION.key);
            assert.equal(strongRec.actionType, RECOMMENDATION_ACTION_TYPES.PROGRESS_TO_TOPIC);
            // Next topic after Topic 4 (order 4) is Topic 5 (order 5)
            assert.equal(strongRec.targetId.toString(), topic5Id.toString());
            assert.equal(strongRec.reasonCode, RECOMMENDATION_REASON_CODES.PROGRESSION_NEXT_TOPIC);
            assert.equal(strongRec.isActionable, true);
        });

        await t.test("1.5 Mastered topic does not recommend repetitive remedial actions", async () => {
            const res = await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });
            const masteredRec = res.recommendations.find((r) => r.topicId.toString() === topic5Id.toString());
            // Since Topic 5 is the last topic in the course (order 5), no progression topic exists after it,
            // and no remedial practice/lesson should be recommended for a mastered topic.
            assert.equal(masteredRec, undefined, "Last topic that is MASTERED must not generate remedial recommendations");
        });

        await t.test("1.6 Deterministic ranking across multiple topics and calls", async () => {
            const run1 = await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });
            const run2 = await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });

            assert.equal(run1.recommendations.length, run2.recommendations.length);
            assert.deepEqual(
                run1.recommendations.map((r) => r.id),
                run2.recommendations.map((r) => r.id),
                "Ordering and identifiers must be 100% identical on repeated invocations"
            );

            // Priorities must follow tier order: Demonstrated Weakness (100) > Developing (80) > Insufficient Evidence (60) > Progression (40)
            const priorities = run1.recommendations.map((r) => r.tier);
            assert.deepEqual(priorities, [
                RECOMMENDATION_TIERS.DEMONSTRATED_WEAKNESS.key,
                RECOMMENDATION_TIERS.DEVELOPING_MASTERY.key,
                RECOMMENDATION_TIERS.INSUFFICIENT_EVIDENCE.key,
                RECOMMENDATION_TIERS.MASTERY_PROGRESSION.key,
            ]);
        });
    });

    // Test Group 2: Empty States & Graceful Fallbacks
    await t.test("2. Empty states, missing content, and unattempted topics", async (t) => {
        await t.test("2.1 Learner with no enrollments returns clean empty-state", async () => {
            const res = await getLearnerRecommendationsService(unenrolledLearnerId);
            assert.equal(res.nextBestAction, null);
            assert.deepEqual(res.recommendations, []);
            assert.equal(res.totalCount, 0);
        });

        await t.test("2.2 Course with no topics returns empty-state", async () => {
            const emptyCourseId = new mongoose.Types.ObjectId();
            await Course.create({
                _id: emptyCourseId,
                title: "Empty Course With No Topics",
                description: "This course contains no topics for testing edge cases.",
                createdBy: instructorId,
                domain: "Science",
                category: "Physics",
                difficulty: "BEGINNER",
                status: "PUBLISHED",
            });
            await Enrollment.create({ learnerId: learner1Id, courseId: emptyCourseId, status: "ACTIVE" });

            const res = await getLearnerRecommendationsService(learner1Id, { courseId: emptyCourseId.toString() });
            assert.equal(res.nextBestAction, null);
            assert.deepEqual(res.recommendations, []);
            assert.equal(res.totalCount, 0);

            // Cleanup
            await Course.deleteOne({ _id: emptyCourseId });
            await Enrollment.deleteOne({ learnerId: learner1Id, courseId: emptyCourseId });
        });

        await t.test("2.3 Unattempted topic without prior mastery record defaults safely to INSUFFICIENT_EVIDENCE", async () => {
            // Learner 2 has no mastery records for Topic 1..5 in Course 1
            const res = await getLearnerRecommendationsService(learner2Id, { courseId: course1Id.toString() });
            assert.ok(res.recommendations.length > 0);
            for (const rec of res.recommendations) {
                assert.equal(rec.tier, RECOMMENDATION_TIERS.INSUFFICIENT_EVIDENCE.key);
                assert.equal(rec.masteryStatus, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
                assert.equal(rec.masteryScore, 0);
            }
        });

        await t.test("2.4 New learner with persisted interests receives course discovery recommendations", async () => {
            // Unenrolled learner creates onboarding profile with interest in "Databases"
            await LearnerProfile.create({
                userId: unenrolledLearnerId,
                interests: ["Databases"],
                goals: ["Master SQL and Relational Systems"],
                experienceLevel: "I have a basic understanding",
                onboardingState: "COMPLETED",
            });

            const res = await getLearnerRecommendationsService(unenrolledLearnerId);
            assert.ok(res.courseRecommendations, "Must return courseRecommendations array");
            assert.equal(res.courseRecommendations.length > 0, true, "Must recommend matching published course");
            assert.equal(res.courseRecommendations[0].courseId.toString(), course1Id.toString());
            assert.equal(res.courseRecommendations[0].targetType, "COURSE");
            assert.equal(res.courseRecommendations[0].actionType, "EXPLORE_COURSE");
            assert.equal(res.courseRecommendations[0].matchedInterest, "Databases");
            assert.ok(res.nextBestAction);
            assert.equal(res.nextBestAction.actionType, "EXPLORE_COURSE");
            assert.equal(res.nextBestAction.courseId.toString(), course1Id.toString());
            assert.equal(res.recommendations.length, 0, "No enrolled learning actions for unenrolled learner");
            assert.equal(res.totalCount, res.courseRecommendations.length);

            // Cleanup profile for this test
            await LearnerProfile.deleteOne({ userId: unenrolledLearnerId });
        });
    });

    // Test Group 3: Data Immutability & No Competing State
    await t.test("3. Recommendations do not mutate TopicMastery or LearningEvidence", async () => {
        const masteryCountBefore = await TopicMastery.countDocuments();
        const evidenceCountBefore = await LearningEvidence.countDocuments();
        const masteryDocBefore = await TopicMastery.findOne({ learnerId: learner1Id, topicId: topic1Id }).lean();

        await getLearnerRecommendationsService(learner1Id, { courseId: course1Id.toString() });
        await getLearnerRecommendationsService(learner1Id);

        const masteryCountAfter = await TopicMastery.countDocuments();
        const evidenceCountAfter = await LearningEvidence.countDocuments();
        const masteryDocAfter = await TopicMastery.findOne({ learnerId: learner1Id, topicId: topic1Id }).lean();

        assert.equal(masteryCountAfter, masteryCountBefore, "TopicMastery document count must remain identical");
        assert.equal(evidenceCountAfter, evidenceCountBefore, "LearningEvidence document count must remain identical");
        assert.equal(masteryDocAfter.masteryScore, masteryDocBefore.masteryScore, "Mastery score must remain untouched");
        assert.equal(masteryDocAfter.status, masteryDocBefore.status, "Mastery status must remain untouched");
    });

    // Test Group 4: HTTP API & Authorization Controls
    await t.test("4. HTTP API and security authorization tests", async (t) => {
        await t.test("4.1 Reject unauthenticated request to /learning/me/recommendations", async () => {
            const res = await apiRequest({ reqPath: "/api/v1/learning/me/recommendations" });
            assert.equal(res.statusCode, 401);
        });

        await t.test("4.2 Reject instructor request on learner-only endpoint", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/recommendations",
                token: instructorToken,
            });
            assert.equal(res.statusCode, 403);
        });

        await t.test("4.3 Authenticated learner successfully retrieves general recommendations", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/recommendations",
                token: learner1Token,
            });
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.ok(res.body.data.nextBestAction);
            assert.equal(res.body.data.nextBestAction.actionType, RECOMMENDATION_ACTION_TYPES.ATTEMPT_PRACTICE);
            assert.ok(Array.isArray(res.body.data.recommendations));
            assert.ok(res.body.data.totalCount > 0);
        });

        await t.test("4.4 Query parameter limit is respected", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/recommendations?limit=2",
                token: learner1Token,
            });
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.data.recommendations.length, 2);
            assert.ok(res.body.data.totalCount >= 2);
        });

        await t.test("4.5 Invalid query parameter limit is rejected", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/recommendations?limit=invalid",
                token: learner1Token,
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "VALIDATION_ERROR");
        });

        await t.test("4.6 Course-scoped recommendations require active enrollment", async () => {
            const res = await apiRequest({
                reqPath: `/api/v1/learning/me/courses/${course1Id}/recommendations`,
                token: unenrolledLearnerToken,
            });
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");
        });

        await t.test("4.7 Course-scoped recommendations reject unpublished/draft course", async () => {
            const res = await apiRequest({
                reqPath: `/api/v1/learning/me/courses/${draftCourseId}/recommendations`,
                token: learner1Token,
            });
            assert.equal(res.statusCode, 404);
            assert.equal(res.body.error?.code, "COURSE_NOT_AVAILABLE");
        });

        await t.test("4.8 Course-scoped recommendations reject malformed courseId", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/courses/not-a-valid-id/recommendations",
                token: learner1Token,
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "VALIDATION_ERROR");
        });
    });

    // Cleanup
    t.after(async () => {
        await LearnerProfile.deleteMany({ userId: { $in: createdUserIds } });
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Course.deleteMany({ _id: { $in: createdCourseIds } });
        await Topic.deleteMany({ _id: { $in: createdTopicIds } });
        await Lesson.deleteMany({ _id: { $in: createdLessonIds } });
        await Practice.deleteMany({ _id: { $in: createdPracticeIds } });
        await QuestionBank.deleteMany({ _id: { $in: createdBankIds } });
        await Enrollment.deleteMany({ learnerId: { $in: createdUserIds } });
        await TopicMastery.deleteMany({ learnerId: { $in: createdUserIds } });
        await LearningEvidence.deleteMany({ learnerId: { $in: createdUserIds } });

        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
    });
});
