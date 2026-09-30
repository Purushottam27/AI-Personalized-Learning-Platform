import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../../../shared/errors/ApiError.js";

const RESOURCE_UPLOAD_DIR = "./storage";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const RESOURCE_FILE_FIELD = "file";

const ALLOWED_DOCUMENT_FORMATS = [
    { extension: ".pdf", mimeType: "application/pdf" },
    { extension: ".ppt", mimeType: "application/vnd.ms-powerpoint" },
    {
        extension: ".pptx",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    },
    { extension: ".doc", mimeType: "application/msword" },
    {
        extension: ".docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
];

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, RESOURCE_UPLOAD_DIR);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

function fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();

    const isAllowedCombination = ALLOWED_DOCUMENT_FORMATS.some(
        (format) => format.extension === extension && format.mimeType === file.mimetype
    );

    if (!isAllowedCombination) {
        return cb(new ApiError(400, "INVALID_FILE_TYPE", "Unsupported file type"));
    }

    cb(null, true);
}

const resourceMulter = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
});

// Cleanup is best-effort. req.file is only populated once Multer has fully
// finished processing a file, so for errors like LIMIT_FILE_SIZE (which
// abort mid-stream) req.file will typically be undefined and there is no
// path available to us here. In that case there is nothing unsafe to do —
// we simply skip cleanup rather than guessing at a file path.
function cleanupPartialFile(req) {
    const filePath = req.file?.path;

    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
    }
}

function toApiError(err) {
    if (err instanceof ApiError) {
        return err;
    }

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return new ApiError(400, "FILE_TOO_LARGE", "File size must not exceed 10 MB");
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return new ApiError(
                400,
                "UNEXPECTED_FIELD",
                `Unexpected file field. Expected field "${RESOURCE_FILE_FIELD}"`
            );
        }

        return new ApiError(400, "UPLOAD_ERROR", "File upload failed");
    }

    return err;
}

const uploadSingle = resourceMulter.single(RESOURCE_FILE_FIELD);

function resourceUpload(req, res, next) {
    uploadSingle(req, res, (err) => {
        if (err) {
            cleanupPartialFile(req);
            return next(toApiError(err));
        }

        next();
    });
}

export default resourceUpload;