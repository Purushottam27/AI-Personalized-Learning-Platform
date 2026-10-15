export type ResourceType = 'VIDEO' | 'DOCUMENT' | 'LINK';
export type ResourceSource = 'UPLOAD' | 'EXTERNAL_URL';
export type ResourceProvider = 'YOUTUBE' | 'GOOGLE_DRIVE' | 'VIMEO' | 'OTHER';
export type ResourceStatus = 'ACTIVE' | 'ARCHIVED';
export type ResourceFileFormat = 'PDF' | 'PPT' | 'PPTX' | 'DOC' | 'DOCX';

/** Public fields only. Internal storage identifiers are deliberately excluded. */
export interface Resource {
  _id: string;
  topicId: string;
  lessonId: string | null;
  title: string;
  description: string;
  type: ResourceType;
  source: ResourceSource;
  provider: ResourceProvider | null;
  url: string | null;
  fileFormat: ResourceFileFormat | null;
  fileSize: number | null;
  order: number;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

interface CreateResourceBase {
  title: string;
  description?: string;
  lessonId?: string;
}

export interface CreateExternalResourcePayload extends CreateResourceBase {
  type: ResourceType;
  source: 'EXTERNAL_URL';
  url: string;
}

export interface CreateUploadedResourcePayload extends CreateResourceBase {
  type: 'DOCUMENT';
  source: 'UPLOAD';
}

export type CreateResourcePayload =
  | CreateExternalResourcePayload
  | CreateUploadedResourcePayload;

export interface UpdateResourcePayload {
  title?: string;
  description?: string;
  url?: string;
}

export interface ResourceDownloadResponse {
  url: string;
  /** Unix timestamp in seconds. */
  expiresAt: number;
}
