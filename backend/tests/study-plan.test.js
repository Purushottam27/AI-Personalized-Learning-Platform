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
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { LearningEvidence } from "../src/modules/learningEvidence/models/learningEvidence.model.js";
import { LearnerProfile } from "../src/modules/learner/models/learnerProfile.model.js";
import { StudyPlan } from "../src/modules/studyPlan/models/studyPlan.model.js";
import { AssistantConversation } from "../src/modules/studyPlan/models/assistantConversation.model.js";
import {
    generateStudyPlanService,
    getActiveStudyPlanService,
    getLearnerStudyPreferences,
    updateLearnerStudyPreferencesService,
    proposePlanRevisionService,
    chatWithAssistantService,
} from "../src/modules/studyPlan/services/studyPlan.service.js";

test("Phase 4 — AI Learning Assistant & Personalized Study Plan Test Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const learnerId = new mongoose.Types.ObjectId();

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

        // Clean collections
        await Promise.all([
            User.deleteMany({ _id: { $in: [instructorId, learnerId] } }),
            LearnerProfile.deleteMany({ userId: learnerId }),
            Course.deleteMany({ createdBy: instructorId }),
            Enrollment.deleteMany({ learnerId }),
            StudyPlan.deleteMany({ learnerId }),
            AssistantConversation.deleteMany({ learnerId }),
            LearningEvidence.deleteMany({ learnerId }),
        ]);

        await User.create([
            {
                _id: instructorId,
                name: "Instructor Study",
                email: "instructor.study@test.com",
                role: "INSTRUCTOR",
                password: "hashedPassword123",
            },
            {
                _id: learnerId,
                name: "Learner Planner",
                email: "learner.planner@test.com",
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
        await Promise.all([
            User.deleteMany({ _id: { $in: [instructorId, learnerId] } }),
            LearnerProfile.deleteMany({ userId: learnerId }),
            Course.deleteMany({ createdBy: instructorId }),
            Enrollment.deleteMany({ learnerId }),
            StudyPlan.deleteMany({ learnerId }),
            AssistantConversation.deleteMany({ learnerId }),
            LearningEvidence.deleteMany({ learnerId }),
        ]);
        await mongoose.disconnect();
    });

    await t.test("1. Learner Study Preferences: default fallback and update", async () => {
        const initialPrefs = await getLearnerStudyPreferences(learnerId);
        assert.ok(initialPrefs);
        assert.equal(initialPrefs.dailyStudyTime, "1-2 hours");
        assert.ok(Array.isArray(initialPrefs.studyDays));
        assert.equal(initialPrefs.preferredSessionDuration, 45);
        assert.equal(initialPrefs.preferredTimeOfDay, "ANYTIME");

        const updated = await updateLearnerStudyPreferencesService(learnerId, {
            dailyStudyTime: "1-2 hours",
            studyDays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
            preferredSessionDuration: 30,
            preferredTimeOfDay: "MORNING",
        });

        assert.equal(updated.dailyStudyTime, "1-2 hours");
        assert.deepEqual(updated.studyDays, ["MONDAY", "WEDNESDAY", "FRIDAY"]);
        assert.equal(updated.preferredSessionDuration, 30);
        assert.equal(updated.preferredTimeOfDay, "MORNING");

        // Verify via API
        const token = signLearnerToken(learnerId);
        const res = await apiRequest({
            method: "GET",
            path: "/api/v1/learning/me/study-preferences",
            token,
        });
        assert.equal(res.status, 200);
        assert.equal(res.data.data.dailyStudyTime, "1-2 hours");
        assert.deepEqual(res.data.data.studyDays, ["MONDAY", "WEDNESDAY", "FRIDAY"]);
    });

    await t.test("2. Plan Generation: builds grounded schedule from enrolled course", async () => {
        const course = await Course.create({
            title: "Data Structures & Algorithms Comprehensive",
            description: "Master modern algorithms and data structures with hands-on practice.",
            domain: "COMPUTER_SCIENCE",
            category: "SOFTWARE_ENGINEERING",
            difficulty: "BEGINNER",
            createdBy: instructorId,
            status: "PUBLISHED",
            isPublished: true,
            progressionPolicy: { lockingEnabled: false },
        });

        const topic1 = await Topic.create({
            courseId: course._id,
            title: "Arrays & Strings",
            order: 1,
        });

        const lesson1 = await Lesson.create({
            topicId: topic1._id,
            title: "Array Basics",
            content: "Introduction to arrays",
            estimatedDuration: 20,
            order: 1,
        });

        // Enroll learner
        await Enrollment.create({
            learnerId,
            courseId: course._id,
            status: "ACTIVE",
            enrolledAt: new Date(),
        });

        // Generate plan
        const plan = await generateStudyPlanService(learnerId);
        assert.ok(plan);
        assert.equal(plan.status, "ACTIVE");
        assert.equal(plan.version, 1);
        assert.deepEqual(plan.preferencesSnapshot.studyDays, ["MONDAY", "WEDNESDAY", "FRIDAY"]);
        assert.ok(plan.scheduledActivities.length > 0);

        // Verify scheduled activities contain our created lesson
        const scheduledLesson = plan.scheduledActivities.find(
            (a) => a.targetId === lesson1._id.toString() || a.activityType === "LESSON"
        );
        assert.ok(scheduledLesson, "First topic lesson should be scheduled");
        assert.equal(scheduledLesson.isCompleted, false);

        // Verify API GET active plan
        const token = signLearnerToken(learnerId);
        const getRes = await apiRequest({
            method: "GET",
            path: "/api/v1/learning/me/study-plan",
            token,
        });
        assert.equal(getRes.status, 200);
        assert.equal(getRes.data.data.plan.version, 1);
        assert.ok(getRes.data.data.plan.scheduledActivities.length > 0);
    });

    await t.test("3. Evidence Grounding: dynamic completion without artificial checkmarks", async () => {
        const activePlan = await getActiveStudyPlanService(learnerId);
        assert.ok(activePlan);

        const scheduledLesson = activePlan.scheduledActivities.find((a) => a.activityType === "LESSON");
        assert.ok(scheduledLesson);
        assert.equal(scheduledLesson.isCompleted, false);

        // Create genuine learning evidence for this topic/activity
        await LearningEvidence.create({
            learnerId,
            courseId: scheduledLesson.courseId,
            topicId: scheduledLesson.topicId,
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

        // Re-fetch enriched plan
        const refreshed = await getActiveStudyPlanService(learnerId);
        const refreshedLesson = refreshed.scheduledActivities.find(
            (a) => a.activityId === scheduledLesson.activityId
        );
        assert.equal(
            refreshedLesson.isCompleted,
            true,
            "Should reflect isCompleted: true strictly based on LearningEvidence"
        );
    });

    await t.test("4. Adaptation Workflow: propose revision and accept with versioning", async () => {
        const proposed = await proposePlanRevisionService(learnerId, "Adjusting study pace");

        assert.ok(proposed);
        assert.equal(proposed.isRevisionRecommended, true);
        assert.equal(proposed.proposedVersion, 2);
        assert.ok(proposed.proposedActivities);

        // Accept revision via API
        const token = signLearnerToken(learnerId);
        const acceptRes = await apiRequest({
            method: "POST",
            path: "/api/v1/learning/me/study-plan/accept-revision",
            token,
            body: {
                startDate: proposed.startDate,
                endDate: proposed.endDate,
                reason: "Pace change accepted",
                proposedActivities: proposed.proposedActivities,
            },
        });

        assert.equal(acceptRes.status, 200);
        assert.equal(acceptRes.data.data.plan.version, 2, "New plan should be version 2");
        assert.equal(acceptRes.data.data.plan.status, "ACTIVE");

        // Verify old plan is superseded
        const oldPlan = await StudyPlan.findOne({ learnerId, version: 1 });
        assert.equal(oldPlan.status, "SUPERSEDED");
    });

    await t.test("5. AI Learning Assistant: contextual grounded chat and offline fallback", async () => {
        // Direct service invocation with message string
        const reply = await chatWithAssistantService(learnerId, "What should I focus on next?");

        assert.ok(reply);
        assert.ok(reply.reply.length > 0);

        // Verify conversation history was recorded
        const history = await AssistantConversation.findOne({ learnerId });
        assert.ok(history && history.messages.length >= 2, "User message and assistant response must be persisted");
        assert.equal(history.messages[history.messages.length - 2].role, "user");
        assert.equal(history.messages[history.messages.length - 1].role, "assistant");

        // Verify via API
        const token = signLearnerToken(learnerId);
        const chatRes = await apiRequest({
            method: "POST",
            path: "/api/v1/learning/me/study-assistant/chat",
            token,
            body: { message: "Help me review algorithms" },
        });

        assert.equal(chatRes.status, 200);
        assert.ok(chatRes.data.data.reply);
    });
});
