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

    // 2. Fetch Topics for Course (for topic mapping & context)
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
    const assessmentIds = assessments.map((a) => a._id);

    // 5. Fetch All SUBMITTED AssessmentAttempts for this course
    // IMPORTANT: In-progress attempts are not counted in completed/submitted statistics
    const attempts = await AssessmentAttempt.find({
        courseId: courseObjectId,
        status: "SUBMITTED",
    }).lean();

    // Map attempts by assessmentId
    const attemptsByAssessmentMap = new Map();
    for (const att of attempts) {
        const aid = att.assessmentId.toString();
        if (!attemptsByAssessmentMap.has(aid)) {
            attemptsByAssessmentMap.set(aid, []);
        }
        attemptsByAssessmentMap.get(aid).push(att);
    }

    // Also count in-progress attempts for completion-ratio metrics
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
    const assessmentStatsForInsights = [];

    for (const asm of assessments) {
        const aid = asm._id.toString();
        const submittedAttempts = attemptsByAssessmentMap.get(aid) || [];
        const inProgressList = inProgressByAssessmentMap.get(aid) || [];

        const totalAttempts = submittedAttempts.length;
        const inProgressCount = inProgressList.length;

        const uniqueAttemptingLearners = new Set(submittedAttempts.map((att) => att.learnerId.toString()));
        const uniqueLearnersCount = uniqueAttemptingLearners.size;

        const topic = asm.topicId ? topicMap.get(asm.topicId.toString()) : null;

        let passedCount = 0;
        let failedCount = 0;
        let totalScoreSum = 0;

        const scoreDistribution = {
            range0To49: 0,
            range50To69: 0,
            range70To84: 0,
            range85To100: 0,
        };

        for (const att of submittedAttempts) {
            // Using actual configured passing criteria stored on attempt (or assessment fallback)
            const passed = att.passed !== null && att.passed !== undefined
                ? att.passed
                : (att.scorePercent != null ? att.scorePercent >= (asm.passingScore || 60) : false);

            if (passed) {
                passedCount += 1;
            } else {
                failedCount += 1;
            }

            const score = att.scorePercent != null ? att.scorePercent : 0;
            totalScoreSum += score;

            if (score < 50) {
                scoreDistribution.range0To49 += 1;
            } else if (score < 70) {
                scoreDistribution.range50To69 += 1;
            } else if (score < 85) {
                scoreDistribution.range70To84 += 1;
            } else {
                scoreDistribution.range85To100 += 1;
            }
        }

        const averageScore = totalAttempts > 0
            ? Math.round(totalScoreSum / totalAttempts)
            : null;

        const passPercentage = totalAttempts > 0
            ? Math.round((passedCount / totalAttempts) * 100)
            : null;

        const failPercentage = totalAttempts > 0
            ? Math.round((failedCount / totalAttempts) * 100)
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
            inProgressAttemptsCount: inProgressCount,
            passedCount,
            failedCount,
            passPercentage,
            failPercentage,
            averageScore,
            participationRate,
            completionRate,
            scoreDistribution,
            hasSufficientData: totalAttempts >= 3,
        };

        assessmentSummaries.push(summaryItem);
        assessmentStatsForInsights.push(summaryItem);
    }

    // 7. Fetch Topic Mastery Records for cross-topic insight generation
    const masteryRecords = await TopicMastery.find({ courseId: courseObjectId }).lean();
    const needsImprovementTopicIds = new Set();
    for (const m of masteryRecords) {
        if (m.status === MASTERY_STATUS.NEEDS_IMPROVEMENT) {
            needsImprovementTopicIds.add(m.topicId.toString());
        }
    }

    // 8. Generate Actionable Instructor Insights
    const insights = [];

    // Rule A: Insufficient Data signals
    for (const a of assessmentStatsForInsights) {
        if (a.totalAttempts === 0) {
            insights.push({
                id: `insufficient-data-${a.assessmentId}`,
                category: "DATA_LIMITATION",
                title: `Awaiting Activity: "${a.title}"`,
                observation: `No completed attempts recorded yet for ${a.type} assessment "${a.title}".`,
                supportingEvidence: `0 submitted attempts out of ${totalEnrolledLearners} enrolled learners.`,
                reference: {
                    type: "ASSESSMENT",
                    id: a.assessmentId,
                    title: a.title,
                    assessmentType: a.type,
                    topicId: a.topicId,
                },
                suggestedAction: "Encourage learners to complete this assessment or verify prerequisite topic progression.",
                dataLimitationNotice: "Performance statistics cannot be calculated until learners submit attempts.",
            });
        } else if (a.totalAttempts < 3) {
            insights.push({
                id: `early-data-${a.assessmentId}`,
                category: "DATA_LIMITATION",
                title: `Early Data: "${a.title}"`,
                observation: `Only ${a.totalAttempts} attempt(s) recorded for "${a.title}".`,
                supportingEvidence: `${a.totalAttempts} completed attempt(s) from ${a.uniqueLearnersCount} unique learner(s).`,
                reference: {
                    type: "ASSESSMENT",
                    id: a.assessmentId,
                    title: a.title,
                    assessmentType: a.type,
                    topicId: a.topicId,
                },
                suggestedAction: "Allow more learners to complete attempts before making curriculum adjustments.",
                dataLimitationNotice: "Metrics based on fewer than 3 attempts reflect preliminary trends only.",
            });
        }
    }

    // Rule B: Low Completion Rate (drop-off / abandonment)
    for (const a of assessmentStatsForInsights) {
        if (a.totalAttempts + a.inProgressAttemptsCount >= 3 && a.completionRate !== null && a.completionRate < 60) {
            insights.push({
                id: `low-completion-${a.assessmentId}`,
                category: "COMPLETION",
                title: `Low Completion Rate on "${a.title}"`,
                observation: `${a.inProgressAttemptsCount} attempt(s) remain unsubmitted out of ${a.totalAttempts + a.inProgressAttemptsCount} started attempts.`,
                supportingEvidence: `Completion rate is currently ${a.completionRate}%.`,
                reference: {
                    type: "ASSESSMENT",
                    id: a.assessmentId,
                    title: a.title,
                    assessmentType: a.type,
                    topicId: a.topicId,
                },
                suggestedAction: "Review time limit, question length, or clarity of instructions to determine if learners are encountering fatigue or friction.",
                dataLimitationNotice: "Unsubmitted attempts may include learners who paused or timed out.",
            });
        }
    }

    // Rule C: High Failure Rate / Low Average Score on Assessments with sufficient data
    for (const a of assessmentStatsForInsights) {
        if (a.totalAttempts >= 3 && a.failPercentage !== null && a.failPercentage >= 40) {
            insights.push({
                id: `high-fail-rate-${a.assessmentId}`,
                category: "PERFORMANCE",
                title: `High Failure Rate Observed on "${a.title}"`,
                observation: `${a.failedCount} of ${a.totalAttempts} completed attempts (${a.failPercentage}%) did not meet the passing score of ${a.passingScore}%.`,
                supportingEvidence: `Average score is ${a.averageScore}%. Pass rate is ${a.passPercentage}%.`,
                reference: {
                    type: "ASSESSMENT",
                    id: a.assessmentId,
                    title: a.title,
                    assessmentType: a.type,
                    topicId: a.topicId,
                },
                suggestedAction: "Inspect question-level response accuracy to identify specific concepts where learners struggled, or add formative practice questions.",
                dataLimitationNotice: "Based on submitted attempts to date. Ensure assessment difficulty aligns with course learning objectives.",
            });
        }
    }

    // Rule D: Cross-Topic Alignment (Topic with NEEDS_IMPROVEMENT evidence and low assessment scores)
    for (const a of assessmentStatsForInsights) {
        if (a.topicId && needsImprovementTopicIds.has(a.topicId) && a.totalAttempts >= 3 && a.averageScore !== null && a.averageScore < 60) {
            const topic = topicMap.get(a.topicId);
            insights.push({
                id: `topic-assessment-misalignment-${a.assessmentId}`,
                category: "CURRICULUM_ALIGNMENT",
                title: `Evidence Convergence: Topic "${topic ? topic.title : 'Topic'}" Needs Remediation`,
                observation: `Learners exhibit Needs Improvement mastery status on Topic "${topic ? topic.title : 'Topic'}", corroborated by an average assessment score of ${a.averageScore}% on "${a.title}".`,
                supportingEvidence: `Demonstrated difficulty in topic mastery records matches ${a.failPercentage}% fail rate on formal assessment.`,
                reference: {
                    type: "TOPIC",
                    id: a.topicId,
                    title: topic ? topic.title : "Topic",
                    assessmentId: a.assessmentId,
                },
                suggestedAction: "Consider offering supplementary explanations, review sessions, or targeted practice variations before the next assessment cycle.",
                dataLimitationNotice: "Reflects multiple independent evidence sources (topic mastery and assessment attempts).",
            });
        }
    }

    return {
        courseId: course._id.toString(),
        courseTitle: course.title,
        totalEnrolledLearners,
        totalAssessmentsCount: assessments.length,
        totalSubmittedAttempts: attempts.length,
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
    // In an attempt:
    // attempt.questions[] contains questionId, type, questionText, marks
    // attempt.answers[] contains questionId, answer
    // Evaluation comparison: answerFor(attempt, questionId) vs question.correctAnswer
    function normalizeMultiAnswer(ans) {
        if (!Array.isArray(ans)) return [];
        return [...ans].sort();
    }

    function isAnswerCorrect(questionSnapshot, submittedAnswer) {
        if (submittedAnswer == null) return false;
        if (questionSnapshot.type === "MCQ_MULTIPLE") {
            const actual = normalizeMultiAnswer(submittedAnswer);
            const expected = normalizeMultiAnswer(questionSnapshot.correctAnswer);
            return actual.length === expected.length && actual.every((val, idx) => val === expected[idx]);
        }
        return submittedAnswer === questionSnapshot.correctAnswer;
    }

    // Question stats map: questionIdStr -> stats
    const questionStatsMap = new Map();

    // Initialize map for all pool questions
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

    // Aggregate from submitted attempts
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
                const correct = isAnswerCorrect(snap, submittedAnswer);
                if (correct) {
                    stat.correctCount += 1;
                } else {
                    stat.incorrectCount += 1;
                }
            }
        }
    }

    // Calculate percentages & performance signals
    const questionAnalyticsList = [];
    const questionInsights = [];

    for (const stat of questionStatsMap.values()) {
        const total = stat.totalExposures;
        const correctPercentage = total > 0 ? Math.round((stat.correctCount / total) * 100) : null;
        const incorrectPercentage = total > 0 ? Math.round((stat.incorrectCount / total) * 100) : null;
        const unansweredPercentage = total > 0 ? Math.round((stat.unansweredCount / total) * 100) : null;

        // Evidence-based signal (without declaring question defective)
        let responsePatternSignal = "NORMAL";
        if (total < 3) {
            responsePatternSignal = "INSUFFICIENT_DATA";
        } else if (unansweredPercentage !== null && unansweredPercentage >= 40) {
            responsePatternSignal = "HIGH_UNANSWERED_RATE";
        } else if (incorrectPercentage !== null && incorrectPercentage >= 50) {
            responsePatternSignal = "HIGH_INCORRECT_RATE";
        } else if (correctPercentage !== null && correctPercentage >= 80) {
            responsePatternSignal = "HIGH_ACCURACY";
        }

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
            responsePatternSignal,
            hasSufficientData: total >= 3,
        };

        questionAnalyticsList.push(item);

        // Actionable Question Insight
        if (total >= 3 && incorrectPercentage !== null && incorrectPercentage >= 50) {
            questionInsights.push({
                id: `q-high-incorrect-${stat.questionId}`,
                category: "QUESTION_PERFORMANCE",
                title: `High Incorrect Rate on Question`,
                observation: `${stat.incorrectCount} of ${total} attempts (${incorrectPercentage}%) answered this question incorrectly.`,
                supportingEvidence: `Correct: ${stat.correctCount} (${correctPercentage}%), Incorrect: ${stat.incorrectCount} (${incorrectPercentage}%).`,
                reference: {
                    type: "QUESTION",
                    id: stat.questionId,
                    questionText: stat.questionText.slice(0, 100),
                    assessmentId: assessment._id.toString(),
                },
                suggestedAction: "Review question phrasing, distractors, or related lesson content to ensure concepts were adequately covered.",
                dataLimitationNotice: "Reflects student responses. High difficulty does not necessarily indicate question defect.",
            });
        } else if (total >= 3 && unansweredPercentage !== null && unansweredPercentage >= 40) {
            questionInsights.push({
                id: `q-high-unanswered-${stat.questionId}`,
                category: "QUESTION_PERFORMANCE",
                title: `High Unanswered Rate on Question`,
                observation: `${stat.unansweredCount} of ${total} learners (${unansweredPercentage}%) left this question unanswered.`,
                supportingEvidence: `Unanswered: ${stat.unansweredCount} (${unansweredPercentage}%).`,
                reference: {
                    type: "QUESTION",
                    id: stat.questionId,
                    questionText: stat.questionText.slice(0, 100),
                    assessmentId: assessment._id.toString(),
                },
                suggestedAction: "Examine if question complexity or time constraints caused learners to skip this question.",
                dataLimitationNotice: "Unanswered responses may stem from test-taking pace or unfamiliar concepts.",
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

