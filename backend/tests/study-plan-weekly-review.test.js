import test from "node:test";
import assert from "node:assert/strict";
import { addCalendarDays, calendarDateKey, summarizePerformance } from "../src/modules/studyPlan/services/studyPlanReview.utils.js";

test("Study Plan Weekly Review date helpers preserve calendar-day boundaries", () => {
    assert.equal(addCalendarDays("2026-11-02", -7), "2026-10-26");
    assert.equal(addCalendarDays("2026-11-02", 1), "2026-11-03");
    assert.equal(calendarDateKey(new Date("2026-11-02T20:30:00.000Z"), "Asia/Kolkata"), "2026-11-03");
});

test("Weekly performance aggregates only supplied eligible evidence", () => {
    const result = summarizePerformance([
        { sourceType: "PRACTICE", totalQuestions: 10, correctCount: 8, scorePercent: 80, passed: null },
        { sourceType: "ASSESSMENT", assessmentSubtype: "TOPIC", totalQuestions: 5, correctCount: 3, scorePercent: 60, passed: true },
        { sourceType: "ASSESSMENT", assessmentSubtype: "FINAL", totalQuestions: 5, correctCount: 2, scorePercent: 40, passed: false },
    ]);

    assert.equal(result.sessions, 3);
    assert.equal(result.questionsAttempted, 20);
    assert.equal(result.questionsCorrect, 13);
    assert.equal(result.accuracyPercent, 65);
    assert.equal(result.averageScorePercent, 60);
    assert.equal(result.passedAssessments, 1);
    assert.equal(result.failedAssessments, 1);
    assert.deepEqual(result.assessmentSubtypes, { DIAGNOSTIC: 0, TOPIC: 1, FINAL: 1 });
});

test("Weekly performance reports no fabricated zero-accuracy result when evidence is absent", () => {
    const result = summarizePerformance([]);
    assert.equal(result.sessions, 0);
    assert.equal(result.questionsAttempted, 0);
    assert.equal(result.questionsCorrect, 0);
    assert.equal(result.accuracyPercent, null);
    assert.equal(result.averageScorePercent, null);
});
