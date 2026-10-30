import mongoose from "mongoose";

const proposedActivitySchema = new mongoose.Schema({
    activityId: { type: String, required: true },
    dayOfWeek: {
        type: String,
        enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
        required: true
    },
    scheduledDate: { type: String, required: true },
    activityType: {
        type: String,
        enum: ["LESSON", "PRACTICE", "ASSESSMENT", "RESOURCE", "TOPIC_REVIEW", "COURSE_DISCOVERY"],
        required: true
    },
    title: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    courseTitle: { type: String, required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
    topicTitle: { type: String, default: null },
    targetId: { type: String, default: null },
    estimatedDurationMinutes: { type: Number, default: 30 },
    durationAllocationType: {
        type: String,
        enum: ["ESTIMATED", "PLANNING_ALLOCATION"],
        default: "PLANNING_ALLOCATION"
    },
    rationale: { type: String, required: true },
    actionUrl: { type: String, required: true },
    order: { type: Number, required: true, default: 1 }
}, { _id: false });

const studyPlanProposalSchema = new mongoose.Schema({
    learnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    basedOnPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StudyPlan",
        default: null
    },
    basedOnVersion: {
        type: Number,
        required: true,
        default: 1
    },
    proposedVersion: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING", "ACCEPTED", "EXPIRED", "REJECTED"],
        default: "PENDING",
        index: true
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    isRevisionRecommended: { type: Boolean, required: true, default: false },
    proposedActivities: [proposedActivitySchema],
    preferencesSnapshot: {
        dailyStudyTime: { type: String, default: null },
        preferredLearningFormat: { type: [String], default: [] },
        studyDays: { type: [String], default: [] },
        preferredSessionDuration: { type: Number, default: 45 },
        preferredTimeOfDay: { type: String, default: "ANYTIME" }
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

studyPlanProposalSchema.index({ learnerId: 1, status: 1 });

export const StudyPlanProposal = mongoose.model("StudyPlanProposal", studyPlanProposalSchema);

