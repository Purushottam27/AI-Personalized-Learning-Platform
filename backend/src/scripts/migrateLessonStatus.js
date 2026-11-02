import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function assertSafeDatabaseConfig() {
    const { MONGODB_URI, DB_NAME, TEST_DB_NAME } = process.env;
    if (!MONGODB_URI || !DB_NAME) {
        throw new Error("MONGODB_URI and DB_NAME must be configured in backend/.env");
    }
    if (TEST_DB_NAME && DB_NAME === TEST_DB_NAME) {
        throw new Error("Refusing to migrate because DB_NAME equals TEST_DB_NAME");
    }
    if (DB_NAME.endsWith("_test")) {
        throw new Error("Refusing to migrate a *_test database");
    }
    return { MONGODB_URI, DB_NAME };
}

async function main() {
    const apply = process.argv.includes("--apply");
    const { MONGODB_URI, DB_NAME } = assertSafeDatabaseConfig();

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME, autoIndex: false });
    try {
        if (mongoose.connection.name !== DB_NAME) {
            throw new Error(`Connected to unexpected database "${mongoose.connection.name}"; expected "${DB_NAME}"`);
        }

        const collection = mongoose.connection.db.collection("lessons");
        const filter = {
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: "" }
            ]
        };
        const count = await collection.countDocuments(filter);

        console.log(`Database: ${DB_NAME}`);
        console.log(`Legacy lesson records requiring status: ${count}`);

        if (!apply) {
            console.log("DRY RUN ONLY. No records were changed. Re-run with --apply to set these records to ACTIVE.");
            return;
        }

        const result = await collection.updateMany(filter, {
            $set: { status: "ACTIVE", updatedAt: new Date() }
        });
        console.log(`Updated ${result.modifiedCount} lesson record(s) to ACTIVE.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error("Lesson status migration failed:", error);
    process.exitCode = 1;
});
