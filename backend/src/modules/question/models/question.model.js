import mongoose from "mongoose";

const QUESTION_TYPES = ["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const MAX_MARKS = 100;

const optionSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        match: /^[A-Z]$/
    },
    text: {
        type: String,
        required: true,
        trim: true
    }
},{ _id: false });

function validateOptions(options) {
    if (this.type === "TRUE_FALSE") {
        return !options || options.length === 0;
    }

    // MCQ_SINGLE / MCQ_MULTIPLE
    if (!options || options.length < 2) {
        return false;
    }

    const keys = options.map((option) => option.key);
    const uniqueKeys = new Set(keys);

    return uniqueKeys.size === keys.length;
}

function validateCorrectAnswer(correctAnswer) {
    if (this.type === "TRUE_FALSE") {
        return correctAnswer === "TRUE" || correctAnswer === "FALSE";
    }

    const optionKeys = new Set((this.options || []).map((option) => option.key));

    if (this.type === "MCQ_SINGLE") {
        return typeof correctAnswer === "string" && optionKeys.has(correctAnswer);
    }

    if (this.type === "MCQ_MULTIPLE") {
        if (!Array.isArray(correctAnswer) || correctAnswer.length < 2) {
            return false;
        }

        const uniqueAnswers = new Set(correctAnswer);

        if (uniqueAnswers.size !== correctAnswer.length) {
            return false;
        }

        return correctAnswer.every((key) => optionKeys.has(key));
    }
    return false;
}

const questionSchema = new mongoose.Schema({
    questionBankId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionBank",
        required: true,
        index: true
    },

    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true
    },

    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
        required: true,
        index: true
    },

    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
        default: null
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    questionText: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 1000
    },

    type: {
        type: String,
        enum: QUESTION_TYPES,
        required: true
    },

    options: {
        type: [optionSchema],
        default: [],
        validate: {
            validator: validateOptions,
            message: "Options are invalid for the given question type"
        }
    },

    correctAnswer: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        validate: {
            validator: validateCorrectAnswer,
            message: "correctAnswer is invalid for the given question type/options"
        }
    },

    explanation: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
    },

    marks: {
        type: Number,
        required: true,
        min: 1,
        max: MAX_MARKS
    },

    difficulty: {
        type: String,
        enum: DIFFICULTIES,
        required: true
    },

    status: {
        type: String,
        enum: ["ACTIVE", "ARCHIVED"],
        default: "ACTIVE",
        required: true
    }
    
},{ timestamps: true });

questionSchema.index({ questionBankId: 1, status: 1 });

export const Question = mongoose.model("Question", questionSchema);