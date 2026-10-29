import { Course } from "../models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Resource } from "../../resource/models/resource.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { withTransaction } from "../../../shared/utils/withTransaction.js";
import { ApiError } from "../../../shared/errors/ApiError.js";
import { validatePrerequisiteCourses, checkCourseReadiness } from "./courseReadiness.service.js";

function buildEstimatedDuration(estimatedDuration) {
    if (!estimatedDuration) return undefined;

    const { source, hours, weeks } = estimatedDuration;

    const hasHours = hours !== null && hours !== undefined;
    const hasWeeks = weeks !== null && weeks !== undefined;

    if (!hasHours && !hasWeeks) {
        throw new ApiError(
            400,
            "INVALID_DURATION",
            "estimatedDuration must include a value for hours, weeks, or both"
        );
    }

    return {
        source,
        hours: hasHours ? hours : null,
        weeks: hasWeeks ? weeks : null
    };
}

function validateDiagnosticPolicy(diagnosticPolicy) {
    if (!diagnosticPolicy || diagnosticPolicy.enabled !== true) return;

    const { passingScore, questionsPerAttempt } = diagnosticPolicy;

    if (passingScore === null || passingScore === undefined) {
        throw new ApiError(
            400,
            "INVALID_DIAGNOSTIC_POLICY",
            "passingScore is required when diagnosticPolicy is enabled"
        );
    }

    if (questionsPerAttempt === null || questionsPerAttempt === undefined) {
        throw new ApiError(
            400,
            "INVALID_DIAGNOSTIC_POLICY",
            "questionsPerAttempt is required when diagnosticPolicy is enabled"
        );
    }
}


const createCourseService = async(userId, courseData)=>{
    const {
        title,
        description,
        domain,
        category,
        difficulty,
        objectives,
        estimatedDuration,
        prerequisites,
        diagnosticPolicy,
        progressionPolicy
    } = courseData;

    const prerequisiteCourseIds = prerequisites?.courses ?? [];

    if (prerequisiteCourseIds.length > 0) {
        await validatePrerequisiteCourses(prerequisiteCourseIds);
    }

    const builtEstimatedDuration = buildEstimatedDuration(estimatedDuration);

    validateDiagnosticPolicy(diagnosticPolicy);

    const course = await Course.create({
        title,
        description,
        createdBy: userId,
        domain,
        category,
        difficulty,
        objectives,
        estimatedDuration: builtEstimatedDuration,
        prerequisites: prerequisites
            ? {
                  courses: prerequisiteCourseIds,
                  knowledge: prerequisites.knowledge ?? []
              }
            : undefined,
        diagnosticPolicy,
        progressionPolicy,
        status: "DRAFT"
    });

    return course;
}

const instructorCoursesService = async(userId)=>{
    const courses = await Course.find({ createdBy: userId }).sort({
        createdAt: -1
    });

    return courses;
}

const getCourseByIdService = async(userId, userRole, courseId)=>{
    const course = await Course.findById(courseId);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (userRole === "INSTRUCTOR") {
        if (!userId || course.createdBy.toString() !== userId.toString()) {
            throw new ApiError(
                403,
                "COURSE_ACCESS_DENIED",
                "You are not authorized to access this course"
            );
        }
        return course;
    }

    if (userRole === "LEARNER") {
        if (course.status !== "PUBLISHED") {
            throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
        }
        return course;
    }

    throw new ApiError(403, "COURSE_ACCESS_DENIED", "You are not authorized to access this course");
}

const DRAFT_EDITABLE_FIELDS = [
    "title",
    "description",
    "domain",
    "category",
    "difficulty",
    "objectives",
    "estimatedDuration",
    "prerequisites",
    "diagnosticPolicy",
    "progressionPolicy"
];

const PUBLISHED_EDITABLE_FIELDS = [
    "title",
    "description",
    "objectives",
    "estimatedDuration"
];

