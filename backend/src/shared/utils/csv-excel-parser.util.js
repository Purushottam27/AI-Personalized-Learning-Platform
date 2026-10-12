import Papa from 'papaparse';
import ExcelJS from 'exceljs';

/**
 * The 12 canonical header names for question import files.
 * Order in the file may vary; matching is case- and whitespace-insensitive.
 */
const REQUIRED_HEADERS = [
    'questiontext',
    'type',
    'optiona',
    'optionb',
    'optionc',
    'optiond',
    'optione',
    'optionf',
    'correctanswer',
    'explanation',
    'marks',
    'difficulty',
];

const MAX_DATA_ROWS = 500;

/**
 * Normalise a header cell: strip UTF-8 BOM, trim whitespace, lower-case.
 */
function normalizeHeader(header) {
    if (header == null) return '';
    // Remove the UTF-8 byte-order mark (U+FEFF) that Excel adds to the first cell.
    return header
        .toString()
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase();
}

/**
 * Validate the supplied header array.
 *
 * Returns a map of  normalizedHeaderName → columnIndex  so the service can
 * look up each cell by canonical name regardless of column order.
 *
 * Throws a descriptive Error on:
 *   - duplicate normalised headers
 *   - any missing required header
 */
function buildHeaderMap(rawHeaders) {
    const seen = new Map(); // normalizedName → first index

    for (let i = 0; i < rawHeaders.length; i++) {
        const norm = normalizeHeader(rawHeaders[i]);
        if (!norm) continue; // ignore completely empty trailing header cells

        if (seen.has(norm)) {
            throw new Error(`Duplicate header detected: "${norm}"`);
        }
        seen.set(norm, i);
    }

    for (const required of REQUIRED_HEADERS) {
        if (!seen.has(required)) {
            throw new Error(
                `Missing required header: "${required}". The file must contain all 12 required headers.`
            );
        }
    }

    return seen; // Map<normalizedName, columnIndex>
}

/**
 * Verify that a buffer matches the expected file format (magic-number check).
 *
 * For CSV we only confirm the buffer does NOT start with a known binary magic
 * number; we do not claim to know every binary format.
 *
 * For XLSX we require the PK ZIP signature (0x50 0x4B 0x03 0x04).
 */
function checkMagicNumber(buffer, extension) {
    if (buffer.length === 0) return false;

    if (extension === '.xlsx') {
        if (buffer.length < 4) return false;
        return (
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04
        );
    }

    if (extension === '.csv') {
        // Reject content that starts with the PK ZIP/XLSX signature.
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04
        ) {
            return false;
        }
        // Reject PDF signature.
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x25 && // %
            buffer[1] === 0x50 && // P
            buffer[2] === 0x44 && // D
            buffer[3] === 0x46   // F
        ) {
            return false;
        }
        return true;
    }

    return false;
}

/**
 * Build a normalised row object from a raw cell array using the header map.
 *
 * Every REQUIRED_HEADERS key is always present (defaulting to '').
 */
function buildRowObject(cells, headerMap) {
    const obj = {};
    // Initialise every expected key to empty string.
    for (const key of REQUIRED_HEADERS) {
        obj[key] = '';
    }
    for (const [name, colIdx] of headerMap) {
        if (REQUIRED_HEADERS.includes(name)) {
            const raw = cells[colIdx];
            obj[name] = raw != null ? String(raw) : '';
        }
    }
    return obj;
}

/**
 * Returns true when every value in the row object is empty (blank row).
 */
