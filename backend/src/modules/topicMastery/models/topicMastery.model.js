import mongoose from "mongoose";
import { MASTERY_STATUS, CURRENT_CALCULATION_VERSION } from "../constants/mastery.constants.js";

const topicMasterySchema = new mongoose.Schema(
    {
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
            required: true,
            index: true,
        },
        masteryScore: {
            type: Number,
            required: false,
            min: 0,
            max: 100,
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(MASTERY_STATUS),
            required: true,
            default: MASTERY_STATUS.INSUFFICIENT_EVIDENCE,
            index: true,
        },
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
            default: 0,
        },
        evidenceCount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalQuestionsAttempted: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalQuestionsCorrect: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalMarksAwarded: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalMarksPossible: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        practiceAttemptsCount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        assessmentAttemptsCount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        firstEvidenceAt: {
            type: Date,
            default: null,
        },
        lastEvidenceAt: {
            type: Date,
            default: null,
        },
        lastEvaluatedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        calculationVersion: {
            type: String,
            required: true,
            default: CURRENT_CALCULATION_VERSION,
        },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
    }
);

// Unique database-level index enforcing one authoritative record per learner/course/topic
topicMasterySchema.index(
    { learnerId: 1, courseId: 1, topicId: 1 },
    { unique: true, name: "uniq_learner_course_topic_mastery" }
);

topicMasterySchema.index({ learnerId: 1, courseId: 1, status: 1 });
topicMasterySchema.index({ learnerId: 1, status: 1 });
topicMasterySchema.index({ topicId: 1, status: 1 });
topicMasterySchema.index({ courseId: 1, status: 1 });

export const TopicMastery =
    mongoose.models.TopicMastery || mongoose.model("TopicMastery", topicMasterySchema);
