import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Question } from "../modules/question/models/question.model.js";
import { normalizeQuestionText } from "../shared/utils/textNormalization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function migrate() {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
        console.log("Connected to MongoDB");

        const questions = await Question.find({});
        console.log(`Found ${questions.length} questions.`);

        const grouped = {};
        const updates = [];
        let hasConflicts = false;

        for (const q of questions) {
            const normalized = normalizeQuestionText(q.questionText);
            const key = `${q.questionBankId}_${normalized}`;

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(q._id.toString());

            if (q.normalizedQuestionText !== normalized) {
                updates.push({
                    updateOne: {
                        filter: { _id: q._id },
                        update: { $set: { normalizedQuestionText: normalized } }
                    }
                });
            }
        }

        for (const [key, ids] of Object.entries(grouped)) {
            if (ids.length > 1) {
                console.log(`CONFLICT: Duplicate questions found for questionBank_normalizedKey: ${key}`);
                console.log(`Question IDs: ${ids.join(", ")}`);
                hasConflicts = true;
            }
        }

        if (hasConflicts) {
            console.log("Migration aborted due to unresolved conflicts. Please resolve duplicates first.");
            process.exit(1);
        }

        if (updates.length > 0) {
            console.log(`Applying ${updates.length} updates...`);
            await Question.bulkWrite(updates);
            console.log("Updates applied successfully.");
        } else {
            console.log("No questions required updating.");
        }

        console.log("Ensuring unique index on { questionBankId: 1, normalizedQuestionText: 1 }...");
        await Question.collection.createIndex(
            { questionBankId: 1, normalizedQuestionText: 1 },
            { unique: true }
        );
        console.log("Unique index created successfully.");

        console.log("Migration complete.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
