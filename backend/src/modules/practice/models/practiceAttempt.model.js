import mongoose from "mongoose";

const snapshotOptionSchema = new mongoose.Schema({
    key: { type: String, required: true },
    text: { type: String, required: true },
}, { _id: false });

const practiceQuestionSnapshotSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    questionText: { type: String, required: true },
    type: { type: String, enum: ["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"], required: true },
    options: { type: [snapshotOptionSchema], default: [] },
    // Server-only fields until attempt is submitted:
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    explanation: { type: String, default: "" },
    marks: { type: Number, required: true, min: 1, default: 1 },
    difficulty: { type: String, enum: ["EASY", "MEDIUM", "HARD"], required: true },
}, { _id: false });

const practiceAnswerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    answer: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const practiceAttemptSchema = new mongoose.Schema({
    practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice", required: true, index: true },
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
    attemptNumber: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["IN_PROGRESS", "SUBMITTED"], default: "IN_PROGRESS", required: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date, default: null },
    submissionReason: { type: String, enum: ["MANUAL", null], default: null },
    questions: {
        type: [practiceQuestionSnapshotSchema],
        required: true,
        validate: {
            validator: (v) => Array.isArray(v) && v.length >= 1,
            message: "A practice attempt must contain at least 1 question snapshot"
        }
    },
    answers: { type: [practiceAnswerSchema], default: [] },
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 0 },
    marksAwarded: { type: Number, default: null, min: 0 },
    scorePercent: { type: Number, default: null, min: 0, max: 100 },
    correctCount: { type: Number, default: null, min: 0 },
    // Integration seam for future Learning Evidence processing:
    contributeToLearningEvidence: { type: Boolean, required: true, default: false },
}, { timestamps: true, optimisticConcurrency: true });

practiceAttemptSchema.index({ practiceId: 1, learnerId: 1, attemptNumber: 1 }, { unique: true, name: "uniq_practice_attempt_number" });
practiceAttemptSchema.index({ practiceId: 1, learnerId: 1 }, { unique: true, partialFilterExpression: { status: "IN_PROGRESS" }, name: "uniq_in_progress_practice_attempt" });
practiceAttemptSchema.index({ learnerId: 1, startedAt: -1 });
practiceAttemptSchema.index({ topicId: 1, learnerId: 1 });
practiceAttemptSchema.index({ courseId: 1, learnerId: 1 });

export const PracticeAttempt = mongoose.models.PracticeAttempt || mongoose.model("PracticeAttempt", practiceAttemptSchema);
