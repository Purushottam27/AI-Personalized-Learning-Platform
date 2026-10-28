import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseDetail, getCourseTopics, getTopicLessons, getTopicResources } from '../api/course.api';
import { getMyEnrollments } from '../api/enrollment.api';
import api from '../../../lib/axios';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  Download,
  Award,
  Sparkles,
  Loader2,
  AlertCircle,
  PlayCircle,
  Check,
} from 'lucide-react';
import type { LearnerCourseItem } from '../types/course.types';
import type { Topic } from '../../instructor/types/topic.types';
import type { Lesson } from '../../instructor/types/lesson.types';
import type { Resource } from '../../instructor/types/resource.types';

export const CourseStudyPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<LearnerCourseItem | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [topicLoading, setTopicLoading] = useState(false);
  const [completingLessonId, setCompletingLessonId] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Load Course and Topics
  useEffect(() => {
    async function init() {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);

        // Verify active enrollment
        const enrollments = await getMyEnrollments();
        const active = enrollments.find((e) => e.courseId === courseId && e.status === 'ACTIVE');
        if (!active) {
          navigate(`/learner/courses/${courseId}`);
          return;
        }

        const [courseData, topicsData] = await Promise.all([
          getCourseDetail(courseId),
          getCourseTopics(courseId),
        ]);

        setCourse(courseData);
        const sortedTopics = Array.isArray(topicsData)
          ? [...topicsData].sort((a, b) => a.order - b.order)
          : [];
        setTopics(sortedTopics);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load course workspace');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [courseId, navigate]);

  // Load Lessons and Resources for selected Topic
  const activeTopic = topics[activeTopicIndex] || null;

  useEffect(() => {
    async function loadTopicData() {
      if (!activeTopic) return;
      try {
        setTopicLoading(true);
        const [lessonsData, resourcesData] = await Promise.all([
          getTopicLessons(activeTopic._id).catch(() => []),
          getTopicResources(activeTopic._id).catch(() => []),
        ]);

        const sortedLessons = Array.isArray(lessonsData)
          ? [...lessonsData].sort((a, b) => a.order - b.order)
          : [];
        setLessons(sortedLessons);
        setResources(Array.isArray(resourcesData) ? resourcesData : []);

        if (sortedLessons.length > 0) {
          setActiveLesson(sortedLessons[0]);
        } else {
          setActiveLesson(null);
        }
      } catch (err: any) {
        console.error('Failed to load topic lessons/resources', err);
      } finally {
        setTopicLoading(false);
      }
    }
    loadTopicData();
  }, [activeTopic]);

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      setCompletingLessonId(lessonId);
      await api.post(`/lessons/${lessonId}/complete`);
      setCompletedLessonIds((prev) => new Set([...prev, lessonId]));
    } catch (err) {
      console.error('Failed to complete lesson', err);
    } finally {
      setCompletingLessonId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-signal animate-spin mb-3" />
        <p className="text-sm text-text-secondary">Preparing your study session...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-surface-elevated border border-border text-center mt-8">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Workspace Error</h2>
        <p className="text-sm text-text-secondary mb-6">{error}</p>
        <button
          onClick={() => navigate('/learner/courses')}
          className="px-5 py-2.5 rounded-xl bg-signal text-white text-sm font-semibold hover:opacity-90"
        >
          Back to My Courses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/learner/courses/${courseId}`)}
            className="p-2 rounded-xl border border-border hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-semibold text-signal uppercase tracking-wider">
              {course.domain} • Course Study
            </span>
            <h1 className="text-xl font-bold text-text-primary line-clamp-1">{course.title}</h1>
          </div>
        </div>

        {/* Action Shortcuts for active topic */}
        {activeTopic && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/learner/practice/${activeTopic._id}`)}
              className="py-2 px-3 rounded-xl border border-border hover:bg-surface-elevated text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <PlayCircle className="w-4 h-4 text-signal" />
              <span>Practice Topic</span>
            </button>
            <button
              onClick={() => navigate(`/learner/assessments/${activeTopic._id}`)}
              className="py-2 px-3 rounded-xl bg-signal text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 transition-opacity"
            >
              <Award className="w-4 h-4" />
              <span>Take Assessment</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Study Grid: Topic Sidebar + Lesson Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar: Topics & Lessons Outline */}
        <div className="lg:col-span-1 rounded-2xl bg-surface-elevated border border-border p-4 space-y-4">
          <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider px-2">
            Course Topics ({topics.length})
          </h2>

          <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1">
            {topics.map((topic, idx) => {
              const isSelected = idx === activeTopicIndex;
              return (
                <button
                  key={topic._id}
                  onClick={() => setActiveTopicIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl transition-all text-xs font-semibold flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-signal text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-surface border border-border text-text-tertiary'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{topic.title}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-text-tertiary'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area: Active Lesson Reader & Resources */}
        <div className="lg:col-span-3 space-y-6">
          {topicLoading ? (
            <div className="p-16 rounded-2xl bg-surface-elevated border border-border flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-signal animate-spin mb-3" />
              <p className="text-sm text-text-secondary">Loading topic content...</p>
            </div>
          ) : !activeTopic ? (
            <div className="p-12 rounded-2xl bg-surface-elevated border border-border text-center">
              <BookOpen className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-60" />
              <p className="text-sm text-text-secondary">Select a topic from the sidebar to view lessons.</p>
            </div>
          ) : (
            <>
              {/* Topic Banner */}
              <div className="p-6 rounded-2xl bg-surface-elevated border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-signal uppercase">
                  <span>Topic {activeTopicIndex + 1}</span>
                </div>
                <h2 className="text-xl font-bold text-text-primary">{activeTopic.title}</h2>
                {activeTopic.description && (
                  <p className="text-sm text-text-secondary leading-relaxed">{activeTopic.description}</p>
                )}
              </div>

              {/* Lesson Tabs */}
              {lessons.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
                  {lessons.map((lesson, idx) => {
                    const isSelected = activeLesson?._id === lesson._id;
                    const isDone = completedLessonIds.has(lesson._id);

                    return (
                      <button
                        key={lesson._id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-2 ${
                          isSelected
                            ? 'bg-surface-elevated text-signal border border-border shadow-sm'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                        )}
                        <span>{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Lesson Reader */}
              {activeLesson ? (
                <div className="p-8 rounded-2xl bg-surface-elevated border border-border space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <span className="text-xs font-semibold text-text-tertiary">Lesson</span>
                      <h3 className="text-xl font-bold text-text-primary">{activeLesson.title}</h3>
                    </div>

                    <button
                      onClick={() => handleCompleteLesson(activeLesson._id)}
                      disabled={completedLessonIds.has(activeLesson._id) || completingLessonId === activeLesson._id}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        completedLessonIds.has(activeLesson._id)
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-signal text-white hover:opacity-90'
                      }`}
                    >
                      {completingLessonId === activeLesson._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : completedLessonIds.has(activeLesson._id) ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Completed
                        </>
                      ) : (
                        'Mark Complete'
                      )}
                    </button>
                  </div>

                  <div className="max-w-none text-sm text-text-secondary leading-relaxed space-y-4">
                    {activeLesson.description && (
                      <p className="font-medium text-text-primary text-base pb-2 border-b border-border/50">{activeLesson.description}</p>
                    )}
                    {Array.isArray(activeLesson.content) && activeLesson.content.length > 0 ? (
                      <div className="space-y-4">
                        {activeLesson.content.map((block, idx) => {
                          switch (block.type) {
                            case 'HEADING':
                              return block.level === 2 ? (
                                <h3 key={idx} className="text-lg font-bold text-text-primary mt-4 mb-2">{block.content}</h3>
                              ) : (
                                <h4 key={idx} className="text-base font-semibold text-text-primary mt-3 mb-1">{block.content}</h4>
                              );
                            case 'CODE':
                              return (
                                <pre key={idx} className="p-4 rounded-xl bg-surface border border-border overflow-x-auto text-xs font-mono text-text-primary">
                                  <code>{block.content}</code>
                                </pre>
                              );
                            case 'CALLOUT':
                              return (
                                <div key={idx} className="p-4 rounded-xl bg-signal/10 border border-signal/20 text-xs text-text-primary">
                                  <span className="font-bold text-signal block uppercase text-[10px] mb-1">{block.variant}</span>
                                  <p>{block.content}</p>
                                </div>
                              );
                            case 'LIST':
                              return block.style === 'NUMBERED' ? (
                                <ol key={idx} className="list-decimal pl-5 space-y-1 text-sm text-text-secondary">
                                  {block.items.map((item, itemIdx) => (
                                    <li key={itemIdx}>{item}</li>
                                  ))}
                                </ol>
                              ) : (
                                <ul key={idx} className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
                                  {block.items.map((item, itemIdx) => (
                                    <li key={itemIdx}>{item}</li>
                                  ))}
                                </ul>
                              );
                            case 'IMAGE':
                              return (
                                <div key={idx} className="my-3">
                                  <img src={block.url} alt={block.alt} className="rounded-xl border border-border max-w-full" />
                                </div>
                              );
                            case 'VIDEO':
                              return (
                                <div key={idx} className="my-3 aspect-video rounded-xl overflow-hidden border border-border">
                                  <iframe src={block.url} title={block.title} className="w-full h-full" allowFullScreen />
                                </div>
                              );
                            case 'TEXT':
                            default:
                              return (
                                <p key={idx} className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                                  {block.content}
                                </p>
                              );
                          }
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-text-tertiary italic">No written content provided for this lesson.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-surface-elevated border border-border text-center">
                  <BookOpen className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-60" />
                  <p className="text-sm text-text-secondary">No lessons created for this topic yet.</p>
                </div>
              )}

              {/* Topic Resources */}
              {resources.length > 0 && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-border space-y-4">
                  <div className="flex items-center gap-2 text-text-primary font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-signal" />
                    <h3>Topic Study Resources ({resources.length})</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resources.map((res) => (
                      <div
                        key={res._id}
                        className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-signal shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-text-primary truncate">{res.title}</p>
                            <span className="text-[10px] text-text-tertiary uppercase">{res.type}</span>
                          </div>
                        </div>

                        {res.url ? (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg border border-border hover:bg-surface-elevated text-text-secondary hover:text-text-primary shrink-0 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            onClick={() => window.open(`/api/v1/resources/${res._id}/file`, '_blank')}
                            className="p-2 rounded-lg border border-border hover:bg-surface-elevated text-text-secondary hover:text-text-primary shrink-0 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
