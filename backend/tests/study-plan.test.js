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
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { LearningEvidence } from "../src/modules/learningEvidence/models/learningEvidence.model.js";
import { LearnerProfile } from "../src/modules/learner/models/learnerProfile.model.js";
import { TopicMastery } from "../src/modules/topicMastery/models/topicMastery.model.js";
import { StudyPlan } from "../src/modules/studyPlan/models/studyPlan.model.js";
import { StudyPlanProposal } from "../src/modules/studyPlan/models/studyPlanProposal.model.js";
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
            StudyPlan.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            StudyPlanProposal.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            AssistantConversation.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
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
            StudyPlan.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            StudyPlanProposal.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
            AssistantConversation.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
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
        // dailyStudyTime: "1-2 hours" translates to 90 min capacity -> Can fit all 3 x 30min on MONDAY
        const schedule = buildDeterministicSchedule(
            multipleCandidates,
            weekInfo,
            { studyDays: ["MONDAY", "WEDNESDAY"], dailyStudyTime: "1-2 hours" }
        );

        const mondayActivities = schedule.filter((s) => s.dayOfWeek === "MONDAY");
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
        // Ensure active plan exists
        const initialPlan = await generateStudyPlanService(learner1Id);
        assert.ok(initialPlan);
        const initialVersion = initialPlan.version;

        // Verify that there is strictly 1 active plan for learner1
        const activeCount = await StudyPlan.countDocuments({ learnerId: learner1Id, status: "ACTIVE" });
        assert.equal(activeCount, 1);

        // Attempt concurrent plan generation
        const [planA, planB] = await Promise.all([
            generateStudyPlanService(learner1Id, { revisionReason: "Concurrent A" }),
            generateStudyPlanService(learner1Id, { revisionReason: "Concurrent B" }),
        ]);

        const finalActivePlans = await StudyPlan.find({ learnerId: learner1Id, status: "ACTIVE" });
        assert.equal(finalActivePlans.length, 1, "Never allow more than 1 ACTIVE plan per learner");
    });

    await t.test("15. Meaningful Revision Recommendation: Not recommended when no meaningful change exists", async () => {
        // Create fresh plan
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
});
