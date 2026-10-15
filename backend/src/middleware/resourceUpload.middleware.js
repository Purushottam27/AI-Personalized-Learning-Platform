import multer from "multer";
import path from "path";
import fs from "fs";

import { ApiError } from "../shared/errors/ApiError.js";

const RESOURCE_UPLOAD_DIR = path.resolve(process.cwd(), "storage");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const RESOURCE_FILE_FIELD = "file";

// Ensure the storage directory exists.
// This is especially useful on a fresh clone or deployment.
fs.mkdirSync(RESOURCE_UPLOAD_DIR, { recursive: true });

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
        const safeOriginalName = path.basename(file.originalname);
        cb(null, `${uniqueSuffix}-${safeOriginalName}`);
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

function cleanupTemporaryFile(filePath) {
    if (!filePath) return;
    fs.unlink(filePath, (error) => {
        if (error && error.code !== "ENOENT") {
            console.error("Failed to clean up temporary resource file:", filePath, error);
        }
    });
}

function registerCleanup(req, res) {
    const filePath = req.file?.path;
    if (!filePath) return;

    let cleanedUp = false;
    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        cleanupTemporaryFile(filePath);
    };

    res.once("finish", cleanup);
    res.once("close", cleanup);
}

function toApiError(error) {
    if (error instanceof ApiError) return error;

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return new ApiError(
                400,
                "FILE_TOO_LARGE",
                "File size must not exceed 10 MiB (10 MB)"
            );
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return new ApiError(
                400,
                "UNEXPECTED_FIELD",
                `Unexpected file field. Expected field "${RESOURCE_FILE_FIELD}"`
            );
        }
        return new ApiError(400, "UPLOAD_ERROR", "File upload failed");
    }
    return error;
}

const uploadSingle = resourceMulter.single(RESOURCE_FILE_FIELD);

function resourceUpload(req, res, next) {
    uploadSingle(req, res, (error) => {
        if (error) return next(toApiError(error));
        registerCleanup(req, res);
        next();
    });
}

export default resourceUpload;