import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
    {
        topicId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Topic",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 4,
            maxlength: 150
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },

        content: {
            type: [mongoose.Schema.Types.Mixed],
            required: true,
            default: []
        },

        order: {
            type: Number,
            required: true,
            min: 1
        }
    },
    {
        timestamps: true
    }
);

lessonSchema.index(
    { topicId: 1, order: 1 },
    { unique: true }
);

export const Lesson = mongoose.model("Lesson", lessonSchema);