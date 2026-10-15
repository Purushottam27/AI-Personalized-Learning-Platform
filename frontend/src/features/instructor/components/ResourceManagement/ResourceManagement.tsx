import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  FileText,
  FileUp,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Video,
  X,
  Archive,
  RotateCcw,
  Download,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { getLessonsByTopic } from '../../api/lesson.api';
import {
  archiveResource,
  createResource,
  getResourceDownloadUrl,
  reorderTopicResources,
  restoreResource,
  updateResource,
} from '../../api/resource.api';
import { useTopicResources } from '../../hooks/useTopicResources';
import { isApiError } from '../../../../lib/axios';
import type { CourseStatus } from '../../types/instructor.types';
import type { Lesson } from '../../types/lesson.types';
import type {
  CreateResourcePayload,
  Resource,
  ResourceType,
  UpdateResourcePayload,
} from '../../types/resource.types';

interface ResourceManagementProps {
  topicId: string;
  topicTitle: string;
  courseStatus: CourseStatus;
}

type SourceMode = 'EXTERNAL_URL' | 'UPLOAD';

interface ResourceFormState {
  title: string;
  description: string;
  mode: SourceMode;
  type: ResourceType;
  url: string;
  lessonId: string;
  file: File | null;
}

interface EditFormState {
  title: string;
  description: string;
  url: string;
}

const EMPTY_FORM: ResourceFormState = {
  title: '',
  description: '',
  mode: 'EXTERNAL_URL',
  type: 'LINK',
  url: '',
  lessonId: '',
  file: null,
};

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25';
const interactive =
  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_FILES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

function validateUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateFile(file: File | null): string | null {
  if (!file) return 'Choose a document to upload.';
  if (file.size > MAX_FILE_BYTES) return 'The file must not exceed 10 MiB (10 MB).';
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ALLOWED_FILES[extension]) {
    return 'Use a PDF, PPT, PPTX, DOC, or DOCX file.';
  }
  if (file.type && file.type !== ALLOWED_FILES[extension]) {
    return 'The selected file type does not match its file extension.';
  }
  return null;
}

