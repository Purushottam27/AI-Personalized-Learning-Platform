import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardCheck,
  Database,
  FileText,
  Layers3,
  Loader2,
  Paperclip,
  Plus,
  Save,
  X,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { getTopicById, updateTopic } from '../api/topic.api';
import { useCourse } from '../hooks/useCourse';
import { isApiError } from '../../../lib/axios';
import LessonManagement from '../components/LessonManagement/LessonManagement';
import ResourceManagement from '../components/ResourceManagement/ResourceManagement';
import QuestionBankManagement from '../components/QuestionBankManagement/QuestionBankManagement';
import { PracticeManagement } from '../components/PracticeManagement/PracticeManagement';
import { AssessmentManagement } from '../components/AssessmentManagement/AssessmentManagement';
import type { Topic, TopicPayload } from '../types/topic.types';

 type TopicSection = 'LESSONS' | 'RESOURCES' | 'QUESTION_BANK' | 'PRACTICE' | 'ASSESSMENT';

const SECTION_ITEMS: Array<{ id: TopicSection; label: string; Icon: React.ElementType; description: string }> = [
  { id: 'LESSONS', label: 'Lessons', Icon: BookOpen, description: 'Build the teaching content learners will study.' },
  { id: 'RESOURCES', label: 'Resources', Icon: Paperclip, description: 'Supporting material linked to this topic.' },
  { id: 'QUESTION_BANK', label: 'Question Bank', Icon: Database, description: 'Build and manage the pool of questions for practice and assessments.' },
  { id: 'PRACTICE', label: 'Practice', Icon: Layers3, description: 'Short activities to reinforce understanding.' },
  { id: 'ASSESSMENT', label: 'Assessment', Icon: ClipboardCheck, description: 'Evaluate understanding and learning outcomes.' },
];

interface TopicFormState {
  title: string;
  description: string;
  learningObjectives: string[];
}

const interactive = 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Something went wrong. Please try again.';
}

function validateTopicForm(form: TopicFormState): string | null {
  if (form.title.trim().length < 4 || form.title.trim().length > 100) return 'Topic title must be between 4 and 100 characters.';
  if (form.description.trim().length > 500) return 'Description cannot exceed 500 characters.';
  if (form.learningObjectives.length < 1 || form.learningObjectives.length > 7) return 'Add between 1 and 7 learning objectives.';
  if (form.learningObjectives.some((objective) => objective.trim().length < 4 || objective.trim().length > 300)) return 'Each learning objective must be between 4 and 300 characters.';
  return null;
}

function topicToForm(topic: Topic): TopicFormState {
  return { title: topic.title, description: topic.description ?? '', learningObjectives: topic.learningObjectives.length ? [...topic.learningObjectives] : [''] };
}

const ComingSoonPanel: React.FC<{ section: TopicSection; onGoToLessons: () => void }> = ({ section, onGoToLessons }) => {
  const details = {
    RESOURCES: {
      eyebrow: 'Next in the topic workspace',
      title: 'Bring the lesson together with resources',
      description: 'Videos, documents, and useful links will live here, attached to this topic or to an individual lesson. Resource management is not connected to this page yet.',
      Icon: Paperclip,
    },
    PRACTICE: {
      eyebrow: 'Planned learning activity',
      title: 'Practice will help learners apply the concept',
      description: 'Practice creation will become available when its API and question-selection rules are implemented. No practice activity has been created yet.',
      Icon: Layers3,
    },
    ASSESSMENT: {
      eyebrow: 'Planned evaluation',
      title: 'Assess understanding when the module is ready',
      description: 'Assessment authoring is not available yet. This section will connect to the formal assessment module when its API and scoring rules are implemented.',
      Icon: ClipboardCheck,
    },
    LESSONS: {
      eyebrow: '', title: '', description: '', Icon: BookOpen,
    },
    QUESTION_BANK: {
      eyebrow: '', title: '', description: '', Icon: Database,
    },
  }[section];
  const Icon = details.Icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border-muted bg-surface-elevated px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary"><Icon className="h-5 w-5" aria-hidden="true" /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">{details.eyebrow}</p><h2 className="mt-1 font-serif text-xl font-semibold text-text-primary">{details.title}</h2></div>
        </div>
      </div>
      <div className="px-5 py-6 sm:px-7 sm:py-8">
        <p className="max-w-2xl text-sm leading-7 text-text-secondary">{details.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />Not available yet</span><Button variant="secondary" size="sm" onClick={onGoToLessons} className={interactive}><BookOpen className="h-4 w-4" aria-hidden="true" />Return to Lessons</Button></div>
      </div>
    </motion.div>
  );
};

