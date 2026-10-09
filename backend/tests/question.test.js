import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeQuestionText } from "../src/shared/utils/textNormalization.js";

import {
    createQuestionService,
    updateQuestionService,
    archiveQuestionService
} from "../src/modules/question/services/question.service.js";

import { Question } from "../src/modules/question/models/question.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

const TEST_DB_NAME = process.env.TEST_DB_NAME;
const MONGODB_URI = process.env.MONGODB_URI;

function getQuestionData(questionText, overrides = {}) {
    return {
        questionText,
        type: "TRUE_FALSE",
        options: [],
        correctAnswer: "TRUE",
        explanation: "",
        marks: 1,
        difficulty: "EASY",
        ...overrides
    };
}

function hasExpectedUniqueIndex(indexes) {
    return indexes.some((index) => {
        const keys = index.key ?? {};

        return (
            index.unique === true &&
            keys.questionBankId === 1 &&
            keys.normalizedQuestionText === 1 &&
            Object.keys(keys).length === 2
        );
    });
}

/*
|--------------------------------------------------------------------------
| Normalization Utility Tests
|--------------------------------------------------------------------------
*/

test("Normalization Utility Tests", async (t) => {
    await t.test("Trims leading and trailing whitespace", () => {
        assert.equal(
            normalizeQuestionText("  What is AI?  "),
            "what is ai?"
        );
    });

    await t.test("Collapses repeated whitespace", () => {
        assert.equal(
            normalizeQuestionText("What   is    AI?"),
            "what is ai?"
        );
    });

    await t.test("Compares text case-insensitively", () => {
        assert.equal(
            normalizeQuestionText("WhAt is aI?"),
            "what is ai?"
        );
    });

    await t.test("Normalizes tabs and newlines", () => {
        assert.equal(
            normalizeQuestionText("What\t is\nAI?"),
            "what is ai?"
        );
    });

    await t.test("Keeps genuinely different questions distinguishable", () => {
        assert.notEqual(
            normalizeQuestionText("What is AI?"),
            normalizeQuestionText("What is ML?")
        );
    });

    await t.test("Returns the same result for equivalent text", () => {
        const first = normalizeQuestionText("  What   is AI? ");
        const second = normalizeQuestionText("what is ai?");

        assert.equal(first, second);
    });
});

/*
|--------------------------------------------------------------------------
| Database Integration Tests
|--------------------------------------------------------------------------
*/

