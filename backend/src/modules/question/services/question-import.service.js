import { QuestionImport } from '../models/question-import.model.js';
import { Question } from '../models/question.model.js';
import { parseFile } from '../../../shared/utils/csv-excel-parser.util.js';
import { normalizeQuestionText } from '../../../shared/utils/textNormalization.js';
import { createQuestionSchema } from '../validations/question.validation.js';
import { ApiError } from '../../../shared/errors/ApiError.js';
import { getOwnedQuestionBankContext } from './question.service.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Option columns in canonical order. */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Maximum number of options accepted via import. */
const MAX_IMPORT_OPTIONS = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the marks cell with strict integer-only rules.
 *
 * Returns the integer value on success, or null if the raw string is not a
 * valid non-negative integer representation.
 */
function parseStrictInteger(raw) {
    const trimmed = (raw ?? '').trim();

    if (trimmed === '') return null;
    if (!/^\d+$/.test(trimmed)) return null;

    const n = Number(trimmed);

    if (!Number.isInteger(n)) return null;

    return n;
}

/**
 * Map the normalised row object from the parser into a question payload
 * suitable for createQuestionSchema.safeParse().
 *
 * Does not perform schema validation; the caller must do that.
 *
 * Throws a plain Error when the row cannot be mapped, for example when
 * option columns are not contiguous starting at A.
 */
