import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { isApiError } from '../../../../lib/axios';
import {
  archiveAssessment,
  createAssessment,
  getAssessmentsByCourse,
  publishAssessment,
  restoreAssessment,
  updateAssessment,
} from '../../api/assessment.api';
import { getQuestionsByBank } from '../../api/question.api';
import { getQuestionBankByTopic } from '../../api/questionBank.api';
import { getTopicsByCourse } from '../../api/topic.api';
import type { Assessment } from '../../types/assessment.types';
import type { Course, CourseStatus } from '../../types/instructor.types';
import type { Question, QuestionDifficulty } from '../../types/question.types';
import type { QuestionBank } from '../../types/questionBank.types';
import type { Topic } from '../../types/topic.types';

interface Props {
  course: Course;
  courseStatus: CourseStatus;
  onChanged?: () => Promise<void> | void;
}

interface TopicBank {
  topic: Topic;
  bank: QuestionBank | null;
}

type DifficultyFilter = 'ALL' | QuestionDifficulty;
type TypeFilter = 'ALL' | Question['type'];

const MAX_POOL_SIZE = 200;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isApiError(error)) return error.message || fallback;
  return error instanceof Error ? error.message : fallback;
};

const isMissingBank = (error: unknown): boolean =>
  isApiError(error) && (error.status === 404 || error.code === 'QUESTION_BANK_NOT_FOUND');

const interactive =
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50';

