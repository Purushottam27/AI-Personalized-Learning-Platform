import "dotenv/config";
import mongoose from "mongoose";

async function main() {
    const { MONGODB_URI, DB_NAME, TEST_DB_NAME } = process.env;
    if (!MONGODB_URI || !DB_NAME) throw new Error("MONGODB_URI and DB_NAME are required");
    if (TEST_DB_NAME && DB_NAME === TEST_DB_NAME) throw new Error("Refusing to migrate the configured test database");
    if (DB_NAME.endsWith("_test")) throw new Error("Refusing to migrate a *_test database");

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME, autoIndex: false });
    try {
        if (mongoose.connection.name !== DB_NAME) throw new Error(`Connected to unexpected database ${mongoose.connection.name}`);
        const collection = mongoose.connection.db.collection("assistantconversations");
        const indexes = await collection.indexes();
        const legacyUnique = indexes.filter((index) =>
            index.unique === true && index.key?.learnerId === 1 &&
            Object.keys(index.key).length === 1
        );

        console.log(`Database: ${DB_NAME}`);
        console.log(`Existing conversation documents: ${await collection.countDocuments({})}`);
        console.log(`Legacy unique learner index(es): ${legacyUnique.map((index) => index.name).join(", ") || "none"}`);

        // Dry-run is strictly read-only.
        const docs = await collection.find({}).toArray();
        if (!process.argv.includes("--apply")) {
            console.log("Dry run only. No documents or indexes were changed. Rerun with --apply to apply the migration.");
            return;
        }

        // Preserve existing messages from the legacy single-chat-per-learner document.
        for (const doc of docs) {
            const firstQuestion = doc.messages?.find((message) => message.role === "user")?.content;
            const title = doc.title || (firstQuestion ? firstQuestion.replace(/\s+/g, " ").slice(0, 64) : "Previous chat");
            await collection.updateOne({ _id: doc._id }, {
                $set: { title, lastMessageAt: doc.updatedAt || doc.createdAt || new Date() },
                $unset: { __v: "" }
            });
        }

        for (const index of legacyUnique) await collection.dropIndex(index.name);
        await collection.createIndex({ learnerId: 1, lastMessageAt: -1 }, { name: "learnerId_1_lastMessageAt_-1" });
        const verified = (await collection.indexes()).find((index) => index.name === "learnerId_1_lastMessageAt_-1");
        if (!verified) throw new Error("New conversation index could not be verified");
        console.log("Conversation migration completed. Existing messages were preserved.");
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error("AI assistant conversation migration failed:", error.message);
    process.exitCode = 1;
});
