import mongoose from "mongoose";

const assistantMessageSchema = new mongoose.Schema({
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 8000 },
    metadata: {
        usedCourseContext: { type: Boolean, default: false },
        sources: { type: [mongoose.Schema.Types.Mixed], default: [] },
        provider: { type: String, default: "gemini" },
        model: { type: String, default: null },
        latencyMs: { type: Number, default: null },
        usage: {
            promptTokens: { type: Number, default: null },
            responseTokens: { type: Number, default: null },
            totalTokens: { type: Number, default: null }
        }
    },
    timestamp: { type: Date, default: Date.now }
}, { _id: true });

const assistantConversationSchema = new mongoose.Schema({
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 80, default: "New chat" },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
    messages: { type: [assistantMessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

assistantConversationSchema.index({ learnerId: 1, lastMessageAt: -1 });

export const AssistantConversation = mongoose.model("AssistantConversation", assistantConversationSchema);
