import mongoose from "mongoose";

const ASSESSMENT_TYPES = ["TOPIC", "DIAGNOSTIC", "FINAL"];
const ASSESSMENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const MAX_ASSESSMENT_POOL_SIZE = 200;

const assessmentSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
        default: null,
        validate: {
            validator(topicId) { return this.type === "TOPIC" ? topicId != null : topicId == null; },
            message: "TOPIC assessments require topicId; DIAGNOSTIC and FINAL assessments must be course-level",
        },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ASSESSMENT_TYPES, required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    questionIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
        default: [],
        validate: [
            { validator(ids) { return ids.length <= MAX_ASSESSMENT_POOL_SIZE; }, message: "Assessment cannot exceed 200 pool questions" },
            { validator(ids) { return ids.length === new Set(ids.map(String)).size; }, message: "Assessment cannot contain duplicate question IDs" },
        ],
    },
    questionsPerAttempt: { type: Number, required: true, min: 5, max: 10, default: 5 },
    passingScore: { type: Number, required: true, min: 0, max: 100, default: 60 },
    maxAttempts: { type: Number, required: true, min: 1, default: 1 },
    randomizeQuestions: { type: Boolean, required: true, default: true },
    randomizeOptions: { type: Boolean, required: true, default: false },
    timeLimitMinutes: { type: Number, min: 1, default: null },
    opensAt: { type: Date, default: null },
    closesAt: { type: Date, default: null },
    status: { type: String, enum: ASSESSMENT_STATUSES, required: true, default: "DRAFT" },
    // Internal write fence used to serialize attempt creation against assessment lifecycle changes.
    attemptVersion: { type: Number, default: 0, select: false },
}, {
    timestamps: true,
    optimisticConcurrency: true,
});

assessmentSchema.index({ courseId: 1, type: 1, status: 1 });
assessmentSchema.index({ topicId: 1, status: 1 });
assessmentSchema.index({ createdBy: 1, createdAt: -1 });

export const Assessment = mongoose.models.Assessment || mongoose.model("Assessment", assessmentSchema);
