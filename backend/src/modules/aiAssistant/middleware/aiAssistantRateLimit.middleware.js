import { ApiError } from "../../../shared/errors/ApiError.js";
import { AI_ERROR_CODES } from "../constants/aiAssistant.constants.js";

const userBuckets = new Map();
const globalBucket = { windowStart: Date.now(), count: 0 };

const USER_RPM = Math.max(1, Number.parseInt(process.env.AI_ASSISTANT_USER_RPM || "8", 10));
const GLOBAL_RPM = Math.max(1, Number.parseInt(process.env.AI_ASSISTANT_GLOBAL_RPM || "30", 10));
const WINDOW_MS = 60_000;

function consumeBucket(bucket, limit, now) {
    if (now - bucket.windowStart >= WINDOW_MS) {
        bucket.windowStart = now;
        bucket.count = 0;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
}

/**
 * Lightweight per-process protection for the shared Gemini free-tier quota.
 * For multi-instance deployments, replace with a shared Redis-backed limiter.
 */
export function aiAssistantRateLimit(req, res, next) {
    const now = Date.now();
    const learnerId = String(req.user?._id || req.user?.id || "unknown");
    let userBucket = userBuckets.get(learnerId);
    if (!userBucket || now - userBucket.windowStart >= WINDOW_MS) {
        userBucket = { windowStart: now, count: 0 };
        userBuckets.set(learnerId, userBucket);
    }

    if (!consumeBucket(userBucket, USER_RPM, now)) {
        throw new ApiError(429, AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "You've sent several requests in a short time. Please wait a minute before trying again.");
    }
    if (!consumeBucket(globalBucket, GLOBAL_RPM, now)) {
        userBucket.count = Math.max(0, userBucket.count - 1);
        throw new ApiError(429, AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "The learning assistant is busy right now. Please try again shortly.");
    }

    // Periodically remove expired learner buckets to keep memory bounded.
    if (userBuckets.size > 5000) {
        for (const [key, bucket] of userBuckets) {
            if (now - bucket.windowStart >= WINDOW_MS) userBuckets.delete(key);
        }
    }
    next();
}

export function resetAiAssistantRateLimitForTests() {
    userBuckets.clear();
    globalBucket.windowStart = Date.now();
    globalBucket.count = 0;
}
