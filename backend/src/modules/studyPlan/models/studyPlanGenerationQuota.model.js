import mongoose from "mongoose";

// One persistent generation lifecycle per learner. Calendar boundaries never reset allowances.
const studyPlanGenerationQuotaSchema = new mongoose.Schema({
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cycleId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(), required: true },
    initialGeneratedAt: { type: Date, default: null },
    regenerationUsedAt: { type: Date, default: null },
    lastPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyPlan", default: null },
    cycleNumber: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

studyPlanGenerationQuotaSchema.index({ learnerId: 1 }, { unique: true });
export const StudyPlanGenerationQuota = mongoose.model("StudyPlanGenerationQuota", studyPlanGenerationQuotaSchema);
