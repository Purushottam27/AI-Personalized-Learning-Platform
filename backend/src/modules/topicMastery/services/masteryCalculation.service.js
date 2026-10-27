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
 * Calculates score, confidence, aggregates, and status from a sorted list of eligible LearningEvidence.
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
        const scorePercent = clamp(Number(item.scorePercent) || 0, 0, 100);

        totalQuestionsAttempted += questions;
        totalQuestionsCorrect += correct;
        totalMarksAwarded += marks;
        totalMarksPossible += possible;

        if (item.sourceType === "PRACTICE") {
            practiceAttemptsCount += 1;
        } else if (item.sourceType === "ASSESSMENT") {
            assessmentAttemptsCount += 1;
        }

        // Determine source type weight
        const sourceWeight =
            item.sourceType === "ASSESSMENT" && item.assessmentSubtype === "TOPIC"
                ? MASTERY_WEIGHTS.ASSESSMENT_TOPIC
                : MASTERY_WEIGHTS.PRACTICE;

        // Recency factor: scales from 1.0 (oldest) up to 1.0 + MAX_RECENCY_BOOST (newest)
        const recencyFactor = n > 1
            ? 1.0 + (i / (n - 1)) * MASTERY_WEIGHTS.MAX_RECENCY_BOOST
            : 1.0;

        // Question volume weight (capped to prevent single huge attempt domination)
        const volumeWeight = Math.min(
            Math.max(questions, 1),
            MASTERY_WEIGHTS.MAX_ATTEMPT_QUESTION_WEIGHT
        );

        const itemWeight = sourceWeight * recencyFactor * volumeWeight;
        weightedScoreSum += scorePercent * itemWeight;
        totalWeightSum += itemWeight;
    }

    // Determine final score
    const rawScore = totalWeightSum > 0 ? weightedScoreSum / totalWeightSum : 0;
    const masteryScore = round(clamp(rawScore, 0, 100), 1);

    // Calculate confidence bounded between 0.0 and 1.0
    // Combines question volume (70%) and attempt frequency (30%)
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

    // Determine status:
    // If questions attempted is below sufficiency threshold, status is INSUFFICIENT_EVIDENCE
    let status;
    if (totalQuestionsAttempted < MASTERY_CONFIDENCE.MIN_QUESTIONS_FOR_SUFFICIENCY) {
        status = MASTERY_STATUS.INSUFFICIENT_EVIDENCE;
    } else if (masteryScore <= MASTERY_THRESHOLDS.WEAK_MAX) {
        status = MASTERY_STATUS.NEEDS_IMPROVEMENT;
    } else if (masteryScore <= MASTERY_THRESHOLDS.DEVELOPING_MAX) {
        status = MASTERY_STATUS.DEVELOPING;
    } else if (masteryScore <= MASTERY_THRESHOLDS.FUNCTIONAL_MAX) {
        status = MASTERY_STATUS.FUNCTIONAL;
    } else if (masteryScore <= MASTERY_THRESHOLDS.STRONG_MAX) {
        status = MASTERY_STATUS.STRONG;
    } else {
        status = MASTERY_STATUS.MASTERED;
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
