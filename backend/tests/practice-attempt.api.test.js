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
import { Practice } from "../src/modules/practice/models/practice.model.js";
import { PracticeAttempt } from "../src/modules/practice/models/practiceAttempt.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("Practice Execution & Attempt HTTP API", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const learnerId = new mongoose.Types.ObjectId();
    const otherLearnerId = new mongoose.Types.ObjectId();
    const unenrolledLearnerId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const otherCourseId = new mongoose.Types.ObjectId();
    const createdUserIds = [instructorId, learnerId, otherLearnerId, unenrolledLearnerId];

    let connected = false;
    let server;
    let baseUrl;

    let publishedPracticeId;
    let draftPracticeId;
    let archivedPracticeId;
    let topicId;
    let qSingleId;
    let qMultiId;
    let qTfId;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await PracticeAttempt.deleteMany({ courseId });
            await Practice.deleteMany({ createdBy: instructorId });
            await Question.deleteMany({ createdBy: instructorId });
            await QuestionBank.deleteMany({ createdBy: instructorId });
            await Enrollment.deleteMany({ courseId });
            await Topic.deleteMany({ courseId });
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
    ]);

    await User.create([
        { _id: instructorId, name: "Practice Instructor", email: `practice-inst-${instructorId}@example.test`, role: "INSTRUCTOR", status: "ACTIVE" },
        { _id: learnerId, name: "Practice Learner 1", email: `practice-learner-1-${learnerId}@example.test`, role: "LEARNER", status: "ACTIVE" },
        { _id: otherLearnerId, name: "Practice Learner 2", email: `practice-learner-2-${otherLearnerId}@example.test`, role: "LEARNER", status: "ACTIVE" },
        { _id: unenrolledLearnerId, name: "Practice Unenrolled", email: `practice-unenrolled-${unenrolledLearnerId}@example.test`, role: "LEARNER", status: "ACTIVE" },
    ]);

    const course = await Course.create({
        _id: courseId,
        title: "Practice Execution Course",
        description: "Course fixture for testing practice workflows.",
        createdBy: instructorId,
        domain: "Computer Science",
        category: "Databases",
        difficulty: "BEGINNER",
        objectives: [],
        status: "PUBLISHED",
    });

    const topic = await Topic.create({
        courseId: course._id,
        title: "Practice Execution Topic",
        learningObjectives: [],
        order: 1,
    });
    topicId = topic._id.toString();

    const bank = await QuestionBank.create({
        courseId: course._id,
        topicId: topic._id,
        createdBy: instructorId,
        title: "Practice Execution Bank",
        status: "ACTIVE",
    });

    // 1. MCQ_SINGLE question
    const qSingle = await Question.create({
        questionBankId: bank._id,
        courseId: course._id,
        topicId: topic._id,
        createdBy: instructorId,
        questionText: "What is 2 + 2?",
        normalizedQuestionText: "what is 2 + 2?",
        type: "MCQ_SINGLE",
        options: [{ key: "A", text: "3" }, { key: "B", text: "4" }, { key: "C", text: "5" }],
        correctAnswer: "B",
        explanation: "2 plus 2 equals 4.",
        marks: 2,
        difficulty: "EASY",
        status: "ACTIVE",
    });
    qSingleId = qSingle._id.toString();

    // 2. MCQ_MULTIPLE question
    const qMulti = await Question.create({
        questionBankId: bank._id,
        courseId: course._id,
        topicId: topic._id,
        createdBy: instructorId,
        questionText: "Select all prime numbers below:",
        normalizedQuestionText: "select all prime numbers below:",
        type: "MCQ_MULTIPLE",
        options: [{ key: "A", text: "2" }, { key: "B", text: "3" }, { key: "C", text: "4" }, { key: "D", text: "5" }],
        correctAnswer: ["A", "B", "D"],
        explanation: "2, 3, and 5 are prime numbers; 4 is composite.",
        marks: 3,
        difficulty: "MEDIUM",
        status: "ACTIVE",
    });
    qMultiId = qMulti._id.toString();

    // 3. TRUE_FALSE question
    const qTf = await Question.create({
        questionBankId: bank._id,
        courseId: course._id,
        topicId: topic._id,
        createdBy: instructorId,
        questionText: "The sky is usually blue on a clear day.",
        normalizedQuestionText: "the sky is usually blue on a clear day.",
        type: "TRUE_FALSE",
        options: [],
        correctAnswer: "TRUE",
        explanation: "Rayleigh scattering causes the sky to appear blue.",
        marks: 1,
        difficulty: "EASY",
        status: "ACTIVE",
    });
    qTfId = qTf._id.toString();

    // 1. Published Practice
    const publishedPractice = await Practice.create({
        courseId: course._id,
        topicId: topic._id,
        questionBankId: bank._id,
        createdBy: instructorId,
        title: "Published Practice Activity",
        description: "Reinforce understanding with targeted questions.",
        questionIds: [qSingle._id, qMulti._id, qTf._id],
        contributeToLearningEvidence: true,
        status: "PUBLISHED",
    });
    publishedPracticeId = publishedPractice._id.toString();

    // 2. Draft Practice
    const draftPractice = await Practice.create({
        courseId: course._id,
        topicId: topic._id,
        questionBankId: bank._id,
        createdBy: instructorId,
        title: "Draft Practice Activity",
        questionIds: [qSingle._id],
        status: "DRAFT",
    });
    draftPracticeId = draftPractice._id.toString();

    // 3. Archived Practice
    const archivedPractice = await Practice.create({
        courseId: course._id,
        topicId: topic._id,
        questionBankId: bank._id,
        createdBy: instructorId,
        title: "Archived Practice Activity",
        questionIds: [qSingle._id],
        status: "ARCHIVED",
    });
    archivedPracticeId = archivedPractice._id.toString();

    // Enroll learnerId and otherLearnerId in course
    await Enrollment.create([
        { learnerId, courseId, status: "ACTIVE" },
        { learnerId: otherLearnerId, courseId, status: "ACTIVE" },
    ]);

    const learnerToken = jwt.sign({ sub: learnerId.toString(), role: "LEARNER" }, JWT_ACCESS_SECRET, { expiresIn: "10m" });
    const otherLearnerToken = jwt.sign({ sub: otherLearnerId.toString(), role: "LEARNER" }, JWT_ACCESS_SECRET, { expiresIn: "10m" });
    const unenrolledToken = jwt.sign({ sub: unenrolledLearnerId.toString(), role: "LEARNER" }, JWT_ACCESS_SECRET, { expiresIn: "10m" });
    const instructorToken = jwt.sign({ sub: instructorId.toString(), role: "INSTRUCTOR" }, JWT_ACCESS_SECRET, { expiresIn: "10m" });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const request = (url, options = {}) => {
        const token = options.token !== undefined ? options.token : learnerToken;
        return fetch(`${baseUrl}${url}`, {
            ...options,
            headers: {
                ...(options.body ? { "content-type": "application/json" } : {}),
                ...(token ? { authorization: `Bearer ${token}` } : {}),
                ...(options.headers ?? {}),
            },
        });
    };

    // -------------------------------------------------------------------------
    // 1. Eligible learner can discover a published practice
    // -------------------------------------------------------------------------
    await t.test("1. Eligible enrolled learner can discover a published practice", async () => {
        const topicRes = await request(`/api/v1/topics/${topicId}/practices`);
        const topicBody = await topicRes.json();
        assert.equal(topicRes.status, 200, JSON.stringify(topicBody));
        assert.ok(Array.isArray(topicBody.data));
        assert.equal(topicBody.data.length, 1);
        assert.equal(topicBody.data[0]._id, publishedPracticeId);
        assert.equal(topicBody.data[0].title, "Published Practice Activity");
        assert.equal(topicBody.data[0].questionCount, 3);
        assert.equal("createdBy" in topicBody.data[0], false, "Internal createdBy field must not be exposed");
        assert.equal("questionBankId" in topicBody.data[0], false, "Internal questionBankId field must not be exposed");

        const courseRes = await request(`/api/v1/courses/${courseId}/practices`);
        const courseBody = await courseRes.json();
        assert.equal(courseRes.status, 200);
        assert.equal(courseBody.data.length, 1);
        assert.equal(courseBody.data[0]._id, publishedPracticeId);

        const singleRes = await request(`/api/v1/practices/${publishedPracticeId}`);
        const singleBody = await singleRes.json();
        assert.equal(singleRes.status, 200);
        assert.equal(singleBody.data._id, publishedPracticeId);
        assert.equal("questionIds" in singleBody.data, false);
    });

    // -------------------------------------------------------------------------
    // 2. Draft, archived, or ineligible practices are inaccessible (404)
    // -------------------------------------------------------------------------
    await t.test("2. Draft and archived practices are inaccessible to learners", async () => {
        const draftRes = await request(`/api/v1/practices/${draftPracticeId}`);
        assert.equal(draftRes.status, 404);

        const archivedRes = await request(`/api/v1/practices/${archivedPracticeId}`);
        assert.equal(archivedRes.status, 404);
    });

    // -------------------------------------------------------------------------
    // 3. Required enrollment is enforced
    // -------------------------------------------------------------------------
    await t.test("3. Required enrollment is enforced", async () => {
        const res = await request(`/api/v1/topics/${topicId}/practices`, { token: unenrolledToken });
        assert.equal(res.status, 403);
        const body = await res.json();
        assert.equal(body.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, {
            method: "POST",
            token: unenrolledToken,
        });
        assert.equal(startRes.status, 403);
        const startBody = await startRes.json();
        assert.equal(startBody.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");
    });

    // -------------------------------------------------------------------------
    // 5. Start response does not reveal answer keys or explanations
    // -------------------------------------------------------------------------
    let activeAttemptId;
    await t.test("5. Start response does not reveal answer keys or explanations", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        assert.equal(startRes.status, 201, JSON.stringify(startBody));
        assert.equal(startBody.data.status, "IN_PROGRESS");
        assert.equal(startBody.data.attemptNumber, 1);
        assert.equal(startBody.data.totalQuestions, 3);
        assert.equal(startBody.data.totalMarks, 6);
        assert.equal(startBody.data.marksAwarded, null);
        assert.equal(startBody.data.scorePercent, null);
        assert.equal(startBody.data.correctCount, null);

        for (const question of startBody.data.questions) {
            assert.equal("correctAnswer" in question, false, "Question must not contain correctAnswer before submission");
            assert.equal("explanation" in question, false, "Question must not contain explanation before submission");
            assert.equal("isCorrect" in question, false, "Question must not contain isCorrect before submission");
        }
        activeAttemptId = startBody.data._id;
    });

    // -------------------------------------------------------------------------
    // 4. Learner cannot read another learner's attempt
    // -------------------------------------------------------------------------
    await t.test("4. Learner cannot read another learner's attempt", async () => {
        const crossRes = await request(`/api/v1/practice-attempts/${activeAttemptId}`, { token: otherLearnerToken });
        assert.equal(crossRes.status, 404);
        const crossBody = await crossRes.json();
        assert.equal(crossBody.error?.code, "ATTEMPT_NOT_FOUND");
    });

    // -------------------------------------------------------------------------
    // 4b. Owning learner fetching IN_PROGRESS attempt by ID does not disclose correctness or answer keys
    // -------------------------------------------------------------------------
    await t.test("4b. Owning learner fetching IN_PROGRESS attempt by ID does not disclose correctness or answer keys", async () => {
        const getRes = await request(`/api/v1/practice-attempts/${activeAttemptId}`);
        assert.equal(getRes.status, 200);
        const getBody = await getRes.json();
        assert.equal(getBody.success, true);
        assert.equal(getBody.data._id, activeAttemptId);
        assert.equal(getBody.data.status, "IN_PROGRESS");
        assert.equal(getBody.data.marksAwarded, null);
        assert.equal(getBody.data.scorePercent, null);
        assert.equal(getBody.data.correctCount, null);

        for (const question of getBody.data.questions) {
            assert.equal("correctAnswer" in question, false, "Question must not contain correctAnswer during IN_PROGRESS fetch");
            assert.equal("explanation" in question, false, "Question must not contain explanation during IN_PROGRESS fetch");
            assert.equal("isCorrect" in question, false, "Question must not contain isCorrect during IN_PROGRESS fetch");
            assert.equal(question.isAnswered, false, "Unanswered question must have isAnswered: false");
            assert.equal(question.answer, null, "Unanswered question must have null answer");
        }
    });

    // -------------------------------------------------------------------------
    // 9. Invalid option IDs and malformed answer shapes are rejected
    // -------------------------------------------------------------------------
    await t.test("9. Invalid option IDs and malformed answer shapes are rejected", async () => {
        // Unknown option key for MCQ_SINGLE
        const invalidOptionRes = await request(`/api/v1/practice-attempts/${activeAttemptId}/questions/${qSingleId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "Z" }),
        });
        assert.equal(invalidOptionRes.status, 400);
        const invalidOptionBody = await invalidOptionRes.json();
        assert.equal(invalidOptionBody.error?.code, "INVALID_ANSWER_OPTION");

        // Malformed TRUE_FALSE answer
        const invalidTfRes = await request(`/api/v1/practice-attempts/${activeAttemptId}/questions/${qTfId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "MAYBE" }),
        });
        assert.equal(invalidTfRes.status, 400);

        // Malformed MCQ_MULTIPLE answer (not an array)
        const invalidMultiRes = await request(`/api/v1/practice-attempts/${activeAttemptId}/questions/${qMultiId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "A" }),
        });
        assert.equal(invalidMultiRes.status, 400);
    });

    // -------------------------------------------------------------------------
    // 6, 7, 8. Server-side scoring for MCQ_SINGLE, MCQ_MULTIPLE, and TRUE_FALSE
    // -------------------------------------------------------------------------
    await t.test("6, 7, 8. Server-side scoring evaluates MCQ_SINGLE, MCQ_MULTIPLE, and TRUE_FALSE correctly", async () => {
        // Save answers:
        // qSingle: "B" (Correct, 2 marks)
        const a1Res = await request(`/api/v1/practice-attempts/${activeAttemptId}/questions/${qSingleId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "B" }),
        });
        assert.equal(a1Res.status, 200);
        const a1Body = await a1Res.json();
        const savedQ1 = a1Body.data.questions.find((q) => q.questionId === qSingleId);
        assert.equal("correctAnswer" in savedQ1, false, "correctAnswer must not leak when saving answer during in-progress attempt");
        assert.equal("explanation" in savedQ1, false, "explanation must not leak when saving answer during in-progress attempt");
        assert.equal("isCorrect" in savedQ1, false, "isCorrect must not leak when saving answer during in-progress attempt");
        assert.equal(savedQ1.isAnswered, true, "isAnswered must be true for saved answer");

        // Verify GET /api/v1/practice-attempts/:attemptId while in-progress with a saved answer
        const midAttemptRes = await request(`/api/v1/practice-attempts/${activeAttemptId}`);
        assert.equal(midAttemptRes.status, 200);
        const midAttemptBody = await midAttemptRes.json();
        assert.equal(midAttemptBody.data.status, "IN_PROGRESS");
        assert.equal(midAttemptBody.data.marksAwarded, null);
        const fetchedSingle = midAttemptBody.data.questions.find((q) => q.questionId === qSingleId);
        assert.equal(fetchedSingle.answer, "B", "Saved answer must be returned to owner on fetch");
        assert.equal(fetchedSingle.isAnswered, true);
        assert.equal("correctAnswer" in fetchedSingle, false, "GET must not disclose correctAnswer for saved answer while in-progress");
        assert.equal("explanation" in fetchedSingle, false, "GET must not disclose explanation for saved answer while in-progress");
        assert.equal("isCorrect" in fetchedSingle, false, "GET must not disclose isCorrect for saved answer while in-progress");

        const fetchedUnsaved = midAttemptBody.data.questions.find((q) => q.questionId === qMultiId);
        assert.equal(fetchedUnsaved.isAnswered, false);
        assert.equal("correctAnswer" in fetchedUnsaved, false);
        assert.equal("explanation" in fetchedUnsaved, false);
        assert.equal("isCorrect" in fetchedUnsaved, false);

        // qMulti: ["A", "B", "D"] (Exact match, 3 marks)
        const a2Res = await request(`/api/v1/practice-attempts/${activeAttemptId}/questions/${qMultiId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: ["D", "A", "B"] }), // Order insensitive
        });
        assert.equal(a2Res.status, 200);

        // qTf: "TRUE" (Correct, 1 mark)
        const a3Res = await request(`/api/v1/practice-attempts/${activeAttemptId}/questions/${qTfId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "TRUE" }),
        });
        assert.equal(a3Res.status, 200);

        // Submit the attempt
        const submitRes = await request(`/api/v1/practice-attempts/${activeAttemptId}/submit`, {
            method: "POST",
            body: JSON.stringify({}),
        });
        const submitBody = await submitRes.json();
        assert.equal(submitRes.status, 200, JSON.stringify(submitBody));
        assert.equal(submitBody.data.status, "SUBMITTED");
        assert.equal(submitBody.data.totalMarks, 6);
        assert.equal(submitBody.data.marksAwarded, 6);
        assert.equal(submitBody.data.scorePercent, 100);
        assert.equal(submitBody.data.correctCount, 3);

        // Explanations and correct answers must now be revealed
        for (const question of submitBody.data.questions) {
            assert.ok("correctAnswer" in question, "correctAnswer must be revealed upon submission");
            assert.ok("explanation" in question, "explanation must be revealed upon submission");
            assert.equal(question.isCorrect, true);
        }

        // Verify GET /api/v1/practice-attempts/:attemptId after submission reveals full results
        const postSubmitRes = await request(`/api/v1/practice-attempts/${activeAttemptId}`);
        assert.equal(postSubmitRes.status, 200);
        const postSubmitBody = await postSubmitRes.json();
        assert.equal(postSubmitBody.data.status, "SUBMITTED");
        assert.equal(postSubmitBody.data.marksAwarded, 6);
        for (const question of postSubmitBody.data.questions) {
            assert.ok("correctAnswer" in question, "correctAnswer must be revealed on GET after submission");
            assert.ok("explanation" in question, "explanation must be revealed on GET after submission");
            assert.equal(question.isCorrect, true);
            assert.equal(question.isAnswered, true);
        }
    });

    // -------------------------------------------------------------------------
    // 7b. Multiple-choice scoring documented rule: partial match gives 0 marks
    // -------------------------------------------------------------------------
    await t.test("7b. MCQ_MULTIPLE partial match gives 0 marks (no partial credit rule)", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        assert.equal(startRes.status, 201);
        const secondAttemptId = startBody.data._id;

        // Partial match: only ["A", "B"] instead of ["A", "B", "D"]
        await request(`/api/v1/practice-attempts/${secondAttemptId}/questions/${qMultiId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: ["A", "B"] }),
        });
        // Correct qTf: "TRUE"
        await request(`/api/v1/practice-attempts/${secondAttemptId}/questions/${qTfId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "TRUE" }),
        });

        const submitRes = await request(`/api/v1/practice-attempts/${secondAttemptId}/submit`, { method: "POST" });
        const submitBody = await submitRes.json();
        assert.equal(submitRes.status, 200);
        // marksAwarded should be 1 (only qTf), qMulti gave 0 marks
        assert.equal(submitBody.data.marksAwarded, 1);
        const multiQ = submitBody.data.questions.find((q) => q.questionId === qMultiId);
        assert.equal(multiQ.isCorrect, false);
        const singleQ = submitBody.data.questions.find((q) => q.questionId === qSingleId);
        assert.equal(singleQ.isAnswered, false, "Unanswered question must have isAnswered false");
        assert.equal(singleQ.isCorrect, false);
    });

    // -------------------------------------------------------------------------
    // 10. Client-supplied scores or correctness values cannot influence results
    // -------------------------------------------------------------------------
    await t.test("10. Client-supplied scores or correctness values cannot influence results", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        const spoofAttemptId = startBody.data._id;

        const submitRes = await request(`/api/v1/practice-attempts/${spoofAttemptId}/submit`, {
            method: "POST",
            body: JSON.stringify({
                marksAwarded: 999,
                scorePercent: 100,
                correctCount: 99,
                answers: [
                    { questionId: qSingleId, answer: "C" }, // wrong answer
                ],
            }),
        });
        const submitBody = await submitRes.json();
        assert.equal(submitRes.status, 200);
        assert.equal(submitBody.data.marksAwarded, 0, "Server must calculate score, ignoring client spoofing");
        assert.equal(submitBody.data.scorePercent, 0);
    });

    // -------------------------------------------------------------------------
    // 11. Repeated submission follows defined idempotency policy
    // -------------------------------------------------------------------------
    await t.test("11. Repeated submission is idempotent and returns existing result", async () => {
        const first = await request(`/api/v1/practice-attempts/${activeAttemptId}/submit`, { method: "POST" });
        const firstBody = await first.json();
        assert.equal(first.status, 200);
        assert.equal(firstBody.data.status, "SUBMITTED");
        assert.equal(firstBody.data.marksAwarded, 6);

        const second = await request(`/api/v1/practice-attempts/${activeAttemptId}/submit`, { method: "POST" });
        const secondBody = await second.json();
        assert.equal(second.status, 200);
        assert.equal(secondBody.data.marksAwarded, 6);

        // Attempting to change answers after submission is rejected
        const answerChangeRes = await request(`/api/v1/practice-attempts/${activeAttemptId}/questions/${qSingleId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "A" }),
        });
        assert.equal(answerChangeRes.status, 409);
        const answerChangeBody = await answerChangeRes.json();
        assert.equal(answerChangeBody.error?.code, "ATTEMPT_NOT_IN_PROGRESS");
    });

    // -------------------------------------------------------------------------
    // 12. Concurrent requests cannot produce inconsistent final scores
    // -------------------------------------------------------------------------
    await t.test("12. Concurrent submissions cannot produce inconsistent final scores", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        const concurrentAttemptId = startBody.data._id;

        await request(`/api/v1/practice-attempts/${concurrentAttemptId}/questions/${qSingleId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "B" }),
        });

        // Fire 5 concurrent submission requests
        const results = await Promise.all(
            Array.from({ length: 5 }, () =>
                request(`/api/v1/practice-attempts/${concurrentAttemptId}/submit`, { method: "POST" })
            )
        );

        for (const res of results) {
            assert.equal(res.status, 200);
            const body = await res.json();
            assert.equal(body.data.status, "SUBMITTED");
            assert.equal(body.data.marksAwarded, 2);
        }
    });

    // -------------------------------------------------------------------------
    // 13. Results remain stable if underlying question changes after attempt start
    // -------------------------------------------------------------------------
    await t.test("13. Results remain stable if underlying question changes after attempt start", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        const stableAttemptId = startBody.data._id;

        // Change the question in the DB directly
        await Question.updateOne({ _id: qSingleId }, { $set: { questionText: "MUTATED QUESTION TEXT", correctAnswer: "C" } });

        // Submit with the original correct answer "B"
        await request(`/api/v1/practice-attempts/${stableAttemptId}/questions/${qSingleId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "B" }),
        });
        const submitRes = await request(`/api/v1/practice-attempts/${stableAttemptId}/submit`, { method: "POST" });
        const submitBody = await submitRes.json();
        assert.equal(submitRes.status, 200);

        const singleQ = submitBody.data.questions.find((q) => q.questionId === qSingleId);
        assert.equal(singleQ.questionText, "What is 2 + 2?", "Snapshot text must be preserved");
        assert.equal(singleQ.correctAnswer, "B", "Snapshot correctAnswer must be preserved");
        assert.equal(singleQ.isCorrect, true, "Snapshot must evaluate according to stored key");

        // Restore question
        await Question.updateOne({ _id: qSingleId }, { $set: { questionText: "What is 2 + 2?", correctAnswer: "B" } });
    });

    // -------------------------------------------------------------------------
    // 14. Repeated practice attempts are supported and history is tracked
    // -------------------------------------------------------------------------
    await t.test("14. Repeated practice attempts are supported without caps", async () => {
        const historyRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`);
        const historyBody = await historyRes.json();
        assert.equal(historyRes.status, 200);
        assert.ok(Array.isArray(historyBody.data.attempts));
        const initialCount = historyBody.data.attempts.length;

        // Start another attempt
        const nextRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        assert.equal(nextRes.status, 201);
        const nextBody = await nextRes.json();
        assert.equal(nextBody.data.attemptNumber, initialCount + 1);

        // Submit it
        await request(`/api/v1/practice-attempts/${nextBody.data._id}/submit`, { method: "POST" });

        // Verify history grew
        const updatedHistoryRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`);
        const updatedHistoryBody = await updatedHistoryRes.json();
        assert.equal(updatedHistoryBody.data.attempts.length, initialCount + 1);
        assert.equal(updatedHistoryBody.data.attempts[0].attemptNumber, initialCount + 1);
    });

    // -------------------------------------------------------------------------
    // 15. contributeToLearningEvidence is correctly represented
    // -------------------------------------------------------------------------
    await t.test("15. contributeToLearningEvidence remains correctly represented", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        assert.equal(startRes.status, 201);
        assert.equal(startBody.data.contributeToLearningEvidence, true);
        await request(`/api/v1/practice-attempts/${startBody.data._id}/submit`, { method: "POST" });
    });

    // -------------------------------------------------------------------------
    // 16. Transaction failure does not leave partial attempt state
    // -------------------------------------------------------------------------
    await t.test("16. Transaction failure does not leave partial attempt state", async () => {
        const emptyPractice = await Practice.create({
            courseId,
            topicId,
            questionBankId: bank._id,
            createdBy: instructorId,
            title: "Empty Questions Practice",
            questionIds: [],
            status: "DRAFT",
        });
        // Even if status were set to PUBLISHED directly
        await Practice.updateOne({ _id: emptyPractice._id }, { $set: { status: "PUBLISHED" } });

        const startRes = await request(`/api/v1/practices/${emptyPractice._id}/attempts`, { method: "POST" });
        assert.equal(startRes.status, 409);
        const startBody = await startRes.json();
        assert.equal(startBody.error?.code, "PRACTICE_QUESTION_POOL_EMPTY");

        const found = await PracticeAttempt.find({ practiceId: emptyPractice._id });
        assert.equal(found.length, 0, "No partial attempt document must remain");
    });

    // -------------------------------------------------------------------------
    // 17. Unauthorized and unauthenticated requests are rejected
    // -------------------------------------------------------------------------
    await t.test("17. Unauthorized and unauthenticated requests are rejected", async () => {
        // No token
        const noAuthRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, {
            method: "POST",
            token: null,
        });
        assert.equal(noAuthRes.status, 401);

        // Instructor token (role mismatch)
        const instructorAttemptRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, {
            method: "POST",
            token: instructorToken,
        });
        assert.equal(instructorAttemptRes.status, 403);
    });

    // -------------------------------------------------------------------------
    // 18. Submit-first workflow: answers are saved without leaking correctness or explanations until submission
    // -------------------------------------------------------------------------
    await t.test("18. Submit-first workflow: answers are saved without leaking correctness or explanations until submission", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        assert.equal(startRes.status, 201);
        const testAttemptId = startBody.data._id;

        // Save answer for qSingle only
        const answerRes = await request(`/api/v1/practice-attempts/${testAttemptId}/questions/${qSingleId}/answer`, {
            method: "PUT",
            body: JSON.stringify({ answer: "B" }),
        });
        const answerBody = await answerRes.json();
        assert.equal(answerRes.status, 200);

        const qSingleResult = answerBody.data.questions.find((q) => q.questionId === qSingleId);
        assert.equal(qSingleResult.answer, "B");
        assert.equal(qSingleResult.isAnswered, true);
        assert.equal("isCorrect" in qSingleResult, false, "isCorrect must NOT be revealed during in-progress attempt");
        assert.equal("correctAnswer" in qSingleResult, false, "correctAnswer must NOT be revealed during in-progress attempt");
        assert.equal("explanation" in qSingleResult, false, "explanation must NOT be revealed during in-progress attempt");

        // Unanswered questions must also NOT reveal correctAnswer, explanation, or isCorrect
        const qMultiResult = answerBody.data.questions.find((q) => q.questionId === qMultiId);
        assert.equal(qMultiResult.answer, null);
        assert.equal(qMultiResult.isAnswered, false);
        assert.equal("correctAnswer" in qMultiResult, false);
        assert.equal("explanation" in qMultiResult, false);
        assert.equal("isCorrect" in qMultiResult, false);

        // Submit the attempt: results and explanations are now revealed
        const submitRes = await request(`/api/v1/practice-attempts/${testAttemptId}/submit`, { method: "POST" });
        const submitBody = await submitRes.json();
        assert.equal(submitRes.status, 200);

        const submittedSingle = submitBody.data.questions.find((q) => q.questionId === qSingleId);
        assert.equal(submittedSingle.answer, "B");
        assert.equal(submittedSingle.isAnswered, true);
        assert.equal(submittedSingle.isCorrect, true);
        assert.equal(submittedSingle.correctAnswer, "B");
        assert.equal(submittedSingle.explanation, "2 plus 2 equals 4.");

        const submittedMulti = submitBody.data.questions.find((q) => q.questionId === qMultiId);
        assert.equal(submittedMulti.isAnswered, false);
        assert.equal(submittedMulti.isCorrect, false);
        assert.ok("correctAnswer" in submittedMulti);
        assert.ok("explanation" in submittedMulti);
    });

    // -------------------------------------------------------------------------
    // 19. Enrollment revocation or course availability changes block attempt updates
    // -------------------------------------------------------------------------
    await t.test("19. Enrollment revocation blocks attempt answer saving and submission", async () => {
        const startRes = await request(`/api/v1/practices/${publishedPracticeId}/attempts`, { method: "POST" });
        const startBody = await startRes.json();
        const testAttemptId = startBody.data._id;

        // Revoke active enrollment
        await Enrollment.updateOne({ learnerId, courseId }, { $set: { status: "WITHDRAWN" } });

        try {
            // Attempting to save an answer should fail with 403
            const answerRes = await request(`/api/v1/practice-attempts/${testAttemptId}/questions/${qSingleId}/answer`, {
                method: "PUT",
                body: JSON.stringify({ answer: "B" }),
            });
            assert.equal(answerRes.status, 403);
            const answerBody = await answerRes.json();
            assert.equal(answerBody.error?.code, "ACTIVE_ENROLLMENT_REQUIRED");

            // Attempting to submit should also fail with 403
            const submitRes = await request(`/api/v1/practice-attempts/${testAttemptId}/submit`, { method: "POST" });
            assert.equal(submitRes.status, 403);
        } finally {
            // Restore enrollment
            await Enrollment.updateOne({ learnerId, courseId }, { $set: { status: "ACTIVE" } });
        }

        // Now submission should succeed
        const submitSuccessRes = await request(`/api/v1/practice-attempts/${testAttemptId}/submit`, { method: "POST" });
        assert.equal(submitSuccessRes.status, 200);
    });

    // -------------------------------------------------------------------------
    // 20. Attempt history rejects unpublished practices with 404
    // -------------------------------------------------------------------------
    await t.test("20. Attempt history rejects unpublished practices with 404", async () => {
        const draftHistoryRes = await request(`/api/v1/practices/${draftPracticeId}/attempts`);
        assert.equal(draftHistoryRes.status, 404);

        const archivedHistoryRes = await request(`/api/v1/practices/${archivedPracticeId}/attempts`);
        assert.equal(archivedHistoryRes.status, 404);
    });

    // -------------------------------------------------------------------------
    // 21. Practice attempt execution does not mutate formal AssessmentAttempt or diagnostic pass
    // -------------------------------------------------------------------------
    await t.test("21. Practice attempt execution does not create or mutate AssessmentAttempt", async () => {
        const { AssessmentAttempt } = await import("../src/modules/assessmentAttempt/models/assessmentAttempt.model.js");
        const formalAttempts = await AssessmentAttempt.find({ learnerId, courseId });
        assert.equal(formalAttempts.length, 0, "Practice execution must never create AssessmentAttempt records");
    });
});

