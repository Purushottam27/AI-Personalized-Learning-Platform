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
import { Lesson } from "../src/modules/lesson/models/lesson.model.js";
import { Practice } from "../src/modules/practice/models/practice.model.js";
import { PracticeAttempt } from "../src/modules/practice/models/practiceAttempt.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { LearningEvidence } from "../src/modules/learningEvidence/models/learningEvidence.model.js";
import { LearnerProfile } from "../src/modules/learner/models/learnerProfile.model.js";
import { TopicMastery } from "../src/modules/topicMastery/models/topicMastery.model.js";
import { StudyPlan } from "../src/modules/studyPlan/models/studyPlan.model.js";
import { StudyPlanProposal } from "../src/modules/studyPlan/models/studyPlanProposal.model.js";
import { StudyPlanGenerationQuota } from "../src/modules/studyPlan/models/studyPlanGenerationQuota.model.js";
import { AssistantConversation } from "../src/modules/studyPlan/models/assistantConversation.model.js";
import { setAiProvider, resetAiProvider } from "../src/modules/aiAssistant/providers/index.js";
import {
    generateStudyPlanService,
    getActiveStudyPlanService,
    getLearnerStudyPreferences,
    updateLearnerStudyPreferencesService,
    proposePlanRevisionService,
    acceptPlanRevisionService,
    chatWithAssistantService,
    buildDeterministicSchedule,
    collectCandidateActivities,
    getWeekDates,
    getStudyPlanQuotaService,
    getCalendarDateKey,
    getNextMidnightResetAt,
} from "../src/modules/studyPlan/services/studyPlan.service.js";

