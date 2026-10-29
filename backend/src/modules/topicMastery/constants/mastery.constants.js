/**
 * Topic Mastery Constants & Classification Thresholds
 * Authoritative constants following approved MVP specification (docs/03, docs/06, docs/09).
 */

export const MASTERY_STATUS = {
    INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
    NEEDS_IMPROVEMENT: "NEEDS_IMPROVEMENT",
    DEVELOPING: "DEVELOPING",
    FUNCTIONAL: "FUNCTIONAL", // Retained for backward compatibility
    STRONG: "STRONG",
    MASTERED: "MASTERED",     // Retained for backward compatibility
};

export const MASTERY_THRESHOLDS = {
    // Initial approved MVP performance categories:
    // 0 to 59.9: Needs Improvement
    NEEDS_IMPROVEMENT_MAX: 59.9,
    // 60 to 79.9: Developing
    DEVELOPING_MAX: 79.9,
    // 80 to 100: Strong
    STRONG_MIN: 80.0,
};

export const MASTERY_WEIGHTS = {
    // Maximum question-volume weight per single completed evidence event
    // Capped at 20: evidenceWeight = min(questionCount, 20)
    MAX_ATTEMPT_QUESTION_WEIGHT: 20,
};

export const MASTERY_CONFIDENCE = {
    // Initial configurable product defaults for confidence formula:
    // questionRatio = min(1, totalEligibleQuestions / 20)
    TARGET_QUESTIONS_FULL_CONFIDENCE: 20,
    // attemptRatio = min(1, eligibleSubmittedAttemptCount / 5)
    TARGET_ATTEMPTS_FULL_CONFIDENCE: 5,
};

export const CURRENT_CALCULATION_VERSION = "1.1.0";
