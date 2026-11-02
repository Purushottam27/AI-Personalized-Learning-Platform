import test from "node:test";
import assert from "node:assert/strict";
import { addCalendarDays, calendarDateKey, summarizePerformance, summarizeActivityCounts } from "../src/modules/studyPlan/services/studyPlanReview.utils.js";

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


test("Weekly activity counts exclude lessons and other untracked activities from evidence completion", () => {
    const result = summarizeActivityCounts([
        { activityType: "LESSON", isTrackable: false, isCompleted: false, temporalStatus: "PAST" },
        { activityType: "PRACTICE", isTrackable: true, isCompleted: true, temporalStatus: "PAST" },
        { activityType: "ASSESSMENT", isTrackable: true, isCompleted: false, temporalStatus: "PAST" },
        { activityType: "TOPIC_REVIEW", isTrackable: true, isCompleted: false, temporalStatus: "TODAY" },
        { activityType: "RESOURCE", isTrackable: false, isCompleted: false, temporalStatus: "PAST" },
    ]);

    assert.deepEqual(result, {
        scheduledActivities: 5,
        trackableActivities: 3,
        completedActivities: 1,
        pendingActivities: 2,
        overdueActivities: 1,
        completionPercentage: 33.3,
    });
});

test("Weekly activity counts safely report zero completion when no activities are trackable", () => {
    const result = summarizeActivityCounts([
        { activityType: "LESSON", isTrackable: false, isCompleted: false, temporalStatus: "PAST" },
    ]);
    assert.equal(result.scheduledActivities, 1);
    assert.equal(result.trackableActivities, 0);
    assert.equal(result.completedActivities, 0);
    assert.equal(result.pendingActivities, 0);
    assert.equal(result.overdueActivities, 0);
    assert.equal(result.completionPercentage, 0);
});
