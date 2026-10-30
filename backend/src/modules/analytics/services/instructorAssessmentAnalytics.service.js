import mongoose from "mongoose";
import { Course } from "../../course/models/course.model.js";
import { Topic } from "../../topic/models/topic.model.js";
import { Assessment } from "../../assessment/models/assessment.model.js";
import { AssessmentAttempt } from "../../assessmentAttempt/models/assessmentAttempt.model.js";
import { Question } from "../../question/models/question.model.js";
import { TopicMastery } from "../../topicMastery/models/topicMastery.model.js";
import { Enrollment } from "../../enrollment/models/enrollment.model.js";
import { MASTERY_STATUS } from "../../topicMastery/constants/mastery.constants.js";
import { ApiError } from "../../../shared/errors/ApiError.js";

function requireObjectId(value, fieldName = "ID") {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
        throw new ApiError(400, "VALIDATION_ERROR", `Invalid ${fieldName}`);
    }
}

function sameId(a, b) {
    return a != null && b != null && a.toString() === b.toString();
}

/**
 * Authoritative answer equality check matching assessmentAttempt.service.js
 */
function answersEqual(type, actual, expected) {
    if (actual == null) return false;
    if (type === "MCQ_MULTIPLE") {
        if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
        const left = [...actual].sort();
        const right = [...expected].sort();
        return left.length === right.length && left.every((value, index) => value === right[index]);
    }
    return actual === expected;
}

/**
 * Service to aggregate assessment-level analytics and actionable insights for a course.
 *
 * @param {string|ObjectId} instructorId
 * @param {string|ObjectId} courseId
 * @returns {Promise<Object>}
 */
