import mongoose from "mongoose";

const snapshotOptionSchema = new mongoose.Schema({
    key: { type: String, required: true },
    text: { type: String, required: true },
}, { _id: false });

const questionSnapshotSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    questionText: { type: String, required: true },
    type: { type: String, enum: ["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"], required: true },
    options: { type: [snapshotOptionSchema], default: [] },
    // Server-only field: never serialize the raw document to a learner.
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    explanation: { type: String, default: "" },
    marks: { type: Number, required: true, min: 1 },
}, { _id: false });

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    answer: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const assessmentAttemptSchema = new mongoose.Schema({
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true, index: true },
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    assessmentType: { type: String, enum: ["TOPIC", "DIAGNOSTIC", "FINAL"], required: true },
    attemptNumber: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["IN_PROGRESS", "SUBMITTED"], default: "IN_PROGRESS", required: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    deadlineAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    submissionReason: { type: String, enum: ["MANUAL", "LEFT", "TIME_LIMIT", "WINDOW_CLOSED", null], default: null },
    deadlineReason: { type: String, enum: ["TIME_LIMIT", "WINDOW_CLOSED", null], default: null },
    passingScore: { type: Number, required: true, min: 0, max: 100 },
    questions: { type: [questionSnapshotSchema], required: true, validate: { validator: (v) => v.length >= 5 && v.length <= 10, message: "An attempt must contain 5 to 10 question snapshots" } },
    answers: { type: [answerSchema], default: [] },
    totalMarks: { type: Number, required: true, min: 0 },
    marksAwarded: { type: Number, default: null, min: 0 },
    scorePercent: { type: Number, default: null, min: 0, max: 100 },
    passed: { type: Boolean, default: null },
}, { timestamps: true, optimisticConcurrency: true });

assessmentAttemptSchema.index({ assessmentId: 1, learnerId: 1, attemptNumber: 1 }, { unique: true, name: "uniq_assessment_attempt_number" });
assessmentAttemptSchema.index({ assessmentId: 1, learnerId: 1 }, { unique: true, partialFilterExpression: { status: "IN_PROGRESS" }, name: "uniq_in_progress_assessment_attempt" });
assessmentAttemptSchema.index({ learnerId: 1, startedAt: -1 });

export const AssessmentAttempt = mongoose.models.AssessmentAttempt || mongoose.model("AssessmentAttempt", assessmentAttemptSchema);
