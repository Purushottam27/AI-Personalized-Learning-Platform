import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { Resource } from "../src/modules/resource/models/resource.model.js";
import { Lesson } from "../src/modules/lesson/models/lesson.model.js";
import { Practice } from "../src/modules/practice/models/practice.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { User } from "../src/modules/identity/models/user.model.js";

import {
    publishCourseService,
    createCourseService,
    updateCourseService
} from "../src/modules/course/services/course.service.js";
import {
    checkCourseReadiness,
    validatePrerequisiteCourses
} from "../src/modules/course/services/courseReadiness.service.js";
import {
    isTopicUnlockedForLearner,
    assertTopicUnlockedForLearner,
    assertAllTopicsCompletedForCourse
} from "../src/modules/topic/services/topicProgression.service.js";
import {
    archiveAssessmentService
} from "../src/modules/assessment/services/assessment.service.js";
import {
    startAssessmentAttemptService
} from "../src/modules/assessmentAttempt/services/assessmentAttempt.service.js";
import {
    getLessonByIdService,
    getLessonsByTopicService
} from "../src/modules/lesson/services/lesson.service.js";
import {
    getResourceByIdService,
    getResourcesByTopicService
} from "../src/modules/resource/services/resource.service.js";
import {
    createEnrollmentService
} from "../src/modules/enrollment/services/enrollment.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { MONGODB_URI, TEST_DB_NAME, DB_NAME } = process.env;

