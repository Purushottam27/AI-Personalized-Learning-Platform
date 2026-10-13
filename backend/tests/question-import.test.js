/**
 * Question Import — Stage 2 + Stage 3 Integration Tests
 *
 * Tests are organised into two sections:
 *   A) Parser unit tests (csv-excel-parser.util.js)
 *   B) Service integration tests (question-import.service.js + database)
 *
 * The test database is isolated using TEST_DB_NAME.
 * All fixtures created here are cleaned up in the after() hook.
 */

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

import { parseFile } from "../src/shared/utils/csv-excel-parser.util.js";
import { processQuestionImportPreview } from "../src/modules/question/services/question-import.service.js";
import { QuestionImport } from "../src/modules/question/models/question-import.model.js";
import { Question } from "../src/modules/question/models/question.model.js";
import { QuestionBank } from "../src/modules/questionBank/models/questionBank.model.js";
import { Course } from "../src/modules/course/models/course.model.js";
import { Topic } from "../src/modules/topic/models/topic.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ---------------------------------------------------------------------------
// Headers — 12 canonical column names in a natural order
// ---------------------------------------------------------------------------

const HEADERS = [
    "questionText",
    "type",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "optionE",
    "optionF",
    "correctAnswer",
    "explanation",
    "marks",
    "difficulty",
];

const HEADERS_LINE = HEADERS.join(",");

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Build a valid 12-column CSV row from a partial object.
 * Missing columns default to "".
 */
function makeRow(fields = {}) {
    return HEADERS.map((h) => {
        const val = fields[h] ?? "";

        // Wrap in quotes if the value contains a comma or newline.
        if (typeof val === "string" && (val.includes(",") || val.includes("\n"))) {
            return `"${val.replace(/"/g, '""')}"`;
        }

        return String(val);
    }).join(",");
}

/**
 * Produce a Buffer from an array of already-formatted CSV row strings.
 * The first element should always be the header line.
 */
function csvBuffer(lines) {
    return Buffer.from(lines.join("\n"), "utf-8");
}

/**
 * Build a proper XLSX Buffer.
 * The first array is the header row; the rest are data rows.
 */
async function xlsxBuffer(rows) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Questions");

    rows.forEach((r) => ws.addRow(r));

    return Buffer.from(await wb.xlsx.writeBuffer());
}

/** A known valid MCQ_SINGLE row. */
const VALID_MCQ = makeRow({
    questionText: "What is Node.js?",
    type: "MCQ_SINGLE",
    optionA: "A runtime",
    optionB: "A language",
    correctAnswer: "A",
    marks: "10",
    difficulty: "EASY",
});

/** A known valid TRUE_FALSE row. */
const VALID_TF = makeRow({
    questionText: "Node.js runs on V8",
    type: "TRUE_FALSE",
    correctAnswer: "TRUE",
    marks: "5",
    difficulty: "MEDIUM",
});

// ---------------------------------------------------------------------------
// A) Parser unit tests — no database required
// ---------------------------------------------------------------------------

test("Parser: Rejects unsupported file extension", async () => {
    await assert.rejects(
        parseFile(Buffer.from("a,b,c"), "test.txt"),
        (err) => err.message.includes("Invalid file type")
    );
});

test("Parser: Rejects .csv buffer with XLSX magic number", async () => {
    const xlsxMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);

    await assert.rejects(
        parseFile(xlsxMagic, "data.csv"),
        (err) => err.message.includes("does not match")
    );
});

test("Parser: Rejects .xlsx buffer that is not a ZIP container", async () => {
    const notXlsx = Buffer.from("plaintext", "utf-8");

    await assert.rejects(
        parseFile(notXlsx, "data.xlsx"),
        (err) => err.message.includes("does not match")
    );
});

test("Parser: Rejects CSV with missing required headers", async () => {
    const buf = csvBuffer(["questionText,type", "Q1,MCQ_SINGLE"]);

    await assert.rejects(
        parseFile(buf, "data.csv"),
        (err) => err.message.includes("Missing required header")
    );
});

test("Parser: Rejects CSV with duplicate headers", async () => {
    const dupeHeaders = HEADERS_LINE + ",questionText";
    const buf = csvBuffer([dupeHeaders, makeRow({ questionText: "Q1" })]);

    await assert.rejects(
        parseFile(buf, "data.csv"),
        (err) => err.message.includes("Duplicate header")
    );
});

