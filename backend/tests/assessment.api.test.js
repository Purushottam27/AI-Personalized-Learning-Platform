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
import { Question } from "../src/modules/question/models/question.model.js";
import { Assessment } from "../src/modules/assessment/models/assessment.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("Assessment HTTP API integration", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    const instructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    let connected = false;
    let server;
    let baseUrl;

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await Assessment.deleteMany({ createdBy: instructorId });
            await Question.deleteMany({ createdBy: instructorId });
            await QuestionBank.deleteMany({ createdBy: instructorId });
            await Topic.deleteMany({ courseId });
            await Course.deleteMany({ _id: courseId });
            await User.deleteMany({ _id: instructorId });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME);
    await Promise.all([User.init(), Course.init(), Topic.init(), QuestionBank.init(), Question.init(), Assessment.init()]);

    await User.create({
        _id: instructorId,
        name: "Assessment API Test Instructor",
        email: `assessment-api-${instructorId}@example.test`,
        role: "INSTRUCTOR",
        status: "ACTIVE",
    });
    const course = await Course.create({
        _id: courseId,
        title: "Assessment API Test Course",
        description: "Course fixture used to verify Assessment HTTP routes.",
        createdBy: instructorId,
        domain: "Testing",
        category: "Integration",
        difficulty: "BEGINNER",
        objectives: [],
    });
    const topic = await Topic.create({
        courseId: course._id,
        title: "Assessment API Topic",
        learningObjectives: [],
        order: 1,
    });
    await QuestionBank.create({
        courseId: course._id,
        topicId: topic._id,
        createdBy: instructorId,
        title: "Assessment API Question Bank",
        status: "ACTIVE",
    });

    const token = jwt.sign({ sub: instructorId.toString(), role: "INSTRUCTOR" }, JWT_ACCESS_SECRET, { expiresIn: "5m" });
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    const request = (url, options = {}) => fetch(`${baseUrl}${url}`, {
        ...options,
        headers: {
            ...(options.body ? { "content-type": "application/json" } : {}),
            ...(options.headers ?? {}),
            ...(options.auth === false ? {} : { authorization: `Bearer ${token}` }),
        },
    });

    await t.test("requires authentication", async () => {
        const response = await request("/api/v1/assessments", { method: "POST", auth: false, body: JSON.stringify({}) });
        assert.equal(response.status, 401);
    });

    let assessmentId;
    await t.test("creates a draft through the registered route", async () => {
        const response = await request("/api/v1/assessments", {
            method: "POST",
            body: JSON.stringify({
                courseId: course._id.toString(),
                topicId: topic._id.toString(),
                type: "TOPIC",
                title: "Topic API Assessment",
            }),
        });
        const body = await response.json();
        assert.equal(response.status, 201, JSON.stringify(body));
        assert.equal(body.success, true);
        assert.equal(body.data.status, "DRAFT");
        assert.equal(body.data.type, "TOPIC");
        assessmentId = body.data._id;
    });

    await t.test("lists by course and reads by ID", async () => {
        const listResponse = await request(`/api/v1/courses/${course._id}/assessments`);
        const listBody = await listResponse.json();
        assert.equal(listResponse.status, 200, JSON.stringify(listBody));
        assert.ok(listBody.data.some((item) => item._id === assessmentId));

        const detailResponse = await request(`/api/v1/assessments/${assessmentId}`);
        const detailBody = await detailResponse.json();
        assert.equal(detailResponse.status, 200, JSON.stringify(detailBody));
        assert.equal(detailBody.data._id, assessmentId);
    });

    await t.test("validates malformed IDs and unknown body fields", async () => {
        const badId = await request("/api/v1/assessments/not-an-object-id");
        assert.equal(badId.status, 400);

        const invalidBody = await request("/api/v1/assessments", {
            method: "POST",
            body: JSON.stringify({
                courseId: course._id.toString(),
                type: "TOPIC",
                title: "Valid Title",
                unexpected: true,
            }),
        });
        assert.equal(invalidBody.status, 400);
    });

    await t.test("updates a draft and archives/restores it", async () => {
        const updateResponse = await request(`/api/v1/assessments/${assessmentId}`, {
            method: "PATCH",
            body: JSON.stringify({ title: "Updated Topic Assessment" }),
        });
        const updateBody = await updateResponse.json();
        assert.equal(updateResponse.status, 200, JSON.stringify(updateBody));
        assert.equal(updateBody.data.title, "Updated Topic Assessment");

        const archiveResponse = await request(`/api/v1/assessments/${assessmentId}/archive`, { method: "POST" });
        assert.equal(archiveResponse.status, 200);
        const restoreResponse = await request(`/api/v1/assessments/${assessmentId}/restore`, { method: "POST" });
        const restoreBody = await restoreResponse.json();
        assert.equal(restoreResponse.status, 200, JSON.stringify(restoreBody));
        assert.equal(restoreBody.data.status, "DRAFT");
    });
});
