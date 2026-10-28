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
import { Lesson } from "../src/modules/lesson/models/lesson.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { LearningEvidence } from "../src/modules/learningEvidence/models/learningEvidence.model.js";
import { TopicMastery } from "../src/modules/topicMastery/models/topicMastery.model.js";
import { GeminiProvider } from "../src/modules/aiAssistant/providers/gemini.provider.js";
import {
    getAiProvider,
    setAiProvider,
    resetAiProvider,
} from "../src/modules/aiAssistant/providers/index.js";
import {
    AI_CONSTANTS,
    AI_ERROR_CODES,
} from "../src/modules/aiAssistant/constants/aiAssistant.constants.js";
import {
    extractLessonText,
    truncateContext,
} from "../src/modules/aiAssistant/services/contextRetrieval.service.js";

test("Stage 7 — AI Learning Assistance Test Suite", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");

    // Connect to test database
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    }

    const testRunId = Date.now();
    const instructorId = new mongoose.Types.ObjectId();
    const learner1Id = new mongoose.Types.ObjectId();
    const unenrolledLearnerId = new mongoose.Types.ObjectId();

    const course1Id = new mongoose.Types.ObjectId();
    const draftCourseId = new mongoose.Types.ObjectId();

    const topic1Id = new mongoose.Types.ObjectId();
    const topic2Id = new mongoose.Types.ObjectId();
    const lesson1Id = new mongoose.Types.ObjectId();

    const createdUserIds = [instructorId, learner1Id, unenrolledLearnerId];
    const createdCourseIds = [course1Id, draftCourseId];
    const createdTopicIds = [topic1Id, topic2Id];
    const createdLessonIds = [lesson1Id];

    // Auth tokens
    function createToken(userId, role) {
        return jwt.sign(
            { sub: userId.toString(), role },
            JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );
    }

    const learner1Token = createToken(learner1Id, "LEARNER");
    const unenrolledLearnerToken = createToken(unenrolledLearnerId, "LEARNER");
    const instructorToken = createToken(instructorId, "INSTRUCTOR");

    // Start local test server
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    function apiRequest({ method = "POST", reqPath, token, body }) {
        return new Promise((resolve, reject) => {
            const req = http.request(
                {
                    hostname: "127.0.0.1",
                    port,
                    path: reqPath,
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                },
                (res) => {
                    let raw = "";
                    res.on("data", (chunk) => {
                        raw += chunk;
                    });
                    res.on("end", () => {
                        let parsed;
                        try {
                            parsed = JSON.parse(raw);
                        } catch {
                            parsed = raw;
                        }
                        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
                    });
                }
            );
            req.on("error", reject);
            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    // Setup fixtures in isolated DB
    await t.test("Setup test fixtures in isolated database", async () => {
        // Pre-clean any prior leftover records
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Course.deleteMany({ _id: { $in: createdCourseIds } });
        await Topic.deleteMany({ _id: { $in: createdTopicIds } });
        await Lesson.deleteMany({ _id: { $in: createdLessonIds } });
        await Enrollment.deleteMany({ learnerId: { $in: createdUserIds } });

        await User.create([
            { _id: instructorId, name: "AI Instructor", email: `ai_inst_${testRunId}@test.com`, passwordHash: "hash", role: "INSTRUCTOR", status: "ACTIVE" },
            { _id: learner1Id, name: "AI Learner 1", email: `ai_l1_${testRunId}@test.com`, passwordHash: "hash", role: "LEARNER", status: "ACTIVE" },
            { _id: unenrolledLearnerId, name: "AI Unenrolled", email: `ai_unenrolled_${testRunId}@test.com`, passwordHash: "hash", role: "LEARNER", status: "ACTIVE" },
        ]);

        await Course.create([
            {
                _id: course1Id,
                title: "Introduction to Algorithms",
                description: "Master foundational algorithms, data structures, and algorithmic complexity.",
                createdBy: instructorId,
                domain: "Computer Science",
                category: "Algorithms",
                difficulty: "BEGINNER",
                status: "PUBLISHED",
                objectives: ["Understand Big-O notation", "Analyze sorting algorithms"],
            },
            {
                _id: draftCourseId,
                title: "Draft Course Title",
                description: "Unpublished course draft for testing access control restrictions.",
                createdBy: instructorId,
                domain: "Computer Science",
                category: "Algorithms",
                difficulty: "BEGINNER",
                status: "DRAFT",
            },
        ]);

        await Topic.create([
            {
                _id: topic1Id,
                courseId: course1Id,
                title: "Time & Space Complexity",
                description: "Foundational asymptotic analysis.",
                learningObjectives: ["Calculate Big-O of linear and binary search"],
                order: 1,
            },
            {
                _id: topic2Id,
                courseId: course1Id,
                title: "Sorting Fundamentals",
                description: "Comparison-based sorting algorithms.",
                learningObjectives: ["Implement and analyze Bubble Sort and Merge Sort"],
                order: 2,
            },
        ]);

        await Lesson.create([
            {
                _id: lesson1Id,
                topicId: topic1Id,
                title: "Understanding Big-O Notation",
                description: "Detailed breakdown of algorithmic growth rates.",
                order: 1,
                content: [
                    { type: "HEADING", level: 2, content: "What is Big-O?" },
                    { type: "TEXT", content: "Big-O notation characterizes functions according to their growth rates." },
                    { type: "CALLOUT", variant: "TIP", content: "O(1) is constant time, O(n) is linear time." },
                    { type: "CODE", language: "javascript", content: "function findFirst(arr) { return arr[0]; }" },
                ],
            },
        ]);

        await Enrollment.create([
            {
                learnerId: learner1Id,
                courseId: course1Id,
                status: "ACTIVE",
            },
        ]);
    });

    // -------------------------------------------------------------
    // Part 1: Configuration & Secret Protection Tests
    // -------------------------------------------------------------
    await t.test("Part 1: Configuration & Secret Protection Tests", async (t) => {
        await t.test("1.1 GeminiProvider reports unconfigured when apiKey is empty", () => {
            const provider = new GeminiProvider({ apiKey: "" });
            assert.equal(provider.isConfigured(), false);
        });

        await t.test("1.2 GeminiProvider defaults model when not specified", () => {
            const provider = new GeminiProvider({ apiKey: "test-fake-key", model: null });
            assert.equal(provider.model, AI_CONSTANTS.DEFAULT_MODEL);
        });

        await t.test("1.3 GeminiProvider throws 503 CONFIG_MISSING when unconfigured", async () => {
            const provider = new GeminiProvider({ apiKey: "" });
            await assert.rejects(
                async () => {
                    await provider.generateText({ prompt: "Hello" });
                },
                (err) => {
                    assert.equal(err.statusCode, 503);
                    assert.equal(err.code, AI_ERROR_CODES.CONFIG_MISSING);
                    return true;
                }
            );
        });

        await t.test("1.4 Diagnostics do not leak secret keys", () => {
            const provider = new GeminiProvider({ apiKey: "secret-key-123456" });
            const serialized = JSON.stringify({ isConfigured: provider.isConfigured(), model: provider.model });
            assert.equal(serialized.includes("secret-key-123456"), false);
        });
    });

    // -------------------------------------------------------------
    // Part 2: Helper & Grounding Utility Tests
    // -------------------------------------------------------------
    await t.test("Part 2: Content Extraction & Truncation Helpers", async (t) => {
        await t.test("2.1 extractLessonText extracts text, headings, callouts, and code", () => {
            const blocks = [
                { type: "HEADING", content: "Overview" },
                { type: "TEXT", content: "Introduction text." },
                { type: "CALLOUT", variant: "WARNING", content: "Be careful." },
                { type: "CODE", language: "python", content: "print(1)" },
            ];
            const text = extractLessonText(blocks);
            assert.ok(text.includes("### Overview"));
            assert.ok(text.includes("Introduction text."));
            assert.ok(text.includes("[WARNING]: Be careful."));
            assert.ok(text.includes("```python\nprint(1)\n```"));
        });

        await t.test("2.2 truncateContext bounds context size safely", () => {
            const longText = "a".repeat(10000);
            const truncated = truncateContext(longText, 500);
            assert.ok(truncated.length < 600);
            assert.ok(truncated.includes("[Context truncated for brevity]"));
        });
    });

    // -------------------------------------------------------------
    // Part 3: Provider Error Mapping & Mock Tests
    // -------------------------------------------------------------
    await t.test("Part 3: Provider Error Mapping & Isolation Tests", async (t) => {
        const originalFetch = globalThis.fetch;

        await t.test("3.1 Mock provider generates valid response", async () => {
            setAiProvider({
                generateText: async ({ prompt }) => ({
                    text: `Mock explanation for: ${prompt}`,
                    model: "mock-model",
                }),
            });

            const provider = getAiProvider();
            const res = await provider.generateText({ prompt: "What is recursion?" });
            assert.equal(res.text, "Mock explanation for: What is recursion?");
            assert.equal(res.model, "mock-model");
        });

        await t.test("3.2 GeminiProvider maps 429 to RATE_LIMIT_EXCEEDED", async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 429,
                json: async () => ({ error: { message: "Quota exceeded" } }),
            });

            const provider = new GeminiProvider({ apiKey: "fake-key" });
            await assert.rejects(
                async () => {
                    await provider.generateText({ prompt: "Test prompt" });
                },
                (err) => {
                    assert.equal(err.statusCode, 429);
                    assert.equal(err.code, AI_ERROR_CODES.RATE_LIMIT_EXCEEDED);
                    return true;
                }
            );
        });

        await t.test("3.3 GeminiProvider maps 401/403 to PROVIDER_UNAVAILABLE", async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 403,
                json: async () => ({ error: { message: "Invalid API key" } }),
            });

            const provider = new GeminiProvider({ apiKey: "fake-key" });
            await assert.rejects(
                async () => {
                    await provider.generateText({ prompt: "Test prompt" });
                },
                (err) => {
                    assert.equal(err.statusCode, 503);
                    assert.equal(err.code, AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
                    assert.equal(err.message, "AI service authentication failed");
                    return true;
                }
            );
        });

        await t.test("3.4 GeminiProvider maps 404 model not found to PROVIDER_UNAVAILABLE", async () => {
            globalThis.fetch = async () => ({
                ok: false,
                status: 404,
                json: async () => ({ error: { message: "Model not found" } }),
            });

            const provider = new GeminiProvider({ apiKey: "fake-key", model: "unsupported-model" });
            await assert.rejects(
                async () => {
                    await provider.generateText({ prompt: "Test prompt" });
                },
                (err) => {
                    assert.equal(err.statusCode, 503);
                    assert.equal(err.code, AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
                    assert.ok(err.message.includes("Configured AI model is not supported"));
                    return true;
                }
            );
        });

        await t.test("3.5 GeminiProvider maps empty response candidates to 502", async () => {
            globalThis.fetch = async () => ({
                ok: true,
                status: 200,
                json: async () => ({ candidates: [] }),
            });

            const provider = new GeminiProvider({ apiKey: "fake-key" });
            await assert.rejects(
                async () => {
                    await provider.generateText({ prompt: "Test prompt" });
                },
                (err) => {
                    assert.equal(err.statusCode, 502);
                    assert.equal(err.code, AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
                    return true;
                }
            );
        });

        await t.test("3.6 GeminiProvider maps network timeout to 504", async () => {
            globalThis.fetch = async () => {
                const timeoutErr = new Error("The operation was aborted");
                timeoutErr.name = "TimeoutError";
                throw timeoutErr;
            };

            const provider = new GeminiProvider({ apiKey: "fake-key" });
            await assert.rejects(
                async () => {
                    await provider.generateText({ prompt: "Test prompt" });
                },
                (err) => {
                    assert.equal(err.statusCode, 504);
                    assert.equal(err.code, AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
                    return true;
                }
            );
        });

        // Restore global fetch and reset provider
        globalThis.fetch = originalFetch;
        resetAiProvider();
    });

    // -------------------------------------------------------------
    // Part 4: API Validation Tests
    // -------------------------------------------------------------
    await t.test("Part 4: API Validation Tests", async (t) => {
        // Set deterministic mock provider for API calls
        setAiProvider({
            generateText: async ({ prompt, systemInstruction }) => {
                const usedGrounding = Boolean(systemInstruction && systemInstruction.includes("OFFICIAL COURSE CONTEXT"));
                return {
                    text: `Educational answer for "${prompt}". Grounded: ${usedGrounding}`,
                    model: "mock-model",
                };
            },
        });

        await t.test("4.1 Rejects unauthenticated request with 401", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                body: { question: "Explain Big-O notation" },
            });
            assert.equal(res.statusCode, 401);
        });

        await t.test("4.2 Rejects non-LEARNER role with 403", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: instructorToken,
                body: { question: "Explain Big-O notation" },
            });
            assert.equal(res.statusCode, 403);
        });

        await t.test("4.3 Rejects missing question with 400 VALIDATION_ERROR", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: {},
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "VALIDATION_ERROR");
        });

        await t.test("4.4 Rejects empty/whitespace-only question with 400 VALIDATION_ERROR", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: { question: "    " },
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "VALIDATION_ERROR");
        });

        await t.test("4.5 Rejects oversized question (> 1000 chars) with 400 VALIDATION_ERROR", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: { question: "x".repeat(1001) },
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "VALIDATION_ERROR");
        });

        await t.test("4.6 Rejects invalid ObjectId for courseId with 400 VALIDATION_ERROR", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: { question: "What is time complexity?", courseId: "not-an-objectid" },
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "VALIDATION_ERROR");
        });

        await t.test("4.7 Rejects excessive conversation history (> 6 messages) with 400 VALIDATION_ERROR", async () => {
            const history = Array.from({ length: 7 }, (_, i) => ({
                role: i % 2 === 0 ? "user" : "assistant",
                content: `Message ${i}`,
            }));
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: { question: "What is time complexity?", history },
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "VALIDATION_ERROR");
        });
    });

    // -------------------------------------------------------------
    // Part 5: Authorization, Context Retrieval & Grounding Tests
    // -------------------------------------------------------------
    await t.test("Part 5: Authorization, Context Retrieval & Grounding Tests", async (t) => {
        await t.test("5.1 General concept question (no context) returns answer with usedCourseContext=false", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: { question: "What is dynamic programming in general?" },
            });
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.data.usedCourseContext, false);
            assert.deepEqual(res.body.data.sources, []);
            assert.ok(res.body.data.answer.includes("Grounded: false"));
        });

        await t.test("5.2 Enrolled learner asking about enrolled course receives grounded answer with sources", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: {
                    question: "Explain the topics covered in this course",
                    courseId: course1Id.toString(),
                },
            });
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.data.usedCourseContext, true);
            assert.ok(res.body.data.sources.length >= 1);
            assert.equal(res.body.data.sources[0].type, "course");
            assert.equal(res.body.data.sources[0].id, course1Id.toString());
            assert.ok(res.body.data.answer.includes("Grounded: true"));
        });

        await t.test("5.3 Enrolled learner asking with specific lessonId receives lesson-grounded context", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: {
                    question: "How does constant time differ from linear time in this lesson?",
                    courseId: course1Id.toString(),
                    topicId: topic1Id.toString(),
                    lessonId: lesson1Id.toString(),
                },
            });
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.data.usedCourseContext, true);
            const sourceTypes = res.body.data.sources.map((s) => s.type);
            assert.ok(sourceTypes.includes("course"));
            assert.ok(sourceTypes.includes("topic"));
            assert.ok(sourceTypes.includes("lesson"));
        });

        await t.test("5.4 Unenrolled learner cannot access course context (403 ENROLLMENT_REQUIRED)", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: unenrolledLearnerToken,
                body: {
                    question: "Explain this course",
                    courseId: course1Id.toString(),
                },
            });
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.error?.code, AI_ERROR_CODES.ENROLLMENT_REQUIRED);
        });

        await t.test("5.5 Learner cannot access unpublished draft course context (403 COURSE_NOT_AVAILABLE)", async () => {
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: {
                    question: "Explain this draft material",
                    courseId: draftCourseId.toString(),
                },
            });
            assert.equal(res.statusCode, 403);
            assert.equal(res.body.error?.code, AI_ERROR_CODES.COURSE_NOT_AVAILABLE);
        });

        await t.test("5.6 Mismatched topic/course reference is rejected with 400 INVALID_CONTEXT_REFERENCE", async () => {
            const unrelatedCourseId = new mongoose.Types.ObjectId();
            const res = await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: {
                    question: "Explain Big-O",
                    courseId: unrelatedCourseId.toString(),
                    topicId: topic1Id.toString(),
                },
            });
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.error?.code, "INVALID_CONTEXT_REFERENCE");
        });
    });

    // -------------------------------------------------------------
    // Part 6: Integrity & Non-Mutation Tests
    // -------------------------------------------------------------
    await t.test("Part 6: Integrity & Non-Mutation Tests", async (t) => {
        await t.test("6.1 AI assistant requests do NOT create or mutate LearningEvidence", async () => {
            const evidenceCountBefore = await LearningEvidence.countDocuments({ learnerId: learner1Id });

            await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: {
                    question: "What is logarithmic time complexity?",
                    courseId: course1Id.toString(),
                    topicId: topic1Id.toString(),
                },
            });

            const evidenceCountAfter = await LearningEvidence.countDocuments({ learnerId: learner1Id });
            assert.equal(evidenceCountAfter, evidenceCountBefore, "LearningEvidence count must remain unchanged");
        });

        await t.test("6.2 AI assistant requests do NOT create or mutate TopicMastery", async () => {
            const masteryCountBefore = await TopicMastery.countDocuments({ learnerId: learner1Id });

            await apiRequest({
                reqPath: "/api/v1/learning/me/assistant/ask",
                token: learner1Token,
                body: {
                    question: "Give me an example of O(n log n)",
                },
            });

            const masteryCountAfter = await TopicMastery.countDocuments({ learnerId: learner1Id });
            assert.equal(masteryCountAfter, masteryCountBefore, "TopicMastery count must remain unchanged");
        });
    });

    // Teardown
    t.after(async () => {
        resetAiProvider();
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Course.deleteMany({ _id: { $in: createdCourseIds } });
        await Topic.deleteMany({ _id: { $in: createdTopicIds } });
        await Lesson.deleteMany({ _id: { $in: createdLessonIds } });
        await Enrollment.deleteMany({ learnerId: { $in: createdUserIds } });

        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
    });
});
