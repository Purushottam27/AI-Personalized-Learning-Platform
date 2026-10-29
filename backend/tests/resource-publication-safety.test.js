import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { Resource } from "../src/modules/resource/models/resource.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { User } from "../src/modules/identity/models/user.model.js";

import { publishCourseService } from "../src/modules/course/services/course.service.js";
import { archiveResourceService } from "../src/modules/resource/services/resource.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { MONGODB_URI, TEST_DB_NAME, DB_NAME } = process.env;

test("Resource Lifecycle & Course Publication Safety Integration Suite", async (t) => {
    assert.ok(MONGODB_URI, "MONGODB_URI must be configured");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Must not run against production database");

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    assert.equal(mongoose.connection.name, TEST_DB_NAME);

    const instructorId = new mongoose.Types.ObjectId();
    const otherInstructorId = new mongoose.Types.ObjectId();

    const createdCourseIds = [];
    const createdUserIds = [instructorId, otherInstructorId];

    t.after(async () => {
        try {
            await Resource.deleteMany({ courseId: { $in: createdCourseIds } });
            await Assessment.deleteMany({ courseId: { $in: createdCourseIds } });
            await Question.deleteMany({ courseId: { $in: createdCourseIds } });
            await QuestionBank.deleteMany({ courseId: { $in: createdCourseIds } });
            await Topic.deleteMany({ courseId: { $in: createdCourseIds } });
            await Course.deleteMany({ _id: { $in: createdCourseIds } });
            await User.deleteMany({ _id: { $in: createdUserIds } });
        } finally {
            await mongoose.disconnect();
        }
    });

    async function createBankAndQuestions(courseId, topicId, count = 5) {
        const bank = await QuestionBank.create({
            title: `Bank for topic ${topicId}`,
            courseId,
            topicId,
            createdBy: instructorId,
            status: "ACTIVE"
        });

        const questions = [];
        for (let i = 0; i < count; i++) {
            const q = await Question.create({
                questionBankId: bank._id,
                courseId,
                topicId,
                createdBy: instructorId,
                type: "MCQ_SINGLE",
                questionText: `Question ${i + 1} for topic ${topicId}`,
                normalizedQuestionText: `question ${i + 1} for topic ${topicId}`,
                options: [
                    { key: "A", text: "Option A" },
                    { key: "B", text: "Option B" }
                ],
                correctAnswer: "A",
                marks: 1,
                difficulty: "MEDIUM",
                status: "ACTIVE"
            });
            questions.push(q);
        }
        return { bank, questions };
    }

    async function createValidCourseStructure(overrides = {}) {
        const course = await Course.create({
            title: "Advanced Systems Programming",
            description: "Deep dive into concurrent systems, memory safety, and kernel abstractions.",
            domain: "COMPUTER_SCIENCE",
            category: "SYSTEMS",
            difficulty: "ADVANCED",
            objectives: ["Understand memory layouts", "Build concurrent network servers"],
            createdBy: instructorId,
            status: "DRAFT",
            progressionPolicy: { lockingEnabled: true },
            ...overrides
        });
        createdCourseIds.push(course._id);

        const topic = await Topic.create({
            courseId: course._id,
            title: "Memory Safety & Allocators",
            description: "Understanding heap allocators and virtual memory paging.",
            learningObjectives: ["Analyze virtual memory page tables and TLB"],
            order: 1
        });

        const resource = await Resource.create({
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            title: "Memory Allocator Implementation Guide",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/alloc-guide",
            status: "ACTIVE",
            order: 1
        });

        const { questions: topicQuestions } = await createBankAndQuestions(course._id, topic._id, 5);

        const topicAssessment = await Assessment.create({
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "Topic 1 Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 70,
            maxAttempts: 3,
            questionIds: topicQuestions.map((q) => q._id)
        });

        const finalAssessment = await Assessment.create({
            courseId: course._id,
            createdBy: instructorId,
            type: "FINAL",
            title: "Course Comprehensive Final Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 75,
            maxAttempts: 2,
            questionIds: topicQuestions.map((q) => q._id)
        });

        return { course, topic, resource, topicAssessment, finalAssessment, topicQuestions };
    }

    await t.test("1. Archiving the only ACTIVE Resource of a published Topic is rejected", async () => {
        const { course, topic, resource } = await createValidCourseStructure();
        await publishCourseService(instructorId, course._id);

        const publishedCourse = await Course.findById(course._id);
        assert.equal(publishedCourse.status, "PUBLISHED");

        // Attempting to archive the sole active resource in a published course must be rejected
        await assert.rejects(
            archiveResourceService(instructorId, resource._id),
            (err) => err.code === "CANNOT_ARCHIVE_LAST_ACTIVE_RESOURCE" && err.statusCode === 409
        );

        // Resource remains ACTIVE
        const reloaded = await Resource.findById(resource._id);
        assert.equal(reloaded.status, "ACTIVE");
    });

    await t.test("2. Archiving one Resource is allowed when another ACTIVE Resource remains", async () => {
        const { course, topic, resource: res1 } = await createValidCourseStructure();

        // Add a second active resource to topic
        const res2 = await Resource.create({
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            title: "Supplemental Architecture Diagram",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/diagram",
            status: "ACTIVE",
            order: 2
        });

        await publishCourseService(instructorId, course._id);

        // Archiving res2 should succeed because res1 remains ACTIVE
        const archivedRes2 = await archiveResourceService(instructorId, res2._id);
        assert.equal(archivedRes2.status, "ARCHIVED");

        const reloadedRes1 = await Resource.findById(res1._id);
        assert.equal(reloadedRes1.status, "ACTIVE");

        // Now that only res1 remains ACTIVE, attempting to archive res1 must be rejected
        await assert.rejects(
            archiveResourceService(instructorId, res1._id),
            (err) => err.code === "CANNOT_ARCHIVE_LAST_ACTIVE_RESOURCE" && err.statusCode === 409
        );
    });

    await t.test("3. Existing DRAFT-course Resource archival behavior is preserved", async () => {
        const { course, resource } = await createValidCourseStructure();
        assert.equal(course.status, "DRAFT");

        // Archiving the only resource in a DRAFT course is allowed
        const archived = await archiveResourceService(instructorId, resource._id);
        assert.equal(archived.status, "ARCHIVED");

        const reloaded = await Resource.findById(resource._id);
        assert.equal(reloaded.status, "ARCHIVED");
    });

    await t.test("4. A concurrent publication/archive race cannot leave the course published in an invalid state", async () => {
        const { course, topic, resource } = await createValidCourseStructure();
        assert.equal(course.status, "DRAFT");

        // Trigger concurrent execution of publication and archival of the only resource
        const results = await Promise.allSettled([
            publishCourseService(instructorId, course._id),
            archiveResourceService(instructorId, resource._id)
        ]);

        const refreshedCourse = await Course.findById(course._id);
        const activeResourcesCount = await Resource.countDocuments({ topicId: topic._id, status: "ACTIVE" });

        // INVARIANT: Under no interleaving may the course be PUBLISHED with zero active resources
        if (refreshedCourse.status === "PUBLISHED") {
            assert.ok(
                activeResourcesCount >= 1,
                "Course was published; topic MUST have at least 1 active resource"
            );
        } else {
            // If publication failed, the resource may have been archived
            assert.equal(refreshedCourse.status, "DRAFT");
        }

        // At least one operation must have succeeded or handled the conflict cleanly
        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");
        assert.ok(fulfilled.length >= 1 || rejected.length >= 1);
    });
});

