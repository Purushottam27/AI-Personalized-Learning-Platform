import { createEnrollmentService, getMyEnrollmentsService, getEnrollmentByIdService, withdrawEnrollmentService} from "../services/enrollment.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

const createEnrollment = async(req, res)=>{
    const learnerId = req.user._id;
    const { courseId } = req.params;

    const enrollment = await createEnrollmentService(learnerId, courseId);

    res.status(201).json(new ApiResponse(enrollment, "Course enrolled successfully"));
}

const getMyEnrollments = async(req, res)=>{
    const learnerId = req.user._id;

    const enrollments = await getMyEnrollmentsService(learnerId);

    res.status(200).json(new ApiResponse(enrollments, "Enrollments fetched successfully"));
}


const getEnrollmentById = async(req, res)=>{
    const learnerId = req.user._id;
    const { enrollmentId } = req.params;

    const enrollment = await getEnrollmentByIdService(learnerId, enrollmentId);

    res.status(200).json(new ApiResponse(enrollment, "Enrollment fetched successfully"));
}

const withdrawEnrollment = async(req, res)=>{
    const learnerId = req.user._id;
    const { enrollmentId } = req.params;

    const enrollment = await withdrawEnrollmentService(learnerId, enrollmentId);

    res.status(200).json(new ApiResponse(enrollment, "Enrollment withdrawn successfully"));
}

export {
    createEnrollment,
    getMyEnrollments,
    getEnrollmentById,
    withdrawEnrollment
}