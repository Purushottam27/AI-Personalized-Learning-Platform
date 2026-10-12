import multer from "multer";
import path from "path";

import { ApiError } from "../../../shared/errors/ApiError.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const IMPORT_FILE_FIELD = "file";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Accepted file extensions and the browser MIME types legitimately associated
 * with each.
 *
 * We validate the file extension here as a first gate. The parser utility
 * performs a deeper magic-number check on the buffer content so we do NOT
 * solely trust the MIME type reported by the browser.
 */
const ALLOWED_FORMATS = [
    {
        extension: ".csv",
        mimeTypes: [
            "text/csv",
            "application/csv",
            "text/comma-separated-values",
            "text/plain", // some browsers send plain text for CSV
            "application/vnd.ms-excel", // IE/Edge classic CSV MIME
        ],
    },
    {
        extension: ".xlsx",
        mimeTypes: [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "application/octet-stream", // generic binary — extension check still required
        ],
    },
];

// ---------------------------------------------------------------------------
// Multer setup — memory storage so the parser receives a Buffer
// ---------------------------------------------------------------------------

function fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();

    const formatEntry = ALLOWED_FORMATS.find(
        (f) => f.extension === extension
    );

    if (!formatEntry) {
        return cb(
            new ApiError(
                400,
                "INVALID_FILE_TYPE",
                `Unsupported file type "${extension}". Only .csv and .xlsx files are accepted.`
            )
        );
    }

    // We accept the file at this stage. The parser will perform the
    // definitive content-level (magic-number) check on the buffer.
    cb(null, true);
}

const importMulter = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter,
});

// ---------------------------------------------------------------------------
// Multer error → ApiError conversion
// ---------------------------------------------------------------------------

function toApiError(err) {
    if (err instanceof ApiError) {
        return err;
    }

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return new ApiError(
                400,
                "FILE_TOO_LARGE",
                `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)} MB.`
            );
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return new ApiError(
                400,
                "UNEXPECTED_FIELD",
                `Unexpected file field. Use the multipart field name "${IMPORT_FILE_FIELD}".`
            );
        }

        return new ApiError(400, "UPLOAD_ERROR", "File upload failed.");
    }

    return err;
}

// ---------------------------------------------------------------------------
// Middleware export
// ---------------------------------------------------------------------------

const uploadSingle = importMulter.single(IMPORT_FILE_FIELD);

/**
 * Express middleware that:
 *  1. Parses the multipart upload using Multer (memory storage, 5 MB limit).
 *  2. Validates the file extension.
 *  3. Converts any Multer or ApiError to the project's error convention.
 *  4. Passes unhandled errors to the global error middleware via `next(err)`.
 */
function questionImportUpload(req, res, next) {
    uploadSingle(req, res, (err) => {
        if (err) {
            return next(toApiError(err));
        }
        next();
    });
}

export default questionImportUpload;
