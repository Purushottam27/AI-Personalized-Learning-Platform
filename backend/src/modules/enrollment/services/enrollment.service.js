import { Enrollment } from "../models/enrollment.model.js";
import { Course } from "../../course/models/course.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

async function assertPrerequisitesSatisfied(learnerId, prerequisiteCourseIds) {
    if (prerequisiteCourseIds.length === 0) return;

    const completedCount = await Enrollment.countDocuments({
        learnerId,
        courseId: { $in: prerequisiteCourseIds },
        status: "COMPLETED"
    });

    if (completedCount !== prerequisiteCourseIds.length) {
        throw new ApiError(
            409,
            "PREREQUISITE_NOT_SATISFIED",
            "All prerequisite courses must be completed before enrolling in this course"
        );
    }
}

function assertDiagnosticEligibility(diagnosticPolicy) {
    if (diagnosticPolicy?.enabled === true) {
        // TODO: Once the Diagnostic/Question Bank module is implemented,
        // replace this rejection with an actual diagnostic-eligibility check.
        throw new ApiError(
            409,
            "DIAGNOSTIC_REQUIRED",
            "This course requires a diagnostic assessment before enrollment, which is not yet available"
        );
    }
}

const createEnrollmentService = async(learnerId, courseId) =>{
    const course = await Course.findById(courseId);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.status !== "PUBLISHED") {
        throw new ApiError(409, "COURSE_NOT_ENROLLABLE", "Course is not open for enrollment");
    }

    const existingActiveEnrollment = await Enrollment.findOne({
        learnerId,
        courseId,
        status: "ACTIVE"
    });

    if (existingActiveEnrollment) {
        throw new ApiError(409, "ALREADY_ENROLLED", "You are already enrolled in this course");
    }

    const prerequisiteCourseIds = course.prerequisites?.courses ?? [];
    await assertPrerequisitesSatisfied(learnerId, prerequisiteCourseIds);

    assertDiagnosticEligibility(course.diagnosticPolicy);

    const enrollment = await Enrollment.create({
        learnerId,
        courseId,
        status: "ACTIVE"
    });

    return enrollment;
}

const getMyEnrollmentsService = async(learnerId)=>{
    const enrollments = await Enrollment.find({ learnerId }).sort({ enrolledAt: -1 });

    return enrollments;
}

const getEnrollmentByIdService = async(learnerId, enrollmentId) => {
    const enrollment = await Enrollment.findOne({
        _id: enrollmentId,
        learnerId
    });

    if (!enrollment) {
        throw new ApiError(404, "ENROLLMENT_NOT_FOUND", "Enrollment not found");
    }

    return enrollment;
}

const withdrawEnrollmentService = async(learnerId, enrollmentId) => {
    const enrollment = await Enrollment.findOne({
        _id: enrollmentId,
        learnerId
    });

    if (!enrollment) {
        throw new ApiError(404, "ENROLLMENT_NOT_FOUND", "Enrollment not found");
    }

    if (enrollment.status === "WITHDRAWN") {
        throw new ApiError(409, "ALREADY_WITHDRAWN", "Enrollment is already withdrawn");
    }

    if (enrollment.status === "COMPLETED") {
        throw new ApiError(
            409,
            "ENROLLMENT_ALREADY_COMPLETED",
            "Completed enrollment cannot be withdrawn"
        );
    }

    enrollment.status = "WITHDRAWN";
    enrollment.withdrawnAt = new Date();

    await enrollment.save();

    return enrollment;
}


export {
    createEnrollmentService,
    getMyEnrollmentsService,
    withdrawEnrollmentService,
    getEnrollmentByIdService
}