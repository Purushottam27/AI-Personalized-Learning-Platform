import mongoose from "mongoose";
import { QuestionImport } from "../models/question-import.model.js";
import { Question } from "../models/question.model.js";
import { createQuestionSchema } from "../validations/question.validation.js";
import { normalizeQuestionText } from "../../../shared/utils/textNormalization.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import { getOwnedQuestionBankContext } from "./question.service.js";

/**
 * Confirm a stored question import preview and permanently create questions.
 *
 * Implements Stage 4:
 * 1. Loads import by ID.
 * 2. Verifies instructor ownership.
 * 3. Verifies question bank, course, and topic context.
 * 4. Rejects archived question banks.
 * 5. Checks logical expiry independently of MongoDB TTL.
 * 6. Handles already confirmed imports idempotently.
 * 7. Rejects ineligibly-stated imports.
 * 8. Selects only valid, non-duplicate preview rows.
 * 9. Revalidates each row via createQuestionSchema.
 * 10. Recomputes normalized question text.
 * 11. Rechecks duplicates against current DB contents and within batch.
 * 12. Derives trusted database references.
 * 13. Persists questions and updates import atomically in a transaction.
 * 14. Returns confirmation summary with created question IDs.
 *
 * @param {string|mongoose.Types.ObjectId} importId - ID of the QuestionImport document.
 * @param {string|mongoose.Types.ObjectId} instructorId - Authenticated instructor's User ID.
 * @returns {Promise<Object>} Confirmation result.
 */
