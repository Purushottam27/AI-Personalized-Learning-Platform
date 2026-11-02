import api from '../../../lib/axios';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    usedCourseContext?: boolean;
    sources?: AssistantSource[];
    provider?: string;
    model?: string;
    latencyMs?: number | null;
    usage?: { promptTokens: number | null; responseTokens: number | null; totalTokens: number | null };
  };
}
export interface AssistantSource { type: 'course' | 'topic' | 'lesson'; id: string; title: string; }
export interface AssistantConversationSummary {
  id: string; title: string; courseId: string | null; lastMessageAt: string; messageCount: number;
}
export interface AssistantConversation extends AssistantConversationSummary { messages: AssistantMessage[]; }
export interface AssistantReply {
  answer: string; usedCourseContext: boolean; sources: AssistantSource[];
  ai: { provider: 'gemini'; model: string; latencyMs: number; usage: { promptTokens: number | null; responseTokens: number | null; totalTokens: number | null } | null; fallbackUsed: boolean };
  conversation: AssistantConversation;
}
const dataOf = <T,>(response: { data: { data: T } }) => response.data.data;
export const listAssistantConversations = async () =>
  dataOf(await api.get<{ data: AssistantConversationSummary[] }>('/learning/me/assistant/conversations'));
export const createAssistantConversation = async (courseId?: string) =>
  dataOf(await api.post<{ data: AssistantConversation }>('/learning/me/assistant/conversations', courseId ? { courseId } : {}));
export const getAssistantConversation = async (id: string) =>
  dataOf(await api.get<{ data: AssistantConversation }>(`/learning/me/assistant/conversations/${id}`));
export const renameAssistantConversation = async (id: string, title: string) =>
  dataOf(await api.patch<{ data: AssistantConversation }>(`/learning/me/assistant/conversations/${id}`, { title }));
export const deleteAssistantConversation = async (id: string) =>
  dataOf(await api.delete<{ data: { id: string; deleted: boolean } }>(`/learning/me/assistant/conversations/${id}`));
export const askAiAssistant = async (payload: { question: string; conversationId: string; courseId?: string; history?: Array<{role:'user'|'assistant';content:string}> }) =>
  dataOf(await api.post<{ data: AssistantReply }>('/learning/me/assistant/ask', payload, { timeout: 85000 }));
