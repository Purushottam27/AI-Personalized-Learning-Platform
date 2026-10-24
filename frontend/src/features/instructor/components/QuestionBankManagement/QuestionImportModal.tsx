import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { confirmQuestionImport, importQuestionsPreview } from '../../api/question.api';
import {
  generateCsvQuestionTemplate,
  generateXlsxQuestionTemplate,
  downloadFile,
} from '../../utils/questionTemplateGenerator';
import { isApiError } from '../../../../lib/axios';
import type {
  QuestionImportConfirmResponse,
  QuestionImportPreviewResponse,
  QuestionImportPreviewRow,
} from '../../types/question.types';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionBankId: string;
  onSuccess: () => void;
}

type TabFilter = 'ALL' | 'VALID' | 'DUPLICATE' | 'INVALID';

const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onClose,
  questionBankId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<QuestionImportPreviewResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<QuestionImportConfirmResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDownloadingXlsx, setIsDownloadingXlsx] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const handleDownloadXlsx = async () => {
    setDownloadError(null);
    setDownloadSuccessMessage(null);
    setIsDownloadingXlsx(true);
    try {
      const blob = await generateXlsxQuestionTemplate();
      downloadFile(blob, 'question-import-template.xlsx');
      setDownloadSuccessMessage('Excel template (.xlsx) downloaded successfully.');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate Excel template.');
    } finally {
      setIsDownloadingXlsx(false);
    }
  };

  const handleDownloadCsv = () => {
    setDownloadError(null);
    setDownloadSuccessMessage(null);
    setIsDownloadingCsv(true);
    try {
      const blob = generateCsvQuestionTemplate();
      downloadFile(blob, 'question-import-template.csv');
      setDownloadSuccessMessage('CSV template (.csv) downloaded successfully.');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate CSV template.');
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.csv' && ext !== '.xlsx') {
      setError('Unsupported file type. Please select a .csv or .xlsx file.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5 MB limit.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadPreview = async () => {
    if (!file) {
      setError('Please select a file to import.');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const data = await importQuestionsPreview(questionBankId, file);
      setPreview(data);
    } catch (err: unknown) {
      setError(
        isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to process import preview. Please check your file format.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setIsConfirming(true);
    setError(null);
    try {
      const result = await confirmQuestionImport(preview.importId);
      setConfirmResult(result);
      onSuccess();
    } catch (err: unknown) {
      setError(
        isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to confirm question import.',
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setConfirmResult(null);
    setError(null);
    setActiveTab('ALL');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const getFilteredRows = (): QuestionImportPreviewRow[] => {
    if (!preview) return [];
    if (activeTab === 'VALID') {
      return preview.previewData.filter((r) => r.isValid && !r.isDuplicate);
    }
    if (activeTab === 'DUPLICATE') {
      return preview.previewData.filter((r) => r.isDuplicate);
    }
    if (activeTab === 'INVALID') {
      return preview.previewData.filter((r) => !r.isValid);
    }
    return preview.previewData;
  };

  const filteredRows = getFilteredRows();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-signal">Batch Import</p>
            <h2 id="import-modal-title" className="font-serif text-lg font-semibold text-text-primary">
              Import Questions from CSV or XLSX
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading || isConfirming}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary ${interactive}`}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Phase 3: Success Result */}
          {confirmResult ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft text-sage border border-sage/30">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-text-primary">Import Confirmed!</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Successfully imported <strong>{confirmResult.createdCount}</strong> question{confirmResult.createdCount === 1 ? '' : 's'} into your question bank.
                </p>
              </div>
              <div className="pt-4">
                <Button variant="primary" onClick={handleClose} className={interactive}>
                  Done & Return to Bank
                </Button>
              </div>
            </div>
          ) : !preview ? (
            /* Phase 1: Upload & Instructions */
            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-signal bg-signal-soft/30'
                    : file
                      ? 'border-signal/50 bg-surface-elevated'
                      : 'border-border bg-surface-elevated/50 hover:border-text-tertiary'
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface border border-border text-signal">
                  {file ? <FileSpreadsheet className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">{file.name}</p>
                    <p className="text-xs text-text-tertiary">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs font-semibold text-error hover:underline cursor-pointer"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-primary">
                      Drag & drop your question spreadsheet here, or
                    </p>
                    <label className={`inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-xs hover:bg-surface-elevated ${interactive}`}>
                      <FileUp className="h-4 w-4 text-signal" aria-hidden="true" />
                      Browse Files
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-[11px] text-text-tertiary">
                      Supported formats: .csv, .xlsx · Max size: 5 MB · Max rows: 500
                    </p>
                  </div>
                )}
              </div>

              {/* Format Reference Guide */}
              <div className="rounded-xl border border-border bg-surface-elevated p-4 text-xs space-y-2 text-text-secondary leading-relaxed">
                <p className="font-semibold uppercase tracking-wider text-text-primary text-[11px]">
                  Required Spreadsheet Columns:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-surface p-2 border border-border">
                    <span className="font-mono font-bold text-signal">questionText</span>: Prompt (3–1000 chars)
                  </div>
                  <div className="rounded-lg bg-surface p-2 border border-border">
                    <span className="font-mono font-bold text-signal">type</span>: MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE
                  </div>
                  <div className="rounded-lg bg-surface p-2 border border-border">
                    <span className="font-mono font-bold text-signal">correctAnswer</span>: e.g. A, or A|C, or TRUE/FALSE
                  </div>
                  <div className="rounded-lg bg-surface p-2 border border-border">
                    <span className="font-mono font-bold text-signal">marks</span>: 1 to 100
                  </div>
                  <div className="rounded-lg bg-surface p-2 border border-border">
                    <span className="font-mono font-bold text-signal">difficulty</span>: EASY, MEDIUM, HARD
                  </div>
                  <div className="rounded-lg bg-surface p-2 border border-border">
                    <span className="font-mono font-bold text-signal">optionA ... optionF</span>: Option texts
                  </div>
                </div>
              </div>

              {/* Prepare Your Questions Template Download Section */}
              <div className="rounded-2xl border border-border bg-surface-elevated p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-soft text-signal">
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <h3 className="font-serif text-sm font-semibold text-text-primary">
                      Prepare Your Questions
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Save time during question import by starting with our ready-to-use templates. The predefined columns and formatting guidelines help you prepare your questions in the supported format, reducing validation errors before upload.
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    Complete the template, save your file, and upload it above. You can review validation results before confirming the import.
                  </p>
                </div>

                {downloadError && (
                  <div role="alert" className="flex items-center gap-2 rounded-lg border border-error/20 bg-error-soft px-3 py-2 text-xs text-error">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{downloadError}</span>
                  </div>
                )}

                {downloadSuccessMessage && (
                  <div role="status" className="flex items-center gap-2 rounded-lg border border-sage/20 bg-sage-soft px-3 py-2 text-xs text-sage">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{downloadSuccessMessage}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDownloadXlsx}
                    loading={isDownloadingXlsx}
                    disabled={isDownloadingXlsx || isDownloadingCsv}
                    className={`flex-1 sm:flex-initial text-xs py-2 px-3.5 ${interactive}`}
                    aria-label="Download Excel Template (.xlsx)"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Download Excel Template (.xlsx)
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDownloadCsv}
                    loading={isDownloadingCsv}
                    disabled={isDownloadingXlsx || isDownloadingCsv}
                    className={`flex-1 sm:flex-initial text-xs py-2 px-3.5 ${interactive}`}
                    aria-label="Download CSV Template (.csv)"
                  >
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    Download CSV Template (.csv)
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Phase 2: Preview Results */
            <div className="space-y-5">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-surface-elevated p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Total Rows</p>
                  <p className="text-xl font-bold text-text-primary">{preview.summary.totalRows}</p>
                </div>
                <div className="rounded-xl border border-sage/30 bg-sage-soft/30 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sage">Importable (Valid)</p>
                  <p className="text-xl font-bold text-sage">{preview.summary.importableRows}</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Duplicates</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{preview.summary.duplicateRows}</p>
                </div>
                <div className="rounded-xl border border-error/30 bg-error-soft/30 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-error">Invalid</p>
                  <p className="text-xl font-bold text-error">{preview.summary.invalidRows}</p>
                </div>
              </div>

              {/* Notice */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-text-secondary">
                <span>
                  Preview stored temporarily. Valid until:{' '}
                  <strong>{new Date(preview.expiresAt).toLocaleTimeString()}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="font-semibold text-signal hover:underline cursor-pointer"
                >
                  Choose another file
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 border-b border-border pb-1">
                {(['ALL', 'VALID', 'DUPLICATE', 'INVALID'] as TabFilter[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                      activeTab === tab
                        ? 'bg-surface-elevated text-signal border border-border'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab === 'ALL' && `All Rows (${preview.previewData.length})`}
                    {tab === 'VALID' && `Importable (${preview.summary.importableRows})`}
                    {tab === 'DUPLICATE' && `Duplicates (${preview.summary.duplicateRows})`}
                    {tab === 'INVALID' && `Errors (${preview.summary.invalidRows})`}
                  </button>
                ))}
              </div>

              {/* Rows List */}
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border p-2 bg-surface">
                {filteredRows.length === 0 ? (
                  <p className="py-6 text-center text-xs text-text-tertiary">No rows in this filter category.</p>
                ) : (
                  filteredRows.map((row) => (
                    <div
                      key={row.rowNumber}
                      className="rounded-lg border border-border-muted bg-surface-elevated p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-text-tertiary">Row {row.rowNumber}</span>
                          {row.isValid && !row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-bold text-sage">
                              <Check className="h-3 w-3" /> Valid
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" /> Duplicate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-error-soft px-2 py-0.5 text-[10px] font-bold text-error">
                              <XCircle className="h-3 w-3" /> Error
                            </span>
                          )}
                          {row.type && (
                            <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-secondary">
                              {row.type}
                            </span>
                          )}
                        </div>

                        {row.marks !== undefined && (
                          <span className="text-[11px] text-text-tertiary">{row.marks} mark{row.marks === 1 ? '' : 's'}</span>
                        )}
                      </div>

                      <p className="font-medium text-text-primary">{row.questionText || '(No question text)'}</p>

                      {/* Error details if any */}
                      {row.rowErrors && row.rowErrors.length > 0 && (
                        <div className="mt-1 rounded-md bg-error-soft/50 p-2 text-error">
                          <ul className="list-inside list-disc space-y-0.5">
                            {row.rowErrors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-elevated px-6 py-4">
          <Button variant="secondary" onClick={handleClose} disabled={isUploading || isConfirming} className={interactive}>
            {confirmResult ? 'Close' : 'Cancel'}
          </Button>

          {!confirmResult && !preview && (
            <Button
              variant="primary"
              onClick={handleUploadPreview}
              loading={isUploading}
              disabled={!file}
              className={interactive}
            >
              Upload & Generate Preview
            </Button>
          )}

          {!confirmResult && preview && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={isConfirming}
              disabled={preview.summary.importableRows === 0}
              className={interactive}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Confirm Import ({preview.summary.importableRows} Questions)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
