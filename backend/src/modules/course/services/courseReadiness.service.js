import { Course } from "../models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Resource } from "../../resource/models/resource.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { Question } from "../../question/models/question.model.js";
import { QuestionBank } from "../../questionBank/models/questionBank.model.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function sameId(a, b) {
    return a != null && b != null && a.toString() === b.toString();
}

/**
 * Validates prerequisite courses for existence, no duplicates, no self-reference,
 * and ensures every referenced course is in PUBLISHED status.
 */
export async function validatePrerequisiteCourses(courseIds, currentCourseId = null, session = null) {
    if (!courseIds || courseIds.length === 0) return;

    const idStrings = courseIds.map((id) => id.toString());
    const uniqueIds = new Set(idStrings);

    if (uniqueIds.size !== idStrings.length) {
        throw new ApiError(
            400,
            "DUPLICATE_PREREQUISITE",
            "Duplicate prerequisite course references are not allowed"
        );
    }

    if (currentCourseId && uniqueIds.has(currentCourseId.toString())) {
        throw new ApiError(
            400,
            "SELF_PREREQUISITE",
            "A course cannot be its own prerequisite"
        );
    }

    const query = Course.find({ _id: { $in: courseIds } }).select("_id status");
    const existingCourses = await (session ? query.session(session) : query);

    if (existingCourses.length !== courseIds.length) {
        throw new ApiError(
            404,
            "PREREQUISITE_NOT_FOUND",
            "One or more prerequisite courses do not exist"
        );
    }

    const nonPublished = existingCourses.filter((c) => c.status !== "PUBLISHED");
    if (nonPublished.length > 0) {
        throw new ApiError(
            400,
            "PREREQUISITE_NOT_PUBLISHED",
            "Only published courses can be selected as prerequisites"
        );
    }
}

/**
 * Validates course metadata against authoritative schema requirements.
 */
function validateCourseMetadata(course) {
    if (!course.title || typeof course.title !== "string" || course.title.trim().length < 4 || course.title.trim().length > 150) {
        throw new ApiError(400, "INVALID_COURSE_METADATA", "Course title must be between 4 and 150 characters");
    }
    if (!course.description || typeof course.description !== "string" || course.description.trim().length < 20 || course.description.trim().length > 5000) {
        throw new ApiError(400, "INVALID_COURSE_METADATA", "Course description must be between 20 and 5000 characters");
    }
    if (!course.domain || typeof course.domain !== "string" || !course.domain.trim()) {
        throw new ApiError(400, "INVALID_COURSE_METADATA", "Course domain is required");
    }
    if (!course.category || typeof course.category !== "string" || !course.category.trim()) {
        throw new ApiError(400, "INVALID_COURSE_METADATA", "Course category is required");
    }
    if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(course.difficulty)) {
        throw new ApiError(400, "INVALID_COURSE_METADATA", "Course difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED");
    }
    if (!Array.isArray(course.objectives) || course.objectives.length < 1 || course.objectives.some((o) => typeof o !== "string" || !o.trim())) {
        throw new ApiError(400, "INVALID_COURSE_METADATA", "Course must have at least one valid learning objective");
    }
}

/**
 * Validates the question pool and banks for a published assessment.
 */
