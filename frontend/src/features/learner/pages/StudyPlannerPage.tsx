import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  RefreshCw,
  Send,
  MessageSquare,
  Settings2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useStudyPlan } from '../hooks/useStudyPlan';
import { Link } from 'react-router-dom';

export const StudyPlannerPage: React.FC = () => {
  const {
    plan,
    preferences,
    quota,
    history,
    proposedRevision,
    messages,
    isLoading,
    isSendingMessage,
    error,
    refetch,
    updatePreferences,
    generatePlan,
    proposeRevision,
    acceptRevision,
    sendMessage,
  } = useStudyPlan();

  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'TODAY' | 'ASSISTANT' | 'PREFERENCES' | 'HISTORY'>('SCHEDULE');
  const [chatInput, setChatInput] = useState('');
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);

  // Local state for preferences form
  const [dailyTime, setDailyTime] = useState<string>(preferences?.dailyStudyTime || '1-2 hours');
  const [sessionDuration, setSessionDuration] = useState<number>(preferences?.preferredSessionDuration || 45);
  const [timeOfDay, setTimeOfDay] = useState<any>(preferences?.preferredTimeOfDay || 'ANYTIME');
  const [studyDays, setStudyDays] = useState<string[]>(preferences?.studyDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);

  // Update local state when preferences load
  React.useEffect(() => {
    if (preferences) {
      setDailyTime(preferences.dailyStudyTime || '1-2 hours');
      setSessionDuration(preferences.preferredSessionDuration || 45);
      setTimeOfDay(preferences.preferredTimeOfDay || 'ANYTIME');
      setStudyDays(preferences.studyDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
    }
  }, [preferences]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPrefs(true);
    setPrefsSuccess(null);
    try {
      await updatePreferences({
        dailyStudyTime: dailyTime,
        preferredSessionDuration: Number(sessionDuration),
        preferredTimeOfDay: timeOfDay,
        studyDays,
      });
      setPrefsSuccess('Preferences updated successfully!');
      // Prompt option to regenerate plan
      await proposeRevision('Learner updated study schedule preferences');
    } catch {
      // Error handled by hook
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const toggleDay = (day: string) => {
    setStudyDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-signal animate-spin" />
        <p className="text-sm font-medium text-text-secondary">Generating personalized learning plan & schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 rounded-3xl bg-surface border border-border text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-error mx-auto" />
        <h2 className="text-lg font-bold text-text-primary">Unable to load study plan</h2>
        <p className="text-sm text-text-secondary">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Days list for weekly column view
  const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-signal uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Learning Assistant & Personalized Study Planner</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
            My Study Schedule & Guidance
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Weekly personalized learning plan adapted to your goals, enrolled courses, and learning evidence.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          {quota && (
            <div className="text-right sm:mr-1">
              <span className="text-[11px] font-medium text-text-tertiary block">
                Daily Generations: <strong className="text-text-primary">{quota.remaining}/{quota.maxAllowed}</strong> remaining
              </span>
              {quota.remaining === 0 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block">
                  Resets at UTC 00:00
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => generatePlan('Learner requested plan refresh')}
            disabled={isLoading || quota?.remaining === 0}
            title={quota?.remaining === 0 ? 'Daily plan generation limit reached (max 2 per calendar day)' : 'Regenerate study plan'}
            className="px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-text-primary hover:border-signal disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate Plan</span>
          </button>
          <button
            onClick={() => setActiveTab('PREFERENCES')}
            className="px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-text-primary hover:border-signal text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Schedule Preferences</span>
          </button>
        </div>
      </div>

      {/* Revision Proposal Alert Banner */}
      {proposedRevision && (
        <div className="p-5 rounded-2xl bg-signal-soft/30 border border-signal/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-signal font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Proposed Plan Revision Available (v{proposedRevision.proposedVersion})</span>
            </div>
            <p className="text-xs text-text-secondary">
              {proposedRevision.reason}: {proposedRevision.proposedActivities.length} updated activities recommended for this week.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => acceptRevision()}
              className="px-4 py-2 rounded-xl bg-signal text-white text-xs font-bold hover:opacity-90 shadow-xs cursor-pointer"
            >
              Accept Revision
            </button>
          </div>
        </div>
      )}

      {/* Plan Summary Metrics */}
      {plan && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-surface">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block">Plan Status</span>
            <span className="text-lg font-bold text-text-primary flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Active (v{plan.version})
            </span>
            <span className="text-[11px] text-text-tertiary mt-0.5 block">{plan.startDate} to {plan.endDate}</span>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-surface">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block">Completed</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {plan.summary.completedCount} / {plan.summary.totalScheduled}
            </span>
            <span className="text-[11px] text-text-tertiary mt-0.5 block">{plan.summary.progressPercentage}% weekly progress</span>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-surface">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block">Today's Focus</span>
            <span className="text-lg font-bold text-text-primary mt-1 block">
              {plan.todayActivities.length} Scheduled
            </span>
            <span className="text-[11px] text-text-tertiary mt-0.5 block">
              {plan.todayActivities.filter((a) => a.isCompleted).length} completed today
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-surface">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block">Daily Target</span>
            <span className="text-lg font-bold text-text-primary mt-1 block">
              {preferences?.preferredSessionDuration || 45} mins
            </span>
            <span className="text-[11px] text-text-tertiary mt-0.5 block">{preferences?.dailyStudyTime || '1-2 hours'} capacity</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('SCHEDULE')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'SCHEDULE'
              ? 'bg-signal text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          Weekly Schedule
        </button>
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'TODAY'
              ? 'bg-signal text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          <span>Today's Focus</span>
          {plan?.todayActivities && plan.todayActivities.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'TODAY' ? 'bg-white/20 text-white' : 'bg-signal-soft text-signal'}`}>
              {plan.todayActivities.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ASSISTANT')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'ASSISTANT'
              ? 'bg-signal text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab('PREFERENCES')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'PREFERENCES'
              ? 'bg-signal text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'HISTORY'
              ? 'bg-signal text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          Plan History ({history.length})
        </button>
      </div>

      {/* TAB 1: WEEKLY SCHEDULE (VERTICAL DAY-BY-DAY CARDS) */}
      {activeTab === 'SCHEDULE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-wider">
              Weekly Timeline ({plan?.startDate} to {plan?.endDate})
            </h2>
            <span className="text-xs text-text-tertiary">
              {plan?.summary.totalScheduled || 0} scheduled sessions
            </span>
          </div>

          <div className="space-y-4">
            {allDays.map((day) => {
              const dayActivities = plan?.scheduledActivities.filter((a) => a.dayOfWeek === day) || [];
              const isToday = plan?.todayActivities.some((a) => a.dayOfWeek === day);
              const dayTotalMinutes = dayActivities.reduce((acc, a) => acc + (a.estimatedDurationMinutes || 0), 0);

              return (
                <div
                  key={day}
                  className={`rounded-2xl border transition-all duration-150 ${
                    isToday
                      ? 'border-signal bg-surface shadow-xs ring-1 ring-signal/30'
                      : 'border-border bg-surface'
                  }`}
                >
                  {/* Day Header Row */}
                  <div className="px-5 py-3.5 border-b border-border/70 flex flex-wrap items-center justify-between gap-2 bg-surface-elevated/40 rounded-t-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-signal text-white px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                      {dayActivities.length > 0 && dayActivities[0]?.scheduledDate && (
                        <span className="text-xs text-text-tertiary">
                          • {dayActivities[0].scheduledDate}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {dayActivities.length > 0 ? (
                        <span>
                          {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'} ({dayTotalMinutes}m)
                        </span>
                      ) : (
                        <span className="text-text-tertiary italic">Rest / Flex Day</span>
                      )}
                    </div>
                  </div>

                  {/* Day Activities List */}
                  <div className="p-4">
                    {dayActivities.length === 0 ? (
                      <div className="py-4 text-center text-xs text-text-tertiary">
                        No scheduled activities for this day. Free time for self-directed review, projects, or rest.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dayActivities.map((act) => {
                          const isComplete = act.actualStatus === 'COMPLETED';
                          const isMissed = act.actualStatus === 'MISSED';

                          return (
                            <div
                              key={act.activityId}
                              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                                isComplete
                                  ? 'border-emerald-500/20 bg-emerald-500/5'
                                  : isMissed
                                  ? 'border-amber-500/20 bg-amber-500/5'
                                  : 'border-border bg-surface-elevated/60 hover:border-signal/40'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-signal bg-signal-soft px-2 py-0.5 rounded">
                                    {act.activityType}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-xs">
                                    {isComplete && (
                                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                                      </span>
                                    )}
                                    {isMissed && (
                                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" /> Missed
                                      </span>
                                    )}
                                    <span className="text-[11px] text-text-tertiary">
                                      {act.estimatedDurationMinutes}m
                                    </span>
                                  </div>
                                </div>

                                <h4 className="text-sm font-bold text-text-primary line-clamp-1">
                                  {act.title}
                                </h4>
                                <p className="text-xs text-text-secondary line-clamp-2">
                                  {act.rationale}
                                </p>
                                <span className="text-[11px] text-text-tertiary block pt-0.5">
                                  Course: {act.courseTitle}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                                <span className="text-[11px] text-text-tertiary">
                                  {act.durationAllocationType === 'ESTIMATED' ? 'Exact lesson/exam duration' : 'Targeted session'}
                                </span>
                                <Link
                                  to={act.actionUrl}
                                  className="text-xs font-semibold text-signal hover:underline inline-flex items-center gap-1"
                                >
                                  {isComplete ? 'Review Activity' : 'Start Session'}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TODAY'S FOCUS (ACCESSIBLE SURFACE-BASED CARD) */}
      {activeTab === 'TODAY' && (
        <div className="space-y-6 max-w-4xl">
          {plan?.nextActivity ? (
            <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-signal" />
                  <span className="text-xs font-bold uppercase tracking-wider text-signal">
                    Next Recommended Activity
                  </span>
                </div>
                <span className="text-xs text-text-tertiary">
                  Est. Duration: <strong>{plan.nextActivity.estimatedDurationMinutes} mins</strong>
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-signal bg-signal-soft px-2 py-0.5 rounded uppercase">
                    {plan.nextActivity.activityType}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {plan.nextActivity.courseTitle}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display text-text-primary">
                  {plan.nextActivity.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {plan.nextActivity.rationale}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to={plan.nextActivity.actionUrl}
                  className="px-5 py-2.5 rounded-xl bg-signal text-white font-bold text-xs inline-flex items-center gap-2 hover:opacity-95 transition-opacity shadow-xs cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Begin Activity ({plan.nextActivity.estimatedDurationMinutes} mins)</span>
                </Link>
                <button
                  onClick={() => {
                    setActiveTab('ASSISTANT');
                    sendMessage(`Why was "${plan.nextActivity?.title}" scheduled for me today?`, plan.nextActivity?.activityId);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-text-secondary hover:text-text-primary text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-signal" />
                  <span>Ask Assistant About This</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-border bg-surface text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-text-primary">All Caught Up for Today!</h3>
              <p className="text-xs text-text-secondary">
                You have completed all scheduled study activities for today. Feel free to explore new courses or review previous lessons.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              All Scheduled Activities for Today ({plan?.todayActivities.length || 0})
            </h3>
            {(!plan?.todayActivities || plan.todayActivities.length === 0) ? (
              <div className="p-8 text-center text-xs text-text-tertiary bg-surface rounded-2xl border border-border">
                No scheduled activities for today. Take time to review previous notes or explore new topics!
              </div>
            ) : (
              plan.todayActivities.map((act) => (
                <div
                  key={act.activityId}
                  className="p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-signal bg-signal-soft px-2 py-0.5 rounded uppercase">
                        {act.activityType}
                      </span>
                      {act.isCompleted && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {act.isUntrackedCompletion && (
                        <span className="text-[10px] font-medium text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded">
                          Self-paced lesson
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-text-primary">{act.title}</h4>
                    <p className="text-xs text-text-secondary">{act.rationale}</p>
                    <span className="text-[11px] text-text-tertiary block">
                      Course: {act.courseTitle} • Est. Time: {act.estimatedDurationMinutes} mins
                    </span>
                  </div>

                  <div className="shrink-0">
                    <Link
                      to={act.actionUrl}
                      className="px-4 py-2 rounded-xl bg-surface-elevated border border-border hover:border-signal text-text-primary font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>{act.isCompleted ? 'Review Content' : 'Start Activity'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI LEARNING ASSISTANT CONVERSATION */}
      {activeTab === 'ASSISTANT' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-2xl border border-border bg-surface text-xs text-text-secondary flex items-start gap-2">
            <Info className="w-4 h-4 text-signal shrink-0 mt-0.5" />
            <span>
              Your AI Learning Assistant is grounded in your active course enrollments and study schedule. It can explain why activities were chosen, help review tricky concepts, and provide reassurance if you missed study days.
            </span>
          </div>

          {/* Messages Container */}
          <div className="p-6 rounded-3xl border border-border bg-surface min-h-[380px] max-h-[500px] overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-text-tertiary">
                <MessageSquare className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-sm font-semibold">How can I assist your learning today?</p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    onClick={() => sendMessage("Why was today's next activity recommended for me?")}
                    className="text-xs bg-surface-elevated border border-border px-3 py-1.5 rounded-xl hover:border-signal text-text-secondary cursor-pointer"
                  >
                    "Why was today's activity recommended?"
                  </button>
                  <button
                    onClick={() => sendMessage("I missed my study session yesterday, what should I do now?")}
                    className="text-xs bg-surface-elevated border border-border px-3 py-1.5 rounded-xl hover:border-signal text-text-secondary cursor-pointer"
                  >
                    "I missed a session, how do I catch up?"
                  </button>
                  <button
                    onClick={() => sendMessage("Can you give me key study tips for my upcoming topic assessment?")}
                    className="text-xs bg-surface-elevated border border-border px-3 py-1.5 rounded-xl hover:border-signal text-text-secondary cursor-pointer"
                  >
                    "Tips for my topic assessment"
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl text-xs space-y-1 ${
                        isUser
                          ? 'bg-signal text-white rounded-br-xs'
                          : 'bg-surface-elevated border border-border text-text-primary rounded-bl-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[10px] block opacity-70">
                          {isUser ? 'You' : 'AI Learning Assistant'}
                        </span>
                        {!isUser && m.metadata?.fallbackUsed && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-tertiary">
                            Pedagogical Guide
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            {isSendingMessage && (
              <div className="flex justify-start">
                <div className="bg-surface-elevated border border-border px-4 py-2.5 rounded-2xl text-xs text-text-tertiary flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-signal" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask your assistant about your schedule, concepts, or activities..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl border border-border bg-surface text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
            <button
              type="submit"
              disabled={isSendingMessage || !chatInput.trim()}
              className="px-5 py-3 rounded-2xl bg-signal text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed hover:opacity-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: SCHEDULE PREFERENCES */}
      {activeTab === 'PREFERENCES' && (
        <form onSubmit={handleSavePreferences} className="max-w-2xl space-y-6">
          <div className="p-6 rounded-3xl border border-border bg-surface space-y-6 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-text-primary">Weekly Study Preferences</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Adjust your target session lengths and study days to help the planner organize manageable weekly learning.
              </p>
            </div>

            {prefsSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                {prefsSuccess}
              </div>
            )}

            {/* Study Days */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                Preferred Study Days
              </label>
              <div className="flex flex-wrap gap-2">
                {allDays.map((d) => {
                  const isSelected = studyDays.includes(d);
                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-signal text-white border-signal'
                          : 'bg-surface-elevated text-text-secondary border-border hover:border-signal/50'
                      }`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session Duration */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                Preferred Session Duration (Minutes)
              </label>
              <select
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes (Recommended)</option>
                <option value={60}>60 Minutes</option>
                <option value={90}>90 Minutes</option>
                <option value={120}>120 Minutes</option>
              </select>
            </div>

            {/* Daily Capacity */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                Daily Study Capacity
              </label>
              <select
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium"
              >
                <option value="Less than 1 hour">Less than 1 hour</option>
                <option value="1-2 hours">1-2 hours</option>
                <option value="2-3 hours">2-3 hours</option>
                <option value="3-4 hours">3-4 hours</option>
                <option value="5 or more hours">5 or more hours</option>
              </select>
            </div>

            {/* Preferred Time of Day */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                Preferred Study Time
              </label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium"
              >
                <option value="ANYTIME">Flexible / Anytime</option>
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
                <option value="NIGHT">Night</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPrefs}
                className="px-5 py-2.5 rounded-xl bg-signal text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingPrefs ? 'Saving Preferences...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: PLAN HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Previous Study Plan Versions ({history.length})
          </h3>
          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-tertiary bg-surface rounded-2xl border border-border">
              No previous plan versions recorded.
            </div>
          ) : (
            history.map((h) => (
              <div
                key={h.planId}
                className="p-4 rounded-2xl border border-border bg-surface flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-text-primary">Plan Version {h.version}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${h.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-elevated text-text-tertiary'}`}>
                      {h.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-tertiary block">
                    {h.startDate} to {h.endDate} • {h.totalActivities} scheduled activities
                  </span>
                  {h.revisionReason && (
                    <span className="text-[11px] text-text-secondary italic block pt-0.5">
                      Reason: {h.revisionReason}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-text-tertiary">
                  {new Date(h.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
