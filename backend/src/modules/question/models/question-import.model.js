import mongoose from "mongoose";

/**
 * Subdocument schema for a single row of the import preview.
 *
 * Stores the original row number, validity/duplicate flags, any validation
 * errors, and the normalised question payload for eligible rows (or a
 * best-effort display snapshot for invalid rows).
 */
const previewRowSchema = new mongoose.Schema(
    {
        rowNumber: { type: Number, required: true },
        isValid: { type: Boolean, required: true },
        isDuplicate: { type: Boolean, required: true },
        rowErrors: { type: [String], default: [] },

        // Normalised question payload (fully valid rows)
        // or best-effort display data (invalid rows).
        questionText: { type: String },
        normalizedQuestionText: { type: String },
        type: { type: String },
        options: {
            type: [
                {
                    key: { type: String },
                    text: { type: String },
                    _id: false,
                },
            ],
            default: undefined,
        },
        correctAnswer: { type: mongoose.Schema.Types.Mixed },
        explanation: { type: String },
        marks: { type: Number },
        difficulty: { type: String },
    },
    { _id: false }
);

const questionImportSchema = new mongoose.Schema(
    {
        // References derived from trusted DB records — never from uploaded data.
        questionBankId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBank",
            required: true,
            index: true,
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true,
        },
        topicId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Topic",
            required: true,
        },
        instructorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["PREVIEW_READY", "CONFIRMED"],
            required: true,
            default: "PREVIEW_READY",
        },

        confirmedAt: {
            type: Date,
            default: null,
        },

        createdCount: {
            type: Number,
            default: 0,
        },

        createdQuestionIds: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                },
            ],
            default: [],
        },

        summary: {
            totalRows: { type: Number, required: true, default: 0 },
            validRows: { type: Number, required: true, default: 0 },
            invalidRows: { type: Number, required: true, default: 0 },
            duplicateRows: { type: Number, required: true, default: 0 },
            blankRowsSkipped: { type: Number, required: true, default: 0 },
            importableRows: { type: Number, required: true, default: 0 },
        },

        previewData: {
            type: [previewRowSchema],
            default: [],
        },

        /**
         * Logical expiry — 30 minutes after creation.
         *
         * Every downstream operation that accesses a preview must check that
         *   new Date() < expiresAt
         * before trusting the preview. This guard is independent of the
         * physical TTL deletion below.
         */
        expiresAt: {
            type: Date,
            required: true,
        },

        /**
         * Physical TTL field — 24 hours after logical expiry.
         *
         * MongoDB's TTL mechanism deletes the document asynchronously once
         * the current time passes `purgeAt`. The 24-hour gap ensures that
         * even if the logical expiry fires at an inconvenient moment the
         * document remains queryable for audit or debugging purposes for a
         * short grace period.
         *
         * Do NOT rely on this for application-level access control; use
         * `expiresAt` for that.
         */
        purgeAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index: delete when current time >= purgeAt
        },
    },
    { timestamps: true }
);

export const QuestionImport = mongoose.model(
    "QuestionImport",
    questionImportSchema
);