test("Parser: Accepts case-insensitive and trimmed headers", async () => {
    const scrambled = HEADERS.map((h) => "  " + h.toUpperCase() + "  ").join(",");
    const buf = csvBuffer([scrambled, VALID_MCQ]);

    const result = await parseFile(buf, "data.csv");

    assert.equal(result.rows.length, 1);
});

test("Parser: Strips UTF-8 BOM from first header", async () => {
    const bomHeaders = "\uFEFF" + HEADERS_LINE;
    const buf = csvBuffer([bomHeaders, VALID_MCQ]);

    const result = await parseFile(buf, "data.csv");

    assert.equal(result.rows.length, 1);
    assert.ok("questiontext" in result.rows[0].data);
});

test("Parser: Handles quoted commas inside CSV fields", async () => {
    const row = makeRow({
        questionText: "What is A, B, or C?",
        type: "MCQ_SINGLE",
        optionA: "X",
        optionB: "Y",
        correctAnswer: "A",
        marks: "5",
        difficulty: "EASY",
    });

    const buf = csvBuffer([HEADERS_LINE, row]);
    const result = await parseFile(buf, "data.csv");

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].data.questiontext, "What is A, B, or C?");
});

test("Parser: Handles quoted multiline CSV fields", async () => {
    const row = makeRow({
        questionText: "Line 1\nLine 2",
        type: "MCQ_SINGLE",
        optionA: "X",
        optionB: "Y",
        correctAnswer: "A",
        marks: "5",
        difficulty: "EASY",
    });

    const buf = csvBuffer([HEADERS_LINE, row]);
    const result = await parseFile(buf, "data.csv");

    assert.equal(result.rows.length, 1);
    assert.ok(result.rows[0].data.questiontext.includes("Line 1"));
});

test("Parser: Skips blank rows and counts them", async () => {
    const buf = csvBuffer([
        HEADERS_LINE,
        VALID_MCQ,
        "",
        "  ,,,,,,,,,,,  ",
        VALID_TF,
    ]);

    const result = await parseFile(buf, "data.csv");

    assert.equal(result.rows.length, 2);
    assert.equal(result.blankRowsSkipped, 2);
});

test("Parser: Preserves original row numbers", async () => {
    const buf = csvBuffer([HEADERS_LINE, "", VALID_MCQ, "", VALID_TF]);
    const result = await parseFile(buf, "data.csv");

    // Header = row 1; data rows are rows 3 and 5.
    assert.equal(result.rows[0].rowNumber, 3);
    assert.equal(result.rows[1].rowNumber, 5);
});

test("Parser: Accepts exactly 500 data rows", async () => {
    const rows = [HEADERS_LINE];

    for (let i = 0; i < 500; i++) {
        rows.push(
            makeRow({
                questionText: `Q${i}`,
                type: "MCQ_SINGLE",
                optionA: "X",
                optionB: "Y",
                correctAnswer: "A",
                marks: "5",
                difficulty: "EASY",
            })
        );
    }

    const result = await parseFile(csvBuffer(rows), "data.csv");

    assert.equal(result.rows.length, 500);
});

test("Parser: Rejects 501 data rows", async () => {
    const rows = [HEADERS_LINE];

    for (let i = 0; i < 501; i++) {
        rows.push(
            makeRow({
                questionText: `Q${i}`,
                type: "MCQ_SINGLE",
                optionA: "X",
                optionB: "Y",
                correctAnswer: "A",
                marks: "5",
                difficulty: "EASY",
            })
        );
    }

    await assert.rejects(
        parseFile(csvBuffer(rows), "data.csv"),
        (err) => err.message.includes("500")
    );
});

test("Parser: XLSX — accepts valid file and reads all columns", async () => {
    const buf = await xlsxBuffer([
        HEADERS,
        ["What is 2+2?", "MCQ_SINGLE", "3", "4", "", "", "", "", "B", "", 5, "EASY"],
    ]);

    const result = await parseFile(buf, "data.xlsx");

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].data.questiontext, "What is 2+2?");
    assert.equal(result.rows[0].data.optiona, "3");
    assert.equal(result.rows[0].data.optionc, "");
});

