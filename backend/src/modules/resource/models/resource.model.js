import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
    {
        topicId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Topic",
            required: true,
            index: true
        },

        lessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lesson",
            default: null,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 150
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },

        type: {
            type: String,
            enum: ["VIDEO", "DOCUMENT", "LINK"],
            required: true
        },

        source: {
            type: String,
            enum: ["UPLOAD", "EXTERNAL_URL"],
            required: true
        },

        provider: {
            type: String,
            enum: ["YOUTUBE", "GOOGLE_DRIVE", "VIMEO", "OTHER"],
            default: null
        },

        url: {
            type: String,
            trim: true,
            default: null
        },

        storageReference: {
            type: String,
            trim: true,
            default: null
        },

        fileFormat: {
            type: String,
            enum: ["PDF", "PPT", "PPTX", "DOC", "DOCX"],
            default: null
        },

        fileSize: {
            type: Number,
            default: null
        },

        order: {
            type: Number,
            required: true,
            min: 1
        },

        status: {
            type: String,
            enum: ["ACTIVE", "ARCHIVED"],
            default: "ACTIVE",
            required: true
        }
    },
    {
        timestamps: true
    }
);

resourceSchema.index(
    { topicId: 1, order: 1 },
    { unique: true }
);

export const Resource = mongoose.model("Resource", resourceSchema);