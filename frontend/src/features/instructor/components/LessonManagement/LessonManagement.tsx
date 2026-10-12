import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Code2,
  FileText,
  Image as ImageIcon,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { createLesson, deleteLesson, reorderTopicLessons, updateLesson } from '../../api/lesson.api';
import { useTopicLessons } from '../../hooks/useTopicLessons';
import { isApiError } from '../../../../lib/axios';
import type { CourseStatus } from '../../types/instructor.types';
import type {
  Lesson,
  LessonCalloutVariant,
  LessonContentBlock,
  LessonHeadingLevel,
  LessonListStyle,
  LessonPayload,
} from '../../types/lesson.types';

interface LessonManagementProps {
  topicId: string;
  topicTitle: string;
  courseStatus: CourseStatus;
}

interface LessonFormState {
  title: string;
  description: string;
  content: LessonContentBlock[];
}

type NewBlockType = LessonContentBlock['type'];

const EMPTY_FORM: LessonFormState = {
  title: '',
  description: '',
  content: [{ type: 'TEXT', content: '' }],
};

const BLOCK_OPTIONS: Array<{ value: NewBlockType; label: string }> = [
  { value: 'TEXT', label: 'Text paragraph' },
  { value: 'HEADING', label: 'Heading' },
  { value: 'CODE', label: 'Code example' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'CALLOUT', label: 'Callout' },
  { value: 'LIST', label: 'Bulleted or numbered list' },
];

const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) return error.message;
  return 'Something went wrong. Please try again.';
};

const createBlock = (type: NewBlockType): LessonContentBlock => {
  switch (type) {
    case 'TEXT':
      return { type: 'TEXT', content: '' };
    case 'HEADING':
      return { type: 'HEADING', level: 2, content: '' };
    case 'CODE':
      return { type: 'CODE', language: 'javascript', content: '' };
    case 'IMAGE':
      return { type: 'IMAGE', url: '', alt: '' };
    case 'VIDEO':
      return { type: 'VIDEO', url: '', title: '' };
    case 'CALLOUT':
      return { type: 'CALLOUT', variant: 'INFO', content: '' };
    case 'LIST':
      return { type: 'LIST', style: 'BULLETED', items: [''] };
  }
};

const blockLabel = (block: LessonContentBlock): string => {
  switch (block.type) {
    case 'TEXT': return 'Text paragraph';
    case 'HEADING': return `Heading · H${block.level}`;
    case 'CODE': return 'Code example';
    case 'IMAGE': return 'Image';
    case 'VIDEO': return 'Video';
    case 'CALLOUT': return `Callout · ${block.variant.toLowerCase()}`;
    case 'LIST': return block.style === 'NUMBERED' ? 'Numbered list' : 'Bulleted list';
  }
};

