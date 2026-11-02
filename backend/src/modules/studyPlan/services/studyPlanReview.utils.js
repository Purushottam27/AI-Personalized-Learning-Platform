const DAY_MS = 24 * 60 * 60 * 1000;

export function calendarDateKey(date, timeZone = process.env.APP_TIMEZONE || "UTC") {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

export function addCalendarDays(dateKey, amount) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + amount));
    return date.toISOString().slice(0, 10);
}


export function emptyPerformance() {
    return {
        sessions: 0,
        questionsAttempted: 0,
        questionsCorrect: 0,
        accuracyPercent: null,
        averageScorePercent: null,
        scorePercentTotal: 0,
        passedAssessments: 0,
        failedAssessments: 0,
        assessmentSubtypes: { DIAGNOSTIC: 0, TOPIC: 0, FINAL: 0 },
    };
}

export function summarizePerformance(evidence) {
    const summary = emptyPerformance();
    if (!evidence.length) return summary;

    summary.sessions = evidence.length;
    summary.questionsAttempted = evidence.reduce((sum, item) => sum + (Number(item.totalQuestions) || 0), 0);
    summary.questionsCorrect = evidence.reduce((sum, item) => sum + (Number(item.correctCount) || 0), 0);
    summary.accuracyPercent = summary.questionsAttempted > 0
        ? Number(((summary.questionsCorrect / summary.questionsAttempted) * 100).toFixed(1))
        : null;
    summary.scorePercentTotal = evidence.reduce((sum, item) => sum + (Number(item.scorePercent) || 0), 0);
    summary.averageScorePercent = Number((summary.scorePercentTotal / evidence.length).toFixed(1));
    summary.passedAssessments = evidence.filter((item) => item.sourceType === "ASSESSMENT" && item.passed === true).length;
    summary.failedAssessments = evidence.filter((item) => item.sourceType === "ASSESSMENT" && item.passed === false).length;
    for (const item of evidence) {
        if (item.sourceType === "ASSESSMENT" && item.assessmentSubtype && Object.hasOwn(summary.assessmentSubtypes, item.assessmentSubtype)) {
            summary.assessmentSubtypes[item.assessmentSubtype] += 1;
        }
    }
    delete summary.scorePercentTotal;
    return summary;
}



/**
 * Summarizes scheduled activity outcomes without treating self-paced or otherwise
 * untracked activities as incomplete work. Only the supplied canonical trackable
 * types participate in completion and overdue metrics.
 */
export function summarizeActivityCounts(activities = []) {
    const trackable = activities.filter((activity) => activity.isTrackable === true);
    const completed = trackable.filter((activity) => activity.isCompleted === true).length;
    const pending = trackable.filter((activity) => activity.isCompleted !== true);
    const overdue = pending.filter((activity) => activity.temporalStatus === "PAST").length;

    return {
        scheduledActivities: activities.length,
        trackableActivities: trackable.length,
        completedActivities: completed,
        pendingActivities: pending.length,
        overdueActivities: overdue,
        completionPercentage: trackable.length
            ? Number(((completed / trackable.length) * 100).toFixed(1))
            : 0,
    };
}
