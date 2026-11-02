import { ApiResponse } from "../../../shared/responses/ApiResponse.js";
import {
    createLessonService,
    deleteLessonService,
    getLessonByIdService,
    getLessonsByTopicService,
    reorderLessonsService,
    updateLessonService,
    archiveLessonService,
    restoreLessonService
} from "../services/lesson.service.js";

const createLesson = async (req, res) => {
    const lesson = await createLessonService(req.user._id, req.params.topicId, req.body);
    return res.status(201).json(new ApiResponse(lesson, "Lesson created successfully"));
};

const getLessonsByTopic = async (req, res) => {
    const lessons = await getLessonsByTopicService(req.user._id, req.params.topicId, req.user.role);
    return res.status(200).json(new ApiResponse(lessons, "Lessons fetched successfully"));
};

const getLessonById = async (req, res) => {
    const lesson = await getLessonByIdService(req.user._id, req.params.lessonId, req.user.role);
    return res.status(200).json(new ApiResponse(lesson, "Lesson fetched successfully"));
};

const updateLesson = async (req, res) => {
    const lesson = await updateLessonService(req.user._id, req.params.lessonId, req.body);
    return res.status(200).json(new ApiResponse(lesson, "Lesson updated successfully"));
};

const deleteLesson = async (req, res) => {
    const lesson = await deleteLessonService(req.user._id, req.params.lessonId);
    return res.status(200).json(new ApiResponse(lesson, "Lesson deleted successfully"));
};

const archiveLesson = async (req, res) => {
    const lesson = await archiveLessonService(req.user._id, req.params.lessonId);
    return res.status(200).json(new ApiResponse(lesson, "Lesson archived successfully"));
};

const restoreLesson = async (req, res) => {
    const lesson = await restoreLessonService(req.user._id, req.params.lessonId);
    return res.status(200).json(new ApiResponse(lesson, "Lesson restored successfully"));
};

const reorderLessons = async (req, res) => {
    const lessons = await reorderLessonsService(req.user._id, req.params.topicId, req.body.lessonIds);
    return res.status(200).json(new ApiResponse(lessons, "Lessons reordered successfully"));
};

export {
    createLesson,
    getLessonsByTopic,
    getLessonById,
    updateLesson,
    deleteLesson,
    archiveLesson,
    restoreLesson,
    reorderLessons
};
