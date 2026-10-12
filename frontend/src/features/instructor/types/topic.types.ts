export interface Topic {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  learningObjectives: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicPayload {
  title: string;
  description?: string;
  learningObjectives: string[];
}

export interface TopicReorderPayload {
  topicIds: string[];
}
