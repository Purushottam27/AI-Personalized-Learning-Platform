import mongoose from "mongoose";

const resourceAccessSchema = new mongoose.Schema({
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    accessedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

resourceAccessSchema.index({ learnerId: 1, resourceId: 1 }, { unique: true, name: "uniq_learner_resource_access" });
resourceAccessSchema.index({ learnerId: 1, topicId: 1 });

export const ResourceAccess = mongoose.models.ResourceAccess || mongoose.model("ResourceAccess", resourceAccessSchema);