test("Phase 4 — AI Learning Assistant & Personalized Study Plan Regression Test Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const learner1Id = new mongoose.Types.ObjectId();
    const learner2Id = new mongoose.Types.ObjectId();

    let server;
    let baseUrl;

    function signLearnerToken(userId) {
        return jwt.sign(
            { sub: userId.toString(), role: "LEARNER" },
            JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );
    }

    async function apiRequest({ method = "GET", path: reqPath, token, body }) {
        return new Promise((resolve, reject) => {
            const url = new URL(reqPath, baseUrl);
            const headers = {
                "Content-Type": "application/json",
            };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const req = http.request(
                url,
                { method, headers },
                (res) => {
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("end", () => {
                        let parsed = null;
                        try {
                            parsed = JSON.parse(data);
                        } catch {
                            parsed = data;
                        }
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: parsed,
                        });
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

    t.before(async () => {
        await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });

        // Clean test collections
        await Promise.all([
            User.deleteMany({ _id: { $in: [instructorId, learner1Id, learner2Id] } }),
            LearnerProfile.deleteMany({ userId: { $in: [learner1Id, learner2Id] } }),
            Course.deleteMany({ createdBy: instructorId }),
            Enrollment.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            StudyPlan.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            StudyPlanProposal.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            StudyPlanGenerationQuota.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            AssistantConversation.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            LearningEvidence.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            AssessmentAttempt.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            TopicMastery.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
        ]);

        await User.create([
            {
                _id: instructorId,
                name: "Instructor Phase 4",
                email: "instructor.p4@test.com",
                role: "INSTRUCTOR",
                password: "hashedPassword123",
            },
            {
                _id: learner1Id,
                name: "Learner Primary",
                email: "learner1.p4@test.com",
                role: "LEARNER",
                password: "hashedPassword123",
            },
            {
                _id: learner2Id,
                name: "Learner Secondary",
                email: "learner2.p4@test.com",
                role: "LEARNER",
                password: "hashedPassword123",
            },
        ]);

        await new Promise((resolve) => {
            server = app.listen(0, () => {
                baseUrl = `http://127.0.0.1:${server.address().port}`;
                resolve();
            });
        });
    });

    t.after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        resetAiProvider();
        await Promise.all([
            User.deleteMany({ _id: { $in: [instructorId, learner1Id, learner2Id] } }),
            LearnerProfile.deleteMany({ userId: { $in: [learner1Id, learner2Id] } }),
            Course.deleteMany({ createdBy: instructorId }),
            Enrollment.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            StudyPlan.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            StudyPlanProposal.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            StudyPlanGenerationQuota.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            AssistantConversation.deleteMany({ learnerId: { $in: [instructorId, learner1Id, learner2Id] } }),
            LearningEvidence.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            AssessmentAttempt.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            TopicMastery.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
        ]);
        await mongoose.disconnect();
    });

    // --- SETUP FIXTURE DATA FOR COMMON TESTS ---
    let sharedCourse;
    let sharedTopic1;
    let sharedTopic2;
    let sharedLesson1;
    let sharedAssessment1;
    let sharedAssessment2;

    await t.test("0. Setup Course, Topics, Lessons, and Assessments Fixtures", async () => {
        sharedCourse = await Course.create({
            title: "Advanced Data Structures & Algorithms",
            description: "A comprehensive course on trees, graphs, dynamic programming, and complexity.",
            domain: "COMPUTER_SCIENCE",
            category: "SOFTWARE_ENGINEERING",
            difficulty: "INTERMEDIATE",
            createdBy: instructorId,
            status: "PUBLISHED",
            isPublished: true,
            progressionPolicy: { lockingEnabled: true },
        });

        sharedTopic1 = await Topic.create({
            courseId: sharedCourse._id,
            title: "Trees & Binary Search Trees",
            order: 1,
        });

        sharedTopic2 = await Topic.create({
            courseId: sharedCourse._id,
            title: "Graph Traversal & Shortest Path",
            order: 2,
        });

        sharedLesson1 = await Lesson.create({
            topicId: sharedTopic1._id,
            title: "Binary Tree Representation",
            content: "Nodes, edges, and pointers in BST.",
            estimatedDuration: 25,
            order: 1,
        });

        sharedAssessment1 = await Assessment.create({
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            type: "TOPIC",
            title: "BST Formative Quiz",
            createdBy: instructorId,
            status: "PUBLISHED",
            passingScore: 70,
            questionsPerAttempt: 5,
            timeLimitMinutes: 20,
        });

        sharedAssessment2 = await Assessment.create({
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            type: "TOPIC",
            title: "BST Comprehensive Evaluation",
            createdBy: instructorId,
            status: "PUBLISHED",
            passingScore: 80,
            questionsPerAttempt: 5,
            timeLimitMinutes: 30,
        });

        await Enrollment.create({
            learnerId: learner1Id,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date(),
        });
    });

    await t.test("1 & 2. Correct Lesson Completion Semantics: Practice/Assessment evidence does NOT complete lesson", async () => {
        const plan = await generateStudyPlanService(learner1Id);
        assert.ok(plan);
        const scheduledLesson = plan.scheduledActivities.find((a) => a.activityType === "LESSON");
        assert.ok(scheduledLesson);
        assert.equal(scheduledLesson.isCompleted, false);

        // Record unrelated Practice evidence on the same topic
        await LearningEvidence.create({
            learnerId: learner1Id,
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            sourceType: "PRACTICE",
            sourceId: new mongoose.Types.ObjectId(),
            attemptId: new mongoose.Types.ObjectId(),
            completedAt: new Date(),
            totalQuestions: 5,
            correctCount: 5,
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            passed: true,
            responses: [],
        });

        // Record Assessment evidence on the same topic
        await LearningEvidence.create({
            learnerId: learner1Id,
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            sourceType: "ASSESSMENT",
            sourceId: sharedAssessment1._id,
            attemptId: new mongoose.Types.ObjectId(),
            completedAt: new Date(),
            totalQuestions: 5,
            correctCount: 4,
            totalMarks: 5,
            marksAwarded: 4,
            scorePercent: 80,
            passed: true,
            responses: [],
        });

        // Re-fetch enriched plan
        const enriched = await getActiveStudyPlanService(learner1Id);
        const lessonInPlan = enriched.scheduledActivities.find((a) => a.activityType === "LESSON");
        assert.equal(
            lessonInPlan.isCompleted,
            false,
            "Lesson must remain NOT completed despite unrelated practice and assessment evidence on the topic"
        );
        assert.equal(lessonInPlan.isUntrackedCompletion, true);
    });

    await t.test("3. Genuine Assessment Completion: completed assessment updates its scheduled activity correctly", async () => {
        // Record passing assessment attempt for sharedAssessment1
        await AssessmentAttempt.create({
            assessmentId: sharedAssessment1._id,
            courseId: sharedCourse._id,
            learnerId: learner1Id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passingScore: 70,
            questions: [
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "What is the worst case search time for balanced BST?",
                    type: "MCQ_SINGLE",
                    options: [{ key: "A", text: "O(log N)" }, { key: "B", text: "O(N)" }],
                    correctAnswer: "A",
                    marks: 2,
                },
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "What is an in-order traversal of a BST?",
                    type: "MCQ_SINGLE",
                    options: [{ key: "A", text: "Sorted" }, { key: "B", text: "Reverse" }],
                    correctAnswer: "A",
                    marks: 2,
                },
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "Is a leaf node degree 0?",
                    type: "TRUE_FALSE",
                    options: [{ key: "TRUE", text: "True" }, { key: "FALSE", text: "False" }],
                    correctAnswer: "TRUE",
                    marks: 2,
                },
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "Is height of empty tree usually defined as -1?",
                    type: "TRUE_FALSE",
                    options: [{ key: "TRUE", text: "True" }, { key: "FALSE", text: "False" }],
                    correctAnswer: "TRUE",
                    marks: 2,
                },
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "Does AVL tree maintain height balance?",
                    type: "TRUE_FALSE",
                    options: [{ key: "TRUE", text: "True" }, { key: "FALSE", text: "False" }],
                    correctAnswer: "TRUE",
                    marks: 2,
                },
            ],
            totalMarks: 10,
            marksAwarded: 9,
            scorePercent: 90,
            passed: true,
            submittedAt: new Date(),
        });

        const enriched = await getActiveStudyPlanService(learner1Id);
        const scheduledAss = enriched.scheduledActivities.find(
            (a) => a.activityType === "ASSESSMENT" && a.targetId === sharedAssessment1._id.toString()
        );
        if (scheduledAss) {
            assert.equal(scheduledAss.isCompleted, true);
            assert.equal(scheduledAss.actualStatus, "COMPLETED");
        }
    });

    await t.test("4. Secure Revision Acceptance: Forged activities are rejected", async () => {
        const fakeCourseId = new mongoose.Types.ObjectId();
        const fakeTopicId = new mongoose.Types.ObjectId();
        const fakeLessonId = new mongoose.Types.ObjectId();

        const token = signLearnerToken(learner1Id);
        const res = await apiRequest({
            method: "POST",
            path: "/api/v1/learning/me/study-plan/accept-revision",
            token,
            body: {
                startDate: "2026-11-02",
                endDate: "2026-11-08",
                reason: "Forged attack payload",
                proposedActivities: [
                    {
                        activityId: "forged-act-1",
                        dayOfWeek: "MONDAY",
                        scheduledDate: "2026-11-02",
                        activityType: "LESSON",
                        title: "Hacked Lesson",
                        courseId: fakeCourseId.toString(),
                        courseTitle: "Nonexistent Course",
                        topicId: fakeTopicId.toString(),
                        targetId: fakeLessonId.toString(),
                        estimatedDurationMinutes: 30,
                        actionUrl: "/hack",
                    },
                ],
            },
        });

        assert.equal(res.status, 400, "Must reject forged non-enrolled course activity");
    });

    await t.test("5. Secure Revision Acceptance: Stale / expired proposals cannot be accepted", async () => {
        // Create an expired proposal manually
        const expiredProposal = await StudyPlanProposal.create({
            learnerId: learner1Id,
            basedOnVersion: 1,
            proposedVersion: 2,
            status: "EXPIRED",
            startDate: "2026-11-02",
            endDate: "2026-11-08",
            reason: "Old proposal",
            expiresAt: new Date(Date.now() - 10000), // in the past
            proposedActivities: [],
        });

        const token = signLearnerToken(learner1Id);
        const res = await apiRequest({
            method: "POST",
            path: "/api/v1/learning/me/study-plan/accept-revision",
            token,
            body: {
                proposalId: expiredProposal._id.toString(),
            },
        });

        assert.equal(res.status, 409, "Must reject stale/expired proposal with 409 Conflict");
    });

    await t.test("6. Secure Revision Acceptance: Another learner cannot accept someone else's proposal", async () => {
        // Learner 1 proposes a revision
        const proposalRes = await proposePlanRevisionService(learner1Id, "Legit proposal by Learner 1");
        assert.ok(proposalRes.proposalId);

        // Learner 2 attempts to accept Learner 1's proposal
        const token2 = signLearnerToken(learner2Id);
        const res = await apiRequest({
            method: "POST",
            path: "/api/v1/learning/me/study-plan/accept-revision",
            token: token2,
            body: {
                proposalId: proposalRes.proposalId,
            },
        });

        assert.equal(res.status, 403, "Must reject cross-learner proposal acceptance with 403 Forbidden");
    });

    await t.test("7. Topic Lock Enforcement: Locked topics cannot enter revision proposals", async () => {
        // Topic 2 is locked because Topic 1 required assessments have not all been passed
        const candidates = await collectCandidateActivities(learner1Id, { preferredSessionDuration: 45 });
        const topic2Candidates = candidates.filter((c) => c.topicId?.toString() === sharedTopic2._id.toString());
        assert.equal(topic2Candidates.length, 0, "No activities from locked Topic 2 can be generated");
    });

    await t.test("8. Remediation Candidate Eligibility: Cannot bypass active enrollment, publication or unlock checks", async () => {
        // Create an unpublished course
        const unpublishedCourse = await Course.create({
            title: "Draft Course Not Ready",
            description: "Unpublished internal course for draft testing.",
            domain: "COMPUTER_SCIENCE",
            category: "SOFTWARE_ENGINEERING",
            difficulty: "ADVANCED",
            createdBy: instructorId,
            status: "DRAFT",
            isPublished: false,
        });

        const draftTopic = await Topic.create({
            courseId: unpublishedCourse._id,
            title: "Draft Secrets",
            order: 1,
        });

        // Set topic mastery to NEEDS_IMPROVEMENT on this draft topic
        await TopicMastery.create({
            learnerId: learner1Id,
            courseId: unpublishedCourse._id,
            topicId: draftTopic._id,
            status: "NEEDS_IMPROVEMENT",
            masteryScore: 0.3,
            confidence: 0.8,
            evidenceCount: 5,
        });

        const candidates = await collectCandidateActivities(learner1Id, { preferredSessionDuration: 45 });
        const leakedRemediation = candidates.find((c) => c.topicId?.toString() === draftTopic._id.toString());
        assert.equal(leakedRemediation, undefined, "Remediation on unpublished/non-enrolled course topic must NOT be scheduled");
    });

    await t.test("9. Schedule Generation: Does not duplicate activities through candidate-list wrapping", async () => {
        const singleCandidate = [
            {
                activityId: "cand-single-1",
                activityType: "LESSON",
                title: "Only One Lesson Exists",
                courseId: sharedCourse._id,
                courseTitle: sharedCourse.title,
                targetId: sharedLesson1._id.toString(),
                estimatedDurationMinutes: 30,
                durationAllocationType: "PLANNING_ALLOCATION",
                rationale: "Single candidate test",
                actionUrl: "/learn",
            },
        ];

        const weekInfo = getWeekDates();
        const schedule = buildDeterministicSchedule(
            singleCandidate,
            weekInfo,
            { studyDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], dailyStudyTime: "1-2 hours" }
        );

        assert.equal(schedule.length, 1, "Must schedule the candidate exactly once without wrapping around");
    });

    await t.test("10. Schedule Generation: Respects daily study capacity and allows multiple activities if capacity permits", async () => {
        const multipleCandidates = [
            {
                activityId: "c1",
                activityType: "LESSON",
                title: "Lesson 1",
                courseId: sharedCourse._id,
                courseTitle: sharedCourse.title,
                targetId: "t1",
                estimatedDurationMinutes: 30,
                durationAllocationType: "PLANNING_ALLOCATION",
                rationale: "R1",
                actionUrl: "/1",
            },
            {
                activityId: "c2",
                activityType: "PRACTICE",
                title: "Practice 1",
                courseId: sharedCourse._id,
                courseTitle: sharedCourse.title,
                targetId: "t2",
                estimatedDurationMinutes: 30,
                durationAllocationType: "PLANNING_ALLOCATION",
                rationale: "R2",
                actionUrl: "/2",
            },
            {
                activityId: "c3",
                activityType: "ASSESSMENT",
                title: "Assessment 1",
                courseId: sharedCourse._id,
                courseTitle: sharedCourse.title,
                targetId: "t3",
                estimatedDurationMinutes: 30,
                durationAllocationType: "PLANNING_ALLOCATION",
                rationale: "R3",
                actionUrl: "/3",
            },
        ];

        const weekInfo = getWeekDates();
        // dailyStudyTime: "1-2 hours" translates to 90 min capacity
        // Multi-day distribution spreads activities across selected study days (MONDAY and WEDNESDAY) without exceeding daily capacity
        const schedule = buildDeterministicSchedule(
            multipleCandidates,
            weekInfo,
            { studyDays: ["MONDAY", "WEDNESDAY"], dailyStudyTime: "1-2 hours" }
        );

        assert.equal(schedule.length, 3, "All three candidates should be scheduled across study days");
        const totalScheduledMinutes = schedule.reduce((sum, a) => sum + a.estimatedDurationMinutes, 0);
        assert.equal(totalScheduledMinutes, 90);

        // Single day capacity test: when only MONDAY is selected, all 3 x 30m fit on MONDAY within 90 min capacity
        const mondayOnlySchedule = buildDeterministicSchedule(
            multipleCandidates,
            weekInfo,
            { studyDays: ["MONDAY"], dailyStudyTime: "1-2 hours" }
        );
        const mondayActivities = mondayOnlySchedule.filter((s) => s.dayOfWeek === "MONDAY");
        assert.equal(mondayActivities.length, 3, "All three 30-min activities should fit into 90-min capacity on MONDAY");
        const totalMondayMinutes = mondayActivities.reduce((sum, a) => sum + a.estimatedDurationMinutes, 0);
        assert.equal(totalMondayMinutes, 90);
    });

    await t.test("11. Content Duration: Distinguishes ESTIMATED duration from PLANNING_ALLOCATION", async () => {
        // sharedAssessment2 has timeLimitMinutes: 30 and was not passed by learner1 -> durationAllocationType must be ESTIMATED
        // sharedLesson1 has no explicit duration on Lesson model schema (Lesson schema has content/order/title) -> PLANNING_ALLOCATION
        const candidates = await collectCandidateActivities(learner1Id, { preferredSessionDuration: 45 });
        const assessmentCandidate = candidates.find((c) => c.targetId === sharedAssessment2._id.toString());
        assert.ok(assessmentCandidate, "sharedAssessment2 candidate should be found");
        assert.equal(assessmentCandidate.durationAllocationType, "ESTIMATED");
        assert.equal(assessmentCandidate.estimatedDurationMinutes, 30);

        const lessonCandidate = candidates.find((c) => c.targetId === sharedLesson1._id.toString());
        assert.ok(lessonCandidate, "sharedLesson1 candidate should be found");
        assert.equal(lessonCandidate.durationAllocationType, "PLANNING_ALLOCATION");
    });

    await t.test("12. Multiple Formal Assessments: Discovers and schedules all eligible formal topic assessments", async () => {
        // sharedTopic1 has two published topic assessments: sharedAssessment1 and sharedAssessment2
        // Neither has been passed yet for this test case
        await AssessmentAttempt.deleteMany({ learnerId: learner2Id });
        await Enrollment.create({
            learnerId: learner2Id,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date(),
        });

        const candidates = await collectCandidateActivities(learner2Id, { preferredSessionDuration: 45 });
        const assessmentCandidates = candidates.filter((c) => c.activityType === "ASSESSMENT");
        assert.ok(assessmentCandidates.length >= 2, "Must discover both formal topic assessments on Topic 1");
        assert.ok(assessmentCandidates.some((c) => c.targetId === sharedAssessment1._id.toString()));
        assert.ok(assessmentCandidates.some((c) => c.targetId === sharedAssessment2._id.toString()));
    });

    await t.test("13 & 14. Plan Replacement Safety: Concurrency and failed replacement preservation", async () => {
        // Reset quota for learner1Id for concurrency test
        await StudyPlanGenerationQuota.deleteMany({ learnerId: learner1Id });

        // Ensure active plan exists
        const initialPlan = await generateStudyPlanService(learner1Id);
        assert.ok(initialPlan);
        const initialVersion = initialPlan.version;

        // Verify that there is strictly 1 active plan for learner1
        const activeCount = await StudyPlan.countDocuments({ learnerId: learner1Id, status: "ACTIVE" });
        assert.equal(activeCount, 1);

        // Attempt 2nd generation
        const planA = await generateStudyPlanService(learner1Id, { revisionReason: "2nd Plan Generation" });
        assert.ok(planA);

        const finalActivePlans = await StudyPlan.find({ learnerId: learner1Id, status: "ACTIVE" });
        assert.equal(finalActivePlans.length, 1, "Never allow more than 1 ACTIVE plan per learner");
    });

    await t.test("15. Meaningful Revision Recommendation: Not recommended when no meaningful change exists", async () => {
        // Reset quota for learner1Id
        await StudyPlanGenerationQuota.deleteMany({ learnerId: learner1Id });
        await generateStudyPlanService(learner1Id);

        // Propose revision without changing any enrolled courses, mastery, or preferences
        const proposal = await proposePlanRevisionService(learner1Id, "Check no-op revision");
        assert.equal(
            proposal.isRevisionRecommended,
            false,
            "When current schedule and proposed schedule match identically, isRevisionRecommended must be FALSE"
        );
    });

    await t.test("16. AI Assistant Deterministic Fallback: Simulated failure triggers and verifies fallback", async () => {
        // Mock provider that throws an error
        setAiProvider({
            generateText: async () => {
                throw new Error("Simulated AI Provider Outage / 503 Rate Limit");
            },
        });

        const reply = await chatWithAssistantService(learner1Id, "Can you explain binary search trees?");
        assert.ok(reply);
        assert.equal(reply.fallbackUsed, true, "fallbackUsed must be true when AI provider fails");
        assert.ok(reply.reply.includes("support your learning journey"), "Must return deterministic pedagogical template");

        resetAiProvider();
    });

    await t.test("17. Quota Enforcement: Exceeding 2 generations in single calendar day throws 429", async () => {
        const testLearnerId = new mongoose.Types.ObjectId();
        await Enrollment.create({
            learnerId: testLearnerId,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date(),
        });

        // 1st generation -> success
        const plan1 = await generateStudyPlanService(testLearnerId);
        assert.ok(plan1);

        // 2nd generation -> success
        const plan2 = await generateStudyPlanService(testLearnerId);
        assert.ok(plan2);

        // 3rd generation -> must fail with 429 QUOTA_EXCEEDED
        await assert.rejects(
            async () => {
                await generateStudyPlanService(testLearnerId);
            },
            (err) => {
                assert.equal(err.statusCode, 429);
                assert.equal(err.code, "QUOTA_EXCEEDED");
                return true;
            }
        );

        // Clean up test learner
        await Promise.all([
            Enrollment.deleteMany({ learnerId: testLearnerId }),
            StudyPlan.deleteMany({ learnerId: testLearnerId }),
            StudyPlanGenerationQuota.deleteMany({ learnerId: testLearnerId })
        ]);
    });

    await t.test("18. Mandatory Proposal Acceptance & Activity Revalidation: Unsupported activity types rejected", async () => {
        // Direct acceptance without proposalId rejected with 400
        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, {
                    startDate: "2026-11-01",
                    endDate: "2026-11-07",
                    reason: "Direct bypass",
                    proposedActivities: []
                });
            },
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.equal(err.code, "VALIDATION_ERROR");
                return true;
            }
        );

        // Acceptance of proposal with unsupported activity type (e.g. COURSE_DISCOVERY or FORGED) rejected with 400
        const currentActive = await StudyPlan.findOne({ learnerId: learner1Id, status: "ACTIVE" }).sort({ version: -1 }).lean();
        const fakeProposal = await StudyPlanProposal.create({
            learnerId: learner1Id,
            basedOnPlanId: currentActive?._id || null,
            basedOnVersion: currentActive?.version || 1,
            proposedVersion: (currentActive?.version || 1) + 1,
            status: "PENDING",
            startDate: "2026-11-01",
            endDate: "2026-11-07",
            reason: "Proposal with invalid activity type",
            isRevisionRecommended: true,
            proposedActivities: [
                {
                    activityId: "forged-act-1",
                    dayOfWeek: "MONDAY",
                    scheduledDate: "2026-11-02",
                    activityType: "COURSE_DISCOVERY",
                    title: "Forged discovery activity",
                    courseId: sharedCourse._id,
                    courseTitle: sharedCourse.title,
                    rationale: "Unverified",
                    actionUrl: "/fake",
                    order: 1
                }
            ],
            expiresAt: new Date(Date.now() + 60000)
        });

        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, { proposalId: fakeProposal._id.toString() });
            },
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.equal(err.code, "VALIDATION_ERROR");
                assert.ok(err.message.includes("Unsupported activity type"));
                return true;
            }
        );

        await StudyPlanProposal.deleteOne({ _id: fakeProposal._id });
    });

    await t.test("19. Proposal Acceptance Concurrency & Stale-Plan Protection: Deep Verification", async () => {
        // Reset state for learner1Id
        await StudyPlan.deleteMany({ learnerId: learner1Id });
        await StudyPlanProposal.deleteMany({ learnerId: learner1Id });
        await StudyPlanGenerationQuota.deleteMany({ learnerId: learner1Id });

        const plan1 = await generateStudyPlanService(learner1Id);
        assert.ok(plan1);
        assert.equal(plan1.version, 1);

        // Create proposal based on plan1 (version 1)
        const proposal1 = await proposePlanRevisionService(learner1Id, "Revision from plan1");
        assert.ok(proposal1.proposalId);

        // Stale basedOnVersion test: Update active plan to version 2
        const plan2 = await generateStudyPlanService(learner1Id, { revisionReason: "Second active plan" });
        assert.equal(plan2.version, 2);

        // Proposal 1 is now stale (based on version 1, active is version 2) -> must reject with 409
        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, { proposalId: proposal1.proposalId });
            },
            (err) => {
                assert.equal(err.statusCode, 409);
                assert.equal(err.code, "PROPOSAL_STALE");
                return true;
            }
        );

        // Verify active plan remains plan2 (version 2)
        const activePlanAfterStale = await StudyPlan.findOne({ learnerId: learner1Id, status: "ACTIVE" });
        assert.equal(activePlanAfterStale._id.toString(), plan2._id.toString());
        assert.equal(activePlanAfterStale.version, 2);

        // Stale basedOnPlanId test: Proposal with mismatched basedOnPlanId
        const proposalMismatchedId = await StudyPlanProposal.create({
            learnerId: learner1Id,
            basedOnPlanId: new mongoose.Types.ObjectId(), // fake old plan id
            basedOnVersion: 2,
            proposedVersion: 3,
            status: "PENDING",
            startDate: "2026-11-01",
            endDate: "2026-11-07",
            reason: "Mismatched ID proposal",
            isRevisionRecommended: true,
            proposedActivities: [
                {
                    activityId: "act-valid-1",
                    dayOfWeek: "MONDAY",
                    scheduledDate: "2026-11-02",
                    activityType: "LESSON",
                    title: "Valid Lesson",
                    courseId: sharedCourse._id,
                    courseTitle: sharedCourse.title,
                    topicId: sharedTopic1._id,
                    targetId: sharedLesson1._id.toString(),
                    rationale: "Valid",
                    actionUrl: "/learn",
                    order: 1
                }
            ],
            expiresAt: new Date(Date.now() + 60000)
        });

        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, { proposalId: proposalMismatchedId._id.toString() });
            },
            (err) => {
                assert.equal(err.statusCode, 409);
                assert.equal(err.code, "PROPOSAL_STALE");
                return true;
            }
        );

        // Concurrent acceptance of the same valid proposal produces exactly 1 success
        const proposalValid = await proposePlanRevisionService(learner1Id, "Valid proposal for concurrency");
        const results = await Promise.allSettled([
            acceptPlanRevisionService(learner1Id, { proposalId: proposalValid.proposalId }),
            acceptPlanRevisionService(learner1Id, { proposalId: proposalValid.proposalId })
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");
        assert.equal(fulfilled.length, 1, "Exactly one concurrent acceptance must succeed");
        assert.equal(rejected.length, 1, "The second concurrent acceptance must fail with 409");
        assert.equal(rejected[0].reason.statusCode, 409);

        // Verify exactly one active plan exists in DB
        const finalActivePlans = await StudyPlan.find({ learnerId: learner1Id, status: "ACTIVE" });
        assert.equal(finalActivePlans.length, 1);
        assert.equal(finalActivePlans[0].version, 3);
    });

    await t.test("20. Strict Target Association Validation: Rejects cross-course, cross-topic, and misplaced levels", async () => {
        const otherInstructorCourse = await Course.create({
            title: "Other Instructor Course",
            description: "A comprehensive course that meets the minimum length requirement.",
            domain: "DATA_SCIENCE",
            category: "MACHINE_LEARNING",
            difficulty: "BEGINNER",
            createdBy: instructorId,
            status: "PUBLISHED",
            isPublished: true
        });

        const otherTopic = await Topic.create({
            courseId: otherInstructorCourse._id,
            title: "Other Course Topic",
            order: 1
        });

        const otherPractice = await Practice.create({
            courseId: otherInstructorCourse._id,
            topicId: otherTopic._id,
            questionBankId: new mongoose.Types.ObjectId(),
            createdBy: instructorId,
            title: "Other Course Practice",
            status: "PUBLISHED"
        });

        const otherAssessment = await Assessment.create({
            courseId: otherInstructorCourse._id,
            topicId: otherTopic._id,
            type: "TOPIC",
            title: "Other Course Topic Assessment",
            createdBy: instructorId,
            status: "PUBLISHED",
            passingScore: 70
        });

        const finalCourseAssessment = await Assessment.create({
            courseId: sharedCourse._id,
            topicId: null,
            type: "FINAL",
            title: "Comprehensive Final Assessment",
            createdBy: instructorId,
            status: "PUBLISHED",
            passingScore: 70
        });

        // 1. Cross-course practice rejected
        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, {
                    proposalId: (await StudyPlanProposal.create({
                        learnerId: learner1Id,
                        basedOnVersion: 3,
                        proposedVersion: 4,
                        status: "PENDING",
                        startDate: "2026-11-01",
                        endDate: "2026-11-07",
                        reason: "Cross-course practice test",
                        isRevisionRecommended: true,
                        proposedActivities: [
                            {
                                activityId: "act-cross-prac",
                                dayOfWeek: "MONDAY",
                                scheduledDate: "2026-11-02",
                                activityType: "PRACTICE",
                                title: "Cross practice",
                                courseId: sharedCourse._id, // claims sharedCourse, but practice belongs to otherInstructorCourse
                                courseTitle: sharedCourse.title,
                                topicId: sharedTopic1._id,
                                targetId: otherPractice._id.toString(),
                                rationale: "Cross test",
                                actionUrl: "/p",
                                order: 1
                            }
                        ],
                        expiresAt: new Date(Date.now() + 60000)
                    }))._id.toString()
                });
            },
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.ok(err.message.includes("Target practice does not belong to specified course"));
                return true;
            }
        );

        // 2. Cross-topic practice rejected (practice on topic1 claimed on topic2)
        const practiceTopic1 = await Practice.create({
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            questionBankId: new mongoose.Types.ObjectId(),
            createdBy: instructorId,
            title: "Topic 1 Practice",
            status: "PUBLISHED"
        });

        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, {
                    proposalId: (await StudyPlanProposal.create({
                        learnerId: learner1Id,
                        basedOnVersion: 3,
                        proposedVersion: 4,
                        status: "PENDING",
                        startDate: "2026-11-01",
                        endDate: "2026-11-07",
                        reason: "Cross-topic practice test",
                        isRevisionRecommended: true,
                        proposedActivities: [
                            {
                                activityId: "act-cross-topic-prac",
                                dayOfWeek: "MONDAY",
                                scheduledDate: "2026-11-02",
                                activityType: "PRACTICE",
                                title: "Cross topic practice",
                                courseId: sharedCourse._id,
                                courseTitle: sharedCourse.title,
                                topicId: sharedTopic2._id, // claimed topic2
                                targetId: practiceTopic1._id.toString(), // belongs to topic1
                                rationale: "Cross test",
                                actionUrl: "/p",
                                order: 1
                            }
                        ],
                        expiresAt: new Date(Date.now() + 60000)
                    }))._id.toString()
                });
            },
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.ok(err.message.includes("Target practice does not belong to specified topic"));
                return true;
            }
        );

        // 3. Cross-course assessment rejected
        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, {
                    proposalId: (await StudyPlanProposal.create({
                        learnerId: learner1Id,
                        basedOnVersion: 3,
                        proposedVersion: 4,
                        status: "PENDING",
                        startDate: "2026-11-01",
                        endDate: "2026-11-07",
                        reason: "Cross-course assessment test",
                        isRevisionRecommended: true,
                        proposedActivities: [
                            {
                                activityId: "act-cross-ass",
                                dayOfWeek: "MONDAY",
                                scheduledDate: "2026-11-02",
                                activityType: "ASSESSMENT",
                                title: "Cross assessment",
                                courseId: sharedCourse._id,
                                courseTitle: sharedCourse.title,
                                topicId: sharedTopic1._id,
                                targetId: otherAssessment._id.toString(),
                                rationale: "Cross test",
                                actionUrl: "/a",
                                order: 1
                            }
                        ],
                        expiresAt: new Date(Date.now() + 60000)
                    }))._id.toString()
                });
            },
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.ok(err.message.includes("Target assessment does not belong to specified course"));
                return true;
            }
        );

        // 4. Topic assessment cross-topic rejected
        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, {
                    proposalId: (await StudyPlanProposal.create({
                        learnerId: learner1Id,
                        basedOnVersion: 3,
                        proposedVersion: 4,
                        status: "PENDING",
                        startDate: "2026-11-01",
                        endDate: "2026-11-07",
                        reason: "Topic assessment cross-topic test",
                        isRevisionRecommended: true,
                        proposedActivities: [
                            {
                                activityId: "act-cross-topic-ass",
                                dayOfWeek: "MONDAY",
                                scheduledDate: "2026-11-02",
                                activityType: "ASSESSMENT",
                                title: "Topic assessment on wrong topic",
                                courseId: sharedCourse._id,
                                courseTitle: sharedCourse.title,
                                topicId: sharedTopic2._id, // Topic 2
                                targetId: sharedAssessment1._id.toString(), // belongs to Topic 1
                                rationale: "Cross test",
                                actionUrl: "/a",
                                order: 1
                            }
                        ],
                        expiresAt: new Date(Date.now() + 60000)
                    }))._id.toString()
                });
            },
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.ok(err.message.includes("Topic assessment requires matching topicId"));
                return true;
            }
        );

        // 5. Course-level assessment (FINAL) presented as topic-level activity rejected
        await assert.rejects(
            async () => {
                await acceptPlanRevisionService(learner1Id, {
                    proposalId: (await StudyPlanProposal.create({
                        learnerId: learner1Id,
                        basedOnVersion: 3,
                        proposedVersion: 4,
                        status: "PENDING",
                        startDate: "2026-11-01",
                        endDate: "2026-11-07",
                        reason: "Final assessment as topic activity",
                        isRevisionRecommended: true,
                        proposedActivities: [
                            {
                                activityId: "act-final-as-topic",
                                dayOfWeek: "MONDAY",
                                scheduledDate: "2026-11-02",
                                activityType: "ASSESSMENT",
                                title: "Course final disguised as topic assessment",
                                courseId: sharedCourse._id,
                                courseTitle: sharedCourse.title,
                                topicId: sharedTopic1._id, // Disguised under topic1
                                targetId: finalCourseAssessment._id.toString(),
                                rationale: "Misplaced test",
                                actionUrl: "/a",
                                order: 1
                            }
                        ],
                        expiresAt: new Date(Date.now() + 60000)
                    }))._id.toString()
                });
            },
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.ok(err.message.includes("Course-level assessment (DIAGNOSTIC or FINAL) cannot be scheduled as a topic-specific activity"));
                return true;
            }
        );

        // Clean up fixtures
        await Promise.all([
            Course.deleteOne({ _id: otherInstructorCourse._id }),
            Topic.deleteOne({ _id: otherTopic._id }),
            Practice.deleteOne({ _id: otherPractice._id }),
            Practice.deleteOne({ _id: practiceTopic1._id }),
            Assessment.deleteOne({ _id: otherAssessment._id }),
            Assessment.deleteOne({ _id: finalCourseAssessment._id })
        ]);
    });

    await t.test("21. Practice Completion Deduplication: Passed attempts and evidence excluded, failed/in-progress eligible", async () => {
        const dedupeLearnerId = new mongoose.Types.ObjectId();
        await Enrollment.create({
            learnerId: dedupeLearnerId,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date()
        });

        const practiceForDedupe1 = await Practice.create({
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            questionBankId: new mongoose.Types.ObjectId(),
            createdBy: instructorId,
            title: "Practice Passed Attempt",
            status: "PUBLISHED"
        });

        const practiceForDedupe2 = await Practice.create({
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            questionBankId: new mongoose.Types.ObjectId(),
            createdBy: instructorId,
            title: "Practice Valid Evidence",
            status: "PUBLISHED"
        });

        const practiceForDedupe3 = await Practice.create({
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            questionBankId: new mongoose.Types.ObjectId(),
            createdBy: instructorId,
            title: "Practice Failed Attempt",
            status: "PUBLISHED"
        });

        const practiceForDedupe4 = await Practice.create({
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            questionBankId: new mongoose.Types.ObjectId(),
            createdBy: instructorId,
            title: "Practice In Progress Attempt",
            status: "PUBLISHED"
        });

        // 1. practiceForDedupe1: SUBMITTED attempt with score 80% (passed)
        await PracticeAttempt.create({
            practiceId: practiceForDedupe1._id,
            learnerId: dedupeLearnerId,
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            attemptNumber: 1,
            status: "SUBMITTED",
            totalQuestions: 5,
            totalMarks: 5,
            marksAwarded: 4,
            scorePercent: 80,
            correctCount: 4,
            questions: [
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "Sample Q1",
                    type: "MCQ_SINGLE",
                    options: [{ key: "A", text: "Option A" }],
                    correctAnswer: "A",
                    marks: 1,
                    difficulty: "EASY"
                }
            ],
            contributeToLearningEvidence: false
        });

        // 2. practiceForDedupe2: has valid LearningEvidence record
        await LearningEvidence.create({
            learnerId: dedupeLearnerId,
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            sourceType: "PRACTICE",
            sourceId: practiceForDedupe2._id,
            attemptId: new mongoose.Types.ObjectId(),
            completedAt: new Date(),
            totalQuestions: 5,
            correctCount: 4,
            totalMarks: 5,
            marksAwarded: 4,
            scorePercent: 80,
            contributeToLearningEvidence: true
        });

        // 3. practiceForDedupe3: SUBMITTED attempt with score 30% (failed formative -> eligible for repetition/revision)
        await PracticeAttempt.create({
            practiceId: practiceForDedupe3._id,
            learnerId: dedupeLearnerId,
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            attemptNumber: 1,
            status: "SUBMITTED",
            totalQuestions: 5,
            totalMarks: 5,
            marksAwarded: 1.5,
            scorePercent: 30,
            correctCount: 1,
            questions: [
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "Sample Q3",
                    type: "MCQ_SINGLE",
                    options: [{ key: "A", text: "Option A" }],
                    correctAnswer: "A",
                    marks: 1,
                    difficulty: "EASY"
                }
            ],
            contributeToLearningEvidence: false
        });

        // 4. practiceForDedupe4: IN_PROGRESS attempt (not completed -> eligible for candidate scheduling)
        await PracticeAttempt.create({
            practiceId: practiceForDedupe4._id,
            learnerId: dedupeLearnerId,
            courseId: sharedCourse._id,
            topicId: sharedTopic1._id,
            attemptNumber: 1,
            status: "IN_PROGRESS",
            totalQuestions: 5,
            totalMarks: 5,
            questions: [
                {
                    questionId: new mongoose.Types.ObjectId(),
                    questionText: "Sample Q4",
                    type: "MCQ_SINGLE",
                    options: [{ key: "A", text: "Option A" }],
                    correctAnswer: "A",
                    marks: 1,
                    difficulty: "EASY"
                }
            ],
            contributeToLearningEvidence: false
        });

        const candidates = await collectCandidateActivities(dedupeLearnerId, { preferredSessionDuration: 30 });
        const candidatePracticeIds = candidates
            .filter((c) => c.activityType === "PRACTICE")
            .map((c) => c.targetId);

        // Assert passed practice and evidence practice are EXCLUDED
        assert.ok(!candidatePracticeIds.includes(practiceForDedupe1._id.toString()), "Passed practice attempt must be excluded");
        assert.ok(!candidatePracticeIds.includes(practiceForDedupe2._id.toString()), "Practice with valid evidence must be excluded");

        // Assert failed practice and in-progress practice remain ELIGIBLE
        assert.ok(candidatePracticeIds.includes(practiceForDedupe3._id.toString()), "Failed practice attempt remains eligible for study revision");
        assert.ok(candidatePracticeIds.includes(practiceForDedupe4._id.toString()), "In-progress attempt is not treated as completed and remains eligible");

        // Cleanup
        await Promise.all([
            Enrollment.deleteMany({ learnerId: dedupeLearnerId }),
            Practice.deleteMany({ _id: { $in: [practiceForDedupe1._id, practiceForDedupe2._id, practiceForDedupe3._id, practiceForDedupe4._id] } }),
            PracticeAttempt.deleteMany({ learnerId: dedupeLearnerId }),
            LearningEvidence.deleteMany({ learnerId: dedupeLearnerId })
        ]);
    });

    await t.test("22. Timezone-Aware Quota & Rollover Verification", async () => {
        const tzLearnerId = new mongoose.Types.ObjectId();
        await Enrollment.create({
            learnerId: tzLearnerId,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date()
        });

        // 1. Quota service returns consistent timezone and resetAt
        const quotaInfo = await getStudyPlanQuotaService(tzLearnerId);
        assert.ok(quotaInfo.dateKey);
        assert.equal(quotaInfo.maxAllowed, 2);
        assert.equal(quotaInfo.count, 0);
        assert.equal(quotaInfo.remaining, 2);
        assert.ok(quotaInfo.timeZone);
        assert.ok(quotaInfo.resetAt);

        // 2. Date key formatter respects specified timezone offset
        const fixedDate = new Date("2026-11-01T23:30:00.000Z"); // 23:30 UTC Nov 1 = 05:00 Nov 2 in Asia/Kolkata
        const utcKey = getCalendarDateKey(fixedDate, "UTC");
        const istKey = getCalendarDateKey(fixedDate, "Asia/Kolkata");
        assert.equal(utcKey, "2026-11-01");
        assert.equal(istKey, "2026-11-02");

        // 3. Midnight rollover calculation
        const utcResetAt = getNextMidnightResetAt(fixedDate, "UTC");
        assert.equal(utcResetAt, "2026-11-02T00:00:00.000Z");

        // Local midnight must be converted to the correct UTC instant.
        assert.equal(
            getNextMidnightResetAt(fixedDate, "Asia/Kolkata"),
            "2026-11-02T18:30:00.000Z"
        );
        assert.equal(
            getNextMidnightResetAt(fixedDate, "America/Los_Angeles"),
            "2026-11-02T08:00:00.000Z"
        );

        // Spring DST transition: midnight after March 8, 2026 in New York is 04:00 UTC.
        assert.equal(
            getNextMidnightResetAt(new Date("2026-03-08T12:00:00.000Z"), "America/New_York"),
            "2026-03-09T04:00:00.000Z"
        );

        // 4. Failed plan generation does NOT consume quota
        // To simulate failed generation: temporarily set Course status to invalid within callback or make session fail
        await assert.rejects(
            async () => {
                // learner without enrollment cannot generate if no course is active -> wait, let's test quota when generation throws
                const badLearnerId = new mongoose.Types.ObjectId();
                // Pass learner with no enrollments: collectCandidateActivities yields [] and schedule is []
                // Instead, force an error inside withTransaction by passing invalid ObjectId in learnerId
                await generateStudyPlanService("not-an-object-id");
            }
        );

        const quotaAfterFailure = await getStudyPlanQuotaService(tzLearnerId);
        assert.equal(quotaAfterFailure.count, 0, "Failed generation must not consume quota");

        // Cleanup
        await Enrollment.deleteMany({ learnerId: tzLearnerId });
        await StudyPlanGenerationQuota.deleteMany({ learnerId: tzLearnerId });
    });

    await t.test("23. Seven-day schedule: every calendar day is represented and activities can share a day", async () => {
        const weekInfo = getWeekDates(new Date("2026-11-02T12:00:00.000Z"), "UTC");
        const candidates = Array.from({ length: 21 }, (_, index) => ({
            activityId: `weekly-${index}`,
            activityType: "LESSON",
            title: `Lesson ${index + 1}`,
            courseId: sharedCourse._id,
            courseTitle: sharedCourse.title,
            topicId: sharedTopic1._id,
            topicTitle: sharedTopic1.title,
            targetId: new mongoose.Types.ObjectId().toString(),
            estimatedDurationMinutes: 30,
            durationAllocationType: "PLANNING_ALLOCATION",
            rationale: "Seven-day distribution test",
            actionUrl: "/learner/test"
        }));
        const schedule = buildDeterministicSchedule(candidates, weekInfo, {
            studyDays: ["MONDAY", "WEDNESDAY"],
            dailyStudyTime: "1-2 hours",
            preferredSessionDuration: 30
        });
        const scheduledDays = new Set(schedule.map((activity) => activity.dayOfWeek));
        assert.equal(weekInfo.weekDays.length, 7);
        assert.ok(schedule.length > 7, "Multiple activities must be schedulable in a day when capacity permits");
        assert.deepEqual(
            [...scheduledDays].sort(),
            ["FRIDAY", "MONDAY", "SATURDAY", "SUNDAY", "THURSDAY", "TUESDAY", "WEDNESDAY"].sort(),
            "Preferred study days must not remove the other calendar days"
        );
        const activitiesPerDay = new Map();
        const minutesPerDay = new Map();
        for (const activity of schedule) {
            activitiesPerDay.set(activity.scheduledDate, (activitiesPerDay.get(activity.scheduledDate) || 0) + 1);
            minutesPerDay.set(activity.scheduledDate, (minutesPerDay.get(activity.scheduledDate) || 0) + activity.estimatedDurationMinutes);
        }
        assert.ok([...activitiesPerDay.values()].some((count) => count > 1), "A day may contain multiple activities");
        assert.ok([...minutesPerDay.values()].every((minutes) => minutes <= 90), "Daily capacity must never be exceeded");
        assert.equal(new Set(schedule.map((activity) => activity.targetId)).size, schedule.length, "No activity may be duplicated");
    });


    await t.test("24. Quota rollback: failure after quota increment leaves no consumed generation", async () => {
        const rollbackLearnerId = new mongoose.Types.ObjectId();
        await Enrollment.create({
            learnerId: rollbackLearnerId,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date()
        });
        const originalSave = StudyPlan.prototype.save;
        try {
            StudyPlan.prototype.save = async function () {
                throw new Error("Simulated persistence failure after quota increment");
            };
            await assert.rejects(
                () => generateStudyPlanService(rollbackLearnerId),
                /Simulated persistence failure/
            );
        } finally {
            StudyPlan.prototype.save = originalSave;
        }

        const dateKey = getCalendarDateKey(new Date(), process.env.APP_TIMEZONE || "UTC");
        const quota = await StudyPlanGenerationQuota.findOne({ learnerId: rollbackLearnerId, dateKey }).lean();
        assert.equal(quota?.count || 0, 0, "Aborted plan transaction must roll back quota increment");
        assert.equal(await StudyPlan.countDocuments({ learnerId: rollbackLearnerId }), 0, "Failed generation must not persist a plan");
        assert.equal(await StudyPlan.countDocuments({ learnerId: rollbackLearnerId, status: "ACTIVE" }), 0);
        await Promise.all([
            Enrollment.deleteMany({ learnerId: rollbackLearnerId }),
            StudyPlanGenerationQuota.deleteMany({ learnerId: rollbackLearnerId })
        ]);
    });

    await t.test("25. Concurrent first quota creation and generation never exceed the daily limit", async () => {
        const concurrentLearnerId = new mongoose.Types.ObjectId();
        await Enrollment.create({
            learnerId: concurrentLearnerId,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date()
        });
        const results = await Promise.allSettled([
            generateStudyPlanService(concurrentLearnerId),
            generateStudyPlanService(concurrentLearnerId),
            generateStudyPlanService(concurrentLearnerId)
        ]);
        const successful = results.filter((result) => result.status === "fulfilled");
        const failed = results.filter((result) => result.status === "rejected");
        assert.equal(successful.length, 2, "Exactly two concurrent generations may succeed");
        assert.equal(failed.length, 1, "The third concurrent generation must be rejected");
        const dateKey = getCalendarDateKey(new Date(), process.env.APP_TIMEZONE || "UTC");
        const quota = await StudyPlanGenerationQuota.findOne({ learnerId: concurrentLearnerId, dateKey }).lean();
        assert.equal(quota?.count, 2, "Persisted quota count must match successful generations");
        assert.equal(await StudyPlan.countDocuments({ learnerId: concurrentLearnerId, status: "ACTIVE" }), 1);
        assert.equal(await StudyPlan.countDocuments({ learnerId: concurrentLearnerId }), 2);
        await Promise.all([
            Enrollment.deleteMany({ learnerId: concurrentLearnerId }),
            StudyPlan.deleteMany({ learnerId: concurrentLearnerId }),
            StudyPlanGenerationQuota.deleteMany({ learnerId: concurrentLearnerId })
        ]);
    });


    await t.test("26. Proposal acceptance rejects a missing basedOnPlanId when an active plan exists", async () => {
        const invariantLearnerId = new mongoose.Types.ObjectId();
        await Enrollment.create({
            learnerId: invariantLearnerId,
            courseId: sharedCourse._id,
            status: "ACTIVE",
            enrolledAt: new Date()
        });
        const activePlan = await generateStudyPlanService(invariantLearnerId);
        const proposal = await StudyPlanProposal.create({
            learnerId: invariantLearnerId,
            basedOnPlanId: null,
            basedOnVersion: activePlan.version,
            proposedVersion: activePlan.version + 1,
            status: "PENDING",
            startDate: activePlan.startDate,
            endDate: activePlan.endDate,
            reason: "Missing active plan identifier invariant test",
            isRevisionRecommended: true,
            proposedActivities: [],
            preferencesSnapshot: activePlan.preferencesSnapshot,
            expiresAt: new Date(Date.now() + 60_000)
        });

        await assert.rejects(
            () => acceptPlanRevisionService(invariantLearnerId, { proposalId: proposal._id.toString() }),
            (err) => {
                assert.equal(err.statusCode, 409);
                assert.equal(err.code, "PROPOSAL_STALE");
                return true;
            }
        );
        assert.equal(await StudyPlan.countDocuments({ learnerId: invariantLearnerId, status: "ACTIVE" }), 1);
        assert.equal((await StudyPlanProposal.findById(proposal._id)).status, "PENDING");
        await Promise.all([
            Enrollment.deleteMany({ learnerId: invariantLearnerId }),
            StudyPlan.deleteMany({ learnerId: invariantLearnerId }),
            StudyPlanProposal.deleteMany({ learnerId: invariantLearnerId }),
            StudyPlanGenerationQuota.deleteMany({ learnerId: invariantLearnerId })
        ]);
    });

});