test("Parser: XLSX — skips blank rows", async () => {
    const buf = await xlsxBuffer([
        HEADERS,
        ["Q1", "MCQ_SINGLE", "X", "Y", "", "", "", "", "A", "", 5, "EASY"],
        [],
        ["Q2", "TRUE_FALSE", "", "", "", "", "", "", "TRUE", "", 3, "HARD"],
    ]);

    const result = await parseFile(buf, "data.xlsx");

    assert.equal(result.rows.length, 2);
    assert.equal(result.blankRowsSkipped, 1);
});

test("Parser: XLSX — numeric marks cell is read as string", async () => {
    const buf = await xlsxBuffer([
        HEADERS,
        ["Q1", "MCQ_SINGLE", "X", "Y", "", "", "", "", "A", "", 10, "EASY"],
    ]);

    const result = await parseFile(buf, "data.xlsx");

    assert.equal(result.rows[0].data.marks, "10");
});

// ---------------------------------------------------------------------------
// B) Service integration tests — require a real test database connection
// ---------------------------------------------------------------------------

test("Question Import Service Integration Tests", async (t) => {
    const TEST_DB_NAME = process.env.TEST_DB_NAME;
    const MONGODB_URI = process.env.MONGODB_URI;

    assert.ok(MONGODB_URI, "MONGODB_URI must be set in .env");
    assert.ok(TEST_DB_NAME, "TEST_DB_NAME must be set in .env");

    // Fixture IDs — used for cleanup.
    const instructorId = new mongoose.Types.ObjectId();
    const otherInstructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    let course, topic, questionBank, archivedQuestionBank;
    let connected = false;

    t.after(async () => {
        if (!connected) return;

        try {
            await QuestionImport.deleteMany({ instructorId });
            await Question.deleteMany({ createdBy: instructorId });
            await QuestionBank.deleteMany({ createdBy: instructorId });
            await Topic.deleteMany({ courseId });
            await Course.deleteMany({ _id: courseId });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;

    // Ensure indexes are ready before running any assertions.
    await Promise.all([
        Question.init(),
        QuestionBank.init(),
        Course.init(),
        Topic.init(),
        QuestionImport.init(),
    ]);

    // --- Fixtures ---
    course = await Course.create({
        _id: courseId,
        title: "Import Test Course",
        description: "A sufficiently long description for the import test course",
        createdBy: instructorId,
        domain: "Testing",
        category: "QA",
        difficulty: "BEGINNER",
        objectives: [],
    });

    topic = await Topic.create({
        courseId: course._id,
        title: "Import Test Topic",
        order: 1,
    });

    // Second topic for the archived bank.
    const archivedTopic = await Topic.create({
        courseId: course._id,
        title: "Archived Bank Topic",
        order: 2,
    });

    questionBank = await QuestionBank.create({
        courseId: course._id,
        topicId: topic._id,
        createdBy: instructorId,
        title: "Active Import Test Bank",
    });

    archivedQuestionBank = await QuestionBank.create({
        courseId: course._id,
        topicId: archivedTopic._id,
        createdBy: instructorId,
        title: "Archived Import Test Bank",
        status: "ARCHIVED",
    });

    // -----------------------------------------------------------------------

    await t.test("Rejects unsupported file type", async () => {
        await assert.rejects(
            processQuestionImportPreview(
                Buffer.from("a,b,c"),
                "test.txt",
                questionBank._id,
                instructorId
            ),
            (err) => err.message.includes("Invalid file type")
        );
    });

    await t.test("Rejects malformed CSV (ZIP magic number)", async () => {
        const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);

        await assert.rejects(
            processQuestionImportPreview(
                buf,
                "data.csv",
                questionBank._id,
                instructorId
            ),
            (err) => err.message.includes("does not match")
        );
    });

    await t.test("Rejects CSV with missing headers", async () => {
        const buf = csvBuffer(["questionText,type", "Q1,MCQ_SINGLE"]);

        await assert.rejects(
            processQuestionImportPreview(
                buf,
                "data.csv",
                questionBank._id,
                instructorId
            ),
            (err) => err.message.includes("Missing required header")
        );
    });

    await t.test("Rejects unauthorized instructor (wrong owner)", async () => {
        const buf = csvBuffer([HEADERS_LINE]);

        await assert.rejects(
            processQuestionImportPreview(
                buf,
                "data.csv",
                questionBank._id,
                otherInstructorId
            ),
            (err) => err.statusCode === 404 || err.statusCode === 403
        );
    });

    await t.test("Rejects import to archived QuestionBank", async () => {
        const buf = csvBuffer([HEADERS_LINE]);

        await assert.rejects(
            processQuestionImportPreview(
                buf,
                "data.csv",
                archivedQuestionBank._id,
                instructorId
            ),
            (err) => err.message.toLowerCase().includes("archived")
        );
    });

    await t.test("Valid CSV: MCQ_SINGLE and TRUE_FALSE rows pass", async () => {
        const buf = csvBuffer([HEADERS_LINE, VALID_MCQ, VALID_TF]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.totalRows, 2);
        assert.equal(result.summary.validRows, 2);
        assert.equal(result.summary.invalidRows, 0);
        assert.equal(result.summary.duplicateRows, 0);
        assert.equal(result.summary.importableRows, 2);

        // Verify preview document stored in DB.
        const doc = await QuestionImport.findById(result.importId);

        assert.ok(doc, "QuestionImport document should exist");
        assert.equal(doc.previewData.length, 2);

        // Confirm no Question documents were created.
        const qCount = await Question.countDocuments({
            questionBankId: questionBank._id,
        });

        assert.equal(qCount, 0, "No Question documents should be created during preview");

        // Clean up for subsequent tests.
        await Question.deleteMany({ questionBankId: questionBank._id });
    });

    // -----------------------------------------------------------------------
    // NEW TEST A: A blank question type must be rejected.
    // -----------------------------------------------------------------------

    await t.test("Rejects a row with a blank question type", async () => {
        const blankTypeRow = makeRow({
            questionText: "Question with missing type",
            // type intentionally omitted
            optionA: "Option A",
            optionB: "Option B",
            correctAnswer: "A",
            marks: "5",
            difficulty: "EASY",
        });

        const buf = csvBuffer([HEADERS_LINE, blankTypeRow]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.totalRows, 1);
        assert.equal(result.summary.validRows, 0);
        assert.equal(result.summary.invalidRows, 1);
        assert.equal(result.summary.duplicateRows, 0);
        assert.equal(result.summary.importableRows, 0);

        assert.equal(result.previewData.length, 1);
        assert.equal(result.previewData[0].isValid, false);
        assert.equal(result.previewData[0].type, "");

        assert.ok(
            result.previewData[0].rowErrors.length > 0,
            "The invalid row should explain why validation failed"
        );

        const questionCount = await Question.countDocuments({
            questionBankId: questionBank._id,
        });

        assert.equal(
            questionCount,
            0,
            "Preview must not create Question documents"
        );
    });

    // -----------------------------------------------------------------------
    // NEW TEST B: MCQ_MULTIPLE and pipe-delimited answers must be accepted.
    // -----------------------------------------------------------------------

    await t.test("Valid CSV: MCQ_MULTIPLE row passes validation", async () => {
        const multipleAnswerRow = makeRow({
            questionText: "Which of these are JavaScript data types?",
            type: "MCQ_MULTIPLE",
            optionA: "String",
            optionB: "Boolean",
            optionC: "Browser",
            optionD: "Number",
            correctAnswer: "A|B|D",
            marks: "5",
            difficulty: "MEDIUM",
        });

        const buf = csvBuffer([HEADERS_LINE, multipleAnswerRow]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.totalRows, 1);
        assert.equal(result.summary.validRows, 1);
        assert.equal(result.summary.invalidRows, 0);
        assert.equal(result.summary.duplicateRows, 0);
        assert.equal(result.summary.importableRows, 1);

        assert.equal(result.previewData.length, 1);
        assert.equal(result.previewData[0].isValid, true);
        assert.equal(result.previewData[0].type, "MCQ_MULTIPLE");

        assert.deepEqual(
            result.previewData[0].correctAnswer,
            ["A", "B", "D"]
        );

        const questionCount = await Question.countDocuments({
            questionBankId: questionBank._id,
        });

        assert.equal(
            questionCount,
            0,
            "Preview must not create Question documents"
        );
    });

    await t.test("Partially valid CSV: summary accounting is correct", async () => {
        // Row layout:
        //   1 = valid MCQ_SINGLE
        //   2 = valid TRUE_FALSE
        //   3 = invalid MCQ_SINGLE (no correctAnswer)
        //   4 = duplicate of row 1

        const invalidMCQ = makeRow({
            questionText: "Invalid no answer",
            type: "MCQ_SINGLE",
            optionA: "X",
            optionB: "Y",
            marks: "10",
            difficulty: "EASY",
            // correctAnswer intentionally omitted
        });

        const duplicateMCQ = makeRow({
            questionText: "What is Node.js?",
            type: "MCQ_SINGLE",
            optionA: "A runtime",
            optionB: "A language",
            correctAnswer: "A",
            marks: "10",
            difficulty: "EASY",
        });

        const buf = csvBuffer([
            HEADERS_LINE,
            VALID_MCQ,
            VALID_TF,
            invalidMCQ,
            duplicateMCQ,
        ]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.totalRows, 4);
        assert.equal(result.summary.validRows, 2);
        assert.equal(result.summary.invalidRows, 1);
        assert.equal(result.summary.duplicateRows, 1);
        assert.equal(result.summary.importableRows, 2);

        const doc = await QuestionImport.findById(result.importId);

        assert.ok(doc);
        assert.equal(doc.previewData.length, 4);

        const qCount = await Question.countDocuments({
            questionBankId: questionBank._id,
        });

        assert.equal(qCount, 0);
    });

    await t.test("Blank rows are skipped and counted separately", async () => {
        const buf = csvBuffer([
            HEADERS_LINE,
            VALID_MCQ,
            "",
            VALID_TF,
        ]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.totalRows, 2);
        assert.equal(result.summary.blankRowsSkipped, 1);
    });

    await t.test("Duplicate detection: file-internal duplicate", async () => {
        const dup1 = makeRow({
            questionText: "Duplicate Q",
            type: "TRUE_FALSE",
            correctAnswer: "FALSE",
            marks: "3",
            difficulty: "EASY",
        });

        const dup2 = makeRow({
            questionText: "Duplicate Q",
            type: "TRUE_FALSE",
            correctAnswer: "FALSE",
            marks: "3",
            difficulty: "EASY",
        });

        const buf = csvBuffer([HEADERS_LINE, dup1, dup2]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.validRows, 1);
        assert.equal(result.summary.duplicateRows, 1);
    });

    await t.test(
        "Duplicate detection: matches existing DB question (including archived)",
        async () => {
            // Insert an archived question to confirm archived questions block duplicates.
            await Question.create({
                questionBankId: questionBank._id,
                courseId: course._id,
                topicId: topic._id,
                createdBy: instructorId,
                questionText: "Existing archived Q",
                normalizedQuestionText: "existing archived q",
                type: "TRUE_FALSE",
                correctAnswer: "TRUE",
                marks: 5,
                difficulty: "EASY",
                status: "ARCHIVED",
            });

            const row = makeRow({
                questionText: "Existing archived Q",
                type: "TRUE_FALSE",
                correctAnswer: "TRUE",
                marks: "5",
                difficulty: "EASY",
            });

            const buf = csvBuffer([HEADERS_LINE, row]);

            const result = await processQuestionImportPreview(
                buf,
                "data.csv",
                questionBank._id,
                instructorId
            );

            assert.equal(result.summary.duplicateRows, 1);
            assert.equal(result.summary.validRows, 0);

            // Cleanup archived fixture.
            await Question.deleteMany({
                questionBankId: questionBank._id,
            });
        }
    );

    await t.test(
        "Invalid first row does not block later valid row with same text",
        async () => {
            // Row 1 — invalid (no marks): should NOT reserve the normalised text.
            const invalidRow = makeRow({
                questionText: "Contested text",
                type: "TRUE_FALSE",
                correctAnswer: "TRUE",
                // marks omitted → invalid
                difficulty: "EASY",
            });

            // Row 2 — valid: should be accepted because row 1 was invalid.
            const validRow = makeRow({
                questionText: "Contested text",
                type: "TRUE_FALSE",
                correctAnswer: "TRUE",
                marks: "5",
                difficulty: "EASY",
            });

            const buf = csvBuffer([HEADERS_LINE, invalidRow, validRow]);

            const result = await processQuestionImportPreview(
                buf,
                "data.csv",
                questionBank._id,
                instructorId
            );

            assert.equal(result.summary.invalidRows, 1);
            assert.equal(result.summary.validRows, 1);
            assert.equal(result.summary.duplicateRows, 0);
        }
    );

    await t.test("Non-contiguous MCQ options are rejected per row", async () => {
        const nonContiguous = makeRow({
            questionText: "Noncontiguous options?",
            type: "MCQ_SINGLE",
            optionA: "X",
            // optionB intentionally blank → gap
            optionC: "Z",
            correctAnswer: "A",
            marks: "5",
            difficulty: "EASY",
        });

        const buf = csvBuffer([HEADERS_LINE, nonContiguous]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.invalidRows, 1);

        assert.ok(
            result.previewData[0].rowErrors.some((e) =>
                e.toLowerCase().includes("contiguous")
            )
        );
    });

    await t.test(
    "Rejects MCQ options that do not start at A",
    async () => {
        const row = makeRow({
            questionText: "Options starting at B should fail",
            type: "MCQ_SINGLE",
            // optionA intentionally omitted
            optionB: "Option B",
            optionC: "Option C",
            correctAnswer: "B",
            marks: "5",
            difficulty: "EASY",
        });

        const result = await processQuestionImportPreview(
            csvBuffer([HEADERS_LINE, row]),
            "data.csv",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.totalRows, 1);
        assert.equal(result.summary.validRows, 0);
        assert.equal(result.summary.invalidRows, 1);
        assert.equal(result.summary.duplicateRows, 0);
        assert.equal(result.summary.importableRows, 0);

        assert.equal(result.previewData.length, 1);
        assert.equal(result.previewData[0].isValid, false);

        assert.ok(
            result.previewData[0].rowErrors.some((error) =>
                error.toLowerCase().includes("contiguous")
            ),
            "The row should explain that options must be contiguous"
        );

        const questionCount = await Question.countDocuments({
            questionBankId: questionBank._id,
        });

        assert.equal(
            questionCount,
            0,
            "Preview must not create Question documents"
        );
    }
);

    await t.test("Strict marks validation rejects non-integer strings", async () => {
        const cases = [
            { marks: "1.5", label: "float" },
            { marks: "10abc", label: "alphanumeric" },
            { marks: "", label: "empty" },
        ];

        for (const { marks, label } of cases) {
            const row = makeRow({
                questionText: `Marks test ${label}`,
                type: "TRUE_FALSE",
                correctAnswer: "TRUE",
                marks,
                difficulty: "EASY",
            });

            const buf = csvBuffer([HEADERS_LINE, row]);

            const result = await processQuestionImportPreview(
                buf,
                "data.csv",
                questionBank._id,
                instructorId
            );

            assert.equal(
                result.summary.invalidRows,
                1,
                `Expected marks "${marks}" to be invalid`
            );
        }
    });

    await t.test("Valid XLSX file is accepted and parsed correctly", async () => {
        const buf = await xlsxBuffer([
            HEADERS,
            [
                "Excel MCQ",
                "MCQ_SINGLE",
                "Opt A",
                "Opt B",
                "",
                "",
                "",
                "",
                "A",
                "",
                8,
                "HARD",
            ],
        ]);

        const result = await processQuestionImportPreview(
            buf,
            "data.xlsx",
            questionBank._id,
            instructorId
        );

        assert.equal(result.summary.validRows, 1);
        assert.equal(result.summary.totalRows, 1);
    });

    await t.test("Preview document expires logically after 30 minutes", async () => {
        const buf = csvBuffer([HEADERS_LINE, VALID_MCQ]);

        const result = await processQuestionImportPreview(
            buf,
            "data.csv",
            questionBank._id,
            instructorId
        );

        const now = new Date();
        const expiresAt = new Date(result.expiresAt);
        const thirtyMinMs = 30 * 60 * 1000;

        assert.ok(
            expiresAt.getTime() - now.getTime() > thirtyMinMs - 5000,
            "expiresAt should be approximately 30 minutes in the future"
        );

        assert.ok(
            expiresAt.getTime() - now.getTime() <= thirtyMinMs + 5000,
            "expiresAt should not be more than 30 minutes (+5s) in the future"
        );
    });
});