const validateForm = (form: LessonFormState): string | null => {
  const title = form.title.trim();
  if (title.length < 4 || title.length > 150) {
    return 'Lesson title must be between 4 and 150 characters.';
  }
  if (form.description.trim().length > 500) {
    return 'Description cannot exceed 500 characters.';
  }
  if (form.content.length < 1 || form.content.length > 100) {
    return 'A lesson must contain between 1 and 100 content blocks.';
  }

  for (let index = 0; index < form.content.length; index += 1) {
    const block = form.content[index];
    const prefix = `Content block ${index + 1}: `;
    switch (block.type) {
      case 'TEXT':
        if (!block.content.trim() || block.content.length > 20000) return `${prefix}text is required (maximum 20,000 characters).`;
        break;
      case 'HEADING':
        if (!block.content.trim() || block.content.trim().length > 200) return `${prefix}heading is required (maximum 200 characters).`;
        break;
      case 'CODE':
        if (!block.language.trim() || block.language.trim().length > 50) return `${prefix}enter a language (maximum 50 characters).`;
        if (!block.content.trim() || block.content.length > 30000) return `${prefix}code is required (maximum 30,000 characters).`;
        break;
      case 'IMAGE': {
        try {
          const url = new URL(block.url);
          if (!['http:', 'https:'].includes(url.protocol)) return `${prefix}image URL must use HTTP or HTTPS.`;
        } catch {
          return `${prefix}enter a valid image URL.`;
        }
        if (!block.alt.trim() || block.alt.trim().length > 300) return `${prefix}alternative text is required (maximum 300 characters).`;
        break;
      }
      case 'VIDEO': {
        try {
          const url = new URL(block.url);
          if (!['http:', 'https:'].includes(url.protocol)) return `${prefix}video URL must use HTTP or HTTPS.`;
        } catch {
          return `${prefix}enter a valid video URL.`;
        }
        if (!block.title.trim() || block.title.trim().length > 200) return `${prefix}video title is required (maximum 200 characters).`;
        break;
      }
      case 'CALLOUT':
        if (!block.content.trim() || block.content.trim().length > 2000) return `${prefix}callout text is required (maximum 2,000 characters).`;
        break;
      case 'LIST':
        if (block.items.length < 1 || block.items.length > 50 || block.items.some((item) => !item.trim() || item.trim().length > 500)) {
          return `${prefix}add 1–50 non-empty list items, each up to 500 characters.`;
        }
        break;
    }
  }
  return null;
};

const toPayload = (form: LessonFormState): LessonPayload => ({
  title: form.title.trim(),
  description: form.description.trim(),
  // Explicitly construct server-supported fields; local editor metadata must never be sent.
  content: form.content.map((block) => {
    switch (block.type) {
      case 'TEXT': return { type: 'TEXT', content: block.content.trim() };
      case 'HEADING': return { type: 'HEADING', level: block.level, content: block.content.trim() };
      case 'CODE': return { type: 'CODE', language: block.language.trim(), content: block.content };
      case 'IMAGE': return { type: 'IMAGE', url: block.url.trim(), alt: block.alt.trim() };
      case 'VIDEO': return { type: 'VIDEO', url: block.url.trim(), title: block.title.trim() };
      case 'CALLOUT': return { type: 'CALLOUT', variant: block.variant, content: block.content.trim() };
      case 'LIST': return { type: 'LIST', style: block.style, items: block.items.map((item) => item.trim()) };
    }
  }),
});

