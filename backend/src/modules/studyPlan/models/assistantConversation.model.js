import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant", "system"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    metadata: {
        usedCourseContext: { type: Boolean, default: false },
        referencedActivityId: { type: String, default: null },
        sources: { type: [mongoose.Schema.Types.Mixed], default: [] }
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const assistantConversationSchema = new mongoose.Schema({
    learnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
    },
    messages: [chatMessageSchema]
}, {
    timestamps: true
});

export const AssistantConversation = mongoose.model("AssistantConversation", assistantConversationSchema);

