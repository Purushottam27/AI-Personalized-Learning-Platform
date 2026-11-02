import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Archive, CheckCircle2, ClipboardCheck, Database, Loader2, Pencil, Plus, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { getAssessmentsByCourse, createAssessment, updateAssessment, publishAssessment, archiveAssessment, restoreAssessment } from '../../api/assessment.api';
import { getTopicsByCourse } from '../../api/topic.api';
import { getQuestionBankByTopic } from '../../api/questionBank.api';
import { getQuestionsByBank } from '../../api/question.api';
import type { Assessment } from '../../types/assessment.types';
import type { Course, CourseStatus } from '../../types/instructor.types';
import type { Question } from '../../types/question.types';

interface Props { course: Course; courseStatus: CourseStatus; onChanged?: () => Promise<void> | void; }
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
};

export const DiagnosticAssessmentManagement: React.FC<Props> = ({ course, courseStatus, onChanged }) => {
  const policy = course.diagnosticPolicy;
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState(`${course.title} · Diagnostic Assessment`);
  const [description, setDescription] = useState('A short baseline assessment to understand learners’ prior knowledge before they begin this course.');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = await getAssessmentsByCourse(course._id);
      setAssessments(rows.filter((item) => item.type === 'DIAGNOSTIC'));
    } catch (err) { setError(errorMessage(err, 'Unable to load the diagnostic assessment.')); }
    finally { setLoading(false); }
  }, [course._id]);

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const topics = await getTopicsByCourse(course._id);
      const questionGroups = await Promise.all(topics.map(async (topic) => {
        try {
          const bank = await getQuestionBankByTopic(topic._id);
          return bank.status === 'ACTIVE' ? await getQuestionsByBank(bank._id) : [];
        } catch { return []; }
      }));
      const unique = new Map<string, Question>();
      questionGroups.flat().forEach((q) => { if (q.status === 'ACTIVE') unique.set(q._id, q); });
      setQuestions([...unique.values()]);
    } catch (err) { setError(errorMessage(err, 'Unable to load active course questions.')); }
    finally { setLoadingQuestions(false); }
  }, [course._id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const current = useMemo(() =>
    assessments.find((a) => a.status === 'PUBLISHED') ||
    assessments.find((a) => a.status === 'DRAFT') || assessments[0] || null, [assessments]);
  const published = assessments.find((a) => a.status === 'PUBLISHED');
  const canManage = courseStatus === 'DRAFT';

  const beginCreate = async () => {
    setError(null); setNotice(null); setSelectedIds([]);
    setTitle(`${course.title} · Diagnostic Assessment`);
    setDescription('A short baseline assessment to understand learners’ prior knowledge before they begin this course.');
    setEditing(true); await loadQuestions();
  };
  const beginEdit = async () => {
    if (!current || current.status !== 'DRAFT') return;
    setTitle(current.title); setDescription(current.description || '');
    setSelectedIds(current.questionIds || []); setError(null); setEditing(true); await loadQuestions();
  };
  const saveDraft = async () => {
    if (!policy?.enabled || policy.passingScore == null || policy.questionsPerAttempt == null) {
      setError('Enable and save the diagnostic policy in Course Setup before creating the assessment.'); return;
    }
    if (title.trim().length < 3) { setError('Assessment title must contain at least 3 characters.'); return; }
    if (selectedIds.length < policy.questionsPerAttempt) {
      setError(`Select at least ${policy.questionsPerAttempt} active questions for each attempt.`); return;
    }
    setBusy(true); setError(null);
    try {
      if (current?.status === 'DRAFT') {
        await updateAssessment(current._id, { title: title.trim(), description: description.trim(), questionIds: selectedIds });
        setNotice('Diagnostic assessment draft updated.');
      } else {
        await createAssessment({ courseId: course._id, type: 'DIAGNOSTIC', title: title.trim(), description: description.trim(), questionIds: selectedIds });
        setNotice('Diagnostic assessment draft created. Review it before publishing.');
      }
      setEditing(false); await refresh(); await onChanged?.();
    } catch (err) { setError(errorMessage(err, 'Unable to save the diagnostic assessment.')); }
    finally { setBusy(false); }
  };
  const action = async (fn: () => Promise<unknown>, success: string) => {
    if (!current) return;
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); setNotice(success); await refresh(); await onChanged?.(); }
    catch (err) { setError(errorMessage(err, 'The diagnostic assessment could not be updated.')); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="diagnostic-assessment-heading" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <header className="flex flex-col gap-4 border-b border-border bg-surface-elevated p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-signal"><ClipboardCheck className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">Course-level evaluation</p>
            <h2 id="diagnostic-assessment-heading" className="mt-1 text-lg font-semibold text-text-primary">Diagnostic assessment</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">Establish a baseline of prior knowledge before learners begin. This is separate from topic mastery and the final assessment.</p>
          </div>
        </div>
        <span className={`self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${published ? 'border-sage/25 bg-sage-soft text-sage' : 'border-border bg-surface text-text-secondary'}`}>{published ? 'Published' : current?.status === 'DRAFT' ? 'Draft in progress' : policy?.enabled ? 'Not created yet' : 'Not enabled'}</span>
      </header>

      <div className="space-y-5 p-5 sm:p-6">
        {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-sage/25 bg-sage-soft px-4 py-3 text-sm text-sage"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div>}
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {!policy?.enabled ? (
          <div className="rounded-xl border border-border bg-surface-elevated p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-text-tertiary" /><div><h3 className="text-sm font-semibold text-text-primary">Diagnostic assessment is turned off</h3><p className="mt-1 text-sm text-text-secondary">Enable it in Course Setup → Learning Settings to configure the policy and build its question pool.</p>{canManage && <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.assign(`/instructor/courses/${course._id}/setup`)}>Open Learning Settings</Button>}</div></div>
          </div>
        ) : <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-elevated p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Questions / attempt</p><p className="mt-1 text-xl font-semibold text-text-primary">{policy.questionsPerAttempt ?? '—'}</p></div>
            <div className="rounded-xl border border-border bg-surface-elevated p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Passing threshold</p><p className="mt-1 text-xl font-semibold text-text-primary">{policy.passingScore ?? '—'}%</p></div>
            <div className="col-span-2 rounded-xl border border-border bg-surface-elevated p-3 sm:col-span-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Active course questions</p><p className="mt-1 text-xl font-semibold text-text-primary">{questions.length || '—'}</p></div>
          </div>
          {loading ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin text-signal" />Loading diagnostic assessment…</div> :
            current ? <div className="rounded-xl border border-border p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-text-primary">{current.title}</h3><span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">{current.status}</span></div><p className="mt-1 text-sm text-text-secondary">{current.description || 'No description provided.'}</p><p className="mt-3 text-xs text-text-tertiary">{current.questionIds.length} questions in pool · {current.questionsPerAttempt} per attempt · {current.passingScore}% passing score</p></div>
                {canManage && <div className="flex flex-wrap gap-2">
                  {current.status === 'DRAFT' && <Button size="sm" variant="secondary" onClick={() => void beginEdit()}><Pencil className="h-3.5 w-3.5" />Edit draft</Button>}
                  {current.status === 'DRAFT' && <Button size="sm" onClick={() => void action(() => publishAssessment(current._id), 'Diagnostic assessment published successfully.')} disabled={busy}><Send className="h-3.5 w-3.5" />Publish</Button>}
                  {current.status === 'PUBLISHED' && <Button size="sm" variant="secondary" onClick={() => void action(() => archiveAssessment(current._id), 'Diagnostic assessment archived.')} disabled={busy}><Archive className="h-3.5 w-3.5" />Archive</Button>}
                  {current.status === 'ARCHIVED' && <Button size="sm" variant="secondary" onClick={() => void action(() => restoreAssessment(current._id), 'Diagnostic assessment restored as a draft.')} disabled={busy}><RotateCcw className="h-3.5 w-3.5" />Restore</Button>}
                </div>}
              </div>
            </div> :
            <div className="rounded-xl border border-dashed border-border bg-surface-elevated p-6 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-signal-soft text-signal"><Sparkles className="h-5 w-5" /></div>
              <h3 className="mt-3 font-semibold text-text-primary">Build your course baseline</h3>
              <p className="mx-auto mt-1 max-w-lg text-sm leading-relaxed text-text-secondary">Choose active questions from your course topic banks. Learners use this assessment to demonstrate what they already know before starting the learning journey.</p>
              {canManage && <Button className="mt-4" onClick={() => void beginCreate()}><Plus className="h-4 w-4" />Create diagnostic assessment</Button>}
            </div>
          }
        </>}

        {editing && <div className="space-y-4 rounded-xl border border-signal/25 bg-surface-elevated p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-text-primary">{current?.status === 'DRAFT' ? 'Edit diagnostic draft' : 'Create diagnostic assessment'}</h3><p className="mt-1 text-xs text-text-secondary">Select questions across this course’s active topic Question Banks. At least {policy?.questionsPerAttempt ?? 5} questions are required.</p></div><span className="rounded-full bg-signal-soft px-2.5 py-1 text-xs font-semibold text-signal">{selectedIds.length} selected</span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-text-secondary">Assessment title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/20" /></label>
            <label className="space-y-1.5 text-xs font-semibold text-text-secondary">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/20" /></label>
          </div>
          {loadingQuestions ? <div className="flex items-center gap-2 py-6 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin" />Loading active questions…</div> : questions.length === 0 ? <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-text-secondary"><Database className="mb-2 h-4 w-4 text-amber-500" /><p className="font-semibold text-text-primary">No active questions available</p><p className="mt-1 text-xs">Create topic Question Banks and add enough active questions before building this assessment.</p></div> :
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-surface p-2">{questions.map((q) => { const selected = selectedIds.includes(q._id); return <label key={q._id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${selected ? 'border-signal/30 bg-signal-soft/40' : 'border-transparent hover:bg-surface-elevated'}`}><input type="checkbox" checked={selected} onChange={() => setSelectedIds((ids) => selected ? ids.filter((id) => id !== q._id) : ids.length < 200 ? [...ids, q._id] : ids)} className="mt-0.5 accent-[var(--color-signal)]" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-text-primary">{q.questionText}</span><span className="mt-1 flex flex-wrap gap-2 text-[10px] text-text-tertiary"><span>{q.type.replace('_', ' ')}</span><span>{q.difficulty}</span><span>{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span></span></span></label>; })}</div>}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button><Button onClick={() => void saveDraft()} disabled={busy || loadingQuestions || questions.length === 0}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Save as draft</Button></div>
        </div>}

        <div className="flex items-start gap-2 border-t border-border-muted pt-4 text-xs leading-relaxed text-text-tertiary"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Diagnostic results establish an initial baseline. They are not a substitute for topic mastery or the course final assessment. Publishing requires a valid active question pool and the configured course policy.</p></div>
      </div>
    </section>
  );
};