const LessonManagement: React.FC<LessonManagementProps> = ({ topicId, topicTitle, courseStatus }) => {
  const { lessons, setLessons, isLoading, error, refetch } = useTopicLessons(topicId);
  const isEditable = courseStatus === 'DRAFT';
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reorderingLessonId, setReorderingLessonId] = useState<string | null>(null);
  const [newBlockType, setNewBlockType] = useState<NewBlockType>('TEXT');
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!isFormOpen) return;
    const frameId = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isFormOpen]);

  const openCreateForm = () => {
    setEditingLessonId(null);
    setForm({ ...EMPTY_FORM, content: [{ type: 'TEXT', content: '' }] });
    setFormError(null);
    setActionError(null);
    setNewBlockType('TEXT');
    setIsFormOpen(true);
  };

  const openEditForm = (lesson: Lesson) => {
    setEditingLessonId(lesson._id);
    setForm({
      title: lesson.title,
      description: lesson.description ?? '',
      content: lesson.content.map((block) => ({ ...block })) as LessonContentBlock[],
    });
    setFormError(null);
    setActionError(null);
    setNewBlockType('TEXT');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingLessonId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const updateContentBlock = (index: number, block: LessonContentBlock) => {
    setForm((current) => ({
      ...current,
      content: current.content.map((item, itemIndex) => itemIndex === index ? block : item),
    }));
  };

  const addContentBlock = () => {
    if (form.content.length >= 100) return;
    setForm((current) => ({ ...current, content: [...current.content, createBlock(newBlockType)] }));
  };

  const removeContentBlock = (index: number) => {
    if (form.content.length <= 1) {
      setFormError('A lesson must contain at least one content block.');
      return;
    }
    setForm((current) => ({ ...current, content: current.content.filter((_, i) => i !== index) }));
    setFormError(null);
  };

  const moveContentBlock = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= form.content.length) return;
    setForm((current) => {
      const content = [...current.content];
      [content[index], content[targetIndex]] = [content[targetIndex], content[index]];
      return { ...current, content };
    });
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
      if (editingLessonId) {
        const updated = await updateLesson(editingLessonId, payload);
        setLessons((current) => current.map((lesson) => lesson._id === updated._id ? updated : lesson).sort((a, b) => a.order - b.order));
      } else {
        const created = await createLesson(topicId, payload);
        setLessons((current) => [...current, created].sort((a, b) => a.order - b.order));
      }
      setIsFormOpen(false);
      setEditingLessonId(null);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!isEditable || isFormOpen || isSaving || reorderingLessonId) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    const reordered = [...lessons];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setReorderingLessonId(lessons[index]._id);
    setActionError(null);
    try {
      const saved = await reorderTopicLessons(topicId, reordered.map((lesson) => lesson._id));
      setLessons([...saved].sort((a, b) => a.order - b.order));
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    } finally {
      setReorderingLessonId(null);
    }
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!isEditable || isSaving || reorderingLessonId) return;
    const confirmed = window.confirm(`Delete “${lesson.title}”? This action cannot be undone.`);
    if (!confirmed) return;
    setActionError(null);
    try {
      await deleteLesson(lesson._id);
      await refetch();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    }
  };

  const renderBlockFields = (block: LessonContentBlock, index: number) => {
    switch (block.type) {
      case 'TEXT':
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary" htmlFor={`lesson-block-${index}-text`}>Paragraph text</label>
            <textarea id={`lesson-block-${index}-text`} value={block.content} maxLength={20000} rows={5} onChange={(event) => updateContentBlock(index, { ...block, content: event.target.value })} placeholder="Explain the concept in a clear, learner-friendly way." className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" />
            <p className="text-right text-xs text-text-tertiary">{block.content.length}/20,000</p>
          </div>
        );
      case 'HEADING':
        return (
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-level`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Level</label><select id={`lesson-block-${index}-level`} value={block.level} onChange={(event) => updateContentBlock(index, { ...block, level: Number(event.target.value) as LessonHeadingLevel })} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"><option value={2}>Heading 2</option><option value={3}>Heading 3</option></select></div>
            <div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-heading`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Heading text</label><input id={`lesson-block-${index}-heading`} value={block.content} maxLength={200} onChange={(event) => updateContentBlock(index, { ...block, content: event.target.value })} placeholder="Enter a section heading" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /></div>
          </div>
        );
      case 'CODE':
        return (
          <div className="space-y-3"><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-language`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Language</label><input id={`lesson-block-${index}-language`} value={block.language} maxLength={50} onChange={(event) => updateContentBlock(index, { ...block, language: event.target.value })} placeholder="javascript, python, bash…" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /></div><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-code`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Code</label><textarea id={`lesson-block-${index}-code`} value={block.content} maxLength={30000} rows={7} spellCheck={false} onChange={(event) => updateContentBlock(index, { ...block, content: event.target.value })} placeholder={'const greeting = "Hello, learner!";'} className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><p className="text-right text-xs text-text-tertiary">{block.content.length}/30,000</p></div></div>
        );
      case 'IMAGE':
        return (
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-image-url`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Image URL</label><input id={`lesson-block-${index}-image-url`} type="url" value={block.url} onChange={(event) => updateContentBlock(index, { ...block, url: event.target.value })} placeholder="https://example.com/image.png" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /></div><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-image-alt`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Alternative text</label><input id={`lesson-block-${index}-image-alt`} value={block.alt} maxLength={300} onChange={(event) => updateContentBlock(index, { ...block, alt: event.target.value })} placeholder="Describe the image for accessibility" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /></div></div>
        );
      case 'VIDEO':
        return (
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-video-title`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Video title</label><input id={`lesson-block-${index}-video-title`} value={block.title} maxLength={200} onChange={(event) => updateContentBlock(index, { ...block, title: event.target.value })} placeholder="e.g. Visualizing gradient descent" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /></div><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-video-url`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Video URL</label><input id={`lesson-block-${index}-video-url`} type="url" value={block.url} onChange={(event) => updateContentBlock(index, { ...block, url: event.target.value })} placeholder="https://…" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /></div></div>
        );
      case 'CALLOUT':
        return (
          <div className="space-y-3"><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-callout-variant`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Callout style</label><select id={`lesson-block-${index}-callout-variant`} value={block.variant} onChange={(event) => updateContentBlock(index, { ...block, variant: event.target.value as LessonCalloutVariant })} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25">{(['INFO', 'TIP', 'WARNING', 'IMPORTANT'] as const).map((variant) => <option key={variant} value={variant}>{variant.charAt(0) + variant.slice(1).toLowerCase()}</option>)}</select></div><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-callout-content`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Callout text</label><textarea id={`lesson-block-${index}-callout-content`} value={block.content} maxLength={2000} rows={3} onChange={(event) => updateContentBlock(index, { ...block, content: event.target.value })} placeholder="Highlight a key idea, warning, or useful tip." className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /></div></div>
        );
      case 'LIST':
        return (
          <div className="space-y-3"><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-list-style`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">List style</label><select id={`lesson-block-${index}-list-style`} value={block.style} onChange={(event) => updateContentBlock(index, { ...block, style: event.target.value as LessonListStyle })} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"><option value="BULLETED">Bulleted</option><option value="NUMBERED">Numbered</option></select></div><div className="space-y-1.5"><label htmlFor={`lesson-block-${index}-list-items`} className="text-xs font-semibold uppercase tracking-widest text-text-secondary">List items</label><textarea id={`lesson-block-${index}-list-items`} value={block.items.join('\n')} rows={4} onChange={(event) => updateContentBlock(index, { ...block, items: event.target.value.split('\n') })} placeholder={'First item\nSecond item\nThird item'} className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><p className="text-xs text-text-tertiary">One item per line. Add between 1 and 50 items.</p></div></div>
        );
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="lesson-management-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sage/25 bg-sage-soft text-sage"><BookOpen className="h-4 w-4" aria-hidden="true" /></div>
          <div className="space-y-1"><h3 id="lesson-management-heading" className="text-base font-semibold text-text-primary">Lessons</h3><p className="text-sm text-text-secondary">Build the learning content inside <span className="font-medium text-text-primary">{topicTitle}</span>.</p></div>
        </div>
        {isEditable && !isFormOpen && <Button size="sm" onClick={openCreateForm} className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"><Plus className="h-4 w-4" aria-hidden="true" />Add Lesson</Button>}
      </div>

      {!isEditable && <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" /><p>{courseStatus === 'PUBLISHED' ? 'This course is published. Lessons are shown in read-only mode in this workspace.' : 'This course is archived. Its lessons are read-only.'}</p></div>}

      {isFormOpen && isEditable && <form ref={formRef} onSubmit={handleSave} className="scroll-mt-24 space-y-5 rounded-2xl border border-signal/25 bg-surface-elevated p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-widest text-signal">{editingLessonId ? 'Edit lesson' : 'New lesson'}</p><h4 className="text-lg font-semibold text-text-primary">{editingLessonId ? 'Update learning content' : 'Create a focused learning segment'}</h4><p className="text-sm text-text-secondary">Lessons belong to this topic. Add content blocks in the order learners should study them.</p></div><button type="button" onClick={closeForm} disabled={isSaving} aria-label="Close lesson form" className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/35 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><X className="h-4 w-4" aria-hidden="true" /></button></div>

        <div className="space-y-1.5"><label htmlFor="lesson-title" className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Lesson title <span className="text-error">*</span></label><input id="lesson-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} minLength={4} maxLength={150} required placeholder="e.g. How a Perceptron Makes a Prediction" className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><div className="flex justify-between gap-3 text-xs text-text-tertiary"><span>Use 4–150 characters.</span><span>{form.title.length}/150</span></div></div>

        <div className="space-y-1.5"><label htmlFor="lesson-description" className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Description <span className="font-normal normal-case tracking-normal">(optional)</span></label><textarea id="lesson-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} placeholder="Summarize what the learner will understand after this lesson." className="w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><p className="text-right text-xs text-text-tertiary">{form.description.length}/500</p></div>

        <div className="space-y-3"><div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h5 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Lesson content <span className="text-error">*</span></h5><p className="mt-1 text-xs text-text-tertiary">At least one block is required. Reorder blocks to control the reading sequence.</p></div><span className="text-xs text-text-tertiary">{form.content.length}/100 blocks</span></div>
          {form.content.map((block, index) => <article key={`${block.type}-${index}`} className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border-muted pb-3"><div className="flex min-w-0 items-center gap-2"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-disabled text-text-secondary">{block.type === 'CODE' ? <Code2 className="h-4 w-4" /> : block.type === 'IMAGE' ? <ImageIcon className="h-4 w-4" /> : block.type === 'VIDEO' ? <Video className="h-4 w-4" /> : block.type === 'LIST' ? <List className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><div><p className="text-xs font-semibold uppercase tracking-wider text-text-primary">Block {index + 1}</p><p className="text-xs text-text-secondary">{blockLabel(block)}</p></div></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => moveContentBlock(index, -1)} disabled={index === 0 || isSaving} aria-label={`Move content block ${index + 1} up`} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all hover:border-signal/45 hover:bg-signal-soft hover:text-signal active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => moveContentBlock(index, 1)} disabled={index === form.content.length - 1 || isSaving} aria-label={`Move content block ${index + 1} down`} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all hover:border-signal/45 hover:bg-signal-soft hover:text-signal active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => removeContentBlock(index)} disabled={form.content.length <= 1 || isSaving} aria-label={`Remove content block ${index + 1}`} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all hover:border-error/40 hover:bg-error-soft hover:text-error active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div></div>
            {renderBlockFields(block, index)}
          </article>)}
          <div className="flex flex-col gap-2 sm:flex-row"><select aria-label="Content block type" value={newBlockType} onChange={(event) => setNewBlockType(event.target.value as NewBlockType)} className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25">{BLOCK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><Button type="button" variant="secondary" onClick={addContentBlock} disabled={form.content.length >= 100 || isSaving} className="cursor-pointer hover:border-signal/40 hover:bg-signal-soft hover:text-signal active:scale-[0.98] disabled:cursor-not-allowed"><Plus className="h-4 w-4" aria-hidden="true" />Add content block</Button></div>
        </div>

        {formError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-soft p-3 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{formError}</p></div>}
        <div className="flex flex-col-reverse gap-2 border-t border-border-muted pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={closeForm} disabled={isSaving} className="cursor-pointer hover:border-text-tertiary hover:bg-surface-elevated hover:shadow-sm active:scale-[0.98]">Cancel</Button><Button type="submit" loading={isSaving} className="cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"><Save className="h-4 w-4" aria-hidden="true" />{editingLessonId ? 'Save Changes' : 'Create Lesson'}</Button></div>
      </form>}

      {actionError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-soft p-3 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{actionError}</p></div>}

      {isLoading ? <div className="space-y-3" aria-label="Loading lessons" aria-busy="true">{[0, 1].map((item) => <div key={item} className="animate-pulse rounded-xl border border-border bg-surface p-5"><div className="mb-3 h-3 w-20 rounded bg-surface-disabled" /><div className="mb-2 h-5 w-2/3 rounded bg-surface-disabled" /><div className="h-3 w-full max-w-lg rounded bg-surface-disabled" /></div>)}</div> : error ? <div className="rounded-2xl border border-error/20 bg-error-soft p-5"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" /><div className="flex-1 space-y-1"><h4 className="font-semibold text-text-primary">Unable to load lessons</h4><p className="text-sm text-text-secondary">{error}</p><div className="pt-2"><Button variant="secondary" size="sm" onClick={() => void refetch()} className="cursor-pointer border-error/30 hover:border-error/55 hover:bg-surface-elevated hover:shadow-sm active:scale-[0.98]"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</Button></div></div></div></div> : lessons.length === 0 && !isFormOpen ? <div className="rounded-2xl border border-dashed border-border bg-surface p-7 text-center sm:p-10"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-tertiary"><BookOpen className="h-6 w-6" aria-hidden="true" /></div><h4 className="text-base font-semibold text-text-primary">No lessons in this topic yet</h4><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">Create a focused learning segment and add text, headings, code examples, images, videos, callouts, or lists.</p>{isEditable && <div className="mt-5"><Button onClick={openCreateForm} className="cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"><Plus className="h-4 w-4" aria-hidden="true" />Create First Lesson</Button></div>}</div> : lessons.length > 0 ? <div className="space-y-3"><div className="flex items-center justify-between gap-3 text-xs text-text-tertiary"><span>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</span>{isEditable && lessons.length > 1 && <span>Use arrows to change the learning order.</span>}</div>{lessons.map((lesson, index) => <article key={lesson._id} className="rounded-xl border border-border bg-surface p-4 sm:p-5"><div className="flex items-start gap-3 sm:gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sage/25 bg-sage-soft text-sm font-semibold text-sage">{String(lesson.order).padStart(2, '0')}</div><div className="min-w-0 flex-1 space-y-2"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 space-y-1"><h4 className="break-words font-semibold text-text-primary">{lesson.title}</h4>{lesson.description && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">{lesson.description}</p>}</div>{isEditable && <div className="flex shrink-0 items-center gap-1 self-start"><button type="button" onClick={() => void handleMove(index, -1)} disabled={index === 0 || reorderingLessonId !== null || isFormOpen || isSaving} aria-label={`Move ${lesson.title} up`} title="Move lesson up" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/45 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => void handleMove(index, 1)} disabled={index === lessons.length - 1 || reorderingLessonId !== null || isFormOpen || isSaving} aria-label={`Move ${lesson.title} down`} title="Move lesson down" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/45 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => openEditForm(lesson)} disabled={reorderingLessonId !== null || isSaving || isFormOpen} aria-label={`Edit ${lesson.title}`} title="Edit lesson" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/45 hover:bg-signal-soft hover:text-signal hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><Pencil className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => void handleDelete(lesson)} disabled={reorderingLessonId !== null || isSaving || isFormOpen} aria-label={`Delete ${lesson.title}`} title="Delete lesson" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-error/40 hover:bg-error-soft hover:text-error hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:text-text-disabled"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div>}</div><div className="flex flex-wrap items-center gap-2 border-t border-border-muted pt-3"><span className="rounded-full border border-border-muted bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary">{lesson.content.length} {lesson.content.length === 1 ? 'content block' : 'content blocks'}</span>{lesson.content.slice(0, 4).map((block, blockIndex) => <span key={`${lesson._id}-block-${blockIndex}`} className="rounded-full bg-surface-disabled px-2.5 py-1 text-xs text-text-tertiary">{blockLabel(block)}</span>)}{lesson.content.length > 4 && <span className="text-xs text-text-tertiary">+{lesson.content.length - 4} more</span>}</div></div></div>{reorderingLessonId === lesson._id && <p className="mt-3 text-xs text-text-tertiary" role="status">Saving lesson order…</p>}</article>)}</div> : null}
    </section>
  );
};

export default LessonManagement;
