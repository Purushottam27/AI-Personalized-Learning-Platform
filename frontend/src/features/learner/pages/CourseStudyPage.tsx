import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Award, BookOpen, Brain, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Code2, Download, ExternalLink, FileText, GraduationCap, Info, Layers3, Lightbulb, ListChecks, Loader2, PanelRightOpen, Sparkles, TriangleAlert } from 'lucide-react';
import { getCourseDetail, getCourseTopics, getTopicLessons, getTopicResources } from '../api/course.api';
import { getMyEnrollments } from '../api/enrollment.api';
import api from '../../../lib/axios';
import type { LearnerCourseItem } from '../types/course.types';
import type { Topic } from '../../instructor/types/topic.types';
import type { Lesson } from '../../instructor/types/lesson.types';
import type { Resource } from '../../instructor/types/resource.types';
import type { Assessment } from '../../instructor/types/assessment.types';

type PracticeItem = { _id: string; title: string; description?: string; questionCount?: number; contributeToLearningEvidence?: boolean };
type View = 'COURSE' | 'TOPIC' | 'LESSON';
type TopicActivityData = { lessons: Lesson[]; resources: Resource[]; practices: PracticeItem[]; assessments: Assessment[] };
const surface = 'rounded-2xl border border-border bg-surface-elevated';
const action = 'cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export const CourseStudyPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resumeTopicId = params.get('topicId');
  const [course, setCourse] = useState<LearnerCourseItem | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [practices, setPractices] = useState<PracticeItem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [view, setView] = useState<View>('COURSE');
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activityCache, setActivityCache] = useState<Record<string, TopicActivityData>>({});
  const [activityLoading, setActivityLoading] = useState<Set<string>>(new Set());
  const resumeHandled = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicLoading, setTopicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openResource = async (resourceId: string, targetUrl: string, uploaded = false) => {
    // Open a temporary tab synchronously from the click so popup blockers do not
    // block navigation while the learner access event and secure URL are fetched.
    const openedWindow = window.open('about:blank', '_blank');
    try {
      await api.post(`/resources/${resourceId}/access`);
      let destination = targetUrl;
      if (uploaded) {
        const response = await api.get<{ data: { url: string } }>(`/resources/${resourceId}/file`);
        destination = response.data.data.url;
      }
      if (openedWindow && destination) openedWindow.location.href = destination;
      else if (!openedWindow) setError('Your browser blocked the resource tab. Allow pop-ups for Learnova and try again.');
    } catch (openError: any) {
      openedWindow?.close();
      setError(openError?.response?.data?.message || 'Unable to open this learning resource. Please try again.');
      console.error('Unable to open learning resource', openError);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!courseId) return;
      try {
        setLoading(true); setError(null);
        const enrollments = await getMyEnrollments();
        if (!enrollments.some((item) => item.courseId === courseId && item.status === 'ACTIVE')) {
          navigate(`/learner/courses/${courseId}`, { replace: true }); return;
        }
        const [courseData, topicData] = await Promise.all([getCourseDetail(courseId), getCourseTopics(courseId)]);
        if (!active) return;
        const ordered = Array.isArray(topicData) ? [...topicData].sort((a, b) => a.order - b.order) : [];
        setCourse(courseData); setTopics(ordered);
        const resumeTopic = ordered.find((item) => item._id === resumeTopicId);
        if (resumeTopic) { setTopic(resumeTopic); setView('TOPIC'); setExpanded(new Set([resumeTopic._id])); }
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || 'Failed to load the course workspace.');
      } finally { if (active) setLoading(false); }
    };
    void init(); return () => { active = false; };
  }, [courseId, navigate, resumeTopicId]);

  const fetchTopicActivities = useCallback(async (selected: Topic): Promise<TopicActivityData> => {
    const [lessonData, resourceData, practiceResponse, assessmentResponse] = await Promise.all([
      getTopicLessons(selected._id), getTopicResources(selected._id),
      api.get<{ data: PracticeItem[] }>(`/topics/${selected._id}/practices`),
      api.get<{ data: Assessment[] }>(`/topics/${selected._id}/assessments`),
    ]);
    return {
      lessons: Array.isArray(lessonData) ? [...lessonData].sort((a, b) => a.order - b.order) : [],
      resources: Array.isArray(resourceData) ? resourceData : [],
      practices: Array.isArray(practiceResponse.data.data) ? practiceResponse.data.data : [],
      assessments: Array.isArray(assessmentResponse.data.data)
        ? assessmentResponse.data.data.filter((item) => item.type === 'TOPIC' && item.status === 'PUBLISHED')
        : [],
    };
  }, []);

  const loadTopic = useCallback(async (selected: Topic) => {
    setTopic(selected); setView('TOPIC'); setCurriculumOpen(false);
    setExpanded((old) => new Set(old).add(selected._id));
    try {
      setTopicLoading(true); setError(null);
      const data = activityCache[selected._id] || await fetchTopicActivities(selected);
      setActivityCache((old) => ({ ...old, [selected._id]: data }));
      setLessons(data.lessons); setResources(data.resources); setPractices(data.practices); setAssessments(data.assessments);
      setLesson((current) => data.lessons.find((item) => item._id === current?._id) || data.lessons[0] || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load all learning activities for this topic.');
      setLessons([]); setResources([]); setPractices([]); setAssessments([]); setLesson(null);
    } finally { setTopicLoading(false); }
  }, [activityCache, fetchTopicActivities]);

  const toggleExpanded = async (selected: Topic) => {
    const isCurrentlyExpanded = expanded.has(selected._id);
    setExpanded((old) => { const next = new Set(old); isCurrentlyExpanded ? next.delete(selected._id) : next.add(selected._id); return next; });
    if (isCurrentlyExpanded || activityCache[selected._id]) return;
    setActivityLoading((old) => new Set(old).add(selected._id));
    try {
      const data = await fetchTopicActivities(selected);
      setActivityCache((old) => ({ ...old, [selected._id]: data }));
    } catch (err: any) {
      setError(err?.response?.data?.message || `Unable to load activities for ${selected.title}.`);
    } finally {
      setActivityLoading((old) => { const next = new Set(old); next.delete(selected._id); return next; });
    }
  };

  useEffect(() => {
    if (!resumeTopicId || !topics.length || resumeHandled.current === resumeTopicId) return;
    const resumeTopic = topics.find((item) => item._id === resumeTopicId);
    if (!resumeTopic) return;
    resumeHandled.current = resumeTopicId;
    void loadTopic(resumeTopic);
  }, [loadTopic, resumeTopicId, topics]);

  useEffect(() => {
    if (!curriculumOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [curriculumOpen]);

  const topicIndex = useMemo(() => topic ? topics.findIndex((item) => item._id === topic._id) : -1, [topic, topics]);
  const openLesson = (selected: Lesson) => { setLesson(selected); setView('LESSON'); setCurriculumOpen(false); };
  const openPractice = (id: string) => navigate(`/learner/practices/${id}`);
  const openAssessment = (id: string, assessmentId?: string) => navigate(`/learner/assessments/${id}${assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : ''}`);
  useEffect(() => {
    if (!curriculumOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setCurriculumOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [curriculumOpen]);


  const renderContent = (item: Lesson) => {
    const headings = (item.content || []).reduce<Array<{ id: string; title: string }>>((result, block, index) => {
      if (block.type === 'HEADING') result.push({ id: `lesson-section-${index}`, title: block.content });
      return result;
    }, []);

    const calloutStyles: Record<string, { wrapper: string; icon: React.ReactNode; label: string }> = {
      INFO: { wrapper: 'border-sky-500/25 bg-sky-500/[0.06]', icon: <Info className="h-4 w-4" />, label: 'Remember' },
      TIP: { wrapper: 'border-sage/30 bg-sage/[0.07]', icon: <Lightbulb className="h-4 w-4" />, label: 'Learning tip' },
      WARNING: { wrapper: 'border-amber-500/30 bg-amber-500/[0.07]', icon: <TriangleAlert className="h-4 w-4" />, label: 'Be careful' },
      IMPORTANT: { wrapper: 'border-signal/30 bg-signal/[0.07]', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Key takeaway' },
    };

    return <div className="mx-auto max-w-5xl">
      {item.description && <div className="mb-7 rounded-2xl border border-signal/15 bg-gradient-to-br from-signal/[0.07] via-surface to-surface p-5 md:p-7">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-signal"><Sparkles className="h-3.5 w-3.5"/>Lesson overview</div>
        <p className="max-w-4xl text-base font-medium leading-8 text-text-primary md:text-lg">{item.description}</p>
      </div>}

      {headings.length > 1 && <nav aria-label="On this lesson" className="mb-8 rounded-2xl border border-border bg-surface p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-text-primary"><ListChecks className="h-4 w-4 text-signal"/>In this lesson</div>
        <div className="grid gap-2 sm:grid-cols-2">{headings.map((heading, index) => <button key={heading.id} type="button" onClick={() => document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={`${action} flex min-w-0 items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text-secondary hover:bg-surface-elevated hover:text-signal`}><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-signal/10 text-[10px] font-bold text-signal">{index + 1}</span><span className="min-w-0 leading-5">{heading.title}</span></button>)}</div>
      </nav>}

      <div className="space-y-7 md:space-y-9">
        {item.content?.length ? item.content.map((block, index) => {
          switch (block.type) {
            case 'HEADING': return <section id={`lesson-section-${index}`} key={index} className="scroll-mt-28 border-b border-border/70 pb-3 pt-2 last:border-0">
              {block.level === 2
                ? <h2 className="flex items-start gap-3 font-serif text-2xl font-bold leading-tight text-text-primary md:text-[1.8rem]"><span className="mt-1.5 h-6 w-1 shrink-0 rounded-full bg-signal"/>{block.content}</h2>
                : <h3 className="font-serif text-xl font-bold leading-snug text-text-primary md:text-2xl">{block.content}</h3>}
            </section>;
            case 'TEXT': return <p key={index} className="max-w-4xl whitespace-pre-line text-[15px] leading-8 text-text-secondary md:text-base md:leading-9">{block.content}</p>;
            case 'CODE': return <div key={index} className="overflow-hidden rounded-2xl border border-border bg-[#171614] shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="flex items-center gap-2 text-xs font-semibold text-white/80"><Code2 className="h-4 w-4 text-signal"/>Code example</span><span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/60">{block.language || 'Code'}</span></div>
              <pre className="overflow-x-auto p-5 text-sm leading-7 text-[#F4F0E8]"><code>{block.content}</code></pre>
            </div>;
            case 'CALLOUT': { const style = calloutStyles[block.variant] || calloutStyles.INFO; return <aside key={index} className={`rounded-2xl border p-5 md:p-6 ${style.wrapper}`}><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-text-primary">{style.icon}{style.label}</div><p className="whitespace-pre-line text-sm leading-7 text-text-primary md:text-base">{block.content}</p></aside>; }
            case 'LIST': { const ListTag = block.style === 'NUMBERED' ? 'ol' : 'ul'; return <div key={index} className="rounded-2xl border border-border bg-surface p-5 md:p-6"><ListTag className={`${block.style === 'NUMBERED' ? 'list-decimal marker:font-semibold marker:text-signal' : 'list-disc marker:text-signal'} space-y-3 pl-6 text-[15px] leading-7 text-text-secondary md:text-base`}>{block.items.map((entry, i) => <li key={i} className="pl-1.5">{entry}</li>)}</ListTag></div>; }
            case 'IMAGE': return <figure key={index} className="overflow-hidden rounded-2xl border border-border bg-surface p-2"><img src={block.url} alt={block.alt} loading="lazy" className="mx-auto max-h-[560px] w-full rounded-xl object-contain"/>{block.alt && <figcaption className="px-3 py-2 text-center text-xs text-text-tertiary">{block.alt}</figcaption>}</figure>;
            case 'VIDEO': return <div key={index} className="overflow-hidden rounded-2xl border border-border bg-black"><div className="flex items-center gap-2 bg-surface px-4 py-3 text-xs font-semibold text-text-primary"><BookOpen className="h-4 w-4 text-signal"/>{block.title || 'Lesson video'}</div><div className="aspect-video"><iframe src={block.url} title={block.title || 'Lesson video'} className="h-full w-full" allowFullScreen loading="lazy"/></div></div>;
            default: return null;
          }
        }) : <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-text-tertiary"/><p className="text-sm font-semibold text-text-primary">Lesson content is being prepared</p><p className="mt-1 text-xs text-text-tertiary">There is no written content available for this lesson yet.</p></div>}
      </div>
    </div>;
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-text-secondary"><Loader2 className="h-6 w-6 animate-spin text-signal"/>Preparing your learning workspace...</div>;
  if (!course) return <div className={`${surface} mx-auto mt-8 max-w-2xl p-8 text-center`}><AlertCircle className="mx-auto mb-3 h-9 w-9 text-error"/><h2 className="text-xl font-bold text-text-primary">Course workspace unavailable</h2><p className="mt-2 text-sm text-text-secondary">{error || 'The course could not be loaded.'}</p><button onClick={() => navigate('/learner/courses')} className={`${action} mt-5 rounded-xl bg-signal px-5 py-2.5 text-sm font-semibold text-white`}>Back to My Courses</button></div>;

  const lessonIndex = lesson ? lessons.findIndex((item) => item._id === lesson._id) : -1;
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  return <div className="relative min-h-[calc(100vh-7rem)] pb-16">
    <header className="mb-8 flex items-start gap-4 border-b border-border pb-6 md:mb-9 md:pb-7">
      <button aria-label="Back to course details" onClick={() => navigate(`/learner/courses/${courseId}`)} className={`${action} mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-surface-elevated hover:text-signal`}><ArrowLeft className="h-[18px] w-[18px]"/></button>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-signal">Learning workspace</p>
        <h1 className="mt-1 truncate font-serif text-2xl font-bold leading-tight text-text-primary md:text-3xl">{course.title}</h1>
        <p className="mt-2 text-xs font-medium text-text-tertiary md:text-sm">{course.domain} <span className="px-1.5 text-border">·</span> {topics.length} topics</p>
      </div>
    </header>
    {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-error/25 bg-error-soft p-3 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}

    {view === 'COURSE' && <section className="space-y-7">
      <div className={`${surface} relative overflow-hidden p-7 md:p-10`}><div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-signal/10 blur-3xl"/><p className="relative text-xs font-bold uppercase tracking-[0.18em] text-signal">Your learning journey</p><h2 className="relative mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight text-text-primary md:text-4xl">{course.title}</h2>{course.description && <p className="relative mt-4 max-w-3xl text-sm leading-7 text-text-secondary md:text-base">{course.description}</p>}<div className="relative mt-7 flex flex-wrap gap-3"><button disabled={!topics.length} onClick={() => topics[0] && void loadTopic(topics[0])} className={`${action} inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50`}><BookOpen className="h-4 w-4"/>Start learning<ArrowRight className="h-4 w-4"/></button><button onClick={() => setCurriculumOpen(true)} className={`${action} rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface`}>Explore curriculum</button></div></div>
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-signal">Course curriculum</p><h3 className="mt-1 font-serif text-2xl font-bold text-text-primary">Explore your topics</h3></div><span className="text-xs text-text-tertiary">{topics.length} topics</span></div>
      <div className="grid gap-4 md:grid-cols-2">{topics.map((item, index) => <button key={item._id} onClick={() => void loadTopic(item)} className={`${action} group ${surface} p-5 text-left hover:-translate-y-0.5 hover:border-signal/40 hover:shadow-lg`}><div className="flex items-center justify-between"><span className="rounded-lg bg-signal/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-signal">Topic {String(index + 1).padStart(2,'0')}</span><ArrowRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1 group-hover:text-signal"/></div><h4 className="mt-4 text-lg font-bold text-text-primary">{item.title}</h4>{item.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{item.description}</p>}<p className="mt-5 text-xs font-semibold text-signal">Open topic workspace</p></button>)}</div>
      {!topics.length && <div className={`${surface} p-8 text-sm text-text-secondary`}>No topics are currently available in this course.</div>}
      <FinalAssessmentEntry courseId={courseId!} onOpen={() => navigate(`/learner/courses/${courseId}/final-assessment`)}/>
    </section>}

    {view === 'TOPIC' && topic && <section className="space-y-7">
      <div className={`${surface} p-6 md:p-8`}><div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-signal">Topic {topicIndex + 1}<span className="text-text-tertiary">·</span>{course.title}</div><h2 className="mt-3 font-serif text-3xl font-bold text-text-primary">{topic.title}</h2>{topic.description && <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary md:text-base">{topic.description}</p>}<div className="mt-6 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-border bg-surface px-3 py-1.5 text-text-secondary">{lessons.length} lessons</span><span className="rounded-full border border-border bg-surface px-3 py-1.5 text-text-secondary">{practices.length} practice sets</span><span className="rounded-full border border-border bg-surface px-3 py-1.5 text-text-secondary">{assessments.length} assessments</span></div></div>
      {topicLoading ? <div className={`${surface} flex min-h-48 items-center justify-center gap-3 text-sm text-text-secondary`}><Loader2 className="h-5 w-5 animate-spin text-signal"/>Loading topic activities...</div> : <>
        <ActivitySection icon={<BookOpen/>} title="Lessons" subtitle="Build your understanding step by step" count={lessons.length}>{lessons.map((item, index) => <button key={item._id} onClick={() => openLesson(item)} className={`${action} group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-signal/40 hover:bg-surface-elevated`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal/10 text-xs font-bold text-signal">{String(index+1).padStart(2,'0')}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{item.title}</span><span className="mt-1 block text-xs text-text-tertiary">Lesson {index+1}</span></span><ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-signal"/></button>)}{!lessons.length && <Empty text="No lessons are available for this topic yet."/>}</ActivitySection>
        <ActivitySection icon={<Brain/>} title="Practice" subtitle="Strengthen your understanding with practice sets" count={practices.length}>{practices.map((item) => <button key={item._id} onClick={() => openPractice(item._id)} className={`${action} group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-signal/40 hover:bg-surface-elevated`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage"><Layers3 className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{item.title}</span><span className="mt-1 block text-xs text-text-tertiary">{typeof item.questionCount === 'number' ? `${item.questionCount} questions` : 'Practice set'}{item.contributeToLearningEvidence ? ' · Contributes to learning evidence' : ''}</span></span><span className="text-xs font-semibold text-signal">Start <ChevronRight className="inline h-3.5 w-3.5"/></span></button>)}{!practices.length && <Empty text="No published practice sets are available for this topic yet."/>}</ActivitySection>
        <ActivitySection icon={<ClipboardCheck/>} title="Topic assessments" subtitle="Evaluate your understanding of this topic" count={assessments.length}>{assessments.map((item) => <button key={item._id} onClick={() => openAssessment(topic._id, item._id)} className={`${action} group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-signal/40 hover:bg-surface-elevated`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal/10 text-signal"><Award className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{item.title}</span><span className="mt-1 block text-xs text-text-tertiary">{item.questionsPerAttempt} questions · Pass score {item.passingScore}%</span></span><ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-signal"/></button>)}{!assessments.length && <Empty text="No published topic assessments are available yet."/>}</ActivitySection>
      </>}
      {resources.length > 0 && <ActivitySection icon={<Sparkles/>} title="Study resources" subtitle="Additional material for this topic" count={resources.length}><div className="grid gap-3 sm:grid-cols-2">{resources.map((item) => <div key={item._id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3.5"><FileText className="h-5 w-5 shrink-0 text-signal"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text-primary">{item.title}</p><p className="text-[10px] uppercase tracking-wide text-text-tertiary">{item.type}</p></div>{item.url ? <button type="button" aria-label={`Open ${item.title}`} onClick={() => openResource(item._id, item.url!)} className={`${action} rounded-lg border border-border p-2 text-text-secondary hover:text-signal`}><ExternalLink className="h-4 w-4"/></button> : <button type="button" aria-label={`Download ${item.title}`} onClick={() => openResource(item._id, '', true)} className={`${action} rounded-lg border border-border p-2 text-text-secondary hover:text-signal`}><Download className="h-4 w-4"/></button>}</div>)}</div></ActivitySection>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        {topicIndex > 0 ? <button onClick={() => void loadTopic(topics[topicIndex-1])} className={`${action} inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary hover:border-signal/40 hover:bg-surface hover:text-text-primary`}><ChevronLeft className="h-4 w-4"/>Previous topic</button> : <button onClick={() => {setView('COURSE');setTopic(null);setLesson(null);}} className={`${action} inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary hover:border-signal/40 hover:bg-surface hover:text-text-primary`}><ChevronLeft className="h-4 w-4"/>Learning workspace</button>}
        {topics[topicIndex+1] && <button onClick={() => void loadTopic(topics[topicIndex+1])} className={`${action} inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105`}>Next topic<ArrowRight className="h-4 w-4"/></button>}
      </div>
    </section>}

    {view === 'LESSON' && topic && lesson && <section className="space-y-6 md:space-y-8">
      <div className={`${surface} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-7">
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => setView('TOPIC')} className={`${action} mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-signal hover:bg-signal/10`}><ChevronLeft className="h-3.5 w-3.5"/>Back to topic</button>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary"><span className="rounded-md bg-signal/10 px-2 py-1 text-signal">Topic {String(topicIndex+1).padStart(2,'0')}</span><span>Lesson {lessonIndex+1} of {lessons.length}</span></div>
            <h2 className="max-w-4xl font-serif text-2xl font-bold leading-tight text-text-primary md:text-3xl">{lesson.title}</h2>
          </div>
          <button type="button" onClick={() => setCurriculumOpen(true)} className={`${action} inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary hover:border-signal/35 hover:bg-surface-elevated`}><PanelRightOpen className="h-4 w-4 text-signal"/>Course contents</button>
        </div>
        <div className="h-1 bg-border"><div className="h-full bg-signal transition-all" style={{ width: `${lessons.length ? ((lessonIndex+1)/lessons.length)*100 : 0}%` }}/></div>
      </div>

      <article className={`${surface} p-4 md:p-7 lg:p-9`}>
        {renderContent(lesson)}
        {resources.length > 0 && <section className="mt-10 border-t border-border pt-7 md:mt-12 md:pt-9">
          <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-signal">Continue exploring</p><h3 className="mt-1 font-serif text-xl font-bold text-text-primary">Related learning resources</h3><p className="mt-1 text-xs leading-5 text-text-tertiary">Use these materials to review and reinforce this topic.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{resources.map((item) => <button key={item._id} type="button" onClick={() => void openResource(item._id, item.url || '', item.source === 'UPLOAD' || !item.url)} className={`${action} group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left hover:border-signal/40 hover:bg-surface-elevated`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal/10 text-signal"><FileText className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text-primary">{item.title}</span><span className="mt-1 block text-[10px] uppercase tracking-wide text-text-tertiary">{item.type || 'Learning material'}</span></span><ExternalLink className="h-4 w-4 shrink-0 text-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-signal"/></button>)}</div>
        </section>}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={!previousLesson} onClick={() => previousLesson && openLesson(previousLesson)} className={`${action} inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-secondary hover:border-signal/35 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40`}><ChevronLeft className="h-4 w-4"/>Previous lesson</button>
        <button type="button" disabled={!nextLesson} onClick={() => nextLesson && openLesson(nextLesson)} className={`${action} inline-flex min-h-11 items-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40`}>Next lesson<ChevronRight className="h-4 w-4"/></button>
      </div>
      {!nextLesson && <div className={`${surface} flex flex-wrap items-center justify-between gap-3 p-5`}><div><p className="text-sm font-semibold text-text-primary">You've reached the end of this topic's lessons.</p><p className="mt-1 text-xs text-text-secondary">Continue with practice or review the topic assessments.</p></div><button type="button" onClick={() => setView('TOPIC')} className={`${action} rounded-xl bg-signal px-4 py-2.5 text-xs font-semibold text-white hover:brightness-105`}>Explore topic activities</button></div>}
    </section>}

    <div className={`fixed inset-0 z-[100] ${curriculumOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!curriculumOpen}>
      <button aria-label="Close curriculum backdrop" tabIndex={curriculumOpen ? 0 : -1} onClick={() => setCurriculumOpen(false)} className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${curriculumOpen ? 'opacity-100' : 'opacity-0'}`}/>
      <aside aria-label="Course curriculum" aria-modal="true" role="dialog" className={`absolute inset-y-0 right-0 flex w-[min(92vw,440px)] flex-col border-l border-border bg-surface-elevated shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:w-[clamp(340px,32vw,440px)] ${curriculumOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <button aria-label={curriculumOpen ? 'Close curriculum' : 'Open curriculum'} aria-expanded={curriculumOpen} onClick={() => setCurriculumOpen((open) => !open)} className={`${action} absolute -left-10 top-1/2 z-10 flex h-11 w-10 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-border bg-surface-elevated text-text-secondary shadow-lg hover:text-signal`}><span className="sr-only">Toggle course curriculum</span>{curriculumOpen ? <ChevronRight className="h-5 w-5"/> : <ChevronLeft className="h-5 w-5"/>}</button>
        <div className="flex items-center justify-between border-b border-border px-5 py-5 md:px-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-signal">Learning path</p><h2 className="mt-1 font-serif text-xl font-bold text-text-primary">Course curriculum</h2></div>
          <span className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-tertiary">{topics.length} topics</span>
        </div>
        <div className="border-b border-border px-5 py-3 md:px-6"><p className="line-clamp-2 text-sm font-semibold text-text-primary">{course.title}</p><p className="mt-1 text-[11px] text-text-tertiary">Select a topic or jump directly to an activity</p></div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 md:p-4">
          {topics.map((item,index) => {
            const isOpen=expanded.has(item._id); const selected=topic?._id===item._id; const data=activityCache[item._id]; const isLoading=activityLoading.has(item._id);
            const activityButton=(id:string,label:string,icon:React.ReactNode,active:boolean,onClick:()=>void)=><button key={id} onClick={onClick} className={`${action} flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs ${active?'bg-signal/10 font-semibold text-signal':'text-text-secondary hover:bg-surface hover:text-text-primary'}`}>{icon}<span className="min-w-0 flex-1 truncate">{label}</span>{active&&<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal"/>}</button>;
            return <div key={item._id} className={`overflow-hidden rounded-xl border ${selected?'border-signal/35':'border-border'}`}>
              <div className={`flex items-center gap-1 ${selected?'bg-signal/10':'bg-surface'}`}>
                <button onClick={() => void loadTopic(item)} className={`${action} flex min-w-0 flex-1 items-center gap-2.5 p-3 text-left`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${selected?'bg-signal text-white':'border border-border bg-surface-elevated text-text-tertiary'}`}>{String(index+1).padStart(2,'0')}</span><span className={`min-w-0 flex-1 text-xs font-semibold leading-5 ${selected?'text-signal':'text-text-primary'}`}>{item.title}</span></button>
                <button aria-label={`${isOpen?'Collapse':'Expand'} ${item.title}`} aria-expanded={isOpen} onClick={() => void toggleExpanded(item)} className={`${action} mr-2 rounded-lg p-2 text-text-tertiary hover:bg-surface hover:text-signal`}><ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen?'rotate-180':''}`}/></button>
              </div>
              {isOpen && <div className="border-t border-border bg-surface/50 p-2.5">
                {isLoading ? <div className="flex items-center gap-2 px-3 py-4 text-xs text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin text-signal"/>Loading topic activities...</div> : data ? <>
                  {activityButton(`${item._id}-overview`,'Topic overview',<Layers3 className="h-3.5 w-3.5 shrink-0"/>,selected&&view==='TOPIC',()=>void loadTopic(item))}
                  <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">Lessons · {data.lessons.length}</div>
                  {data.lessons.map((entry,i)=>activityButton(entry._id,`${i+1}. ${entry.title}`,<BookOpen className="h-3.5 w-3.5 shrink-0"/>,selected&&view==='LESSON'&&lesson?._id===entry._id,()=>{if(!selected)void loadTopic(item).then(()=>{setLesson(entry);setView('LESSON');setCurriculumOpen(false);});else openLesson(entry);}))}
                  <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">Resources · {data.resources.length}</div>
                  {data.resources.map((entry)=>activityButton(entry._id,entry.title,<FileText className="h-3.5 w-3.5 shrink-0"/>,false,()=>{setCurriculumOpen(false);void openResource(entry._id,entry.url || '',entry.source === 'UPLOAD');}))}
                  <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">Practice · {data.practices.length}</div>
                  {data.practices.map((entry)=>activityButton(entry._id,entry.title,<Brain className="h-3.5 w-3.5 shrink-0"/>,false,()=>{setCurriculumOpen(false);openPractice(entry._id);}))}
                  <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">Assessments · {data.assessments.length}</div>
                  {data.assessments.map((entry)=>activityButton(entry._id,entry.title,<ClipboardCheck className="h-3.5 w-3.5 shrink-0"/>,false,()=>{setCurriculumOpen(false);openAssessment(item._id,entry._id);}))}
                  {!data.lessons.length&&!data.resources.length&&!data.practices.length&&!data.assessments.length&&<p className="px-3 py-3 text-xs text-text-tertiary">No published activities are available for this topic yet.</p>}
                </> : <p className="px-3 py-3 text-xs text-text-tertiary">Expand to load this topic's learning activities.</p>}
              </div>}
            </div>;
          })}
        </div>
        <div className="border-t border-border bg-surface-elevated p-3 md:p-4"><button onClick={() => {setCurriculumOpen(false);navigate(`/learner/courses/${courseId}/final-assessment`);}} className={`${action} flex w-full items-center gap-3 rounded-xl border border-signal/25 bg-signal/5 p-3.5 text-left hover:bg-signal/10`}><GraduationCap className="h-5 w-5 shrink-0 text-signal"/><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-text-primary">Final course assessment</span><span className="text-[10px] text-text-tertiary">Course-level examination</span></span><ChevronRight className="h-4 w-4 text-text-tertiary"/></button></div>
      </aside>
    </div>
    {!curriculumOpen && <button aria-label="Open course curriculum" aria-expanded="false" onClick={() => setCurriculumOpen(true)} className={`${action} fixed right-0 top-1/2 z-[90] flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-border bg-surface-elevated text-text-secondary shadow-lg hover:w-12 hover:text-signal`}><ChevronLeft className="h-5 w-5"/><span className="sr-only">Open course curriculum</span></button>}
  </div>;
};

const ActivitySection: React.FC<{icon:React.ReactNode;title:string;subtitle:string;count:number;children:React.ReactNode}> = ({icon,title,subtitle,count,children}) => <section className="space-y-3"><div className="flex items-end justify-between gap-3"><div><h3 className="flex items-center gap-2 font-serif text-xl font-bold text-text-primary"><span className="text-signal">{icon}</span>{title}</h3><p className="mt-1 text-xs text-text-tertiary">{subtitle}</p></div><span className="text-xs text-text-tertiary">{count}</span></div><div className="grid gap-2">{children}</div></section>;
const Empty: React.FC<{text:string}> = ({text}) => <div className="rounded-xl border border-dashed border-border bg-surface/60 p-5 text-center text-xs text-text-tertiary">{text}</div>;

const FinalAssessmentEntry: React.FC<{courseId:string;onOpen:()=>void}> = ({courseId,onOpen}) => {
  const [eligibility,setEligibility]=useState<{available:boolean;eligible:boolean}|null>(null);
  useEffect(()=>{let alive=true;api.get<{data:{available:boolean;eligible:boolean}}>(`/courses/${courseId}/final-assessment/eligibility`).then(({data})=>{if(alive)setEligibility({available:data.data.available,eligible:data.data.eligible});}).catch(()=>{if(alive)setEligibility({available:false,eligible:false});});return()=>{alive=false;};},[courseId]);
  return <section className="rounded-2xl border border-signal/25 bg-gradient-to-br from-signal/10 via-surface-elevated to-surface-elevated p-6 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><div className="flex items-center gap-2 text-signal"><GraduationCap className="h-5 w-5"/><span className="text-[11px] font-bold uppercase tracking-widest">Course completion</span></div><h3 className="mt-2 font-serif text-2xl font-bold text-text-primary">Final course assessment</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{eligibility?.available && !eligibility.eligible ? 'Complete the required topic assessments before attempting the final examination.' : eligibility?.available ? 'Your final examination is available. The server will verify eligibility again when an attempt starts.' : 'A published final assessment is not currently available for this course.'} The server verifies eligibility when an attempt starts.</p></div><button disabled={!eligibility?.available || !eligibility.eligible} onClick={onOpen} className={`${action} inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50`}>{eligibility===null?<Loader2 className="h-4 w-4 animate-spin"/>:<GraduationCap className="h-4 w-4"/>}{eligibility?.eligible?'View final assessment':eligibility?.available?'Complete topic assessments first':'Not available yet'}</button></div></section>;
};
