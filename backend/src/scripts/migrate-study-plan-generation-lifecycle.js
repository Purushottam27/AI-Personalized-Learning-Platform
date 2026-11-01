import mongoose from "mongoose";
import { config } from "dotenv";

config();

/**
 * Consolidates legacy per-day quota rows into one lifecycle row per learner.
 * Each learner replacement is atomic; source rows are never deleted before the
 * replacement document is safely written. Run against a MongoDB replica set.
 */
async function migrate() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;
    const collection = db.collection("studyplangenerationquotas");
    const groups = await collection.aggregate([
        { $group: { _id: "$learnerId", docs: { $push: "$$ROOT" } } }
    ]).toArray();

    for (const group of groups) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const activePlan = await db.collection("studyplans").findOne(
                    { learnerId: group._id, status: "ACTIVE" },
                    { session, sort: { version: -1 } }
                );
                const existing = [...group.docs].sort((a, b) =>
                    new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
                )[0];
                const initialGeneratedAt = activePlan?.createdAt || existing?.initialGeneratedAt || existing?.updatedAt || existing?.createdAt || null;
                const replacement = {
                    learnerId: group._id,
                    cycleId: existing?.cycleId || new mongoose.Types.ObjectId(),
                    cycleNumber: Math.max(1, existing?.cycleNumber || 1),
                    initialGeneratedAt,
                    regenerationUsedAt: existing?.regenerationUsedAt || null,
                    lastPlanId: activePlan?._id || existing?.lastPlanId || null,
                    createdAt: existing?.createdAt || new Date(),
                    updatedAt: new Date()
                };
                await collection.deleteMany({ learnerId: group._id }, { session });
                await collection.insertOne(replacement, { session });
            });
        } finally {
            await session.endSession();
        }
    }

    await collection.createIndex({ learnerId: 1 }, { unique: true });
    console.log(`Migrated ${groups.length} learner generation lifecycle record(s).`);
}

migrate()
    .catch((error) => {
        console.error("Study plan lifecycle migration failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
