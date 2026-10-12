import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Layers,
  Plus,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { createTopic, reorderCourseTopics, updateTopic } from '../../api/topic.api';
import { useCourseTopics } from '../../hooks/useCourseTopics';
import type { CourseStatus } from '../../types/instructor.types';
import type { Topic, TopicPayload } from '../../types/topic.types';

interface TopicManagementProps {
  courseId: string;
  courseStatus: CourseStatus;
  selectedTopicId?: string | null;
  onManageLessons?: (topic: Topic) => void;
  onTopicUpdated?: (topic: Topic) => void;
}

interface TopicFormState {
  title: string;
  description: string;
  learningObjectives: string[];
}

const EMPTY_FORM: TopicFormState = {
  title: '',
  description: '',
  learningObjectives: [''],
};

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

const validateForm = (form: TopicFormState): string | null => {
  const title = form.title.trim();
  const description = form.description.trim();
  const objectives = form.learningObjectives.map((objective) => objective.trim());

  if (title.length < 4 || title.length > 100) {
    return 'Topic title must be between 4 and 100 characters.';
  }
  if (description.length > 500) {
    return 'Description cannot exceed 500 characters.';
  }
  if (objectives.length < 1 || objectives.length > 7) {
    return 'Add between 1 and 7 learning objectives.';
  }
  if (objectives.some((objective) => objective.length < 4 || objective.length > 300)) {
    return 'Each learning objective must be between 4 and 300 characters.';
  }
  return null;
};

const toPayload = (form: TopicFormState): TopicPayload => ({
  title: form.title.trim(),
  description: form.description.trim(),
  learningObjectives: form.learningObjectives.map((objective) => objective.trim()),
});

