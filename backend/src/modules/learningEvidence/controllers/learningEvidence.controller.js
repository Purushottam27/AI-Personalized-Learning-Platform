import {
    getMyLearningEvidenceService,
    getCourseLearningEvidenceService,
    getLearningEvidenceByIdService,
} from "../services/learningEvidence.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function getMyLearningEvidence(req, res) {
    const result = await getMyLearningEvidenceService(req.user._id, req.validatedQuery);
    return res.status(200).json(new ApiResponse(result, "Learning evidence fetched successfully"));
}

export async function getCourseLearningEvidence(req, res) {
    const result = await getCourseLearningEvidenceService(req.user._id, req.params.courseId, req.validatedQuery);
    return res.status(200).json(new ApiResponse(result, "Course learning evidence fetched successfully"));
}

export async function getLearningEvidenceById(req, res) {
    const result = await getLearningEvidenceByIdService(req.user, req.params.evidenceId);
    return res.status(200).json(new ApiResponse(result, "Learning evidence fetched successfully"));
}
