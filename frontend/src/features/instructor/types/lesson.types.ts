export type LessonHeadingLevel = 2 | 3;
export type LessonCalloutVariant = 'INFO' | 'TIP' | 'WARNING' | 'IMPORTANT';
export type LessonListStyle = 'BULLETED' | 'NUMBERED';

export interface TextContentBlock {
  type: 'TEXT';
  content: string;
}

export interface HeadingContentBlock {
  type: 'HEADING';
  level: LessonHeadingLevel;
  content: string;
}

export interface CodeContentBlock {
  type: 'CODE';
  language: string;
  content: string;
}

export interface ImageContentBlock {
  type: 'IMAGE';
  url: string;
  alt: string;
}

export interface VideoContentBlock {
  type: 'VIDEO';
  url: string;
  title: string;
}

export interface CalloutContentBlock {
  type: 'CALLOUT';
  variant: LessonCalloutVariant;
  content: string;
}

export interface ListContentBlock {
  type: 'LIST';
  style: LessonListStyle;
  items: string[];
}

export type LessonContentBlock =
  | TextContentBlock
  | HeadingContentBlock
  | CodeContentBlock
  | ImageContentBlock
  | VideoContentBlock
  | CalloutContentBlock
  | ListContentBlock;

export interface Lesson {
  _id: string;
  topicId: string;
  title: string;
  description: string;
  content: LessonContentBlock[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonPayload {
  title: string;
  description?: string;
  content: LessonContentBlock[];
}

export interface LessonReorderPayload {
  lessonIds: string[];
}
