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
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { User } from "../src/modules/identity/models/user.model.js";

import { publishCourseService } from "../src/modules/course/services/course.service.js";
import { archiveResourceService } from "../src/modules/resource/services/resource.service.js";
import {
    isTopicUnlockedForLearner,
    assertTopicUnlockedForLearner,
    assertAllTopicsCompletedForCourse
} from "../src/modules/topic/services/topicProgression.service.js";

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
    const learnerId = new mongoose.Types.ObjectId();

    const createdCourseIds = [];
    const createdUserIds = [instructorId, otherInstructorId, learnerId];

    t.after(async () => {
        try {
            await AssessmentAttempt.deleteMany({ learnerId: { $in: createdUserIds } });
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

    function createDummyAttemptSnapshots(questions = []) {
        return (questions.length >= 5 ? questions.slice(0, 5) : [1, 2, 3, 4, 5]).map((q, idx) => ({
            questionId: q._id || new mongoose.Types.ObjectId(),
            questionText: `Snapshot question ${idx + 1}`,
            type: "MCQ_SINGLE",
            options: [{ key: "A", text: "Opt A" }, { key: "B", text: "Opt B" }],
            correctAnswer: "A",
            marks: 1
        }));
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

        let archiveTriggered = false;
        let archivePromise = null;

        // Deterministically hook Resource.updateMany inside publishCourseService to trigger
        // the concurrent archiveResourceService at the precise transactional write-fence window.
        const originalUpdateMany = Resource.updateMany;
        Resource.updateMany = async function (...args) {
            if (!archiveTriggered) {
                archiveTriggered = true;
                archivePromise = archiveResourceService(instructorId, resource._id);
            }
            return originalUpdateMany.apply(this, args);
        };

        let publishPromise = null;
        try {
            publishPromise = publishCourseService(instructorId, course._id);
            await Promise.allSettled([publishPromise, archivePromise]);
        } finally {
            Resource.updateMany = originalUpdateMany;
        }

        const [publishResult, archiveResult] = await Promise.allSettled([publishPromise, archivePromise]);

        const refreshedCourse = await Course.findById(course._id);
        const activeResourcesCount = await Resource.countDocuments({ topicId: topic._id, status: "ACTIVE" });
        const reloadedResource = await Resource.findById(resource._id);

        // INVARIANT 1: Both operations CANNOT both succeed when only 1 active resource existed
        assert.equal(
            publishResult.status === "fulfilled" && archiveResult.status === "fulfilled",
            false,
            "Publication and archival of the sole active resource cannot both succeed concurrently"
        );

        // INVARIANT 2: A published course must NEVER end with zero active resources in its topic
        if (refreshedCourse.status === "PUBLISHED") {
            assert.ok(
                activeResourcesCount >= 1,
                "Course was published; topic MUST retain at least 1 active resource"
            );
            assert.equal(reloadedResource.status, "ACTIVE");
            assert.equal(archiveResult.status, "rejected");
        } else {
            // Publication was aborted/rejected; course remains DRAFT
            assert.equal(refreshedCourse.status, "DRAFT");
            assert.equal(publishResult.status, "rejected");
        }
    });

    await t.test("5. Existing published course with missing assessment snapshots does not silently unlock next topic for unassessed learner", async () => {
        const { course, topic: topic1, topicAssessment: a1 } = await createValidCourseStructure();

        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Kernel Synchronization Primitives",
            learningObjectives: ["Implement spinlocks and mutexes"],
            order: 2
        });

        // Simulate legacy published course: status is PUBLISHED, but publicationRequirements is null and Topic.requiredAssessmentIds is empty
        await Course.updateOne({ _id: course._id }, { $set: { status: "PUBLISHED", publicationRequirements: null } });
        await Topic.updateOne({ _id: topic1._id }, { $set: { requiredAssessmentIds: [] } });

        // Learner has NOT passed Topic 1 assessment: must NOT be silently unlocked
        const check = await isTopicUnlockedForLearner(learnerId, course._id, topic2._id);
        assert.equal(check.isUnlocked, false);
        assert.equal(check.reason, "PRIOR_TOPIC_INCOMPLETE");

        await assert.rejects(
            assertTopicUnlockedForLearner(learnerId, course._id, topic2._id),
            (err) => err.code === "TOPIC_LOCKED" && err.statusCode === 403
        );
    });

    await t.test("6. Existing published course with missing snapshots unlocks next topic once learner passes a published assessment", async () => {
        const { course, topic: topic1, topicAssessment: a1, topicQuestions } = await createValidCourseStructure();

        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Virtual Filesystems & Inodes",
            learningObjectives: ["Understand VFS abstraction"],
            order: 2
        });

        // Simulate legacy published course without snapshots
        await Course.updateOne({ _id: course._id }, { $set: { status: "PUBLISHED", publicationRequirements: null } });
        await Topic.updateOne({ _id: topic1._id }, { $set: { requiredAssessmentIds: [] } });

        // Record a passed attempt for the learner on Topic 1's published assessment
        await AssessmentAttempt.create({
            assessmentId: a1._id,
            learnerId,
            courseId: course._id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passed: true,
            passingScore: 70,
            scorePercent: 85,
            totalMarks: 5,
            marksAwarded: 4.25,
            questions: createDummyAttemptSnapshots(topicQuestions)
        });

        // Now Topic 2 is unlocked
        const check = await isTopicUnlockedForLearner(learnerId, course._id, topic2._id);
        assert.equal(check.isUnlocked, true);
        await assert.doesNotReject(assertTopicUnlockedForLearner(learnerId, course._id, topic2._id));
    });

    await t.test("7. Existing published course with missing snapshots blocks final assessment until all topics have passed assessments", async () => {
        const { course, topic: topic1, topicAssessment: a1, topicQuestions } = await createValidCourseStructure();

        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Device Drivers & I/O",
            learningObjectives: ["Write a character device driver"],
            order: 2
        });
        const { questions: q2 } = await createBankAndQuestions(course._id, topic2._id, 5);
        const a2 = await Assessment.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "Topic 2 Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 70,
            questionIds: q2.map((q) => q._id)
        });

        // Simulate legacy published course without snapshots
        await Course.updateOne({ _id: course._id }, { $set: { status: "PUBLISHED", publicationRequirements: null } });
        await Topic.updateMany({ courseId: course._id }, { $set: { requiredAssessmentIds: [] } });

        // Learner has only passed Topic 1, but NOT Topic 2 -> Final assessment attempt gated
        await AssessmentAttempt.create({
            assessmentId: a1._id,
            learnerId,
            courseId: course._id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passed: true,
            passingScore: 70,
            scorePercent: 80,
            totalMarks: 5,
            marksAwarded: 4,
            questions: createDummyAttemptSnapshots(topicQuestions)
        });

        await assert.rejects(
            assertAllTopicsCompletedForCourse(learnerId, course._id),
            (err) => err.code === "TOPICS_NOT_COMPLETED" && err.statusCode === 403
        );

        // Learner passes Topic 2 assessment
        await AssessmentAttempt.create({
            assessmentId: a2._id,
            learnerId,
            courseId: course._id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passed: true,
            passingScore: 70,
            scorePercent: 90,
            totalMarks: 5,
            marksAwarded: 4.5,
            questions: createDummyAttemptSnapshots(q2)
        });

        // Now final assessment eligibility is satisfied
        await assert.doesNotReject(assertAllTopicsCompletedForCourse(learnerId, course._id));
    });

    await t.test("8. A course with more than one published FINAL assessment is rejected at publication", async () => {
        const { course, topicQuestions } = await createValidCourseStructure();

        // Create a SECOND published FINAL assessment for this course
        await Assessment.create({
            courseId: course._id,
            createdBy: instructorId,
            type: "FINAL",
            title: "Duplicate Course Final Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 75,
            maxAttempts: 2,
            questionIds: topicQuestions.map((q) => q._id)
        });

        // Publication must be rejected with 400 COURSE_NOT_READY / MULTIPLE_FINAL_ASSESSMENTS
        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "COURSE_NOT_READY" && err.statusCode === 400 && err.details?.requirement === "MULTIPLE_FINAL_ASSESSMENTS"
        );
    });
});