export const DiagnosticAssessmentManagement: React.FC<Props> = ({
  course,
  courseStatus,
  onChanged,
}) => {
  const navigate = useNavigate();
  const policy = course.diagnosticPolicy;
  const requiredCount = policy?.questionsPerAttempt ?? 5;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [topicBanks, setTopicBanks] = useState<TopicBank[]>([]);
  const [questionsByBank, setQuestionsByBank] = useState<Record<string, Question[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState(`${course.title} · Diagnostic Assessment`);
  const [description, setDescription] = useState(
    'A short baseline assessment to understand learners’ prior knowledge before they begin this course.',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAssessmentsByCourse(course._id);
      setAssessments(rows.filter((item) => item.type === 'DIAGNOSTIC'));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load the diagnostic assessment.'));
    } finally {
      setLoading(false);
    }
  }, [course._id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const current = useMemo(
    () =>
      assessments.find((assessment) => assessment.status === 'PUBLISHED') ||
      assessments.find((assessment) => assessment.status === 'DRAFT') ||
      assessments[0] ||
      null,
    [assessments],
  );
  const published = assessments.find((assessment) => assessment.status === 'PUBLISHED');
  const canManage = courseStatus === 'DRAFT';
  const activeTopicBanks = useMemo(
    () => topicBanks.filter((entry) => entry.bank?.status === 'ACTIVE'),
    [topicBanks],
  );
  const selectedBank = activeTopicBanks.find((entry) => entry.bank?._id === selectedBankId) ?? null;
  const selectedBankQuestions = selectedBankId ? questionsByBank[selectedBankId] ?? [] : [];

  const allLoadedQuestions = useMemo(
    () => Object.values(questionsByBank).flat(),
    [questionsByBank],
  );
  const questionLookup = useMemo(
    () => new Map(allLoadedQuestions.map((question) => [question._id, question])),
    [allLoadedQuestions],
  );
  const unavailableSelectedIds = useMemo(
    () => selectedIds.filter((id) => !questionLookup.has(id)),
    [selectedIds, questionLookup],
  );
  const selectedQuestionsByTopic = useMemo(() => {
    return activeTopicBanks
      .map(({ topic, bank }) => ({
        topic,
        bank,
        questions: (questionsByBank[bank!._id] ?? []).filter((question) => selectedIds.includes(question._id)),
      }))
      .filter((entry) => entry.questions.length > 0);
  }, [activeTopicBanks, questionsByBank, selectedIds]);

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return selectedBankQuestions.filter((question) => {
      if (difficultyFilter !== 'ALL' && question.difficulty !== difficultyFilter) return false;
      if (typeFilter !== 'ALL' && question.type !== typeFilter) return false;
      if (query && !question.questionText.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [selectedBankQuestions, difficultyFilter, typeFilter, searchQuery]);

  const loadTopicBanksAndQuestions = useCallback(async () => {
    setLoadingBanks(true);
    setError(null);
    try {
      const topics = await getTopicsByCourse(course._id);
      const rows = await Promise.all(
        topics.map(async (topic): Promise<TopicBank> => {
          try {
            const bank = await getQuestionBankByTopic(topic._id);
            return { topic, bank };
          } catch (err) {
            if (isMissingBank(err)) return { topic, bank: null };
            throw err;
          }
        }),
      );

      setTopicBanks(rows);
      const activeBanks = rows.filter((row) => row.bank?.status === 'ACTIVE');
      const questionEntries = await Promise.all(
        activeBanks.map(async ({ bank }) => {
          const questions = await getQuestionsByBank(bank!._id);
          return [bank!._id, questions.filter((question) => question.status === 'ACTIVE')] as const;
        }),
      );
      const questionMap = Object.fromEntries(questionEntries) as Record<string, Question[]>;
      setQuestionsByBank(questionMap);
      return { rows, questionMap };
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load this course’s topics and Question Banks.'));
      return { rows: [] as TopicBank[], questionMap: {} as Record<string, Question[]> };
    } finally {
      setLoadingBanks(false);
    }
  }, [course._id]);

  const resetPicker = () => {
    setSearchQuery('');
    setDifficultyFilter('ALL');
    setTypeFilter('ALL');
  };

  const beginCreate = async () => {
    setError(null);
    setNotice(null);
    setSelectedIds([]);
    setTitle(`${course.title} · Diagnostic Assessment`);
    setDescription(
      'A short baseline assessment to understand learners’ prior knowledge before they begin this course.',
    );
    resetPicker();
    setEditing(true);
    const { rows } = await loadTopicBanksAndQuestions();
    const firstActiveBank = rows.find((row) => row.bank?.status === 'ACTIVE')?.bank;
    setSelectedBankId(firstActiveBank?._id ?? '');
  };

  const beginEdit = async () => {
    if (!current || current.status !== 'DRAFT') return;
    setTitle(current.title);
    setDescription(current.description || '');
    setSelectedIds([...current.questionIds]);
    setError(null);
    setNotice(null);
    resetPicker();
    setEditing(true);
    const { rows, questionMap } = await loadTopicBanksAndQuestions();
    const firstSelectedQuestion = current.questionIds
      .map((id) => rows.find((row) => row.bank && questionMap[row.bank._id]?.some((question) => question._id === id)))
      .find(Boolean);
    const firstActiveBank = rows.find((row) => row.bank?.status === 'ACTIVE')?.bank;
    setSelectedBankId(firstSelectedQuestion?.bank?._id ?? firstActiveBank?._id ?? '');
  };

  const toggleQuestion = (questionId: string) => {
    setSelectedIds((currentIds) => {
      if (currentIds.includes(questionId)) return currentIds.filter((id) => id !== questionId);
      if (currentIds.length >= MAX_POOL_SIZE) {
        setError(`A diagnostic question pool cannot exceed ${MAX_POOL_SIZE} questions.`);
        return currentIds;
      }
      setError(null);
      return [...currentIds, questionId];
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((currentIds) => {
      const merged = Array.from(new Set([...currentIds, ...filteredQuestions.map((question) => question._id)]));
      if (merged.length > MAX_POOL_SIZE) {
        setError(`The question pool is limited to ${MAX_POOL_SIZE} questions. Only the first available questions were added.`);
        return merged.slice(0, MAX_POOL_SIZE);
      }
      setError(null);
      return merged;
    });
  };

  const deselectFiltered = () => {
    const visibleIds = new Set(filteredQuestions.map((question) => question._id));
    setSelectedIds((currentIds) => currentIds.filter((id) => !visibleIds.has(id)));
  };

  const saveDraft = async () => {
    if (!policy?.enabled || policy.passingScore == null || policy.questionsPerAttempt == null) {
      setError('Enable and save the diagnostic policy in Course Setup before creating the assessment.');
      return;
    }
    if (title.trim().length < 3 || title.trim().length > 150) {
      setError('Assessment title must contain between 3 and 150 characters.');
      return;
    }
    if (description.length > 1000) {
      setError('Description cannot exceed 1000 characters.');
      return;
    }
    if (unavailableSelectedIds.length > 0) {
      setError('Some previously selected questions are no longer active or available. Remove them before saving.');
      return;
    }
    if (selectedIds.length < requiredCount) {
      setError(`Select at least ${requiredCount} active questions for each attempt.`);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (current?.status === 'DRAFT') {
        await updateAssessment(current._id, {
          title: title.trim(),
          description: description.trim(),
          questionIds: selectedIds,
        });
        setNotice('Diagnostic assessment draft updated.');
      } else {
        await createAssessment({
          courseId: course._id,
          type: 'DIAGNOSTIC',
          title: title.trim(),
          description: description.trim(),
          questionIds: selectedIds,
        });
        setNotice('Diagnostic assessment draft created. Review it before publishing.');
      }
      setEditing(false);
      await refresh();
      await onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save the diagnostic assessment.'));
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    if (!current) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await refresh();
      await onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, 'The diagnostic assessment could not be updated.'));
    } finally {
      setBusy(false);
    }
  };

  const questionCountForBank = (bankId: string) => questionsByBank[bankId]?.length ?? 0;

  return (
    <section aria-labelledby="diagnostic-assessment-heading" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <header className="flex flex-col gap-4 border-b border-border bg-surface-elevated p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-signal/20 bg-signal-soft text-signal">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">Course-level evaluation</p>
            <h2 id="diagnostic-assessment-heading" className="mt-1 text-lg font-semibold text-text-primary">Diagnostic assessment</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Establish a baseline of prior knowledge before learners begin. This is separate from topic mastery and the final assessment.
            </p>
          </div>
        </div>
        <span className={`self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${published ? 'border-sage/25 bg-sage-soft text-sage' : 'border-border bg-surface text-text-secondary'}`}>
          {published ? 'Published' : current?.status === 'DRAFT' ? 'Draft in progress' : policy?.enabled ? 'Not created yet' : 'Not enabled'}
        </span>
      </header>

      <div className="space-y-5 p-5 sm:p-6">
        {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-sage/25 bg-sage-soft px-4 py-3 text-sm text-sage"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div>}
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {!policy?.enabled ? (
          <div className="rounded-xl border border-border bg-surface-elevated p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-text-tertiary" />
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Diagnostic assessment is turned off</h3>
                <p className="mt-1 text-sm text-text-secondary">Enable it in Course Setup → Learning Settings to configure the policy and build its question pool.</p>
                {canManage && <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.assign(`/instructor/courses/${course._id}/setup`)}>Open Learning Settings</Button>}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-elevated p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Questions / attempt</p><p className="mt-1 text-xl font-semibold text-text-primary">{requiredCount}</p></div>
              <div className="rounded-xl border border-border bg-surface-elevated p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Passing threshold</p><p className="mt-1 text-xl font-semibold text-text-primary">{policy.passingScore ?? '—'}%</p></div>
              <div className="col-span-2 rounded-xl border border-border bg-surface-elevated p-3 sm:col-span-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Active course questions</p><p className="mt-1 text-xl font-semibold text-text-primary">{Object.values(questionsByBank).reduce((total, items) => total + items.length, 0) || '—'}</p></div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin text-signal" />Loading diagnostic assessment…</div>
            ) : current ? (
              <div className="rounded-xl border border-border p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-text-primary">{current.title}</h3><span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">{current.status}</span></div>
                    <p className="mt-1 text-sm text-text-secondary">{current.description || 'No description provided.'}</p>
                    <p className="mt-3 text-xs text-text-tertiary">{current.questionIds.length} questions in pool · {current.questionsPerAttempt} per attempt · {current.passingScore}% passing score</p>
                  </div>
                  {canManage && <div className="flex flex-wrap gap-2">
                    {current.status === 'DRAFT' && <Button size="sm" variant="secondary" onClick={() => void beginEdit()} disabled={busy}><Pencil className="h-3.5 w-3.5" />Edit draft</Button>}
                    {current.status === 'DRAFT' && <Button size="sm" onClick={() => void runAction(() => publishAssessment(current._id), 'Diagnostic assessment published successfully.')} disabled={busy}><Send className="h-3.5 w-3.5" />Publish</Button>}
                    {current.status === 'PUBLISHED' && <Button size="sm" variant="secondary" onClick={() => void runAction(() => archiveAssessment(current._id), 'Diagnostic assessment archived.')} disabled={busy}><Archive className="h-3.5 w-3.5" />Archive</Button>}
                    {current.status === 'ARCHIVED' && <Button size="sm" variant="secondary" onClick={() => void runAction(() => restoreAssessment(current._id), 'Diagnostic assessment restored as a draft.')} disabled={busy}><RotateCcw className="h-3.5 w-3.5" />Restore</Button>}
                  </div>}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-surface-elevated p-6 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-signal-soft text-signal"><Sparkles className="h-5 w-5" /></div>
                <h3 className="mt-3 font-semibold text-text-primary">Build your course baseline</h3>
                <p className="mx-auto mt-1 max-w-lg text-sm leading-relaxed text-text-secondary">Create topics and their Question Banks first. Then choose a bank and select the active questions that will form your course-level baseline.</p>
                {canManage && <Button className="mt-4" onClick={() => void beginCreate()}><Plus className="h-4 w-4" />Create diagnostic assessment</Button>}
              </div>
            )}
          </>
        )}

        {editing && policy?.enabled && (
          <div className="space-y-5 rounded-xl border border-signal/25 bg-surface-elevated p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-signal">Question pool builder</p><h3 className="mt-1 font-semibold text-text-primary">{current?.status === 'DRAFT' ? 'Edit diagnostic assessment' : 'Create diagnostic assessment'}</h3><p className="mt-1 text-xs leading-relaxed text-text-secondary">Choose a topic Question Bank, then select questions from that bank. You can combine questions from multiple topic banks.</p></div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-signal-soft px-3 py-1.5 text-xs font-semibold text-signal">{selectedIds.length} / {MAX_POOL_SIZE} selected</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-text-secondary">Assessment title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/20" /></label>
              <label className="space-y-1.5 text-xs font-semibold text-text-secondary">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={2} className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/20" /></label>
            </div>

            {loadingBanks ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface p-8 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin text-signal" />Loading topic Question Banks and active questions…</div>
            ) : topicBanks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center"><Database className="mx-auto h-6 w-6 text-text-tertiary" /><h4 className="mt-2 font-semibold text-text-primary">Create a topic first</h4><p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">The diagnostic assessment draws from the Question Banks inside this course’s topics. Add at least one topic before selecting questions.</p></div>
            ) : activeTopicBanks.length === 0 ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4"><h4 className="text-sm font-semibold text-text-primary">No active Question Banks found</h4><p className="mt-1 text-xs leading-relaxed text-text-secondary">Create or restore a Question Bank inside one of the course topics before building the diagnostic assessment.</p><div className="mt-3 space-y-2">{topicBanks.map(({ topic, bank }) => <div key={topic._id} className="flex items-center justify-between gap-3 rounded-lg bg-surface/70 px-3 py-2 text-xs"><span className="min-w-0 truncate text-text-primary">{topic.title}</span><span className="flex shrink-0 items-center gap-2"><span className="text-text-tertiary">{bank ? 'Bank archived' : 'No bank yet'}</span><button type="button" onClick={() => navigate(`/instructor/courses/${course._id}/topics/${topic._id}`)} className="font-semibold text-signal hover:underline">Manage topic</button></span></div>)}</div></div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-semibold text-text-primary">1. Choose a Question Bank</h4><p className="mt-0.5 text-xs text-text-secondary">Each bank belongs to one topic. Select one to browse its questions.</p></div><span className="text-xs text-text-tertiary">{activeTopicBanks.length} active {activeTopicBanks.length === 1 ? 'bank' : 'banks'}</span></div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {activeTopicBanks.map(({ topic, bank }) => {
                      const isSelected = selectedBankId === bank!._id;
                      const count = questionCountForBank(bank!._id);
                      const selectedCount = (questionsByBank[bank!._id] ?? []).filter((question) => selectedIds.includes(question._id)).length;
                      return <button key={bank!._id} type="button" onClick={() => { setSelectedBankId(bank!._id); setError(null); }} aria-pressed={isSelected} className={`min-w-0 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${isSelected ? 'border-signal bg-signal-soft/50 shadow-sm' : 'border-border bg-surface hover:border-text-tertiary'}`}>
                        <span className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{topic.title}</span><span className="mt-1 block truncate text-sm font-semibold text-text-primary">{bank!.title}</span></span>{isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-signal" />}</span>
                        <span className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="text-text-secondary">{count} active {count === 1 ? 'question' : 'questions'}</span><span className={`font-semibold ${selectedCount ? 'text-signal' : 'text-text-tertiary'}`}>{selectedCount} selected</span></span>
                      </button>;
                    })}
                  </div>
                </div>

                {selectedBank && (
                  <div className="space-y-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h4 className="text-sm font-semibold text-text-primary">2. Select questions</h4><p className="mt-0.5 truncate text-xs text-text-secondary">{selectedBank.topic.title} <span className="px-1 text-text-tertiary">/</span> {selectedBank.bank!.title}</p><button type="button" onClick={() => navigate(`/instructor/courses/${course._id}/topics/${selectedBank.topic._id}`)} className="mt-1 text-xs font-semibold text-signal hover:underline">Manage this bank · Add or edit questions</button></div><span className="shrink-0 rounded-full bg-signal-soft px-2.5 py-1 text-xs font-semibold text-signal">{selectedBankQuestions.filter((question) => selectedIds.includes(question._id)).length} selected in this bank</span></div>

                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search question text…" aria-label="Search questions in selected bank" className="w-full rounded-lg border border-border bg-surface-elevated py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/20" /></div>
                      <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3"><Filter className="h-3.5 w-3.5 text-text-tertiary" /><select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)} aria-label="Filter by difficulty" className="min-w-0 bg-transparent py-2.5 text-xs text-text-primary outline-none"><option value="ALL">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
                      <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} aria-label="Filter by question type" className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-xs text-text-primary outline-none"><option value="ALL">All types</option><option value="MCQ_SINGLE">Single choice</option><option value="MCQ_MULTIPLE">Multiple choice</option><option value="TRUE_FALSE">True / False</option></select>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-text-tertiary">Showing {filteredQuestions.length} of {selectedBankQuestions.length} active questions</span><div className="flex items-center gap-3"><button type="button" onClick={selectAllFiltered} disabled={!filteredQuestions.length || selectedIds.length >= MAX_POOL_SIZE} className={`font-semibold text-signal hover:underline ${interactive}`}>Select filtered</button><button type="button" onClick={deselectFiltered} disabled={!filteredQuestions.some((question) => selectedIds.includes(question._id))} className={`text-text-secondary hover:text-text-primary ${interactive}`}>Clear filtered</button></div></div>

                    {selectedBankQuestions.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-surface-elevated p-6 text-center"><Database className="mx-auto h-5 w-5 text-text-tertiary" /><p className="mt-2 text-sm font-semibold text-text-primary">No active questions in this bank</p><p className="mt-1 text-xs text-text-secondary">Add or restore questions in this topic’s Question Bank, then return here.</p></div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-surface-elevated p-5 text-center text-sm text-text-secondary">No questions match these filters. Try another difficulty, type or search term.</div>
                    ) : (
                      <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                        {filteredQuestions.map((question) => {
                          const checked = selectedIds.includes(question._id);
                          const difficultyClass = question.difficulty === 'EASY' ? 'bg-sage-soft text-sage' : question.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' : 'bg-error-soft text-error';
                          return <label key={question._id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? 'border-signal/35 bg-signal-soft/30' : 'border-border-muted bg-surface-elevated hover:border-border'}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleQuestion(question._id)} disabled={!checked && selectedIds.length >= MAX_POOL_SIZE} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-signal)]" />
                            <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium leading-relaxed text-text-primary">{question.questionText}</span><span className="mt-2 flex flex-wrap items-center gap-1.5"><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${difficultyClass}`}>{question.difficulty}</span><span className="rounded-md bg-surface-disabled px-1.5 py-0.5 text-[10px] text-text-secondary">{question.type.replace('_', ' ')}</span><span className="text-[10px] text-text-tertiary">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span></span></span>
                            {checked && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" />}
                          </label>;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {unavailableSelectedIds.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-text-secondary">{unavailableSelectedIds.length} previously selected question(s) are no longer active or belong to an unavailable bank. Remove them before saving.</p><Button size="sm" variant="secondary" onClick={() => setSelectedIds((ids) => ids.filter((id) => !unavailableSelectedIds.includes(id)))}>Remove unavailable</Button></div>
            )}

            <div className="space-y-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-semibold text-text-primary">3. Review selected questions</h4><p className="mt-0.5 text-xs text-text-secondary">Selections are retained when you switch between topic banks.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedIds.length >= requiredCount ? 'bg-sage-soft text-sage' : 'bg-amber-500/10 text-amber-600'}`}>{selectedIds.length} / {requiredCount} minimum</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-disabled"><div className="h-full rounded-full bg-signal transition-all" style={{ width: `${Math.min(100, (selectedIds.length / Math.max(requiredCount, 1)) * 100)}%` }} /></div>
              {selectedQuestionsByTopic.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-tertiary">No questions selected yet.</p> : <div className="space-y-2">{selectedQuestionsByTopic.map(({ topic, bank, questions }) => <div key={topic._id} className="rounded-lg border border-border-muted bg-surface-elevated p-3"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold text-text-primary">{topic.title}</p><p className="truncate text-[10px] text-text-tertiary">{bank?.title}</p></div><span className="shrink-0 text-xs font-semibold text-signal">{questions.length} selected</span></div><ul className="mt-2 space-y-1.5">{questions.map((question) => <li key={question._id} className="flex items-start justify-between gap-2 text-xs"><span className="min-w-0 break-words text-text-secondary">{question.questionText}</span><button type="button" onClick={() => toggleQuestion(question._id)} aria-label={`Remove question: ${question.questionText.slice(0, 60)}`} className={`shrink-0 rounded p-1 text-text-tertiary hover:bg-error-soft hover:text-error ${interactive}`}><X className="h-3.5 w-3.5" /></button></li>)}</ul></div>)}</div>}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-text-tertiary">The assessment needs at least {requiredCount} active questions. The backend revalidates every selected question when you save and publish.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button><Button onClick={() => void saveDraft()} disabled={busy || loadingBanks || selectedIds.length < requiredCount || unavailableSelectedIds.length > 0 || activeTopicBanks.length === 0}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Save as draft</Button></div></div>
          </div>
        )}

        <div className="flex items-start gap-2 border-t border-border-muted pt-4 text-xs leading-relaxed text-text-tertiary"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Diagnostic results establish an initial baseline. They are not a substitute for topic mastery or the course final assessment. When enabled, a published diagnostic assessment is required by the course publication rules.</p></div>
      </div>
    </section>
  );
};
