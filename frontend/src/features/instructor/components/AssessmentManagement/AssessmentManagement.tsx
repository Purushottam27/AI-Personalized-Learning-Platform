import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Loader2,
  AlertCircle,
  Search,
  Archive,
  RotateCcw,
  Send,
  X,
  Pencil,
  Check,
} from 'lucide-react';
import { useTopicAssessments } from '../../hooks/useTopicAssessments';
import { useTopicQuestionBank } from '../../hooks/useTopicQuestionBank';
import { getQuestionsByBank } from '../../api/question.api';
import { AssessmentQuestionSelector } from './AssessmentQuestionSelector';
import type { CourseStatus } from '../../types/instructor.types';
import type { Assessment, AssessmentStatus, UpdateAssessmentPayload } from '../../types/assessment.types';
import type { Question } from '../../types/question.types';

interface AssessmentManagementProps {
  courseId: string;
  topicId: string;
  topicTitle: string;
  courseStatus?: CourseStatus;
}

export const AssessmentManagement: React.FC<AssessmentManagementProps> = ({
  courseId,
  topicId,
  topicTitle,
}) => {
  const {
    assessments,
    loading,
    error,
    refresh,
    handleCreate,
    handleUpdate,
    handlePublish,
    handleArchive,
    handleRestore,
  } = useTopicAssessments(topicId, courseId);

  const { bank } = useTopicQuestionBank(topicId);

  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState(5);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | ''>('');
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load questions when a bank is selected in the modal
  const handleBankChange = async (bankId: string) => {
    if (!bankId) {
      setBankQuestions([]);
      return;
    }
    try {
      setLoadingQuestions(true);
      const questions = await getQuestionsByBank(bankId);
      setBankQuestions(Array.isArray(questions) ? questions : []);
    } catch (err) {
      console.error('Failed to load questions from bank', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('CREATE');
    setActiveAssessment(null);
    setTitle(`${topicTitle} Mastery Assessment`);
    setDescription('Comprehensive evaluation of topic concepts and practical skills.');
    setQuestionsPerAttempt(5);
    setPassingScore(60);
    setMaxAttempts(1);
    setTimeLimitMinutes('');
    setRandomizeQuestions(true);
    setRandomizeOptions(false);
    setSelectedQuestionIds([]);
    if (bank?._id) {
      handleBankChange(bank._id);
    }
    setActionError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (assessment: Assessment) => {
    if (assessment.status === 'ARCHIVED') {
      setActionError('Archived assessments cannot be edited. Restore to Draft first.');
      return;
    }
    setModalMode('EDIT');
    setActiveAssessment(assessment);
    setTitle(assessment.title);
    setDescription(assessment.description || '');
    setQuestionsPerAttempt(assessment.questionsPerAttempt);
    setPassingScore(assessment.passingScore);
    setMaxAttempts(assessment.maxAttempts);
    setTimeLimitMinutes(assessment.timeLimitMinutes != null ? assessment.timeLimitMinutes : '');
    setRandomizeQuestions(assessment.randomizeQuestions ?? true);
    setRandomizeOptions(assessment.randomizeOptions ?? false);
    setSelectedQuestionIds(assessment.questionIds || []);
    if (bank?._id) {
      handleBankChange(bank._id);
    }
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setActionError('Assessment title is required.');
      return;
    }

    if (modalMode === 'CREATE') {
      if (selectedQuestionIds.length < questionsPerAttempt) {
        setActionError(
          `Please select at least ${questionsPerAttempt} questions to support the configured attempt size.`
        );
        return;
      }

      try {
        setSubmitting(true);
        setActionError(null);
        const created = await handleCreate({
          title: title.trim(),
          description: description.trim() || undefined,
          questionsPerAttempt,
          passingScore,
          maxAttempts,
          timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
          randomizeQuestions,
          randomizeOptions,
          questionIds: selectedQuestionIds,
        });
        setActionMessage(`Assessment "${created.title}" created successfully as draft.`);
        setIsModalOpen(false);
      } catch (err: any) {
        setActionError(err?.response?.data?.message || err?.message || 'Failed to create assessment.');
      } finally {
        setSubmitting(false);
      }
    } else if (modalMode === 'EDIT' && activeAssessment) {
      try {
        setSubmitting(true);
        setActionError(null);

        let payload: UpdateAssessmentPayload;
        if (activeAssessment.status === 'PUBLISHED') {
          // Published assessments permit metadata / time limit / attempt limits only
          payload = {
            title: title.trim(),
            description: description.trim() || undefined,
            maxAttempts,
            timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
          };
        } else {
          // Draft assessments permit full configuration updates
          if (selectedQuestionIds.length < questionsPerAttempt) {
            setActionError(
              `Please select at least ${questionsPerAttempt} questions to support the configured attempt size.`
            );
            setSubmitting(false);
            return;
          }
          payload = {
            title: title.trim(),
            description: description.trim() || undefined,
            questionsPerAttempt,
            passingScore,
            maxAttempts,
            timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
            randomizeQuestions,
            randomizeOptions,
            questionIds: selectedQuestionIds,
          };
        }

        const updated = await handleUpdate(activeAssessment._id, payload);
        setActionMessage(`Assessment "${updated.title}" updated successfully.`);
        setIsModalOpen(false);
      } catch (err: any) {
        setActionError(err?.response?.data?.message || err?.message || 'Failed to update assessment.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const onPublish = async (assessment: Assessment) => {
    try {
      setActionLoadingId(assessment._id);
      setActionError(null);
      await handlePublish(assessment._id);
      setActionMessage(`Assessment "${assessment.title}" published successfully.`);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to publish assessment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const onArchive = async (assessment: Assessment) => {
    try {
      setActionLoadingId(assessment._id);
      setActionError(null);
      await handleArchive(assessment._id);
      setActionMessage(`Assessment "${assessment.title}" archived successfully.`);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to archive assessment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const onRestore = async (assessment: Assessment) => {
    try {
      setActionLoadingId(assessment._id);
      setActionError(null);
      await handleRestore(assessment._id);
      setActionMessage(`Assessment "${assessment.title}" restored successfully and moved to Draft.`);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to restore assessment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (
        searchQuery &&
        !a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [assessments, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Award className="w-5 h-5 text-signal" />
            <span>Assessments</span>
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Configure passing scores, time limits, and question pools for formal topic evaluation.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
        </button>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-sage/25 bg-sage-soft px-4 py-3 text-sm text-sage animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-sage/70 hover:text-sage text-base font-bold leading-none p-1"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-error-soft border border-error/20 flex items-start gap-3 text-xs text-error">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-focus"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? 'bg-signal text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-7 h-7 text-signal animate-spin mb-2" />
          <p className="text-xs text-text-secondary">Loading topic assessments...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-surface-elevated border border-border text-center">
          <AlertCircle className="w-8 h-8 text-error mx-auto mb-2" />
          <p className="text-sm text-text-primary font-semibold">Failed to load assessments</p>
          <p className="text-xs text-text-secondary mt-1 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-elevated border border-border text-center space-y-3">
          <Award className="w-10 h-10 text-text-tertiary mx-auto opacity-50" />
          <h3 className="text-sm font-semibold text-text-primary">No assessments configured</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Create an assessment using questions from your topic question bank to verify learner mastery.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90"
          >
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssessments.map((a) => {
            const isActing = actionLoadingId === a._id;
            const statusColors: Record<string, string> = {
              DRAFT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
              PUBLISHED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
              ARCHIVED: 'bg-surface text-text-tertiary border-border',
            };

            return (
              <div
                key={a._id}
                className="rounded-2xl bg-surface-elevated border border-border p-5 flex flex-col justify-between space-y-4 hover:border-signal/30 transition-all shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
                        statusColors[a.status] || ''
                      }`}
                    >
                      {a.status}
                    </span>
                    <span className="text-xs text-text-tertiary font-mono">
                      Pool: {a.questionIds.length} Qs
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-text-primary line-clamp-1">{a.title}</h3>
                    {a.description && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center text-xs">
                    <div className="p-2 rounded-xl bg-surface">
                      <span className="text-[10px] text-text-tertiary uppercase block">Per Attempt</span>
                      <span className="font-bold text-text-primary">{a.questionsPerAttempt} Qs</span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface">
                      <span className="text-[10px] text-text-tertiary uppercase block">Pass Score</span>
                      <span className="font-bold text-text-primary">{a.passingScore}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface">
                      <span className="text-[10px] text-text-tertiary uppercase block">Time Limit</span>
                      <span className="font-bold text-text-primary">
                        {a.timeLimitMinutes ? `${a.timeLimitMinutes}m` : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Edit action */}
                    {a.status !== 'ARCHIVED' ? (
                      <button
                        disabled={isActing}
                        onClick={() => openEditModal(a)}
                        className="py-1.5 px-3 rounded-lg border border-border text-text-primary hover:bg-surface text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        title="Archived assessments must be restored to Draft before editing"
                        className="py-1.5 px-3 rounded-lg border border-border/40 text-text-tertiary text-xs font-semibold flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {a.status === 'DRAFT' && (
                      <button
                        disabled={isActing}
                        onClick={() => onPublish(a)}
                        className="py-1.5 px-3 rounded-lg bg-signal text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-opacity"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Publish</span>
                      </button>
                    )}

                    {a.status === 'PUBLISHED' && (
                      <button
                        disabled={isActing}
                        onClick={() => onArchive(a)}
                        className="py-1.5 px-3 rounded-lg border border-border text-text-secondary hover:text-error text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                        <span>Archive</span>
                      </button>
                    )}

                    {a.status === 'ARCHIVED' && (
                      <button
                        disabled={isActing}
                        onClick={() => onRestore(a)}
                        className="py-1.5 px-3 rounded-lg border border-border text-text-primary hover:bg-surface text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Restore to Draft</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Assessment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-surface-elevated border border-border rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-text-primary font-bold text-lg">
                <Award className="w-5 h-5 text-signal" />
                <h3>{modalMode === 'EDIT' ? 'Edit Topic Assessment' : 'Create Topic Assessment'}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalMode === 'EDIT' && activeAssessment?.status === 'PUBLISHED' && (
              <div className="p-3.5 rounded-xl bg-surface border border-border text-xs text-text-secondary leading-relaxed">
                <strong className="text-text-primary font-semibold">Published Assessment Notice:</strong> Core evaluation configuration (questions, attempts per session, passing score) is locked to protect active learner evaluation history. You may adjust the title, description, time limit, and increase total allowed attempts.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Relational Data Modeling Assessment"
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief guidance for learners taking this assessment..."
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-focus resize-none"
                  />
                </div>
              </div>

              {/* Assessment Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-surface border border-border">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Questions / Attempt (5-10)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={10}
                    disabled={activeAssessment?.status === 'PUBLISHED'}
                    value={questionsPerAttempt}
                    onChange={(e) => setQuestionsPerAttempt(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-xl bg-surface-elevated border border-border text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={activeAssessment?.status === 'PUBLISHED'}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-xl bg-surface-elevated border border-border text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Time Limit (mins, opt)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="None"
                    value={timeLimitMinutes}
                    onChange={(e) =>
                      setTimeLimitMinutes(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3 py-1.5 text-sm rounded-xl bg-surface-elevated border border-border text-text-primary"
                  />
                </div>
              </div>

              {/* Question Pool Selection */}
              <AssessmentQuestionSelector
                bank={bank}
                hasBank={Boolean(bank)}
                isBankLoading={false}
                availableQuestions={bankQuestions}
                isQuestionsLoading={loadingQuestions}
                selectedQuestionIds={selectedQuestionIds}
                onChangeSelectedIds={setSelectedQuestionIds}
                questionsPerAttempt={questionsPerAttempt}
                disabled={activeAssessment?.status === 'PUBLISHED'}
              />

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (modalMode === 'CREATE' && selectedQuestionIds.length < questionsPerAttempt) ||
                    (modalMode === 'EDIT' &&
                      activeAssessment?.status !== 'PUBLISHED' &&
                      selectedQuestionIds.length < questionsPerAttempt)
                  }
                  className="px-5 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : modalMode === 'EDIT' ? (
                    'Save Changes'
                  ) : (
                    'Create Assessment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