function isBlankRowObject(rowObj) {
    return Object.values(rowObj).every((v) => v.trim() === '');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV or XLSX buffer.
 *
 * @param {Buffer} buffer        - File content.
 * @param {string} originalname  - Original filename (used to infer extension).
 * @returns {{ rows: Array<{rowNumber: number, data: Object}>, blankRowsSkipped: number }}
 *
 * Throws an Error (to be converted to ApiError by the service) on:
 *   - unsupported extension
 *   - magic-number mismatch
 *   - malformed CSV / XLSX
 *   - missing/duplicate headers
 *   - empty file
 *   - more than 500 non-blank data rows
 */
export async function parseFile(buffer, originalname) {
    if (!buffer || buffer.length === 0) {
        throw new Error('Uploaded file is empty.');
    }

    const lower = originalname.toLowerCase();
    let ext = null;
    if (lower.endsWith('.xlsx')) ext = '.xlsx';
    else if (lower.endsWith('.csv')) ext = '.csv';

    if (!ext) {
        throw new Error(
            'Invalid file type. Only .csv and .xlsx files are supported.'
        );
    }

    if (!checkMagicNumber(buffer, ext)) {
        throw new Error(
            'File content does not match the file extension. ' +
            'The file may be corrupt or incorrectly renamed.'
        );
    }

    if (ext === '.csv') {
        return parseCsv(buffer);
    }
    return parseXlsx(buffer);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

async function parseCsv(buffer) {
    // Strip UTF-8 BOM before handing the string to Papa Parse so that the BOM
    // does not end up inside the first header value.
    const csvString = buffer.toString('utf-8').replace(/^\uFEFF/, '');

    return new Promise((resolve, reject) => {
        // First pass: array mode to preserve original line numbers.
        const result = Papa.parse(csvString, {
            header: false,
            skipEmptyLines: false, // we handle blank detection ourselves
        });

        // Reject on severe (non-FieldMismatch) parse errors.
        const severeErrors = result.errors.filter(
            (e) => e.type !== 'FieldMismatch'
        );
        if (severeErrors.length > 0) {
            return reject(
                new Error(
                    'Malformed CSV file: ' + severeErrors[0].message
                )
            );
        }

        const allRows = result.data; // Array<Array<string>>

        if (allRows.length === 0) {
            return reject(new Error('The CSV file is empty.'));
        }

        // Find the first non-blank row — that is the header row.
        let headerRowIdx = -1;
        for (let i = 0; i < allRows.length; i++) {
            if (allRows[i].some((c) => c && c.trim() !== '')) {
                headerRowIdx = i;
                break;
            }
        }

        if (headerRowIdx === -1) {
            return reject(new Error('The CSV file contains no headers.'));
        }

        let headerMap;
        try {
            headerMap = buildHeaderMap(allRows[headerRowIdx]);
        } catch (err) {
            return reject(err);
        }

        const rows = [];
        let blankRowsSkipped = 0;

        for (let i = headerRowIdx + 1; i < allRows.length; i++) {
            const cells = allRows[i];
            const rowObj = buildRowObject(cells, headerMap);

            if (isBlankRowObject(rowObj)) {
                blankRowsSkipped++;
                continue;
            }

            if (rows.length >= MAX_DATA_ROWS) {
                return reject(
                    new Error(
                        `Maximum of ${MAX_DATA_ROWS} non-empty data rows exceeded.`
                    )
                );
            }

            rows.push({
                rowNumber: i + 1, // 1-indexed spreadsheet row (header = row 1)
                data: rowObj,
            });
        }

        resolve({ rows, blankRowsSkipped });
    });
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

async function parseXlsx(buffer) {
    const workbook = new ExcelJS.Workbook();

    try {
        await workbook.xlsx.load(buffer);
    } catch {
        throw new Error(
            'Could not read the XLSX file. The file may be corrupt or is not a valid .xlsx workbook.'
        );
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error('The XLSX workbook contains no worksheets.');
    }

    // --- Header row (worksheet row 1) ---
    const headerRow = worksheet.getRow(1);
    const rawHeaders = [];

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rawHeaders[colNumber - 1] = cell.value != null ? String(cell.value) : '';
    });

    const headerMap = buildHeaderMap(rawHeaders);

    // Determine the number of columns we need to read.
    const maxColIndex = Math.max(...[...headerMap.values()]);

    const rows = [];
    let blankRowsSkipped = 0;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        // Read every expected column explicitly, including empty cells.
        const cells = [];
        for (let c = 1; c <= maxColIndex + 1; c++) {
            const cell = row.getCell(c);
            cells[c - 1] = resolveCellValue(cell);
        }

        const rowObj = buildRowObject(cells, headerMap);

        if (isBlankRowObject(rowObj)) {
            blankRowsSkipped++;
            return;
        }

        if (rows.length >= MAX_DATA_ROWS) {
            throw new Error(
                `Maximum of ${MAX_DATA_ROWS} non-empty data rows exceeded.`
            );
        }

        rows.push({ rowNumber, data: rowObj });
    });

    return { rows, blankRowsSkipped };
}

/**
 * Resolve an ExcelJS Cell value to a plain string.
 *
 * - Strings and numbers → toString() and trim.
 * - Rich text → concatenate all text segments.
 * - Hyperlink objects → use .text property.
 * - Booleans → 'TRUE' / 'FALSE'.
 * - Date objects → ISO string (unlikely in question imports but handled safely).
 * - Formula cells → reject; do not evaluate uploaded formulas.
 * - Error cells → empty string (treat as blank).
 * - null / undefined → empty string.
 */
function resolveCellValue(cell) {
    const v = cell.value;

    if (v == null) return '';

    // Error cell (e.g. #REF!, #DIV/0!)
    if (typeof v === 'object' && v.error) return '';

    // Formula cell — we deliberately do not evaluate uploaded formulas.
    if (typeof v === 'object' && v.formula != null) {
        // Use the cached result if available, otherwise treat as empty.
        if (v.result != null && typeof v.result !== 'object') {
            return String(v.result).trim();
        }
        return '';
    }

    // Rich text
    if (typeof v === 'object' && Array.isArray(v.richText)) {
        return v.richText.map((rt) => rt.text ?? '').join('').trim();
    }

    // Hyperlink
    if (typeof v === 'object' && typeof v.text === 'string') {
        return v.text.trim();
    }

    // Date
    if (v instanceof Date) {
        return v.toISOString();
    }

    // Boolean
    if (typeof v === 'boolean') {
        return v ? 'TRUE' : 'FALSE';
    }

    // Number or string
    return String(v).trim();
}