async function validateAssessmentPoolReadiness(assessment, course, expectedTopicId = null, session = null) {
    const ids = assessment.questionIds ?? [];
    if (!Array.isArray(ids) || ids.length < assessment.questionsPerAttempt) {
        throw new ApiError(
            400,
            "TOPIC_NOT_READY",
            `Assessment "${assessment.title}" has fewer pool questions (${ids.length}) than questionsPerAttempt (${assessment.questionsPerAttempt})`,
            { assessmentId: assessment._id, requirement: "ASSESSMENT_POOL_SIZE" }
        );
    }

    const questionFilter = {
        _id: { $in: ids },
        status: "ACTIVE",
        courseId: course._id
    };
    if (expectedTopicId) {
        questionFilter.topicId = expectedTopicId;
    }

    const questionQuery = Question.find(questionFilter).select("_id questionBankId topicId");
    const questions = await (session ? questionQuery.session(session) : questionQuery);

    if (questions.length !== ids.length) {
        throw new ApiError(
            400,
            "TOPIC_NOT_READY",
            `Assessment "${assessment.title}" contains questions that are inactive, missing, or mismatched`,
            { assessmentId: assessment._id, requirement: "ASSESSMENT_QUESTIONS_ACTIVE" }
        );
    }

    const bankIds = [...new Set(questions.map((q) => q.questionBankId.toString()))];
    const bankQuery = QuestionBank.find({ _id: { $in: bankIds } });
    const banks = await (session ? bankQuery.session(session) : bankQuery);

    if (banks.length !== bankIds.length) {
        throw new ApiError(
            400,
            "TOPIC_NOT_READY",
            `Assessment "${assessment.title}" references missing Question Banks`,
            { assessmentId: assessment._id, requirement: "QUESTION_BANK_AVAILABLE" }
        );
    }

    const bankMap = new Map(banks.map((b) => [b._id.toString(), b]));
    for (const q of questions) {
        const bank = bankMap.get(q.questionBankId.toString());
        if (!bank || bank.status !== "ACTIVE" || !sameId(bank.courseId, course._id) || !sameId(bank.createdBy, course.createdBy)) {
            throw new ApiError(
                400,
                "TOPIC_NOT_READY",
                `Assessment "${assessment.title}" references an inactive or unauthorized Question Bank`,
                { assessmentId: assessment._id, requirement: "QUESTION_BANK_ACTIVE" }
            );
        }
    }
}

/**
 * Checks all publication-readiness rules for a Course.
 * Returns the validated entities or throws an ApiError with structured details.
 */
