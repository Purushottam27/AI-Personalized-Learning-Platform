import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const INDEX_NAME = "uniq_active_enrollment_per_learner_course";
const INDEX_KEY = { learnerId: 1, courseId: 1, status: 1 };
const INDEX_OPTIONS = {
    name: INDEX_NAME,
    unique: true,
    partialFilterExpression: { status: "ACTIVE" },
};

function assertSafeDatabaseConfig() {
    const { MONGODB_URI, DB_NAME, TEST_DB_NAME } = process.env;
    if (!MONGODB_URI || !DB_NAME) {
        throw new Error("MONGODB_URI and DB_NAME must be configured in backend/.env");
    }
    if (TEST_DB_NAME && DB_NAME === TEST_DB_NAME) {
        throw new Error("Refusing to run migration because DB_NAME equals TEST_DB_NAME");
    }
    if (DB_NAME.endsWith("_test")) {
        throw new Error("Refusing to run the production index migration against a *_test database name");
    }
    return { MONGODB_URI, DB_NAME };
}

async function main() {
    const apply = process.argv.includes("--apply");
    const { MONGODB_URI, DB_NAME } = assertSafeDatabaseConfig();
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME, autoIndex: false });
    try {
        const db = mongoose.connection.db;
        if (mongoose.connection.name !== DB_NAME) {
            throw new Error(`Connected to unexpected database "${mongoose.connection.name}"; expected "${DB_NAME}"`);
        }
        const collection = db.collection("enrollments");
        const duplicates = await collection.aggregate([
            { $match: { status: "ACTIVE" } },
            { $group: { _id: { learnerId: "$learnerId", courseId: "$courseId" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { count: { $gt: 1 } } },
            { $limit: 20 },
        ]).toArray();

        if (duplicates.length) {
            console.error("Found duplicate ACTIVE enrollments. No index was changed and no records were modified.");
            console.error(JSON.stringify(duplicates, null, 2));
            throw new Error("Resolve duplicate active enrollments manually, then rerun this migration");
        }

        const indexes = await collection.indexes();
        const existing = indexes.find((index) => index.name === INDEX_NAME);
        if (existing) {
            const correct = existing.unique === true &&
                JSON.stringify(existing.key) === JSON.stringify(INDEX_KEY) &&
                existing.partialFilterExpression?.status === "ACTIVE";
            if (!correct) throw new Error(`Index ${INDEX_NAME} exists with unexpected definition; manual review required`);
            console.log(`Index ${INDEX_NAME} already exists with the expected definition. No change required.`);
            return;
        }

        console.log(`Database: ${DB_NAME}`);
        console.log("Duplicate ACTIVE enrollment check: passed.");
        console.log(`Planned index: ${JSON.stringify(INDEX_KEY)}, unique, partialFilterExpression={status:"ACTIVE"}`);
        if (!apply) {
            console.log("Dry run only. No index was created. Rerun with --apply to create it.");
            return;
        }

        await collection.createIndex(INDEX_KEY, INDEX_OPTIONS);
        const verified = (await collection.indexes()).find((index) => index.name === INDEX_NAME);
        if (!verified || verified.unique !== true ||
            JSON.stringify(verified.key) !== JSON.stringify(INDEX_KEY) ||
            verified.partialFilterExpression?.status !== "ACTIVE") {
            throw new Error("Index creation returned, but post-creation verification failed");
        }
        console.log(`Successfully created and verified ${INDEX_NAME}.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error("Active enrollment index migration failed:", error.message);
    process.exitCode = 1;
});
