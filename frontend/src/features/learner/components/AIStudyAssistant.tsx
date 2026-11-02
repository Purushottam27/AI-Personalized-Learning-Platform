import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bot, BookOpen, Clock3, Loader2, Plus, Send, Sparkles, Trash2, User, X, History, PanelLeftClose, PanelLeftOpen, Pencil, Check } from 'lucide-react';
import {
  askAiAssistant, createAssistantConversation, deleteAssistantConversation, getAssistantConversation,
  listAssistantConversations, renameAssistantConversation,
  type AssistantConversationSummary, type AssistantMessage
} from '../api/aiAssistant.api';
import { isApiError } from '../../../lib/axios';

interface CourseOption { id: string; title: string; }
interface DisplayMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp?: string; metadata?: AssistantMessage['metadata']; }
const STARTERS = [
  'Explain my current topic with a simple example.',
  'Help me revise the most important concepts.',
  'Create a short practice quiz for my current course.',
  'Help me prioritize my study time this week.',
];

export const AIStudyAssistant: React.FC<{ courses: CourseOption[] }> = ({ courses }) => {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AssistantConversationSummary | null>(null);
  const [isMutatingHistory, setIsMutatingHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId), [courses, courseId]);

  const refreshList = useCallback(async () => {
    const items = await listAssistantConversations();
    setConversations(items);
    return items;
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const conversation = await getAssistantConversation(id);
      setActiveId(conversation.id);
      setCourseId(conversation.courseId || '');
      setMessages(conversation.messages.map((m) => ({ ...m })));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load this conversation.');
    } finally { setIsLoading(false); }
  }, []);

  const startNewChat = useCallback(async () => {
    setError(null);
    setQuestion('');
    setIsLoading(true);
    try {
      const created = await createAssistantConversation(courseId || undefined);
      setActiveId(created.id);
      setMessages([]);
      await refreshList();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not start a new conversation.');
    } finally { setIsLoading(false); }
  }, [courseId, refreshList]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await listAssistantConversations();
        if (!mounted) return;
        setConversations(items);
        const resume = items[0]?.id;
        if (resume) await openConversation(resume);
        else if (mounted) { setActiveId(null); setMessages([]); }
      } catch (err) {
        if (mounted) setError(isApiError(err) ? err.message : 'Could not load your chat history.');
      } finally { if (mounted) setIsLoading(false); }
    })();
    return () => { mounted = false; };
  // Initial load only; navigation unmounts/remounts this component, server history restores it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendQuestion = async (value = question) => {
    const clean = value.trim();
    if (!clean || isSending) return;
    setError(null); setIsSending(true); setQuestion('');
    const optimistic: DisplayMessage = { id: `pending-${Date.now()}`, role: 'user', content: clean };
    setMessages((current) => [...current, optimistic]);
    try {
      let conversationId = activeId;
      if (!conversationId) {
        const created = await createAssistantConversation(courseId || undefined);
        conversationId = created.id;
        setActiveId(conversationId);
      }
      const prior = messages.slice(-6).map(({ role, content }) => ({ role, content }));
      const reply = await askAiAssistant({ question: clean, conversationId, ...(courseId ? { courseId } : {}), history: prior });
      setMessages(reply.conversation.messages.map((m) => ({ ...m })));
      await refreshList();
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    } catch (err) {
      setMessages((current) => current.filter((m) => m.id !== optimistic.id));
      setQuestion(clean);
      setError(isApiError(err) ? err.message : 'The assistant could not respond. Your question is available to retry.');
    } finally { setIsSending(false); }
  };

  const removeConversation = async () => {
    if (!deleteTarget || isMutatingHistory) return;
    const id = deleteTarget.id;
    setIsMutatingHistory(true);
    try {
      await deleteAssistantConversation(id);
      setDeleteTarget(null);
      const remaining = await refreshList();
      if (id === activeId) {
        if (remaining[0]) await openConversation(remaining[0].id);
        else { setActiveId(null); setMessages([]); }
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not delete this conversation.');
    } finally { setIsMutatingHistory(false); }
  };

  const saveConversationTitle = async (id: string) => {
    const title = editingTitle.trim();
    if (!title || isMutatingHistory) return;
    setIsMutatingHistory(true);
    try {
      await renameAssistantConversation(id, title);
      if (id === activeId) {
        // Refreshing the selected conversation keeps its title and messages authoritative.
        await openConversation(id);
      }
      await refreshList();
      setEditingId(null);
      setEditingTitle('');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not rename this conversation.');
    } finally { setIsMutatingHistory(false); }
  };

  const changeCourse = async (next: string) => {
    setCourseId(next);
    // Keep prior conversations intact; start a new conversation to avoid mixing course contexts.
    setIsLoading(true);
    try {
      const created = await createAssistantConversation(next || undefined);
      setActiveId(created.id); setMessages([]);
      await refreshList();
    } catch (err) { setError(isApiError(err) ? err.message : 'Could not change course context.'); }
    finally { setIsLoading(false); }
  };

  return (
    <section className="mx-auto flex min-h-[68vh] max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface">
      {historyOpen && <aside className="hidden w-64 shrink-0 border-r border-border p-3 md:flex md:flex-col">
        <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-xs font-bold text-text-primary"><History className="h-4 w-4"/> Chat history</h3><button onClick={() => setHistoryOpen(false)} aria-label="Hide chat history"><PanelLeftClose className="h-4 w-4"/></button></div>
        <button onClick={() => void startNewChat()} className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-signal px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5"/> New chat</button>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {conversations.map((chat) => <div key={chat.id} className={`group rounded-xl border p-2 ${activeId === chat.id ? 'border-signal/40 bg-signal-soft/20' : 'border-transparent hover:border-border hover:bg-surface-elevated'}`}>
            {editingId === chat.id ? (
              <div className="space-y-2">
                <input autoFocus maxLength={80} value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void saveConversationTitle(chat.id); } if (event.key === 'Escape') setEditingId(null); }} className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text-primary outline-none focus:border-signal"/>
                <div className="flex justify-end gap-1">
                  <button type="button" onClick={() => { setEditingId(null); setEditingTitle(''); }} className="rounded-md px-2 py-1 text-[10px] text-text-secondary">Cancel</button>
                  <button type="button" disabled={!editingTitle.trim() || isMutatingHistory} onClick={() => void saveConversationTitle(chat.id)} className="inline-flex items-center gap-1 rounded-md bg-signal px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"><Check className="h-3 w-3"/>Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-1">
                <button onClick={() => void openConversation(chat.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-semibold text-text-primary">{chat.title?.trim() || 'Untitled conversation'}</span>
                  <span className="mt-1 block text-[10px] text-text-tertiary">{chat.messageCount === 1 ? '1 message' : `${chat.messageCount} messages`} · {new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                </button>
                <button type="button" onClick={() => { setEditingId(chat.id); setEditingTitle(chat.title || ''); }} aria-label={`Rename ${chat.title || 'conversation'}`} title="Rename conversation" className="rounded-md p-1.5 text-text-tertiary hover:bg-surface hover:text-signal"><Pencil className="h-3.5 w-3.5"/></button>
                <button type="button" onClick={() => setDeleteTarget(chat)} aria-label={`Delete ${chat.title || 'conversation'}`} title="Delete conversation" className="rounded-md p-1.5 text-text-tertiary hover:bg-error/10 hover:text-error"><Trash2 className="h-3.5 w-3.5"/></button>
              </div>
            )}
          </div>)}
          {!conversations.length && <p className="p-2 text-xs text-text-tertiary">Your previous conversations will appear here.</p>}
        </div>
      </aside>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            {!historyOpen && <button onClick={() => setHistoryOpen(true)} aria-label="Show chat history" className="text-text-secondary"><PanelLeftOpen className="h-4 w-4"/></button>}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-soft text-signal"><Bot className="h-5 w-5"/></div>
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-text-primary">AI Study Assistant</h2><span className="rounded-full border border-sage/30 bg-sage-soft/30 px-2 py-0.5 text-[10px] font-bold text-sage">GEMINI POWERED</span></div><p className="mt-0.5 text-xs text-text-secondary">Your learning conversations are saved to your account.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Course context" value={courseId} onChange={(e) => void changeCourse(e.target.value)} className="max-w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-text-primary"><option value="">General learning question</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            <button type="button" onClick={() => void startNewChat()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:border-signal hover:text-signal"><Plus className="h-3.5 w-3.5"/> New chat</button>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          <button type="button" onClick={() => void startNewChat()} className="shrink-0 rounded-lg bg-signal px-3 py-2 text-[11px] font-semibold text-white"><Plus className="mr-1 inline h-3 w-3"/>New chat</button>
          {conversations.map((chat) => <button key={chat.id} type="button" onClick={() => void openConversation(chat.id)} className={`max-w-44 shrink-0 truncate rounded-lg border px-3 py-2 text-[11px] ${activeId === chat.id ? 'border-signal bg-signal-soft/20 text-text-primary' : 'border-border text-text-secondary'}`}>{chat.title}</button>)}
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {isLoading && <div className="flex items-center justify-center gap-2 py-12 text-xs text-text-secondary"><Loader2 className="h-4 w-4 animate-spin"/> Loading conversation…</div>}
          {!isLoading && !messages.length && <div className="mx-auto max-w-2xl py-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal"><Sparkles className="h-7 w-7"/></div><h3 className="font-display text-xl font-semibold text-text-primary">What would you like to learn?</h3><p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">{selectedCourse ? `I can use your ${selectedCourse.title} course outline and learning objectives when answering.` : 'Ask a general learning question, or select an enrolled course.'}</p><div className="mt-6 grid gap-2 text-left sm:grid-cols-2">{STARTERS.map((s) => <button key={s} onClick={() => void sendQuestion(s)} disabled={isSending} className="rounded-xl border border-border bg-surface-elevated p-3 text-left text-xs text-text-secondary hover:border-signal">{s}</button>)}</div></div>}
          {messages.map((m) => <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-soft text-signal"><Bot className="h-4 w-4"/></div>}
            <div className={`max-w-[88%] min-w-0 rounded-2xl px-4 py-3 sm:max-w-[78%] ${m.role === 'user' ? 'bg-signal text-white' : 'border border-border bg-surface-elevated text-text-primary'}`}>
              {m.role === 'assistant' && <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-signal">Study assistant</p>}
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</div>
              {m.metadata?.sources?.length ? <div className="mt-3 border-t border-border pt-2"><p className="mb-1 text-[10px] font-semibold text-text-tertiary">Course context used</p><div className="flex flex-wrap gap-1.5">{m.metadata.sources.map((s) => <span key={`${s.type}-${s.id}`} className="rounded-md bg-surface px-2 py-1 text-[10px] text-text-secondary"><BookOpen className="mr-1 inline h-3 w-3"/>{s.title}</span>)}</div></div> : null}
              {m.metadata?.model && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[10px] text-text-tertiary"><span><Sparkles className="mr-1 inline h-3 w-3"/>{m.metadata.model}</span>{m.metadata.latencyMs != null && <span><Clock3 className="mr-1 inline h-3 w-3"/>{(m.metadata.latencyMs/1000).toFixed(1)}s</span>}{m.metadata.usage?.totalTokens != null && <span>{m.metadata.usage.totalTokens} tokens</span>}</div>}
            </div>
            {m.role === 'user' && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-text-secondary"><User className="h-4 w-4"/></div>}
          </div>)}
          {isSending && <div className="flex items-center gap-3 text-xs text-text-secondary"><Loader2 className="h-4 w-4 animate-spin text-signal"/> Gemini is preparing your answer…</div>}
          <div ref={endRef}/>
        </div>
        <div className="border-t border-border p-4 sm:p-5">
          {error && <div className="mb-3 flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 p-3 text-xs text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/><p>{error}</p><button onClick={() => setError(null)} aria-label="Dismiss error" className="ml-auto"><X className="h-3.5 w-3.5"/></button></div>}
          <form onSubmit={(e) => { e.preventDefault(); void sendQuestion(); }} className="flex items-end gap-2 rounded-xl border border-border bg-surface-elevated p-2 focus-within:border-signal"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey){e.preventDefault();void sendQuestion();}}} rows={2} maxLength={1000} placeholder="Ask a question about your course or learning…" className="max-h-36 min-h-[48px] flex-1 resize-y bg-transparent px-2 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary"/><button type="submit" disabled={!question.trim() || isSending} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal text-white disabled:opacity-40"><Send className="h-4 w-4"/></button></form>
          <p className="mt-2 text-[10px] text-text-tertiary">Conversations are saved to your account. Deleting a chat removes it permanently. AI guidance can be inaccurate; verify important information with course material.</p>
        </div>
      </div>
      {deleteTarget && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isMutatingHistory) setDeleteTarget(null); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="delete-chat-title" className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-error/10 text-error"><Trash2 className="h-5 w-5"/></div>
          <h3 id="delete-chat-title" className="text-base font-semibold text-text-primary">Delete this conversation?</h3>
          <p className="mt-2 text-sm text-text-secondary">“{deleteTarget.title || 'Untitled conversation'}” and its messages will be permanently deleted. This cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={isMutatingHistory} onClick={() => setDeleteTarget(null)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary">Cancel</button>
            <button type="button" disabled={isMutatingHistory} onClick={() => void removeConversation()} className="inline-flex items-center gap-2 rounded-lg bg-error px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{isMutatingHistory && <Loader2 className="h-3.5 w-3.5 animate-spin"/>}Delete conversation</button>
          </div>
        </div>
      </div>}
    </section>
  );
};