export async function confirmQuestionImportService(importId, instructorId) {
    // 1. Load import by ID
    const questionImport = await QuestionImport.findById(importId);

    if (!questionImport) {
        throw new ApiError(404, "IMPORT_NOT_FOUND", "Question import not found");
    }

    // 2. Verify that authenticated instructor owns the import (do not leak existence to others)
    if (questionImport.instructorId.toString() !== instructorId.toString()) {
        throw new ApiError(404, "IMPORT_NOT_FOUND", "Question import not found");
    }

    // 6. Handle an already confirmed import idempotently
    if (questionImport.status === "CONFIRMED") {
        return {
            importId: questionImport._id,
            status: questionImport.status,
            confirmedAt: questionImport.confirmedAt,
            createdCount: questionImport.createdCount ?? questionImport.createdQuestionIds?.length ?? 0,
            createdQuestionIds: questionImport.createdQuestionIds ?? [],
        };
    }

    // 7. Reject any import that is not eligible for confirmation
    if (questionImport.status !== "PREVIEW_READY") {
        throw new ApiError(
            409,
            "INVALID_IMPORT_STATE",
            `Question import cannot be confirmed from status ${questionImport.status}`
        );
    }

    // 3. Verify stored question bank, course, and topic references using existing context service
    const { questionBank, topic, course } = await getOwnedQuestionBankContext(
        instructorId,
        questionImport.questionBankId
    );

    if (
        questionImport.courseId.toString() !== course._id.toString() ||
        questionImport.topicId.toString() !== topic._id.toString()
    ) {
        throw new ApiError(
            500,
            "QUESTION_BANK_DATA_INCONSISTENT",
            "Stored import context does not match question bank context"
        );
    }

    // 4. Reject an archived or otherwise inactive question bank
    if (questionBank.status !== "ACTIVE") {
        throw new ApiError(
            409,
            "QUESTION_BANK_ARCHIVED",
            "Cannot confirm import into an archived Question Bank"
        );
    }

    // 5. Check logical expiry using expiresAt, independently of MongoDB TTL deletion
    if (new Date() >= questionImport.expiresAt) {
        throw new ApiError(
            400,
            "IMPORT_EXPIRED",
            "Question import preview has expired"
        );
    }

    // 8. Select only rows marked valid and non-duplicate in the stored preview
    const eligibleRows = (questionImport.previewData || []).filter(
        (row) => row.isValid === true && row.isDuplicate === false
    );

    if (eligibleRows.length === 0) {
        throw new ApiError(
            400,
            "NO_ELIGIBLE_QUESTIONS",
            "No eligible questions available to confirm"
        );
    }

    // 9. Revalidate each eligible row using createQuestionSchema
    // 10. Recompute normalized question text using normalizeQuestionText
    // 11. Recheck duplicates against other rows in the batch
    const recheckedRows = [];
    const batchNormalizedTexts = new Set();

    for (const row of eligibleRows) {
        const payload = {
            questionText: (row.questionText || "").trim(),
            type: (row.type || "").trim().toUpperCase(),
            correctAnswer: row.correctAnswer,
            explanation: (row.explanation || "").trim() || undefined,
            marks: row.marks,
            difficulty: (row.difficulty || "").trim().toUpperCase(),
        };

        if (payload.type !== "TRUE_FALSE") {
            payload.options = (row.options || []).map((opt) => ({
                key: (opt.key || "").trim().toUpperCase(),
                text: (opt.text || "").trim(),
            }));
        }

        const parseResult = createQuestionSchema.safeParse(payload);
        if (!parseResult.success) {
            throw new ApiError(
                400,
                "VALIDATION_ERROR",
                `Question row ${row.rowNumber} failed revalidation: ${parseResult.error.issues.map((i) => i.message).join(", ")}`
            );
        }

        const validated = parseResult.data;
        const normalized = normalizeQuestionText(validated.questionText);

        if (batchNormalizedTexts.has(normalized)) {
            throw new ApiError(
                409,
                "DUPLICATE_KEY_CONFLICT",
                `Duplicate question text detected within import rows: "${validated.questionText}"`
            );
        }
        batchNormalizedTexts.add(normalized);

        recheckedRows.push({
            ...validated,
            normalizedQuestionText: normalized,
        });
    }

    // Recheck duplicates against current database contents (including archived questions)
    const existingDuplicates = await Question.find({
        questionBankId: questionBank._id,
        normalizedQuestionText: { $in: Array.from(batchNormalizedTexts) },
    })
        .select("questionText")
        .lean();

    if (existingDuplicates.length > 0) {
        throw new ApiError(
            409,
            "DUPLICATE_KEY_CONFLICT",
            `A question with text "${existingDuplicates[0].questionText}" already exists in the question bank`
        );
    }

    // 12. Construct each permanent question using trusted references and authenticated instructor ID
    const questionsToInsert = recheckedRows.map((item) => ({
        _id: new mongoose.Types.ObjectId(),
        questionBankId: questionBank._id,
        courseId: course._id,
        topicId: topic._id,
        lessonId: null,
        createdBy: instructorId,
        questionText: item.questionText,
        normalizedQuestionText: item.normalizedQuestionText,
        type: item.type,
        options: item.type === "TRUE_FALSE" ? [] : (item.options ?? []),
        correctAnswer: item.correctAnswer,
        explanation: item.explanation ?? "",
        marks: item.marks,
        difficulty: item.difficulty,
        status: "ACTIVE",
    }));

    const createdQuestionIds = questionsToInsert.map((q) => q._id);
    const createdCount = questionsToInsert.length;
    const confirmedAt = new Date();

    // 13. Persist questions and confirmed status/result atomically via transactions
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Atomically transition from PREVIEW_READY to CONFIRMED
        const updatedImport = await QuestionImport.findOneAndUpdate(
            { _id: importId, status: "PREVIEW_READY" },
            {
                $set: {
                    status: "CONFIRMED",
                    confirmedAt,
                    createdCount,
                    createdQuestionIds,
                },
            },
            { session, returnDocument: 'after' }
        );

        if (!updatedImport) {
            // Concurrent confirmation or state changed
            await session.abortTransaction();

            const rechecked = await QuestionImport.findById(importId);
            if (rechecked && rechecked.status === "CONFIRMED") {
                return {
                    importId: rechecked._id,
                    status: rechecked.status,
                    confirmedAt: rechecked.confirmedAt,
                    createdCount: rechecked.createdCount ?? rechecked.createdQuestionIds?.length ?? 0,
                    createdQuestionIds: rechecked.createdQuestionIds ?? [],
                };
            }

            throw new ApiError(
                409,
                "INVALID_IMPORT_STATE",
                "Import preview is no longer in PREVIEW_READY state"
            );
        }

        await Question.insertMany(questionsToInsert, { session });

        await session.commitTransaction();

        // 14. Return clear result
        return {
            importId: updatedImport._id,
            status: updatedImport.status,
            confirmedAt: updatedImport.confirmedAt,
            createdCount: updatedImport.createdCount,
            createdQuestionIds: updatedImport.createdQuestionIds,
        };
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        // Handle concurrent WriteConflict
        if (error.code === 112 || error.name === "WriteConflict") {
            const rechecked = await QuestionImport.findById(importId);
            if (rechecked && rechecked.status === "CONFIRMED") {
                return {
                    importId: rechecked._id,
                    status: rechecked.status,
                    confirmedAt: rechecked.confirmedAt,
                    createdCount: rechecked.createdCount ?? rechecked.createdQuestionIds?.length ?? 0,
                    createdQuestionIds: rechecked.createdQuestionIds ?? [],
                };
            }
        }

        // Duplicate-key error from MongoDB unique index
        if (error.code === 11000) {
            throw new ApiError(
                409,
                "DUPLICATE_KEY_CONFLICT",
                "A question with this text already exists in the question bank"
            );
        }

        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            500,
            "DATABASE_ERROR",
            `Failed to confirm question import: ${error.message}`
        );
    } finally {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        await session.endSession();
    }
}
