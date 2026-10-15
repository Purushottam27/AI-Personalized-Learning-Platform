import test from "node:test";

import assert from "node:assert/strict";

import mongoose from "mongoose";

import dotenv from "dotenv";

import path from "node:path";

import { fileURLToPath } from "node:url";

import { Practice } from "../src/modules/practice/models/practice.model.js";

import { Question } from "../src/modules/question/models/question.model.js";

import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";

import { Topic } from "../src/modules/topic/models/topic.model.js";

import { Course } from "../src/modules/course/models/course.model.js";

import {

    createPracticeService,

    getPracticeByIdService,

    getPracticesByTopicService,

    updatePracticeService,

    publishPracticeService,

    archivePracticeService,

    restorePracticeService,

} from "../src/modules/practice/services/practice.service.js";

import { normalizeQuestionText } from "../src/shared/utils/textNormalization.js";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

dotenv.config({

    path: path.resolve(__dirname, "../.env"),

});

const TEST_DB_NAME = process.env.TEST_DB_NAME;

const MONGODB_URI = process.env.MONGODB_URI;

function getQuestionData(questionText, overrides = {}) {

    return {

        questionText,

        normalizedQuestionText: normalizeQuestionText(questionText),

        type: "TRUE_FALSE",

        options: [],

        correctAnswer: "TRUE",

        explanation: "",

        marks: 1,

        difficulty: "EASY",

        ...overrides,

    };

}

function assertApiError(error, code, statusCode) {

    return (

        error?.code === code &&

        error?.statusCode === statusCode

    );

}

