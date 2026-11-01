import api from '../../../lib/axios';
import type {
  InstructorLearnersOverviewQuery,
  InstructorLearnersOverviewResponse,
} from '../types/learners-overview.types';

/** GET /api/v1/instructor/learners/overview */
export const getInstructorLearnersOverview = async (
  query: InstructorLearnersOverviewQuery = {}
): Promise<InstructorLearnersOverviewResponse> => {
  const response = await api.get<{ data: InstructorLearnersOverviewResponse }>(
    '/instructor/learners/overview',
    { params: query }
  );
  return response.data.data;
};