function assertNoSelfReference(courseId, prerequisiteCourseIds) {
    if (
        prerequisiteCourseIds.some(
            (id) => id.toString() === courseId.toString()
        )
    ) {
        throw new ApiError(
            400,
            "SELF_REFERENCE_NOT_ALLOWED",
            "A course cannot list itself as its own prerequisite"
        );
    }
}

const updateCourseServiceInternal = async (userId, courseId, updateData, session = null) => {
    const courseQuery = Course.findById(courseId);
    const course = await (session ? courseQuery.session(session) : courseQuery);

    if (!course) {
        throw new ApiError(
            404,
            "COURSE_NOT_FOUND",
            "Course not found"
        );
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "COURSE_ACCESS_DENIED",
            "You are not authorized to update this course"
        );
    }

    if (course.status === "ARCHIVED") {
        throw new ApiError(
            400,
            "COURSE_NOT_EDITABLE",
            "Archived courses cannot be edited"
        );
    }

    const editableFields =
        course.status === "DRAFT"
            ? DRAFT_EDITABLE_FIELDS
            : PUBLISHED_EDITABLE_FIELDS;

    const forbiddenFields = Object.keys(updateData).filter(
        (field) => !editableFields.includes(field)
    );

    if (forbiddenFields.length > 0) {
        throw new ApiError(
            400,
            "FIELD_NOT_EDITABLE",
            `The following fields cannot be modified: ${forbiddenFields.join(", ")}`
        );
    }

    const update = { ...updateData };

    if (update.estimatedDuration) {
        update.estimatedDuration = buildEstimatedDuration({
            source: "MANUAL",
            hours:
                update.estimatedDuration.hours !== undefined
                    ? update.estimatedDuration.hours
                    : course.estimatedDuration?.hours ?? null,
            weeks:
                update.estimatedDuration.weeks !== undefined
                    ? update.estimatedDuration.weeks
                    : course.estimatedDuration?.weeks ?? null
        });
    }

    if (update.prerequisites) {
        const prerequisiteCourseIds =
            update.prerequisites.courses ?? [];

        assertNoSelfReference(courseId, prerequisiteCourseIds);

        const existingPrereqIds = course.prerequisites?.courses ?? [];
        await validatePrerequisiteCourses(prerequisiteCourseIds, courseId, session, existingPrereqIds);

        update.prerequisites = {
            courses: prerequisiteCourseIds,
            knowledge: update.prerequisites.knowledge ?? []
        };
    }

    if (update.diagnosticPolicy) {
        update.diagnosticPolicy = {
            ...course.diagnosticPolicy?.toObject(),
            ...update.diagnosticPolicy
        };

        validateDiagnosticPolicy(update.diagnosticPolicy);

        // Once a diagnostic assessment is published, its course policy is locked.
        // The transaction shares a write fence with Assessment publication so a
        // concurrent policy edit and publication cannot both succeed inconsistently.
        const publishedDiagnosticQuery = Assessment.exists({ courseId: course._id, type: "DIAGNOSTIC", status: "PUBLISHED" });
        const publishedDiagnostic = await (session ? publishedDiagnosticQuery.session(session) : publishedDiagnosticQuery);
        if (publishedDiagnostic) {
            throw new ApiError(409, "DIAGNOSTIC_POLICY_LOCKED", "Diagnostic policy cannot change after a diagnostic assessment is published");
        }
    }

    if (update.progressionPolicy) {
        update.progressionPolicy = {
            ...course.progressionPolicy?.toObject(),
            ...update.progressionPolicy
        };
    }

    course.set(update);

    await course.save(session ? { session } : undefined);

    return course;
};

const updateCourseService = async (userId, courseId, updateData) => {
    if (Object.prototype.hasOwnProperty.call(updateData ?? {}, "diagnosticPolicy")) {
        return withTransaction((session) => updateCourseServiceInternal(userId, courseId, updateData, session));
    }
    return updateCourseServiceInternal(userId, courseId, updateData);
};

