import { Enrollment } from "../models/enrollment.model.js";
import { Course } from "../../course/models/course.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

export async function evaluatePrerequisites(learnerId, prerequisiteCourseIds = []) {
    const rawIds = Array.isArray(prerequisiteCourseIds) ? prerequisiteCourseIds : [];
    const validIds = rawIds.filter((id) => id && /^[0-9a-fA-F]{24}$/.test(String(id)));

    if (validIds.length === 0) {
        return { isSatisfied: true, completedCourseIds: [], unmetCourseIds: [] };
    }

    const completedEnrollments = await Enrollment.find({
        learnerId,
        courseId: { $in: validIds },
        status: "COMPLETED",
    }).select("courseId").lean();

    const completedSet = new Set(completedEnrollments.map((e) => e.courseId.toString()));
    const unmetCourseIds = validIds
        .map((id) => id.toString())
        .filter((idStr) => !completedSet.has(idStr));

    return {
        isSatisfied: unmetCourseIds.length === 0,
        completedCourseIds: Array.from(completedSet),
        unmetCourseIds,
    };
}

async function assertPrerequisitesSatisfied(learnerId, prerequisiteCourseIds) {
    if (!prerequisiteCourseIds || prerequisiteCourseIds.length === 0) return;

    const evaluation = await evaluatePrerequisites(learnerId, prerequisiteCourseIds);

    if (!evaluation.isSatisfied) {
        throw new ApiError(
            409,
            "PREREQUISITE_NOT_SATISFIED",
            "All prerequisite courses must be completed before enrolling in this course"
        );
    }
}

async function assertDiagnosticEligibility(learnerId, courseId, diagnosticPolicy, session = null) {
    if (!diagnosticPolicy?.enabled) return;

    const query = AssessmentAttempt.findOne({
        learnerId,
        courseId,
        assessmentType: "DIAGNOSTIC",
        status: "SUBMITTED",
        passed: true,
    }).sort({ submittedAt: -1, _id: -1 });

    const passingAttempt = await (session ? query.session(session) : query);

    if (!passingAttempt) {
        throw new ApiError(
            409,
            "DIAGNOSTIC_REQUIRED",
            "Passing a diagnostic assessment is required before enrolling in this course"
        );
    }
}

const createEnrollmentService = async(learnerId, courseId, session = null) =>{
    const courseQuery = Course.findById(courseId);
    const course = await (session ? courseQuery.session(session) : courseQuery);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.status !== "PUBLISHED") {
        throw new ApiError(409, "COURSE_NOT_ENROLLABLE", "Course is not open for enrollment");
    }

    const enrollmentQuery = Enrollment.findOne({
        learnerId,
        courseId,
        status: "ACTIVE"
    });
    const existingActiveEnrollment = await (session ? enrollmentQuery.session(session) : enrollmentQuery);

    if (existingActiveEnrollment) {
        throw new ApiError(409, "ALREADY_ENROLLED", "You are already enrolled in this course");
    }

    const prerequisiteCourseIds = course.prerequisites?.courses ?? [];
    await assertPrerequisitesSatisfied(learnerId, prerequisiteCourseIds);

    await assertDiagnosticEligibility(learnerId, courseId, course.diagnosticPolicy, session);

    try {
        if (session) {
            const [created] = await Enrollment.create([{ learnerId, courseId, status: "ACTIVE" }], { session });
            return created;
        }
        return await Enrollment.create({ learnerId, courseId, status: "ACTIVE" });
    } catch (error) {
        if (error?.code === 11000 && (
            error?.keyPattern?.status ||
            error?.message?.includes("uniq_active_enrollment_per_learner_course")
        )) {
            throw new ApiError(409, "ALREADY_ENROLLED", "You are already enrolled in this course");
        }
        throw error;
    }
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