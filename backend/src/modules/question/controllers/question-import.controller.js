import { processQuestionImportPreview } from "../services/question-import.service.js";
import { confirmQuestionImportService } from "../services/question-import-confirmation.service.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

export const importQuestionsPreview = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, "IMPORT_FILE_REQUIRED", "No file uploaded. Please upload a .csv or .xlsx file.");
        }

        const data = await processQuestionImportPreview(
            req.file.buffer,
            req.file.originalname,
            req.params.questionBankId,
            req.user._id
        );

        return res.status(201).json({ success: true, data });
    } catch (error) {
        return next(error);
    }
};

export const confirmQuestionImport = async (req, res, next) => {
    try {
        const data = await confirmQuestionImportService(
            req.params.importId,
            req.user._id
        );

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return next(error);
    }
};