const publishCourseService = async (userId, courseId) => {
    return withTransaction(async (session) => {
        const readiness = await checkCourseReadiness(courseId, userId, session);
        const { course, topics, topicAssessmentsMap, finalAssessment, diagnosticAssessment, activeResources } = readiness;

        // Write fence against concurrent course modifications
        const courseFence = await Course.updateOne(
            { _id: course._id, status: "DRAFT" },
            { $inc: { lifecycleVersion: 1 } },
            { session }
        );
        if (courseFence.modifiedCount !== 1) {
            throw new ApiError(409, "COURSE_STATE_CHANGED", "Course state changed during publication; reload and retry");
        }

        // Write fence all active resources validating topic readiness against concurrent archival
        if (activeResources && activeResources.length > 0) {
            const activeResourceIds = activeResources.map((r) => r._id);
            const resourceFence = await Resource.updateMany(
                { _id: { $in: activeResourceIds }, status: "ACTIVE" },
                { $inc: { __v: 1 } },
                { session }
            );
            if (resourceFence.modifiedCount !== activeResourceIds.length) {
                throw new ApiError(409, "RESOURCE_STATE_CHANGED", "A resource state changed during publication; reload and retry");
            }
        }

        // Snapshot publication-time required assessments onto each Topic
        const topicSnapshots = [];
        for (const topic of topics) {
            const publishedAssessments = topicAssessmentsMap.get(topic._id.toString()) || [];
            const requiredAssessmentIds = publishedAssessments.map((a) => a._id);
            await Topic.updateOne(
                { _id: topic._id, courseId: course._id },
                { $set: { requiredAssessmentIds } },
                { session }
            );
            topicSnapshots.push({
                topicId: topic._id,
                requiredAssessmentIds
            });
        }

        // Write fence all evaluated assessments
        const allEvaluatedAssessmentIds = [
            ...topicSnapshots.flatMap((t) => t.requiredAssessmentIds),
            finalAssessment._id,
            diagnosticAssessment ? diagnosticAssessment._id : null
        ].filter(Boolean);

        const assessmentFence = await Assessment.updateMany(
            { _id: { $in: allEvaluatedAssessmentIds }, status: "PUBLISHED" },
            { $inc: { attemptVersion: 1 } },
            { session }
        );
        if (assessmentFence.modifiedCount !== allEvaluatedAssessmentIds.length) {
            throw new ApiError(409, "ASSESSMENT_STATE_CHANGED", "An assessment state changed during publication; reload and retry");
        }

        course.status = "PUBLISHED";
        course.publicationRequirements = {
            publishedAt: new Date(),
            finalAssessmentId: finalAssessment._id,
            diagnosticAssessmentId: diagnosticAssessment ? diagnosticAssessment._id : null,
            topics: topicSnapshots
        };

        await course.save({ session });
        return course;
    });
};

const archiveCourseService = async(userId, courseId)=>{
    const course = await Course.findById(courseId);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "COURSE_ACCESS_DENIED",
            "You are not authorized to archive this course"
        );
    }

    if (course.status === "ARCHIVED") {
        throw new ApiError(400, "INVALID_COURSE_STATUS", "Course is already archived");
    }

    course.status = "ARCHIVED";
    await course.save();

    return course;
}

const discoverCoursesService = async(query)=>{
    const { search, domain, category, difficulty, page, limit } = query;

    const filter = { status: "PUBLISHED" };

    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    if (domain) filter.domain = domain;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const skip = (page - 1) * limit;

    const [courses, totalCourses] = await Promise.all([
        Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / limit);

    return {
        courses,
        pagination: {
            page,
            limit,
            totalCourses,
            totalPages
        }
    };
}

export {
    createCourseService,
    instructorCoursesService,
    getCourseByIdService,
    updateCourseService,
    publishCourseService,
    archiveCourseService,
    discoverCoursesService
}
