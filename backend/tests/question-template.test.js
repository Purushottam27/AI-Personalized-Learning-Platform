import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseFile } from '../src/shared/utils/csv-excel-parser.util.js';

const CANONICAL_QUESTION_HEADERS = [
    'questionText',
    'type',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'optionE',
    'optionF',
    'correctAnswer',
    'explanation',
    'marks',
    'difficulty',
];

async function generateTestXlsx() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AI Personalized Learning Platform';

    // Worksheet 1: Questions (First worksheet)
    const questionsSheet = workbook.addWorksheet('Questions', {
        views: [{ state: 'frozen', ySplit: 1 }],
    });
    questionsSheet.columns = CANONICAL_QUESTION_HEADERS.map((h) => ({ header: h, key: h, width: 20 }));
    questionsSheet.autoFilter = 'A1:L1';

    // Worksheet 2: Instructions (Second worksheet)
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.addRow(['QUESTION BANK IMPORT — INSTRUCTIONS & FORMATTING GUIDE']);
    instructionsSheet.addRow(['Field specifications', 'Rules', 'Examples']);
    instructionsSheet.addRow(['MCQ_SINGLE', 'Single correct option', 'correctAnswer: B']);
    instructionsSheet.addRow(['MCQ_MULTIPLE', 'Multiple correct options', 'correctAnswer: A|C']);
    instructionsSheet.addRow(['TRUE_FALSE', 'True/False question', 'correctAnswer: TRUE']);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

function generateTestCsv() {
    return Buffer.from(CANONICAL_QUESTION_HEADERS.join(',') + '\r\n', 'utf-8');
}

test('Question Import Templates Verification', async (t) => {
    await t.test('Canonical headers: exactly 12 required headers in exact order', () => {
        assert.equal(CANONICAL_QUESTION_HEADERS.length, 12);
        assert.deepEqual(CANONICAL_QUESTION_HEADERS, [
            'questionText',
            'type',
            'optionA',
            'optionB',
            'optionC',
            'optionD',
            'optionE',
            'optionF',
            'correctAnswer',
            'explanation',
            'marks',
            'difficulty',
        ]);
    });

    await t.test('CSV Template: valid format, parses cleanly with 0 data rows', async () => {
        const csvBuffer = generateTestCsv();
        const result = await parseFile(csvBuffer, 'question-template.csv');
        assert.equal(result.rows.length, 0, 'CSV template must contain 0 question data rows by default');
        assert.ok(result.blankRowsSkipped >= 0);
    });

    await t.test('XLSX Template: contains Questions and Instructions worksheets in order', async () => {
        const xlsxBuffer = await generateTestXlsx();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(xlsxBuffer);

        assert.equal(workbook.worksheets.length, 2, 'Workbook must contain exactly 2 worksheets');
        assert.equal(workbook.worksheets[0].name, 'Questions', 'Worksheet 1 must be named Questions');
        assert.equal(workbook.worksheets[1].name, 'Instructions', 'Worksheet 2 must be named Instructions');

        // Check header row in Questions worksheet
        const headerRow = workbook.worksheets[0].getRow(1);
        const headers = [];
        headerRow.eachCell((cell) => {
            headers.push(cell.value);
        });
        assert.deepEqual(headers, CANONICAL_QUESTION_HEADERS, 'Headers must match canonical 12 headers in exact order');
    });

    await t.test('XLSX Template: parsed by backend parseFile without errors and yields 0 data rows', async () => {
        const xlsxBuffer = await generateTestXlsx();
        const result = await parseFile(xlsxBuffer, 'question-template.xlsx');
        assert.equal(result.rows.length, 0, 'Empty template must yield 0 question rows');
        assert.equal(result.blankRowsSkipped, 0);
    });

    await t.test('XLSX Template: Instructions worksheet does not corrupt parser when question row is populated', async () => {
        const workbook = new ExcelJS.Workbook();
        const questionsSheet = workbook.addWorksheet('Questions');
        questionsSheet.columns = CANONICAL_QUESTION_HEADERS.map((h) => ({ header: h, key: h }));

        // Add 3 valid sample questions (MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE)
        questionsSheet.addRow({
            questionText: 'What is the time complexity of quicksort?',
            type: 'MCQ_SINGLE',
            optionA: 'O(n)',
            optionB: 'O(n log n)',
            optionC: 'O(n^2)',
            optionD: 'O(1)',
            correctAnswer: 'B',
            explanation: 'Average case is O(n log n)',
            marks: 2,
            difficulty: 'MEDIUM',
        });

        questionsSheet.addRow({
            questionText: 'Which are valid HTTP methods?',
            type: 'MCQ_MULTIPLE',
            optionA: 'GET',
            optionB: 'POST',
            optionC: 'FETCH',
            optionD: 'PUT',
            correctAnswer: 'A|B|D',
            explanation: 'FETCH is a Web API, not an HTTP method token',
            marks: 3,
            difficulty: 'HARD',
        });

        questionsSheet.addRow({
            questionText: 'TCP is a connection-oriented protocol.',
            type: 'TRUE_FALSE',
            correctAnswer: 'TRUE',
            marks: 1,
            difficulty: 'EASY',
        });

        const instructionsSheet = workbook.addWorksheet('Instructions');
        instructionsSheet.addRow(['INSTRUCTIONS', 'Must be ignored by parser']);

        const buffer = await workbook.xlsx.writeBuffer();
        const result = await parseFile(Buffer.from(buffer), 'populated-template.xlsx');

        assert.equal(result.rows.length, 3, 'Must parse exactly 3 question rows from Questions sheet');
        assert.equal(result.rows[0].data.questiontext, 'What is the time complexity of quicksort?');
        assert.equal(result.rows[0].data.type, 'MCQ_SINGLE');
        assert.equal(result.rows[0].data.correctanswer, 'B');

        assert.equal(result.rows[1].data.questiontext, 'Which are valid HTTP methods?');
        assert.equal(result.rows[1].data.type, 'MCQ_MULTIPLE');
        assert.equal(result.rows[1].data.correctanswer, 'A|B|D');

        assert.equal(result.rows[2].data.questiontext, 'TCP is a connection-oriented protocol.');
        assert.equal(result.rows[2].data.type, 'TRUE_FALSE');
        assert.equal(result.rows[2].data.correctanswer, 'TRUE');
    });
});
