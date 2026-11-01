import mongoose from "mongoose";
import { StudyPlanGenerationQuota } from "../src/modules/studyPlan/models/studyPlanGenerationQuota.model.js";
import { config } from "dotenv";

config();

async function migrate() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
    await mongoose.connect(process.env.MONGODB_URI);
    const collection = mongoose.connection.collection("studyplangenerationquotas");
    const groups = await collection.aggregate([
        { $group: { _id: "$learnerId", docs: { $push: "$$ROOT" } } }
    ]).toArray();

    for (const group of groups) {
        const activePlan = await mongoose.connection.collection("studyplans").findOne(
            { learnerId: group._id, status: "ACTIVE" },
            { sort: { version: -1 } }
        );
        const existing = group.docs.sort((a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
        )[0];
        const initialGeneratedAt = activePlan?.createdAt || existing?.updatedAt || existing?.createdAt || null;
        await collection.deleteMany({ learnerId: group._id });
        await collection.insertOne({
            learnerId: group._id,
            cycleId: new mongoose.Types.ObjectId(),
            cycleNumber: 1,
            initialGeneratedAt,
            regenerationUsedAt: null,
            lastPlanId: activePlan?._id || null,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    await collection.createIndex({ learnerId: 1 }, { unique: true });
    console.log(`Migrated ${groups.length} learner generation lifecycle record(s).`);
    await mongoose.disconnect();
}

migrate().catch(async (error) => {
    console.error("Study plan lifecycle migration failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
