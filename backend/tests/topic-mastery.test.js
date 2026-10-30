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
import {
    recalculateTopicMasteryService,
    recalculateCourseMasteryService,
    getLearnerTopicMasteryService,
    getLearnerCourseMasteryService,
    getLearnerWeaknessesService,
    getInstructorTopicMasteryService,
    serializeTopicMastery,
} from "../src/modules/topicMastery/services/topicMastery.service.js";
import { computeTopicMastery } from "../src/modules/topicMastery/services/masteryCalculation.service.js";
import {
    MASTERY_STATUS,
    MASTERY_THRESHOLDS,
    MASTERY_CONFIDENCE,
    CURRENT_CALCULATION_VERSION,
} from "../src/modules/topicMastery/constants/mastery.constants.js";

test("Stage 5 — Topic Mastery & Weakness Detection Test Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const otherInstructorId = new mongoose.Types.ObjectId();
    const learner1Id = new mongoose.Types.ObjectId();
    const learner2Id = new mongoose.Types.ObjectId();
    const unenrolledLearnerId = new mongoose.Types.ObjectId();

    const courseId = new mongoose.Types.ObjectId();
    const otherCourseId = new mongoose.Types.ObjectId();
    const topic1Id = new mongoose.Types.ObjectId();
    const topic2Id = new mongoose.Types.ObjectId();
    const otherCourseTopicId = new mongoose.Types.ObjectId();

    const createdUserIds = [instructorId, otherInstructorId, learner1Id, learner2Id, unenrolledLearnerId];

    let connected = false;
    let server;
    let baseUrl;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await TopicMastery.deleteMany({ courseId: { $in: [courseId, otherCourseId] } });
            await LearningEvidence.deleteMany({ courseId: { $in: [courseId, otherCourseId] } });
            await Enrollment.deleteMany({ courseId: { $in: [courseId, otherCourseId] } });
            await Topic.deleteMany({ courseId: { $in: [courseId, otherCourseId] } });
            await Course.deleteMany({ _id: { $in: [courseId, otherCourseId] } });
            await User.deleteMany({ _id: { $in: createdUserIds } });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME, "Confirmed effective database is isolated test database");

    await Promise.all([
        User.init(),
        Course.init(),
        Topic.init(),
        Enrollment.init(),
        LearningEvidence.init(),
        TopicMastery.init(),
    ]);

    await User.create([
        { _id: instructorId, name: "Mastery Instructor", email: `mastery-inst-${instructorId}@example.test`, role: "INSTRUCTOR", status: "ACTIVE" },
        { _id: otherInstructorId, name: "Other Instructor", email: `mastery-other-inst-${otherInstructorId}@example.test`, role: "INSTRUCTOR", status: "ACTIVE" },
        { _id: learner1Id, name: "Mastery Learner 1", email: `mastery-l1-${learner1Id}@example.test`, role: "LEARNER", status: "ACTIVE" },
        { _id: learner2Id, name: "Mastery Learner 2", email: `mastery-l2-${learner2Id}@example.test`, role: "LEARNER", status: "ACTIVE" },
        { _id: unenrolledLearnerId, name: "Unenrolled Learner", email: `mastery-un-${unenrolledLearnerId}@example.test`, role: "LEARNER", status: "ACTIVE" },
    ]);

    await Course.create([
        {
            _id: courseId,
            title: "Mastery Test Course",
            description: "Testing topic-level mastery calculation and weakness detection.",
            domain: "Computer Science",
            category: "Databases",
            difficulty: "BEGINNER",
            status: "PUBLISHED",
            createdBy: instructorId,
        },
        {
            _id: otherCourseId,
            title: "Other Instructor Course",
            description: "Used to verify instructor ownership isolation.",
            domain: "Computer Science",
            category: "Systems",
            difficulty: "INTERMEDIATE",
            status: "PUBLISHED",
            createdBy: otherInstructorId,
        },
    ]);

    await Topic.create([
        {
            _id: topic1Id,
            courseId,
            title: "SQL Normalization",
            order: 1,
            learningObjectives: ["Understand 1NF, 2NF, 3NF"],
        },
        {
            _id: topic2Id,
            courseId,
            title: "SQL Joins",
            order: 2,
            learningObjectives: ["Understand Inner, Left, Outer joins"],
        },
        {
            _id: otherCourseTopicId,
            courseId: otherCourseId,
            title: "Concurrency Control",
            order: 1,
            learningObjectives: ["Understand 2PL and locks"],
        },
    ]);

    await Enrollment.create([
        { learnerId: learner1Id, courseId, status: "ACTIVE" },
        { learnerId: learner2Id, courseId, status: "ACTIVE" },
    ]);

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    function makeToken(userId, role) {
        return jwt.sign({ sub: userId.toString(), role }, JWT_ACCESS_SECRET, { expiresIn: "1h" });
    }

    const learner1Token = makeToken(learner1Id, "LEARNER");
    const learner2Token = makeToken(learner2Id, "LEARNER");
    const unenrolledToken = makeToken(unenrolledLearnerId, "LEARNER");
    const instructorToken = makeToken(instructorId, "INSTRUCTOR");
    const otherInstructorToken = makeToken(otherInstructorId, "INSTRUCTOR");

    // ==========================================
    // 1. Calculation Correctness Unit Tests
    // ==========================================
    await t.test("1.1 computeTopicMastery handles empty evidence list with INSUFFICIENT_EVIDENCE", () => {
        const result = computeTopicMastery([]);
        assert.equal(result.masteryScore, null);
        assert.equal(result.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(result.confidence, 0);
        assert.equal(result.evidenceCount, 0);
        assert.equal(result.totalQuestionsAttempted, 0);
    });

    await t.test("1.2 computeTopicMastery handles evidence with 0 total weight as INSUFFICIENT_EVIDENCE", () => {
        // Attempt with 0 valid questions
        const evidence = [
            {
                completedAt: new Date(),
                totalQuestions: 0,
                correctCount: 0,
                totalMarks: 0,
                marksAwarded: 0,
                scorePercent: 0,
                sourceType: "PRACTICE",
            },
        ];
        const result = computeTopicMastery(evidence);
        assert.equal(result.masteryScore, null);
        assert.equal(result.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(result.confidence, 0);
    });

    await t.test("1.3 computeTopicMastery applies equal source-type weighting for practice and assessment", () => {
        // Practice attempt: 5 questions, 100% score
        // Assessment attempt: 5 questions, 50% score
        // Equal weighting: (100 * 5 + 50 * 5) / (5 + 5) = 750 / 10 = 75.0%
        const evidence1 = [
            { completedAt: new Date("2026-01-01"), totalQuestions: 5, totalMarks: 10, marksAwarded: 10, scorePercent: 100, sourceType: "PRACTICE" },
            { completedAt: new Date("2026-01-02"), totalQuestions: 5, totalMarks: 10, marksAwarded: 5, scorePercent: 50, sourceType: "ASSESSMENT", assessmentSubtype: "TOPIC" },
        ];
        const res1 = computeTopicMastery(evidence1);
        assert.equal(res1.masteryScore, 75.0);

        // Swapping source types: Practice with 50%, Assessment with 100%
        const evidence2 = [
            { completedAt: new Date("2026-01-01"), totalQuestions: 5, totalMarks: 10, marksAwarded: 5, scorePercent: 50, sourceType: "PRACTICE" },
            { completedAt: new Date("2026-01-02"), totalQuestions: 5, totalMarks: 10, marksAwarded: 10, scorePercent: 100, sourceType: "ASSESSMENT", assessmentSubtype: "TOPIC" },
        ];
        const res2 = computeTopicMastery(evidence2);
        assert.equal(res2.masteryScore, 75.0, "Practice and assessment must carry equal weight");
    });

    await t.test("1.4 computeTopicMastery does NOT apply a recency multiplier", () => {
        // Attempt 1 (older): 5 questions, 100%
        // Attempt 2 (newer): 5 questions, 50%
        // Without recency multiplier: (100 * 5 + 50 * 5) / 10 = 75.0%
        const chronological = [
            { completedAt: new Date("2026-01-01"), totalQuestions: 5, totalMarks: 5, marksAwarded: 5, scorePercent: 100, sourceType: "PRACTICE" },
            { completedAt: new Date("2026-01-02"), totalQuestions: 5, totalMarks: 5, marksAwarded: 2.5, scorePercent: 50, sourceType: "PRACTICE" },
        ];
        const res1 = computeTopicMastery(chronological);
        assert.equal(res1.masteryScore, 75.0);

        // Reverse order: Attempt 1 newer, Attempt 2 older
        const reversed = [
            { completedAt: new Date("2026-01-02"), totalQuestions: 5, totalMarks: 5, marksAwarded: 2.5, scorePercent: 50, sourceType: "PRACTICE" },
            { completedAt: new Date("2026-01-01"), totalQuestions: 5, totalMarks: 5, marksAwarded: 5, scorePercent: 100, sourceType: "PRACTICE" },
        ];
        const res2 = computeTopicMastery(reversed);
        assert.equal(res2.masteryScore, 75.0, "Result must not be affected by evidence chronological order");
    });

    await t.test("1.5 computeTopicMastery caps question-volume weighting at 20 per evidence event", () => {
        // Attempt 1: 30 questions, 100% score (weight capped at 20)
        // Attempt 2: 10 questions, 50% score (weight = 10)
        // Expected: (100 * 20 + 50 * 10) / (20 + 10) = 2500 / 30 = 83.3%
        // (Uncapped would be: (100 * 30 + 50 * 10) / 40 = 87.5%)
        const evidence = [
            { completedAt: new Date(), totalQuestions: 30, totalMarks: 30, marksAwarded: 30, scorePercent: 100, sourceType: "PRACTICE" },
            { completedAt: new Date(), totalQuestions: 10, totalMarks: 10, marksAwarded: 5, scorePercent: 50, sourceType: "PRACTICE" },
        ];
        const result = computeTopicMastery(evidence);
        assert.equal(result.masteryScore, 83.3);
    });

    await t.test("1.6 computeTopicMastery includes unanswered questions with zero marks in question counts and scoring", () => {
        // Attempt with 10 questions: 4 answered correctly (4 marks), 6 unanswered (0 marks), total marks = 10
        const evidence = [
            {
                completedAt: new Date(),
                totalQuestions: 10,
                correctCount: 4,
                totalMarks: 10,
                marksAwarded: 4,
                scorePercent: 40,
                sourceType: "PRACTICE",
            },
        ];
        const result = computeTopicMastery(evidence);
        assert.equal(result.masteryScore, 40.0);
        assert.equal(result.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
        assert.equal(result.totalQuestionsAttempted, 10);
        assert.equal(result.totalMarksPossible, 10);
        assert.equal(result.totalMarksAwarded, 4);
    });

    await t.test("1.7 computeTopicMastery confidence formula combines question volume (70%) and attempt count (30%)", () => {
        // 1 attempt with 10 questions:
        // questionRatio = 10 / 20 = 0.5
        // attemptRatio = 1 / 5 = 0.2
        // confidence = round(0.7 * 0.5 + 0.3 * 0.2, 2) = round(0.35 + 0.06, 2) = 0.41
        const partialEvidence = [
            { completedAt: new Date(), totalQuestions: 10, totalMarks: 10, marksAwarded: 8, scorePercent: 80, sourceType: "PRACTICE" },
        ];
        const partialRes = computeTopicMastery(partialEvidence);
        assert.equal(partialRes.confidence, 0.41);

        // Full confidence: 20 questions across 5 attempts:
        // questionRatio = 20 / 20 = 1.0, attemptRatio = 5 / 5 = 1.0 -> confidence = 1.00
        const fullEvidence = [
            { completedAt: new Date(), totalQuestions: 4, totalMarks: 4, marksAwarded: 4, scorePercent: 100, sourceType: "PRACTICE" },
            { completedAt: new Date(), totalQuestions: 4, totalMarks: 4, marksAwarded: 4, scorePercent: 100, sourceType: "PRACTICE" },
            { completedAt: new Date(), totalQuestions: 4, totalMarks: 4, marksAwarded: 4, scorePercent: 100, sourceType: "PRACTICE" },
            { completedAt: new Date(), totalQuestions: 4, totalMarks: 4, marksAwarded: 4, scorePercent: 100, sourceType: "PRACTICE" },
            { completedAt: new Date(), totalQuestions: 4, totalMarks: 4, marksAwarded: 4, scorePercent: 100, sourceType: "PRACTICE" },
        ];
        const fullRes = computeTopicMastery(fullEvidence);
        assert.equal(fullRes.confidence, 1.00);
    });

    await t.test("1.8 computeTopicMastery classifies exact boundary values (0-59.9 NEEDS_IMPROVEMENT, 60-79.9 DEVELOPING, 80-100 STRONG)", () => {
        const makeAttempt = (score) => [
            { completedAt: new Date(), totalQuestions: 5, totalMarks: 100, marksAwarded: score, scorePercent: score, sourceType: "PRACTICE" },
        ];

        // 0.0 -> NEEDS_IMPROVEMENT
        assert.equal(computeTopicMastery(makeAttempt(0.0)).status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
        // 59.9 -> NEEDS_IMPROVEMENT
        assert.equal(computeTopicMastery(makeAttempt(59.9)).status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
        // 60.0 -> DEVELOPING
        assert.equal(computeTopicMastery(makeAttempt(60.0)).status, MASTERY_STATUS.DEVELOPING);
        // 79.9 -> DEVELOPING
        assert.equal(computeTopicMastery(makeAttempt(79.9)).status, MASTERY_STATUS.DEVELOPING);
        // 80.0 -> STRONG
        assert.equal(computeTopicMastery(makeAttempt(80.0)).status, MASTERY_STATUS.STRONG);
        // 100.0 -> STRONG
        assert.equal(computeTopicMastery(makeAttempt(100.0)).status, MASTERY_STATUS.STRONG);
    });

    await t.test("1.9 computeTopicMastery keeps INSUFFICIENT_EVIDENCE distinct from a low mastery score", () => {
        // Zero evidence -> INSUFFICIENT_EVIDENCE, score null, confidence 0
        const zeroResult = computeTopicMastery([]);
        assert.equal(zeroResult.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(zeroResult.masteryScore, null);
        assert.equal(zeroResult.confidence, 0);

        // Evidence with 0% score -> NEEDS_IMPROVEMENT with calculated confidence
        const lowResult = computeTopicMastery([
            { completedAt: new Date(), totalQuestions: 5, totalMarks: 5, marksAwarded: 0, scorePercent: 0, sourceType: "PRACTICE" },
        ]);
        assert.equal(lowResult.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
        assert.equal(lowResult.masteryScore, 0);
        assert.ok(lowResult.confidence > 0, "Confidence must be non-zero when eligible evidence is recorded");
    });

    await t.test("1.10 computeTopicMastery handles zero or invalid total possible marks safely", () => {
        const evidence = [
            { completedAt: new Date(), totalQuestions: 5, totalMarks: 0, marksAwarded: 0, scorePercent: 50, sourceType: "PRACTICE" },
        ];
        const result = computeTopicMastery(evidence);
        assert.equal(Number.isNaN(result.masteryScore), false);
        assert.equal(Number.isFinite(result.masteryScore), true);
        assert.equal(result.masteryScore, 50.0);
    });

    // ==========================================
    // 2. Persistence, Eligibility & Recomputation
    // ==========================================
    await t.test("2.1 recalculateTopicMasteryService persists unique record and respects contributeToLearningEvidence", async () => {
        // Insert 1 contributing practice evidence and 1 non-contributing practice evidence
        const attempt1Id = new mongoose.Types.ObjectId();
        const attempt2Id = new mongoose.Types.ObjectId();

        await LearningEvidence.create([
            {
                learnerId: learner1Id,
                courseId,
                topicId: topic1Id,
                sourceType: "PRACTICE",
                sourceId: new mongoose.Types.ObjectId(),
                attemptId: attempt1Id,
                completedAt: new Date("2026-03-01"),
                totalQuestions: 5,
                correctCount: 1,
                totalMarks: 5,
                marksAwarded: 1,
                scorePercent: 20,
                contributeToLearningEvidence: true,
            },
            {
                learnerId: learner1Id,
                courseId,
                topicId: topic1Id,
                sourceType: "PRACTICE",
                sourceId: new mongoose.Types.ObjectId(),
                attemptId: attempt2Id,
                completedAt: new Date("2026-03-02"),
                totalQuestions: 5,
                correctCount: 5,
                totalMarks: 5,
                marksAwarded: 5,
                scorePercent: 100,
                contributeToLearningEvidence: false, // Must be ignored!
            },
        ]);

        const mastery = await recalculateTopicMasteryService(learner1Id, courseId, topic1Id);
        assert.ok(mastery);
        assert.equal(mastery.evidenceCount, 1, "Only contributeToLearningEvidence: true is counted");
        assert.equal(mastery.masteryScore, 20);
        assert.equal(mastery.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);

        // Verify uniqueness: running recalculation again updates the same document, no duplicates
        const countBefore = await TopicMastery.countDocuments({ learnerId: learner1Id, courseId, topicId: topic1Id });
        assert.equal(countBefore, 1);

        await recalculateTopicMasteryService(learner1Id, courseId, topic1Id);
        const countAfter = await TopicMastery.countDocuments({ learnerId: learner1Id, courseId, topicId: topic1Id });
        assert.equal(countAfter, 1);
    });

    await t.test("2.2 DIAGNOSTIC and FINAL evidence (topicId: null) do not contribute to single-topic mastery", async () => {
        const diagAttemptId = new mongoose.Types.ObjectId();
        const finalAttemptId = new mongoose.Types.ObjectId();

        await LearningEvidence.create([
            {
                learnerId: learner1Id,
                courseId,
                topicId: null, // Course-level diagnostic
                sourceType: "ASSESSMENT",
                assessmentSubtype: "DIAGNOSTIC",
                sourceId: new mongoose.Types.ObjectId(),
                attemptId: diagAttemptId,
                completedAt: new Date(),
                totalQuestions: 10,
                correctCount: 10,
                totalMarks: 10,
                marksAwarded: 10,
                scorePercent: 100,
                contributeToLearningEvidence: true,
            },
            {
                learnerId: learner1Id,
                courseId,
                topicId: null, // Course-level final
                sourceType: "ASSESSMENT",
                assessmentSubtype: "FINAL",
                sourceId: new mongoose.Types.ObjectId(),
                attemptId: finalAttemptId,
                completedAt: new Date(),
                totalQuestions: 15,
                correctCount: 15,
                totalMarks: 15,
                marksAwarded: 15,
                scorePercent: 100,
                contributeToLearningEvidence: true,
            },
        ]);

        // Recalculate topic1Id: score must still be 20 from its eligible evidence, not affected by diagnostic/final
        const mastery = await recalculateTopicMasteryService(learner1Id, courseId, topic1Id);
        assert.equal(mastery.evidenceCount, 1);
        assert.equal(mastery.masteryScore, 20);
    });

    await t.test("2.3 TOPIC assessment evidence is attributed only to its own topic", async () => {
        const topic2AttemptId = new mongoose.Types.ObjectId();
        await LearningEvidence.create({
            learnerId: learner1Id,
            courseId,
            topicId: topic2Id,
            sourceType: "ASSESSMENT",
            assessmentSubtype: "TOPIC",
            sourceId: new mongoose.Types.ObjectId(),
            attemptId: topic2AttemptId,
            completedAt: new Date(),
            totalQuestions: 6,
            correctCount: 6,
            totalMarks: 12,
            marksAwarded: 12,
            scorePercent: 100,
            contributeToLearningEvidence: true,
        });

        const topic2Mastery = await recalculateTopicMasteryService(learner1Id, courseId, topic2Id);
        assert.equal(topic2Mastery.masteryScore, 100);
        assert.equal(topic2Mastery.status, MASTERY_STATUS.STRONG);
        assert.equal(topic2Mastery.assessmentAttemptsCount, 1);

        // Topic 1 is unchanged
        const topic1Mastery = await TopicMastery.findOne({ learnerId: learner1Id, topicId: topic1Id });
        assert.equal(topic1Mastery.masteryScore, 20);
        assert.equal(topic1Mastery.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
    });

    await t.test("2.4 recalculateCourseMasteryService updates all topics in a course", async () => {
        const results = await recalculateCourseMasteryService(learner1Id, courseId);
        assert.equal(results.length, 2);
        const t1 = results.find((r) => r.topicId.toString() === topic1Id.toString());
        const t2 = results.find((r) => r.topicId.toString() === topic2Id.toString());
        assert.equal(t1.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
        assert.equal(t2.status, MASTERY_STATUS.STRONG);
    });

    await t.test("2.5 Recalculation failure preserves already-persisted LearningEvidence", async () => {
        const isolatedLearnerId = new mongoose.Types.ObjectId();
        const attemptId = new mongoose.Types.ObjectId();
        const evidence = await LearningEvidence.create({
            learnerId: isolatedLearnerId,
            courseId,
            topicId: topic1Id,
            sourceType: "PRACTICE",
            sourceId: new mongoose.Types.ObjectId(),
            attemptId,
            completedAt: new Date(),
            totalQuestions: 5,
            correctCount: 4,
            totalMarks: 5,
            marksAwarded: 4,
            scorePercent: 80,
            contributeToLearningEvidence: true,
        });
        assert.ok(evidence);

        // Simulate a transient recalculation error (e.g. invalid course parameter)
        await assert.rejects(
            async () => {
                await recalculateTopicMasteryService(isolatedLearnerId, "not-a-valid-id", topic1Id);
            },
            (err) => err.statusCode === 400 && err.code === "INVALID_ID"
        );

        // Evidence must still exist untouched
        const persisted = await LearningEvidence.findById(evidence._id);
        assert.ok(persisted, "Evidence must remain persisted even if recalculation encounters an error");
    });

    await t.test("2.6 Concurrent recalculations for the same learner and topic resolve safely without corruption", async () => {
        const isolatedLearnerId = new mongoose.Types.ObjectId();
        const attemptId = new mongoose.Types.ObjectId();
        await LearningEvidence.create({
            learnerId: isolatedLearnerId,
            courseId,
            topicId: topic1Id,
            sourceType: "PRACTICE",
            sourceId: new mongoose.Types.ObjectId(),
            attemptId,
            completedAt: new Date(),
            totalQuestions: 5,
            correctCount: 5,
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            contributeToLearningEvidence: true,
        });

        const results = await Promise.all([
            recalculateTopicMasteryService(isolatedLearnerId, courseId, topic1Id),
            recalculateTopicMasteryService(isolatedLearnerId, courseId, topic1Id),
            recalculateTopicMasteryService(isolatedLearnerId, courseId, topic1Id),
            recalculateTopicMasteryService(isolatedLearnerId, courseId, topic1Id),
            recalculateTopicMasteryService(isolatedLearnerId, courseId, topic1Id),
        ]);

        assert.equal(results.length, 5);
        const count = await TopicMastery.countDocuments({ learnerId: isolatedLearnerId, courseId, topicId: topic1Id });
        assert.equal(count, 1, "Exactly one TopicMastery document must exist despite concurrent recalculation");
        const doc = await TopicMastery.findOne({ learnerId: isolatedLearnerId, courseId, topicId: topic1Id });
        assert.ok(doc);
        assert.equal(doc.calculationVersion, CURRENT_CALCULATION_VERSION);
    });

    // ==========================================
    // 3. API Endpoints & Security Authorization
    // ==========================================
    await t.test("3.1 GET /learning/me/topics/:topicId/mastery returns learner topic mastery", async () => {
        const res = await fetch(`${baseUrl}/learning/me/topics/${topic1Id}/mastery`, {
            headers: { Authorization: `Bearer ${learner1Token}` },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.data.topicId.toString(), topic1Id.toString());
        assert.equal(body.data.masteryScore, 20);
        assert.equal(body.data.status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
    });

    await t.test("3.2 GET /learning/me/topics/:topicId/mastery returns provisional record for unattempted topic", async () => {
        // Learner 2 has not taken any assessments or practices
        const res = await fetch(`${baseUrl}/learning/me/topics/${topic1Id}/mastery`, {
            headers: { Authorization: `Bearer ${learner2Token}` },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.data.topicId.toString(), topic1Id.toString());
        assert.equal(body.data.masteryScore, null);
        assert.equal(body.data.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(body.data.confidence, 0);
        assert.equal(body.data.evidenceCount, 0);
    });

    await t.test("3.3 GET /learning/me/topics/:topicId/mastery rejects unenrolled learner with 403", async () => {
        const res = await fetch(`${baseUrl}/learning/me/topics/${topic1Id}/mastery`, {
            headers: { Authorization: `Bearer ${unenrolledToken}` },
        });
        assert.equal(res.status, 403);
        const body = await res.json();
        assert.equal(body.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");
    });

    await t.test("3.4 GET /learning/me/courses/:courseId/mastery returns all topic masteries for enrolled course", async () => {
        const res = await fetch(`${baseUrl}/learning/me/courses/${courseId}/mastery`, {
            headers: { Authorization: `Bearer ${learner1Token}` },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.data.length, 2);
        assert.ok(body.data.some((t) => t.topicId.toString() === topic1Id.toString() && t.status === "NEEDS_IMPROVEMENT"));
        assert.ok(body.data.some((t) => t.topicId.toString() === topic2Id.toString() && t.status === "STRONG"));
    });

    await t.test("3.5 GET /learning/me/weaknesses returns only topics in NEEDS_IMPROVEMENT", async () => {
        const res = await fetch(`${baseUrl}/learning/me/weaknesses`, {
            headers: { Authorization: `Bearer ${learner1Token}` },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.data.length, 1);
        assert.equal(body.data[0].topicId.toString(), topic1Id.toString());
        assert.equal(body.data[0].status, MASTERY_STATUS.NEEDS_IMPROVEMENT);
        assert.equal(body.data[0].topicTitle, "SQL Normalization");
    });

    await t.test("3.6 GET /learning/me/weaknesses supports courseId filter", async () => {
        const res = await fetch(`${baseUrl}/learning/me/weaknesses?courseId=${courseId}`, {
            headers: { Authorization: `Bearer ${learner1Token}` },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.data.length, 1);
        assert.equal(body.data[0].courseId.toString(), courseId.toString());
    });

    await t.test("3.7 POST /learning/me/topics/:topicId/recalculate allows learner to re-sync own mastery idempotently", async () => {
        const res = await fetch(`${baseUrl}/learning/me/topics/${topic1Id}/recalculate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${learner1Token}` },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.data.topicId.toString(), topic1Id.toString());
        assert.equal(body.data.masteryScore, 20);
    });

    await t.test("3.8 GET /courses/:courseId/topics/:topicId/mastery allows course instructor to view topic mastery", async () => {
        const res = await fetch(`${baseUrl}/courses/${courseId}/topics/${topic1Id}/mastery?learnerId=${learner1Id}`, {
            headers: { Authorization: `Bearer ${instructorToken}` },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.data.length, 1);
        assert.equal(body.data[0].learnerId.toString(), learner1Id.toString());
        assert.equal(body.data[0].masteryScore, 20);
    });

    await t.test("3.9 GET /courses/:courseId/topics/:topicId/mastery denies non-owning instructor with 404", async () => {
        // Other instructor does not own courseId
        const res = await fetch(`${baseUrl}/courses/${courseId}/topics/${topic1Id}/mastery`, {
            headers: { Authorization: `Bearer ${otherInstructorToken}` },
        });
        assert.equal(res.status, 404);
        const body = await res.json();
        assert.equal(body.error?.code, "COURSE_NOT_FOUND");
    });

    await t.test("3.10 Invalid ObjectIds and malformed filters are rejected with 400 VALIDATION_ERROR", async () => {
        const res = await fetch(`${baseUrl}/learning/me/topics/invalid-id/mastery`, {
            headers: { Authorization: `Bearer ${learner1Token}` },
        });
        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.error?.code, "VALIDATION_ERROR");
    });

    await t.test("3.11 Recalculating topic with zero evidence persists and serializes masteryScore: null", async () => {
        const zeroEvidenceLearnerId = new mongoose.Types.ObjectId();
        const doc = await recalculateTopicMasteryService(zeroEvidenceLearnerId, courseId, topic2Id);
        assert.equal(doc.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(doc.masteryScore, null);
        assert.equal(doc.confidence, 0);

        const serialized = serializeTopicMastery(doc);
        assert.equal(serialized.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(serialized.masteryScore, null);
        assert.equal(serialized.confidence, 0);

        // Fetch from database directly to verify persistence
        const found = await TopicMastery.findOne({ learnerId: zeroEvidenceLearnerId, courseId, topicId: topic2Id });
        assert.ok(found);
        assert.equal(found.status, MASTERY_STATUS.INSUFFICIENT_EVIDENCE);
        assert.equal(found.masteryScore, null);
    });
});