function formatFileSize(size: number | null): string {
  if (size === null || !Number.isFinite(size)) return 'Size unavailable';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function resourceKindLabel(resource: Resource): string {
  if (resource.source === 'UPLOAD') return `${resource.fileFormat ?? 'Document'} upload`;
  if (resource.type === 'VIDEO') return resource.provider?.replace('_', ' ') ?? 'Video link';
  if (resource.type === 'DOCUMENT') return 'External document';
  return 'External link';
}

const ResourceManagement: React.FC<ResourceManagementProps> = ({
  topicId,
  topicTitle,
  courseStatus,
}) => {
  const { resources, setResources, isLoading, error, refetch } = useTopicResources(topicId);
  const canEdit = courseStatus === 'DRAFT';
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonLoadWarning, setLessonLoadWarning] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ResourceFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ title: '', description: '', url: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyResourceId, setBusyResourceId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingLifecycleAction, setPendingLifecycleAction] = useState<{ resource: Resource; action: 'archive' | 'restore' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeCount = useMemo(
    () => resources.filter((resource) => resource.status === 'ACTIVE').length,
    [resources],
  );
  const archivedCount = resources.length - activeCount;

  useEffect(() => {
    let active = true;
    getLessonsByTopic(topicId)
      .then((result) => {
        if (active) setLessons([...result].sort((a, b) => a.order - b.order));
      })
      .catch(() => {
        if (active) setLessonLoadWarning('Lessons could not be loaded. You can still create topic-level resources.');
      });
    return () => { active = false; };
  }, [topicId]);

  const clearMessages = () => {
    setFormError(null);
    setEditError(null);
    setActionError(null);
    setSuccessMessage(null);
  };

  const resetCreateForm = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || isSubmitting) return;

    const title = form.title.trim();
    const description = form.description.trim();
    if (title.length < 3 || title.length > 150) {
      setFormError('Title must be between 3 and 150 characters.');
      return;
    }
    if (description.length > 500) {
      setFormError('Description cannot exceed 500 characters.');
      return;
    }
    if (form.mode === 'EXTERNAL_URL' && !validateUrl(form.url)) {
      setFormError('Enter a valid HTTP or HTTPS URL.');
      return;
    }
    if (form.mode === 'UPLOAD') {
      const fileError = validateFile(form.file);
      if (fileError) {
        setFormError(fileError);
        return;
      }
    }

    const payload: CreateResourcePayload = form.mode === 'UPLOAD'
      ? {
          type: 'DOCUMENT',
          source: 'UPLOAD',
          title,
          ...(description ? { description } : {}),
          ...(form.lessonId ? { lessonId: form.lessonId } : {}),
        }
      : {
          type: form.type,
          source: 'EXTERNAL_URL',
          title,
          url: form.url.trim(),
          ...(description ? { description } : {}),
          ...(form.lessonId ? { lessonId: form.lessonId } : {}),
        };

    setIsSubmitting(true);
    clearMessages();
    try {
      const created = await createResource(topicId, payload, form.file ?? undefined);
      setResources((current) => [...current, created].sort((a, b) => a.order - b.order));
      resetCreateForm();
      setShowCreate(false);
      setSuccessMessage('Resource created successfully.');
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginEdit = (resource: Resource) => {
    if (!canEdit || resource.status !== 'ACTIVE') return;
    setEditingResource(resource);
    setEditForm({
      title: resource.title,
      description: resource.description ?? '',
      url: resource.url ?? '',
    });
    setEditError(null);
    clearMessages();
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingResource || !canEdit || isSubmitting) return;

    const title = editForm.title.trim();
    const description = editForm.description.trim();
    if (title.length < 3 || title.length > 150) {
      setEditError('Title must be between 3 and 150 characters.');
      return;
    }
    if (description.length > 500) {
      setEditError('Description cannot exceed 500 characters.');
      return;
    }
    if (editingResource.source === 'EXTERNAL_URL' && !validateUrl(editForm.url)) {
      setEditError('Enter a valid HTTP or HTTPS URL.');
      return;
    }

    const payload: UpdateResourcePayload = {
      title,
      description,
      ...(editingResource.source === 'EXTERNAL_URL' ? { url: editForm.url.trim() } : {}),
    };

    setIsSubmitting(true);
    setEditError(null);
    clearMessages();
    try {
      const updated = await updateResource(editingResource._id, payload);
      setResources((current) => current.map((resource) =>
        resource._id === updated._id ? updated : resource,
      ).sort((a, b) => a.order - b.order));
      setEditingResource(null);
      setSuccessMessage('Resource updated successfully.');
    } catch (err: unknown) {
      setEditError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveRestore = (resource: Resource) => {
    if (!canEdit || busyResourceId || isSubmitting) return;
    setPendingLifecycleAction({
      resource,
      action: resource.status === 'ACTIVE' ? 'archive' : 'restore',
    });
  };

  const confirmArchiveRestore = async () => {
    if (!pendingLifecycleAction || !canEdit || busyResourceId) return;
    const { resource, action } = pendingLifecycleAction;

    setBusyResourceId(resource._id);
    clearMessages();
    try {
      const updated = action === 'archive'
        ? await archiveResource(resource._id)
        : await restoreResource(resource._id);
      setResources((current) => current.map((item) =>
        item._id === updated._id ? updated : item,
      ).sort((a, b) => a.order - b.order));
      setSuccessMessage(action === 'archive' ? 'Resource archived.' : 'Resource restored.');
      setPendingLifecycleAction(null);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
      await refetch();
    } finally {
      setBusyResourceId(null);
    }
  };

  const moveResource = async (resource: Resource, direction: -1 | 1) => {
    if (!canEdit || busyResourceId || isSubmitting) return;
    const currentIndex = resources.findIndex((item) => item._id === resource._id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= resources.length) return;

    const reordered = [...resources];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setBusyResourceId(resource._id);
    clearMessages();
    try {
      // Send every resource ID, including archived resources: the backend validates
      // that the request is an exact permutation of the topic's full resource set.
      const saved = await reorderTopicResources(topicId, reordered.map((item) => item._id));
      setResources([...saved].sort((a, b) => a.order - b.order));
      setSuccessMessage('Resource order updated.');
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
      await refetch();
    } finally {
      setBusyResourceId(null);
    }
  };

  const handleOpenResource = async (resource: Resource) => {
    if (resource.status !== 'ACTIVE') return;
    if (resource.source === 'EXTERNAL_URL') {
      if (resource.url) window.open(resource.url, '_blank', 'noopener,noreferrer');
      return;
    }

    setBusyResourceId(resource._id);
    setActionError(null);
    try {
      const result = await getResourceDownloadUrl(resource._id);
      // The backend marks this URL as an attachment. Navigating to it initiates
      // the download without storing a short-lived signed URL in component state.
      window.location.assign(result.url);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyResourceId(null);
    }
  };

  const startCreate = () => {
    clearMessages();
    resetCreateForm();
    setEditingResource(null);
    setShowCreate(true);
  };

  const cancelCreate = () => {
    if (isSubmitting) return;
    setShowCreate(false);
    resetCreateForm();
  };

  const cancelEdit = () => {
    if (isSubmitting) return;
    setEditingResource(null);
    setEditError(null);
  };

  const resourceIcon = (resource: Resource) => {
    if (resource.type === 'VIDEO') return <Video className="h-5 w-5" aria-hidden="true" />;
    if (resource.source === 'UPLOAD' || resource.type === 'DOCUMENT') {
      return <FileText className="h-5 w-5" aria-hidden="true" />;
    }
    return <Link2 className="h-5 w-5" aria-hidden="true" />;
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border-muted bg-surface-elevated px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">Resource library</p>
            <h2 className="mt-1 break-words font-serif text-xl font-semibold text-text-primary">Supporting material</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Add videos, external documents, links, and private document uploads for “{topicTitle}”.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-semibold text-text-secondary">{activeCount} active</span>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-semibold text-text-tertiary">{archivedCount} archived</span>
            </div>
          </div>
          {canEdit && (
            <Button onClick={startCreate} disabled={showCreate || !!editingResource} className={interactive}>
              <Plus className="h-4 w-4" aria-hidden="true" />Add resource
            </Button>
          )}
        </div>

        {!canEdit && (
          <div className="flex items-start gap-2 border-b border-border-muted bg-surface px-5 py-3 text-sm text-text-secondary">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
            <p>This {courseStatus.toLowerCase()} course is read-only in the instructor workspace.</p>
          </div>
        )}

        {lessonLoadWarning && (
          <div className="border-b border-border-muted px-5 py-3 text-xs text-text-secondary" role="status">
            {lessonLoadWarning}
          </div>
        )}

        {successMessage && (
          <div role="status" className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-sage/25 bg-sage-soft px-3 py-2.5 text-sm text-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />{successMessage}
          </div>
        )}
        {actionError && (
          <div role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-error/20 bg-error-soft px-3 py-2.5 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{actionError}
          </div>
        )}

        {showCreate && canEdit && (
          <form onSubmit={handleCreate} className="m-4 space-y-4 rounded-xl border border-signal/25 bg-surface-elevated p-4 sm:m-5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-signal">New resource</p>
                <h3 className="mt-1 font-serif text-lg font-semibold text-text-primary">Add supporting material</h3>
              </div>
              <button type="button" onClick={cancelCreate} disabled={isSubmitting} aria-label="Close resource form" className={`rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary ${interactive}`}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setForm((current) => ({ ...current, mode: 'EXTERNAL_URL', type: current.type === 'DOCUMENT' && current.mode === 'UPLOAD' ? 'LINK' : current.type, file: null }))} aria-pressed={form.mode === 'EXTERNAL_URL'} className={`flex items-start gap-3 rounded-xl border p-3 text-left ${form.mode === 'EXTERNAL_URL' ? 'border-signal/40 bg-signal-soft' : 'border-border bg-surface'} ${interactive}`}>
                <span className="rounded-lg bg-surface p-2 text-signal"><Link2 className="h-4 w-4" aria-hidden="true" /></span>
                <span><span className="block text-sm font-semibold text-text-primary">External URL</span><span className="mt-1 block text-xs leading-relaxed text-text-secondary">Video, document, or useful link</span></span>
              </button>
              <button type="button" onClick={() => setForm((current) => ({ ...current, mode: 'UPLOAD', type: 'DOCUMENT', url: '', file: null }))} aria-pressed={form.mode === 'UPLOAD'} className={`flex items-start gap-3 rounded-xl border p-3 text-left ${form.mode === 'UPLOAD' ? 'border-signal/40 bg-signal-soft' : 'border-border bg-surface'} ${interactive}`}>
                <span className="rounded-lg bg-surface p-2 text-signal"><FileUp className="h-4 w-4" aria-hidden="true" /></span>
                <span><span className="block text-sm font-semibold text-text-primary">Upload document</span><span className="mt-1 block text-xs leading-relaxed text-text-secondary">PDF, PPT, PPTX, DOC, DOCX · up to 10 MiB</span></span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="resource-create-title" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Title <span className="text-error">*</span></label>
              <input id="resource-create-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} minLength={3} maxLength={150} required className={fieldClass} placeholder="e.g. Introduction to database normalization" />
              <p className="text-right text-xs text-text-tertiary">{form.title.length}/150</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="resource-create-description" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Description <span className="font-normal normal-case tracking-normal">(optional)</span></label>
              <textarea id="resource-create-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} maxLength={500} className={fieldClass} placeholder="What should the learner use this resource for?" />
              <p className="text-right text-xs text-text-tertiary">{form.description.length}/500</p>
            </div>

            {form.mode === 'EXTERNAL_URL' ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="resource-create-type" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Resource type</label>
                  <select id="resource-create-type" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ResourceType }))} className={fieldClass}>
                    <option value="VIDEO">Video</option><option value="DOCUMENT">Document</option><option value="LINK">Link</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="resource-create-url" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">URL <span className="text-error">*</span></label>
                  <input id="resource-create-url" type="url" inputMode="url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} required className={fieldClass} placeholder="https://..." />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="resource-create-file" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Document file <span className="text-error">*</span></label>
                <input
                  ref={fileInputRef}
                  id="resource-create-file"
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                  required
                  className={`${fieldClass} file:mr-3 file:rounded-lg file:border-0 file:bg-surface-disabled file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text-secondary`}
                />
                {form.file && <p className="text-xs text-text-secondary">{form.file.name} · {formatFileSize(form.file.size)}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="resource-create-lesson" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Attach to lesson <span className="font-normal normal-case tracking-normal">(optional)</span></label>
              <select id="resource-create-lesson" value={form.lessonId} onChange={(event) => setForm((current) => ({ ...current, lessonId: event.target.value }))} className={fieldClass}>
                <option value="">Topic-level resource (no specific lesson)</option>
                {lessons.map((lesson) => <option key={lesson._id} value={lesson._id}>{lesson.order}. {lesson.title}</option>)}
              </select>
              <p className="text-xs text-text-tertiary">Lesson association is set when creating the resource; it cannot be changed later.</p>
            </div>

            {formError && <div role="alert" className="rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error">{formError}</div>}
            <div className="flex flex-col-reverse gap-2 border-t border-border-muted pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={cancelCreate} disabled={isSubmitting} className={interactive}>Cancel</Button>
              <Button type="submit" loading={isSubmitting} className={interactive}><Plus className="h-4 w-4" aria-hidden="true" />Create resource</Button>
            </div>
          </form>
        )}

        {editingResource && canEdit && (
          <form onSubmit={handleUpdate} className="m-4 space-y-4 rounded-xl border border-signal/25 bg-surface-elevated p-4 sm:m-5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-signal">Edit resource</p><h3 className="mt-1 font-serif text-lg font-semibold text-text-primary">{editingResource.title}</h3></div>
              <button type="button" onClick={cancelEdit} disabled={isSubmitting} aria-label="Close edit form" className={`rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary ${interactive}`}><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="resource-edit-title" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Title <span className="text-error">*</span></label>
              <input id="resource-edit-title" value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} minLength={3} maxLength={150} required className={fieldClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="resource-edit-description" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Description (optional)</label>
              <textarea id="resource-edit-description" value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} className={fieldClass} />
            </div>
            {editingResource.source === 'EXTERNAL_URL' && (
              <div className="space-y-1.5">
                <label htmlFor="resource-edit-url" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">URL <span className="text-error">*</span></label>
                <input id="resource-edit-url" type="url" value={editForm.url} onChange={(event) => setEditForm((current) => ({ ...current, url: event.target.value }))} required className={fieldClass} />
              </div>
            )}
            {editingResource.source === 'UPLOAD' && <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary">Uploaded files cannot be replaced through the current API. Only the title and description can be edited.</p>}
            {editError && <div role="alert" className="rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error">{editError}</div>}
            <div className="flex flex-col-reverse gap-2 border-t border-border-muted pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={cancelEdit} disabled={isSubmitting} className={interactive}>Cancel</Button>
              <Button type="submit" loading={isSubmitting} className={interactive}><Save className="h-4 w-4" aria-hidden="true" />Save changes</Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-10" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin text-signal" aria-hidden="true" />
            <p className="text-sm text-text-secondary">Loading resources…</p>
          </div>
        ) : error ? (
          <div className="m-4 rounded-xl border border-error/20 bg-error-soft p-4 sm:m-5" role="alert">
            <div className="flex items-start gap-2 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>
            <Button variant="secondary" size="sm" onClick={() => void refetch()} className={`mt-3 ${interactive}`}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Try again</Button>
          </div>
        ) : resources.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-text-tertiary"><FileText className="h-5 w-5" aria-hidden="true" /></span>
            <h3 className="mt-4 font-serif text-lg font-semibold text-text-primary">No resources yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-text-secondary">Add a video, document, or link to give learners helpful material alongside this topic.</p>
            {canEdit && <Button onClick={startCreate} className={`mt-4 ${interactive}`}><Plus className="h-4 w-4" aria-hidden="true" />Add the first resource</Button>}
          </div>
        ) : (
          <div className="divide-y divide-border-muted">
            {resources.map((resource, index) => {
              const isBusy = busyResourceId === resource._id;
              const isArchived = resource.status === 'ARCHIVED';
              // const isEditingThis = editingResource?._id === resource._id;
              return (
                <article key={resource._id} className={`p-4 sm:p-5 ${isArchived ? 'bg-surface-elevated/60' : 'bg-surface'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isArchived ? 'border-border bg-surface text-text-tertiary' : 'border-signal/20 bg-signal-soft text-signal'}`}>
                      {resourceIcon(resource)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">Resource {String(resource.order).padStart(2, '0')}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isArchived ? 'bg-surface-disabled text-text-tertiary' : 'bg-sage-soft text-sage'}`}>{resource.status}</span>
                      </div>
                      <h3 className={`mt-1 break-words text-sm font-semibold ${isArchived ? 'text-text-secondary' : 'text-text-primary'}`}>{resource.title}</h3>
                      {resource.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">{resource.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                        <span>{resourceKindLabel(resource)}</span>
                        {resource.source === 'UPLOAD' && <span>{formatFileSize(resource.fileSize)}</span>}
                        {resource.lessonId && <span>Attached to a lesson</span>}
                        {resource.createdAt && <span>Added {formatDate(resource.createdAt)}</span>}
                      </div>
                      {resource.source === 'EXTERNAL_URL' && resource.url && (
                        <p className="mt-2 break-all text-xs text-text-tertiary">{resource.url}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 sm:pl-14">
                    {resource.status === 'ACTIVE' && (
                      <Button variant="secondary" size="sm" onClick={() => void handleOpenResource(resource)} disabled={!!busyResourceId} className={interactive}>
                        {isBusy && resource.source === 'UPLOAD' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : resource.source === 'UPLOAD' ? <Download className="h-3.5 w-3.5" aria-hidden="true" /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
                        {resource.source === 'UPLOAD' ? 'Download file' : 'Open link'}
                      </Button>
                    )}
                    {canEdit && !isArchived && (
                      <Button variant="secondary" size="sm" onClick={() => beginEdit(resource)} disabled={showCreate || !!editingResource || !!busyResourceId} className={interactive}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => void handleArchiveRestore(resource)} disabled={!!busyResourceId || isSubmitting} className={interactive}>
                          {isArchived ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> : <Archive className="h-3.5 w-3.5" aria-hidden="true" />}
                          {isArchived ? 'Restore' : 'Archive'}
                        </Button>
                        <div className="ml-auto flex items-center gap-1">
                          <button type="button" aria-label={`Move ${resource.title} up`} onClick={() => void moveResource(resource, -1)} disabled={index === 0 || !!busyResourceId || isSubmitting || showCreate || !!editingResource} className={`rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary ${interactive}`}>
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" aria-label={`Move ${resource.title} down`} onClick={() => void moveResource(resource, 1)} disabled={index === resources.length - 1 || !!busyResourceId || isSubmitting || showCreate || !!editingResource} className={`rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary ${interactive}`}>
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className="text-xs leading-relaxed text-text-tertiary">Resources are managed within this topic. Archived resources remain in the ordering list and can be restored; permanent deletion is not supported by the current API.</p>

      {pendingLifecycleAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px]" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busyResourceId) setPendingLifecycleAction(null);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-lifecycle-title"
            aria-describedby="resource-lifecycle-description"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/20"
          >
            <div className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${pendingLifecycleAction.action === 'archive' ? 'bg-signal-soft text-signal' : 'bg-sage-soft text-sage'}`}>
                {pendingLifecycleAction.action === 'archive'
                  ? <Archive className="h-5 w-5" aria-hidden="true" />
                  : <RotateCcw className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 id="resource-lifecycle-title" className="font-serif text-xl font-semibold text-text-primary">
                  {pendingLifecycleAction.action === 'archive' ? 'Move to archive?' : 'Restore to active resources?'}
                </h3>
                <p className="mt-1 break-words text-sm font-semibold text-text-secondary">{pendingLifecycleAction.resource.title}</p>
              </div>
              <button
                type="button"
                aria-label="Close confirmation dialog"
                disabled={!!busyResourceId}
                onClick={() => setPendingLifecycleAction(null)}
                className={`-mr-1 -mt-1 rounded-lg p-2 text-text-tertiary hover:bg-surface-elevated hover:text-text-primary ${interactive}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p id="resource-lifecycle-description" className="px-5 pb-5 pt-3 text-sm leading-relaxed text-text-secondary sm:px-6">
              {pendingLifecycleAction.action === 'archive'
                ? 'This item will be moved out of your active resources. It will remain saved in this topic, and you can restore it whenever it is needed again.'
                : 'This item will return to your active resources and be available for use and management again.'}
            </p>
            <div className="flex flex-col-reverse gap-2 border-t border-border-muted bg-surface-elevated/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="secondary" onClick={() => setPendingLifecycleAction(null)} disabled={!!busyResourceId} className={interactive}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void confirmArchiveRestore()} disabled={!!busyResourceId} loading={!!busyResourceId} className={interactive}>
                {pendingLifecycleAction.action === 'archive' ? <Archive className="h-4 w-4" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                {pendingLifecycleAction.action === 'archive' ? 'Archive' : 'Restore'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ResourceManagement;
