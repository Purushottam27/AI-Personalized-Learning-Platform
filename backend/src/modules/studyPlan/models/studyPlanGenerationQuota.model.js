import mongoose from "mongoose";

const studyPlanGenerationQuotaSchema = new mongoose.Schema({
    learnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    dateKey: {
        type: String, // UTC Calendar date "YYYY-MM-DD"
        required: true,
        index: true
    },
    count: {
        type: Number,
        default: 0,
        min: 0,
        max: 2
    }
}, {
    timestamps: true
});

studyPlanGenerationQuotaSchema.index({ learnerId: 1, dateKey: 1 }, { unique: true });

export const StudyPlanGenerationQuota = mongoose.model(
    "StudyPlanGenerationQuota",
    studyPlanGenerationQuotaSchema
);