export const TopicWorkspacePage: React.FC = () => {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();
  const { course, isLoading: isCourseLoading, error: courseError } = useCourse(courseId);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isTopicLoading, setIsTopicLoading] = useState(true);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<TopicSection>('LESSONS');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<TopicFormState>({ title: '', description: '', learningObjectives: [''] });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const canEdit = course?.status === 'DRAFT';

  useEffect(() => {
    if (!topicId) {
      setTopic(null);
      setTopicError('This topic link is incomplete. Return to the course and select a topic again.');
      setIsTopicLoading(false);
      return;
    }

    let active = true;
    setIsTopicLoading(true);
    setTopicError(null);
    setTopic(null);
    setIsEditing(false);
    setActiveSection('LESSONS');

    getTopicById(topicId)
      .then((result) => {
        if (!active) return;
        if (courseId && result.courseId !== courseId) {
          setTopicError('This topic does not belong to the selected course.');
          setTopic(null);
          return;
        }
        setTopic(result);
        setForm(topicToForm(result));
      })
      .catch((error: unknown) => {
        if (active) setTopicError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsTopicLoading(false);
      });

    return () => { active = false; };
  }, [courseId, topicId]);

  useEffect(() => {
    if (!isEditing) return;
    const frame = window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  const openEdit = () => {
    if (!topic || !canEdit) return;
    setForm(topicToForm(topic));
    setFormError(null);
    setActionMessage(null);
    setIsEditing(true);
  };

  const closeEdit = () => {
    if (isSaving || !topic) return;
    setForm(topicToForm(topic));
    setFormError(null);
    setIsEditing(false);
  };

  const handleSaveTopic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!topic || !canEdit) return;
    const validation = validateTopicForm(form);
    if (validation) { setFormError(validation); return; }

    setIsSaving(true);
    setFormError(null);
    setActionMessage(null);
    try {
      const payload: TopicPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        learningObjectives: form.learningObjectives.map((objective) => objective.trim()),
      };
      const updated = await updateTopic(topic._id, payload);
      setTopic(updated);
      setForm(topicToForm(updated));
      setIsEditing(false);
      setActionMessage('Topic details saved.');
    } catch (error: unknown) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const updateObjective = (index: number, value: string) => setForm((current) => ({ ...current, learningObjectives: current.learningObjectives.map((objective, i) => i === index ? value : objective) }));
  const goToCourse = () => navigate(`/instructor/courses/${courseId}`);

  if (isCourseLoading || isTopicLoading) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" aria-live="polite"><Loader2 className="h-8 w-8 animate-spin text-signal" aria-hidden="true" /><p className="text-sm text-text-secondary">Opening topic workspace…</p></div>;
  }

  if (courseError || !course || topicError || !topic) {
    const message = courseError ?? topicError ?? 'This topic could not be loaded.';
    return <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-error/20 bg-error-soft text-error"><AlertCircle className="h-6 w-6" aria-hidden="true" /></div><h1 className="font-serif text-2xl font-semibold text-text-primary">Unable to open this topic</h1><p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{message}</p><Button variant="secondary" onClick={goToCourse} className={`mt-6 ${interactive}`}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Course Workspace</Button></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-14">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }} className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-text-secondary"><button type="button" onClick={() => navigate('/instructor/courses')} className="cursor-pointer rounded-md px-1 py-1 hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">My Courses</button><span className="text-text-tertiary">/</span><button type="button" onClick={goToCourse} className="max-w-[min(45vw,320px)] cursor-pointer truncate rounded-md px-1 py-1 hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{course.title}</button><span className="text-text-tertiary">/</span><span className="max-w-[min(35vw,260px)] truncate font-semibold text-text-primary">{topic.title}</span></div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Topic Workspace · Topic {String(topic.order).padStart(2, '0')}</p><h1 className="break-words font-serif text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">{topic.title}</h1><p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{topic.description || 'This topic does not have a description yet.'}</p></div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">{canEdit ? <Button variant="secondary" onClick={openEdit} className={`${interactive} border-signal/25 hover:border-signal/50 hover:bg-signal-soft hover:text-signal`}><FileText className="h-4 w-4" aria-hidden="true" />Edit Topic</Button> : <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-disabled px-3 py-2 text-xs font-semibold text-text-secondary">{course.status === 'PUBLISHED' ? 'Published · Read only' : 'Archived · Read only'}</span>}</div>
        </div>
      </motion.header>

      {isEditing && canEdit && (
        <form ref={editFormRef} onSubmit={handleSaveTopic} className="scroll-mt-24 space-y-5 rounded-2xl border border-signal/30 bg-surface-elevated p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">Topic details</p><h2 className="mt-1 font-serif text-xl font-semibold text-text-primary">Edit topic information</h2><p className="mt-1 text-sm text-text-secondary">These details describe the learning stage, not an individual lesson.</p></div><button type="button" onClick={closeEdit} disabled={isSaving} aria-label="Close topic editor" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}><X className="h-4 w-4" aria-hidden="true" /></button></div>
          <div className="space-y-1.5"><label htmlFor="topic-workspace-title" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Topic title <span className="text-error">*</span></label><input id="topic-workspace-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} minLength={4} maxLength={100} required className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><div className="flex justify-between text-xs text-text-tertiary"><span>4–100 characters</span><span>{form.title.length}/100</span></div></div>
          <div className="space-y-1.5"><label htmlFor="topic-workspace-description" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Description <span className="font-normal normal-case tracking-normal">(optional)</span></label><textarea id="topic-workspace-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text-primary outline-none hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><p className="text-right text-xs text-text-tertiary">{form.description.length}/500</p></div>
          <div className="space-y-3"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Learning objectives <span className="text-error">*</span></p><p className="mt-1 text-xs text-text-tertiary">Add 1–7 objectives, each 4–300 characters.</p></div><span className="text-xs text-text-tertiary">{form.learningObjectives.length}/7</span></div>{form.learningObjectives.map((objective, index) => <div key={index} className="flex items-start gap-2"><span className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-disabled text-xs font-semibold text-text-secondary">{index + 1}</span><input value={objective} onChange={(event) => updateObjective(index, event.target.value)} minLength={4} maxLength={300} required aria-label={`Learning objective ${index + 1}`} placeholder="Describe what a learner will be able to do" className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25" /><button type="button" onClick={() => setForm((current) => ({ ...current, learningObjectives: current.learningObjectives.filter((_, i) => i !== index) }))} disabled={form.learningObjectives.length <= 1 || isSaving} aria-label={`Remove learning objective ${index + 1}`} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-error-soft hover:text-error ${interactive}`}><X className="h-4 w-4" aria-hidden="true" /></button></div>)}<button type="button" onClick={() => setForm((current) => ({ ...current, learningObjectives: [...current.learningObjectives, ''] }))} disabled={form.learningObjectives.length >= 7 || isSaving} className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-signal hover:bg-signal-soft ${interactive}`}><Plus className="h-4 w-4" aria-hidden="true" />Add objective</button></div>
          {formError && <div role="alert" className="rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error">{formError}</div>}
          <div className="flex flex-col-reverse gap-2 border-t border-border-muted pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={closeEdit} disabled={isSaving} className={interactive}>Cancel</Button><Button type="submit" loading={isSaving} className={interactive}><Save className="h-4 w-4" aria-hidden="true" />Save Topic Details</Button></div>
        </form>
      )}

      {!isEditing && actionMessage && <div role="status" className="flex items-center gap-2 rounded-xl border border-sage/25 bg-sage-soft px-4 py-3 text-sm text-sage"><Check className="h-4 w-4" aria-hidden="true" />{actionMessage}</div>}
      {!canEdit && <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" /><p>This course is {course.status.toLowerCase()}. Topic details and learning content are shown read-only here.</p></div>}

      {!isEditing && topic.learningObjectives.length > 0 && (
        <section aria-labelledby="topic-objectives-heading" className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 id="topic-objectives-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-text-tertiary">Learning objectives</h2><span className="rounded-full bg-sage-soft px-2.5 py-1 text-[10px] font-bold text-sage">{topic.learningObjectives.length} outcomes</span></div>
          <ul className="grid gap-2 sm:grid-cols-2">{topic.learningObjectives.map((objective, index) => <li key={`${topic._id}-objective-${index}`} className="flex items-start gap-2.5 rounded-xl bg-surface-elevated p-3 text-sm leading-relaxed text-text-secondary"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage"><Check className="h-3 w-3" aria-hidden="true" /></span>{objective}</li>)}</ul>
        </section>
      )}

      <section aria-label="Topic content sections" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">Build this topic</p><h2 className="mt-1 font-serif text-2xl font-semibold text-text-primary">Learning content</h2></div><p className="text-xs text-text-secondary">Choose a section to manage.</p></div>
        
<div
  role="tablist"
  aria-label="Topic content sections"
  className="flex flex-nowrap gap-2 overflow-x-auto rounded-2xl border border-border bg-surface p-2 scrollbar-hide"
>
  {SECTION_ITEMS.map(({ id, label, Icon }) => {
    const selected = activeSection === id;

    return (
      <button
        key={id}
        type="button"
        role="tab"
        id={`topic-tab-${id.toLowerCase()}`}
        aria-selected={selected}
        aria-controls="topic-section-panel"
        onClick={() => setActiveSection(id)}
        className={[
          'group flex min-w-[150px] shrink-0 items-center gap-2.5 rounded-xl border px-3 py-3 text-left',
          'transition-all duration-200 active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          selected
            ? 'border-signal/30 bg-signal-soft text-signal shadow-sm'
            : 'border-transparent bg-transparent text-text-secondary hover:border-border hover:bg-surface-elevated hover:text-text-primary',
        ].join(' ')}
      >
        <span
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
            selected
              ? 'border-signal/20 bg-surface text-signal'
              : 'border-border bg-surface-elevated text-text-tertiary group-hover:text-text-primary',
          ].join(' ')}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <span className="min-w-0">
          <span className="block whitespace-nowrap text-sm font-semibold">
            {label}
          </span>
        </span>
      </button>
    );
  })}
</div>


        <div id="topic-section-panel" role="tabpanel" aria-labelledby={`topic-tab-${activeSection.toLowerCase()}`} className="min-h-[240px]">
          <AnimatePresence mode="wait" initial={false}>
            {activeSection === 'LESSONS' ? (
              <motion.div key="lessons" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <LessonManagement topicId={topic._id} topicTitle={topic.title} courseStatus={course.status} />
              </motion.div>
            ) : activeSection === 'RESOURCES' ? (
              <motion.div key="resources" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <ResourceManagement topicId={topic._id} topicTitle={topic.title} courseStatus={course.status} />
              </motion.div>
            ) : activeSection === 'QUESTION_BANK' ? (
              <motion.div key="question-bank" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <QuestionBankManagement topicId={topic._id} topicTitle={topic.title} courseStatus={course.status} />
              </motion.div>
            ) : activeSection === 'PRACTICE' ? (
              <motion.div key="practice" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <PracticeManagement topicId={topic._id} topicTitle={topic.title} courseStatus={course.status} />
              </motion.div>
            ) : activeSection === 'ASSESSMENT' ? (
              <motion.div key="assessment" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <AssessmentManagement courseId={course._id} topicId={topic._id} topicTitle={topic.title} courseStatus={course.status} />
              </motion.div>
            ) : (
              <ComingSoonPanel key={activeSection} section={activeSection} onGoToLessons={() => setActiveSection('LESSONS')} />
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};
