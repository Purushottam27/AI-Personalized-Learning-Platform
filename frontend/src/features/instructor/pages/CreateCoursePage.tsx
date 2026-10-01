import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle2,
  BookOpen,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useCreateCourse } from '../hooks/useCreateCourse';
import { useUpdateCourse } from '../hooks/useUpdateCourse';
import { useInstructorCourses } from '../hooks/useInstructorCourses';
import { getCourseById } from '../api/instructor.api';
import type { CourseDifficulty, CreateCoursePayload, Course } from '../types/instructor.types';
import { CourseSetupNav } from '../components/CourseBuilder/CourseSetupNav';

// --- Shared Components ---

const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; error?: string; hint?: string; rows?: number }> = ({
  label, id, error, hint, rows = 5, className = '', ...rest
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-text-secondary select-none">{label}</label>
    <textarea
      id={id} rows={rows}
      className={['w-full px-4 py-3 rounded-lg text-sm font-sans bg-surface resize-y border transition-colors duration-150 outline-none',
        error ? 'border-error text-text-primary bg-error-soft/40 placeholder:text-text-tertiary focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error/25'
              : 'border-border text-text-primary placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25',
        className].join(' ')}
      aria-invalid={!!error}
      {...rest}
    />
    {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
    {error && <p role="alert" className="text-xs text-error font-medium">{error}</p>}
  </div>
);

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner', description: 'No prior experience required' },
  { value: 'INTERMEDIATE', label: 'Intermediate', description: 'Some foundational knowledge expected' },
  { value: 'ADVANCED', label: 'Advanced', description: 'Strong prior knowledge required' },
] as const;

const DifficultySelector: React.FC<{ value: string; onChange: (v: CourseDifficulty) => void; error?: string }> = ({ value, onChange, error }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary select-none">Difficulty</span>
    <div className="flex flex-col sm:flex-row gap-2">
      {DIFFICULTY_OPTIONS.map((opt) => (
        <button
          key={opt.value} type="button" onClick={() => onChange(opt.value)} aria-pressed={value === opt.value}
          className={['flex-1 px-4 py-3 rounded-lg border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
            value === opt.value ? 'border-signal bg-signal-soft text-signal' : 'border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary hover:border-border',
            error ? 'border-error' : ''].join(' ')}
        >
          <span className="block text-sm font-semibold">{opt.label}</span>
          <span className="block text-xs text-text-tertiary mt-0.5">{opt.description}</span>
        </button>
      ))}
    </div>
    {error && <p role="alert" className="text-xs text-error font-medium">{error}</p>}
  </div>
);

const ObjectivesEditor: React.FC<{ objectives: string[]; onChange: (objs: string[]) => void; error?: string }> = ({ objectives, onChange, error }) => {
  const addObjective = () => { if (objectives.length < 10) onChange([...objectives, '']); };
  const updateObjective = (i: number, val: string) => { const n = [...objectives]; n[i] = val; onChange(n); };
  const removeObjective = (i: number) => { if (objectives.length > 1) onChange(objectives.filter((_, idx) => idx !== i)); };
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {objectives.map((obj, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              type="text" value={obj} onChange={(e) => updateObjective(i, e.target.value)} placeholder={`Objective ` + (i + 1)} maxLength={200}
              className={['w-full px-4 py-3 rounded-lg text-sm font-sans bg-surface border transition-colors duration-150 outline-none text-text-primary placeholder:text-text-tertiary',
                (error && obj.trim() === '') ? 'border-error bg-error-soft/40 focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error/25' : 'border-border focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25'].join(' ')}
            />
            <button type="button" onClick={() => removeObjective(i)} disabled={objectives.length <= 1} className="mt-3 p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error-soft transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={addObjective} disabled={objectives.length >= 10} className="inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:text-signal-hover transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:underline"><Plus className="w-4 h-4" /> Add objective</button>
        <span className="text-xs text-text-tertiary">{objectives.length} / 10 objectives</span>
      </div>
      {error && <p role="alert" className="text-xs text-error font-medium">{error}</p>}
    </div>
  );
};

const DurationFields: React.FC<{ hours: string; weeks: string; onHoursChange: (v: string) => void; onWeeksChange: (v: string) => void; hoursError?: string; weeksError?: string }> = ({ hours, weeks, onHoursChange, onWeeksChange, hoursError, weeksError }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary select-none">Recommended Weeks</label>
      <input type="number" min={1} step={1} value={weeks} onChange={(e) => onWeeksChange(e.target.value)} placeholder="e.g. 8" className={['w-full px-4 py-3 rounded-lg text-sm font-sans bg-surface border outline-none focus-visible:ring-2 transition-colors duration-150', weeksError ? 'border-error bg-error-soft/40 focus-visible:border-error focus-visible:ring-error/25' : 'border-border focus-visible:border-focus focus-visible:ring-focus/25'].join(' ')} />
      {weeksError && <p role="alert" className="text-xs text-error font-medium">{weeksError}</p>}
    </div>
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary select-none">Estimated Hours</label>
      <input type="number" min={1} step={1} value={hours} onChange={(e) => onHoursChange(e.target.value)} placeholder="e.g. 20" className={['w-full px-4 py-3 rounded-lg text-sm font-sans bg-surface border outline-none focus-visible:ring-2 transition-colors duration-150', hoursError ? 'border-error bg-error-soft/40 focus-visible:border-error focus-visible:ring-error/25' : 'border-border focus-visible:border-focus focus-visible:ring-focus/25'].join(' ')} />
      {hoursError && <p role="alert" className="text-xs text-error font-medium">{hoursError}</p>}
    </div>
  </div>
);

const KnowledgeEditor: React.FC<{ items: string[]; onChange: (i: string[]) => void }> = ({ items, onChange }) => {
  const updateItem = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n); };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" value={it} onChange={(e) => updateItem(i, e.target.value)} placeholder="e.g. Basic algebra" className="flex-1 px-4 py-3 rounded-lg text-sm bg-surface border border-border text-text-primary placeholder:text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-focus/25 focus-visible:border-focus transition-colors" />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:text-signal-hover transition-colors focus-visible:outline-none focus-visible:underline"><Plus className="w-4 h-4" /> Add knowledge requirement</button>
    </div>
  );
};

