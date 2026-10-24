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
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../src/modules/assessmentAttempt/models/assessmentAttempt.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("Assessment Attempt HTTP API", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const learnerId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const createdUserIds = [instructorId, learnerId];
    let connected = false;
    let server;
    let assessmentId;
    let attemptId;
    let baseUrl;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await AssessmentAttempt.deleteMany({ courseId });
            await Enrollment.deleteMany({ courseId });
            await Assessment.deleteMany({ createdBy: instructorId });
            await Question.deleteMany({ createdBy: instructorId });
            await QuestionBank.deleteMany({ createdBy: instructorId });
            await Topic.deleteMany({ courseId });
            await Course.deleteMany({ _id: courseId });
            await User.deleteMany({ _id: { $in: createdUserIds } });
        } finally { await mongoose.disconnect(); }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME);
    await Promise.all([User.init(), Course.init(), Topic.init(), Enrollment.init(), QuestionBank.init(), Question.init(), Assessment.init(), AssessmentAttempt.init()]);

    await User.create([
        { _id: instructorId, name: "Attempt Test Instructor", email: `attempt-instructor-${instructorId}@example.test`, role: "INSTRUCTOR", status: "ACTIVE" },
        { _id: learnerId, name: "Attempt Test Learner", email: `attempt-learner-${learnerId}@example.test`, role: "LEARNER", status: "ACTIVE" },
    ]);
    const course = await Course.create({
        _id: courseId, title: "Attempt Test Course", description: "Course fixture used to verify assessment attempts.",
        createdBy: instructorId, domain: "Testing", category: "Integration", difficulty: "BEGINNER", objectives: [], status: "PUBLISHED",
    });
    const topic = await Topic.create({ courseId: course._id, title: "Attempt Test Topic", learningObjectives: [], order: 1 });
    const bank = await QuestionBank.create({ courseId: course._id, topicId: topic._id, createdBy: instructorId, title: "Attempt Test Bank", status: "ACTIVE" });
    const questions = await Question.create(Array.from({ length: 5 }, (_, i) => ({
        questionBankId: bank._id, courseId: course._id, topicId: topic._id, createdBy: instructorId,
        questionText: `Attempt question number ${i + 1}?`, normalizedQuestionText: `attempt question number ${i + 1}`,
        type: "MCQ_SINGLE", options: [{ key: "A", text: "Correct" }, { key: "B", text: "Incorrect" }],
        correctAnswer: "A", explanation: "A is the correct option.", marks: 2, difficulty: "EASY", status: "ACTIVE",
    })));
    const assessment = await Assessment.create({
        courseId: course._id, topicId: topic._id, createdBy: instructorId, type: "TOPIC", title: "Attempt API Assessment",
        questionIds: questions.map((q) => q._id), questionsPerAttempt: 5, passingScore: 60, maxAttempts: 2,
        randomizeQuestions: false, randomizeOptions: false, timeLimitMinutes: 10, status: "PUBLISHED",
    });
    assessmentId = assessment._id.toString();
    await Enrollment.create({ learnerId, courseId, status: "ACTIVE" });

    const token = jwt.sign({ sub: learnerId.toString(), role: "LEARNER" }, JWT_ACCESS_SECRET, { expiresIn: "5m" });
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    const request = (url, options = {}) => fetch(`${baseUrl}${url}`, {
        ...options,
        headers: {
            ...(options.body ? { "content-type": "application/json" } : {}),
            ...(options.auth === false ? {} : { authorization: `Bearer ${token}` }),
            ...(options.headers ?? {}),
        },
    });

    await t.test("starts an attempt and does not expose correct answers before submission", async () => {
        const response = await request(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        const body = await response.json();
        assert.equal(response.status, 201, JSON.stringify(body));
        assert.equal(body.data.status, "IN_PROGRESS");
        assert.equal(body.data.questions.length, 5);
        assert.equal(body.data.attemptNumber, 1);
        assert.ok(body.data.deadlineAt);
        assert.equal("correctAnswer" in body.data.questions[0], false);
        attemptId = body.data._id;
    });

    await t.test("saves answers and scores server-side on submission", async () => {
        const active = await (await request(`/api/v1/assessment-attempts/${attemptId}`)).json();
        for (const question of active.data.questions) {
            const response = await request(`/api/v1/assessment-attempts/${attemptId}/questions/${question.questionId}/answer`, {
                method: "PUT", body: JSON.stringify({ answer: "A" }),
            });
            assert.equal(response.status, 200);
        }
        const submitResponse = await request(`/api/v1/assessment-attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({}) });
        const submitted = await submitResponse.json();
        assert.equal(submitResponse.status, 200, JSON.stringify(submitted));
        assert.equal(submitted.data.status, "SUBMITTED");
        assert.equal(submitted.data.marksAwarded, 10);
        assert.equal(submitted.data.scorePercent, 100);
        assert.equal(submitted.data.passed, true);
        assert.equal(submitted.data.questions[0].correctAnswer, "A");
        const secondSubmit = await request(`/api/v1/assessment-attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({}) });
        assert.equal(secondSubmit.status, 200, "submission retries should be idempotent");
    });

    await t.test("returns attempt history and enforces attempt limits", async () => {
        const historyResponse = await request(`/api/v1/assessments/${assessmentId}/attempts`);
        const history = await historyResponse.json();
        assert.equal(historyResponse.status, 200, JSON.stringify(history));
        assert.ok(history.data.assessment, "Assessment summary must be present in history");
        assert.equal(history.data.assessment.courseId, courseId.toString());
        assert.equal(history.data.assessment.type, "TOPIC");
        assert.equal(history.data.assessment.title, "Attempt API Assessment");
        assert.equal(history.data.attempts.length, 1);
        const second = await request(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(second.status, 201);
        const secondBody = await second.json();
        assert.equal(secondBody.data.attemptNumber, 2);
        const secondSubmit = await request(`/api/v1/assessment-attempts/${secondBody.data._id}/submit`, { method: "POST", body: JSON.stringify({}) });
        assert.equal(secondSubmit.status, 200);
        const third = await request(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        const thirdBody = await third.json();
        assert.equal(third.status, 409, JSON.stringify(thirdBody));
        assert.equal(thirdBody.error.code, "MAX_ATTEMPTS_REACHED");
    });

    await t.test("rejects non-learners", async () => {
        const instructorToken = jwt.sign({ sub: instructorId.toString(), role: "INSTRUCTOR" }, JWT_ACCESS_SECRET, { expiresIn: "5m" });
        const response = await request(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST", headers: { authorization: `Bearer ${instructorToken}` } });
        assert.equal(response.status, 403);
    });

    async function createTestLearner(name) {
        const id = new mongoose.Types.ObjectId();
        createdUserIds.push(id);
        await User.create({
            _id: id,
            name: `Attempt Learner ${name}`,
            email: `attempt-learner-${id}@example.test`,
            role: "LEARNER",
            status: "ACTIVE",
        });
        await Enrollment.create({ learnerId: id, courseId, status: "ACTIVE" });
        const learnerToken = jwt.sign({ sub: id.toString(), role: "LEARNER" }, JWT_ACCESS_SECRET, { expiresIn: "10m" });
        return {
            id,
            token: learnerToken,
            req: (url, opts = {}) => request(url, { ...opts, headers: { ...(opts.headers || {}), authorization: `Bearer ${learnerToken}` } }),
        };
    }

    await t.test("Test 1 — Sequential idempotent submission returns stored result and prevents recalculation", async () => {
        const learner = await createTestLearner("Idempotent");
        const startRes = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const { data: startData } = await startRes.json();
        const testAttemptId = startData._id;

        // Answer question 0
        const q0 = startData.questions[0];
        const ansRes = await learner.req(`/api/v1/assessment-attempts/${testAttemptId}/questions/${q0.questionId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "A" }),
        });
        assert.equal(ansRes.status, 200);

        // First submission
        const submit1 = await learner.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
            method: "POST",
            body: JSON.stringify({ reason: "MANUAL" }),
        });
        assert.equal(submit1.status, 200);
        const { data: data1 } = await submit1.json();
        assert.equal(data1.status, "SUBMITTED");
        assert.equal(data1.submissionReason, "MANUAL");
        assert.equal(data1.marksAwarded, 2);

        // Second submission (idempotent retry with same reason)
        const submit2 = await learner.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
            method: "POST",
            body: JSON.stringify({ reason: "MANUAL" }),
        });
        assert.equal(submit2.status, 200);
        const { data: data2 } = await submit2.json();
        assert.equal(data2.submittedAt, data1.submittedAt);
        assert.equal(data2.marksAwarded, data1.marksAwarded);
        assert.equal(data2.scorePercent, data1.scorePercent);

        // Third submission with different reason (must NOT overwrite original submission)
        const submit3 = await learner.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
            method: "POST",
            body: JSON.stringify({ reason: "LEFT" }),
        });
        assert.equal(submit3.status, 200);
        const { data: data3 } = await submit3.json();
        assert.equal(data3.submissionReason, "MANUAL");

        // Verify database state directly
        const inDb = await AssessmentAttempt.findById(testAttemptId);
        assert.equal(inDb.status, "SUBMITTED");
        assert.equal(inDb.submissionReason, "MANUAL");
        assert.equal(inDb.marksAwarded, 2);
    });

    await t.test("Test 2 — Concurrent submissions resolve safely and idempotently without VersionError or 500", async () => {
        const learner = await createTestLearner("ConcurrentSubmit");
        const startRes = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const { data: startData } = await startRes.json();
        const testAttemptId = startData._id;

        // Fire two concurrent submissions with different reasons
        const [res1, res2] = await Promise.all([
            learner.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
                method: "POST",
                body: JSON.stringify({ reason: "MANUAL" }),
            }),
            learner.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
                method: "POST",
                body: JSON.stringify({ reason: "LEFT" }),
            }),
        ]);

        assert.equal(res1.status, 200, "First concurrent submission must return 200");
        assert.equal(res2.status, 200, "Second concurrent submission must return 200");

        const body1 = await res1.json();
        const body2 = await res2.json();
        assert.equal(body1.data.status, "SUBMITTED");
        assert.equal(body2.data.status, "SUBMITTED");
        assert.equal(body1.data.submittedAt, body2.data.submittedAt);
        assert.equal(body1.data.submissionReason, body2.data.submissionReason);

        // Verify only one finalization was saved in MongoDB
        const inDb = await AssessmentAttempt.findById(testAttemptId);
        assert.equal(inDb.status, "SUBMITTED");
        assert.ok(["MANUAL", "LEFT"].includes(inDb.submissionReason));
        assert.equal(inDb.submittedAt.toISOString(), body1.data.submittedAt);
    });

    await t.test("Test 3 — Answer-save racing submission handles both outcomes safely without data corruption", async () => {
        const originalSave = AssessmentAttempt.prototype.save;

        try {
            // Outcome A: Overlapping race where answer save commits first, and submission includes the saved answer
            {
                const learnerA = await createTestLearner("SaveRaceWin");
                const startRes = await learnerA.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
                const { data: startData } = await startRes.json();
                const testAttemptId = startData._id;
                const q0 = startData.questions[0];

                let releaseSubmission = null;
                const submissionPaused = new Promise((resolve) => {
                    releaseSubmission = resolve;
                });
                let resumeSubmission = null;
                const submissionCanProceed = new Promise((resolve) => {
                    resumeSubmission = resolve;
                });

                let pausedOnce = false;
                AssessmentAttempt.prototype.save = async function (...args) {
                    if (this._id.toString() === testAttemptId && this.status === "SUBMITTED" && !pausedOnce) {
                        pausedOnce = true;
                        releaseSubmission();
                        await submissionCanProceed;
                    }
                    return originalSave.apply(this, args);
                };

                let submitPromise = null;
                try {
                    // Launch submission asynchronously. It reads the document at __v = 0 before answer save commits
                    submitPromise = learnerA.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
                        method: "POST",
                        body: JSON.stringify({ reason: "MANUAL" }),
                    });

                    // Wait until submission has entered save() and is paused
                    await submissionPaused;

                    // Concurrently execute answer save. This updates MongoDB to __v = 1 and persists answer "A"
                    const saveRes = await learnerA.req(`/api/v1/assessment-attempts/${testAttemptId}/questions/${q0.questionId}/answer`, {
                        method: "PUT",
                        body: JSON.stringify({ answer: "A" }),
                    });
                    assert.equal(saveRes.status, 200);

                    // Now resume submission. Its in-flight save() encounters VersionError, reloads the fresh
                    // document with the persisted answer, recalculates score, and successfully commits!
                    resumeSubmission();
                    const submitRes = await submitPromise;
                    assert.equal(submitRes.status, 200);
                    const submitData = (await submitRes.json()).data;

                    // Verify API response
                    assert.equal(submitData.status, "SUBMITTED");
                    assert.equal(submitData.marksAwarded, 2);
                    assert.equal(submitData.questions[0].answer, "A");

                    // Assert full database state
                    const inDb = await AssessmentAttempt.findById(testAttemptId);
                    assert.equal(inDb.status, "SUBMITTED");
                    assert.ok(inDb.submittedAt instanceof Date);
                    assert.equal(inDb.submissionReason, "MANUAL");
                    assert.equal(inDb.marksAwarded, 2);
                    assert.equal(inDb.totalMarks, 10);
                    assert.equal(inDb.scorePercent, 20); // 2 out of 10 marks = 20%
                    assert.equal(inDb.passed, false); // passingScore is 60
                    assert.equal(inDb.answers.length, 1);
                    assert.equal(inDb.answers[0].questionId.toString(), q0.questionId);
                    assert.equal(inDb.answers[0].answer, "A");
                } finally {
                    // Failure-safe barrier release: prevent blocked requests on error or assertion failure
                    resumeSubmission?.();
                    if (submitPromise) {
                        await submitPromise.catch(() => {});
                    }
                }
            }

            // Outcome B: Overlapping race where submission commits first, and answer save cannot mutate submitted attempt
            {
                const learnerB = await createTestLearner("SubmitRaceWin");
                const startRes = await learnerB.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
                const { data: startData } = await startRes.json();
                const testAttemptId = startData._id;
                const q0 = startData.questions[0];

                let releaseAnswerSave = null;
                const answerSavePaused = new Promise((resolve) => {
                    releaseAnswerSave = resolve;
                });
                let resumeAnswerSave = null;
                const answerSaveCanProceed = new Promise((resolve) => {
                    resumeAnswerSave = resolve;
                });

                let pausedOnce = false;
                AssessmentAttempt.prototype.save = async function (...args) {
                    if (this._id.toString() === testAttemptId && this.status === "IN_PROGRESS" && !pausedOnce) {
                        pausedOnce = true;
                        releaseAnswerSave();
                        await answerSaveCanProceed;
                    }
                    return originalSave.apply(this, args);
                };

                let savePromise = null;
                try {
                    // Launch answer save asynchronously. It reads the document at __v = 0 before submission commits
                    savePromise = learnerB.req(`/api/v1/assessment-attempts/${testAttemptId}/questions/${q0.questionId}/answer`, {
                        method: "PUT",
                        body: JSON.stringify({ answer: "A" }),
                    });

                    // Wait until answer save has entered save() and is paused
                    await answerSavePaused;

                    // Concurrently execute submission. This updates MongoDB to __v = 1 and status = "SUBMITTED"
                    const submitRes = await learnerB.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
                        method: "POST",
                        body: JSON.stringify({ reason: "MANUAL" }),
                    });
                    assert.equal(submitRes.status, 200);

                    // Now resume answer save. Its in-flight save() encounters VersionError, reloads the fresh
                    // document, detects fresh.status === "SUBMITTED", and rejects with 409 ATTEMPT_NOT_IN_PROGRESS!
                    resumeAnswerSave();
                    const saveRes = await savePromise;
                    assert.equal(saveRes.status, 409, "Must reject answer saving on submitted attempt");
                    const saveBody = await saveRes.json();
                    assert.equal(saveBody.error.code, "ATTEMPT_NOT_IN_PROGRESS");

                    // Assert full database state: attempt remains submitted and was NOT mutated by the racing answer save
                    const inDb = await AssessmentAttempt.findById(testAttemptId);
                    assert.equal(inDb.status, "SUBMITTED");
                    assert.ok(inDb.submittedAt instanceof Date);
                    assert.equal(inDb.submissionReason, "MANUAL");
                    assert.equal(inDb.marksAwarded, 0);
                    assert.equal(inDb.totalMarks, 10);
                    assert.equal(inDb.scorePercent, 0);
                    assert.equal(inDb.passed, false);
                    assert.equal(inDb.answers.length, 0);
                } finally {
                    // Failure-safe barrier release: prevent blocked requests on error or assertion failure
                    resumeAnswerSave?.();
                    if (savePromise) {
                        await savePromise.catch(() => {});
                    }
                }
            }
        } finally {
            AssessmentAttempt.prototype.save = originalSave;
        }
    });

    await t.test("Test 4 — Concurrent deadline finalization persists exactly once without 500 errors", async () => {
        const learner = await createTestLearner("DeadlineConcurrent");
        const startRes = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const { data: startData } = await startRes.json();
        const testAttemptId = startData._id;

        // Force deadline into the past directly in DB
        await AssessmentAttempt.updateOne(
            { _id: testAttemptId },
            { $set: { deadlineAt: new Date(Date.now() - 60000), deadlineReason: "TIME_LIMIT" } }
        );

        // Concurrently query attempt from multiple entrypoints
        const [get1, get2, historyRes] = await Promise.all([
            learner.req(`/api/v1/assessment-attempts/${testAttemptId}`),
            learner.req(`/api/v1/assessment-attempts/${testAttemptId}`),
            learner.req(`/api/v1/assessments/${assessmentId}/attempts`),
        ]);

        assert.equal(get1.status, 200);
        assert.equal(get2.status, 200);
        assert.equal(historyRes.status, 200);

        const body1 = await get1.json();
        const body2 = await get2.json();
        assert.equal(body1.data.status, "SUBMITTED");
        assert.equal(body2.data.status, "SUBMITTED");
        assert.equal(body1.data.submissionReason, "TIME_LIMIT");

        // Verify database has exactly one consistent finalized document
        const inDb = await AssessmentAttempt.findById(testAttemptId);
        assert.equal(inDb.status, "SUBMITTED");
        assert.equal(inDb.submissionReason, "TIME_LIMIT");
        assert.ok(inDb.submittedAt instanceof Date);
        assert.equal(inDb.marksAwarded, 0);
        assert.equal(inDb.totalMarks, 10);
        assert.equal(inDb.scorePercent, 0);
        assert.equal(inDb.passed, false);
        assert.equal(inDb.answers.length, 0);
    });

    await t.test("Test 5 — Deadline and manual submission race produces consistent state without double finalization", async () => {
        const learner = await createTestLearner("DeadlineVsManual");
        const startRes = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const { data: startData } = await startRes.json();
        const testAttemptId = startData._id;

        // Set deadline in the past
        await AssessmentAttempt.updateOne(
            { _id: testAttemptId },
            { $set: { deadlineAt: new Date(Date.now() - 5000), deadlineReason: "TIME_LIMIT" } }
        );

        // Race manual submission and get attempt
        const [submitRes, getRes] = await Promise.all([
            learner.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, {
                method: "POST",
                body: JSON.stringify({ reason: "MANUAL" }),
            }),
            learner.req(`/api/v1/assessment-attempts/${testAttemptId}`),
        ]);

        assert.equal(submitRes.status, 200);
        assert.equal(getRes.status, 200);

        const submitBody = await submitRes.json();
        const getBody = await getRes.json();
        assert.equal(submitBody.data.status, "SUBMITTED");
        assert.equal(getBody.data.status, "SUBMITTED");
        // Because deadline has passed, submissionReason must be TIME_LIMIT
        assert.equal(submitBody.data.submissionReason, "TIME_LIMIT");
        assert.equal(getBody.data.submissionReason, "TIME_LIMIT");

        // Verify database state directly
        const inDb = await AssessmentAttempt.findById(testAttemptId);
        assert.equal(inDb.status, "SUBMITTED");
        assert.equal(inDb.submissionReason, "TIME_LIMIT");
        assert.ok(inDb.submittedAt instanceof Date);
        assert.equal(inDb.marksAwarded, 0);
        assert.equal(inDb.totalMarks, 10);
        assert.equal(inDb.scorePercent, 0);
        assert.equal(inDb.passed, false);
        assert.equal(inDb.answers.length, 0);
    });

    await t.test("Test 6 — Submitted answers are immutable", async () => {
        const learner = await createTestLearner("ImmutableAnswers");
        const startRes = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        const { data: startData } = await startRes.json();
        const testAttemptId = startData._id;
        const q0 = startData.questions[0];

        // Save answer A
        await learner.req(`/api/v1/assessment-attempts/${testAttemptId}/questions/${q0.questionId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "A" }),
        });

        // Submit attempt
        await learner.req(`/api/v1/assessment-attempts/${testAttemptId}/submit`, { method: "POST", body: JSON.stringify({}) });

        // Capture DB snapshot
        const before = await AssessmentAttempt.findById(testAttemptId).lean();

        // Try to overwrite answer with B
        const overwriteRes = await learner.req(`/api/v1/assessment-attempts/${testAttemptId}/questions/${q0.questionId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "B" }),
        });
        assert.equal(overwriteRes.status, 409);
        const overwriteBody = await overwriteRes.json();
        assert.equal(overwriteBody.error.code, "ATTEMPT_NOT_IN_PROGRESS");

        // Verify DB document has not mutated at all
        const after = await AssessmentAttempt.findById(testAttemptId).lean();
        assert.deepEqual(after.answers, before.answers);
        assert.equal(after.marksAwarded, before.marksAwarded);
        assert.equal(after.scorePercent, before.scorePercent);
        assert.equal(after.submittedAt.getTime(), before.submittedAt.getTime());
    });

    await t.test("Test 7 — Concurrent attempt starts prevent duplicate active attempts and attempt numbers", async () => {
        const learner = await createTestLearner("ConcurrentStart");

        // Issue two start requests concurrently
        const [res1, res2] = await Promise.all([
            learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" }),
            learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" }),
        ]);

        const statuses = [res1.status, res2.status].sort();
        assert.equal(statuses[0], 201, "One request must succeed with 201");
        assert.equal(statuses[1], 409, "The other request must fail with 409");

        const failedRes = res1.status === 409 ? res1 : res2;
        const failedBody = await failedRes.json();
        assert.ok(
            ["ATTEMPT_ALREADY_IN_PROGRESS", "ATTEMPT_START_CONFLICT"].includes(failedBody.error.code),
            `Expected conflict error code, got ${failedBody.error.code}`
        );

        // Verify only 1 active attempt exists in database
        const activeAttempts = await AssessmentAttempt.find({ assessmentId, learnerId: learner.id, status: "IN_PROGRESS" });
        assert.equal(activeAttempts.length, 1);
        assert.equal(activeAttempts[0].attemptNumber, 1);
    });

    await t.test("Test 8 — Answers cannot be accepted after attempt deadline has expired", async () => {
        const learner = await createTestLearner("DeadlineAnswerReject");
        const startRes = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 201);
        const { data: startData } = await startRes.json();
        const testAttemptId = startData._id;
        const q0 = startData.questions[0];
        const q1 = startData.questions[1];

        // Save answer to question 0 while in progress
        const validAnswerRes = await learner.req(
            `/api/v1/assessment-attempts/${testAttemptId}/questions/${q0.questionId}/answer`,
            { method: "PUT", body: JSON.stringify({ answer: "A" }) }
        );
        assert.equal(validAnswerRes.status, 200);

        // Force attempt deadline into the past directly in DB
        await AssessmentAttempt.updateOne(
            { _id: testAttemptId },
            { $set: { deadlineAt: new Date(Date.now() - 30000), deadlineReason: "TIME_LIMIT" } }
        );

        // Attempt to save an answer after deadline has passed
        const lateAnswerRes = await learner.req(
            `/api/v1/assessment-attempts/${testAttemptId}/questions/${q1.questionId}/answer`,
            { method: "PUT", body: JSON.stringify({ answer: "B" }) }
        );
        assert.equal(lateAnswerRes.status, 409);
        const lateAnswerBody = await lateAnswerRes.json();
        assert.equal(lateAnswerBody.error.code, "ATTEMPT_NOT_IN_PROGRESS");

        // Verify database state: attempt is finalized as SUBMITTED (TIME_LIMIT) and question 1 answer is NOT saved
        const inDb = await AssessmentAttempt.findById(testAttemptId);
        assert.equal(inDb.status, "SUBMITTED");
        assert.equal(inDb.submissionReason, "TIME_LIMIT");
        assert.ok(inDb.submittedAt instanceof Date);
        assert.equal(inDb.answers.length, 1);
        assert.equal(inDb.answers[0].questionId.toString(), q0.questionId);
        assert.equal(inDb.answers[0].answer, "A");
        assert.equal(inDb.marksAwarded, 2);
        assert.equal(inDb.totalMarks, 10);
        assert.equal(inDb.scorePercent, 20);
        assert.equal(inDb.passed, false);
    });

    await t.test("Test 9 — Assessment and Enrollment write-fence increments persist on attempt creation", async () => {
        const learner = await createTestLearner("WriteFencePersistence");
        const assessmentBefore = await Assessment.findById(assessmentId).select("+attemptVersion");
        const initialAssessmentVer = assessmentBefore.attemptVersion ?? 0;

        const enrollmentBefore = await Enrollment.findOne({ learnerId: learner.id, courseId }).select("+attemptVersion");
        const initialEnrollmentVer = enrollmentBefore.attemptVersion ?? 0;

        // Start first attempt
        const start1 = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(start1.status, 201);
        const attempt1 = (await start1.json()).data;

        // Assert write fence increments persisted in MongoDB
        const assessmentAfter1 = await Assessment.findById(assessmentId).select("+attemptVersion");
        assert.equal(assessmentAfter1.attemptVersion, initialAssessmentVer + 1);

        const enrollmentAfter1 = await Enrollment.findOne({ learnerId: learner.id, courseId }).select("+attemptVersion");
        assert.equal(enrollmentAfter1.attemptVersion, initialEnrollmentVer + 1);

        // Submit first attempt so second attempt can start
        await learner.req(`/api/v1/assessment-attempts/${attempt1._id}/submit`, { method: "POST", body: JSON.stringify({}) });

        // Start second attempt
        const start2 = await learner.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(start2.status, 201);

        // Assert second write fence increments persisted
        const assessmentAfter2 = await Assessment.findById(assessmentId).select("+attemptVersion");
        assert.equal(assessmentAfter2.attemptVersion, initialAssessmentVer + 2);

        const enrollmentAfter2 = await Enrollment.findOne({ learnerId: learner.id, courseId }).select("+attemptVersion");
        assert.equal(enrollmentAfter2.attemptVersion, initialEnrollmentVer + 2);
    });

    await t.test("Test 10 — Write fences serialize correctly against assessment and enrollment lifecycle changes", async () => {
        // Part 1: Assessment fence failure -> rejects with 409 ASSESSMENT_STATE_CHANGED
        const learnerA = await createTestLearner("AssessmentFenceSerialize");
        const originalAssessmentUpdateOne = Assessment.updateOne;
        try {
            Assessment.updateOne = async function (filter, update, options) {
                if (filter?.status === "PUBLISHED" && options?.session) {
                    return { modifiedCount: 0, acknowledged: true };
                }
                return originalAssessmentUpdateOne.call(this, filter, update, options);
            };

            const startRes = await learnerA.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
            assert.equal(startRes.status, 409);
            const body = await startRes.json();
            assert.equal(body.error.code, "ASSESSMENT_STATE_CHANGED");
        } finally {
            Assessment.updateOne = originalAssessmentUpdateOne;
        }

        // Part 2: Enrollment fence failure -> rejects with 409 ENROLLMENT_STATE_CHANGED
        const learnerB = await createTestLearner("EnrollmentFenceSerialize");
        const originalEnrollmentUpdateOne = Enrollment.updateOne;
        try {
            Enrollment.updateOne = async function (filter, update, options) {
                if (filter?.status === "ACTIVE" && options?.session) {
                    return { modifiedCount: 0, acknowledged: true };
                }
                return originalEnrollmentUpdateOne.call(this, filter, update, options);
            };

            const startRes = await learnerB.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
            assert.equal(startRes.status, 409);
            const body = await startRes.json();
            assert.equal(body.error.code, "ENROLLMENT_STATE_CHANGED");
        } finally {
            Enrollment.updateOne = originalEnrollmentUpdateOne;
        }

        // Part 3: Inactive enrollment state verification -> rejects with 403 ACTIVE_ENROLLMENT_REQUIRED
        const learnerC = await createTestLearner("WithdrawnEnrollment");
        await Enrollment.updateOne({ learnerId: learnerC.id, courseId }, { $set: { status: "WITHDRAWN" } });
        const startResC = await learnerC.req(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST" });
        assert.equal(startResC.status, 403);
        const bodyC = await startResC.json();
        assert.equal(bodyC.error.code, "ACTIVE_ENROLLMENT_REQUIRED");
    });
});
