import mongoose from "mongoose";

const learningEvidenceSchema = new mongoose.Schema({
    learnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true,
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
        default: null,
        index: true,
    },
    sourceType: {
        type: String,
        enum: ["PRACTICE", "ASSESSMENT"],
        required: true,
        index: true,
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    assessmentSubtype: {
        type: String,
        enum: ["DIAGNOSTIC", "TOPIC", "FINAL", null],
        default: null,
    },
    completedAt: {
        type: Date,
        required: true,
        index: true,
    },
    totalQuestions: {
        type: Number,
        required: true,
        min: 1,
    },
    correctCount: {
        type: Number,
        default: null,
        min: 0,
    },
    totalMarks: {
        type: Number,
        required: true,
        min: 0,
    },
    marksAwarded: {
        type: Number,
        required: true,
        min: 0,
    },
    scorePercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    passed: {
        type: Boolean,
        default: null,
    },
    contributeToLearningEvidence: {
        type: Boolean,
        required: true,
        default: true,
    },
}, {
    timestamps: true,
    optimisticConcurrency: true,
});

// Unique index on attemptId guarantees no attempt ever produces duplicate evidence
learningEvidenceSchema.index({ attemptId: 1 }, { unique: true, name: "uniq_learning_evidence_attempt" });
learningEvidenceSchema.index({ learnerId: 1, courseId: 1, completedAt: -1 });
learningEvidenceSchema.index({ learnerId: 1, topicId: 1, completedAt: -1 });
learningEvidenceSchema.index({ courseId: 1, completedAt: -1 });
learningEvidenceSchema.index({ sourceType: 1, sourceId: 1 });

export const LearningEvidence = mongoose.models.LearningEvidence || mongoose.model("LearningEvidence", learningEvidenceSchema);
