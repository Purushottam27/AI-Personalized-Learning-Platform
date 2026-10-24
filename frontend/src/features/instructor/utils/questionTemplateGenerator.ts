import ExcelJS from 'exceljs';

export const CANONICAL_QUESTION_HEADERS = [
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
] as const;

export function generateCsvQuestionTemplate(): Blob {
  const content = CANONICAL_QUESTION_HEADERS.join(',') + '\r\n';
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

export async function generateXlsxQuestionTemplate(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Personalized Learning Platform';
  workbook.lastModifiedBy = 'Instructor';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ==========================================
  // Worksheet 1: Questions (Canonical Import Sheet)
  // Must be the first worksheet (index 0) because
  // the backend parser reads workbook.worksheets[0].
  // ==========================================
  const questionsSheet = workbook.addWorksheet('Questions', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  questionsSheet.columns = [
    { header: 'questionText', key: 'questionText', width: 40 },
    { header: 'type', key: 'type', width: 16 },
    { header: 'optionA', key: 'optionA', width: 22 },
    { header: 'optionB', key: 'optionB', width: 22 },
    { header: 'optionC', key: 'optionC', width: 22 },
    { header: 'optionD', key: 'optionD', width: 22 },
    { header: 'optionE', key: 'optionE', width: 22 },
    { header: 'optionF', key: 'optionF', width: 22 },
    { header: 'correctAnswer', key: 'correctAnswer', width: 16 },
    { header: 'explanation', key: 'explanation', width: 35 },
    { header: 'marks', key: 'marks', width: 10 },
    { header: 'difficulty', key: 'difficulty', width: 14 },
  ];

  // Header row styling
  const headerRow = questionsSheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Slate 800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Enable autoFilter for canonical headers A1:L1
  questionsSheet.autoFilter = 'A1:L1';

  // ==========================================
  // Worksheet 2: Instructions (Formatting Guide)
  // ==========================================
  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.views = [{ state: 'frozen', ySplit: 3 }];

  instructionsSheet.columns = [
    { key: 'colA', width: 20 },
    { key: 'colB', width: 14 },
    { key: 'colC', width: 30 },
    { key: 'colD', width: 55 },
  ];

  // Title block
  const titleRow = instructionsSheet.addRow(['QUESTION BANK IMPORT — INSTRUCTIONS & FORMATTING GUIDE']);
  titleRow.height = 30;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };

  const subTitleRow = instructionsSheet.addRow([
    'Please read before entering questions into the "Questions" tab. Do not delete, reorder, or rename columns.',
  ]);
  subTitleRow.height = 20;
  subTitleRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

  instructionsSheet.addRow([]); // Blank spacer

  // Table 1: Field specifications
  const table1Header = instructionsSheet.addRow([
    'Column Name',
    'Required?',
    'Accepted Values / Format',
    'Description & Instructions',
  ]);
  table1Header.height = 24;
  table1Header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }, // Slate 700
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const columnSpecs = [
    [
      'questionText',
      'YES',
      'Text (3 - 1000 characters)',
      'The question prompt or statement. Must be between 3 and 1000 characters. Duplicates within the same bank will be flagged.',
    ],
    [
      'type',
      'YES',
      'MCQ_SINGLE, MCQ_MULTIPLE, or TRUE_FALSE',
      'The question format. Must be exactly one of the three supported enum values (case-insensitive in parser, uppercase recommended).',
    ],
    [
      'optionA',
      'Conditional',
      'Text (1 - 500 characters)',
      'First option. Required for MCQ_SINGLE and MCQ_MULTIPLE. Must be left completely blank for TRUE_FALSE.',
    ],
    [
      'optionB',
      'Conditional',
      'Text (1 - 500 characters)',
      'Second option. Required for MCQ_SINGLE and MCQ_MULTIPLE. Must be left completely blank for TRUE_FALSE.',
    ],
    [
      'optionC',
      'Optional',
      'Text (1 - 500 characters)',
      'Third option. Optional for MCQ types. Options must be filled contiguously without gaps. Leave blank for TRUE_FALSE.',
    ],
    [
      'optionD',
      'Optional',
      'Text (1 - 500 characters)',
      'Fourth option. Optional for MCQ types. Options must be filled contiguously without gaps. Leave blank for TRUE_FALSE.',
    ],
    [
      'optionE',
      'Optional',
      'Text (1 - 500 characters)',
      'Fifth option. Optional for MCQ types. Options must be filled contiguously without gaps. Leave blank for TRUE_FALSE.',
    ],
    [
      'optionF',
      'Optional',
      'Text (1 - 500 characters)',
      'Sixth option. Maximum 6 options per question. Leave blank for TRUE_FALSE.',
    ],
    [
      'correctAnswer',
      'YES',
      'Letter (A-F), Pipe-delimited (e.g. A|C), or TRUE/FALSE',
      '• MCQ_SINGLE: single letter matching an option (e.g., A, B, C).\n• MCQ_MULTIPLE: 2 or more letters separated by pipe | (e.g., A|C, B|D|E).\n• TRUE_FALSE: exactly TRUE or FALSE.',
    ],
    [
      'explanation',
      'Optional',
      'Text (0 - 1000 characters)',
      'Explanation shown to learners after submitting their assessment attempt. Highly recommended for targeted feedback.',
    ],
    [
      'marks',
      'YES',
      'Integer (1 - 100)',
      'Points awarded when correctly answered. Must be an integer between 1 and 100.',
    ],
    [
      'difficulty',
      'YES',
      'EASY, MEDIUM, or HARD',
      'Categorizes question challenge level. Used for practice and diagnostic assessment selection.',
    ],
  ];

  for (const spec of columnSpecs) {
    const row = instructionsSheet.addRow(spec);
    row.height = 36;
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(2).font = { bold: spec[1] === 'YES', size: 10 };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).font = { size: 9 };
    row.getCell(3).alignment = { vertical: 'middle' };
    row.getCell(4).font = { size: 9 };
    row.getCell(4).alignment = { vertical: 'middle', wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  instructionsSheet.addRow([]); // Blank spacer

  // Section 2: Question Type Examples & Rules
  const sec2Title = instructionsSheet.addRow(['QUESTION TYPE EXAMPLES']);
  sec2Title.height = 24;
  sec2Title.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };

  const examplesHeader = instructionsSheet.addRow(['Type', 'Example Prompt', 'Options Layout', 'Correct Answer Format']);
  examplesHeader.height = 22;
  examplesHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const examples = [
    [
      'MCQ_SINGLE',
      'What is the time complexity of binary search?',
      'optionA: O(n)\noptionB: O(log n)\noptionC: O(n^2)\noptionD: O(1)',
      'B (Single option key)',
    ],
    [
      'MCQ_MULTIPLE',
      'Which of the following are non-primitive data types in JavaScript?',
      'optionA: Object\noptionB: Number\noptionC: Array\noptionD: Function',
      'A|C|D (At least 2 keys separated by pipe |)',
    ],
    [
      'TRUE_FALSE',
      'HTTP is a stateless communication protocol.',
      'Leave ALL option columns (A through F) completely blank',
      'TRUE or FALSE',
    ],
  ];

  for (const ex of examples) {
    const row = instructionsSheet.addRow(ex);
    row.height = 42;
    row.getCell(1).font = { bold: true, size: 9 };
    row.getCell(2).font = { size: 9 };
    row.getCell(2).alignment = { vertical: 'middle', wrapText: true };
    row.getCell(3).font = { size: 9 };
    row.getCell(3).alignment = { vertical: 'middle', wrapText: true };
    row.getCell(4).font = { bold: true, size: 9 };
    row.getCell(4).alignment = { vertical: 'middle', wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  instructionsSheet.addRow([]); // Blank spacer

  // Section 3: Important Rules & Safeguards
  const rulesHeader = instructionsSheet.addRow(['IMPORTANT RULES & HOW TO AVOID ERRORS']);
  rulesHeader.height = 24;
  rulesHeader.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };

  const rules = [
    ['1. Contiguous Options', 'For MCQ questions, options must start at optionA and be filled contiguously without blank gaps. For example, you cannot fill optionA and optionC while leaving optionB blank.'],
    ['2. True/False Options', 'TRUE_FALSE questions must have ALL option columns (A through F) left blank. Filling any option cell on a TRUE_FALSE row will cause row rejection.'],
    ['3. File Size & Limits', 'Maximum 500 question rows per file. Maximum file size is 5 MB. Completely blank rows are automatically skipped by the parser and do not count toward data rows.'],
    ['4. Two-Step Preview & Confirmation', 'Uploading the spreadsheet creates a preview for you to review valid, invalid, and duplicate rows. No permanent questions are created until you click "Confirm Import".'],
    ['5. Sheet Name Requirement', 'Keep the first worksheet named "Questions". The platform parser automatically reads the first sheet in the workbook.'],
  ];

  for (const [title, desc] of rules) {
    const row = instructionsSheet.addRow([title, desc]);
    row.height = 28;
    row.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    row.getCell(2).font = { size: 9 };
    row.getCell(2).alignment = { vertical: 'middle', wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}
