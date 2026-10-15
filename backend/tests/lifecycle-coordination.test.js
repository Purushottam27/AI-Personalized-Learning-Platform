import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Course } from "../src/modules/course/models/course.model.js";
import { updateCourseService } from "../src/modules/course/services/course.service.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { Practice } from "../src/modules/practice/models/practice.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";
import { normalizeQuestionText } from "../src/shared/utils/textNormalization.js";
import { updateQuestionService, archiveQuestionService } from "../src/modules/question/services/question.service.js";
import { archiveQuestionBankService } from "../src/modules/questionBank/services/questionBank.service.js";
import { publishAssessmentService } from "../src/modules/assessment/services/assessment.service.js";
import { publishPracticeService } from "../src/modules/practice/services/practice.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("published activities protect referenced questions and question banks", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be configured in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, process.env.DB_NAME, "TEST_DB_NAME must differ from DB_NAME");

    const instructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const topicId = new mongoose.Types.ObjectId();
    const bankId = new mongoose.Types.ObjectId();
    const assessmentId = new mongoose.Types.ObjectId();
    const diagnosticAssessmentId = new mongoose.Types.ObjectId();
    const practiceId = new mongoose.Types.ObjectId();
    const questionIds = Array.from({ length: 6 }, () => new mongoose.Types.ObjectId());
    let connected = false;
    t.after(async () => {
        if (!connected) return;
        try {
            await Assessment.deleteMany({ _id: { $in: [assessmentId, diagnosticAssessmentId] } });
            await Practice.deleteMany({ _id: practiceId });
            await Question.deleteMany({ _id: { $in: questionIds } });
            await QuestionBank.deleteOne({ _id: bankId });
            await Topic.deleteOne({ _id: topicId });
            await Course.deleteOne({ _id: courseId });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME, "Refusing to write to unexpected database");
    await Promise.all([Course.init(), Topic.init(), QuestionBank.init(), Question.init(), Assessment.init(), Practice.init()]);

    await Course.create({
        _id: courseId, title: "Lifecycle Test Course",
        description: "A sufficiently long course description for lifecycle integration tests.",
        createdBy: instructorId, domain: "Computer Science", category: "Testing",
        difficulty: "BEGINNER", objectives: ["Lifecycle protection"], status: "DRAFT",
        diagnosticPolicy: { enabled: true, passingScore: 60, questionsPerAttempt: 5, randomizeQuestions: true },
    });
    await Topic.create({ _id: topicId, courseId, title: "Lifecycle Topic", description: "", learningObjectives: [], order: 1 });
    await QuestionBank.create({ _id: bankId, courseId, topicId, createdBy: instructorId, title: "Lifecycle Bank" });
    await Question.insertMany(questionIds.map((id, index) => {
        const questionText = `Lifecycle true false question ${index + 1}`;
        return {
            _id: id, questionBankId: bankId, courseId, topicId, lessonId: null,
            createdBy: instructorId, questionText, normalizedQuestionText: normalizeQuestionText(questionText),
            type: "TRUE_FALSE", options: [], correctAnswer: "TRUE", explanation: "",
            marks: 1, difficulty: "EASY", status: "ACTIVE",
        };
    }));
    await Practice.create({
        _id: practiceId, courseId, topicId, questionBankId: bankId, createdBy: instructorId,
        title: "Lifecycle Practice", description: "", questionIds: [questionIds[5]],
        contributeToLearningEvidence: false, status: "DRAFT",
    });
    await Assessment.create({
        _id: assessmentId, courseId, topicId, createdBy: instructorId, type: "TOPIC",
        title: "Lifecycle Assessment", description: "", questionIds: questionIds.slice(0, 5),
        questionsPerAttempt: 5, passingScore: 60, maxAttempts: 1,
        randomizeQuestions: true, randomizeOptions: false, timeLimitMinutes: null,
        opensAt: null, closesAt: null, status: "DRAFT",
    });
    await publishAssessmentService(instructorId, assessmentId);

    await Assessment.create({
        _id: diagnosticAssessmentId, courseId, topicId: null, createdBy: instructorId,
        type: "DIAGNOSTIC", title: "Lifecycle Diagnostic", description: "", questionIds: questionIds.slice(0, 5),
        questionsPerAttempt: 5, passingScore: 60, maxAttempts: 1,
        randomizeQuestions: true, randomizeOptions: false, timeLimitMinutes: null,
        opensAt: null, closesAt: null, status: "DRAFT",
    });
    await publishAssessmentService(instructorId, diagnosticAssessmentId);
    await assert.rejects(
        updateCourseService(instructorId, courseId, { diagnosticPolicy: { passingScore: 70 } }),
        (error) => error?.code === "DIAGNOSTIC_POLICY_LOCKED" && error.statusCode === 409
    );

    // Verify the Assessment-specific bank guard while Practice is still a draft,
    // so this assertion cannot pass merely because a published Practice uses it.
    await assert.rejects(
        archiveQuestionBankService(instructorId, bankId),
        (error) => error?.code === "QUESTION_BANK_USED_IN_PUBLISHED_ASSESSMENT" && error.statusCode === 409
    );

    await assert.rejects(
        updateQuestionService(instructorId, questionIds[0], { explanation: "changed" }),
        (error) => error?.code === "QUESTION_USED_IN_PUBLISHED_ASSESSMENT" && error.statusCode === 409
    );
    await assert.rejects(
        archiveQuestionService(instructorId, questionIds[0]),
        (error) => error?.code === "QUESTION_USED_IN_PUBLISHED_ASSESSMENT" && error.statusCode === 409
    );
    // Race a practice publication against question archival. The shared transaction
    // write fence must ensure that both operations cannot succeed together.
    const raceResults = await Promise.allSettled([
        publishPracticeService(instructorId, practiceId),
        archiveQuestionService(instructorId, questionIds[5]),
    ]);
    assert.equal(raceResults.filter((result) => result.status === "fulfilled").length, 1);

    await assert.rejects(
        archiveQuestionBankService(instructorId, bankId),
        (error) => [
            "QUESTION_BANK_USED_IN_PUBLISHED_PRACTICE",
            "QUESTION_BANK_USED_IN_PUBLISHED_ASSESSMENT",
        ].includes(error?.code) && error.statusCode === 409
    );
});
