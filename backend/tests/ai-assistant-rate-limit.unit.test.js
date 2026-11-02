import test from "node:test";
import assert from "node:assert/strict";
import { aiAssistantRateLimit, resetAiAssistantRateLimitForTests } from "../src/modules/aiAssistant/middleware/aiAssistantRateLimit.middleware.js";

test("AI assistant applies a per-learner request limit", () => {
    resetAiAssistantRateLimitForTests();
    const learnerId = `rate-test-${Date.now()}`;
    let passed = 0;
    const req = { user: { _id: learnerId } };
    const res = {};
    const next = () => { passed += 1; };

    for (let index = 0; index < 8; index += 1) {
        aiAssistantRateLimit(req, res, next);
    }
    assert.equal(passed, 8);

    assert.throws(
        () => aiAssistantRateLimit(req, res, next),
        (error) => error.statusCode === 429 && error.code === "AI_RATE_LIMIT_EXCEEDED"
    );
    assert.equal(passed, 8);
    resetAiAssistantRateLimitForTests();
});
