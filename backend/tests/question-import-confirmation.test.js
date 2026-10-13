/**
 * Question Import — Stage 4 Confirmation Integration Tests
 *
 * Covers:
 * 1. A valid preview is confirmed and creates the expected permanent questions.
 * 2. The stored question fields and trusted references are correct.
 * 3. Invalid and duplicate preview rows are not imported.
 * 4. An expired preview is rejected.
 * 5. A preview belonging to another instructor is rejected.
 * 6. A preview for an archived question bank is rejected.
 * 7. A previously confirmed import can be retried without creating more questions (idempotency).
 * 8. Two concurrent confirmation requests cannot duplicate creation.
 * 9. A transaction failure leaves no partially created questions and does not mark the import confirmed.
 * 10. A duplicate introduced after preview generation is handled safely.
 * 11. An import with no eligible rows is handled according to a clearly defined policy.
 * 12. HTTP endpoint POST /api/v1/question-imports/:importId/confirm validation and response.
 *
 * Isolated using TEST_DB_NAME. Cleaned up in after() hook.
 */

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { confirmQuestionImportService } from "../src/modules/question/services/question-import-confirmation.service.js";
import { QuestionImport } from "../src/modules/question/models/question-import.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { User } from "../src/modules/identity/models/user.model.js";
import { normalizeQuestionText } from "../src/shared/utils/textNormalization.js";
import { ApiError } from "../src/shared/errors/ApiError.js";
import app from "../src/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("Question Import Confirmation — Stage 4 Integration Tests", async (t) => {
    const TEST_DB_NAME = process.env.TEST_DB_NAME;
    const MONGODB_URI = process.env.MONGODB_URI;

    assert.ok(MONGODB_URI, "MONGODB_URI must be set in .env");
    assert.ok(TEST_DB_NAME, "TEST_DB_NAME must be set in .env");

    const instructorId = new mongoose.Types.ObjectId();
    const otherInstructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    let course, topic, questionBank, archivedQuestionBank;
    let instructorUser;
    let connected = false;
    let server;
    let serverUrl;

    t.after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        if (!connected) return;

        try {
            await QuestionImport.deleteMany({
                instructorId: { $in: [instructorId, otherInstructorId] },
            });
            await Question.deleteMany({
                createdBy: { $in: [instructorId, otherInstructorId] },
            });
            await QuestionBank.deleteMany({
                createdBy: { $in: [instructorId, otherInstructorId] },
            });
            await Topic.deleteMany({ courseId });
            await Course.deleteMany({ _id: courseId });
            await User.deleteMany({
                _id: { $in: [instructorId, otherInstructorId] },
            });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;

    assert.equal(
        mongoose.connection.name,
        TEST_DB_NAME,
        `Connected to unexpected database: ${mongoose.connection.name}`
    );

    await Promise.all([
        Question.init(),
        QuestionBank.init(),
        Course.init(),
        Topic.init(),
        QuestionImport.init(),
        User.init(),
    ]);

    // Create Fixture Users
    instructorUser = await User.create({
        _id: instructorId,
        name: "Test Instructor",
        email: `instructor_${Date.now()}@example.com`,
        role: "INSTRUCTOR",
        status: "ACTIVE",
    });

    await User.create({
        _id: otherInstructorId,
        name: "Other Instructor",
        email: `other_instructor_${Date.now()}@example.com`,
        role: "INSTRUCTOR",
        status: "ACTIVE",
    });

    // Create Fixture Course & Topic
    course = await Course.create({
        _id: courseId,
        title: "Stage 4 Import Confirmation Course",
        description: "Course created exclusively for Stage 4 import confirmation tests",
        createdBy: instructorId,
        domain: "Testing",
        category: "QA",
        difficulty: "BEGINNER",
        objectives: [],
    });

    topic = await Topic.create({
        courseId: course._id,
        title: "Stage 4 Import Topic",
        order: 1,
    });

    const archivedTopic = await Topic.create({
        courseId: course._id,
        title: "Stage 4 Archived Topic",
        order: 2,
    });

    // Create Fixture QuestionBanks
    questionBank = await QuestionBank.create({
        courseId: course._id,
        topicId: topic._id,
        createdBy: instructorId,
        title: "Stage 4 Active Question Bank",
        status: "ACTIVE",
    });

    archivedQuestionBank = await QuestionBank.create({
        courseId: course._id,
        topicId: archivedTopic._id,
        createdBy: instructorId,
        title: "Stage 4 Archived Question Bank",
        status: "ARCHIVED",
    });

    // Start HTTP server for testing route endpoint
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    serverUrl = `http://localhost:${port}`;

    // Helper to generate a QuestionImport document
    function makeImportDoc(overrides = {}) {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const purgeAt = new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000);

        return new QuestionImport({
            questionBankId: questionBank._id,
            courseId: course._id,
            topicId: topic._id,
            instructorId,
            status: "PREVIEW_READY",
            summary: {
                totalRows: 2,
                validRows: 2,
                invalidRows: 0,
                duplicateRows: 0,
                blankRowsSkipped: 0,
                importableRows: 2,
            },
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "What is Express.js?",
                    normalizedQuestionText: normalizeQuestionText("What is Express.js?"),
                    type: "MCQ_SINGLE",
                    options: [
                        { key: "A", text: "A Node.js framework" },
                        { key: "B", text: "A database" },
                    ],
                    correctAnswer: "A",
                    explanation: "Express is a minimal Node web framework",
                    marks: 5,
                    difficulty: "EASY",
                },
                {
                    rowNumber: 2,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Node.js is single threaded for event loop?",
                    normalizedQuestionText: normalizeQuestionText("Node.js is single threaded for event loop?"),
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    explanation: "Event loop runs on single thread",
                    marks: 3,
                    difficulty: "MEDIUM",
                },
            ],
            expiresAt,
            purgeAt,
            ...overrides,
        });
    }

    // -----------------------------------------------------------------------
    // Test 1: A valid preview is confirmed and creates expected permanent questions
    // -----------------------------------------------------------------------
    await t.test("1. A valid preview is confirmed and creates expected permanent questions", async () => {
        const importDoc = await makeImportDoc().save();

        const result = await confirmQuestionImportService(importDoc._id, instructorId);

        assert.equal(result.status, "CONFIRMED");
        assert.equal(result.createdCount, 2);
        assert.equal(result.createdQuestionIds.length, 2);
        assert.ok(result.confirmedAt instanceof Date);

        // Check stored QuestionImport status
        const updatedImport = await QuestionImport.findById(importDoc._id);
        assert.equal(updatedImport.status, "CONFIRMED");
        assert.equal(updatedImport.createdCount, 2);
        assert.equal(updatedImport.createdQuestionIds.length, 2);
        assert.ok(updatedImport.confirmedAt);

        // Check persisted Questions in DB
        const questionsInDb = await Question.find({
            _id: { $in: result.createdQuestionIds },
        });
        assert.equal(questionsInDb.length, 2);
    });

    // -----------------------------------------------------------------------
    // Test 2: The stored question fields and trusted references are correct
    // -----------------------------------------------------------------------
    await t.test("2. The stored question fields and trusted references are correct", async () => {
        const importDoc = await makeImportDoc({
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Which HTTP status means Created?",
                    type: "MCQ_SINGLE",
                    options: [
                        { key: "A", text: "200" },
                        { key: "B", text: "201" },
                    ],
                    correctAnswer: "B",
                    explanation: "201 stands for Created",
                    marks: 10,
                    difficulty: "EASY",
                },
            ],
            summary: { totalRows: 1, validRows: 1, invalidRows: 0, duplicateRows: 0, blankRowsSkipped: 0, importableRows: 1 },
        }).save();

        const result = await confirmQuestionImportService(importDoc._id, instructorId);
        assert.equal(result.createdCount, 1);

        const createdQ = await Question.findById(result.createdQuestionIds[0]);
        assert.ok(createdQ);
        assert.equal(createdQ.questionBankId.toString(), questionBank._id.toString());
        assert.equal(createdQ.courseId.toString(), course._id.toString());
        assert.equal(createdQ.topicId.toString(), topic._id.toString());
        assert.equal(createdQ.createdBy.toString(), instructorId.toString());
        assert.equal(createdQ.lessonId, null);
        assert.equal(createdQ.questionText, "Which HTTP status means Created?");
        assert.equal(createdQ.normalizedQuestionText, "which http status means created?");
        assert.equal(createdQ.type, "MCQ_SINGLE");
        assert.equal(createdQ.options.length, 2);
        assert.equal(createdQ.options[0].key, "A");
        assert.equal(createdQ.options[1].key, "B");
        assert.equal(createdQ.correctAnswer, "B");
        assert.equal(createdQ.explanation, "201 stands for Created");
        assert.equal(createdQ.marks, 10);
        assert.equal(createdQ.difficulty, "EASY");
        assert.equal(createdQ.status, "ACTIVE");
    });

    // -----------------------------------------------------------------------
    // Test 3: Invalid and duplicate preview rows are not imported
    // -----------------------------------------------------------------------
    await t.test("3. Invalid and duplicate preview rows are not imported", async () => {
        const importDoc = await makeImportDoc({
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Valid Row To Be Imported",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 2,
                    difficulty: "EASY",
                },
                {
                    rowNumber: 2,
                    isValid: false,
                    isDuplicate: false,
                    rowErrors: ["Marks must be at least 1"],
                    questionText: "Invalid Row Missing Marks",
                    type: "TRUE_FALSE",
                    correctAnswer: "FALSE",
                    marks: 0,
                    difficulty: "EASY",
                },
                {
                    rowNumber: 3,
                    isValid: false,
                    isDuplicate: true,
                    rowErrors: ["Duplicate within file"],
                    questionText: "Duplicate Row Text",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 1,
                    difficulty: "EASY",
                },
            ],
            summary: { totalRows: 3, validRows: 1, invalidRows: 1, duplicateRows: 1, blankRowsSkipped: 0, importableRows: 1 },
        }).save();

        const result = await confirmQuestionImportService(importDoc._id, instructorId);

        assert.equal(result.createdCount, 1);
        assert.equal(result.createdQuestionIds.length, 1);

        const createdQ = await Question.findById(result.createdQuestionIds[0]);
        assert.equal(createdQ.questionText, "Valid Row To Be Imported");

        // Verify invalid and duplicate rows were never created
        const nonImported = await Question.find({
            questionText: {
                $in: ["Invalid Row Missing Marks", "Duplicate Row Text"],
            },
        });
        assert.equal(nonImported.length, 0);
    });

    // -----------------------------------------------------------------------
    // Test 4: An expired preview is rejected
    // -----------------------------------------------------------------------
    await t.test("4. An expired preview is rejected", async () => {
        const importDoc = await makeImportDoc({
            expiresAt: new Date(Date.now() - 5000), // 5 seconds in the past
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Expired Preview Question?",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 1,
                    difficulty: "EASY",
                },
            ],
        }).save();

        await assert.rejects(
            confirmQuestionImportService(importDoc._id, instructorId),
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.equal(err.code, "IMPORT_EXPIRED");
                return true;
            }
        );

        // Verify not confirmed and no questions inserted
        const checkDoc = await QuestionImport.findById(importDoc._id);
        assert.equal(checkDoc.status, "PREVIEW_READY");
        const count = await Question.countDocuments({
            normalizedQuestionText: "expired preview question?",
        });
        assert.equal(count, 0);
    });

    // -----------------------------------------------------------------------
    // Test 5: A preview belonging to another instructor is rejected
    // -----------------------------------------------------------------------
    await t.test("5. A preview belonging to another instructor is rejected", async () => {
        const importDoc = await makeImportDoc({
            instructorId: otherInstructorId,
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Other Instructor Question?",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 1,
                    difficulty: "EASY",
                },
            ],
        }).save();

        // Instructor attempts to confirm otherInstructor's import
        await assert.rejects(
            confirmQuestionImportService(importDoc._id, instructorId),
            (err) => {
                assert.equal(err.statusCode, 404);
                assert.equal(err.code, "IMPORT_NOT_FOUND");
                return true;
            }
        );
    });

    // -----------------------------------------------------------------------
    // Test 6: A preview for an archived question bank is rejected
    // -----------------------------------------------------------------------
    await t.test("6. A preview for an archived question bank is rejected", async () => {
        const importDoc = await makeImportDoc({
            questionBankId: archivedQuestionBank._id,
            topicId: archivedQuestionBank.topicId,
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Archived Bank Question?",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 1,
                    difficulty: "EASY",
                },
            ],
        }).save();

        await assert.rejects(
            confirmQuestionImportService(importDoc._id, instructorId),
            (err) => {
                assert.equal(err.statusCode, 409);
                assert.equal(err.code, "QUESTION_BANK_ARCHIVED");
                return true;
            }
        );
    });

    // -----------------------------------------------------------------------
    // Test 7: A previously confirmed import can be retried without creating more questions (idempotency)
    // -----------------------------------------------------------------------
    await t.test("7. A previously confirmed import can be retried without creating more questions", async () => {
        const importDoc = await makeImportDoc({
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Idempotent Retry Question?",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 1,
                    difficulty: "EASY",
                },
            ],
        }).save();

        const initialResult = await confirmQuestionImportService(importDoc._id, instructorId);
        assert.equal(initialResult.status, "CONFIRMED");
        assert.equal(initialResult.createdCount, 1);

        // Count questions in DB
        const countBeforeRetry = await Question.countDocuments({
            questionBankId: questionBank._id,
            normalizedQuestionText: "idempotent retry question?",
        });
        assert.equal(countBeforeRetry, 1);

        // Retry confirmation
        const retryResult = await confirmQuestionImportService(importDoc._id, instructorId);
        assert.equal(retryResult.status, "CONFIRMED");
        assert.equal(retryResult.createdCount, initialResult.createdCount);
        assert.equal(
            retryResult.createdQuestionIds[0].toString(),
            initialResult.createdQuestionIds[0].toString()
        );

        // Verify no duplicate question was inserted
        const countAfterRetry = await Question.countDocuments({
            questionBankId: questionBank._id,
            normalizedQuestionText: "idempotent retry question?",
        });
        assert.equal(countAfterRetry, 1);
    });

    // -----------------------------------------------------------------------
    // Test 8: Two concurrent confirmation requests cannot duplicate creation
    // -----------------------------------------------------------------------
    await t.test("8. Two concurrent confirmation requests cannot duplicate creation", async () => {
        const importDoc = await makeImportDoc({
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Concurrent Question One?",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 1,
                    difficulty: "EASY",
                },
                {
                    rowNumber: 2,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "Concurrent Question Two?",
                    type: "TRUE_FALSE",
                    correctAnswer: "FALSE",
                    marks: 2,
                    difficulty: "EASY",
                },
            ],
            summary: { totalRows: 2, validRows: 2, invalidRows: 0, duplicateRows: 0, blankRowsSkipped: 0, importableRows: 2 },
        }).save();

        const [res1, res2] = await Promise.all([
            confirmQuestionImportService(importDoc._id, instructorId),
            confirmQuestionImportService(importDoc._id, instructorId),
        ]);

        assert.equal(res1.status, "CONFIRMED");
        assert.equal(res2.status, "CONFIRMED");
        assert.equal(res1.createdCount, 2);
        assert.equal(res2.createdCount, 2);

        // Both responses should reference the same created question IDs
        assert.deepEqual(
            res1.createdQuestionIds.map((id) => id.toString()).sort(),
            res2.createdQuestionIds.map((id) => id.toString()).sort()
        );

        // Verify exactly 2 questions exist in DB, not 4
        const count = await Question.countDocuments({
            _id: { $in: res1.createdQuestionIds },
        });
        assert.equal(count, 2);
    });

    // -----------------------------------------------------------------------
    // Test 9: A failure after insertion rolls back questions and confirmation metadata
    // -----------------------------------------------------------------------
    await t.test(
        "9. A transaction failure rolls back inserted questions and confirmation metadata",
        async () => {
            const firstText = "Rollback Test Question One";
            const secondText = "Rollback Test Question Two";

            const importDoc = await makeImportDoc({
                previewData: [
                    {
                        rowNumber: 1,
                        isValid: true,
                        isDuplicate: false,
                        rowErrors: [],
                        questionText: firstText,
                        type: "TRUE_FALSE",
                        correctAnswer: "TRUE",
                        marks: 1,
                        difficulty: "EASY",
                    },
                    {
                        rowNumber: 2,
                        isValid: true,
                        isDuplicate: false,
                        rowErrors: [],
                        questionText: secondText,
                        type: "TRUE_FALSE",
                        correctAnswer: "FALSE",
                        marks: 1,
                        difficulty: "EASY",
                    },
                ],
                summary: {
                    totalRows: 2,
                    validRows: 2,
                    invalidRows: 0,
                    duplicateRows: 0,
                    blankRowsSkipped: 0,
                    importableRows: 2,
                },
            }).save();

            const originalInsertMany = Question.insertMany;
            let insertCompletedInsideTransaction = false;

            try {
                // Allow the real insert to run with the transaction session,
                // then inject a failure before the service can commit.
                Question.insertMany = async function (documents, options) {
                    const inserted = await originalInsertMany.call(
                        this,
                        documents,
                        options
                    );

                    insertCompletedInsideTransaction = true;

                    throw new Error(
                        "Injected failure after transactional question insertion"
                    );
                };

                await assert.rejects(
                    confirmQuestionImportService(importDoc._id, instructorId),
                    (error) => {
                        assert.equal(error.statusCode, 500);
                        assert.equal(error.code, "DATABASE_ERROR");
                        assert.match(
                            error.message,
                            /Injected failure after transactional question insertion/
                        );
                        return true;
                    }
                );
            } finally {
                // Never leave the mocked Mongoose method in place for other tests.
                Question.insertMany = originalInsertMany;
            }

            // Prove the failure happened after insertMany completed.
            assert.equal(
                insertCompletedInsideTransaction,
                true,
                "The injected failure must occur after transactional insertion"
            );

            // Neither question should survive the aborted transaction.
            const persistedQuestions = await Question.find({
                questionBankId: questionBank._id,
                normalizedQuestionText: {
                    $in: [
                        normalizeQuestionText(firstText),
                        normalizeQuestionText(secondText),
                    ],
                },
            }).lean();

            assert.equal(
                persistedQuestions.length,
                0,
                "The transaction must roll back all inserted questions"
            );

            // The import confirmation must also roll back.
            const persistedImport = await QuestionImport.findById(
                importDoc._id
            ).lean();

            assert.equal(persistedImport.status, "PREVIEW_READY");
            assert.equal(persistedImport.confirmedAt ?? null, null);
            assert.equal(persistedImport.createdCount ?? 0, 0);
            assert.deepEqual(
                persistedImport.createdQuestionIds ?? [],
                [],
                "No confirmation result should survive rollback"
            );
        }
    );


    // -----------------------------------------------------------------------
    // Test 10: A duplicate introduced after preview generation is handled safely
    // -----------------------------------------------------------------------
    await t.test("10. A duplicate introduced after preview generation is handled safely", async () => {
        const targetText = "Duplicate Introduced Later In DB";

        const importDoc = await makeImportDoc({
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: targetText,
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 1,
                    difficulty: "EASY",
                },
            ],
            summary: { totalRows: 1, validRows: 1, invalidRows: 0, duplicateRows: 0, blankRowsSkipped: 0, importableRows: 1 },
        }).save();

        // Introduce a duplicate question into the bank between preview and confirmation
        await Question.create({
            questionBankId: questionBank._id,
            courseId: course._id,
            topicId: topic._id,
            createdBy: instructorId,
            questionText: "  duplicate   introduced  later in db  ",
            normalizedQuestionText: normalizeQuestionText(targetText),
            type: "TRUE_FALSE",
            correctAnswer: "TRUE",
            marks: 1,
            difficulty: "EASY",
            status: "ACTIVE",
        });

        // Now confirm preview: must detect duplicate against fresh DB and reject safely
        await assert.rejects(
            confirmQuestionImportService(importDoc._id, instructorId),
            (err) => {
                assert.equal(err.statusCode, 409);
                assert.equal(err.code, "DUPLICATE_KEY_CONFLICT");
                return true;
            }
        );

        const checkDoc = await QuestionImport.findById(importDoc._id);
        assert.equal(checkDoc.status, "PREVIEW_READY");
    });

    // -----------------------------------------------------------------------
    // Test 11: An import with no eligible rows is handled according to clearly defined policy
    // -----------------------------------------------------------------------
    await t.test("11. An import with no eligible rows is rejected with NO_ELIGIBLE_QUESTIONS", async () => {
        const importDoc = await makeImportDoc({
            previewData: [
                {
                    rowNumber: 1,
                    isValid: false,
                    isDuplicate: false,
                    rowErrors: ["Type is invalid"],
                    questionText: "Invalid row",
                    type: "INVALID",
                    marks: 1,
                    difficulty: "EASY",
                },
                {
                    rowNumber: 2,
                    isValid: false,
                    isDuplicate: true,
                    rowErrors: ["Duplicate text"],
                    questionText: "Duplicate row",
                    type: "TRUE_FALSE",
                    marks: 1,
                    difficulty: "EASY",
                },
            ],
            summary: { totalRows: 2, validRows: 0, invalidRows: 1, duplicateRows: 1, blankRowsSkipped: 0, importableRows: 0 },
        }).save();

        await assert.rejects(
            confirmQuestionImportService(importDoc._id, instructorId),
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.equal(err.code, "NO_ELIGIBLE_QUESTIONS");
                return true;
            }
        );

        const checkDoc = await QuestionImport.findById(importDoc._id);
        assert.equal(checkDoc.status, "PREVIEW_READY");
    });

    // -----------------------------------------------------------------------
    // Test 12: HTTP endpoint POST /api/v1/question-imports/:importId/confirm
    // -----------------------------------------------------------------------
    await t.test("12. HTTP endpoint: rejects invalid ObjectId with 400 VALIDATION_ERROR", async () => {
        const token = instructorUser.generateAccessToken();

        const res = await fetch(`${serverUrl}/api/v1/question-imports/not-a-valid-id/confirm`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, "VALIDATION_ERROR");
    });

    await t.test("12. HTTP endpoint: confirms valid preview via HTTP with 200 OK", async () => {
        const token = instructorUser.generateAccessToken();

        const importDoc = await makeImportDoc({
            previewData: [
                {
                    rowNumber: 1,
                    isValid: true,
                    isDuplicate: false,
                    rowErrors: [],
                    questionText: "HTTP Route Confirmation Test Question",
                    type: "TRUE_FALSE",
                    correctAnswer: "TRUE",
                    marks: 5,
                    difficulty: "EASY",
                },
            ],
            summary: { totalRows: 1, validRows: 1, invalidRows: 0, duplicateRows: 0, blankRowsSkipped: 0, importableRows: 1 },
        }).save();

        const res = await fetch(`${serverUrl}/api/v1/question-imports/${importDoc._id}/confirm`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.status, "CONFIRMED");
        assert.equal(body.data.createdCount, 1);
        assert.equal(body.data.createdQuestionIds.length, 1);
    });
});
