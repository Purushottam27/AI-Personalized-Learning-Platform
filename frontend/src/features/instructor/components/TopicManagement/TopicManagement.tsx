import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Check, Edit3, Layers3, Plus, RefreshCw, Save, X, BookOpen } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { createTopic, reorderCourseTopics, updateTopic } from '../../api/topic.api';
import { useCourseTopics } from '../../hooks/useCourseTopics';
import type { CourseStatus } from '../../types/instructor.types';
import type { Topic, TopicPayload } from '../../types/topic.types';

interface TopicManagementProps {
  courseId: string;
  courseStatus: CourseStatus;
  onManageTopic?: (topic: Topic) => void;
}

interface TopicFormState {
  title: string;
  description: string;
  learningObjectives: string[];
}

const EMPTY_FORM: TopicFormState = { title: '', description: '', learningObjectives: [''] };
const interactive = 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Something went wrong. Please try again.';
}

function validateForm(form: TopicFormState): string | null {
  if (form.title.trim().length < 4 || form.title.trim().length > 100) return 'Topic title must be between 4 and 100 characters.';
  if (form.description.trim().length > 500) return 'Description cannot exceed 500 characters.';
  if (form.learningObjectives.length < 1 || form.learningObjectives.length > 7) return 'Add between 1 and 7 learning objectives.';
  if (form.learningObjectives.some((item) => item.trim().length < 4 || item.trim().length > 300)) return 'Each learning objective must be between 4 and 300 characters.';
  return null;
}

function toPayload(form: TopicFormState): TopicPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    learningObjectives: form.learningObjectives.map((item) => item.trim()),
  };
}

