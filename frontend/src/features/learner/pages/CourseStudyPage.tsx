import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Award, BookOpen, Brain, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Download, ExternalLink, FileText, GraduationCap, Layers3, Loader2, PanelLeftOpen, Sparkles, X } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [topicLoading, setTopicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openResource = async (resourceId: string, targetUrl: string) => {
    // Open a temporary tab synchronously from the click so browser popup blockers
    // do not prevent navigation while the access event is being recorded.
    const openedWindow = window.open('about:blank', '_blank');
    try {
      await api.post(`/resources/${resourceId}/access`);
      if (openedWindow) openedWindow.location.href = targetUrl;
    } catch (openError) {
      openedWindow?.close();
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

  const loadTopic = useCallback(async (selected: Topic) => {
    setTopic(selected); setView('TOPIC'); setCurriculumOpen(false);
    setExpanded((old) => new Set(old).add(selected._id));
    try {
      setTopicLoading(true); setError(null);
      const [lessonData, resourceData, practiceResponse, assessmentResponse] = await Promise.all([
        getTopicLessons(selected._id), getTopicResources(selected._id),
        api.get<{ data: PracticeItem[] }>(`/topics/${selected._id}/practices`),
        api.get<{ data: Assessment[] }>(`/topics/${selected._id}/assessments`),
      ]);
      const orderedLessons = Array.isArray(lessonData) ? [...lessonData].sort((a, b) => a.order - b.order) : [];
      setLessons(orderedLessons); setResources(Array.isArray(resourceData) ? resourceData : []);
      setPractices(Array.isArray(practiceResponse.data.data) ? practiceResponse.data.data : []);
      setAssessments(Array.isArray(assessmentResponse.data.data) ? assessmentResponse.data.data.filter((item) => item.type === 'TOPIC' && item.status === 'PUBLISHED') : []);
      setLesson((current) => orderedLessons.find((item) => item._id === current?._id) || orderedLessons[0] || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load all learning activities for this topic.');
      setLessons([]); setResources([]); setPractices([]); setAssessments([]); setLesson(null);
    } finally { setTopicLoading(false); }
  }, []);

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

  const toggleExpanded = (id: string) => setExpanded((old) => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const renderContent = (item: Lesson) => <div className="mx-auto max-w-3xl space-y-6">
    {item.description && <p className="border-b border-border pb-5 text-base leading-8 text-text-primary md:text-lg">{item.description}</p>}
    {item.content?.length ? item.content.map((block, index) => {
      switch (block.type) {
        case 'HEADING': return block.level === 2 ? <h2 key={index} className="pt-5 font-serif text-2xl font-bold text-text-primary">{block.content}</h2> : <h3 key={index} className="pt-4 text-xl font-semibold text-text-primary">{block.content}</h3>;
        case 'CODE': return <pre key={index} className="overflow-x-auto rounded-xl border border-border bg-surface p-5 text-sm text-text-primary"><code>{block.content}</code></pre>;
        case 'CALLOUT': { const variants: Record<string,string> = { INFO:'border-sky-500/30 bg-sky-500/10', TIP:'border-sage/40 bg-sage/10', WARNING:'border-amber-500/35 bg-amber-500/10', IMPORTANT:'border-signal/35 bg-signal/10' }; return <aside key={index} className={`rounded-xl border p-4 ${variants[block.variant] || variants.INFO}`}><p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-text-primary">{block.variant}</p><p className="text-sm leading-7 text-text-primary">{block.content}</p></aside>; }
        case 'LIST': return block.style === 'NUMBERED' ? <ol key={index} className="list-decimal space-y-2 pl-6 text-base leading-7 text-text-secondary">{block.items.map((entry, i) => <li key={i}>{entry}</li>)}</ol> : <ul key={index} className="list-disc space-y-2 pl-6 text-base leading-7 text-text-secondary">{block.items.map((entry, i) => <li key={i}>{entry}</li>)}</ul>;
        case 'IMAGE': return <img key={index} src={block.url} alt={block.alt} className="w-full rounded-2xl border border-border"/>;
        case 'VIDEO': return <div key={index} className="aspect-video overflow-hidden rounded-2xl border border-border bg-black"><iframe src={block.url} title={block.title} className="h-full w-full" allowFullScreen/></div>;
        default: return <p key={index} className="whitespace-pre-line text-base leading-8 text-text-secondary">{block.content}</p>;
      }
    }) : <p className="text-sm italic text-text-tertiary">No written content has been added to this lesson yet.</p>}
  </div>;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-text-secondary"><Loader2 className="h-6 w-6 animate-spin text-signal"/>Preparing your learning workspace...</div>;
  if (!course) return <div className={`${surface} mx-auto mt-8 max-w-2xl p-8 text-center`}><AlertCircle className="mx-auto mb-3 h-9 w-9 text-error"/><h2 className="text-xl font-bold text-text-primary">Course workspace unavailable</h2><p className="mt-2 text-sm text-text-secondary">{error || 'The course could not be loaded.'}</p><button onClick={() => navigate('/learner/courses')} className={`${action} mt-5 rounded-xl bg-signal px-5 py-2.5 text-sm font-semibold text-white`}>Back to My Courses</button></div>;

  const lessonIndex = lesson ? lessons.findIndex((item) => item._id === lesson._id) : -1;
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  return <div className="relative min-h-[calc(100vh-7rem)] pb-16">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <div className="flex min-w-0 items-center gap-3"><button aria-label="Back to course details" onClick={() => navigate(`/learner/courses/${courseId}`)} className={`${action} rounded-xl border border-border p-2.5 text-text-secondary hover:bg-surface`}><ArrowLeft className="h-5 w-5"/></button><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-signal">{course.domain} · Learning workspace</p><h1 className="truncate font-serif text-2xl font-bold text-text-primary">{course.title}</h1></div></div>
      <button onClick={() => setCurriculumOpen(true)} className={`${action} inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold text-text-primary hover:border-signal/40`}><PanelLeftOpen className="h-4 w-4 text-signal"/>Course curriculum</button>
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
      {resources.length > 0 && <ActivitySection icon={<Sparkles/>} title="Study resources" subtitle="Additional material for this topic" count={resources.length}><div className="grid gap-3 sm:grid-cols-2">{resources.map((item) => <div key={item._id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3.5"><FileText className="h-5 w-5 shrink-0 text-signal"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text-primary">{item.title}</p><p className="text-[10px] uppercase tracking-wide text-text-tertiary">{item.type}</p></div>{item.url ? <button type="button" aria-label={`Open ${item.title}`} onClick={() => openResource(item._id, item.url!)} className={`${action} rounded-lg border border-border p-2 text-text-secondary hover:text-signal`}><ExternalLink className="h-4 w-4"/></button> : <button type="button" aria-label={`Download ${item.title}`} onClick={() => openResource(item._id, `/api/v1/resources/${item._id}/file`)} className={`${action} rounded-lg border border-border p-2 text-text-secondary hover:text-signal`}><Download className="h-4 w-4"/></button>}</div>)}</div></ActivitySection>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><button onClick={() => {setView('COURSE');setTopic(null);}} className={`${action} inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary`}><ChevronLeft className="h-4 w-4"/>Course overview</button>{topics[topicIndex+1] && <button onClick={() => void loadTopic(topics[topicIndex+1])} className={`${action} inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105`}>Next topic<ArrowRight className="h-4 w-4"/></button>}</div>
    </section>}

    {view === 'LESSON' && topic && lesson && <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><button onClick={() => setView('TOPIC')} className={`${action} mb-2 inline-flex items-center gap-1 text-xs font-semibold text-signal hover:underline`}><ChevronLeft className="h-3.5 w-3.5"/>Back to {topic.title}</button><p className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">Topic {topicIndex+1} · Lesson {lessonIndex+1} of {lessons.length}</p><h2 className="mt-1 font-serif text-2xl font-bold text-text-primary md:text-3xl">{lesson.title}</h2></div><button onClick={() => setCurriculumOpen(true)} className={`${action} inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface`}><PanelLeftOpen className="h-4 w-4 text-signal"/>Curriculum</button></div>
      <article className={`${surface} p-5 md:p-9`}>{renderContent(lesson)}{resources.length > 0 && <div className="mx-auto mt-10 max-w-3xl border-t border-border pt-6"><h3 className="mb-3 text-sm font-bold text-text-primary">Related topic resources</h3><div className="grid gap-2 sm:grid-cols-2">{resources.map((item) => <div key={item._id} className="flex items-center gap-2 rounded-lg bg-surface p-3 text-xs"><FileText className="h-4 w-4 text-signal"/><span className="flex-1 truncate text-text-primary">{item.title}</span>{item.url && <button type="button" onClick={() => openResource(item._id, item.url!)} aria-label={`Open ${item.title}`} className="text-signal"><ExternalLink className="h-4 w-4"/></button>}</div>)}</div></div>}</article>
      <div className="flex items-center justify-between gap-3"><button disabled={!previousLesson} onClick={() => previousLesson && openLesson(previousLesson)} className={`${action} inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40`}><ChevronLeft className="h-4 w-4"/>Previous lesson</button><button disabled={!nextLesson} onClick={() => nextLesson && openLesson(nextLesson)} className={`${action} inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40`}>Next lesson<ChevronRight className="h-4 w-4"/></button></div>
      {!nextLesson && <div className={`${surface} flex flex-wrap items-center justify-between gap-3 p-4`}><div><p className="text-sm font-semibold text-text-primary">You've reached the end of this topic's lessons.</p><p className="mt-1 text-xs text-text-secondary">Continue with practice or review the topic assessments.</p></div><button onClick={() => setView('TOPIC')} className={`${action} rounded-xl bg-signal px-4 py-2.5 text-xs font-semibold text-white`}>Explore topic activities</button></div>}
    </section>}

    {curriculumOpen && <div className="absolute inset-0 z-[80]"><button aria-label="Close curriculum backdrop" onClick={() => setCurriculumOpen(false)} className="absolute inset-0 cursor-pointer bg-black/45 backdrop-blur-[2px]"/><aside aria-label="Course curriculum" className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col border-r border-border bg-surface-elevated shadow-2xl sm:w-[340px]"><div className="flex items-center justify-between border-b border-border p-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-signal">Learning path</p><h2 className="mt-1 font-serif text-lg font-bold text-text-primary">Course curriculum</h2></div><button aria-label="Close curriculum" onClick={() => setCurriculumOpen(false)} className={`${action} rounded-lg border border-border p-2 text-text-secondary hover:bg-surface`}><X className="h-4 w-4"/></button></div><div className="border-b border-border px-5 py-3"><p className="line-clamp-2 text-xs font-semibold text-text-primary">{course.title}</p><p className="mt-1 text-[11px] text-text-tertiary">{topics.length} topics</p></div><div className="flex-1 space-y-2 overflow-y-auto p-3">{topics.map((item,index) => {const isOpen=expanded.has(item._id);const selected=topic?._id===item._id;return <div key={item._id} className="overflow-hidden rounded-xl border border-border"><div className={`flex items-center gap-1 ${selected?'bg-signal/10':'bg-surface'}`}><button onClick={() => void loadTopic(item)} className={`${action} flex min-w-0 flex-1 items-center gap-2.5 p-3 text-left`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${selected?'bg-signal text-white':'border border-border bg-surface-elevated text-text-tertiary'}`}>{index+1}</span><span className={`min-w-0 flex-1 truncate text-xs font-semibold ${selected?'text-signal':'text-text-primary'}`}>{item.title}</span></button><button aria-label={`${isOpen?'Collapse':'Expand'} ${item.title}`} onClick={() => toggleExpanded(item._id)} className={`${action} mr-2 rounded-lg p-2 text-text-tertiary hover:bg-surface`}><ChevronDown className={`h-4 w-4 transition-transform ${isOpen?'rotate-180':''}`}/></button></div>{isOpen && <div className="space-y-1 border-t border-border bg-surface/50 p-2">{selected ? <>{lessons.map((entry,i) => <button key={entry._id} onClick={() => openLesson(entry)} className={`${action} flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] ${view==='LESSON'&&lesson?._id===entry._id?'bg-signal/10 font-semibold text-signal':'text-text-secondary hover:bg-surface hover:text-text-primary'}`}><BookOpen className="h-3.5 w-3.5 shrink-0"/><span className="truncate">{i+1}. {entry.title}</span></button>)}{practices.map((entry) => <button key={entry._id} onClick={() => openPractice(entry._id)} className={`${action} flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-text-secondary hover:bg-surface hover:text-text-primary`}><Brain className="h-3.5 w-3.5 shrink-0"/><span className="truncate">{entry.title}</span></button>)}{assessments.map((entry) => <button key={entry._id} onClick={() => openAssessment(item._id,entry._id)} className={`${action} flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-text-secondary hover:bg-surface hover:text-text-primary`}><ClipboardCheck className="h-3.5 w-3.5 shrink-0"/><span className="truncate">{entry.title}</span></button>)}</> : <button onClick={() => void loadTopic(item)} className={`${action} w-full rounded-lg px-3 py-2 text-left text-[11px] font-medium text-signal hover:bg-surface`}>Open topic activities →</button>}</div>}</div>;})}</div><div className="border-t border-border p-3"><button onClick={() => {setCurriculumOpen(false);navigate(`/learner/courses/${courseId}/final-assessment`);}} className={`${action} flex w-full items-center gap-3 rounded-xl border border-signal/25 bg-signal/5 p-3 text-left hover:bg-signal/10`}><GraduationCap className="h-5 w-5 text-signal"/><span className="flex-1"><span className="block text-xs font-bold text-text-primary">Final course assessment</span><span className="text-[10px] text-text-tertiary">Course-level examination</span></span><ChevronRight className="h-4 w-4 text-text-tertiary"/></button></div></aside></div>}
  </div>;
};

const ActivitySection: React.FC<{icon:React.ReactNode;title:string;subtitle:string;count:number;children:React.ReactNode}> = ({icon,title,subtitle,count,children}) => <section className="space-y-3"><div className="flex items-end justify-between gap-3"><div><h3 className="flex items-center gap-2 font-serif text-xl font-bold text-text-primary"><span className="text-signal">{icon}</span>{title}</h3><p className="mt-1 text-xs text-text-tertiary">{subtitle}</p></div><span className="text-xs text-text-tertiary">{count}</span></div><div className="grid gap-2">{children}</div></section>;
const Empty: React.FC<{text:string}> = ({text}) => <div className="rounded-xl border border-dashed border-border bg-surface/60 p-5 text-center text-xs text-text-tertiary">{text}</div>;

const FinalAssessmentEntry: React.FC<{courseId:string;onOpen:()=>void}> = ({courseId,onOpen}) => {
  const [eligibility,setEligibility]=useState<{available:boolean;eligible:boolean}|null>(null);
  useEffect(()=>{let alive=true;api.get<{data:{available:boolean;eligible:boolean}}>(`/courses/${courseId}/final-assessment/eligibility`).then(({data})=>{if(alive)setEligibility({available:data.data.available,eligible:data.data.eligible});}).catch(()=>{if(alive)setEligibility({available:false,eligible:false});});return()=>{alive=false;};},[courseId]);
  return <section className="rounded-2xl border border-signal/25 bg-gradient-to-br from-signal/10 via-surface-elevated to-surface-elevated p-6 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><div className="flex items-center gap-2 text-signal"><GraduationCap className="h-5 w-5"/><span className="text-[11px] font-bold uppercase tracking-widest">Course completion</span></div><h3 className="mt-2 font-serif text-2xl font-bold text-text-primary">Final course assessment</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{eligibility?.available && !eligibility.eligible ? 'Complete the required topic assessments before attempting the final examination.' : eligibility?.available ? 'Your final examination is available. The server will verify eligibility again when an attempt starts.' : 'A published final assessment is not currently available for this course.'} The server verifies eligibility when an attempt starts.</p></div><button disabled={!eligibility?.available || !eligibility.eligible} onClick={onOpen} className={`${action} inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50`}>{eligibility===null?<Loader2 className="h-4 w-4 animate-spin"/>:<GraduationCap className="h-4 w-4"/>}{eligibility?.eligible?'View final assessment':eligibility?.available?'Complete topic assessments first':'Not available yet'}</button></div></section>;
};