const TopicManagement: React.FC<TopicManagementProps> = ({
  courseId,
  courseStatus,
  selectedTopicId = null,
  onManageLessons,
  onTopicUpdated,
}) => {
  const { topics, setTopics, isLoading, error, refetch } = useCourseTopics(courseId);
  const isEditable = courseStatus === 'DRAFT';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [form, setForm] = useState<TopicFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reorderingTopicId, setReorderingTopicId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Bring the editor to the top of the viewport whenever Create/Edit opens.
  useEffect(() => {
    if (!isFormOpen) return;

    const frameId = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isFormOpen]);

  const openCreateForm = () => {
    setEditingTopicId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (topic: Topic) => {
    setEditingTopicId(topic._id);
    setForm({
      title: topic.title,
      description: topic.description ?? '',
      learningObjectives: topic.learningObjectives.length > 0
        ? [...topic.learningObjectives]
        : [''],
    });
    setFormError(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingTopicId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const updateObjective = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      learningObjectives: current.learningObjectives.map((objective, i) =>
        i === index ? value : objective,
      ),
    }));
  };

  const addObjective = () => {
    if (form.learningObjectives.length >= 7) return;
    setForm((current) => ({
      ...current,
      learningObjectives: [...current.learningObjectives, ''],
    }));
  };

  const removeObjective = (index: number) => {
    if (form.learningObjectives.length <= 1) return;
    setForm((current) => ({
      ...current,
      learningObjectives: current.learningObjectives.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditable) return;

    const validationError = validateForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setActionError(null);

    try {
      const payload = toPayload(form);

      if (editingTopicId) {
        const updatedTopic = await updateTopic(editingTopicId, payload);
        setTopics((current) => current
          .map((topic) => topic._id === updatedTopic._id ? updatedTopic : topic)
          .sort((a, b) => a.order - b.order));
        onTopicUpdated?.(updatedTopic);
      } else {
        const createdTopic = await createTopic(courseId, payload);
        setTopics((current) => [...current, createdTopic].sort((a, b) => a.order - b.order));
      }

      setIsFormOpen(false);
      setEditingTopicId(null);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!isEditable || reorderingTopicId || isFormOpen || isSaving) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= topics.length) return;

    const reordered = [...topics];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setReorderingTopicId(topics[index]._id);
    setActionError(null);

    try {
      const savedTopics = await reorderCourseTopics(
        courseId,
        reordered.map((topic) => topic._id),
      );
      setTopics([...savedTopics].sort((a, b) => a.order - b.order));
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    } finally {
      setReorderingTopicId(null);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="topic-management-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-signal">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 id="topic-management-heading" className="text-base font-semibold text-text-primary">
                Topics
              </h3>
              <p className="text-sm text-text-secondary">
                Organize this course into ordered learning stages.
              </p>
            </div>
          </div>
        </div>

        {isEditable && !isFormOpen && (
          <Button
            onClick={openCreateForm}
            size="sm"
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Topic
          </Button>
        )}
      </div>

      {!isEditable && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
          <p>
            {courseStatus === 'PUBLISHED'
              ? 'This course is published. Topic structure is shown in read-only mode.'
              : 'This course is archived. Its topic structure is read-only.'}
          </p>
        </div>
      )}

      {isFormOpen && isEditable && (
        <form
          ref={formRef}
          onSubmit={handleSave}
          className="scroll-mt-24 space-y-5 rounded-2xl border border-signal/25 bg-surface-elevated p-4 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-signal">
                {editingTopicId ? 'Edit topic' : 'New topic'}
              </p>
              <h4 className="text-lg font-semibold text-text-primary">
                {editingTopicId ? 'Update learning stage' : 'Define a learning stage'}
              </h4>
              <p className="text-sm text-text-secondary">
                Add a clear title and measurable objectives for this topic.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              aria-label="Close topic form"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/35 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:translate-y-0 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:shadow-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="topic-title" className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Topic title <span className="text-error">*</span>
            </label>
            <input
              id="topic-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={100}
              minLength={4}
              required
              placeholder="e.g. Introduction to Neural Networks"
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
            />
            <div className="flex justify-between gap-3 text-xs text-text-tertiary">
              <span>Use 4–100 characters.</span>
              <span>{form.title.length}/100</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="topic-description" className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Description <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="topic-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              maxLength={500}
              rows={3}
              placeholder="Briefly explain what this topic covers."
              className="w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
            />
            <div className="text-right text-xs text-text-tertiary">{form.description.length}/500</div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  Learning objectives <span className="text-error">*</span>
                </label>
                <p className="mt-1 text-xs text-text-tertiary">Add 1–7 objectives. Each must be 4–300 characters.</p>
              </div>
              <span className="text-xs text-text-tertiary">{form.learningObjectives.length}/7</span>
            </div>

            {form.learningObjectives.map((objective, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-disabled text-xs font-semibold text-text-secondary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    value={objective}
                    onChange={(event) => updateObjective(index, event.target.value)}
                    minLength={4}
                    maxLength={300}
                    required
                    aria-label={`Learning objective ${index + 1}`}
                    placeholder="e.g. Explain the role of activation functions"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
                  />
                  <div className="text-right text-xs text-text-tertiary">{objective.length}/300</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeObjective(index)}
                  disabled={form.learningObjectives.length <= 1 || isSaving}
                  aria-label={`Remove learning objective ${index + 1}`}
                  className="mt-1 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-error/35 hover:bg-error-soft hover:text-error hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:translate-y-0 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:shadow-none"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addObjective}
              disabled={form.learningObjectives.length >= 7 || isSaving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-signal transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/25 hover:bg-signal-soft hover:text-signal-hover hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:shadow-none"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add learning objective
            </button>
          </div>

          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-soft p-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{formError}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border-muted pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={closeForm}
              disabled={isSaving}
              className="cursor-pointer border-border hover:border-text-tertiary hover:bg-surface-elevated hover:shadow-sm active:scale-[0.98]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSaving}
              className="cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {editingTopicId ? 'Save Changes' : 'Create Topic'}
            </Button>
          </div>
        </form>
      )}

      {actionError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-soft p-3 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{actionError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading topics" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 h-3 w-20 rounded bg-surface-disabled" />
              <div className="mb-2 h-5 w-2/3 rounded bg-surface-disabled" />
              <div className="h-3 w-full max-w-lg rounded bg-surface-disabled" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error/20 bg-error-soft p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-text-primary">Unable to load topics</h4>
              <p className="text-sm text-text-secondary">{error}</p>
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void refetch()}
                  className="cursor-pointer border-error/30 hover:border-error/55 hover:bg-surface-elevated hover:shadow-sm active:scale-[0.98]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : topics.length === 0 && !isFormOpen ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-7 text-center sm:p-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-tertiary">
            <Layers className="h-6 w-6" aria-hidden="true" />
          </div>
          <h4 className="text-base font-semibold text-text-primary">No topics yet</h4>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Topics divide your course into clear learning stages. Start with the first major concept learners should understand.
          </p>
          {isEditable && !isFormOpen && (
            <div className="mt-5">
              <Button
                onClick={openCreateForm}
                className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create First Topic
              </Button>
            </div>
          )}
        </div>
      ) : topics.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
            <span>{topics.length} {topics.length === 1 ? 'topic' : 'topics'}</span>
            {isEditable && <span>Use arrows to change the learning order.</span>}
          </div>

          {topics.map((topic, index) => (
            <article
              key={topic._id}
              className="rounded-xl border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-sm font-semibold text-signal">
                  {String(topic.order).padStart(2, '0')}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <h4 className="break-words font-semibold text-text-primary">{topic.title}</h4>
                      {topic.description && (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
                          {topic.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                      {onManageLessons && (
                        <Button
                          size="sm"
                          variant={selectedTopicId === topic._id ? 'primary' : 'secondary'}
                          onClick={() => onManageLessons(topic)}
                          aria-pressed={selectedTopicId === topic._id}
                          className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                        >
                          <BookOpen className="h-4 w-4" aria-hidden="true" />
                          {selectedTopicId === topic._id ? 'Viewing Lessons' : 'Manage Lessons'}
                        </Button>
                      )}
                    {isEditable && (
                      <div className="flex shrink-0 items-center gap-1 self-start">
                        <button
                          type="button"
                          onClick={() => void handleMove(index, -1)}
                          disabled={index === 0 || reorderingTopicId !== null || isFormOpen || isSaving}
                          aria-label={`Move ${topic.title} up`}
                          title="Move topic up"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/45 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text-secondary disabled:hover:shadow-none"
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMove(index, 1)}
                          disabled={index === topics.length - 1 || reorderingTopicId !== null || isFormOpen || isSaving}
                          aria-label={`Move ${topic.title} down`}
                          title="Move topic down"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/45 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text-secondary disabled:hover:shadow-none"
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(topic)}
                          disabled={reorderingTopicId !== null || isSaving || isFormOpen}
                          aria-label={`Edit ${topic.title}`}
                          title="Edit topic"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/45 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text-disabled disabled:hover:shadow-none"
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border-muted pt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                      Learning objectives ({topic.learningObjectives.length})
                    </p>
                    <ul className="space-y-2">
                      {topic.learningObjectives.map((objective, objectiveIndex) => (
                        <li key={`${topic._id}-objective-${objectiveIndex}`} className="flex items-start gap-2 text-sm text-text-secondary">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              {reorderingTopicId === topic._id && (
                <p className="mt-3 text-xs text-text-tertiary" role="status">Saving topic order…</p>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default TopicManagement;