export async function checkCourseReadiness(courseId, userId = null, session = null) {
    const courseQuery = Course.findById(courseId);
    const course = await (session ? courseQuery.session(session) : courseQuery);

    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }

    if (userId && course.createdBy.toString() !== userId.toString()) {
        throw new ApiError(403, "COURSE_ACCESS_DENIED", "You are not authorized to publish this course");
    }

    if (course.status !== "DRAFT") {
        throw new ApiError(400, "INVALID_COURSE_STATUS", "Only draft courses can be published");
    }

    validateCourseMetadata(course);

    // Validate prerequisites
    const prereqIds = course.prerequisites?.courses ?? [];
    if (prereqIds.length > 0) {
        await validatePrerequisiteCourses(prereqIds, course._id, session);
    }

    // Load topics
    const topicsQuery = Topic.find({ courseId: course._id }).sort({ order: 1 });
    const topics = await (session ? topicsQuery.session(session) : topicsQuery);

    if (!topics || topics.length === 0) {
        throw new ApiError(
            400,
            "COURSE_NOT_READY",
            "A course must contain at least one topic to be published",
            { requirement: "TOPICS_REQUIRED" }
        );
    }

    // Verify sequential ordering starting at 1
    for (let i = 0; i < topics.length; i++) {
        if (topics[i].order !== i + 1) {
            throw new ApiError(
                400,
                "INVALID_TOPIC_ORDER",
                "Topics must be ordered sequentially starting at order 1 without gaps or duplicates",
                { topicId: topics[i]._id, expectedOrder: i + 1, actualOrder: topics[i].order }
            );
        }
    }

    const topicIds = topics.map((t) => t._id);

    // Batch-fetch ACTIVE resources for all topics in course
    const resourcesQuery = Resource.find({
        topicId: { $in: topicIds },
        status: "ACTIVE"
    }).select("_id topicId status");
    const activeResources = await (session ? resourcesQuery.session(session) : resourcesQuery);

    const activeResourcesByTopic = new Map();
    for (const r of activeResources) {
        const key = r.topicId.toString();
        activeResourcesByTopic.set(key, (activeResourcesByTopic.get(key) || 0) + 1);
    }

    // Verify every topic has at least one ACTIVE resource
    for (const topic of topics) {
        const count = activeResourcesByTopic.get(topic._id.toString()) || 0;
        if (count === 0) {
            throw new ApiError(
                400,
                "TOPIC_NOT_READY",
                `Topic "${topic.title}" must contain at least one active resource to be learner-ready`,
                { requirement: "ACTIVE_RESOURCE_REQUIRED", topicId: topic._id }
            );
        }
    }

    // Batch-fetch all PUBLISHED assessments for course
    const assessmentsQuery = Assessment.find({
        courseId: course._id,
        status: "PUBLISHED"
    });
    const publishedAssessments = await (session ? assessmentsQuery.session(session) : assessmentsQuery);

    const topicAssessmentsMap = new Map();
    let publishedFinalAssessment = null;
    let publishedDiagnosticAssessment = null;

    for (const a of publishedAssessments) {
        if (a.type === "TOPIC" && a.topicId) {
            const key = a.topicId.toString();
            if (!topicAssessmentsMap.has(key)) {
                topicAssessmentsMap.set(key, []);
            }
            topicAssessmentsMap.get(key).push(a);
        } else if (a.type === "FINAL") {
            if (!publishedFinalAssessment) {
                publishedFinalAssessment = a;
            }
        } else if (a.type === "DIAGNOSTIC") {
            if (!publishedDiagnosticAssessment) {
                publishedDiagnosticAssessment = a;
            }
        }
    }

    // Verify every topic has at least one valid PUBLISHED formal topic assessment
    for (const topic of topics) {
        const assessments = topicAssessmentsMap.get(topic._id.toString()) || [];
        if (assessments.length === 0) {
            throw new ApiError(
                400,
                "TOPIC_NOT_READY",
                `Topic "${topic.title}" must contain at least one published formal topic assessment`,
                { requirement: "TOPIC_ASSESSMENT_REQUIRED", topicId: topic._id }
            );
        }

        // Validate each published topic assessment's question pool
        for (const a of assessments) {
            await validateAssessmentPoolReadiness(a, course, topic._id, session);
        }
    }

    // Mandatory Course FINAL Assessment
    if (!publishedFinalAssessment) {
        throw new ApiError(
            400,
            "COURSE_NOT_READY",
            "A course must contain a valid, published final assessment before publication",
            { requirement: "FINAL_ASSESSMENT_REQUIRED" }
        );
    }
    await validateAssessmentPoolReadiness(publishedFinalAssessment, course, null, session);

    // Conditional Diagnostic Assessment
    if (course.diagnosticPolicy?.enabled === true) {
        if (!publishedDiagnosticAssessment) {
            throw new ApiError(
                400,
                "COURSE_NOT_READY",
                "A published diagnostic assessment matching the course diagnostic policy is required",
                { requirement: "DIAGNOSTIC_ASSESSMENT_REQUIRED" }
            );
        }

        const p = course.diagnosticPolicy;
        if (
            publishedDiagnosticAssessment.passingScore !== p.passingScore ||
            publishedDiagnosticAssessment.questionsPerAttempt !== p.questionsPerAttempt ||
            publishedDiagnosticAssessment.randomizeQuestions !== p.randomizeQuestions
        ) {
            throw new ApiError(
                400,
                "COURSE_NOT_READY",
                "Published diagnostic assessment settings do not match the course diagnostic policy",
                { requirement: "DIAGNOSTIC_POLICY_MISMATCH" }
            );
        }

        await validateAssessmentPoolReadiness(publishedDiagnosticAssessment, course, null, session);
    }

    return {
        isReady: true,
        course,
        topics,
        topicAssessmentsMap,
        finalAssessment: publishedFinalAssessment,
        diagnosticAssessment: publishedDiagnosticAssessment
    };
}