test("Question Service and Database Integration Tests", async (t) => {
    assert.ok(
  MONGODB_URI,
  "MONGODB_URI must be configured in .env"
);

assert.ok(
  TEST_DB_NAME,
  "TEST_DB_NAME must be configured in .env"
);

    const instructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    let questionBankOne;
    let questionBankTwo;
    let course;
    let topicOne;
    let topicTwo;
    let connected = false;

    /*
     * Cleanup is restricted to documents created by this test suite.
     * Never delete every Question document in the database.
     */
    t.after(async () => {
        if (!connected) {
            return;
        }

        try {
            await Question.deleteMany({
                createdBy: instructorId
            });

            await QuestionBank.deleteMany({
                createdBy: instructorId
            });

            await Topic.deleteMany({
                courseId
            });

            await Course.deleteMany({
                _id: courseId,
                createdBy: instructorId
            });
        } finally {
            await mongoose.disconnect();
        }
    });

    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is missing from .env");
    }

    if (!TEST_DB_NAME || !TEST_DB_NAME.endsWith("_test")) {
        throw new Error(
            "TEST_DB_NAME must be configured and end with '_test'"
        );
    }

    if (TEST_DB_NAME === process.env.DB_NAME) {
        throw new Error(
            "Test database must be different from the application database"
        );
    }

    await mongoose.connect(MONGODB_URI, {
        dbName: TEST_DB_NAME,
    });

    connected = true;

    /*
     * Verify the actual connected database before performing any writes.
     */
    assert.equal(
        mongoose.connection.name,
        TEST_DB_NAME,
        `Refusing to run tests against database "${mongoose.connection.name}". ` +
            `Expected "${TEST_DB_NAME}".`
    );

    /*
     * Wait for indexes declared by the Mongoose schemas.
     * The test does not create the compound unique index itself.
     */
    await Promise.all([
        Question.init(),
        QuestionBank.init(),
        Course.init(),
        Topic.init()
    ]);

    /*
     * Create isolated fixtures.
     */
    course = await Course.create({
        _id: courseId,
        title: "Integration Test Course",
        description:
            "A course created exclusively for isolated integration tests.",
        createdBy: instructorId,
        domain: "Testing",
        category: "Testing",
        difficulty: "BEGINNER",
        objectives: []
    });

    topicOne = await Topic.create({
        courseId: course._id,
        title: "Integration Topic One",
        learningObjectives: [],
        order: 1
    });

    topicTwo = await Topic.create({
        courseId: course._id,
        title: "Integration Topic Two",
        learningObjectives: [],
        order: 2
    });

    questionBankOne = await QuestionBank.create({
        courseId: course._id,
        topicId: topicOne._id,
        createdBy: instructorId,
        title: "Integration Question Bank One"
    });

    questionBankTwo = await QuestionBank.create({
        courseId: course._id,
        topicId: topicTwo._id,
        createdBy: instructorId,
        title: "Integration Question Bank Two"
    });

    /*
     * Confirm that the real database has the required index.
     * Do not create it here: that would hide a missing migration/index setup.
     */
    await t.test("Required unique compound index exists", async () => {
        const indexes = await Question.collection.indexes();

        assert.ok(
            hasExpectedUniqueIndex(indexes),
            "Expected a unique compound index on " +
                "{ questionBankId: 1, normalizedQuestionText: 1 }. " +
                "Run the approved migration against the dedicated test database " +
                "or declare the index in the Question schema."
        );
    });

    /*
     * CREATE: The service must derive normalizedQuestionText.
     */
    await t.test(
        "Creation derives normalizedQuestionText in the service",
        async () => {
            const question = await createQuestionService(
                instructorId,
                questionBankOne._id,
                getQuestionData("  Hello   World!  ")
            );

            assert.equal(question.questionText, "Hello   World!");
            assert.equal(question.normalizedQuestionText, "hello world!");
        }
    );

    /*
     * CREATE: A caller must not be able to forge the normalized value.
     */
    await t.test(
        "Creation ignores a caller-supplied normalizedQuestionText",
        async () => {
            const question = await createQuestionService(
                instructorId,
                questionBankOne._id,
                getQuestionData("Trusted Question Text", {
                    normalizedQuestionText: "forged normalized value"
                })
            );

            assert.equal(
                question.normalizedQuestionText,
                "trusted question text"
            );
        }
    );

    /*
     * UPDATE: Changing the question text must recalculate normalization.
     */
    await t.test(
        "Update recalculates normalizedQuestionText",
        async () => {
            const question = await createQuestionService(
                instructorId,
                questionBankOne._id,
                getQuestionData("Original Question")
            );

            const updatedQuestion = await updateQuestionService(
                instructorId,
                question._id,
                {
                    questionText: "  Updated   Question  "
                }
            );

            assert.equal(
                updatedQuestion.normalizedQuestionText,
                "updated question"
            );
        }
    );

    /*
     * UPDATE: A caller must not overwrite the normalized field directly.
     */
    await t.test(
        "Update ignores a caller-supplied normalizedQuestionText",
        async () => {
            const question = await createQuestionService(
                instructorId,
                questionBankOne._id,
                getQuestionData("Original Trusted Text")
            );

            const updatedQuestion = await updateQuestionService(
                instructorId,
                question._id,
                {
                    normalizedQuestionText: "forged value"
                }
            );

            assert.equal(
                updatedQuestion.normalizedQuestionText,
                "original trusted text"
            );
        }
    );

    /*
     * DUPLICATE: Same normalized text in the same bank must be rejected.
     */
    await t.test(
        "Rejects duplicate normalized text within the same Question Bank",
        async () => {
            await createQuestionService(
                instructorId,
                questionBankOne._id,
                getQuestionData("Duplicate Detection Question")
            );

            await assert.rejects(
                createQuestionService(
                    instructorId,
                    questionBankOne._id,
                    getQuestionData("  duplicate   detection question ")
                ),
                (error) => error?.code === 11000,
                "Expected MongoDB to reject duplicate normalized text"
            );
        }
    );

    /*
     * SCOPE: Same normalized text in another bank must be allowed.
     */
    await t.test(
        "Allows identical normalized text in different Question Banks",
        async () => {
            await createQuestionService(
                instructorId,
                questionBankOne._id,
                getQuestionData("Cross Bank Question")
            );

            const secondBankQuestion = await createQuestionService(
                instructorId,
                questionBankTwo._id,
                getQuestionData("  CROSS   BANK QUESTION ")
            );

            assert.equal(
                secondBankQuestion.normalizedQuestionText,
                "cross bank question"
            );

            assert.equal(
                secondBankQuestion.questionBankId.toString(),
                questionBankTwo._id.toString()
            );
        }
    );

    /*
     * ARCHIVED QUESTIONS: The unique index must not filter by status.
     */
    await t.test(
        "Archived questions still prevent normalized duplicates",
        async () => {
            const archivedQuestion = await createQuestionService(
                instructorId,
                questionBankOne._id,
                getQuestionData("Archived Duplicate Question")
            );

            await archiveQuestionService(
                instructorId,
                archivedQuestion._id
            );

            await assert.rejects(
                createQuestionService(
                    instructorId,
                    questionBankOne._id,
                    getQuestionData("  ARCHIVED   DUPLICATE QUESTION ")
                ),
                (error) => error?.code === 11000,
                "An archived question must still reserve its normalized text"
            );
        }
    );

    /*
     * TRANSACTIONS: Verify rollback and always clean up the session.
     */
    await t.test(
        "Aborted transaction does not persist a question",
        async () => {
            const session = await mongoose.startSession();

            try {
                session.startTransaction();

                const question = new Question({
                    questionBankId: questionBankOne._id,
                    courseId: course._id,
                    topicId: topicOne._id,
                    lessonId: null,
                    createdBy: instructorId,
                    ...getQuestionData("Transaction Rollback Question"),
                    normalizedQuestionText: normalizeQuestionText(
                        "Transaction Rollback Question"
                    )
                });

                await question.save({ session });
                await session.abortTransaction();

                const persistedCount = await Question.countDocuments({
                    questionBankId: questionBankOne._id,
                    normalizedQuestionText: "transaction rollback question"
                });

                assert.equal(
                    persistedCount,
                    0,
                    "Question must not exist after transaction rollback"
                );
            } finally {
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }

                await session.endSession();
            }
        }
    );
});