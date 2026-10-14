
import mongoose from "mongoose";

const practiceSchema = new mongoose.Schema(
    {
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
            
        },

        questionBankId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBank",
            required: true,
            index: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 150,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },

        questionIds: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Question",
            }],
            default: [],
            validate: [
                {
                    validator(questionIds) {
                        return questionIds.length <= 200;
                    },
                    message: "Practice cannot exceed 200 questions",
                },
                {
                    validator(questionIds) {
                        return questionIds.length ===
                            new Set(questionIds.map(String)).size;
                    },
                    message: "Practice cannot contain duplicate question IDs",
                },
            ],
        },

        contributeToLearningEvidence: {
            type: Boolean,
            default: false,
            required: true,
        },

        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
            default: "DRAFT",
            required: true,
        },
    },
    { timestamps: true }
);

practiceSchema.index({ topicId: 1, status: 1 });

export const Practice = mongoose.model("Practice", practiceSchema);