const Toggle: React.FC<{ label: string; description: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, description, checked, onChange }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0">
      <label className="text-sm font-medium text-text-primary select-none cursor-pointer" onClick={() => onChange(!checked)}>{label}</label>
      <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{description}</p>
    </div>
    <div className="flex flex-col items-center gap-1 shrink-0">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 items-center shrink-0 cursor-pointer rounded-full border-2 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          checked
            ? 'bg-signal border-signal'
            : 'bg-surface-disabled border-border hover:border-text-tertiary'
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transform transition-transform duration-200',
            checked ? 'translate-x-[22px] bg-paper' : 'translate-x-[2px] bg-text-tertiary'
          ].join(' ')}
        />
      </button>
      <span className={['text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150', checked ? 'text-signal' : 'text-text-disabled'].join(' ')}>
        {checked ? 'On' : 'Off'}
      </span>
    </div>
  </div>
);

// --- Form State & Validation ---

interface FormState {
  title: string; description: string; domain: string; category: string; difficulty: CourseDifficulty | '';
  objectives: string[]; durationHours: string; durationWeeks: string; prereqKnowledge: string[]; prereqCourseIds: string[]; lockingEnabled: boolean;
}

const INITIAL_STATE: FormState = {
  title: '', description: '', domain: '', category: '', difficulty: '',
  objectives: [''], durationHours: '', durationWeeks: '', prereqKnowledge: [], prereqCourseIds: [], lockingEnabled: false,
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function validateSection(sectionId: string, form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (sectionId === 'basics') {
    if (!form.title.trim()) errors.title = 'Course title is required';
    else if (form.title.length < 4) errors.title = 'Title must be at least 4 characters';
    else if (form.title.length > 150) errors.title = 'Title must be 150 characters or fewer';
    if (!form.description.trim()) errors.description = 'Description is required';
    else if (form.description.length < 20) errors.description = 'Description must be at least 20 characters';
    else if (form.description.length > 5000) errors.description = 'Description must be 5000 characters or fewer';
    if (!form.domain.trim()) errors.domain = 'Domain is required';
    if (!form.category.trim()) errors.category = 'Category is required';
    if (!form.difficulty) errors.difficulty = 'Please select a difficulty level';
  } else if (sectionId === 'objectives') {
    const clean = form.objectives.map(o => o.trim()).filter(Boolean);
    if (clean.length === 0) errors.objectives = 'At least one learning objective is required';
    else if (form.objectives.some(o => !o.trim())) errors.objectives = 'Remove empty objectives or fill them in';
  } else if (sectionId === 'duration') {
    if (form.durationHours && (isNaN(Number(form.durationHours)) || Number(form.durationHours) <= 0)) errors.durationHours = 'Hours must be a positive number';
    if (form.durationWeeks && (isNaN(Number(form.durationWeeks)) || Number(form.durationWeeks) <= 0)) errors.durationWeeks = 'Weeks must be a positive number';
  }
  return errors;
}

const SECTIONS = [
  { id: 'basics', label: 'Course Basics' },
  { id: 'objectives', label: 'Learning Objectives' },
  { id: 'duration', label: 'Estimated Duration' },
  { id: 'prerequisites', label: 'Prerequisites' },
  { id: 'settings', label: 'Learning Settings' },
];

export const CreateCoursePage: React.FC = () => {
  const navigate = useNavigate();
  const { courseId: routeCourseId } = useParams<{ courseId: string }>();
  
  const [courseId, setCourseId] = useState<string | null>(routeCourseId || null);
  const [activeSectionId, setActiveSectionId] = useState('basics');
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const { submit: createApi } = useCreateCourse();
  const { update: updateApi } = useUpdateCourse();
  const { courses: existingCourses } = useInstructorCourses();
  
  // Ref to top of section for scrolling
  const sectionRef = useRef<HTMLDivElement>(null);

  // Resume course if ID is present
  useEffect(() => {
    if (routeCourseId) {
      getCourseById(routeCourseId).then(course => {
        if (course) {
          setForm({
            title: course.title || '',
            description: course.description || '',
            domain: course.domain || '',
            category: course.category || '',
            difficulty: course.difficulty || '',
            objectives: (course.objectives?.length ? course.objectives : ['']),
            durationHours: course.estimatedDuration?.hours?.toString() || '',
            durationWeeks: course.estimatedDuration?.weeks?.toString() || '',
            prereqCourseIds: course.prerequisites?.courses || [],
            prereqKnowledge: course.prerequisites?.knowledge || [],
            lockingEnabled: course.progressionPolicy?.lockingEnabled || false,
          });
          
          // Determine completed based on data existence
          const completed = [];
          if (course.title) completed.push('basics');
          if (course.objectives?.length) completed.push('objectives');
          if (course.estimatedDuration?.hours || course.estimatedDuration?.weeks) completed.push('duration');
          if (course.prerequisites?.courses?.length || course.prerequisites?.knowledge?.length) completed.push('prerequisites');
          if (course.progressionPolicy !== undefined) completed.push('settings');
          setCompletedSections(completed);
        }
      });
    }
  }, [routeCourseId]);

  const updateField = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
    setSaveStatus('idle');
  };

  const handleNext = async () => {
    const sectionErrors = validateSection(activeSectionId, form);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      return;
    }
    
    setSaveStatus('saving');
    let savedCourse: Course | null = null;
    
    // Prepare payload for current section
    const payload: Partial<CreateCoursePayload> = {};
    if (activeSectionId === 'basics') {
      payload.title = form.title.trim();
      payload.description = form.description.trim();
      payload.domain = form.domain.trim();
      payload.category = form.category.trim();
      payload.difficulty = form.difficulty as CourseDifficulty;
      // Default empty objectives so backend schema passes if needed
      if (!courseId) payload.objectives = ['']; 
    } else if (activeSectionId === 'objectives') {
      payload.objectives = form.objectives.map(o => o.trim()).filter(Boolean);
    } else if (activeSectionId === 'duration') {
      const h = Number(form.durationHours);
      const w = Number(form.durationWeeks);
      if (h > 0 || w > 0) {
        payload.estimatedDuration = { source: 'MANUAL', ...(h > 0 ? { hours: h } : {}), ...(w > 0 ? { weeks: w } : {}) };
      }
    } else if (activeSectionId === 'prerequisites') {
      const pCourses = form.prereqCourseIds.filter(Boolean);
      const pKnow = form.prereqKnowledge.map(k => k.trim()).filter(Boolean);
      if (pCourses.length > 0 || pKnow.length > 0) {
        payload.prerequisites = { ...(pCourses.length > 0 ? { courses: pCourses } : {}), ...(pKnow.length > 0 ? { knowledge: pKnow } : {}) };
      }
    } else if (activeSectionId === 'settings') {
      payload.progressionPolicy = { lockingEnabled: form.lockingEnabled };
    }

    try {
      if (!courseId) {
        // Create
        // Need to provide minimal valid CreateCoursePayload
        const fullPayload: CreateCoursePayload = {
          title: payload.title || '',
          description: payload.description || '',
          domain: payload.domain || '',
          category: payload.category || '',
          difficulty: payload.difficulty as CourseDifficulty,
          objectives: [''],
        };
        savedCourse = await createApi(fullPayload);
      } else {
        // Update
        savedCourse = await updateApi(courseId, payload);
      }
      
      if (savedCourse) {
        setCourseId(savedCourse._id);
        if (!completedSections.includes(activeSectionId)) {
          setCompletedSections([...completedSections, activeSectionId]);
        }
        setSaveStatus('saved');
        setTimeout(() => { setSaveStatus('idle'); }, 2000);
        
        // Navigate to next
        const currentIndex = SECTIONS.findIndex(s => s.id === activeSectionId);
        if (currentIndex < SECTIONS.length - 1) {
          setActiveSectionId(SECTIONS[currentIndex + 1].id);
          sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Finish
          navigate(`/instructor/courses/${savedCourse._id}`);
        }
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  const handleBack = () => {
    const currentIndex = SECTIONS.findIndex(s => s.id === activeSectionId);
    if (currentIndex > 0) {
      setActiveSectionId(SECTIONS[currentIndex - 1].id);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const currentIndex = SECTIONS.findIndex(s => s.id === activeSectionId);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === SECTIONS.length - 1;
  const activeSectionLabel = SECTIONS[currentIndex].label;

  return (
    <>
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-semibold text-text-primary mb-2">Discard changes?</h3>
              <p className="text-sm text-text-secondary mb-6">You have unsaved information. If you leave, your progress will be lost.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowCancelConfirm(false)}>Keep editing</Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/instructor/dashboard')}>Discard</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 pb-24 lg:pb-16 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">Course Builder</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-text-primary">Create a new course</h1>
          <p className="text-text-secondary text-base max-w-xl">Define the foundation of your course before building its learning structure.</p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start w-full">
          <div className="w-full md:w-56 lg:w-64 shrink-0 md:sticky md:top-6">
            <CourseSetupNav 
              sections={SECTIONS.map(s => ({ ...s, isCompleted: completedSections.includes(s.id) }))}
              activeSectionId={activeSectionId}
              onSelectSection={(id) => {
                // Allow navigating back or to completed sections, or next immediate
                const targetIdx = SECTIONS.findIndex(x => x.id === id);
                if (completedSections.includes(id) || targetIdx <= currentIndex + 1 || !!courseId) {
                  setActiveSectionId(id);
                }
              }}
            />
          </div>

          <div className="flex-1 min-w-0 w-full pb-12" ref={sectionRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSectionId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-surface border border-border rounded-xl overflow-hidden relative group"
                style={{ boxShadow: 'var(--shadow-premium-card)' }}
              >
                {/* Subtle gradient overlay for visual depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-elevated/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative z-10 px-6 md:px-8 py-5 border-b border-border bg-surface-elevated">
                  <h2 className="text-lg font-semibold text-text-primary">{activeSectionLabel}</h2>
                </div>

                <div className="relative z-10 p-6 md:p-8 space-y-6">
                  {saveStatus === 'error' && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-error-soft border border-error/20 text-error">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">Failed to save. Please try again.</p>
                    </div>
                  )}

                  {activeSectionId === 'basics' && (
                    <div className="space-y-5 max-w-2xl">
                      <Input id="course-title" label="Course title" value={form.title} onChange={e => updateField('title', e.target.value)} error={errors.title} placeholder="e.g. Introduction to Machine Learning" />
                      <TextareaField id="course-desc" label="Description" value={form.description} onChange={e => updateField('description', e.target.value)} error={errors.description} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input id="course-domain" label="Domain" value={form.domain} onChange={e => updateField('domain', e.target.value)} error={errors.domain} placeholder="e.g. Computer Science" />
                        <Input id="course-category" label="Category" value={form.category} onChange={e => updateField('category', e.target.value)} error={errors.category} placeholder="e.g. AI" />
                      </div>
                      <DifficultySelector value={form.difficulty} onChange={v => updateField('difficulty', v)} error={errors.difficulty} />
                    </div>
                  )}

                  {activeSectionId === 'objectives' && (
                    <div className="max-w-2xl">
                      <ObjectivesEditor objectives={form.objectives} onChange={v => updateField('objectives', v)} error={errors.objectives} />
                    </div>
                  )}

                  {activeSectionId === 'duration' && (
                    <div className="max-w-xl">
                      <DurationFields hours={form.durationHours} weeks={form.durationWeeks} onHoursChange={v => updateField('durationHours', v)} onWeeksChange={v => updateField('durationWeeks', v)} hoursError={errors.durationHours} weeksError={errors.durationWeeks} />
                    </div>
                  )}

                  {activeSectionId === 'prerequisites' && (
                    <div className="space-y-6 max-w-2xl">
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-text-primary">Prerequisite courses</h3>
                        {existingCourses.length === 0 ? (
                          <div className="p-4 rounded-lg border border-border-muted bg-surface-elevated text-center">
                            <BookOpen className="w-5 h-5 text-text-disabled mx-auto mb-2" />
                            <p className="text-xs text-text-tertiary">No courses available yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border-muted">
                            {existingCourses.map(course => {
                              const sel = form.prereqCourseIds.includes(course._id);
                              return (
                                <button key={course._id} type="button" onClick={() => {
                                  const n = sel ? form.prereqCourseIds.filter(id => id !== course._id) : [...form.prereqCourseIds, course._id];
                                  updateField('prereqCourseIds', n);
                                }} className={['w-full flex items-center gap-3 px-4 py-3 text-left transition-colors', sel ? 'bg-signal-soft/60' : 'bg-surface hover:bg-surface-elevated'].join(' ')}>
                                  <div className={['w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors', sel ? 'bg-signal border-signal text-paper' : 'border-border'].join(' ')}>
                                    {sel && <CheckCircle2 className="w-4 h-4" strokeWidth={3} />}
                                  </div>
                                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-text-primary truncate">{course.title}</p></div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-text-primary">Prerequisite knowledge</h3>
                        <KnowledgeEditor items={form.prereqKnowledge} onChange={v => updateField('prereqKnowledge', v)} />
                      </div>
                    </div>
                  )}

                  {activeSectionId === 'settings' && (
                    <div className="space-y-6 max-w-2xl">
                      <div className="p-4 rounded-lg border border-border bg-surface-elevated">
                        <Toggle label="Require learners to complete Topics in sequence" description="When enabled, learners must complete each Topic before moving to the next." checked={form.lockingEnabled} onChange={v => updateField('lockingEnabled', v)} />
                      </div>
                      <div className="p-4 rounded-lg border border-border-muted bg-surface-elevated space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-text-primary">Diagnostic assessment</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-disabled text-text-disabled border border-border-muted">Coming soon</span>
                        </div>
                        <div className="flex items-start gap-2 text-text-tertiary">
                          <Info className="w-4 h-4 mt-0.5 shrink-0" />
                          <p className="text-xs leading-relaxed">Question bank and assessment functionality are currently under development.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative z-10 px-6 md:px-8 py-5 border-t border-border bg-surface-elevated">
                  {/* Save status line */}
                  {(saveStatus === 'saving' || saveStatus === 'saved') && (
                    <div className="mb-3 flex justify-end">
                      {saveStatus === 'saving' && <span className="text-xs font-medium text-text-secondary">Saving...</span>}
                      {saveStatus === 'saved' && <span className="text-xs font-medium text-sage flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
                    </div>
                  )}
                  {/* Buttons — stack on very small, side-by-side otherwise */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="w-full flex justify-center sm:justify-start sm:w-auto">
                      {isFirst ? (
                        <Button type="button" variant="ghost" onClick={handleCancel} className="w-full sm:w-auto justify-center">Cancel</Button>
                      ) : (
                        <Button type="button" variant="secondary" onClick={handleBack} className="w-full sm:w-auto justify-center"><ChevronLeft className="w-4 h-4 mr-1.5" /> Back</Button>
                      )}
                    </div>
                    <div className="w-full flex justify-center sm:justify-end sm:w-auto">
                      <Button type="button" variant="primary" onClick={handleNext} disabled={saveStatus === 'saving'} className="w-full sm:w-auto justify-center">
                        {isLast ? 'Complete Setup' : 'Save & Continue'}
                        {!isLast && <ChevronRight className="w-4 h-4 ml-1.5 -mr-1" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};