test("Practice service integration tests", async (t) => {

    const instructorId = new mongoose.Types.ObjectId();

    const otherInstructorId = new mongoose.Types.ObjectId();

    const courseId = new mongoose.Types.ObjectId();

    let connected = false;

    let course;

    let topic;

    let questionBank;

    /*

     \* Only delete records belonging to this test suite.

     */

    t.after(async () => {

        if (!connected) {

            return;

        }

        try {

            await Practice.deleteMany({

                createdBy: instructorId,

            });

            await Question.deleteMany({

                createdBy: instructorId,

            });

            await QuestionBank.deleteMany({

                createdBy: instructorId,

            });

            await Topic.deleteMany({

                courseId,

            });

            await Course.deleteOne({

                _id: courseId,

                createdBy: instructorId,

            });

        } finally {

            await mongoose.disconnect();

        }

    });

    /*

     \* Verify the dedicated test database before performing writes.

     */

    assert.ok(MONGODB_URI, "MONGODB_URI is missing from .env");

    assert.ok(

        TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"),

        "TEST_DB_NAME must be configured and end with '_test'"

    );

    assert.notEqual(

        TEST_DB_NAME,

        process.env.DB_NAME,

        "Test database must differ from the application database"

    );

    await mongoose.connect(MONGODB_URI, {

        dbName: TEST_DB_NAME,

    });

    connected = true;

    assert.equal(

        mongoose.connection.name,

        TEST_DB_NAME,

        "Refusing to run against an unexpected database"

    );

    await Promise.all([

        Practice.init(),

        Question.init(),

        QuestionBank.init(),

        Course.init(),

        Topic.init(),

    ]);

    /*

     \* Shared course, topic, and Question Bank fixtures.

     */

    course = await Course.create({

        _id: courseId,

        title: "Practice Integration Test Course",

        description: "Course created for isolated integration tests.",

        createdBy: instructorId,

        domain: "Testing",

        category: "Testing",

        difficulty: "BEGINNER",

        objectives: [],

    });

    topic = await Topic.create({

        courseId: course._id,

        title: "Practice Integration Test Topic",

        learningObjectives: [],

        order: 1,

    });

    questionBank = await QuestionBank.create({

        courseId: course._id,

        topicId: topic._id,

        createdBy: instructorId,

        title: "Practice Integration Test Question Bank",

    });

    const createDraft = (overrides = {}) =>

        createPracticeService(instructorId, topic._id, {

            title: "Practice Integration Test",

            description: "Created by the Practice integration tests.",

            ...overrides,

        });

    const createQuestion = (text, overrides = {}) =>

        Question.create({

            questionBankId: questionBank._id,

            courseId: course._id,

            topicId: topic._id,

            createdBy: instructorId,

            ...getQuestionData(text, overrides),

        });

    /*

     \* CREATE

     */

    await t.test("Creates a draft with default values", async () => {

        const practice = await createDraft();

        assert.equal(practice.status, "DRAFT");

        assert.equal(practice.title, "Practice Integration Test");

        assert.equal(practice.description, "Created by the Practice integration tests.");

        assert.deepEqual(practice.questionIds, []);

        assert.equal(practice.contributeToLearningEvidence, false);

        assert.equal(

            practice.courseId.toString(),

            course._id.toString()

        );

        assert.equal(

            practice.topicId.toString(),

            topic._id.toString()

        );

        assert.equal(

            practice.questionBankId.toString(),

            questionBank._id.toString()

        );

        assert.equal(

            practice.createdBy.toString(),

            instructorId.toString()

        );

    });

    await t.test("Creates a draft with selected eligible questions", async () => {

        const question = await createQuestion(

            "Create practice with eligible question"

        );

        const practice = await createDraft({

            questionIds: [question._id],

            contributeToLearningEvidence: true,

        });

        assert.equal(practice.questionIds.length, 1);

        assert.equal(practice.contributeToLearningEvidence, true);

        assert.equal(

            practice.questionIds[0].toString(),

            question._id.toString()

        );

    });

    await t.test("Rejects a question from another Question Bank", async () => {

        const otherTopic = await Topic.create({

            courseId: course._id,

            title: "Practice Other Bank Topic",

            learningObjectives: [],

            order: 90,

        });

        const otherBank = await QuestionBank.create({

            courseId: course._id,

            topicId: otherTopic._id,

            createdBy: instructorId,

            title: "Practice Other Bank",

        });

        const foreignQuestion = await Question.create({

            questionBankId: otherBank._id,

            courseId: course._id,

            topicId: otherTopic._id,

            createdBy: instructorId,

            ...getQuestionData("Question from another bank"),

        });

        await assert.rejects(

            createDraft({

                questionIds: [foreignQuestion._id],

            }),

            (error) =>

                assertApiError(

                    error,

                    "INVALID_PRACTICE_QUESTIONS",

                    400

                )

        );

    });

    await t.test("Rejects an archived question during creation", async () => {

        const question = await createQuestion(

            "Archived question rejected during creation",

            { status: "ARCHIVED" }

        );

        await assert.rejects(

            createDraft({

                questionIds: [question._id],

            }),

            (error) =>

                assertApiError(

                    error,

                    "INVALID_PRACTICE_QUESTIONS",

                    400

                )

        );

    });

    await t.test("Rejects creation when the Question Bank is archived", async () => {

        questionBank.status = "ARCHIVED";

        await questionBank.save();

        try {

            await assert.rejects(

                createDraft(),

                (error) =>

                    assertApiError(

                        error,

                        "QUESTION_BANK_ARCHIVED",

                        409

                    )

            );

        } finally {

            questionBank.status = "ACTIVE";

            await questionBank.save();

        }

    });

    /*

     \* READ AND OWNERSHIP

     */

    await t.test("Retrieves a Practice owned by the instructor", async () => {

        const practice = await createDraft();

        const result = await getPracticeByIdService(

            instructorId,

            practice._id

        );

        assert.equal(result._id.toString(), practice._id.toString());

    });

    await t.test("Rejects reading another instructor's Practice", async () => {

        const practice = await createDraft();

        await assert.rejects(

            getPracticeByIdService(otherInstructorId, practice._id),

            (error) =>

                error?.statusCode === 404 &&

                ["QUESTION_BANK_NOT_FOUND", "PRACTICE_NOT_FOUND"].includes(

                    error.code

                )

        );

    });

    await t.test("Lists Practices for an owned topic", async () => {

        const practice = await createDraft();

        const results = await getPracticesByTopicService(

            instructorId,

            topic._id

        );

        assert.ok(

            results.some(

                (item) => item._id.toString() === practice._id.toString()

            )

        );

    });

    await t.test("Rejects listing Practices for another instructor's topic", async () => {

        await assert.rejects(

            getPracticesByTopicService(otherInstructorId, topic._id),

            (error) =>

                error?.code === "TOPIC_NOT_FOUND" &&

                error?.statusCode === 404

        );

    });

    /*

     \* UPDATE

     */

    await t.test("Updates supplied fields without changing other fields", async () => {

        const practice = await createDraft({

            description: "Original description",

        });

        const updated = await updatePracticeService(

            instructorId,

            practice._id,

            {

                title: "Updated Practice Title",

            }

        );

        assert.equal(updated.title, "Updated Practice Title");

        assert.equal(updated.description, "Original description");

        assert.equal(updated.status, "DRAFT");

    });

    await t.test("Rejects an update that leaves a published Practice empty", async () => {

        const question = await createQuestion(

            "Published practice cannot become empty"

        );

        const practice = await createDraft({

            questionIds: [question._id],

        });

        const published = await publishPracticeService(

            instructorId,

            practice._id

        );

        assert.equal(published.status, "PUBLISHED");

        await assert.rejects(

            updatePracticeService(instructorId, practice._id, {

                questionIds: [],

            }),

            (error) =>

                assertApiError(

                    error,

                    "PRACTICE_REQUIRES_QUESTIONS",

                    400

                )

        );

        const unchanged = await Practice.findById(practice._id);

        assert.equal(unchanged.status, "PUBLISHED");

        assert.equal(unchanged.questionIds.length, 1);

    });

    await t.test("Rejects updating an archived Practice", async () => {

        const practice = await createDraft();

        await archivePracticeService(instructorId, practice._id);

        await assert.rejects(

            updatePracticeService(instructorId, practice._id, {

                title: "Should not update",

            }),

            (error) =>

                assertApiError(error, "PRACTICE_ARCHIVED", 409)

        );

    });

    await t.test("Rejects updating another instructor's Practice", async () => {

        const practice = await createDraft();

        await assert.rejects(

            updatePracticeService(otherInstructorId, practice._id, {

                title: "Unauthorized update",

            }),

            (error) =>

                error?.statusCode === 404

        );

    });

    /*

     \* PUBLISH

     */

    await t.test("Publishes a draft with a valid active question", async () => {

        const question = await createQuestion(

            "Valid question for publication"

        );

        const practice = await createDraft({

            questionIds: [question._id],

        });

        const published = await publishPracticeService(

            instructorId,

            practice._id

        );

        assert.equal(published.status, "PUBLISHED");

        assert.equal(published.questionIds.length, 1);

        assert.equal(

            published.questionIds[0].toString(),

            question._id.toString()

        );

    });

        await t.test(
        "Rejects publication when question selection changes after validation",
        async () => {
            const question = await createQuestion(
                "Question for publication race condition"
            );

            const practice = await createDraft({
                questionIds: [question._id],
            });

            const originalFindOneAndUpdate = Practice.findOneAndUpdate;

            // Simulate another request changing the selection after validation
            // but immediately before the service's conditional publication update.
            Practice.findOneAndUpdate = async function (filter, update, options) {
                await Practice.updateOne(
                    { _id: practice._id, status: "DRAFT" },
                    { $set: { questionIds: [] } }
                );

                return originalFindOneAndUpdate.call(this, filter, update, options);
            };

            try {
                await assert.rejects(
                    publishPracticeService(instructorId, practice._id),
                    (error) =>
                        assertApiError(error, "PRACTICE_STATE_CHANGED", 409) ||
                        // A transaction retry can observe the changed empty
                        // selection and reject it before the state transition.
                        assertApiError(error, "PRACTICE_REQUIRES_QUESTIONS", 400)
                );
            } finally {
                Practice.findOneAndUpdate = originalFindOneAndUpdate;
            }

            const unchanged = await Practice.findById(practice._id);

            assert.equal(unchanged.status, "DRAFT");
            assert.deepEqual(unchanged.questionIds, []);
        }
    );

await t.test("Rejects publication if a selected question was archived", async () => {

        const question = await createQuestion(

            "Question archived after selection"

        );

        const practice = await createDraft({

            questionIds: [question._id],

        });

        question.status = "ARCHIVED";

        await question.save();

        await assert.rejects(

            publishPracticeService(instructorId, practice._id),

            (error) =>

                assertApiError(

                    error,

                    "INVALID_PRACTICE_QUESTIONS",

                    400

                )

        );

        const unchanged = await Practice.findById(practice._id);

        assert.equal(unchanged.status, "DRAFT");

    });

    await t.test("Rejects publication if the Question Bank is archived", async () => {

        const question = await createQuestion(

            "Question selected before bank archive"

        );

        const practice = await createDraft({

            questionIds: [question._id],

        });

        questionBank.status = "ARCHIVED";

        await questionBank.save();

        try {

            await assert.rejects(

                publishPracticeService(instructorId, practice._id),

                (error) =>

                    assertApiError(

                        error,

                        "QUESTION_BANK_ARCHIVED",

                        409

                    )

            );

            const unchanged = await Practice.findById(practice._id);

            assert.equal(unchanged.status, "DRAFT");

        } finally {

            questionBank.status = "ACTIVE";

            await questionBank.save();

        }

    });

    await t.test("Rejects publishing an already published Practice", async () => {

        const question = await createQuestion(

            "Question for repeated publication"

        );

        const practice = await createDraft({

            questionIds: [question._id],

        });

        await publishPracticeService(instructorId, practice._id);

        await assert.rejects(

            publishPracticeService(instructorId, practice._id),

            (error) =>

                assertApiError(

                    error,

                    "PRACTICE_ALREADY_PUBLISHED",

                    409

                )

        );

    });

    await t.test("Rejects publishing an archived Practice", async () => {

        const practice = await createDraft();

        await archivePracticeService(instructorId, practice._id);

        await assert.rejects(

            publishPracticeService(instructorId, practice._id),

            (error) =>

                assertApiError(error, "PRACTICE_ARCHIVED", 409)

        );

    });

    /*

     \* ARCHIVE AND RESTORE

     */

    await t.test("Archives a Practice and restores it to DRAFT", async () => {

        const practice = await createDraft();

        const archived = await archivePracticeService(

            instructorId,

            practice._id

        );

        assert.equal(archived.status, "ARCHIVED");

        const restored = await restorePracticeService(

            instructorId,

            practice._id

        );

        assert.equal(restored.status, "DRAFT");

    });

    await t.test("Rejects archiving an already archived Practice", async () => {

        const practice = await createDraft();

        await archivePracticeService(instructorId, practice._id);

        await assert.rejects(

            archivePracticeService(instructorId, practice._id),

            (error) =>

                assertApiError(

                    error,

                    "PRACTICE_ALREADY_ARCHIVED",

                    409

                )

        );

    });

    await t.test("Rejects archiving another instructor's Practice", async () => {

        const practice = await createDraft();

        await assert.rejects(

            archivePracticeService(otherInstructorId, practice._id),

            (error) =>

                assertApiError(error, "PRACTICE_NOT_FOUND", 404)

        );

    });

    await t.test("Rejects restoring a Practice that is not archived", async () => {

        const practice = await createDraft();

        await assert.rejects(

            restorePracticeService(instructorId, practice._id),

            (error) =>

                assertApiError(

                    error,

                    "PRACTICE_NOT_ARCHIVED",

                    409

                )

        );

    });

    await t.test("Rejects restoring when the Question Bank is archived", async () => {

        const practice = await createDraft();

        await archivePracticeService(instructorId, practice._id);

        questionBank.status = "ARCHIVED";

        await questionBank.save();

        try {

            await assert.rejects(

                restorePracticeService(instructorId, practice._id),

                (error) =>

                    assertApiError(

                        error,

                        "QUESTION_BANK_ARCHIVED",

                        409

                    )

            );

            const unchanged = await Practice.findById(practice._id);

            assert.equal(unchanged.status, "ARCHIVED");

        } finally {

            questionBank.status = "ACTIVE";

            await questionBank.save();

        }

    });

    await t.test("Can archive a Practice when its Question Bank is missing", async () => {

        const practice = await createDraft();

        await QuestionBank.deleteOne({

            _id: questionBank._id,

        });

        const archived = await archivePracticeService(

            instructorId,

            practice._id

        );

        assert.equal(archived.status, "ARCHIVED");

        // Recreate the shared bank for subsequent tests.

        questionBank = await QuestionBank.create({

            courseId: course._id,

            topicId: topic._id,

            createdBy: instructorId,

            title: "Practice Integration Test Question Bank",

        });

    });

});
