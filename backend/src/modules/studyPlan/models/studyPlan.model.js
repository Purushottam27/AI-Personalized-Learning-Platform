import mongoose from "mongoose";

const ACTIVITY_TYPES = [
    "LESSON",
    "PRACTICE",
    "ASSESSMENT",
    "RESOURCE",
    "TOPIC_REVIEW",
    "COURSE_DISCOVERY"
];

const scheduledActivitySchema = new mongoose.Schema({
    activityId: {
        type: String,
        required: true
    },
    dayOfWeek: {
        type: String,
        enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
        required: true
    },
    scheduledDate: {
        type: String, // YYYY-MM-DD
        required: true
    },
    activityType: {
        type: String,
        enum: ACTIVITY_TYPES,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    courseTitle: {
        type: String,
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
        default: null
    },
    topicTitle: {
        type: String,
        default: null
    },
    targetId: {
        type: String, // lessonId, practiceId, assessmentId, or resourceId
        default: null
    },
    estimatedDurationMinutes: {
        type: Number,
        default: 30
    },
    durationAllocationType: {
        type: String,
        enum: ["ESTIMATED", "PLANNING_ALLOCATION"],
        default: "PLANNING_ALLOCATION"
    },
    rationale: {
        type: String,
        required: true
    },
    actionUrl: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        required: true,
        default: 1
    }
}, { _id: false });

const studyPlanSchema = new mongoose.Schema({
    learnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    version: {
        type: Number,
        required: true,
        default: 1
    },
    status: {
        type: String,
        enum: ["ACTIVE", "SUPERSEDED", "ARCHIVED"],
        default: "ACTIVE",
        required: true,
        index: true
    },
    startDate: {
        type: String, // YYYY-MM-DD
        required: true
    },
    endDate: {
        type: String, // YYYY-MM-DD
        required: true
    },
    preferencesSnapshot: {
        dailyStudyTime: { type: String, default: null },
        preferredLearningFormat: { type: [String], default: [] },
        studyDays: { type: [String], default: [] },
        preferredSessionDuration: { type: Number, default: 45 },
        preferredTimeOfDay: { type: String, default: "ANYTIME" }
    },
    scheduledActivities: [scheduledActivitySchema],
    generationSource: {
        type: String,
        enum: ["AI_ASSISTED", "DETERMINISTIC_FALLBACK"],
        default: "DETERMINISTIC_FALLBACK"
    },
    revisionReason: {
        type: String,
        default: null
    },
    previousPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StudyPlan",
        default: null
    }
}, {
    timestamps: true
});

studyPlanSchema.index({ learnerId: 1, status: 1 });
studyPlanSchema.index({ learnerId: 1, version: -1 });

export const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);