export async function getInstructorAssessmentAnalyticsService(instructorId, courseId) {
    requireObjectId(instructorId, "instructorId");
    requireObjectId(courseId, "courseId");

    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    // 1. Verify Course Existence & Instructor Ownership
    const course = await Course.findById(courseObjectId).lean();
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found");
    }
    if (course.createdBy.toString() !== instructorObjectId.toString()) {
        throw new ApiError(403, "COURSE_ACCESS_DENIED", "You do not have permission to view analytics for this course");
    }

    // 2. Fetch Topics for Course
    const topics = await Topic.find({ courseId: courseObjectId }).sort({ order: 1 }).lean();
    const topicMap = new Map();
    for (const t of topics) {
        topicMap.set(t._id.toString(), t);
    }

    // 3. Fetch Enrolled learners count (authoritative unique learners)
    const enrollments = await Enrollment.find({ courseId: courseObjectId }).lean();
    const uniqueLearnerIdsSet = new Set(enrollments.map((e) => e.learnerId.toString()));
    const totalEnrolledLearners = uniqueLearnerIdsSet.size;

    // 4. Fetch All Assessments for this course
    const assessments = await Assessment.find({ courseId: courseObjectId }).sort({ createdAt: 1 }).lean();

    // 5. Fetch All SUBMITTED AssessmentAttempts for this course
    const submittedAttempts = await AssessmentAttempt.find({
        courseId: courseObjectId,
        status: "SUBMITTED",
    }).lean();

    // Map submitted attempts by assessmentId
    const attemptsByAssessmentMap = new Map();
    for (const att of submittedAttempts) {
        const aid = att.assessmentId.toString();
        if (!attemptsByAssessmentMap.has(aid)) {
            attemptsByAssessmentMap.set(aid, []);
        }
        attemptsByAssessmentMap.get(aid).push(att);
    }

    // In-progress attempts for completion-ratio metrics
    const inProgressAttempts = await AssessmentAttempt.find({
        courseId: courseObjectId,
        status: "IN_PROGRESS",
    }).lean();
    const inProgressByAssessmentMap = new Map();
    for (const att of inProgressAttempts) {
        const aid = att.assessmentId.toString();
        if (!inProgressByAssessmentMap.has(aid)) {
            inProgressByAssessmentMap.set(aid, []);
        }
        inProgressByAssessmentMap.get(aid).push(att);
    }

    // 6. Aggregate Metrics Per Assessment
    const assessmentSummaries = [];
    const assessmentLearnerResultsMap = new Map(); // assessmentId -> Map(learnerId -> latestEvaluatedResult)

    for (const asm of assessments) {
        const aid = asm._id.toString();
        const asmSubmittedAttempts = attemptsByAssessmentMap.get(aid) || [];
        const inProgressList = inProgressByAssessmentMap.get(aid) || [];

        const totalAttempts = asmSubmittedAttempts.length;
        const inProgressCount = inProgressList.length;

        const uniqueAttemptingLearners = new Set(asmSubmittedAttempts.map((att) => att.learnerId.toString()));
        const uniqueLearnersCount = uniqueAttemptingLearners.size;

        const topic = asm.topicId ? topicMap.get(asm.topicId.toString()) : null;

        // Evaluated vs Unevaluated separation
        let evaluatedAttemptsCount = 0;
        let unevaluatedAttemptsCount = 0;
        let evaluatedPassedCount = 0;
        let evaluatedFailedCount = 0;
        let totalEvaluatedScoreSum = 0;

        const scoreDistribution = {
            range0To49: 0,
            range50To69: 0,
            range70To84: 0,
            range85To100: 0,
        };

        const learnerEvaluatedAttempts = new Map(); // learnerId -> list of evaluated attempts

        for (const att of asmSubmittedAttempts) {
            const hasScore = att.scorePercent !== null && att.scorePercent !== undefined && typeof att.scorePercent === "number";

            // Fallback rule: Prefer stored att.passed; if null, compare scorePercent against att.passingScore (never current Assessment.passingScore)
            let passed = null;
            if (att.passed !== null && att.passed !== undefined && typeof att.passed === "boolean") {
                passed = att.passed;
            } else if (hasScore && att.passingScore !== null && att.passingScore !== undefined && typeof att.passingScore === "number") {
                passed = att.scorePercent >= att.passingScore;
            }

            const isEvaluated = hasScore && passed !== null;

            if (isEvaluated) {
                evaluatedAttemptsCount += 1;
                totalEvaluatedScoreSum += att.scorePercent;

                if (passed) {
                    evaluatedPassedCount += 1;
                } else {
                    evaluatedFailedCount += 1;
                }

                if (att.scorePercent < 50) {
                    scoreDistribution.range0To49 += 1;
                } else if (att.scorePercent < 70) {
                    scoreDistribution.range50To69 += 1;
                } else if (att.scorePercent < 85) {
                    scoreDistribution.range70To84 += 1;
                } else {
                    scoreDistribution.range85To100 += 1;
                }

                const lid = att.learnerId.toString();
                if (!learnerEvaluatedAttempts.has(lid)) {
                    learnerEvaluatedAttempts.set(lid, []);
                }
                learnerEvaluatedAttempts.get(lid).push({
                    scorePercent: att.scorePercent,
                    passed,
                    submittedAt: att.submittedAt,
                });
            } else {
                unevaluatedAttemptsCount += 1;
            }
        }

        assessmentLearnerResultsMap.set(aid, learnerEvaluatedAttempts);

        // Average score and pass/fail percentages use strictly evaluatedAttemptsCount denominator
        const averageScore = evaluatedAttemptsCount > 0
            ? Math.round(totalEvaluatedScoreSum / evaluatedAttemptsCount)
            : null;

        const passPercentage = evaluatedAttemptsCount > 0
            ? Math.round((evaluatedPassedCount / evaluatedAttemptsCount) * 100)
            : null;

        const failPercentage = evaluatedAttemptsCount > 0
            ? Math.round((evaluatedFailedCount / evaluatedAttemptsCount) * 100)
            : null;

        // Participation rate = unique learners who attempted / total enrolled learners
        const participationRate = totalEnrolledLearners > 0
            ? Math.round((uniqueLearnersCount / totalEnrolledLearners) * 100)
            : null;

        // Completion rate = submitted attempts / (submitted attempts + in-progress attempts)
        const totalStartedAttempts = totalAttempts + inProgressCount;
        const completionRate = totalStartedAttempts > 0
            ? Math.round((totalAttempts / totalStartedAttempts) * 100)
            : null;

        const summaryItem = {
            assessmentId: aid,
            title: asm.title,
            type: asm.type,
            status: asm.status,
            topicId: asm.topicId ? asm.topicId.toString() : null,
            topicTitle: topic ? topic.title : null,
            topicOrder: topic ? topic.order : null,
            passingScore: asm.passingScore,
            questionsPerAttempt: asm.questionsPerAttempt,
            totalPoolQuestions: asm.questionIds ? asm.questionIds.length : 0,
            totalAttempts,
            uniqueLearnersCount,
            evaluatedAttemptsCount,
            unevaluatedAttemptsCount,
            inProgressAttemptsCount: inProgressCount,
            passedCount: evaluatedPassedCount,
            failedCount: evaluatedFailedCount,
            passPercentage,
            failPercentage,
            averageScore,
            participationRate,
            completionRate,
            scoreDistribution,
            hasEvaluatedData: evaluatedAttemptsCount > 0,
        };

        assessmentSummaries.push(summaryItem);
    }

    // 7. Fetch Topic Mastery Records for cross-topic insight generation (with learner mapping)
    const masteryRecords = await TopicMastery.find({ courseId: courseObjectId }).lean();
    // Map: topicIdStr -> Map(learnerIdStr -> TopicMastery)
    const topicLearnerMasteryMap = new Map();
    for (const m of masteryRecords) {
        const tid = m.topicId.toString();
        const lid = m.learnerId.toString();
        if (!topicLearnerMasteryMap.has(tid)) {
            topicLearnerMasteryMap.set(tid, new Map());
        }
        topicLearnerMasteryMap.get(tid).set(lid, m);
    }

    // 8. Generate Explainable Actionable Instructor Insights (No unapproved thresholds)
    const insights = [];

    for (const a of assessmentSummaries) {
        // A. No attempts or unevaluated data notice
        if (a.totalAttempts === 0) {
            insights.push({
                id: `activity-pending-${a.assessmentId}`,
                category: "DATA_LIMITATION",
                title: `Awaiting Activity: "${a.title}"`,
                observation: `No submitted attempts recorded yet for ${a.type} assessment "${a.title}".`,
                supportingEvidence: `0 submitted attempts (${totalEnrolledLearners} enrolled learners).`,
                reference: {
                    type: "ASSESSMENT",
                    id: a.assessmentId,
                    title: a.title,
                    assessmentType: a.type,
                    topicId: a.topicId,
                },
                suggestedAction: "Encourage enrolled learners to complete this assessment when they finish prerequisite lessons.",
                dataLimitationNotice: "Performance statistics remain unavailable until learners submit attempts.",
            });
        } else if (a.evaluatedAttemptsCount === 0 && a.totalAttempts > 0) {
            insights.push({
                id: `evaluation-pending-${a.assessmentId}`,
                category: "DATA_LIMITATION",
                title: `Evaluation Pending: "${a.title}"`,
                observation: `${a.totalAttempts} attempt(s) submitted but pending evaluation.`,
                supportingEvidence: `Evaluated attempts: 0 of ${a.totalAttempts} submitted.`,
                reference: {
                    type: "ASSESSMENT",
                    id: a.assessmentId,
                    title: a.title,
                    assessmentType: a.type,
                    topicId: a.topicId,
                },
                suggestedAction: "Inspect submission status and scoring pipeline for pending attempts.",
                dataLimitationNotice: "Performance scores will be calculated once attempt results are recorded.",
            });
        } else {
            // Observed activity with evaluated attempts
            if (a.inProgressAttemptsCount > 0) {
                insights.push({
                    id: `active-attempts-${a.assessmentId}`,
                    category: "COMPLETION",
                    title: `Ongoing Activity on "${a.title}"`,
                    observation: `${a.inProgressAttemptsCount} in-progress attempt(s) alongside ${a.totalAttempts} submitted attempt(s).`,
                    supportingEvidence: `Completion rate: ${a.completionRate}%, ${a.uniqueLearnersCount} unique participant(s).`,
                    reference: {
                        type: "ASSESSMENT",
                        id: a.assessmentId,
                        title: a.title,
                        assessmentType: a.type,
                        topicId: a.topicId,
                    },
                    suggestedAction: "Monitor attempt completion or review time limits if learners frequently pause.",
                    dataLimitationNotice: "In-progress attempts are not counted in score or pass/fail distributions.",
                });
            }

            if (a.evaluatedAttemptsCount > 0 && a.failPercentage !== null) {
                insights.push({
                    id: `observed-performance-${a.assessmentId}`,
                    category: "PERFORMANCE",
                    title: `Performance Distribution on "${a.title}"`,
                    observation: `${a.passedCount} passed and ${a.failedCount} did not pass across ${a.evaluatedAttemptsCount} evaluated attempt(s).`,
                    supportingEvidence: `Pass rate: ${a.passPercentage}%, Average score: ${a.averageScore}%.`,
                    reference: {
                        type: "ASSESSMENT",
                        id: a.assessmentId,
                        title: a.title,
                        assessmentType: a.type,
                        topicId: a.topicId,
                    },
                    suggestedAction: "Inspect question-level responses to review specific topics or concepts where learners lost marks.",
                    dataLimitationNotice: "Calculated strictly from submitted evaluated attempts.",
                });
            }
        }

        // B. Topic-Assessment Evidence Correlation (Learner-level match required)
        if (a.topicId && a.evaluatedAttemptsCount > 0) {
            const learnerMapForTopic = topicLearnerMasteryMap.get(a.topicId);
            const learnerResultsForAsm = assessmentLearnerResultsMap.get(a.assessmentId);

            if (learnerMapForTopic && learnerResultsForAsm) {
                // Find learners who have BOTH NEEDS_IMPROVEMENT on this topic AND an evaluated failed attempt on this assessment
                const correlatedLearnerIds = [];
                for (const [lid, attemptsList] of learnerResultsForAsm.entries()) {
                    const mastery = learnerMapForTopic.get(lid);
                    if (mastery && mastery.status === MASTERY_STATUS.NEEDS_IMPROVEMENT) {
                        const hasFailedAttempt = attemptsList.some((att) => att.passed === false);
                        if (hasFailedAttempt) {
                            correlatedLearnerIds.push(lid);
                        }
                    }
                }

                if (correlatedLearnerIds.length > 0) {
                    const topic = topicMap.get(a.topicId);
                    insights.push({
                        id: `topic-assessment-correlation-${a.assessmentId}`,
                        category: "CURRICULUM_ALIGNMENT",
                        title: `Learner Evidence Corroboration: "${topic ? topic.title : 'Topic'}"`,
                        observation: `${correlatedLearnerIds.length} learner(s) exhibit both Needs Improvement topic mastery and non-passing assessment attempts on "${a.title}".`,
                        supportingEvidence: `Matched learner IDs show demonstrated learning difficulty across practice/assessment evidence.`,
                        reference: {
                            type: "TOPIC",
                            id: a.topicId,
                            title: topic ? topic.title : "Topic",
                            assessmentId: a.assessmentId,
                        },
                        suggestedAction: "Provide targeted review materials or formative practice exercises for the affected learners.",
                        dataLimitationNotice: "Corroborated strictly for matching learners with both topic mastery records and evaluated attempts.",
                    });
                }
            }
        }
    }

    return {
        courseId: course._id.toString(),
        courseTitle: course.title,
        totalEnrolledLearners,
        totalAssessmentsCount: assessments.length,
        totalSubmittedAttempts: submittedAttempts.length,
        assessments: assessmentSummaries,
        insights,
    };
}

