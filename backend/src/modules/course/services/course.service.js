import { Course } from "../models/course.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

async function validatePrerequisiteCourses(courseIds) {
    if (courseIds.length === 0) return;

    // check for duplicate id's
    const idStrings = courseIds.map((id) => id.toString());
    const uniqueIds = new Set(idStrings);

    if (uniqueIds.size !== idStrings.length) {
        throw new ApiError(
            400,
            "DUPLICATE_PREREQUISITE",
            "Duplicate prerequisite course references are not allowed"
        );
    }

    // check whether all referenced courses exist
    const existingCount = await Course.countDocuments({
        _id: { $in: courseIds }
    });

    if (existingCount !== courseIds.length) {
        throw new ApiError(
            404,
            "PREREQUISITE_NOT_FOUND",
            "One or more prerequisite courses do not exist"
        );
    }
}

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

const updateCourseService = async (userId, courseId, updateData) => {
    const course = await Course.findById(courseId);

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

        await validatePrerequisiteCourses(prerequisiteCourseIds);

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
    }

    if (update.progressionPolicy) {
        update.progressionPolicy = {
            ...course.progressionPolicy?.toObject(),
            ...update.progressionPolicy
        };
    }

    course.set(update);

    await course.save();

    return course;
};

const publishCourseService = async(userId, courseId)=>{
    const course = await Course.findById(courseId);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "COURSE_ACCESS_DENIED",
            "You are not authorized to publish this course"
        );
    }

    if (course.status !== "DRAFT") {
        throw new ApiError(
            400,
            "INVALID_COURSE_STATUS",
            "Only draft courses can be published"
        );
    }

    // TODO: Before publishing, validate course learning-content
    // readiness once Topic, Resource, Practice, and Assessment
    // modules are implemented.

    course.status = "PUBLISHED";
    await course.save();

    return course;
}

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