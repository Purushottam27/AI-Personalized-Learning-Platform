import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const OPTION_KEY_REGEX = /^[A-Z]$/;

const QUESTION_TYPES = ["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const objectIdStringSchema = z.string().regex(OBJECT_ID_REGEX, "Invalid MongoDB ObjectId");

const optionKeySchema = z.string().regex(OPTION_KEY_REGEX, "Option key must be a single uppercase letter (A-Z)");

const optionSchema = z
    .object({
        key: optionKeySchema,
        text: z.string().trim().min(1).max(500)
    })
    .strict();

const optionsArraySchema = z.array(optionSchema).min(2);

const questionTextSchema = z.string().trim().min(3).max(1000);

const explanationSchema = z.string().trim().max(1000);

const marksSchema = z.number().int().min(1).max(100);

const difficultySchema = z.enum(DIFFICULTIES);

const typeSchema = z.enum(QUESTION_TYPES);

/**
 * Validates the internal relationship between:
 * - type
 * - options
 * - correctAnswer
 *
 * This is primarily used for complete question creation,
 * where all required question content is available.
 */
function checkQuestionContentConsistency(data, ctx) {
    const { type, options, correctAnswer } = data;

    if (type === "TRUE_FALSE") {
        if (options !== undefined && options.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["options"],
                message: "options must be omitted or empty for TRUE_FALSE questions"
            });
        }

        if (correctAnswer !== "TRUE" && correctAnswer !== "FALSE") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["correctAnswer"],
                message: 'correctAnswer must be "TRUE" or "FALSE" for TRUE_FALSE questions'
            });
        }

        return;
    }

    /*
     * MCQ_SINGLE / MCQ_MULTIPLE
     */

    if (!options) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options"],
            message: `options are required for ${type} questions`
        });

        return;
    }

    const optionKeys = options.map((option) => option.key);
    const uniqueOptionKeys = new Set(optionKeys);

    if (uniqueOptionKeys.size !== optionKeys.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options"],
            message: "Option keys must be unique"
        });
    }

    if (type === "MCQ_SINGLE") {
        if (typeof correctAnswer !== "string") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["correctAnswer"],
                message: "correctAnswer must be a single option key for MCQ_SINGLE"
            });

            return;
        }

        if (!uniqueOptionKeys.has(correctAnswer)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["correctAnswer"],
                message: "correctAnswer must match one of the supplied option keys"
            });
        }

        return;
    }

    /*
     * MCQ_MULTIPLE
     */

    if (!Array.isArray(correctAnswer)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["correctAnswer"],
            message: "correctAnswer must be an array of option keys for MCQ_MULTIPLE"
        });

        return;
    }

    if (correctAnswer.length < 2) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["correctAnswer"],
            message: "correctAnswer must contain at least 2 option keys for MCQ_MULTIPLE"
        });

        return;
    }

    const uniqueCorrectAnswers = new Set(correctAnswer);

    if (uniqueCorrectAnswers.size !== correctAnswer.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["correctAnswer"],
            message: "correctAnswer must not contain duplicate option keys"
        });
    }

    const everyKeyExists = correctAnswer.every((key) =>
        uniqueOptionKeys.has(key)
    );

    if (!everyKeyExists) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["correctAnswer"],
            message: "Every correctAnswer key must exist in options"
        });
    }
}

// Create Question
export const createQuestionSchema = z
    .object({
        questionText: questionTextSchema,

        type: typeSchema,

        options: z.array(optionSchema).optional(),

        correctAnswer: z.union([
            z.string(),
            z.array(z.string())
        ]),

        explanation: explanationSchema.optional(),

        marks: marksSchema,

        difficulty: difficultySchema,

        lessonId: objectIdStringSchema.optional()
    })
    .strict()
    .superRefine((data, ctx) => {
        checkQuestionContentConsistency(data, ctx);
    });

/* ---------------------------------------------------------- */
/* UPDATE QUESTION                                             */
/* ---------------------------------------------------------- */

/*
 * PATCH semantics:
 *
 * Every field is optional, but at least one field must be supplied.
 *
 * This schema intentionally does NOT try to validate the final
 * relationship between:
 *
 *     type + options + correctAnswer
 *
 * because a PATCH request may contain only part of that information.
 *
 * Example:
 *
 *     { correctAnswer: "B" }
 *
 * is structurally valid as a PATCH request.
 *
 * The Question service will later:
 *
 * 1. Fetch the existing Question.
 * 2. Merge the existing values with the update.
 * 3. Validate the resulting complete Question state.
 * 4. Check Assessment usage/edit restrictions.
 * 5. Save the valid result.
 */

const updateQuestionBaseSchema = z
    .object({
        questionText: questionTextSchema.optional(),

        type: typeSchema.optional(),

        options: z.array(optionSchema).optional(),

        correctAnswer: z
            .union([
                z.string(),
                z.array(z.string())
            ])
            .optional(),

        explanation: explanationSchema.optional(),

        marks: marksSchema.optional(),

        difficulty: difficultySchema.optional(),

        lessonId: objectIdStringSchema
            .nullable()
            .optional()
    })
    .strict();

export const updateQuestionSchema = updateQuestionBaseSchema
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    });


//QUESTION ID
export const questionIdSchema = z
    .object({
        questionId: objectIdStringSchema
    })
    .strict();

// QUESTION BANK ID 
export const questionBankIdSchema = z
    .object({
        questionBankId: objectIdStringSchema
    })
    .strict();