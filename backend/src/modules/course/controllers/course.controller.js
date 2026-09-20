import { archiveCourseService, createCourseService, discoverCoursesService, getCourseByIdService, instructorCoursesService, publishCourseService, updateCourseService } from "../services/course.service.js"
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

const createCourse = async(req,res)=>{
    const userId = req.user?._id

    const courseInfo = await createCourseService(userId,req.body)

    return res.status(201).json(
        new ApiResponse(courseInfo,'Course created successfully')
    )
}

const getInstructorCourses = async(req,res)=>{
    const userId = req.user?._id

    const courses = await instructorCoursesService(userId)

    return res.status(200).json(
        new ApiResponse(courses,'Courses fetched successfully')
    )
}

const getCourseById = async (req, res) => {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const { courseId } = req.params;

    const course = await getCourseByIdService(userId,userRole,courseId
    );

    return res.status(200).json(
        new ApiResponse(
            course,
            "Course fetched successfully"
        )
    );
};


const updateCourse = async(req, res)=>{
    const userId = req.user._id;
    const { courseId } = req.params;

    const course = await updateCourseService(userId, courseId, req.body);

    res.status(200).json(new ApiResponse(course, "Course updated successfully"));
}

const publishCourse = async(req, res) =>{
    const userId = req.user._id;
    const { courseId } = req.params;

    const course = await publishCourseService(userId, courseId);

    res.status(200).json(new ApiResponse(course, "Course published successfully"));
}

const archiveCourse = async(req, res)=>{
    const userId = req.user._id;
    const { courseId } = req.params;

    const course = await archiveCourseService(userId, courseId);

    res.status(200).json(new ApiResponse(course, "Course archived successfully"));
}

const discoverCourses = async(req, res)=>{
    const query = req.validatedQuery;

    const result = await discoverCoursesService(query);

    res.status(200).json(new ApiResponse(result, "Courses fetched successfully"));
}

export {
    createCourse,
    getInstructorCourses,
    getCourseById,
    updateCourse,
    publishCourse,
    archiveCourse,
    discoverCourses
}