/**
 * Service to aggregate question-level response statistics for a specific assessment.
 *
 * @param {string|ObjectId} instructorId
 * @param {string|ObjectId} assessmentId
 * @returns {Promise<Object>}
 */
export async function getInstructorQuestionAnalyticsService(instructorId, assessmentId) {
    requireObjectId(instructorId, "instructorId");
    requireObjectId(assessmentId, "assessmentId");

    const assessmentObjectId = new mongoose.Types.ObjectId(assessmentId);
    const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

    // 1. Verify Assessment & Instructor Course Ownership
    const assessment = await Assessment.findById(assessmentObjectId).lean();
    if (!assessment) {
        throw new ApiError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    }

    const course = await Course.findById(assessment.courseId).lean();
    if (!course) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Associated course not found");
    }
    if (course.createdBy.toString() !== instructorObjectId.toString()) {
        throw new ApiError(403, "COURSE_ACCESS_DENIED", "You do not have permission to view question analytics for this assessment");
    }

    // 2. Fetch Questions from Question Pool
    const questions = await Question.find({ _id: { $in: assessment.questionIds || [] } }).lean();
    const questionMap = new Map();
    for (const q of questions) {
        questionMap.set(q._id.toString(), q);
    }

    // 3. Fetch all SUBMITTED attempts for this assessment
    const attempts = await AssessmentAttempt.find({
        assessmentId: assessmentObjectId,
        status: "SUBMITTED",
    }).lean();

    // 4. Aggregate Question Responses
    const questionStatsMap = new Map();

    for (const q of questions) {
        const qid = q._id.toString();
        questionStatsMap.set(qid, {
            questionId: qid,
            questionText: q.questionText,
            type: q.type,
            difficulty: q.difficulty || "MEDIUM",
            marks: q.marks || 1,
            totalExposures: 0,
            eligibleResponsesCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            unansweredCount: 0,
        });
    }

    // Aggregate from submitted attempts using attempt snapshots
    for (const att of attempts) {
        const answersMap = new Map();
        for (const ansItem of (att.answers || [])) {
            answersMap.set(ansItem.questionId.toString(), ansItem.answer);
        }

        for (const snap of (att.questions || [])) {
            const qid = snap.questionId.toString();

            if (!questionStatsMap.has(qid)) {
                questionStatsMap.set(qid, {
                    questionId: qid,
                    questionText: snap.questionText,
                    type: snap.type,
                    difficulty: "MEDIUM",
                    marks: snap.marks,
                    totalExposures: 0,
                    eligibleResponsesCount: 0,
                    correctCount: 0,
                    incorrectCount: 0,
                    unansweredCount: 0,
                });
            }

            const stat = questionStatsMap.get(qid);
            stat.totalExposures += 1;

            const submittedAnswer = answersMap.has(qid) ? answersMap.get(qid) : null;

            if (submittedAnswer === null || submittedAnswer === undefined || submittedAnswer === "") {
                stat.unansweredCount += 1;
            } else {
                stat.eligibleResponsesCount += 1;
                // Use authoritative answersEqual logic matching assessmentAttempt.service.js
                const isCorrect = answersEqual(snap.type, submittedAnswer, snap.correctAnswer);
                if (isCorrect) {
                    stat.correctCount += 1;
                } else {
                    stat.incorrectCount += 1;
                }
            }
        }
    }

    // Calculate percentages & performance summaries without arbitrary threshold classifications
    const questionAnalyticsList = [];
    const questionInsights = [];

    for (const stat of questionStatsMap.values()) {
        const total = stat.totalExposures;
        const correctPercentage = total > 0 ? Math.round((stat.correctCount / total) * 100) : null;
        const incorrectPercentage = total > 0 ? Math.round((stat.incorrectCount / total) * 100) : null;
        const unansweredPercentage = total > 0 ? Math.round((stat.unansweredCount / total) * 100) : null;

        const item = {
            questionId: stat.questionId,
            questionText: stat.questionText,
            type: stat.type,
            configuredDifficulty: stat.difficulty,
            marks: stat.marks,
            totalExposures: stat.totalExposures,
            eligibleResponsesCount: stat.eligibleResponsesCount,
            correctCount: stat.correctCount,
            incorrectCount: stat.incorrectCount,
            unansweredCount: stat.unansweredCount,
            correctPercentage,
            incorrectPercentage,
            unansweredPercentage,
            hasResponses: total > 0,
        };

        questionAnalyticsList.push(item);

        if (total > 0) {
            questionInsights.push({
                id: `q-observed-response-${stat.questionId}`,
                category: "QUESTION_PERFORMANCE",
                title: `Response Breakdown for Question`,
                observation: `${stat.correctCount} correct, ${stat.incorrectCount} incorrect, and ${stat.unansweredCount} unanswered out of ${total} attempt exposures.`,
                supportingEvidence: `Accuracy: ${correctPercentage ?? 'N/A'}%, Incorrect: ${incorrectPercentage ?? 'N/A'}%, Unanswered: ${unansweredPercentage ?? 'N/A'}%.`,
                reference: {
                    type: "QUESTION",
                    id: stat.questionId,
                    questionText: stat.questionText.slice(0, 100),
                    assessmentId: assessment._id.toString(),
                },
                suggestedAction: "Review question phrasing and answer options against learner performance.",
                dataLimitationNotice: "Reflects student response distributions without classifying questions as defective.",
            });
        }
    }

    return {
        assessmentId: assessment._id.toString(),
        assessmentTitle: assessment.title,
        assessmentType: assessment.type,
        passingScore: assessment.passingScore,
        totalPoolQuestions: questionAnalyticsList.length,
        totalCompletedAttempts: attempts.length,
        questions: questionAnalyticsList,
        questionInsights,
    };
}
