/**
 * Topic Mastery Constants & Classification Thresholds
 * Authoritative constants following docs/03, docs/06, and docs/09.
 */

export const MASTERY_STATUS = {
    INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
    NEEDS_IMPROVEMENT: "NEEDS_IMPROVEMENT",
    DEVELOPING: "DEVELOPING",
    FUNCTIONAL: "FUNCTIONAL",
    STRONG: "STRONG",
    MASTERED: "MASTERED",
};

export const MASTERY_THRESHOLDS = {
    // 0 to 39.99: Weak / Needs targeted remediation
    WEAK_MAX: 39.99,
    // 40 to 59.99: Developing
    DEVELOPING_MAX: 59.99,
    // 60 to 74.99: Functional understanding
    FUNCTIONAL_MAX: 74.99,
    // 75 to 89.99: Strong mastery
    STRONG_MAX: 89.99,
    // 90 to 100: Mastered
    MASTERED_MIN: 90.00,
};

export const MASTERY_WEIGHTS = {
    // Assessment evidence carries slightly higher weight than informal practice
    ASSESSMENT_TOPIC: 1.2,
    PRACTICE: 1.0,
    // Maximum sample size per single attempt to prevent a single huge attempt from dominating
    MAX_ATTEMPT_QUESTION_WEIGHT: 20,
    // Recency factor: most recent attempt receives up to 1.5x the base weight of the oldest
    MAX_RECENCY_BOOST: 0.5,
};

export const MASTERY_CONFIDENCE = {
    // Minimum questions attempted across all evidence to exit INSUFFICIENT_EVIDENCE
    MIN_QUESTIONS_FOR_SUFFICIENCY: 5,
    // Target questions for full confidence (0.7 weight in formula)
    TARGET_QUESTIONS_FULL_CONFIDENCE: 20,
    // Target attempts for full confidence (0.3 weight in formula)
    TARGET_ATTEMPTS_FULL_CONFIDENCE: 3,
};

export const CURRENT_CALCULATION_VERSION = "1.0.0";
