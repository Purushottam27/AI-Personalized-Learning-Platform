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
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { Practice } from "../src/modules/practice/models/practice.model.js";
import { PracticeAttempt } from "../src/modules/practice/models/practiceAttempt.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";
import { LearningEvidence } from "../src/modules/learningEvidence/models/learningEvidence.model.js";
import {
    recordPracticeEvidenceService,
    recordAssessmentEvidenceService,
    processLearningEvidenceForAttemptService,
} from "../src/modules/learningEvidence/services/learningEvidence.service.js";

test("Learning Evidence Foundation", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const otherInstructorId = new mongoose.Types.ObjectId();
    const learner1Id = new mongoose.Types.ObjectId();
    const learner2Id = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const otherCourseId = new mongoose.Types.ObjectId();
    const topicId = new mongoose.Types.ObjectId();

    const createdUserIds = [instructorId, otherInstructorId, learner1Id, learner2Id];

    let connected = false;
    let server;
    let baseUrl;

    let q1Id;
    let q2Id;
    let q3Id;
    let practiceContributeId;
    let practiceExcludedId;
    let diagnosticAssessmentId;
    let topicAssessmentId;
    let finalAssessmentId;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await LearningEvidence.deleteMany({ courseId: { $in: [courseId, otherCourseId] } });
            await PracticeAttempt.deleteMany({ courseId: { $in: [courseId, otherCourseId] } });
            await AssessmentAttempt.deleteMany({ courseId: { $in: [courseId, otherCourseId] } });
            await Practice.deleteMany({ createdBy: { $in: [instructorId, otherInstructorId] } });
            await Assessment.deleteMany({ createdBy: { $in: [instructorId, otherInstructorId] } });
            await Question.deleteMany({ createdBy: { $in: [instructorId, otherInstructorId] } });
            await QuestionBank.deleteMany({ createdBy: { $in: [instructorId, otherInstructorId] } });
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
    assert.equal(mongoose.connection.name, TEST_DB_NAME);

    await Promise.all([
        User.init(),
        Course.init(),
        Topic.init(),
        Enrollment.init(),
        QuestionBank.init(),
        Question.init(),
        Practice.init(),
        PracticeAttempt.init(),
        Assessment.init(),
        AssessmentAttempt.init(),
        LearningEvidence.init(),
    ]);

    await User.create([
        { _id: instructorId, name: "Evidence Instructor", email: `evidence-inst-${instructorId}@example.test`, role: "INSTRUCTOR", status: "ACTIVE" },
        { _id: otherInstructorId, name: "Other Instructor", email: `evidence-other-inst-${otherInstructorId}@example.test`, role: "INSTRUCTOR", status: "ACTIVE" },
        { _id: learner1Id, name: "Evidence Learner 1", email: `evidence-l1-${learner1Id}@example.test`, role: "LEARNER", status: "ACTIVE" },
        { _id: learner2Id, name: "Evidence Learner 2", email: `evidence-l2-${learner2Id}@example.test`, role: "LEARNER", status: "ACTIVE" },
    ]);

    await Course.create([
        {
            _id: courseId,
            title: "Evidence Test Course",
            description: "A course designed specifically for testing learning evidence creation and isolation.",
            domain: "Computer Science",
            category: "Databases",
            difficulty: "BEGINNER",
            status: "PUBLISHED",
            createdBy: instructorId,
            diagnosticPolicy: { enabled: true, passingScore: 60, questionsPerAttempt: 5, randomizeQuestions: false },
        },
        {
            _id: otherCourseId,
            title: "Other Instructor Course",
            description: "A course owned by another instructor to verify cross-instructor access boundaries.",
            domain: "Computer Science",
            category: "Databases",
            difficulty: "BEGINNER",
            status: "PUBLISHED",
            createdBy: otherInstructorId,
        },
    ]);

    await Topic.create({
        _id: topicId,
        courseId,
        title: "Relational Modeling",
        description: "Understanding relational schema design",
        order: 1,
    });

    await Enrollment.create([
        { learnerId: learner1Id, courseId, status: "ACTIVE" },
        { learnerId: learner2Id, courseId, status: "ACTIVE" },
    ]);

    const bank = await QuestionBank.create({
        courseId,
        topicId,
        title: "Evidence Questions Pool",
        description: "Pool for evidence tests",
        createdBy: instructorId,
    });

    const createdQuestions = await Question.create([
        {
            courseId,
            topicId,
            questionBankId: bank._id,
            createdBy: instructorId,
            type: "MCQ_SINGLE",
            questionText: "What is 2 + 2?",
            normalizedQuestionText: "what is 2 + 2?",
            options: [{ key: "A", text: "3" }, { key: "B", text: "4" }, { key: "C", text: "5" }],
            correctAnswer: "B",
            marks: 2,
            difficulty: "EASY",
            status: "ACTIVE",
        },
        {
            courseId,
            topicId,
            questionBankId: bank._id,
            createdBy: instructorId,
            type: "TRUE_FALSE",
            questionText: "SQL is a query language.",
            normalizedQuestionText: "sql is a query language.",
            correctAnswer: "TRUE",
            marks: 1,
            difficulty: "EASY",
            status: "ACTIVE",
        },
        {
            courseId,
            topicId,
            questionBankId: bank._id,
            createdBy: instructorId,
            type: "MCQ_SINGLE",
            questionText: "Primary key must be unique?",
            normalizedQuestionText: "primary key must be unique?",
            options: [{ key: "A", text: "Yes" }, { key: "B", text: "No" }],
            correctAnswer: "A",
            marks: 3,
            difficulty: "MEDIUM",
            status: "ACTIVE",
        },
        {
            courseId,
            topicId,
            questionBankId: bank._id,
            createdBy: instructorId,
            type: "TRUE_FALSE",
            questionText: "Indexes can speed up reads.",
            normalizedQuestionText: "indexes can speed up reads.",
            correctAnswer: "TRUE",
            marks: 2,
            difficulty: "EASY",
            status: "ACTIVE",
        },
        {
            courseId,
            topicId,
            questionBankId: bank._id,
            createdBy: instructorId,
            type: "TRUE_FALSE",
            questionText: "Foreign keys reference primary keys.",
            normalizedQuestionText: "foreign keys reference primary keys.",
            correctAnswer: "TRUE",
            marks: 2,
            difficulty: "EASY",
            status: "ACTIVE",
        },
    ]);

    q1Id = createdQuestions[0]._id;
    q2Id = createdQuestions[1]._id;
    q3Id = createdQuestions[2]._id;
    const questionIds = createdQuestions.map((q) => q._id);

    // Create Practices: one contributing to evidence, one excluded
    const p1 = await Practice.create({
        courseId,
        topicId,
        questionBankId: bank._id,
        createdBy: instructorId,
        title: "Contributing Practice",
        description: "Practice that generates learning evidence",
        questionIds: [q1Id, q2Id],
        contributeToLearningEvidence: true,
        status: "PUBLISHED",
    });
    practiceContributeId = p1._id;

    const p2 = await Practice.create({
        courseId,
        topicId,
        questionBankId: bank._id,
        createdBy: instructorId,
        title: "Excluded Practice",
        description: "Practice excluded from learning evidence",
        questionIds: [q1Id, q2Id],
        contributeToLearningEvidence: false,
        status: "PUBLISHED",
    });
    practiceExcludedId = p2._id;

    // Create Assessments: Diagnostic, Topic, and Final
    const aDiag = await Assessment.create({
        courseId,
        topicId: null,
        createdBy: instructorId,
        type: "DIAGNOSTIC",
        title: "Course Diagnostic Assessment",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 60,
        maxAttempts: 3,
        randomizeQuestions: false,
        status: "PUBLISHED",
    });
    diagnosticAssessmentId = aDiag._id;

    const aTopic = await Assessment.create({
        courseId,
        topicId,
        createdBy: instructorId,
        type: "TOPIC",
        title: "Topic Mastery Assessment",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 60,
        maxAttempts: 3,
        randomizeQuestions: false,
        status: "PUBLISHED",
    });
    topicAssessmentId = aTopic._id;

    const aFinal = await Assessment.create({
        courseId,
        topicId: null,
        createdBy: instructorId,
        type: "FINAL",
        title: "Course Final Assessment",
        questionIds,
        questionsPerAttempt: 5,
        passingScore: 70,
        maxAttempts: 2,
        randomizeQuestions: false,
        status: "PUBLISHED",
    });
    finalAssessmentId = aFinal._id;

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    function makeToken(user) {
        return jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
    }

    const learner1Token = makeToken({ _id: learner1Id, role: "LEARNER" });
    const learner2Token = makeToken({ _id: learner2Id, role: "LEARNER" });
    const instructorToken = makeToken({ _id: instructorId, role: "INSTRUCTOR" });
    const otherInstructorToken = makeToken({ _id: otherInstructorId, role: "INSTRUCTOR" });

    async function api(pathname, { token = learner1Token, method = "GET", body } = {}) {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        if (body !== undefined) headers["Content-Type"] = "application/json";
        return fetch(`${baseUrl}${pathname}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    }

    // -------------------------------------------------------------------------
    // 1. Submitted eligible PracticeAttempt produces expected learning evidence
    // -------------------------------------------------------------------------
    await t.test("1. Submitted eligible PracticeAttempt produces expected evidence", async () => {
        const startRes = await api(`/api/v1/practices/${practiceContributeId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const startBody = await startRes.json();
        const attemptId = startBody.data._id;

        // Save answer for question 1 (correct: B)
        await api(`/api/v1/practice-attempts/${attemptId}/questions/${q1Id}/answer`, {
            method: "PUT",
            body: { answer: "B" },
        });

        // Submit attempt
        const submitRes = await api(`/api/v1/practice-attempts/${attemptId}/submit`, { method: "POST" });
        assert.equal(submitRes.status, 200);
        const submitBody = await submitRes.json();
        assert.equal(submitBody.data.status, "SUBMITTED");

        // Verify evidence in database
        const evidence = await LearningEvidence.findOne({ attemptId });
        assert.ok(evidence, "Learning evidence must be created for submitted practice");
        assert.equal(evidence.learnerId.toString(), learner1Id.toString());
        assert.equal(evidence.courseId.toString(), courseId.toString());
        assert.equal(evidence.topicId.toString(), topicId.toString());
        assert.equal(evidence.sourceType, "PRACTICE");
        assert.equal(evidence.sourceId.toString(), practiceContributeId.toString());
        assert.equal(evidence.attemptId.toString(), attemptId.toString());
        assert.equal(evidence.assessmentSubtype, null);
        assert.equal(evidence.marksAwarded, 2);
        assert.equal(evidence.correctCount, 1);
        assert.equal(evidence.scorePercent, submitBody.data.scorePercent);
        assert.equal(evidence.contributeToLearningEvidence, true);
    });

    // -------------------------------------------------------------------------
    // 2. In-progress practice attempt produces NO evidence
    // -------------------------------------------------------------------------
    await t.test("2. In-progress practice attempt produces no evidence", async () => {
        const startRes = await api(`/api/v1/practices/${practiceContributeId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const startBody = await startRes.json();
        const attemptId = startBody.data._id;

        // Check DB directly while attempt is IN_PROGRESS
        const evidenceBeforeSubmit = await LearningEvidence.findOne({ attemptId });
        assert.equal(evidenceBeforeSubmit, null, "In-progress attempt must produce no learning evidence");

        // Calling service with IN_PROGRESS attempt must return null
        const inProgressAttempt = await PracticeAttempt.findById(attemptId);
        const result = await recordPracticeEvidenceService(inProgressAttempt);
        assert.equal(result, null);

        // Submit attempt to clean up active attempt slot
        await api(`/api/v1/practice-attempts/${attemptId}/submit`, { method: "POST" });
    });

    // -------------------------------------------------------------------------
    // 3. Practice attempt with contributeToLearningEvidence: false is excluded
    // -------------------------------------------------------------------------
    await t.test("3. Practice attempt with contributeToLearningEvidence: false is excluded", async () => {
        const startRes = await api(`/api/v1/practices/${practiceExcludedId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const startBody = await startRes.json();
        const attemptId = startBody.data._id;

        const submitRes = await api(`/api/v1/practice-attempts/${attemptId}/submit`, { method: "POST" });
        assert.equal(submitRes.status, 200);

        const evidence = await LearningEvidence.findOne({ attemptId });
        assert.equal(evidence, null, "Practice with contributeToLearningEvidence: false must not produce evidence");
    });

    // -------------------------------------------------------------------------
    // 4. Snapshotted contribution setting is respected even if parent Practice changes later
    // -------------------------------------------------------------------------
    await t.test("4. Snapshotted contribution setting is respected even if parent Practice changes later", async () => {
        // Start attempt while practice has contributeToLearningEvidence: false
        const startRes = await api(`/api/v1/practices/${practiceExcludedId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const startBody = await startRes.json();
        const attemptId = startBody.data._id;

        // Change parent Practice to true AFTER attempt start
        await Practice.updateOne({ _id: practiceExcludedId }, { $set: { contributeToLearningEvidence: true } });

        try {
            // Submit attempt
            await api(`/api/v1/practice-attempts/${attemptId}/submit`, { method: "POST" });

            // Verify attempt snapshot was respected (still false on attempt -> no evidence created)
            const attempt = await PracticeAttempt.findById(attemptId);
            assert.equal(attempt.contributeToLearningEvidence, false);

            const evidence = await LearningEvidence.findOne({ attemptId });
            assert.equal(evidence, null, "Must respect snapshotted contribution setting, not current parent Practice");
        } finally {
            // Restore practice setting
            await Practice.updateOne({ _id: practiceExcludedId }, { $set: { contributeToLearningEvidence: false } });
        }
    });

    // -------------------------------------------------------------------------
    // 5. Completed eligible assessment produces expected evidence
    // -------------------------------------------------------------------------
    await t.test("5. Completed eligible assessment produces expected evidence", async () => {
        const startRes = await api(`/api/v1/assessments/${topicAssessmentId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const startBody = await startRes.json();
        const attemptId = startBody.data._id;

        // Save answer for q1
        await api(`/api/v1/assessment-attempts/${attemptId}/questions/${q1Id}/answer`, {
            method: "PUT",
            body: { answer: "B" },
        });

        // Submit assessment
        const submitRes = await api(`/api/v1/assessment-attempts/${attemptId}/submit`, {
            method: "POST",
            body: { reason: "MANUAL" },
        });
        assert.equal(submitRes.status, 200);
        const submitBody = await submitRes.json();
        assert.equal(submitBody.data.status, "SUBMITTED");

        // Verify evidence
        const evidence = await LearningEvidence.findOne({ attemptId });
        assert.ok(evidence, "Learning evidence must be created for submitted assessment");
        assert.equal(evidence.learnerId.toString(), learner1Id.toString());
        assert.equal(evidence.courseId.toString(), courseId.toString());
        assert.equal(evidence.topicId.toString(), topicId.toString());
        assert.equal(evidence.sourceType, "ASSESSMENT");
        assert.equal(evidence.sourceId.toString(), topicAssessmentId.toString());
        assert.equal(evidence.assessmentSubtype, "TOPIC");
        assert.equal(evidence.marksAwarded, submitBody.data.marksAwarded);
        assert.equal(evidence.totalMarks, submitBody.data.totalMarks);
        assert.equal(evidence.scorePercent, submitBody.data.scorePercent);
        assert.equal(evidence.passed, submitBody.data.passed);
    });

    // -------------------------------------------------------------------------
    // 6. Assessment subtype eligibility follows documented policy (DIAGNOSTIC, TOPIC, FINAL)
    // -------------------------------------------------------------------------
    await t.test("6. Assessment subtype eligibility covers DIAGNOSTIC, TOPIC, and FINAL", async () => {
        // Test DIAGNOSTIC assessment
        const diagStartRes = await api(`/api/v1/assessments/${diagnosticAssessmentId}/attempts`, { method: "POST" });
        assert.equal(diagStartRes.status, 201);
        const diagAttemptId = (await diagStartRes.json()).data._id;
        const diagSubmitRes = await api(`/api/v1/assessment-attempts/${diagAttemptId}/submit`, { method: "POST" });
        assert.equal(diagSubmitRes.status, 200);

        const diagEvidence = await LearningEvidence.findOne({ attemptId: diagAttemptId });
        assert.ok(diagEvidence);
        assert.equal(diagEvidence.assessmentSubtype, "DIAGNOSTIC");
        assert.equal(diagEvidence.topicId, null, "Course-level diagnostic assessment must have null topicId");

        // Test FINAL assessment
        const finalStartRes = await api(`/api/v1/assessments/${finalAssessmentId}/attempts`, { method: "POST" });
        assert.equal(finalStartRes.status, 201);
        const finalAttemptId = (await finalStartRes.json()).data._id;
        const finalSubmitRes = await api(`/api/v1/assessment-attempts/${finalAttemptId}/submit`, { method: "POST" });
        assert.equal(finalSubmitRes.status, 200);

        const finalEvidence = await LearningEvidence.findOne({ attemptId: finalAttemptId });
        assert.ok(finalEvidence);
        assert.equal(finalEvidence.assessmentSubtype, "FINAL");
        assert.equal(finalEvidence.topicId, null, "Course-level final assessment must have null topicId");
    });

    // -------------------------------------------------------------------------
    // 7. Reprocessing the same source attempt does not create duplicate evidence
    // -------------------------------------------------------------------------
    await t.test("7. Reprocessing the same source attempt does not create duplicate evidence", async () => {
        const startRes = await api(`/api/v1/practices/${practiceContributeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        const attemptId = startBody.data._id;
        await api(`/api/v1/practice-attempts/${attemptId}/submit`, { method: "POST" });

        const count1 = await LearningEvidence.countDocuments({ attemptId });
        assert.equal(count1, 1);

        // Reprocess via idempotent processor
        await processLearningEvidenceForAttemptService({ sourceType: "PRACTICE", attemptId });
        const count2 = await LearningEvidence.countDocuments({ attemptId });
        assert.equal(count2, 1, "Reprocessing attempt must not duplicate evidence");
    });

    // -------------------------------------------------------------------------
    // 8. Concurrent processing cannot create duplicate evidence
    // -------------------------------------------------------------------------
    await t.test("8. Concurrent processing cannot create duplicate evidence", async () => {
        const startRes = await api(`/api/v1/practices/${practiceContributeId}/attempts`, { method: "POST" });
        const attemptId = (await startRes.json()).data._id;
        const attempt = await PracticeAttempt.findById(attemptId);
        attempt.status = "SUBMITTED";
        attempt.submittedAt = new Date();
        attempt.marksAwarded = 2;
        attempt.totalMarks = 5;
        attempt.scorePercent = 40;
        await attempt.save();

        // Run 5 concurrent record service calls
        const results = await Promise.all([
            recordPracticeEvidenceService(attempt),
            recordPracticeEvidenceService(attempt),
            recordPracticeEvidenceService(attempt),
            recordPracticeEvidenceService(attempt),
            recordPracticeEvidenceService(attempt),
        ]);

        const evidenceRecords = await LearningEvidence.find({ attemptId });
        assert.equal(evidenceRecords.length, 1, "Database unique constraint must ensure exactly 1 record exists");
        assert.ok(results.every((r) => r._id.toString() === evidenceRecords[0]._id.toString()));
    });

    // -------------------------------------------------------------------------
    // 9. Failed persistence can be retried without losing or duplicating evidence
    // -------------------------------------------------------------------------
    await t.test("9. Failed persistence can be retried without losing or duplicating evidence", async () => {
        const startRes = await api(`/api/v1/practices/${practiceContributeId}/attempts`, { method: "POST" });
        const attemptId = (await startRes.json()).data._id;
        await api(`/api/v1/practice-attempts/${attemptId}/submit`, { method: "POST" });

        // Simulate that initial evidence was deleted (e.g. simulated initial save failure)
        await LearningEvidence.deleteOne({ attemptId });
        assert.equal(await LearningEvidence.countDocuments({ attemptId }), 0);

        // Recovery / retry via processor
        const recovered = await processLearningEvidenceForAttemptService({ sourceType: "PRACTICE", attemptId });
        assert.ok(recovered);
        assert.equal(recovered.attemptId.toString(), attemptId.toString());

        const finalCount = await LearningEvidence.countDocuments({ attemptId });
        assert.equal(finalCount, 1, "Recovery must persist exactly one record");
    });

    // -------------------------------------------------------------------------
    // 10. Evidence metrics match authoritative persisted source result
    // -------------------------------------------------------------------------
    await t.test("10. Evidence metrics match authoritative persisted source result", async () => {
        const startRes = await api(`/api/v1/practices/${practiceContributeId}/attempts`, { method: "POST" });
        const attemptId = (await startRes.json()).data._id;

        // Answer q1 correctly (marks: 2) and q2 incorrectly
        await api(`/api/v1/practice-attempts/${attemptId}/questions/${q1Id}/answer`, {
            method: "PUT",
            body: { answer: "B" },
        });
        await api(`/api/v1/practice-attempts/${attemptId}/questions/${q2Id}/answer`, {
            method: "PUT",
            body: { answer: "FALSE" },
        });

        const submitRes = await api(`/api/v1/practice-attempts/${attemptId}/submit`, { method: "POST" });
        const submitData = (await submitRes.json()).data;

        const evidence = await LearningEvidence.findOne({ attemptId });
        assert.equal(evidence.totalMarks, submitData.totalMarks);
        assert.equal(evidence.marksAwarded, submitData.marksAwarded);
        assert.equal(evidence.scorePercent, submitData.scorePercent);
        assert.equal(evidence.correctCount, submitData.correctCount);
        assert.equal(evidence.totalQuestions, submitData.totalQuestions);
    });

    // -------------------------------------------------------------------------
    // 11. Client-supplied score data cannot forge evidence
    // -------------------------------------------------------------------------
    await t.test("11. Client-supplied score data cannot forge evidence (endpoints do not exist)", async () => {
        // Direct POST to create fake evidence
        const postRes = await api("/api/v1/learning-evidence", {
            method: "POST",
            body: {
                marksAwarded: 100,
                scorePercent: 100,
                passed: true,
            },
        });
        assert.equal(postRes.status, 404, "No arbitrary creation route must exist");

        // Direct PUT/PATCH to modify evidence
        const patchRes = await api("/api/v1/learning-evidence/me", {
            method: "PATCH",
            body: { scorePercent: 100 },
        });
        assert.equal(patchRes.status, 404, "No arbitrary update route must exist");
    });

    // -------------------------------------------------------------------------
    // 12. Learners cannot read another learner's evidence
    // -------------------------------------------------------------------------
    await t.test("12. Learners cannot read another learner's evidence", async () => {
        // Find an evidence belonging to Learner 1
        const evidence1 = await LearningEvidence.findOne({ learnerId: learner1Id });
        assert.ok(evidence1);

        // Learner 2 tries to read Learner 1's evidence by ID
        const getByIdRes = await api(`/api/v1/learning-evidence/${evidence1._id}`, { token: learner2Token });
        assert.equal(getByIdRes.status, 404, "Learner 2 must not be able to read Learner 1's evidence");

        // Learner 2 reads their own evidence list: must NOT contain evidence of Learner 1
        const listRes = await api("/api/v1/learning-evidence/me", { token: learner2Token });
        assert.equal(listRes.status, 200);
        const listBody = await listRes.json();
        const ids = listBody.data.evidence.map((e) => e._id);
        assert.ok(!ids.includes(evidence1._id.toString()), "Learner 2 list must not contain Learner 1 evidence");
    });

    // -------------------------------------------------------------------------
    // 13. Instructor access is limited to owned courses
    // -------------------------------------------------------------------------
    await t.test("13. Instructor access is limited to owned courses", async () => {
        // Instructor 1 views evidence for courseId (owned by instructor 1)
        const courseEvidenceRes = await api(`/api/v1/courses/${courseId}/learning-evidence`, { token: instructorToken });
        assert.equal(courseEvidenceRes.status, 200);
        const courseEvidenceBody = await courseEvidenceRes.json();
        assert.ok(Array.isArray(courseEvidenceBody.data.evidence));
        assert.ok(courseEvidenceBody.data.evidence.length > 0);

        // Instructor 1 tries to view evidence for otherCourseId (owned by otherInstructor)
        const deniedRes = await api(`/api/v1/courses/${otherCourseId}/learning-evidence`, { token: instructorToken });
        assert.equal(deniedRes.status, 403, "Instructor must be denied viewing evidence for courses they do not own");

        // Other instructor views otherCourseId (succeeds with empty list)
        const allowedOtherRes = await api(`/api/v1/courses/${otherCourseId}/learning-evidence`, { token: otherInstructorToken });
        assert.equal(allowedOtherRes.status, 200);
    });

    // -------------------------------------------------------------------------
    // 14. Historical evidence remains stable after source content changes
    // -------------------------------------------------------------------------
    await t.test("14. Historical evidence remains stable after source content changes", async () => {
        const evidenceBefore = await LearningEvidence.findOne({ learnerId: learner1Id, sourceType: "PRACTICE" });
        assert.ok(evidenceBefore);
        const originalScore = evidenceBefore.scorePercent;
        const originalMarks = evidenceBefore.marksAwarded;

        // Change the underlying question in QuestionBank
        await Question.updateOne({ _id: q1Id }, { $set: { questionText: "MODIFIED QUESTION TEXT", correctAnswer: "A", marks: 10 } });
        // Change parent Practice
        await Practice.updateOne({ _id: practiceContributeId }, { $set: { title: "RENAMED PRACTICE", contributeToLearningEvidence: false } });

        // Reload evidence from database
        const evidenceAfter = await LearningEvidence.findById(evidenceBefore._id);
        assert.equal(evidenceAfter.scorePercent, originalScore, "Score percent must remain stable");
        assert.equal(evidenceAfter.marksAwarded, originalMarks, "Marks awarded must remain stable");
        assert.equal(evidenceAfter.contributeToLearningEvidence, true, "Historical contribution setting must remain stable");
    });

    // -------------------------------------------------------------------------
    // 15. Malformed identifiers and invalid requests are handled safely
    // -------------------------------------------------------------------------
    await t.test("15. Malformed identifiers and invalid requests are handled safely", async () => {
        const invalidIdRes = await api("/api/v1/learning-evidence/not-a-valid-id");
        assert.equal(invalidIdRes.status, 400);

        const invalidQueryRes = await api("/api/v1/learning-evidence/me?sourceType=INVALID_TYPE");
        assert.equal(invalidQueryRes.status, 400);

        const invalidCourseParamRes = await api("/api/v1/courses/not-an-id/learning-evidence", { token: instructorToken });
        assert.equal(invalidCourseParamRes.status, 400);
    });
});
