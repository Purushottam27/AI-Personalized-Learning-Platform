import {
    MASTERY_STATUS,
    MASTERY_THRESHOLDS,
    MASTERY_WEIGHTS,
    MASTERY_CONFIDENCE,
    CURRENT_CALCULATION_VERSION,
} from "../constants/mastery.constants.js";

function round(val, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(val * factor) / factor;
}

function clamp(val, min, max) {
    if (Number.isNaN(val) || val == null) return min;
    return Math.min(Math.max(val, min), max);
}

/**
 * Pure, deterministic calculation function for topic mastery.
 * Follows approved MVP specification:
 * - 3.1 Attempt score: attemptScore = (earnedMarks / totalPossibleMarks) * 100
 * - 3.2 Evidence weight: evidenceWeight = min(questionCount, 20)
 *   Equal source-type weight; no assessment-specific or recency multipliers.
 *   masteryScore = sum(evidenceWeight * attemptScore) / sum(evidenceWeight)
 * - 3.3 Confidence: questionRatio = min(1, totalQuestions / 20)
 *   attemptRatio = min(1, attempts / 5)
 *   confidence = round(clamp(0.7 * questionRatio + 0.3 * attemptRatio, 0, 1), 2)
 * - 3.4 Status: 0–59.9 NEEDS_IMPROVEMENT, 60–79.9 DEVELOPING, 80–100 STRONG.
 *   Insufficient evidence is a separate state when no eligible evidence or total weight <= 0.
 *
 * @param {Array<Object>} evidenceList - LearningEvidence items sorted ascending by completedAt
 * @returns {Object} Calculated mastery result and aggregates
 */
export function computeTopicMastery(evidenceList = []) {
    if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
        return {
            masteryScore: 0,
            status: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            confidence: 0,
            evidenceCount: 0,
            totalQuestionsAttempted: 0,
            totalQuestionsCorrect: 0,
            totalMarksAwarded: 0,
            totalMarksPossible: 0,
            practiceAttemptsCount: 0,
            assessmentAttemptsCount: 0,
            firstEvidenceAt: null,
            lastEvidenceAt: null,
            calculationVersion: CURRENT_CALCULATION_VERSION,
        };
    }

    const n = evidenceList.length;
    let totalQuestionsAttempted = 0;
    let totalQuestionsCorrect = 0;
    let totalMarksAwarded = 0;
    let totalMarksPossible = 0;
    let practiceAttemptsCount = 0;
    let assessmentAttemptsCount = 0;

    let weightedScoreSum = 0;
    let totalWeightSum = 0;

    const firstEvidenceAt = evidenceList[0].completedAt ? new Date(evidenceList[0].completedAt) : null;
    const lastEvidenceAt = evidenceList[n - 1].completedAt ? new Date(evidenceList[n - 1].completedAt) : null;

    for (let i = 0; i < n; i++) {
        const item = evidenceList[i];

        const questions = Math.max(0, Number(item.totalQuestions) || 0);
        const correct = Math.max(0, Number(item.correctCount) || 0);
        const marks = Math.max(0, Number(item.marksAwarded) || 0);
        const possible = Math.max(0, Number(item.totalMarks) || 0);

        // 3.1 Attempt score from canonical grading: earned marks / total possible marks * 100
        let attemptScore = 0;
        if (possible > 0) {
            attemptScore = (marks / possible) * 100;
        } else if (typeof item.scorePercent === "number" && !Number.isNaN(item.scorePercent)) {
            attemptScore = item.scorePercent;
        }
        attemptScore = clamp(attemptScore, 0, 100);

        totalQuestionsAttempted += questions;
        totalQuestionsCorrect += correct;
        totalMarksAwarded += marks;
        totalMarksPossible += possible;

        if (item.sourceType === "PRACTICE") {
            practiceAttemptsCount += 1;
        } else if (item.sourceType === "ASSESSMENT") {
            assessmentAttemptsCount += 1;
        }

        // 3.2 Evidence weight: min(questionCount, 20) with equal source-type weight, no recency multiplier
        const evidenceWeight = Math.min(questions, MASTERY_WEIGHTS.MAX_ATTEMPT_QUESTION_WEIGHT);

        weightedScoreSum += attemptScore * evidenceWeight;
        totalWeightSum += evidenceWeight;
    }

    // If no eligible evidence or no positive total weight exists, represent as insufficient evidence
    if (totalWeightSum <= 0) {
        return {
            masteryScore: 0,
            status: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            confidence: 0,
            evidenceCount: n,
            totalQuestionsAttempted,
            totalQuestionsCorrect,
            totalMarksAwarded: round(totalMarksAwarded, 2),
            totalMarksPossible: round(totalMarksPossible, 2),
            practiceAttemptsCount,
            assessmentAttemptsCount,
            firstEvidenceAt,
            lastEvidenceAt,
            calculationVersion: CURRENT_CALCULATION_VERSION,
        };
    }

    // Determine final score: sum(evidenceWeight * attemptScore) / sum(evidenceWeight)
    const rawScore = weightedScoreSum / totalWeightSum;
    const masteryScore = round(clamp(rawScore, 0, 100), 1);

    // 3.3 Confidence:
    // questionRatio = min(1, totalEligibleQuestions / 20)
    // attemptRatio = min(1, eligibleSubmittedAttemptCount / 5)
    // confidence = round(clamp(0.7 * questionRatio + 0.3 * attemptRatio, 0, 1), 2)
    const questionRatio = Math.min(
        1.0,
        totalQuestionsAttempted / MASTERY_CONFIDENCE.TARGET_QUESTIONS_FULL_CONFIDENCE
    );
    const attemptRatio = Math.min(
        1.0,
        n / MASTERY_CONFIDENCE.TARGET_ATTEMPTS_FULL_CONFIDENCE
    );
    const rawConfidence = questionRatio * 0.7 + attemptRatio * 0.3;
    const confidence = round(clamp(rawConfidence, 0.0, 1.0), 2);

    // 3.4 Mastery status:
    // 0–59.9: Needs Improvement
    // 60–79.9: Developing
    // 80–100: Strong
    let status;
    if (masteryScore <= MASTERY_THRESHOLDS.NEEDS_IMPROVEMENT_MAX) {
        status = MASTERY_STATUS.NEEDS_IMPROVEMENT;
    } else if (masteryScore <= MASTERY_THRESHOLDS.DEVELOPING_MAX) {
        status = MASTERY_STATUS.DEVELOPING;
    } else {
        status = MASTERY_STATUS.STRONG;
    }

    return {
        masteryScore,
        status,
        confidence,
        evidenceCount: n,
        totalQuestionsAttempted,
        totalQuestionsCorrect,
        totalMarksAwarded: round(totalMarksAwarded, 2),
        totalMarksPossible: round(totalMarksPossible, 2),
        practiceAttemptsCount,
        assessmentAttemptsCount,
        firstEvidenceAt,
        lastEvidenceAt,
        calculationVersion: CURRENT_CALCULATION_VERSION,
    };
}
