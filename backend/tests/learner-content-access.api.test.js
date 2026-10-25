import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import app from "../src/app.js";
import { User } from "../src/modules/identity/models/user.model.js";
import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { Lesson } from "../src/modules/lesson/models/lesson.model.js";
import { Resource } from "../src/modules/resource/models/resource.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import cloudinary from "../src/config/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "test_cloud",
    api_key: process.env.CLOUDINARY_API_KEY || "test_api_key",
    api_secret: process.env.CLOUDINARY_API_SECRET || "test_api_secret",
});

test("Learner Course Content Access Audit & Implementation Integration Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructor1Id = new mongoose.Types.ObjectId();
    const instructor2Id = new mongoose.Types.ObjectId();
    const enrolledLearnerId = new mongoose.Types.ObjectId();
    const nonEnrolledLearnerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const publishedCourseId = new mongoose.Types.ObjectId();
    const draftCourseId = new mongoose.Types.ObjectId();
    const archivedCourseId = new mongoose.Types.ObjectId();
    const instructor2CourseId = new mongoose.Types.ObjectId();

    const createdUserIds = [instructor1Id, instructor2Id, enrolledLearnerId, nonEnrolledLearnerId, adminId];
    const createdCourseIds = [publishedCourseId, draftCourseId, archivedCourseId, instructor2CourseId];

    let connected = false;
    let server;
    let baseUrl;

    let publishedTopicId;
    let publishedLessonId;
    let publishedResourceId;
    let diagnosticAssessmentId;
    let topicAssessmentId;

    let draftTopicId;
    let draftLessonId;
    let draftResourceId;
    let draftAssessmentId;

    let archivedTopicId;
    let archivedLessonId;

    let instructor2TopicId;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await AssessmentAttempt.deleteMany({ learnerId: { $in: createdUserIds } });
            await Enrollment.deleteMany({ learnerId: { $in: createdUserIds } });
            await Assessment.deleteMany({ courseId: { $in: createdCourseIds } });
            await Resource.deleteMany({ topicId: { $in: [publishedTopicId, draftTopicId, archivedTopicId, instructor2TopicId].filter(Boolean) } });
            await Lesson.deleteMany({ topicId: { $in: [publishedTopicId, draftTopicId, archivedTopicId, instructor2TopicId].filter(Boolean) } });
            await Question.deleteMany({ createdBy: { $in: [instructor1Id, instructor2Id] } });
            await QuestionBank.deleteMany({ createdBy: { $in: [instructor1Id, instructor2Id] } });
            await Topic.deleteMany({ courseId: { $in: createdCourseIds } });
            await Course.deleteMany({ _id: { $in: createdCourseIds } });
            await User.deleteMany({ _id: { $in: createdUserIds } });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME);

    await Promise.all([
        User.init(),
        Course.init(),
        Topic.init(),
        Lesson.init(),
        Resource.init(),
        Enrollment.init(),
        QuestionBank.init(),
        Question.init(),
        Assessment.init(),
        AssessmentAttempt.init(),
    ]);

    // Create Users
    await User.create([
        {
            _id: instructor1Id,
            name: "Primary Instructor",
            email: `inst1-${instructor1Id}@example.test`,
            role: "INSTRUCTOR",
            status: "ACTIVE",
        },
        {
            _id: instructor2Id,
            name: "Second Instructor",
            email: `inst2-${instructor2Id}@example.test`,
            role: "INSTRUCTOR",
            status: "ACTIVE",
        },
        {
            _id: enrolledLearnerId,
            name: "Enrolled Learner",
            email: `enrolled-${enrolledLearnerId}@example.test`,
            role: "LEARNER",
            status: "ACTIVE",
        },
        {
            _id: nonEnrolledLearnerId,
            name: "Non-Enrolled Learner",
            email: `nonenrolled-${nonEnrolledLearnerId}@example.test`,
            role: "LEARNER",
            status: "ACTIVE",
        },
        {
            _id: adminId,
            name: "Platform Admin",
            email: `admin-${adminId}@example.test`,
            role: "ADMIN",
            status: "ACTIVE",
        },
    ]);

    // Create Courses
    await Course.create([
        {
            _id: publishedCourseId,
            title: "Published Architecture Course",
            description: "A complete published course for content access testing.",
            createdBy: instructor1Id,
            domain: "Computer Science",
            category: "Software Architecture",
            difficulty: "INTERMEDIATE",
            status: "PUBLISHED",
            diagnosticPolicy: {
                enabled: true,
                passingScore: 60,
                questionsPerAttempt: 5,
                randomizeQuestions: false,
            },
        },
        {
            _id: draftCourseId,
            title: "Draft Course In Progress",
            description: "A draft course under active development.",
            createdBy: instructor1Id,
            domain: "Computer Science",
            category: "Algorithms",
            difficulty: "BEGINNER",
            status: "DRAFT",
            diagnosticPolicy: {
                enabled: false,
            },
        },
        {
            _id: archivedCourseId,
            title: "Archived Legacy Course",
            description: "A decommissioned archived course.",
            createdBy: instructor1Id,
            domain: "Computer Science",
            category: "Legacy Systems",
            difficulty: "ADVANCED",
            status: "ARCHIVED",
            diagnosticPolicy: {
                enabled: false,
            },
        },
        {
            _id: instructor2CourseId,
            title: "Instructor 2 Course",
            description: "A course owned by the second instructor.",
            createdBy: instructor2Id,
            domain: "Data Science",
            category: "Statistics",
            difficulty: "BEGINNER",
            status: "PUBLISHED",
            diagnosticPolicy: {
                enabled: false,
            },
        },
    ]);

    // Create Topics
    const pubTopic = await Topic.create({
        courseId: publishedCourseId,
        title: "Published Topic 1",
        learningObjectives: ["Understand fundamental design patterns"],
        order: 1,
    });
    publishedTopicId = pubTopic._id;

    const drfTopic = await Topic.create({
        courseId: draftCourseId,
        title: "Draft Topic 1",
        learningObjectives: ["Draft objectives"],
        order: 1,
    });
    draftTopicId = drfTopic._id;

    const arcTopic = await Topic.create({
        courseId: archivedCourseId,
        title: "Archived Topic 1",
        learningObjectives: ["Archived objectives"],
        order: 1,
    });
    archivedTopicId = arcTopic._id;

    const inst2Topic = await Topic.create({
        courseId: instructor2CourseId,
        title: "Instructor 2 Topic 1",
        learningObjectives: ["Statistics basics"],
        order: 1,
    });
    instructor2TopicId = inst2Topic._id;

    // Create Lessons
    const pubLesson = await Lesson.create({
        topicId: publishedTopicId,
        title: "Clean Architecture Principles",
        description: "Core overview of modular software architecture.",
        content: [{ type: "TEXT", value: "Welcome to Clean Architecture." }],
        order: 1,
    });
    publishedLessonId = pubLesson._id;

    const drfLesson = await Lesson.create({
        topicId: draftTopicId,
        title: "Draft Lesson Content",
        description: "WIP lesson description.",
        content: [{ type: "TEXT", value: "Draft content." }],
        order: 1,
    });
    draftLessonId = drfLesson._id;

    const arcLesson = await Lesson.create({
        topicId: archivedTopicId,
        title: "Archived Lesson Content",
        description: "Legacy lesson description.",
        content: [{ type: "TEXT", value: "Legacy content." }],
        order: 1,
    });
    archivedLessonId = arcLesson._id;

    // Create Resources
    const pubResource = await Resource.create({
        topicId: publishedTopicId,
        lessonId: publishedLessonId,
        title: "Clean Architecture Reference Guide",
        description: "Comprehensive PDF reference manual.",
        type: "DOCUMENT",
        source: "UPLOAD",
        storageReference: "course_resources/ref_guide_101",
        storageAccess: "AUTHENTICATED",
        storageResourceType: "raw",
        fileFormat: "PDF",
        fileSize: 102400,
        order: 1,
        status: "ACTIVE",
    });
    publishedResourceId = pubResource._id;

    const drfResource = await Resource.create({
        topicId: draftTopicId,
        lessonId: draftLessonId,
        title: "Draft Resource Notes",
        description: "Rough draft notes.",
        type: "DOCUMENT",
        source: "UPLOAD",
        storageReference: "course_resources/draft_notes",
        storageAccess: "AUTHENTICATED",
        storageResourceType: "raw",
        fileFormat: "PDF",
        order: 1,
        status: "ACTIVE",
    });
    draftResourceId = drfResource._id;

    // Create Question Bank & Pool for published course
    const qb = await QuestionBank.create({
        courseId: publishedCourseId,
        topicId: publishedTopicId,
        createdBy: instructor1Id,
        title: "Architecture Questions",
        status: "ACTIVE",
    });

    const questions = await Question.create(
        Array.from({ length: 5 }, (_, i) => ({
            questionBankId: qb._id,
            courseId: publishedCourseId,
            topicId: publishedTopicId,
            createdBy: instructor1Id,
            type: "MCQ_SINGLE",
            difficulty: "MEDIUM",
            questionText: `Architecture assessment question ${i + 1} with details?`,
            normalizedQuestionText: `architecture assessment question ${i + 1} with details?`,
            options: [
                { key: "A", text: "Option A" },
                { key: "B", text: "Option B" },
            ],
            correctAnswer: "A",
            explanation: `Explanation for question ${i + 1}`,
            marks: 2,
            status: "ACTIVE",
        }))
    );
    const questionIds = questions.map((q) => q._id);

    // Create Diagnostic Assessment (PUBLISHED)
    const diag = await Assessment.create({
        courseId: publishedCourseId,
        createdBy: instructor1Id,
        type: "DIAGNOSTIC",
        title: "Architecture Diagnostic Readiness",
        description: "Evaluate your preparedness before starting.",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 60,
        maxAttempts: 2,
        randomizeQuestions: false,
        status: "PUBLISHED",
    });
    diagnosticAssessmentId = diag._id;

    // Create Topic Assessment (PUBLISHED)
    const topicAss = await Assessment.create({
        courseId: publishedCourseId,
        topicId: publishedTopicId,
        createdBy: instructor1Id,
        type: "TOPIC",
        title: "Topic 1 Mastery Assessment",
        description: "Demonstrate mastery of architecture principles.",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 60,
        maxAttempts: 3,
        randomizeQuestions: false,
        status: "PUBLISHED",
    });
    topicAssessmentId = topicAss._id;

    // Create Draft Assessment
    const drfAss = await Assessment.create({
        courseId: draftCourseId,
        topicId: draftTopicId,
        createdBy: instructor1Id,
        type: "TOPIC",
        title: "Draft Topic Assessment",
        description: "Work in progress assessment.",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 60,
        maxAttempts: 1,
        status: "DRAFT",
    });
    draftAssessmentId = drfAss._id;

    // Enroll enrolledLearner into publishedCourse
    await Enrollment.create({
        learnerId: enrolledLearnerId,
        courseId: publishedCourseId,
        status: "ACTIVE",
        progress: 0,
    });

    // Helper to generate JWT tokens
    const signToken = (id, role) =>
        jwt.sign({ sub: id.toString(), role }, JWT_ACCESS_SECRET, { expiresIn: "1h" });

    const tokens = {
        instructor1: signToken(instructor1Id, "INSTRUCTOR"),
        instructor2: signToken(instructor2Id, "INSTRUCTOR"),
        enrolledLearner: signToken(enrolledLearnerId, "LEARNER"),
        nonEnrolledLearner: signToken(nonEnrolledLearnerId, "LEARNER"),
        admin: signToken(adminId, "ADMIN"),
    };

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const request = (pathUrl, { token, body, method = "GET", auth = true } = {}) => {
        const headers = {};
        if (body) headers["content-type"] = "application/json";
        if (auth && token) headers["authorization"] = `Bearer ${token}`;
        return fetch(`${baseUrl}${pathUrl}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    };

    // -------------------------------------------------------------------------------------------------
    // Scenario 1: An authorized (enrolled) learner can retrieve published course content
    // -------------------------------------------------------------------------------------------------
    await t.test("1. Enrolled learner can retrieve published topics, lessons, resources, and assessments", async () => {
        // Topics list
        const resTopics = await request(`/api/v1/courses/${publishedCourseId}/topics`, { token: tokens.enrolledLearner });
        assert.equal(resTopics.status, 200);
        const dataTopics = await resTopics.json();
        assert.equal(dataTopics.data.length, 1);
        assert.equal(dataTopics.data[0]._id, publishedTopicId.toString());

        // Single Topic
        const resSingleTopic = await request(`/api/v1/topics/${publishedTopicId}`, { token: tokens.enrolledLearner });
        assert.equal(resSingleTopic.status, 200);
        const dataSingleTopic = await resSingleTopic.json();
        assert.equal(dataSingleTopic.data._id, publishedTopicId.toString());

        // Lessons list
        const resLessons = await request(`/api/v1/topics/${publishedTopicId}/lessons`, { token: tokens.enrolledLearner });
        assert.equal(resLessons.status, 200);
        const dataLessons = await resLessons.json();
        assert.equal(dataLessons.data.length, 1);
        assert.equal(dataLessons.data[0]._id, publishedLessonId.toString());

        // Single Lesson
        const resSingleLesson = await request(`/api/v1/lessons/${publishedLessonId}`, { token: tokens.enrolledLearner });
        assert.equal(resSingleLesson.status, 200);
        const dataSingleLesson = await resSingleLesson.json();
        assert.equal(dataSingleLesson.data._id, publishedLessonId.toString());
        assert.equal(dataSingleLesson.data.title, "Clean Architecture Principles");

        // Resources list
        const resResources = await request(`/api/v1/topics/${publishedTopicId}/resources`, { token: tokens.enrolledLearner });
        assert.equal(resResources.status, 200);
        const dataResources = await resResources.json();
        assert.equal(dataResources.data.length, 1);
        assert.equal(dataResources.data[0]._id, publishedResourceId.toString());

        // Single Resource
        const resSingleResource = await request(`/api/v1/resources/${publishedResourceId}`, { token: tokens.enrolledLearner });
        assert.equal(resSingleResource.status, 200);
        const dataSingleResource = await resSingleResource.json();
        assert.equal(dataSingleResource.data._id, publishedResourceId.toString());

        // Assessments for Course
        const resCourseAssessments = await request(`/api/v1/courses/${publishedCourseId}/assessments`, { token: tokens.enrolledLearner });
        assert.equal(resCourseAssessments.status, 200);
        const dataCourseAssessments = await resCourseAssessments.json();
        assert.equal(dataCourseAssessments.data.length, 2);
        // Learner serialization must redact questionIds
        for (const item of dataCourseAssessments.data) {
            assert.equal(item.questionIds, undefined, "questionIds must be redacted for learners");
        }

        // Assessments for Topic
        const resTopicAssessments = await request(`/api/v1/topics/${publishedTopicId}/assessments`, { token: tokens.enrolledLearner });
        assert.equal(resTopicAssessments.status, 200);
        const dataTopicAssessments = await resTopicAssessments.json();
        assert.equal(dataTopicAssessments.data.length, 1);
        assert.equal(dataTopicAssessments.data[0]._id, topicAssessmentId.toString());
        assert.equal(dataTopicAssessments.data[0].questionIds, undefined);

        // Single Topic Assessment
        const resSingleAssessment = await request(`/api/v1/assessments/${topicAssessmentId}`, { token: tokens.enrolledLearner });
        assert.equal(resSingleAssessment.status, 200);
        const dataSingleAssessment = await resSingleAssessment.json();
        assert.equal(dataSingleAssessment.data._id, topicAssessmentId.toString());
        assert.equal(dataSingleAssessment.data.questionIds, undefined);
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 2: Non-enrolled learner cannot access enrollment-restricted content
    // -------------------------------------------------------------------------------------------------
    await t.test("2. Non-enrolled learner is blocked from enrollment-restricted content with 403 ACTIVE_ENROLLMENT_REQUIRED", async () => {
        // Can discover public syllabus topics of published course
        const resTopics = await request(`/api/v1/courses/${publishedCourseId}/topics`, { token: tokens.nonEnrolledLearner });
        assert.equal(resTopics.status, 200);

        // Lessons list blocked
        const resLessons = await request(`/api/v1/topics/${publishedTopicId}/lessons`, { token: tokens.nonEnrolledLearner });
        assert.equal(resLessons.status, 403);
        const errLessons = await resLessons.json();
        assert.equal(errLessons.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

        // Single Lesson blocked
        const resSingleLesson = await request(`/api/v1/lessons/${publishedLessonId}`, { token: tokens.nonEnrolledLearner });
        assert.equal(resSingleLesson.status, 403);
        const errSingleLesson = await resSingleLesson.json();
        assert.equal(errSingleLesson.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

        // Resources list blocked
        const resResources = await request(`/api/v1/topics/${publishedTopicId}/resources`, { token: tokens.nonEnrolledLearner });
        assert.equal(resResources.status, 403);
        const errResources = await resResources.json();
        assert.equal(errResources.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

        // Single Resource blocked
        const resSingleResource = await request(`/api/v1/resources/${publishedResourceId}`, { token: tokens.nonEnrolledLearner });
        assert.equal(resSingleResource.status, 403);
        const errSingleResource = await resSingleResource.json();
        assert.equal(errSingleResource.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

        // Course Assessments list blocked
        const resCourseAssessments = await request(`/api/v1/courses/${publishedCourseId}/assessments`, { token: tokens.nonEnrolledLearner });
        assert.equal(resCourseAssessments.status, 403);
        const errCourseAssessments = await resCourseAssessments.json();
        assert.equal(errCourseAssessments.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

        // Topic Assessment blocked
        const resTopicAssessment = await request(`/api/v1/assessments/${topicAssessmentId}`, { token: tokens.nonEnrolledLearner });
        assert.equal(resTopicAssessment.status, 403);
        const errTopicAssessment = await resTopicAssessment.json();
        assert.equal(errTopicAssessment.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 3: Pre-enrollment diagnostic access
    // -------------------------------------------------------------------------------------------------
    await t.test("3. Non-enrolled learner can access permitted pre-enrollment diagnostic assessment", async () => {
        // Direct diagnostic assessment metadata
        const resDiag = await request(`/api/v1/assessments/${diagnosticAssessmentId}`, { token: tokens.nonEnrolledLearner });
        assert.equal(resDiag.status, 200);
        const dataDiag = await resDiag.json();
        assert.equal(dataDiag.data._id, diagnosticAssessmentId.toString());
        assert.equal(dataDiag.data.type, "DIAGNOSTIC");
        assert.equal(dataDiag.data.questionIds, undefined, "questionIds must be redacted for learner diagnostic view");

        // Course diagnostic discovery endpoint
        const resDiscovery = await request(`/api/v1/courses/${publishedCourseId}/diagnostic`, { token: tokens.nonEnrolledLearner });
        assert.equal(resDiscovery.status, 200);
        const dataDiscovery = await resDiscovery.json();
        assert.equal(dataDiscovery.data._id, diagnosticAssessmentId.toString());
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 4: Draft and archived content are not exposed through learner endpoints
    // -------------------------------------------------------------------------------------------------
    await t.test("4. Draft and archived course content return 404 for learners", async () => {
        // Draft course topics
        const resDraftTopics = await request(`/api/v1/courses/${draftCourseId}/topics`, { token: tokens.enrolledLearner });
        assert.equal(resDraftTopics.status, 404);

        // Draft topic
        const resDraftTopic = await request(`/api/v1/topics/${draftTopicId}`, { token: tokens.enrolledLearner });
        assert.equal(resDraftTopic.status, 404);

        // Draft lesson
        const resDraftLesson = await request(`/api/v1/lessons/${draftLessonId}`, { token: tokens.enrolledLearner });
        assert.equal(resDraftLesson.status, 404);

        // Draft resource
        const resDraftResource = await request(`/api/v1/resources/${draftResourceId}`, { token: tokens.enrolledLearner });
        assert.equal(resDraftResource.status, 404);

        // Draft assessment
        const resDraftAssessment = await request(`/api/v1/assessments/${draftAssessmentId}`, { token: tokens.enrolledLearner });
        assert.equal(resDraftAssessment.status, 404);

        // Archived course topics
        const resArchivedTopics = await request(`/api/v1/courses/${archivedCourseId}/topics`, { token: tokens.enrolledLearner });
        assert.equal(resArchivedTopics.status, 404);

        // Archived lesson
        const resArchivedLesson = await request(`/api/v1/lessons/${archivedLessonId}`, { token: tokens.enrolledLearner });
        assert.equal(resArchivedLesson.status, 404);
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 5: Learners cannot create, update, archive, or delete instructor-managed content
    // -------------------------------------------------------------------------------------------------
    await t.test("5. Learners cannot perform instructor-managed mutations (returns 403 UNAUTHORIZED_ACCESS)", async () => {
        // Create topic
        const resCreateTopic = await request(`/api/v1/courses/${publishedCourseId}/topics`, {
            method: "POST",
            token: tokens.enrolledLearner,
            body: { title: "Malicious Learner Topic", learningObjectives: ["Hack"] },
        });
        assert.equal(resCreateTopic.status, 403);
        const errCreateTopic = await resCreateTopic.json();
        assert.equal(errCreateTopic.error?.code, "UNAUTHORIZED_ACCESS");

        // Update topic
        const resUpdateTopic = await request(`/api/v1/topics/${publishedTopicId}`, {
            method: "PATCH",
            token: tokens.enrolledLearner,
            body: { title: "Hacked Topic Title" },
        });
        assert.equal(resUpdateTopic.status, 403);

        // Create lesson
        const resCreateLesson = await request(`/api/v1/topics/${publishedTopicId}/lessons`, {
            method: "POST",
            token: tokens.enrolledLearner,
            body: { title: "Malicious Lesson", content: [] },
        });
        assert.equal(resCreateLesson.status, 403);

        // Update lesson
        const resUpdateLesson = await request(`/api/v1/lessons/${publishedLessonId}`, {
            method: "PATCH",
            token: tokens.enrolledLearner,
            body: { title: "Hacked Lesson Title" },
        });
        assert.equal(resUpdateLesson.status, 403);

        // Delete lesson
        const resDeleteLesson = await request(`/api/v1/lessons/${publishedLessonId}`, {
            method: "DELETE",
            token: tokens.enrolledLearner,
        });
        assert.equal(resDeleteLesson.status, 403);

        // Update resource
        const resUpdateResource = await request(`/api/v1/resources/${publishedResourceId}`, {
            method: "PATCH",
            token: tokens.enrolledLearner,
            body: { title: "Hacked Resource Title" },
        });
        assert.equal(resUpdateResource.status, 403);

        // Create assessment
        const resCreateAssessment = await request(`/api/v1/assessments`, {
            method: "POST",
            token: tokens.enrolledLearner,
            body: { courseId: publishedCourseId, type: "DIAGNOSTIC", title: "Fake Assessment" },
        });
        assert.equal(resCreateAssessment.status, 403);
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 6: An instructor can manage their own content across all states
    // -------------------------------------------------------------------------------------------------
    await t.test("6. Instructor can view and manage their own content including drafts", async () => {
        // View draft course topics
        const resDraftTopics = await request(`/api/v1/courses/${draftCourseId}/topics`, { token: tokens.instructor1 });
        assert.equal(resDraftTopics.status, 200);
        const dataDraftTopics = await resDraftTopics.json();
        assert.equal(dataDraftTopics.data.length, 1);

        // View draft lesson
        const resDraftLesson = await request(`/api/v1/lessons/${draftLessonId}`, { token: tokens.instructor1 });
        assert.equal(resDraftLesson.status, 200);

        // View draft assessment (instructor view includes questionIds)
        const resDraftAssessment = await request(`/api/v1/assessments/${draftAssessmentId}`, { token: tokens.instructor1 });
        assert.equal(resDraftAssessment.status, 200);
        const dataDraftAssessment = await resDraftAssessment.json();
        assert.ok(Array.isArray(dataDraftAssessment.data.questionIds), "Instructor must see questionIds");

        // Update own topic
        const resUpdateTopic = await request(`/api/v1/topics/${draftTopicId}`, {
            method: "PATCH",
            token: tokens.instructor1,
            body: { title: "Updated Draft Topic Title" },
        });
        assert.equal(resUpdateTopic.status, 200);
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 7: An instructor cannot manage another instructor's content
    // -------------------------------------------------------------------------------------------------
    await t.test("7. Instructor cannot view or manage another instructor's content", async () => {
        // Instructor 2 trying to read Instructor 1's draft topic -> 403
        const resTopic = await request(`/api/v1/topics/${draftTopicId}`, { token: tokens.instructor2 });
        assert.equal(resTopic.status, 403);

        // Instructor 2 trying to read Instructor 1's lesson -> 404
        const resLesson = await request(`/api/v1/lessons/${publishedLessonId}`, { token: tokens.instructor2 });
        assert.equal(resLesson.status, 404);

        // Instructor 2 trying to read Instructor 1's resource -> 404
        const resResource = await request(`/api/v1/resources/${publishedResourceId}`, { token: tokens.instructor2 });
        assert.equal(resResource.status, 404);

        // Instructor 2 trying to update Instructor 1's topic -> 403
        const resUpdate = await request(`/api/v1/topics/${publishedTopicId}`, {
            method: "PATCH",
            token: tokens.instructor2,
            body: { title: "Unauthorized Overwrite" },
        });
        assert.equal(resUpdate.status, 403);

        // Instructor 2 trying to read Instructor 1's assessment -> 404
        const resAssessment = await request(`/api/v1/assessments/${diagnosticAssessmentId}`, { token: tokens.instructor2 });
        assert.equal(resAssessment.status, 404);
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 8: Unauthorized users receive expected error responses
    // -------------------------------------------------------------------------------------------------
    await t.test("8. Unauthenticated and wrong-role requests return appropriate 401/403 responses", async () => {
        // Unauthenticated request without token
        const resUnauth = await request(`/api/v1/topics/${publishedTopicId}`, { auth: false });
        assert.equal(resUnauth.status, 401);
        const errUnauth = await resUnauth.json();
        assert.equal(errUnauth.error?.code, "UNAUTHENTICATED_ACCESS");

        // Non-learner requesting learner diagnostic discovery
        const resNonLearner = await request(`/api/v1/courses/${publishedCourseId}/diagnostic`, { token: tokens.instructor1 });
        assert.equal(resNonLearner.status, 403);
        const errNonLearner = await resNonLearner.json();
        assert.equal(errNonLearner.error?.code, "UNAUTHORIZED_ACCESS");
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 9: Resource downloads enforce the same access policy as resource metadata
    // -------------------------------------------------------------------------------------------------
    await t.test("9. Resource downloads require active enrollment or ownership", async () => {
        // Enrolled learner can generate secure download url
        const resEnrolledDl = await request(`/api/v1/resources/${publishedResourceId}/file`, { token: tokens.enrolledLearner });
        assert.equal(resEnrolledDl.status, 200);
        const dataDl = await resEnrolledDl.json();
        assert.ok(dataDl.data.url, "Must return signed download url");
        assert.ok(dataDl.data.expiresAt, "Must return expiration timestamp");

        // Non-enrolled learner is rejected with 403 ACTIVE_ENROLLMENT_REQUIRED
        const resNonEnrolledDl = await request(`/api/v1/resources/${publishedResourceId}/file`, { token: tokens.nonEnrolledLearner });
        assert.equal(resNonEnrolledDl.status, 403);
        const errNonEnrolledDl = await resNonEnrolledDl.json();
        assert.equal(errNonEnrolledDl.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

        // Owner instructor can generate download url
        const resOwnerDl = await request(`/api/v1/resources/${publishedResourceId}/file`, { token: tokens.instructor1 });
        assert.equal(resOwnerDl.status, 200);

        // Another instructor is rejected with 404 RESOURCE_NOT_FOUND
        const resOtherInstDl = await request(`/api/v1/resources/${publishedResourceId}/file`, { token: tokens.instructor2 });
        assert.equal(resOtherInstDl.status, 404);

        // Unauthenticated request rejected with 401
        const resUnauthDl = await request(`/api/v1/resources/${publishedResourceId}/file`, { auth: false });
        assert.equal(resUnauthDl.status, 401);
    });

    // -------------------------------------------------------------------------------------------------
    // Scenario 10: Existing workflows remain intact (Admin access & diagnostic attempt start)
    // -------------------------------------------------------------------------------------------------
    await t.test("10. Admin access and pre-enrollment diagnostic attempt creation remain intact", async () => {
        // Admin can access course topics
        const resAdminTopics = await request(`/api/v1/courses/${publishedCourseId}/topics`, { token: tokens.admin });
        assert.equal(resAdminTopics.status, 200);

        // Admin can access lessons
        const resAdminLessons = await request(`/api/v1/topics/${publishedTopicId}/lessons`, { token: tokens.admin });
        assert.equal(resAdminLessons.status, 200);

        // Pre-enrollment diagnostic attempt start remains functional for non-enrolled learner
        const resAttempt = await request(`/api/v1/assessments/${diagnosticAssessmentId}/attempts`, {
            method: "POST",
            token: tokens.nonEnrolledLearner,
        });
        assert.equal(resAttempt.status, 201);
        const dataAttempt = await resAttempt.json();
        assert.equal(dataAttempt.data.assessmentId, diagnosticAssessmentId.toString());
        assert.equal(dataAttempt.data.learnerId, nonEnrolledLearnerId.toString());
        assert.equal(dataAttempt.data.status, "IN_PROGRESS");
    });
});
