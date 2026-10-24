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
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("Question Bank HTTP API integration", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const otherInstructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    let connected = false;
    let server;
    let baseUrl;
    let topicId;
    let createdBankId;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await QuestionBank.deleteMany({ createdBy: { $in: [instructorId, otherInstructorId] } });
            await Topic.deleteMany({ courseId });
            await Course.deleteMany({ _id: courseId });
            await User.deleteMany({ _id: { $in: [instructorId, otherInstructorId] } });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME);
    await Promise.all([User.init(), Course.init(), Topic.init(), QuestionBank.init()]);

    await User.create([
        {
            _id: instructorId,
            name: "Bank API Instructor",
            email: `bank-instructor-${instructorId}@example.test`,
            role: "INSTRUCTOR",
            status: "ACTIVE",
        },
        {
            _id: otherInstructorId,
            name: "Bank API Other Instructor",
            email: `bank-other-${otherInstructorId}@example.test`,
            role: "INSTRUCTOR",
            status: "ACTIVE",
        },
    ]);

    const course = await Course.create({
        _id: courseId,
        title: "Bank API Test Course",
        description: "Course fixture for testing question bank API endpoints.",
        createdBy: instructorId,
        domain: "Testing",
        category: "Integration",
        difficulty: "BEGINNER",
        objectives: [],
        status: "DRAFT",
    });

    const topic = await Topic.create({
        courseId: course._id,
        title: "Bank API Test Topic",
        learningObjectives: [],
        order: 1,
    });
    topicId = topic._id.toString();

    const token = jwt.sign({ sub: instructorId.toString(), role: "INSTRUCTOR" }, JWT_ACCESS_SECRET, { expiresIn: "5m" });
    const otherToken = jwt.sign({ sub: otherInstructorId.toString(), role: "INSTRUCTOR" }, JWT_ACCESS_SECRET, { expiresIn: "5m" });

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

    await t.test("returns 404 when topic has no question bank", async () => {
        const response = await request(`/api/v1/topics/${topicId}/question-bank`);
        assert.equal(response.status, 404);
        const body = await response.json();
        assert.equal(body.error.code, "QUESTION_BANK_NOT_FOUND");
    });

    await t.test("creates a question bank for the topic", async () => {
        const response = await request(`/api/v1/topics/${topicId}/question-bank`, {
            method: "POST",
            body: JSON.stringify({
                title: "Topic 1 Question Bank",
                description: "Test question bank for topic 1",
            }),
        });
        const body = await response.json();
        assert.equal(response.status, 201, JSON.stringify(body));
        assert.equal(body.data.title, "Topic 1 Question Bank");
        assert.equal(body.data.status, "ACTIVE");
        assert.equal(body.data.topicId, topicId);
        createdBankId = body.data._id;
    });

    await t.test("rejects creating a duplicate question bank for the same topic", async () => {
        const response = await request(`/api/v1/topics/${topicId}/question-bank`, {
            method: "POST",
            body: JSON.stringify({
                title: "Duplicate Bank",
            }),
        });
        assert.equal(response.status, 409);
        const body = await response.json();
        assert.equal(body.error.code, "QUESTION_BANK_ALREADY_EXISTS");
    });

    await t.test("gets question bank by topic", async () => {
        const response = await request(`/api/v1/topics/${topicId}/question-bank`);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.data._id, createdBankId);
        assert.equal(body.data.title, "Topic 1 Question Bank");
    });

    await t.test("gets question bank by ID", async () => {
        const response = await request(`/api/v1/question-banks/${createdBankId}`);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.data._id, createdBankId);
    });

    await t.test("updates question bank title and description", async () => {
        const response = await request(`/api/v1/question-banks/${createdBankId}`, {
            method: "PATCH",
            body: JSON.stringify({
                title: "Updated Question Bank Title",
                description: "Updated description",
            }),
        });
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.data.title, "Updated Question Bank Title");
        assert.equal(body.data.description, "Updated description");
    });

    await t.test("archives the question bank", async () => {
        const response = await request(`/api/v1/question-banks/${createdBankId}/archive`, {
            method: "POST",
        });
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.data.status, "ARCHIVED");
    });

    await t.test("rejects updating an archived question bank", async () => {
        const response = await request(`/api/v1/question-banks/${createdBankId}`, {
            method: "PATCH",
            body: JSON.stringify({
                title: "Cannot update archived bank",
            }),
        });
        assert.equal(response.status, 409);
        const body = await response.json();
        assert.equal(body.error.code, "QUESTION_BANK_ARCHIVED");
    });

    await t.test("restores the archived question bank", async () => {
        const response = await request(`/api/v1/question-banks/${createdBankId}/restore`, {
            method: "POST",
        });
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.data.status, "ACTIVE");
    });

    await t.test("denies access to another instructor", async () => {
        const response = await request(`/api/v1/question-banks/${createdBankId}`, {
            headers: { authorization: `Bearer ${otherToken}` },
        });
        assert.equal(response.status, 404);
    });
});
