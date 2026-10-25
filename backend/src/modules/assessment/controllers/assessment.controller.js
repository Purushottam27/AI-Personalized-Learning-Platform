import {
    createAssessmentService,
    getAssessmentByIdService,
    getAssessmentsByCourseService,
    getAssessmentsByTopicService,
    updateAssessmentService,
    publishAssessmentService,
    archiveAssessmentService,
    restoreAssessmentService,
    getCourseDiagnosticAssessmentService,
} from "../services/assessment.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

export async function createAssessment(req, res) {
    const assessment = await createAssessmentService(req.user._id, req.body);
    res.status(201).json(new ApiResponse(assessment, "Assessment created successfully"));
}

export async function getAssessmentsByCourse(req, res) {
    const assessments = await getAssessmentsByCourseService(req.user._id, req.params.courseId, req.user.role);
    res.status(200).json(new ApiResponse(assessments, "Assessments fetched successfully"));
}

export async function getAssessmentsByTopic(req, res) {
    const assessments = await getAssessmentsByTopicService(req.user._id, req.params.topicId, req.user.role);
    res.status(200).json(new ApiResponse(assessments, "Assessments fetched successfully"));
}

export async function getAssessmentById(req, res) {
    const assessment = await getAssessmentByIdService(req.user._id, req.params.assessmentId, req.user.role);
    res.status(200).json(new ApiResponse(assessment, "Assessment fetched successfully"));
}

export async function updateAssessment(req, res) {
    const assessment = await updateAssessmentService(req.user._id, req.params.assessmentId, req.body);
    res.status(200).json(new ApiResponse(assessment, "Assessment updated successfully"));
}

export async function publishAssessment(req, res) {
    const assessment = await publishAssessmentService(req.user._id, req.params.assessmentId);
    res.status(200).json(new ApiResponse(assessment, "Assessment published successfully"));
}

export async function archiveAssessment(req, res) {
    const assessment = await archiveAssessmentService(req.user._id, req.params.assessmentId);
    res.status(200).json(new ApiResponse(assessment, "Assessment archived successfully"));
}

export async function restoreAssessment(req, res) {
    const assessment = await restoreAssessmentService(req.user._id, req.params.assessmentId);
    res.status(200).json(new ApiResponse(assessment, "Assessment restored successfully"));
}

export async function getCourseDiagnosticAssessment(req, res) {
    const diagnostic = await getCourseDiagnosticAssessmentService(req.params.courseId);
    res.status(200).json(new ApiResponse(diagnostic, "Diagnostic assessment fetched successfully"));
}