const TopicManagement: React.FC<TopicManagementProps> = ({ courseId, courseStatus, onManageTopic }) => {
  const { topics, setTopics, isLoading, error, refetch } = useCourseTopics(courseId);
  const isEditable = courseStatus === 'DRAFT';
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [form, setForm] = useState<TopicFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reorderingTopicId, setReorderingTopicId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!isFormOpen) return;
    const frame = window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
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
    setForm({ title: topic.title, description: topic.description ?? '', learningObjectives: topic.learningObjectives.length ? [...topic.learningObjectives] : [''] });
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

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditable) return;
    const validation = validateForm(form);
    if (validation) { setFormError(validation); return; }

    setIsSaving(true);
    setFormError(null);
    setActionError(null);
    try {
      const payload = toPayload(form);
      if (editingTopicId) {
        const updated = await updateTopic(editingTopicId, payload);
        setTopics((current) => current.map((topic) => topic._id === updated._id ? updated : topic).sort((a, b) => a.order - b.order));
      } else {
        const created = await createTopic(courseId, payload);
        setTopics((current) => [...current, created].sort((a, b) => a.order - b.order));
      }
      closeForm();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const moveTopic = async (index: number, direction: -1 | 1) => {
    if (!isEditable || isFormOpen || isSaving || reorderingTopicId) return;
    const target = index + direction;
    if (target < 0 || target >= topics.length) return;
    const reordered = [...topics];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setReorderingTopicId(topics[index]._id);
    setActionError(null);
    try {
      const saved = await reorderCourseTopics(courseId, reordered.map((topic) => topic._id));
      setTopics([...saved].sort((a, b) => a.order - b.order));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setReorderingTopicId(null);
    }
  };

  const updateObjective = (index: number, value: string) => setForm((current) => ({ ...current, learningObjectives: current.learningObjectives.map((item, i) => i === index ? value : item) }));

  return (
    <section className="space-y-4" aria-labelledby="course-topics-heading">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-signal"><Layers3 className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <h3 id="course-topics-heading" className="font-semibold text-text-primary">Topics</h3>
            <p className="mt-0.5 text-sm text-text-secondary">Build a clear sequence of learning stages.</p>
          </div>
        </div>
        {isEditable && !isFormOpen && <Button size="sm" onClick={openCreateForm} className={interactive}><Plus className="h-4 w-4" aria-hidden="true" />Add Topic</Button>}
      </div>

      {!isEditable && <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" /><p>{courseStatus === 'PUBLISHED' ? 'This course is published. Topic structure is read-only in this workspace.' : 'This course is archived. Its topic structure is read-only.'}</p></div>}

      {isFormOpen && isEditable && (
        <form ref={formRef} onSubmit={handleSave} className="scroll-mt-24 space-y-5 rounded-2xl border border-signal/30 bg-surface-elevated p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">{editingTopicId ? 'Edit topic' : 'New topic'}</p><h4 className="mt-1 font-serif text-xl font-semibold text-text-primary">{editingTopicId ? 'Refine this learning stage' : 'Define a learning stage'}</h4><p className="mt-1 text-sm text-text-secondary">Give this topic a clear purpose and measurable objectives.</p></div>
            <button type="button" onClick={closeForm} disabled={isSaving} aria-label="Close topic form" className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          <div className="space-y-1.5"><label htmlFor="topic-title" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Topic title <span className="text-error">*</span></label><input id="topic-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} minLength={4} maxLength={100} required placeholder="e.g. Introduction to Neural Networks" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><div className="flex justify-between text-xs text-text-tertiary"><span>4–100 characters</span><span>{form.title.length}/100</span></div></div>
          <div className="space-y-1.5"><label htmlFor="topic-description" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Description <span className="font-normal normal-case tracking-normal">(optional)</span></label><textarea id="topic-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} placeholder="Briefly explain what this topic covers." className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><p className="text-right text-xs text-text-tertiary">{form.description.length}/500</p></div>
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Learning objectives <span className="text-error">*</span></p><p className="mt-1 text-xs text-text-tertiary">Add 1–7 objectives, each 4–300 characters.</p></div><span className="text-xs text-text-tertiary">{form.learningObjectives.length}/7</span></div>
            {form.learningObjectives.map((objective, index) => <div key={index} className="flex items-start gap-2"><span className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-disabled text-xs font-semibold text-text-secondary">{index + 1}</span><input value={objective} onChange={(event) => updateObjective(index, event.target.value)} minLength={4} maxLength={300} required aria-label={`Learning objective ${index + 1}`} placeholder="e.g. Explain the purpose of an activation function" className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><button type="button" onClick={() => setForm((current) => ({ ...current, learningObjectives: current.learningObjectives.filter((_, i) => i !== index) }))} disabled={form.learningObjectives.length <= 1 || isSaving} aria-label={`Remove objective ${index + 1}`} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-error-soft hover:text-error ${interactive}`}><X className="h-4 w-4" aria-hidden="true" /></button></div>)}
            <button type="button" onClick={() => setForm((current) => ({ ...current, learningObjectives: [...current.learningObjectives, ''] }))} disabled={form.learningObjectives.length >= 7 || isSaving} className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-signal hover:bg-signal-soft ${interactive}`}><Plus className="h-4 w-4" aria-hidden="true" />Add learning objective</button>
          </div>
          {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}</div>}
          <div className="flex flex-col-reverse gap-2 border-t border-border-muted pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={closeForm} disabled={isSaving} className={interactive}>Cancel</Button><Button type="submit" loading={isSaving} className={interactive}><Save className="h-4 w-4" aria-hidden="true" />{editingTopicId ? 'Save Changes' : 'Create Topic'}</Button></div>
        </form>
      )}

      {actionError && <div role="alert" className="rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error">{actionError}</div>}

      {isLoading ? <div className="space-y-3" aria-label="Loading topics" aria-busy="true">{[0, 1, 2].map((item) => <div key={item} className="animate-pulse rounded-2xl border border-border bg-surface p-5"><div className="mb-3 h-4 w-24 rounded bg-surface-disabled" /><div className="mb-2 h-5 w-2/3 rounded bg-surface-disabled" /><div className="h-3 w-full rounded bg-surface-disabled" /></div>)}</div>
        : error ? <div className="rounded-2xl border border-error/20 bg-error-soft p-5"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" /><div className="flex-1"><h4 className="font-semibold text-text-primary">Unable to load topics</h4><p className="mt-1 text-sm text-text-secondary">{error}</p><Button variant="secondary" size="sm" onClick={() => void refetch()} className={`mt-3 ${interactive}`}><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</Button></div></div></div>
        : topics.length === 0 && !isFormOpen ? <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-signal"><Layers3 className="h-6 w-6" aria-hidden="true" /></div><h4 className="font-serif text-xl font-semibold text-text-primary">Start with your first topic</h4><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">Break the course into focused stages so learners can build understanding one concept at a time.</p>{isEditable && <Button onClick={openCreateForm} className={`mt-5 ${interactive}`}><Plus className="h-4 w-4" aria-hidden="true" />Create First Topic</Button>}</div>
        : topics.length > 0 ? <div className="space-y-3"><div className="flex items-center justify-between gap-3 px-1 text-xs text-text-tertiary"><span>{topics.length} {topics.length === 1 ? 'topic' : 'topics'}</span>{isEditable && <span>Use arrows to change the learning order.</span>}</div>{topics.map((topic, index) => <article key={topic._id} className="group rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:border-text-tertiary/60 hover:bg-surface-elevated hover:shadow-sm sm:p-5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-sm font-bold text-signal">{String(topic.order).padStart(2, '0')}</div><div className="min-w-0 flex-1"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h4 className="break-words font-semibold text-text-primary">{topic.title}</h4><p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-secondary">{topic.description || 'Add a short description to explain the focus of this topic.'}</p></div><div className="flex flex-wrap items-center gap-2 sm:justify-end">{onManageTopic && <Button size="sm" variant="secondary" onClick={() => onManageTopic(topic)} className={`${interactive} border-signal/25 hover:border-signal/50 hover:bg-signal-soft hover:text-signal`}><BookOpen className="h-4 w-4" aria-hidden="true" />Manage Topic</Button>}{isEditable && <div className="flex items-center gap-1"><button type="button" onClick={() => void moveTopic(index, -1)} disabled={index === 0 || reorderingTopicId !== null || isFormOpen || isSaving} aria-label={`Move ${topic.title} up`} title="Move topic up" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => void moveTopic(index, 1)} disabled={index === topics.length - 1 || reorderingTopicId !== null || isFormOpen || isSaving} aria-label={`Move ${topic.title} down`} title="Move topic down" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => openEditForm(topic)} disabled={reorderingTopicId !== null || isSaving || isFormOpen} aria-label={`Edit ${topic.title}`} title="Edit topic" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}><Edit3 className="h-4 w-4" aria-hidden="true" /></button></div>}</div></div><div className="mt-4 border-t border-border-muted pt-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Learning objectives · {topic.learningObjectives.length}</p><ul className="grid gap-2 sm:grid-cols-2">{topic.learningObjectives.slice(0, 4).map((objective, objectiveIndex) => <li key={`${topic._id}-${objectiveIndex}`} className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" /><span>{objective}</span></li>)}</ul>{topic.learningObjectives.length > 4 && <p className="mt-2 text-xs text-text-tertiary">+{topic.learningObjectives.length - 4} more objectives</p>}</div></div></div>{reorderingTopicId === topic._id && <p className="mt-3 text-xs text-text-secondary" role="status">Saving topic order…</p>}</article>)}</div> : null}
    </section>
  );
};

export default TopicManagement;
