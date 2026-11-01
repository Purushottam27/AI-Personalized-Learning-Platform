import mongoose from "mongoose";
import { Course } from "../../course/models/course.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { User } from "../../identity/models/user.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function requireObjectId(value, fieldName = "ID") {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        throw new ApiError(400, "VALIDATION_ERROR", `Invalid ${fieldName}`);
    }
}

const ENROLLMENT_STATUS_PRIORITY = {
    ACTIVE: 3,
    COMPLETED: 2,
    WITHDRAWN: 1,
};

function selectAuthoritativeEnrollments(records) {
    const byLearnerAndCourse = new Map();

    for (const enrollment of records) {
        const key = `${enrollment.courseId.toString()}:${enrollment.learnerId.toString()}`;
        const existing = byLearnerAndCourse.get(key);

        if (!existing) {
            byLearnerAndCourse.set(key, enrollment);
            continue;
        }

        const currentPriority = ENROLLMENT_STATUS_PRIORITY[enrollment.status] || 0;
        const existingPriority = ENROLLMENT_STATUS_PRIORITY[existing.status] || 0;
        const currentDate = new Date(enrollment.enrolledAt || enrollment.createdAt || 0).getTime();
        const existingDate = new Date(existing.enrolledAt || existing.createdAt || 0).getTime();

        if (
            currentPriority > existingPriority ||
            (currentPriority === existingPriority && currentDate > existingDate)
        ) {
            byLearnerAndCourse.set(key, enrollment);
        }
    }

    return Array.from(byLearnerAndCourse.values());
}

/**
 * Consolidated learner and enrollment overview across every course owned by
 * the authenticated instructor. Mastery is intentionally not aggregated here:
 * mastery remains meaningful only within its own course context.
 */
export async function getInstructorLearnersOverviewService(instructorId, queryOptions = {}) {
    requireObjectId(instructorId, "instructorId");

    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);
    const page = Math.max(1, Number.parseInt(queryOptions.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(queryOptions.limit, 10) || 20));
    const searchTerm = String(queryOptions.search || "").trim().toLowerCase();

    const courses = await Course.find({ createdBy: instructorObjectId })
        .select("_id title status domain category difficulty")
        .sort({ createdAt: -1, _id: -1 })
        .lean();

    if (courses.length === 0) {
        return {
            overview: {
                totalCourses: 0,
                totalEnrollments: 0,
                uniqueLearnersCount: 0,
                enrollmentBreakdown: { active: 0, completed: 0, withdrawn: 0 },
            },
            courses: [],
            learners: {
                items: [],
                pagination: { totalItems: 0, totalPages: 1, currentPage: page, limit },
            },
        };
    }

    const courseIds = courses.map((course) => course._id);
    const allEnrollmentRecords = await Enrollment.find({ courseId: { $in: courseIds } })
        .select("_id learnerId courseId status enrolledAt completedAt withdrawnAt createdAt")
        .lean();

    // Resolve one authoritative enrollment per learner/course pair. A learner
    // enrolled in multiple instructor courses remains one directory entry.
    const authoritativeEnrollments = selectAuthoritativeEnrollments(allEnrollmentRecords);
    const learnerCourseMap = new Map();

    const courseSummaries = courses.map((course) => ({
        courseId: course._id.toString(),
        title: course.title,
        status: course.status,
        domain: course.domain,
        category: course.category,
        difficulty: course.difficulty,
        totalEnrollments: 0,
        enrollmentBreakdown: { active: 0, completed: 0, withdrawn: 0 },
    }));
    const courseSummaryMap = new Map(courseSummaries.map((course) => [course.courseId, course]));

    const enrollmentBreakdown = { active: 0, completed: 0, withdrawn: 0 };

    for (const enrollment of authoritativeEnrollments) {
        const learnerId = enrollment.learnerId.toString();
        const courseId = enrollment.courseId.toString();
        const courseSummary = courseSummaryMap.get(courseId);

        // Defensive guard: only instructor-owned courses are represented.
        if (!courseSummary) continue;

        const statusKey = enrollment.status.toLowerCase();
        courseSummary.totalEnrollments += 1;
        courseSummary.enrollmentBreakdown[statusKey] += 1;
        enrollmentBreakdown[statusKey] += 1;

        if (!learnerCourseMap.has(learnerId)) {
            learnerCourseMap.set(learnerId, []);
        }

        learnerCourseMap.get(learnerId).push({
            courseId,
            courseTitle: courseSummary.title,
            courseStatus: courseSummary.status,
            enrollmentStatus: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt || null,
            withdrawnAt: enrollment.withdrawnAt || null,
        });
    }

    const learnerIds = Array.from(learnerCourseMap.keys()).map(
        (id) => new mongoose.Types.ObjectId(id)
    );

    const userFilter = { _id: { $in: learnerIds } };
    if (searchTerm) {
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        userFilter.$or = [
            { name: { $regex: escapedSearch, $options: "i" } },
            { email: { $regex: escapedSearch, $options: "i" } },
        ];
    }

    const users = learnerIds.length > 0
        ? await User.find(userFilter).select("_id name email avatar status").lean()
        : [];

    const learnerItems = users.map((user) => {
        const learnerCourses = learnerCourseMap.get(user._id.toString()) || [];
        learnerCourses.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));

        return {
            learnerId: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar || null,
            accountStatus: user.status,
            coursesCount: learnerCourses.length,
            courses: learnerCourses,
        };
    }).sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));

    const totalFilteredLearners = learnerItems.length;
    const totalPages = Math.ceil(totalFilteredLearners / limit) || 1;
    const paginatedLearners = learnerItems.slice((page - 1) * limit, page * limit);

    return {
        overview: {
            totalCourses: courses.length,
            totalEnrollments: authoritativeEnrollments.length,
            uniqueLearnersCount: learnerCourseMap.size,
            enrollmentBreakdown,
        },
        courses: courseSummaries,
        learners: {
            items: paginatedLearners,
            pagination: {
                totalItems: totalFilteredLearners,
                totalPages,
                currentPage: page,
                limit,
            },
        },
    };
}