function mapRowToPayload(data) {
    // ---------- type ----------
    const type = (data.type || '').trim().toUpperCase();

    // ---------- options ----------
    const options = [];

    if (type !== 'TRUE_FALSE') {
        let gapFound = false;

        for (const key of OPTION_KEYS) {
            const cellKey = `option${key.toLowerCase()}`;
            const text = (data[cellKey] || '').trim();

            if (text !== '') {
                if (gapFound) {
                    throw new Error(
                        `Option ${key} is filled but a previous option is blank. Options must be contiguous starting at A.`
                    );
                }

                options.push({ key, text });
            } else {
                // Every blank option column creates a gap. This ensures
                // options cannot start at B or any later column.
                gapFound = true;
            }
        }
    } else {
        // TRUE_FALSE: no option columns are permitted.
        for (const key of OPTION_KEYS) {
            const cellKey = `option${key.toLowerCase()}`;

            if ((data[cellKey] || '').trim() !== '') {
                throw new Error(
                    `TRUE_FALSE questions must not have option columns filled (option${key} is not empty).`
                );
            }
        }
    }

    if (options.length > MAX_IMPORT_OPTIONS) {
        throw new Error(
            `A maximum of ${MAX_IMPORT_OPTIONS} options are allowed per question.`
        );
    }

    // ---------- correctAnswer ----------
    let correctAnswer;
    const rawAnswer = (data.correctanswer || '').trim();

    if (type === 'MCQ_MULTIPLE') {
        correctAnswer = rawAnswer
            .split('|')
            .map((answer) => answer.trim().toUpperCase())
            .filter((answer) => answer !== '');
    } else {
        // MCQ_SINGLE and TRUE_FALSE both use a single string.
        correctAnswer = rawAnswer.toUpperCase();
    }

    // ---------- marks ----------
    const marksVal = parseStrictInteger(data.marks);

    // ---------- difficulty ----------
    const difficulty = (data.difficulty || '').trim().toUpperCase();

    // ---------- assemble payload ----------
    const payload = {
        questionText: (data.questiontext || '').trim(),
        type,
        difficulty,
    };

    if (marksVal !== null) {
        payload.marks = marksVal;
    }

    if (type !== 'TRUE_FALSE') {
        payload.options = options;
    }

    if (
        correctAnswer !== '' &&
        !(Array.isArray(correctAnswer) && correctAnswer.length === 0)
    ) {
        payload.correctAnswer = correctAnswer;
    }

    const explanation = (data.explanation || '').trim();

    if (explanation !== '') {
        payload.explanation = explanation;
    }

    return payload;
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

/**
 * Parse, validate, and preview-store an uploaded question import file.
 *
 * This function performs:
 * 1. QuestionBank ownership and consistency checks.
 * 2. QuestionBank active-status check.
 * 3. File parsing (CSV or XLSX).
 * 4. Per-row mapping, Zod validation, contiguity, and duplicate detection.
 * 5. Preview storage in MongoDB with a 30-minute logical expiry.
 *
 * Does NOT create any Question documents.
 *
 * @param {Buffer} buffer - File content.
 * @param {string} originalname - Original filename.
 * @param {*} questionBankId - QuestionBank MongoDB ObjectId or string.
 * @param {*} instructorId - Authenticated instructor's User ObjectId.
 * @returns {Object} Preview result.
 */
export async function processQuestionImportPreview(
    buffer,
    originalname,
    questionBankId,
    instructorId
) {
    // ------------------------------------------------------------------
    // 1. Ownership and consistency check
    // ------------------------------------------------------------------
    const { questionBank, topic, course } =
        await getOwnedQuestionBankContext(instructorId, questionBankId);

    if (questionBank.status !== 'ACTIVE') {
        throw new ApiError(
            409,
            'QUESTION_BANK_ARCHIVED',
            'Cannot import questions into an archived Question Bank'
        );
    }

    // ------------------------------------------------------------------
    // 2. Parse file
    // ------------------------------------------------------------------
    let parseResult;

    try {
        parseResult = await parseFile(buffer, originalname);
    } catch (err) {
        throw new ApiError(400, 'IMPORT_PARSE_ERROR', err.message);
    }

    const { rows: dataRows, blankRowsSkipped } = parseResult;

    // ------------------------------------------------------------------
    // 3. Load existing normalised texts, including archived questions
    // ------------------------------------------------------------------
    const existingRecords = await Question.find({
        questionBankId: questionBank._id,
        normalizedQuestionText: {
            $ne: null,
            $exists: true,
            $type: 'string',
        },
    })
        .select('normalizedQuestionText')
        .lean();

    const dbNormalizedTexts = new Set(
        existingRecords.map((question) => question.normalizedQuestionText)
    );

    // ------------------------------------------------------------------
    // 4. Process rows
    // ------------------------------------------------------------------
    const previewData = [];

    const summary = {
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        blankRowsSkipped,
        importableRows: 0,
    };

    // Only valid rows reserve a slot in file-level duplicate tracking.
    const fileNormalizedTexts = new Set();

    for (const { rowNumber, data } of dataRows) {
        let isValid = true;
        let isDuplicate = false;
        const rowErrors = [];
        let mappedData = {};

        try {
            // -- Map row to question payload --
            let payload;

            try {
                payload = mapRowToPayload(data);
            } catch (mappingErr) {
                isValid = false;
                rowErrors.push(mappingErr.message);

                // Store best-effort display data even for unmappable rows.
                mappedData = {
                    questionText: (data.questiontext || '').trim(),
                    type: (data.type || '').trim().toUpperCase(),
                    difficulty: (data.difficulty || '').trim().toUpperCase(),
                };

                const rawMarks = parseStrictInteger(data.marks);

                if (rawMarks !== null) {
                    mappedData.marks = rawMarks;
                }
            }

            // -- Zod validation --
            if (isValid && payload) {
                const result = createQuestionSchema.safeParse(payload);

                if (!result.success) {
                    isValid = false;
                    rowErrors.push(
                        ...result.error.issues.map((issue) => issue.message)
                    );
                    mappedData = payload;
                } else {
                    mappedData = result.data;
                }
            }

            // -- Duplicate detection, only for rows that passed validation --
            if (isValid) {
                const normalized = normalizeQuestionText(
                    mappedData.questionText
                );

                mappedData.normalizedQuestionText = normalized;

                if (fileNormalizedTexts.has(normalized)) {
                    isValid = false;
                    isDuplicate = true;
                    rowErrors.push(
                        'Duplicate question text within the uploaded file.'
                    );
                } else if (dbNormalizedTexts.has(normalized)) {
                    isValid = false;
                    isDuplicate = true;
                    rowErrors.push(
                        'A question with this text already exists in the Question Bank (including archived questions).'
                    );
                } else {
                    fileNormalizedTexts.add(normalized);
                }
            }
        } catch (unexpectedErr) {
            // Defensive catch: should not normally be reached.
            isValid = false;
            rowErrors.push(
                'An unexpected error occurred while validating this row.'
            );
        }

        // -- Update summary --
        if (isDuplicate) {
            summary.duplicateRows++;
        } else if (!isValid) {
            summary.invalidRows++;
        } else {
            summary.validRows++;
        }

        previewData.push({
            rowNumber,
            isValid,
            isDuplicate,
            rowErrors,
            ...mappedData,
        });
    }

    summary.importableRows = summary.validRows;

    // ------------------------------------------------------------------
    // 5. Persist preview
    // ------------------------------------------------------------------

    // Logical expiry: 30 minutes.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Physical TTL cleanup: 24 hours after logical expiry.
    const purgeAt = new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000);

    const questionImport = new QuestionImport({
        questionBankId: questionBank._id,
        courseId: course._id,
        topicId: topic._id,
        instructorId,
        status: 'PREVIEW_READY',
        summary,
        previewData,
        expiresAt,
        purgeAt,
    });

    await questionImport.save();

    return {
        importId: questionImport._id,
        status: questionImport.status,
        expiresAt: questionImport.expiresAt,
        summary: questionImport.summary,
        previewData: questionImport.previewData,
    };
}

export { confirmQuestionImportService } from './question-import-confirmation.service.js';