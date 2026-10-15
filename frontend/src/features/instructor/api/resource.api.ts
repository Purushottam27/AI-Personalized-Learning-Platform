import api from '../../../lib/axios';
import type {
  CreateExternalResourcePayload,
  CreateResourcePayload,
  CreateUploadedResourcePayload,
  Resource,
  ResourceDownloadResponse,
  UpdateResourcePayload,
} from '../types/resource.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const getResourcesByTopic = async (topicId: string): Promise<Resource[]> => {
  const response = await api.get<ApiResponse<Resource[]>>(
    `/topics/${topicId}/resources`,
  );
  return response.data.data;
};

export const createExternalResource = async (
  topicId: string,
  payload: CreateExternalResourcePayload,
): Promise<Resource> => {
  const response = await api.post<ApiResponse<Resource>>(
    `/topics/${topicId}/resources`,
    payload,
  );
  return response.data.data;
};

export const createUploadedResource = async (
  topicId: string,
  payload: CreateUploadedResourcePayload,
  file: File,
): Promise<Resource> => {
  const formData = new FormData();
  formData.append('type', payload.type);
  formData.append('source', payload.source);
  formData.append('title', payload.title);
  if (payload.description !== undefined) {
    formData.append('description', payload.description);
  }
  if (payload.lessonId) {
    formData.append('lessonId', payload.lessonId);
  }
  formData.append('file', file);

  const response = await api.post<ApiResponse<Resource>>(
    `/topics/${topicId}/resources`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data.data;
};

export const createResource = async (
  topicId: string,
  payload: CreateResourcePayload,
  file?: File,
): Promise<Resource> => {
  if (payload.source === 'UPLOAD') {
    if (!file) {
      throw new Error('Choose a document file before uploading.');
    }
    return createUploadedResource(topicId, payload, file);
  }
  return createExternalResource(topicId, payload);
};

export const getResourceById = async (resourceId: string): Promise<Resource> => {
  const response = await api.get<ApiResponse<Resource>>(`/resources/${resourceId}`);
  return response.data.data;
};

export const updateResource = async (
  resourceId: string,
  payload: UpdateResourcePayload,
): Promise<Resource> => {
  const response = await api.patch<ApiResponse<Resource>>(
    `/resources/${resourceId}`,
    payload,
  );
  return response.data.data;
};

export const reorderTopicResources = async (
  topicId: string,
  resourceIds: string[],
): Promise<Resource[]> => {
  const response = await api.patch<ApiResponse<Resource[]>>(
    `/topics/${topicId}/resources/reorder`,
    { resourceIds },
  );
  return response.data.data;
};

export const archiveResource = async (resourceId: string): Promise<Resource> => {
  const response = await api.post<ApiResponse<Resource>>(
    `/resources/${resourceId}/archive`,
  );
  return response.data.data;
};

export const restoreResource = async (resourceId: string): Promise<Resource> => {
  const response = await api.post<ApiResponse<Resource>>(
    `/resources/${resourceId}/restore`,
  );
  return response.data.data;
};

export const getResourceDownloadUrl = async (
  resourceId: string,
): Promise<ResourceDownloadResponse> => {
  const response = await api.get<ApiResponse<ResourceDownloadResponse>>(
    `/resources/${resourceId}/file`,
  );
  return response.data.data;
};