test("Course Publication Readiness & Learner Assessment Progression Integration Suite", async (t) => {
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
            await Enrollment.deleteMany({ learnerId: { $in: createdUserIds } });
            await Resource.deleteMany({ courseId: { $in: createdCourseIds } });
            await Lesson.deleteMany({});
            await Practice.deleteMany({ courseId: { $in: createdCourseIds } });
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

    function dummySnapshots(qList = []) {
        return (qList.length >= 5 ? qList.slice(0, 5) : [1, 2, 3, 4, 5]).map((item, idx) => ({
            questionId: item._id || new mongoose.Types.ObjectId(),
            questionText: `Snapshot question ${idx + 1}`,
            type: "MCQ_SINGLE",
            options: [{ key: "A", text: "Opt A" }, { key: "B", text: "Opt B" }],
            correctAnswer: "A",
            marks: 1
        }));
    }

    // Helper to create active questions & question bank
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

    // Helper to set up a publishable course baseline
    async function createValidCourseStructure(overrides = {}) {
        const course = await Course.create({
            title: "Advanced Data Structures & Algorithms",
            description: "A comprehensive course covering trees, graphs, dynamic programming, and complexity.",
            domain: "COMPUTER_SCIENCE",
            category: "SOFTWARE_ENGINEERING",
            difficulty: "INTERMEDIATE",
            objectives: ["Master binary trees", "Implement graph search algorithms"],
            createdBy: instructorId,
            status: "DRAFT",
            progressionPolicy: { lockingEnabled: true },
            ...overrides
        });
        createdCourseIds.push(course._id);

        const topic = await Topic.create({
            courseId: course._id,
            title: "Binary Trees & BSTs",
            description: "Foundational binary tree representations and traversal techniques.",
            learningObjectives: ["Traverse binary search trees in-order, pre-order, and post-order"],
            order: 1
        });

        const resource = await Resource.create({
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            title: "BST Visualizer & Guide",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/bst-guide",
            status: "ACTIVE",
            order: 1
        });

        const { questions: topicQuestions } = await createBankAndQuestions(course._id, topic._id, 5);

        const topicAssessment = await Assessment.create({
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "BST Mastery Assessment",
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
            title: "Comprehensive Course Final Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 75,
            maxAttempts: 2,
            questionIds: topicQuestions.map((q) => q._id)
        });

        return { course, topic, resource, topicAssessment, finalAssessment, topicQuestions };
    }

    // =========================================================================
    // SECTION A: COURSE PUBLICATION READINESS RULES (Tests 1 - 12)
    // =========================================================================

    await t.test("1. A fully valid course publishes successfully", async () => {
        const { course, topic, topicAssessment, finalAssessment } = await createValidCourseStructure();

        const published = await publishCourseService(instructorId, course._id);
        assert.equal(published.status, "PUBLISHED");
        assert.ok(published.publicationRequirements?.publishedAt);
        assert.equal(published.publicationRequirements.finalAssessmentId.toString(), finalAssessment._id.toString());
        assert.equal(published.publicationRequirements.topics.length, 1);
        assert.equal(published.publicationRequirements.topics[0].topicId.toString(), topic._id.toString());
        assert.deepEqual(
            published.publicationRequirements.topics[0].requiredAssessmentIds.map(String),
            [topicAssessment._id.toString()]
        );

        // Verify topic has requiredAssessmentIds populated
        const updatedTopic = await Topic.findById(topic._id);
        assert.deepEqual(
            updatedTopic.requiredAssessmentIds.map(String),
            [topicAssessment._id.toString()]
        );
    });

    await t.test("2. A course with no Topics is rejected", async () => {
        const course = await Course.create({
            title: "Empty Course With No Topics",
            description: "A course description that satisfies the minimum length requirement.",
            domain: "DATA_SCIENCE",
            category: "AI",
            difficulty: "BEGINNER",
            objectives: ["Learn foundations"],
            createdBy: instructorId,
            status: "DRAFT"
        });
        createdCourseIds.push(course._id);

        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "COURSE_NOT_READY" && err.statusCode === 400
        );
    });

    await t.test("3. A Topic without an ACTIVE Resource is rejected", async () => {
        const { course, resource } = await createValidCourseStructure();
        // Remove resource completely
        await Resource.deleteOne({ _id: resource._id });

        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "TOPIC_NOT_READY" && err.statusCode === 400
        );
    });

    await t.test("4. A Topic with only archived Resources is rejected", async () => {
        const { course, resource } = await createValidCourseStructure();
        // Archive the only resource
        resource.status = "ARCHIVED";
        await resource.save();

        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "TOPIC_NOT_READY" && err.statusCode === 400
        );
    });

    await t.test("5. A Topic without its required published assessment is rejected", async () => {
        const { course, topicAssessment } = await createValidCourseStructure();
        // Set topic assessment back to DRAFT
        topicAssessment.status = "DRAFT";
        await topicAssessment.save();

        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "TOPIC_NOT_READY" && err.statusCode === 400
        );
    });

    await t.test("6. A Topic assessment with insufficient eligible active questions is rejected", async () => {
        const { course, topicAssessment, topicQuestions } = await createValidCourseStructure();
        // Archive 2 of the 5 questions, making only 3 active (less than questionsPerAttempt 5)
        await Question.updateMany(
            { _id: { $in: topicQuestions.slice(0, 2).map((q) => q._id) } },
            { $set: { status: "ARCHIVED" } }
        );

        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "TOPIC_NOT_READY" && err.statusCode === 400
        );
    });

    await t.test("7. A course without a valid published FINAL Assessment is rejected", async () => {
        const { course, finalAssessment } = await createValidCourseStructure();
        // Delete the final assessment
        await Assessment.deleteOne({ _id: finalAssessment._id });

        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "COURSE_NOT_READY" && err.statusCode === 400
        );
    });

    await t.test("8. An enabled diagnostic policy without a valid matching published diagnostic assessment is rejected", async () => {
        const { course } = await createValidCourseStructure({
            diagnosticPolicy: {
                enabled: true,
                passingScore: 65,
                questionsPerAttempt: 5,
                randomizeQuestions: true
            }
        });

        // No diagnostic assessment created yet -> rejected
        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "COURSE_NOT_READY" && err.statusCode === 400
        );
    });

    await t.test("9. A disabled diagnostic policy does not introduce an unnecessary diagnostic publication requirement", async () => {
        const { course } = await createValidCourseStructure({
            diagnosticPolicy: { enabled: false }
        });

        // Publishes cleanly without diagnostic assessment
        const published = await publishCourseService(instructorId, course._id);
        assert.equal(published.status, "PUBLISHED");
        assert.equal(published.publicationRequirements.diagnosticAssessmentId, null);
    });

    await t.test("9b. Multiple published diagnostic assessments are allowed if a matching one exists (cardinality restriction removed)", async () => {
        const { course, topicQuestions } = await createValidCourseStructure({
            diagnosticPolicy: {
                enabled: true,
                passingScore: 65,
                questionsPerAttempt: 5,
                randomizeQuestions: true
            }
        });

        // Create first published diagnostic assessment matching the course policy
        const matchingDiag = await Assessment.create({
            courseId: course._id,
            createdBy: instructorId,
            type: "DIAGNOSTIC",
            title: "Matching Diagnostic Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 65,
            randomizeQuestions: true,
            maxAttempts: 1,
            questionIds: topicQuestions.map((q) => q._id)
        });

        // Create second published diagnostic assessment (alternate/legacy settings)
        await Assessment.create({
            courseId: course._id,
            createdBy: instructorId,
            type: "DIAGNOSTIC",
            title: "Alternate Diagnostic Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 80,
            randomizeQuestions: false,
            maxAttempts: 1,
            questionIds: topicQuestions.map((q) => q._id)
        });

        // Publication must succeed (MULTIPLE_DIAGNOSTIC_ASSESSMENTS restriction removed)
        const published = await publishCourseService(instructorId, course._id);
        assert.equal(published.status, "PUBLISHED");
        assert.equal(
            published.publicationRequirements.diagnosticAssessmentId.toString(),
            matchingDiag._id.toString()
        );
    });

    await t.test("10. Courses with zero Lessons and zero Practice activities can publish when all mandatory conditions pass", async () => {
        const { course } = await createValidCourseStructure();
        // Zero lessons, zero practices exist
        const lessonCount = await Lesson.countDocuments({ courseId: course._id });
        const practiceCount = await Practice.countDocuments({ courseId: course._id });
        assert.equal(lessonCount, 0);
        assert.equal(practiceCount, 0);

        const published = await publishCourseService(instructorId, course._id);
        assert.equal(published.status, "PUBLISHED");
    });

    await t.test("11. Invalid metadata, ownership, status, or prerequisite references are rejected according to approved rules", async () => {
        const { course } = await createValidCourseStructure();

        // Unauthorized instructor publish attempt
        await assert.rejects(
            publishCourseService(otherInstructorId, course._id),
            (err) => err.code === "COURSE_ACCESS_DENIED" && err.statusCode === 403
        );

        // Already published course cannot be republished as draft
        await Course.updateOne({ _id: course._id }, { status: "PUBLISHED" });
        await assert.rejects(
            publishCourseService(instructorId, course._id),
            (err) => err.code === "INVALID_COURSE_STATUS" && err.statusCode === 400
        );
    });

    await t.test("12. Concurrent publication and dependent-content lifecycle changes cannot produce an invalid published course", async () => {
        const { course, topicAssessment } = await createValidCourseStructure();

        // Simulate concurrent state modification: assessment attemptVersion incremented
        await Assessment.updateOne({ _id: topicAssessment._id }, { $inc: { attemptVersion: 1 } });

        // Readiness check runs against database snapshot, transaction detects conflict
        const published = await publishCourseService(instructorId, course._id);
        assert.equal(published.status, "PUBLISHED");
    });

    // =========================================================================
    // SECTION B: PREREQUISITE SELECTION RULES (Tests 13 - 16)
    // =========================================================================

    await t.test("13. Published courses can be selected as prerequisites", async () => {
        const { course: publishedPrereq } = await createValidCourseStructure();
        await publishCourseService(instructorId, publishedPrereq._id);

        // Validating published course as prerequisite succeeds
        await assert.doesNotReject(validatePrerequisiteCourses([publishedPrereq._id]));
    });

    await t.test("14. Draft and archived courses cannot be selected as prerequisites", async () => {
        const { course: draftPrereq } = await createValidCourseStructure();
        assert.equal(draftPrereq.status, "DRAFT");

        // Draft course rejected
        await assert.rejects(
            validatePrerequisiteCourses([draftPrereq._id]),
            (err) => err.code === "PREREQUISITE_NOT_PUBLISHED" && err.statusCode === 400
        );

        // Archived course rejected
        await Course.updateOne({ _id: draftPrereq._id }, { status: "ARCHIVED" });
        await assert.rejects(
            validatePrerequisiteCourses([draftPrereq._id]),
            (err) => err.code === "PREREQUISITE_NOT_PUBLISHED" && err.statusCode === 400
        );
    });

    await t.test("15. Existing self-reference and duplicate-reference protections remain effective", async () => {
        const { course } = await createValidCourseStructure();

        // Duplicate prerequisite references rejected
        await assert.rejects(
            validatePrerequisiteCourses([course._id, course._id]),
            (err) => err.code === "DUPLICATE_PREREQUISITE" && err.statusCode === 400
        );

        // Self-prerequisite rejected
        await assert.rejects(
            validatePrerequisiteCourses([course._id], course._id),
            (err) => err.code === "SELF_PREREQUISITE" && err.statusCode === 400
        );
    });

    await t.test("16. Existing learner prerequisite-completion enforcement remains intact", async () => {
        const { course: prereqCourse } = await createValidCourseStructure();
        await publishCourseService(instructorId, prereqCourse._id);

        const { course: targetCourse } = await createValidCourseStructure({
            prerequisites: { courses: [prereqCourse._id] }
        });
        await publishCourseService(instructorId, targetCourse._id);

        // Attempting to enroll without completing prereqCourse is rejected
        await assert.rejects(
            createEnrollmentService(learnerId, targetCourse._id),
            (err) => err.code === "PREREQUISITE_NOT_SATISFIED" && err.statusCode === 409
        );

        // Complete the prerequisite course enrollment
        await Enrollment.create({
            learnerId,
            courseId: prereqCourse._id,
            status: "COMPLETED"
        });

        // Now enrollment in targetCourse succeeds
        const enrollment = await createEnrollmentService(learnerId, targetCourse._id);
        assert.equal(enrollment.status, "ACTIVE");
    });

    await t.test("16b. An already-referenced prerequisite course that is archived later remains valid and does not block updates or publication", async () => {
        const { course: prereqCourse } = await createValidCourseStructure();
        await publishCourseService(instructorId, prereqCourse._id);

        // Course A selects published Course B as prerequisite
        const { course: courseA } = await createValidCourseStructure({
            prerequisites: { courses: [prereqCourse._id] }
        });

        // Prerequisite Course B is later ARCHIVED
        await Course.updateOne({ _id: prereqCourse._id }, { $set: { status: "ARCHIVED" } });

        // 1. Unrelated metadata edits on Course A succeed
        await assert.doesNotReject(
            updateCourseService(instructorId, courseA._id, { title: "Updated Course A Title With 4+ Chars" })
        );

        // 2. Updating prerequisites on Course A keeping existing archived Course B succeeds
        await assert.doesNotReject(
            updateCourseService(instructorId, courseA._id, {
                prerequisites: { courses: [prereqCourse._id] }
            })
        );

        // 3. Publishing Course A succeeds without PREREQUISITE_NOT_PUBLISHED
        const publishedA = await publishCourseService(instructorId, courseA._id);
        assert.equal(publishedA.status, "PUBLISHED");

        // 4. Newly selecting an archived course on another course is still rejected
        const { course: otherCourse } = await createValidCourseStructure();
        await assert.rejects(
            updateCourseService(instructorId, otherCourse._id, {
                prerequisites: { courses: [prereqCourse._id] }
            }),
            (err) => err.code === "PREREQUISITE_NOT_PUBLISHED" && err.statusCode === 400
        );

        // 5. Learner who completed prereqCourse before archival can still satisfy prerequisites and enroll
        await Enrollment.create({
            learnerId,
            courseId: prereqCourse._id,
            status: "COMPLETED"
        });
        const enrollment = await createEnrollmentService(learnerId, publishedA._id);
        assert.equal(enrollment.status, "ACTIVE");
    });

    // =========================================================================
    // SECTION C: MULTIPLE ASSESSMENTS & PROGRESSION RULES (Tests 17 - 25)
    // =========================================================================

    await t.test("17. Multiple required Topic Assessments can be associated with a Topic and snapshotted at publication", async () => {
        const { course, topic, topicQuestions } = await createValidCourseStructure();

        // Add a second published topic assessment to Topic 1
        const secondTopicAssessment = await Assessment.create({
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "BST Secondary Lab Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            maxAttempts: 3,
            questionIds: topicQuestions.map((q) => q._id)
        });

        const published = await publishCourseService(instructorId, course._id);
        assert.equal(published.status, "PUBLISHED");

        const updatedTopic = await Topic.findById(topic._id);
        assert.equal(updatedTopic.requiredAssessmentIds.length, 2);
    });

    await t.test("18. Passing only one of several required assessments does not unlock the next Topic", async () => {
        const { course, topic: topic1, topicAssessment: a1, topicQuestions } = await createValidCourseStructure();

        // Add a second required assessment on Topic 1
        const a2 = await Assessment.create({
            courseId: course._id,
            topicId: topic1._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "BST Part 2 Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            maxAttempts: 3,
            questionIds: topicQuestions.map((q) => q._id)
        });

        // Create Topic 2
        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Graph Algorithms",
            description: "Graph traversals and shortest paths.",
            learningObjectives: ["Understand BFS and DFS"],
            order: 2
        });

        await Resource.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            title: "Graph Traversal Notes",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/graphs",
            status: "ACTIVE",
            order: 1
        });

        const { questions: q2 } = await createBankAndQuestions(course._id, topic2._id, 5);

        await Assessment.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "Graph Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            maxAttempts: 3,
            questionIds: q2.map((q) => q._id)
        });

        await publishCourseService(instructorId, course._id);

        // Record a passing attempt for ONLY a1
        await AssessmentAttempt.create({
            assessmentId: a1._id,
            learnerId,
            courseId: course._id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passed: true,
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            passingScore: 70,
            questions: dummySnapshots()
        });

        // Topic 2 remains LOCKED because a2 has not been passed
        const status = await isTopicUnlockedForLearner(learnerId, course, topic2);
        assert.equal(status.isUnlocked, false);
        assert.equal(status.lockedByTopicId.toString(), topic1._id.toString());
    });

    await t.test("19. Passing every required assessment unlocks the next Topic", async () => {
        const { course, topic: topic1, topicAssessment: a1, topicQuestions } = await createValidCourseStructure();

        const a2 = await Assessment.create({
            courseId: course._id,
            topicId: topic1._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "BST Part 2 Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            maxAttempts: 3,
            questionIds: topicQuestions.map((q) => q._id)
        });

        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Graph Algorithms",
            description: "Graph traversals and shortest paths.",
            learningObjectives: ["Understand BFS and DFS"],
            order: 2
        });

        await Resource.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            title: "Graph Traversal Notes",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/graphs",
            status: "ACTIVE",
            order: 1
        });

        const { questions: q2 } = await createBankAndQuestions(course._id, topic2._id, 5);

        await Assessment.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "Graph Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            maxAttempts: 3,
            questionIds: q2.map((q) => q._id)
        });

        await publishCourseService(instructorId, course._id);

        // Pass BOTH a1 and a2
        await AssessmentAttempt.create([
            {
                assessmentId: a1._id,
                learnerId,
                courseId: course._id,
                assessmentType: "TOPIC",
                attemptNumber: 1,
                status: "SUBMITTED",
                passed: true,
                totalMarks: 5,
                marksAwarded: 5,
                scorePercent: 100,
                passingScore: 70,
                questions: dummySnapshots()
            },
            {
                assessmentId: a2._id,
                learnerId,
                courseId: course._id,
                assessmentType: "TOPIC",
                attemptNumber: 1,
                status: "SUBMITTED",
                passed: true,
                totalMarks: 5,
                marksAwarded: 4,
                scorePercent: 80,
                passingScore: 60,
                questions: dummySnapshots()
            }
        ]);

        // Topic 2 is now UNLOCKED
        const status = await isTopicUnlockedForLearner(learnerId, course, topic2);
        assert.equal(status.isUnlocked, true);
    });

    await t.test("20. An assessment that was a draft at course publication does not automatically become mandatory when published later", async () => {
        const { course, topic: topic1, topicAssessment: a1, topicQuestions } = await createValidCourseStructure();

        // Draft assessment on Topic 1 at course publication time
        const draftAssessment = await Assessment.create({
            courseId: course._id,
            topicId: topic1._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "Optional Draft Quiz",
            status: "DRAFT",
            questionsPerAttempt: 5,
            passingScore: 50,
            maxAttempts: 3,
            questionIds: topicQuestions.map((q) => q._id)
        });

        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Dynamic Programming",
            description: "Memoization and tabulation.",
            learningObjectives: ["Solve knapsack"],
            order: 2
        });

        await Resource.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            title: "DP Cheatsheet",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/dp",
            status: "ACTIVE",
            order: 1
        });

        const { questions: q2 } = await createBankAndQuestions(course._id, topic2._id, 5);

        await Assessment.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "DP Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            maxAttempts: 3,
            questionIds: q2.map((q) => q._id)
        });

        // Publish course: only a1 is snapshotted into requiredAssessmentIds
        await publishCourseService(instructorId, course._id);

        // Later, instructor publishes draftAssessment
        draftAssessment.status = "PUBLISHED";
        await draftAssessment.save();

        // Learner passes ONLY a1
        await AssessmentAttempt.create({
            assessmentId: a1._id,
            learnerId,
            courseId: course._id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passed: true,
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            passingScore: 70,
            questions: dummySnapshots()
        });

        // Topic 2 is UNLOCKED because draftAssessment was not part of publication-time requirements
        const status = await isTopicUnlockedForLearner(learnerId, course, topic2);
        assert.equal(status.isUnlocked, true);
    });

    await t.test("21. Assessments created and published after course publication do not block existing progression requirements", async () => {
        const { course, topic: topic1, topicAssessment: a1 } = await createValidCourseStructure();

        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Topic 2",
            learningObjectives: ["Learn T2"],
            order: 2
        });
        await Resource.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            title: "Resource 2",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/r2",
            status: "ACTIVE",
            order: 1
        });
        const { questions: q2 } = await createBankAndQuestions(course._id, topic2._id, 5);
        await Assessment.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "T2 Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            questionIds: q2.map((q) => q._id)
        });

        await publishCourseService(instructorId, course._id);

        // Instructor creates and publishes a new assessment on Topic 1 post-publication
        const existingBank = await QuestionBank.findOne({ topicId: topic1._id });
        const qNew = [];
        for (let i = 0; i < 5; i++) {
            const q = await Question.create({
                questionBankId: existingBank._id,
                courseId: course._id,
                topicId: topic1._id,
                createdBy: instructorId,
                type: "MCQ_SINGLE",
                questionText: `Bonus question ${i + 1}`,
                normalizedQuestionText: `bonus question ${i + 1}`,
                options: [{ key: "A", text: "A" }, { key: "B", text: "B" }],
                correctAnswer: "A",
                marks: 1,
                difficulty: "MEDIUM",
                status: "ACTIVE"
            });
            qNew.push(q);
        }
        await Assessment.create({
            courseId: course._id,
            topicId: topic1._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "Post-Publication Bonus Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            questionIds: qNew.map((q) => q._id)
        });

        // Learner passes ONLY the original required assessment a1
        await AssessmentAttempt.create({
            assessmentId: a1._id,
            learnerId,
            courseId: course._id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passed: true,
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            passingScore: 70,
            questions: dummySnapshots()
        });

        // Topic 2 is UNLOCKED
        const status = await isTopicUnlockedForLearner(learnerId, course, topic2);
        assert.equal(status.isUnlocked, true);
    });

    await t.test("22. Existing passing attempts remain valid under result and lifecycle rules", async () => {
        const { course, topic: topic1, topicAssessment: a1 } = await createValidCourseStructure();
        await publishCourseService(instructorId, course._id);

        // Record a passing attempt
        const attempt = await AssessmentAttempt.create({
            assessmentId: a1._id,
            learnerId,
            courseId: course._id,
            assessmentType: "TOPIC",
            attemptNumber: 1,
            status: "SUBMITTED",
            passed: true,
            totalMarks: 5,
            marksAwarded: 5,
            scorePercent: 100,
            passingScore: 70,
            questions: dummySnapshots()
        });

        // Verifying passing attempt remains intact
        const fetched = await AssessmentAttempt.findById(attempt._id);
        assert.equal(fetched.passed, true);
        assert.equal(fetched.status, "SUBMITTED");
    });

    await t.test("23. Archiving a required assessment in a PUBLISHED course is blocked so learners are not stranded", async () => {
        const { course, topicAssessment: a1 } = await createValidCourseStructure();
        await publishCourseService(instructorId, course._id);

        // Attempt to archive a required assessment in a published course -> rejected with 409
        await assert.rejects(
            archiveAssessmentService(instructorId, a1._id),
            (err) => err.code === "CANNOT_ARCHIVE_REQUIRED_ASSESSMENT" && err.statusCode === 409
        );
    });

    await t.test("24. Direct API access cannot bypass Topic locking", async () => {
        const { course, topic: topic1, topicAssessment: a1, topicQuestions } = await createValidCourseStructure();

        const topic2 = await Topic.create({
            courseId: course._id,
            title: "Topic 2",
            learningObjectives: ["Learn T2"],
            order: 2
        });
        const res2 = await Resource.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            title: "Resource 2",
            type: "LINK",
            source: "EXTERNAL_URL",
            url: "https://example.com/r2",
            status: "ACTIVE",
            order: 1
        });
        const les2 = await Lesson.create({
            topicId: topic2._id,
            title: "Lesson 2.1",
            content: "Content 2.1",
            order: 1
        });
        const { questions: q2 } = await createBankAndQuestions(course._id, topic2._id, 5);
        const aTopic2 = await Assessment.create({
            courseId: course._id,
            topicId: topic2._id,
            createdBy: instructorId,
            type: "TOPIC",
            title: "Topic 2 Assessment",
            status: "PUBLISHED",
            questionsPerAttempt: 5,
            passingScore: 60,
            questionIds: q2.map((q) => q._id)
        });

        await publishCourseService(instructorId, course._id);

        // Enroll learner
        await Enrollment.create({
            learnerId,
            courseId: course._id,
            status: "ACTIVE"
        });

        // Learner has NOT passed Topic 1 assessment yet.
        // Direct access to Topic 2 lessons -> 403 TOPIC_LOCKED
        await assert.rejects(
            getLessonsByTopicService(learnerId, topic2._id, "LEARNER"),
            (err) => err.code === "TOPIC_LOCKED" && err.statusCode === 403
        );
        await assert.rejects(
            getLessonByIdService(learnerId, les2._id, "LEARNER"),
            (err) => err.code === "TOPIC_LOCKED" && err.statusCode === 403
        );

        // Direct access to Topic 2 resources -> 403 TOPIC_LOCKED
        await assert.rejects(
            getResourcesByTopicService(learnerId, topic2._id, "LEARNER"),
            (err) => err.code === "TOPIC_LOCKED" && err.statusCode === 403
        );
        await assert.rejects(
            getResourceByIdService(learnerId, res2._id, "LEARNER"),
            (err) => err.code === "TOPIC_LOCKED" && err.statusCode === 403
        );

        // Direct attempt start on Topic 2 assessment -> 403 TOPIC_LOCKED
        await assert.rejects(
            startAssessmentAttemptService(learnerId, aTopic2._id),
            (err) => err.code === "TOPIC_LOCKED" && err.statusCode === 403
        );
    });

    await t.test("25. Final Course Assessment eligibility requires all topics in the course to be completed", async () => {
        const { course, topic: topic1, finalAssessment } = await createValidCourseStructure();
        await publishCourseService(instructorId, course._id);

        await Enrollment.create({
            learnerId,
            courseId: course._id,
            status: "ACTIVE"
        });

        // Learner has NOT passed Topic 1 assessment -> final assessment attempt start rejected with 403 TOPICS_NOT_COMPLETED
        await assert.rejects(
            startAssessmentAttemptService(learnerId, finalAssessment._id),
            (err) => err.code === "TOPICS_NOT_COMPLETED" && err.statusCode === 403
        );
    });
});
