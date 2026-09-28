import { ApiResponse } from "../../../shared/responses/ApiResponse.js";
import { createLessonService, deleteLessonService, getLessonByIdService, getLessonsByTopicService, reorderLessonsService, updateLessonService } from "../services/lesson.service.js";

const createLesson = async (req, res) => {
    const { topicId } = req.params;

    const lesson = await createLessonService(
        req.user._id,
        topicId,
        req.body
    );

    return res.status(201).json(
        new ApiResponse(
            lesson,
            "Lesson created successfully"
        )
    );
};


const getLessonsByTopic = async (req, res) => {
    const { topicId } = req.params;

    const lessons = await getLessonsByTopicService(req.user._id,topicId);

    return res.status(200).json(
        new ApiResponse(
            lessons,
            "Lessons fetched successfully"
        )
    );
};


const getLessonById = async (req, res) => {
    const { lessonId } = req.params;

    const lesson = await getLessonByIdService(
        req.user._id,
        lessonId      
    );

    return res.status(200).json(
        new ApiResponse(
            lesson,
            "Lesson fetched successfully"
        )
    );
};


const updateLesson = async (req, res) => {
    const { lessonId } = req.params;

    const lesson = await updateLessonService(     
        req.user._id,
        lessonId,
        req.body
    );

    return res.status(200).json(
        new ApiResponse(
            lesson,
            "Lesson updated successfully"
        )
    );
};

const deleteLesson = async(req,res)=>{
    const {lessonId} = req.params

    const lesson = await deleteLessonService(
        req.user._id,
        lessonId
    )

    return res.status(200).json(
        new ApiResponse(
            lesson,
            "Lesson deleted successfully"
        )
    );
}
const reorderLessons = async (req, res) => {
    const { topicId } = req.params;
    const { lessonIds } = req.body;

    const lessons = await reorderLessonsService(
        req.user._id,
        topicId,
        lessonIds
    );

    return res.status(200).json(
        new ApiResponse(
            lessons,
            "Lessons reordered successfully"
        )
    );
};


export {
    createLesson,
    getLessonsByTopic,
    getLessonById,
    updateLesson,
    deleteLesson,
    reorderLessons
};