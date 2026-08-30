# AI Based Personalized Learning Platform — AI Personalization Engine Design

## 1. Purpose

This document defines the first version of the AI personalization architecture for the AI Based Personalized Learning Platform.

The personalization engine is the core intelligence layer that transforms learning activity into:

- student learning state
- topic mastery estimates
- strengths
- weaknesses
- knowledge gaps
- recommendations
- interventions
- next-best learning actions

The system must not behave like a generic chatbot.

The goal is:

> **Help each student understand what they know, what they do not know, why they are struggling, and what they should do next to improve efficiently and confidently.**

---

# 2. Personalization Philosophy

The platform is built around a continuous learning loop:

```text
Student Learns
      ↓
Student Practices
      ↓
Student Is Assessed
      ↓
Learning Evidence Generated
      ↓
Student Learning Model Updated
      ↓
Strengths / Weaknesses Identified
      ↓
Next Best Action Determined
      ↓
Student Learns Again
      ↓
New Evidence
      ↓
Model Updated Again
```

Personalization is therefore a **continuous feedback system**, not a one-time recommendation.

---

# 3. Core Architectural Principle

The most important design rule is:

> **AI enhances the personalization engine; AI does not become the personalization engine.**

The system should combine:

```text
Deterministic Rules
+
Student Learning Model
+
Learning Evidence
+
Recommendation Logic
+
AI Reasoning
```

AI should not directly control authoritative learning state.

---

# 4. Why Pure AI Personalization Is Not Enough

A simple architecture such as:

```text
Student History
      ↓
LLM
      ↓
Recommendation
```

has problems:

- inconsistent decisions
- difficult testing
- unpredictable output
- difficult debugging
- poor explainability
- unnecessary AI cost
- potential hallucination
- difficulty enforcing prerequisite rules
- difficulty guaranteeing learning progression

Therefore, the platform uses a hybrid architecture.

---

# 5. Hybrid Personalization Architecture

```text
                   Learning Events
                         │
                         ▼
                 Learning Evidence
                         │
                         ▼
               Student Learning Model
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      Deterministic Engine      Analytics
              │
              ▼
       Candidate Actions
              │
              ▼
       Recommendation Engine
              │
        ┌─────┴─────┐
        ▼           ▼
     Rules          AI
        │           │
        └─────┬─────┘
              ▼
       Validated Recommendation
              │
              ▼
        Student Next Action
              │
              ▼
        New Learning Evidence
```

---

# 6. Personalization Engine Responsibilities

The engine should answer:

### What does the student know?

```text
Topic mastery
Course mastery
Prerequisite readiness
```

### What does the student struggle with?

```text
Weak topics
Repeated mistakes
Knowledge gaps
Low-confidence areas
```

### What is improving?

```text
Learning trend
Recent assessment improvement
Reduced mistakes
Improved response quality
```

### What should happen next?

```text
Continue lesson
Review topic
Practice
Retry assessment
Complete prerequisite
Take diagnostic
Enroll in recommended course
```

---

# 7. Personalization Is Not Only Course Recommendation

The system should personalize at multiple levels.

```text
Course
   ↓
Topic
   ↓
Lesson
   ↓
Resource
   ↓
Practice
   ↓
Assessment
   ↓
Remediation
```

A student may not need a different course.

They may simply need:

```text
one topic revision
+
three practice questions
```

This is a key part of efficient learning.

---

# 8. Personalization Levels

## Level 1 — Course

Examples:

```text
Recommend DBMS
Recommend Advanced SQL
Recommend Operating Systems
```

## Level 2 — Topic

Examples:

```text
Revise Normalization
Practice SQL Joins
Review Indexing
```

## Level 3 — Lesson

Examples:

```text
Return to Lesson 4
Review 3NF
Complete SQL JOIN lesson
```

## Level 4 — Resource

Examples:

```text
Watch an explanatory video
Read teacher notes
Review a PDF
```

## Level 5 — Practice

Examples:

```text
Take 5 practice questions
Practice INNER JOIN
Solve normalization problems
```

## Level 6 — Assessment

Examples:

```text
Retry topic assessment
Take prerequisite diagnostic
Attempt final assessment
```

---

# 9. Inputs to the Personalization Engine

The engine should consume structured evidence.

Potential inputs:

```text
Course enrollment
Lesson completion
Lesson sequence
Assessment results
Question responses
Question difficulty
Question topic
Correct answers
Incorrect answers
Unanswered questions
Time taken
Attempt history
Diagnostic results
Practice activity
Topic mastery
Prerequisite relationships
Course metadata
Learning interests
Learning goals
Self-reported experience level
Daily study capacity
Preferred learning format
Recent activity
Learning trends
Recommendation history
Intervention history
```

The engine should not blindly consume the entire database.

---

# 10. Learning Evidence

Learning evidence is the primary input to personalization.

Examples:

```text
LESSON_STARTED
LESSON_COMPLETED
QUESTION_CORRECT
QUESTION_INCORRECT
QUESTION_UNANSWERED
ASSESSMENT_STARTED
ASSESSMENT_SUBMITTED
DIAGNOSTIC_COMPLETED
PRACTICE_COMPLETED
INTERVENTION_COMPLETED
COURSE_COMPLETED
```

Each event should contain enough structured information to support later analysis.

---

# 11. Evidence Example

Conceptual evidence:

```json
{
  "studentId": "...",
  "courseId": "...",
  "topicId": "...",
  "lessonId": "...",
  "eventType": "QUESTION_INCORRECT",
  "questionId": "...",
  "timestamp": "...",
  "metadata": {
    "attemptId": "...",
    "difficulty": "MEDIUM"
  }
}
```

The exact schema follows the approved database design.

---

# 12. Evidence Is Not Equal to Mastery

A single wrong answer does not mean:

```text
Student does not know the topic.
```

Similarly, one correct answer does not mean:

```text
Student mastered the topic.
```

The engine must aggregate evidence.

Example:

```text
One incorrect answer
        ↓
Small negative signal

Repeated incorrect answers
        ↓
Stronger negative signal

Repeated correct answers across varied questions
        ↓
Stronger positive signal
```

---

# 13. Student Learning Model

The Student Learning Model represents the current estimated state of a learner.

Conceptual structure:

```text
Student
 ├── Course State
 │    ├── Progress
 │    ├── Completion
 │    └── Performance
 │
 ├── Topic State
 │    ├── Mastery
 │    ├── Confidence
 │    ├── Trend
 │    └── Evidence
 │
 ├── Strengths
 ├── Weaknesses
 ├── Knowledge Gaps
 ├── Recommendations
 └── Intervention History
```

The detailed model is defined in `03-student-learning-model.md`.

---

# 14. Topic Mastery

Topic mastery is an estimate, not a claim of absolute knowledge.

Conceptual scale:

```text
0–39    Weak
40–59   Developing
60–74   Functional
75–89   Strong
90–100  Mastered
```

These thresholds are initial design values and can be tuned using evaluation data.

### Centralized MVP Personalization Policy

The mastery categories above describe the student's estimated mastery state.

The following intervention thresholds serve a different purpose and must
not be interpreted as additional mastery categories:

```text
Mastery below 60%
    ↓
Weakness candidate

Mastery below 50%
    ↓
Prioritize review / remediation

Mastery 50–70%
    ↓
Prioritize targeted practice

Mastery above 70%
    ↓
Generally continue the learning path unless other evidence indicates a weakness
```
---

# 15. Mastery Calculation Principle

Mastery should consider multiple evidence signals.

Conceptually:

```text
Mastery =
  Performance
+ Consistency
+ Recency
+ Difficulty
+ Coverage
+ Assessment Evidence
```

It should not simply equal:

```text
lastQuizPercentage
```

---

# 16. Performance Signal

Examples:

```text
Correct responses
Incorrect responses
Unanswered responses
Assessment score
Practice score
```

Repeated performance provides stronger evidence than one event.

---

# 17. Unanswered Questions

Unanswered questions are meaningful.

They may indicate:

```text
Knowledge gap
Low confidence
Time pressure
Poor recall
Difficulty with application
```

Therefore:

```text
Unanswered ≠ ignored
```

The engine should distinguish:

```text
CORRECT
INCORRECT
UNANSWERED
```

---

# 18. Difficulty Signal

Correctly answering:

```text
Easy
```

does not provide the same mastery evidence as correctly answering:

```text
Hard
```

The engine should therefore consider question difficulty.

Example:

```text
Easy correct → positive signal
Medium correct → stronger positive signal
Hard correct → stronger evidence
```

Difficulty must not make the model unfairly reward guessing.

---

# 19. Coverage Signal

A student answering 2 questions correctly does not provide strong evidence of complete topic mastery.

The engine should consider how much of the topic has been sampled.

Example:

```text
2/2 correct
```

is weaker evidence than:

```text
18/20 correct
```

across multiple concepts.

---

# 20. Consistency Signal

Mastery should consider performance across time.

Example:

```text
Attempt 1 → 45%
Attempt 2 → 62%
Attempt 3 → 81%
```

This suggests improvement.

But:

```text
Attempt 1 → 90%
Attempt 2 → 40%
```

suggests unstable understanding.

---

# 21. Recency Signal

Recent evidence should usually have stronger influence than very old evidence.

Conceptually:

```text
Recent evidence
      ↓
Higher weight

Old evidence
      ↓
Lower weight
```

However, old evidence should not simply disappear.

This supports detecting both:

```text
recent improvement
```

and:

```text
knowledge decay
```

---

# 22. Confidence

Mastery and confidence are different.

Example:

```text
Mastery = 80
Confidence = 45
```

could indicate:

```text
Student performs well
but evidence coverage is limited
```

Another example:

```text
Mastery = 55
Confidence = 90
```

could indicate:

```text
Student believes they understand
but performance evidence disagrees
```

This distinction can be useful for personalization.

---

# 23. Strength Detection

A topic may be classified as a strength when:

```text
Mastery high
+
Recent performance stable
+
Evidence coverage sufficient
```

Example:

```text
SQL SELECT queries
Mastery = 91
Recent performance = strong
Coverage = sufficient
```

Then:

```text
Strength:
SQL SELECT queries
```

---

# 24. Weakness Detection

A topic may be classified as a weakness when:

```text
Mastery below 60%
OR
Repeated errors
OR
High unanswered rate
OR
Prerequisite weakness
OR
Performance trend declining
```

The engine should avoid declaring a weakness from a single mistake.

---

# 25. Knowledge Gap

A knowledge gap is more specific than a general weakness.

Example:

```text
Topic:
Normalization

General mastery:
68%

Specific gap:
Transitive dependency
```

This allows more targeted recommendations.

---

# 26. Error Pattern Detection

The engine should eventually detect repeated conceptual errors.

Example:

```text
Question 1:
Incorrect

Question 4:
Incorrect

Question 8:
Incorrect

All involve:
LEFT JOIN vs INNER JOIN
```

Potential inference:

```text
SQL JOIN semantics may be a knowledge gap.
```

The exact inference should be based on structured question-topic/concept metadata, not solely on AI guesses.

---

# 27. Learning Trend

The model should classify trends:

```text
IMPROVING
STABLE
DECLINING
INSUFFICIENT_DATA
```

Example:

```text
40%
52%
63%
76%

Trend = IMPROVING
```

---

# 28. Course Progress vs Mastery

These are different.

A student can have:

```text
Course Progress = 90%
Mastery = 55%
```

because they completed lessons but struggled with assessments.

Likewise:

```text
Course Progress = 40%
Mastery of completed topics = 90%
```

The student is performing strongly on what they have learned.

The engine must never confuse completion with understanding.

---

# 29. Recommendation Engine

The recommendation engine transforms learning state into candidate actions.

Example:

```text
Weak Topic
   ↓
Candidate Actions
   ├── Review lesson
   ├── Read notes
   ├── Watch resource
   ├── Practice questions
   └── Take mini-assessment
```

---

# 30. Recommendation Types

Initial types:

```text
COURSE_RECOMMENDATION
TOPIC_REVIEW
LESSON_REVIEW
RESOURCE_RECOMMENDATION
PRACTICE_RECOMMENDATION
ASSESSMENT_RETRY
PREREQUISITE_RECOMMENDATION
COURSE_CONTINUATION
```

Future types may include:

```text
STUDY_PLAN
SPACED_REVIEW
DIFFICULTY_ADJUSTMENT
LEARNING_STRATEGY
```

---

# 31. Next Best Action

The engine should identify one primary next action.

Example:

```text
Student opens dashboard
        ↓
Next Best Action:
"Review SQL JOINs"
```

rather than overwhelming the student with:

```text
17 recommendations
```

The platform should prioritize.

---

# 32. Candidate Generation

First generate candidate actions.

Example:

```text
Weak Normalization
        ↓
Candidate 1 → Review lesson
Candidate 2 → Watch video
Candidate 3 → Read notes
Candidate 4 → Practice 5 questions
Candidate 5 → Mini-assessment
```

Then rank them.

---

# 33. Recommendation Ranking

Candidate score can conceptually consider:

```text
Need
+
Prerequisite importance
+
Mastery gap
+
Recency
+
Difficulty
+
Past recommendation response
+
Course progression
+
Student context
```

Example:

```text
Candidate:
Review Normalization

Need = High
Prerequisite = High
Mastery gap = High
Recent failure = High

→ High priority
```

The exact formula should be implemented after MVP evaluation.

---

# 34. Deterministic Recommendation Rules

Some decisions should be deterministic.

Example:

```text
If prerequisite diagnostic fails
    → recommend prerequisite course/topic
```

Another:

```text
If previous lesson assessment is not passed
    → do not unlock next lesson
```

Another:

```text
If topic mastery < threshold
    → candidate remediation action
```

These should not depend on LLM creativity.

---

# 35. AI Recommendation Role

AI can help with:

```text
Explanation
Personalized wording
Resource explanation
Learning strategy
Reasoning summary
Alternative teaching approach
```

AI should not be the sole authority for:

```text
Pass/fail
Lesson unlocking
Official score
Mastery storage
Prerequisite eligibility
Authorization
```

---

# 36. AI Recommendation Example

Deterministic engine:

```text
Topic mastery = 48%
Repeated errors = JOIN semantics
Next action = remediation
```

AI can generate:

```text
Why:
"You are consistently struggling with the difference between
INNER JOIN and LEFT JOIN."

What to do:
"Review the JOIN lesson and then practice five targeted questions."
```

The decision is deterministic; AI improves the explanation.

---

# 37. AI Teaching Assistance

For a weak topic, AI can help generate an explanation based on approved content.

Flow:

```text
Weak Topic
   ↓
Retrieve approved lesson context
   ↓
AI explanation request
   ↓
Structured output
   ↓
Validate
   ↓
Show student
```

AI should not invent course facts when authoritative teacher content is available.

---

# 38. Retrieval-Grounded Learning

When AI explains a topic, prefer:

```text
Teacher-approved content
+
Course resources
+
Structured topic metadata
```

as context.

This reduces hallucination.

---

# 39. AI Resource Selection

The AI may help rank available resources.

Example:

```text
Weak topic:
Normalization

Available resources:
PDF
YouTube video
Teacher notes
Practice set
```

AI can help explain why one may be suitable.

The backend still controls which resources are valid and available.

---

# 40. Personalization Feedback Loop

Every recommendation should produce feedback.

Example:

```text
Recommendation:
Review JOINs
      ↓
Student accepts
      ↓
Completes lesson
      ↓
Takes practice
      ↓
Performance improves
      ↓
Evidence generated
      ↓
Recommendation effectiveness evaluated
```

This allows the system to learn which interventions work.

---

# 41. Recommendation Outcome

Track outcomes such as:

```text
SHOWN
ACCEPTED
DISMISSED
STARTED
COMPLETED
IGNORED
IMPROVED
NO_IMPROVEMENT
```

This should eventually become useful personalization evidence.

---

# 42. Avoiding Recommendation Loops

Bad behavior:

```text
Weak topic
 ↓
Recommend quiz
 ↓
Quiz fails
 ↓
Recommend same quiz
 ↓
Quiz fails
 ↓
Same quiz forever
```

The system should vary interventions.

Example:

```text
Attempt 1 failed
    ↓
Review explanation

Attempt 2
    ↓
Practice

Attempt 3
    ↓
Mini-assessment

Attempt 4
    ↓
Reassessment
```

---

# 43. Retry Strategy

Retries should not simply repeat identical questions indefinitely.

Use the approved question-bank strategy:

```text
Large Question Bank
       ↓
Question Selection
       ↓
Attempt
       ↓
Failure
       ↓
Remediation
       ↓
New Attempt
       ↓
Different/appropriate question set
```

The teacher should provide a sufficiently large question pool.

---

# 44. Cold Start Problem

A new student has little learning evidence.

Therefore the engine cannot immediately know:

```text
Strengths
Weaknesses
Mastery
Preferences
```

The MVP solution is:

```text
Onboarding
+
Diagnostic assessment where configured
+
Early learning evidence
```

---

# 45. Onboarding Signals

Potential onboarding information:

```text
Department
Academic level
Areas of interest
Learning goals
Existing experience
Preferred learning resources
```

These should be used as initial signals, not permanent truths.

---

# 46. Diagnostic Assessment

Diagnostic assessment is controlled by the instructor.

A teacher may configure:

```text
Prerequisite required
Diagnostic required
Minimum eligibility threshold
```

Example:

```text
Advanced SQL
   ↓
Diagnostic required
   ↓
Basic SQL knowledge insufficient
   ↓
Recommend Basic SQL
```

This is a deterministic eligibility workflow.

---

# 47. Prerequisite Personalization

Prerequisites can be represented as:

```text
Advanced SQL
    requires
Basic SQL
    requires
DBMS fundamentals
```

If the student lacks readiness:

```text
Recommend prerequisite
```

If prerequisite was completed long ago and evidence is weak:

```text
Recommend targeted review
```

---

# 48. Personalization After Course Enrollment

Once enrolled:

```text
Enrollment
   ↓
Lesson
   ↓
Practice
   ↓
Assessment
   ↓
Evidence
   ↓
Mastery
   ↓
Recommendation
```

The system should prioritize the current course before unrelated course recommendations.

---

# 49. Course Recommendation

Course recommendations can consider:

```text
Student interests
Department
Completed courses
Mastery
Goals
Prerequisites
Course popularity
Teacher-published course metadata
```

But recommendations must respect eligibility.

A course should not be recommended as immediately actionable if prerequisites are missing unless the recommendation explicitly identifies the prerequisite path.

---

# 50. Department Personalization

The course model includes department metadata.

Example:

```text
CSE
ECE
ME
MATH
```

Students can browse by department.

Personalization can use department as an initial relevance signal, but it should not permanently restrict discovery.

---

# 51. Student Preference vs Observed Behavior

These are different signals.

Student says:

```text
"I like SQL."
```

Observed behavior:

```text
Repeatedly practices DBMS
Completes SQL lessons
Performs well
```

The system can combine both.

Observed learning behavior should not be ignored.

---

# 52. Personalization Priority

A reasonable priority order is:

```text
Immediate learning need
        ↓
Prerequisite/eligibility constraints
        ↓
Current course progression
        ↓
Weakness remediation
        ↓
Learning goals
        ↓
Interests
        ↓
Broader course discovery
```

This prevents irrelevant recommendations from distracting the learner.

---

# 53. Student Confidence

Personalization should eventually consider confidence.

Example:

```text
High mastery + low confidence
→ confidence-building practice

Low mastery + high confidence
→ misconception-focused intervention
```

The system should not treat self-reported confidence as equivalent to mastery.

---

# 54. Learning Efficiency

The project goal is not simply:

```text
Maximize time spent learning
```

It is:

```text
Maximize useful learning progress
```

Therefore recommendations should avoid unnecessary repetition.

Example:

```text
Strong topic
→ Move forward

Weak prerequisite
→ Target prerequisite

Minor mistake
→ Small practice intervention
```

---

# 55. Intervention Levels

Potential intervention intensity:

```text
LEVEL 1 — Hint
LEVEL 2 — Short explanation
LEVEL 3 — Resource review
LEVEL 4 — Targeted practice
LEVEL 5 — Mini assessment
LEVEL 6 — Prerequisite remediation
```

The engine should prefer the smallest effective intervention.

---

# 56. Intervention Escalation

Example:

```text
Minor weakness
    ↓
Targeted practice
    ↓
Still weak
    ↓
Lesson review
    ↓
Still weak
    ↓
Alternative explanation/resource
    ↓
Still weak
    ↓
Prerequisite remediation
```

This creates a more intelligent learning loop.

---

# 57. Avoiding Over-Personalization

The platform should not constantly interrupt the student.

Bad:

```text
Weakness detected
→ notification

Minor mistake
→ notification

One unanswered question
→ notification
```

Instead:

```text
Aggregate evidence
   ↓
Determine meaningful issue
   ↓
Recommend when intervention is justified
```

---

# 58. Recommendation Frequency

The system should limit recommendation noise.

Examples:

```text
One primary next action
+
A small number of secondary recommendations
```

The exact limits can be tuned after UX testing.

---

# 59. Explainability

Every important recommendation should have a reason.

Example:

```text
Recommended:
Review SQL JOINs

Why:
"You answered 4 of your last 6 JOIN questions incorrectly."
```

The reason should be based on actual evidence.

AI-generated explanations must not invent evidence.

---

# 60. Recommendation Confidence

Recommendations may have internal confidence.

Conceptually:

```text
HIGH
MEDIUM
LOW
```

If evidence is insufficient:

```text
INSUFFICIENT_DATA
```

The system should avoid pretending to know more than it does.

---

# 61. Personalization State Machine

Conceptually:

```text
NEW
 ↓
LEARNING
 ↓
EVIDENCE_AVAILABLE
 ↓
ANALYZING
 ↓
RECOMMENDATION_READY
 ↓
INTERVENTION
 ↓
REASSESSMENT
 ↓
IMPROVED / STILL_WEAK
```

The exact persistence model follows the database design.

---

# 62. Event-Driven Personalization

Important learning events can trigger personalization work.

Example:

```text
Assessment Submitted
        ↓
Persist Result
        ↓
Publish Learning Event
        ↓
Queue Personalization Job
        ↓
Update Recommendation
```

This prevents expensive AI work from blocking the assessment submission request.

---

# 63. Background Processing

Potential asynchronous tasks:

```text
Mastery recalculation
Recommendation generation
AI explanation generation
Large analytics aggregation
Question-file parsing
Notification creation
```

Critical transaction results should be stored before asynchronous processing begins.

---

# 64. Personalization Consistency

The system must avoid:

```text
Assessment says 80%
Recommendation still says 20%
```

Immediately after an assessment, authoritative learning state should be updated synchronously where practical.

AI-generated enhancements can arrive asynchronously.

---

# 65. Personalization Failure Handling

If AI fails:

```text
AI unavailable
      ↓
Deterministic recommendation rules
      ↓
Continue learning
```

The platform must not become unusable because the AI provider is unavailable.

---

# 66. AI Timeout

If AI exceeds a safe timeout:

```text
Timeout
   ↓
Cancel/fail gracefully
   ↓
Use fallback
```

Do not block the student's core learning workflow indefinitely.

---

# 67. AI Provider Failure

Potential failures:

```text
Rate limit
Network failure
Provider outage
Invalid output
Content safety failure
Malformed response
```

All should have controlled fallback behavior.

---

# 68. Deterministic Fallback

Example:

```text
Mastery < 50%
AND repeated errors
→ Review lesson

Mastery 50–70%
→ Practice

Mastery > 70%
→ Continue
```

This basic rules engine can keep the platform functional without AI.

---

# 69. Personalization Engine Modules

Suggested modular structure:

```text
personalization/
│
├── evidence
├── mastery
├── weakness
├── strengths
├── recommendations
├── interventions
├── rules
├── ai
└── analytics
```

The exact folder structure will be finalized during implementation.

---

# 70. Personalization Service Boundary

The personalization module should expose application-level operations such as:

```text
processLearningEvidence()
calculateTopicMastery()
detectWeaknesses()
detectStrengths()
generateRecommendations()
selectNextBestAction()
createIntervention()
```

Controllers should not contain personalization algorithms.

---

# 71. Rule Engine Boundary

Rules should be centralized rather than scattered across controllers.

Example:

```text
shouldUnlockNextLesson()
isPrerequisiteSatisfied()
shouldRecommendReview()
shouldEscalateIntervention()
```

This improves:

```text
Testability
Reusability
Maintainability
Explainability
```

---

# 72. AI Service Boundary

AI functionality should be isolated.

Conceptually:

```text
AIService
 ├── generateExplanation()
 ├── generateLearningStrategy()
 ├── explainRecommendation()
 └── rankApprovedResources()
```

AI service should not directly modify:

```text
Enrollment
Mastery
Assessment score
Lesson unlock state
Authorization
```

---

# 73. Personalization Data Flow

```text
                 USER ACTIVITY
                       │
                       ▼
                LEARNING EVENTS
                       │
                       ▼
              LEARNING EVIDENCE
                       │
                       ▼
            STUDENT LEARNING MODEL
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Mastery      Trends      Error Patterns
          │            │            │
          └────────────┼────────────┘
                       ▼
               Candidate Actions
                       │
                       ▼
              Deterministic Rules
                       │
                       ▼
                Recommendation
                       │
              ┌────────┴────────┐
              ▼                 ▼
        Deterministic       AI Enhancement
              │                 │
              └────────┬────────┘
                       ▼
              Validated Output
                       │
                       ▼
                 NEXT ACTION
                       │
                       ▼
                NEW EVIDENCE
```

---

# 74. Example: DBMS Student

Student:

```text
Course = DBMS
```

After several lessons:

```text
SQL basics → 88%
ER modeling → 81%
Normalization → 52%
Transactions → 76%
```

The system identifies:

```text
Strength:
SQL basics

Weakness:
Normalization
```

---

# 75. DBMS Example — Error Pattern

Suppose the student repeatedly gets questions involving:

```text
1NF
2NF
3NF
Functional dependencies
Transitive dependency
```

incorrect.

The engine identifies:

```text
Knowledge gap:
Normalization dependency concepts
```

---

# 76. DBMS Example — Recommendation

Candidate actions:

```text
Review Normalization Lesson
Watch approved Normalization Video
Read Teacher Notes
Practice 5 Questions
Take Mini Assessment
```

The deterministic engine ranks:

```text
Review Lesson
+
Practice
```

AI may produce:

```text
"Your recent mistakes suggest that the difference between
partial and transitive dependencies is still unclear.
Review the dependency section first, then try five targeted questions."
```

---

# 77. DBMS Example — Improvement

After remediation:

```text
Practice = 80%
Mini assessment = 84%
```

Mastery increases:

```text
52 → 71
```

The engine now recommends:

```text
Continue to next topic
```

rather than repeatedly showing the same remediation.

---

# 78. DBMS Example — Persistent Weakness

If:

```text
52%
→ remediation
→ 55%
→ remediation
→ 51%
```

The engine escalates:

```text
Alternative explanation
+
Different resource
+
Prerequisite review
```

It should not simply repeat the same recommendation.

---

# 79. Diagnostic Example — Advanced SQL

Teacher configures:

```text
Prerequisite:
Basic SQL
Diagnostic:
Required
Threshold:
75%
```

Student scores:

```text
58%
```

System:

```text
Not eligible
   ↓
Identify weak concepts
   ↓
Check Basic SQL enrollment/history
   ↓
If completed but weak:
Targeted revision

If not completed:
Recommend Basic SQL course
```

After improvement:

```text
Mini assessment
   ↓
82%
   ↓
Re-run diagnostic
   ↓
Eligible
```

---

# 80. Personalization API Boundary

The API exposes personalization results.

Example:

```text
GET /api/v1/personalization/me/next-action
GET /api/v1/personalization/me/weaknesses
GET /api/v1/recommendations/me
```

The frontend consumes results.

It does not calculate them.

---

# 81. Personalization and Caching

Some personalization results may be cached.

Possible candidates:

```text
Dashboard summary
Recommendation list
Course recommendation list
Analytics summaries
```

But authoritative learning state remains in the appropriate persistent store.

Cache invalidation should occur after important learning events.

---

# 82. Personalization and Redis

Redis may support:

```text
Recommendation cache
Rate limiting
Background job queues
Temporary AI state
```

Do not make Redis the permanent source of truth for mastery.

---

# 83. Personalization and MongoDB

MongoDB stores durable state such as:

```text
Learning Evidence
Topic Mastery
Recommendations
Interventions
Course relationships
Assessment results
```

The exact schemas follow `06-database-design.md`.

---

# 84. Personalization Metrics

The platform should eventually evaluate:

```text
Recommendation acceptance rate
Recommendation completion rate
Post-intervention improvement
Mastery improvement
Repeated failure rate
Time to mastery
Course completion
Diagnostic improvement
```

These metrics help determine whether personalization actually works.

---

# 85. Personalization Quality

The engine should be evaluated on:

### Accuracy

Did it identify the actual weakness?

### Relevance

Was the recommendation useful?

### Timing

Was it delivered at the right time?

### Effectiveness

Did learning improve?

### Explainability

Can the recommendation be justified?

### Efficiency

Did it reduce unnecessary work?

---

# 86. Avoiding Bias

Personalization should not unfairly restrict students.

For example:

```text
Student previously performed poorly in mathematics
```

should not permanently prevent:

```text
Advanced mathematics recommendation
```

The system should allow evidence to change the learner model.

---

# 87. Model Evolution

The first personalization engine should be simple enough to understand.

MVP:

```text
Rules
+
Weighted evidence
+
Basic mastery
+
Basic recommendations
+
Limited AI enhancement
```

Later:

```text
Advanced learner modeling
+
More sophisticated ranking
+
Adaptive difficulty
+
Spaced repetition
+
Predictive analytics
+
Advanced AI reasoning
```

Do not build the advanced engine before validating the MVP.

---

# 88. MVP Personalization Engine

The MVP should answer five questions:

```text
1. What is the student learning?
2. What does the student appear to know?
3. What does the student struggle with?
4. What should the student do next?
5. Did that intervention help?
```

---

# 89. MVP Signals

Initial signals:

```text
Assessment score
Question correctness
Unanswered questions
Question difficulty
Topic mapping
Lesson completion
Assessment attempts
Diagnostic result
Course progress
Recent performance
Prerequisites
```

Avoid adding too many speculative signals initially.

---

# 90. MVP Mastery Approach

The first implementation should use a transparent weighted model.

Conceptually:

```text
Mastery =
weighted assessment performance
+
recent practice performance
+
consistency
+
difficulty-adjusted evidence
+
coverage
```

Exact weights should be configurable and tested.

Do not hard-code dozens of arbitrary constants throughout the codebase.

---

# 91. MVP Weakness Rule

A weakness candidate can be created when evidence crosses a meaningful threshold.

Example:

```text
Mastery < 60%
AND
minimum evidence available
```

Additional triggers:

```text
Repeated incorrect concept
High unanswered rate
Declining trend
Failed assessment
```

---

# 92. MVP Recommendation Rules

Examples:

```text
Current lesson incomplete
→ Continue lesson

Current lesson complete + assessment pending
→ Take assessment

Assessment failed
→ Review relevant topic

Topic mastery low
→ Practice topic

Prerequisite missing
→ Learn prerequisite

Prerequisite diagnostic failed
→ Remediate prerequisite

Course completed
→ Recommend next relevant course
```

---

# 93. MVP Next-Best-Action Priority

Recommended priority:

```text
1. Blocking prerequisite
2. Required current-course action
3. Immediate weakness remediation
4. Assessment preparation
5. Course continuation
6. Broader course recommendation
```

This keeps personalization aligned with the student's current goal.

---

# 94. MVP AI Responsibilities

AI should initially focus on:

```text
Personalized explanation
Recommendation wording
Learning-strategy suggestions
Approved-resource explanation
Alternative explanation style
```

AI should not initially control:

```text
Score
Mastery
Unlocking
Eligibility
Enrollment authorization
```

---

# 95. AI Fallback

If AI is unavailable:

```text
Rule Engine
   ↓
Deterministic Recommendation
```

The student still receives a useful next action.

---

# 96. Personalization Safety

AI-generated recommendations must be:

```text
Validated
Relevant
Bounded
Explainable
Grounded in available evidence
```

AI must not invent:

```text
student performance
completed lessons
scores
resources
teacher instructions
prerequisites
```

---

# 97. Personalization Auditability

For important recommendations, the system should be able to explain:

```text
Which evidence triggered it?
Which rule selected it?
Was AI used?
Which recommendation was shown?
What happened afterward?
```

This is important for debugging and future research.

---

# 98. Example Recommendation Record

Conceptual:

```json
{
  "studentId": "...",
  "type": "TOPIC_REVIEW",
  "targetTopicId": "...",
  "reason": "Repeated errors in normalization questions",
  "priority": "HIGH",
  "source": {
    "rules": [
      "LOW_MASTERY",
      "REPEATED_ERRORS"
    ],
    "aiEnhanced": true
  }
}
```

The exact schema follows the database design.

---

# 99. Personalization Processing Pipeline

```text
Learning Event
      ↓
Validate Event
      ↓
Persist Evidence
      ↓
Update Learning State
      ↓
Evaluate Rules
      ↓
Generate Candidate Actions
      ↓
Rank Candidates
      ↓
Optional AI Enhancement
      ↓
Validate AI Output
      ↓
Persist Recommendation
      ↓
Serve Next Action
```

---

# 100. Personalization Failure Modes

Potential failures:

```text
Insufficient evidence
AI unavailable
Invalid AI output
Stale recommendation
Duplicate recommendation
Contradictory evidence
Incorrect question metadata
Missing topic mapping
Background job failure
```

The system should fail safely.

---

# 101. Insufficient Evidence

If evidence is insufficient:

```text
Do not pretend certainty.
```

Example:

```text
Mastery:
INSUFFICIENT_DATA
```

Then:

```text
Recommendation:
Continue learning / gather more evidence
```

---

# 102. Stale Recommendations

If a student improves after a recommendation was generated, the old recommendation may become stale.

Example:

```text
Recommendation:
Review JOINs

Student later scores 90%

Old recommendation:
No longer primary
```

The next recommendation should be recalculated or invalidated.

---

# 103. Duplicate Recommendations

The engine should avoid repeatedly generating identical active recommendations.

Potential rule:

```text
Same student
+
same target
+
same intervention
+
recently shown
→ avoid duplicate
```

---

# 104. Contradictory Evidence

If evidence conflicts:

```text
Old:
80%

Recent:
45%
```

the engine should not blindly average everything.

It should consider:

```text
recency
difficulty
coverage
assessment quality
```

This may indicate:

```text
knowledge instability
```

rather than simple mastery loss.

---

# 105. Personalization and Human Teacher

The teacher remains important.

Teachers define:

```text
Course content
Prerequisites
Assessments
Question banks
Resources
Learning objectives
```

The personalization engine works within those boundaries.

It should not silently replace teacher-defined curriculum rules.

---

# 106. Teacher Override Principle

Future versions may allow teachers to define:

```text
required resource
minimum practice
assessment threshold
prerequisite
recommended sequence
```

Personalization must respect hard teacher rules.

AI can optimize within allowed boundaries.

---

# 107. Personalization Hierarchy

```text
Platform Security
       ↓
Teacher/Curriculum Constraints
       ↓
Prerequisite Rules
       ↓
Student Learning State
       ↓
Deterministic Personalization
       ↓
AI Enhancement
       ↓
Presentation
```

Lower layers cannot override higher-priority constraints.

---

# 108. Personalization Architecture Summary

```text
                    STUDENT
                       │
                       ▼
                 Learning Activity
                       │
                       ▼
                Learning Evidence
                       │
                       ▼
             Student Learning Model
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Mastery        Weakness       Strength
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                Candidate Actions
                       │
                       ▼
              Deterministic Rules
                       │
                       ▼
                Recommendation
                       │
                ┌──────┴──────┐
                ▼             ▼
             Rule         AI Enhancement
                │             │
                └──────┬──────┘
                       ▼
                Validated Result
                       │
                       ▼
                 Next Best Action
                       │
                       ▼
                 Student Acts
                       │
                       ▼
                New Evidence
```

---

# 109. Implementation Principles

The implementation should follow:

1. Keep personalization logic outside controllers.
2. Centralize rules.
3. Keep scoring deterministic.
4. Keep AI behind an abstraction.
5. Validate AI output.
6. Never let AI modify authoritative state directly.
7. Store evidence before asynchronous analysis.
8. Make recommendation generation idempotent where practical.
9. Make weights/configuration easy to tune.
10. Keep the MVP explainable.
11. Add advanced intelligence only after validating the baseline.
12. Test personalization with deterministic fixtures.

---

# 110. Testing the Personalization Engine

Tests should include:

### Strong student

```text
High performance
→ continue
```

### Weak student

```text
Low mastery
→ remediation
```

### Improving student

```text
Performance increasing
→ reduce intervention
```

### Declining student

```text
Performance declining
→ targeted review
```

### Insufficient evidence

```text
Few events
→ insufficient-data state
```

### Prerequisite failure

```text
Diagnostic below threshold
→ prerequisite recommendation
```

### AI failure

```text
AI unavailable
→ deterministic fallback
```

---

# 111. Example Test Fixture

Conceptual:

```text
Student: S1
Topic: Normalization

Evidence:
5 correct
3 incorrect
2 unanswered
Recent trend: improving
Difficulty: medium

Expected:
Mastery = calculated value
Weakness = possible
Recommendation = targeted practice
```

The exact expected values should be established after the mastery formula is finalized.

---

# 112. Explainability Test

For every important recommendation, test:

```text
Can we identify why it was generated?
```

Example:

```text
Recommendation:
Review Normalization

Evidence:
3 recent incorrect questions
Mastery = 52
Coverage = sufficient
```

If the system cannot explain the recommendation, it is harder to trust and debug.

---

# 113. Personalization Evaluation

The project should eventually compare:

```text
Baseline learning
vs
Personalized learning
```

Potential metrics:

```text
Mastery improvement
Assessment improvement
Time to mastery
Course completion
Recommendation acceptance
Intervention effectiveness
```

This can become a future experiment/evaluation phase.

---

# 114. Future Personalization Roadmap

### Phase 1 — MVP

```text
Rules
+
Weighted mastery
+
Weakness detection
+
Basic recommendations
+
Basic AI explanations
```

### Phase 2

```text
Adaptive difficulty
+
Better question selection
+
Recommendation feedback
+
Improved analytics
```

### Phase 3

```text
Spaced repetition
+
Knowledge graph
+
Predictive mastery
+
Advanced learner modeling
```

### Phase 4

```text
Advanced adaptive learning
+
Personalized study plans
+
More sophisticated AI tutoring
+
Research/evaluation models
```

---

# 115. Scope Boundary

This document does not yet finalize:

- Exact mastery formula weights
- Exact machine-learning model
- Exact LLM provider
- Exact prompt templates
- Exact embedding/vector database
- Advanced knowledge graph
- Adaptive testing algorithm
- Spaced-repetition algorithm
- Production recommendation ranking model
- Complete AI evaluation framework

These should be introduced only when justified by the MVP and validated data.

---

# 116. Final Personalization Principle

The platform should follow:

```text
LEARN
  ↓
MEASURE
  ↓
UNDERSTAND
  ↓
IDENTIFY
  ↓
RECOMMEND
  ↓
INTERVENE
  ↓
REASSESS
  ↓
IMPROVE
```

The most important principle is:

> **The platform should not simply tell students what course to take. It should continuously identify the smallest useful next action that helps them overcome their current learning difficulty and move forward confidently.**

AI makes the experience more adaptive and understandable, while deterministic application logic keeps the learning system reliable, testable, and explainable.


---

# 117. Personalization Intervention Selection Policy

The six personalization levels defined earlier are now governed by an explicit selection and escalation policy.

The engine must not simply move through:

```text
Course → Topic → Lesson → Resource → Practice → Assessment
```

in a fixed sequence.

Instead:

> **The engine selects the most specific intervention supported by available evidence, beginning with the smallest useful intervention and escalating only when subsequent evidence shows that the intervention was insufficient. Hard prerequisite constraints take priority over ordinary recommendations.**

## 117.1 Personalization Levels

The six levels are:

```text
1. Course
2. Topic
3. Lesson
4. Resource
5. Practice
6. Assessment
```

### Course

Use when the student's broader learning path needs to change.

Examples:

```text
Missing prerequisite
Course completed
New appropriate course identified
Student needs a prerequisite course
```

### Topic

Use when a specific conceptual area is weak.

### Lesson

Use when evidence identifies the specific lesson responsible for the weakness.

### Resource

Use when the student needs another explanation format or approved learning material.

### Practice

Use when the student has enough conceptual understanding but needs application or reinforcement.

### Assessment

Use when the system needs stronger evidence of readiness or improvement.

## 117.2 Selection Rule

The engine should choose the **most specific useful intervention**, not the broadest available intervention.

Example:

```text
Normalization weak
        ↓
Specific weakness = Transitive Dependency
        ↓
Lesson 7 contains the concept
        ↓
Recommend Lesson 7
```

Do not recommend the entire DBMS course when a single lesson is sufficient.

## 117.3 Hard Constraints Have Priority

Some decisions are not ordinary recommendations:

```text
Missing prerequisite
Diagnostic required
Diagnostic below threshold
Lesson assessment not passed
Course eligibility not satisfied
```

These are controlled by deterministic platform/teacher rules.

AI cannot override these constraints.

## 117.4 Smallest Useful Intervention Principle

When evidence is sufficient, prefer the smallest intervention likely to solve the problem.

Example:

```text
Mastery = 72%
One recent mistake
        ↓
Small targeted practice
```

Do not force the student to repeat an entire lesson unnecessarily.

## 117.5 Intervention Selection Matrix

| Student state | Primary intervention |
|---|---|
| Missing prerequisite | Course |
| Prerequisite recently completed but weak | Topic/Lesson review |
| General conceptual weakness | Topic |
| Specific lesson weakness | Lesson |
| Needs alternative explanation | Resource |
| Concept understood but application weak | Practice |
| Improvement needs verification | Assessment |
| Course completed and ready for next path | Course |

The engine may combine interventions when necessary.

Example:

```text
Lesson review
+
Targeted practice
+
Mini-assessment
```

## 117.6 Intervention Intensity

Personalization level and intervention intensity are separate concepts.

### Personalization Level

Defines **where** the intervention occurs:

```text
Course / Topic / Lesson / Resource / Practice / Assessment
```

### Intervention Intensity

Defines **how much** support is required:

```text
LOW
MEDIUM
HIGH
```

Example:

```text
Normalization mastery = 72%
One recent mistake

→ Topic/Lesson target
→ LOW intensity
→ Small practice set
```

Versus:

```text
Normalization mastery = 38%
Repeated failures
Prerequisite weakness

→ Lesson/prerequisite remediation
→ HIGH intensity
→ Explanation + resource + practice + reassessment
```

## 117.7 Intervention Escalation

Intervention should escalate when evidence indicates that the current intervention was insufficient.

```text
Weak Topic
   ↓
Review Lesson
   ↓
Practice
   ↓
Still weak
   ↓
Alternative Resource
   ↓
Practice again
   ↓
Improves
   ↓
Assessment
   ↓
Ready
```

The system should not repeat the exact same failed intervention indefinitely.

## 117.8 Assessment Is a Measurement Instrument

Assessment should generally be treated as a way to measure readiness or improvement, not as the primary remediation mechanism.

Bad loop:

```text
FAIL
 ↓
Same Quiz
 ↓
FAIL
 ↓
Same Quiz
```

Preferred:

```text
FAIL
 ↓
Analyze evidence
 ↓
Identify weakness
 ↓
Lesson / Resource
 ↓
Targeted Practice
 ↓
New Question Set
 ↓
Mini-Assessment
 ↓
Re-evaluate
```

## 117.9 Personalization Decision Flow

```text
                    STUDENT STATE
                         │
                         ▼
              Is there a hard constraint?
                    /          \
                  YES           NO
                   │             │
                   ▼             ▼
             Resolve it      Continue
                   │             │
                   └──────┬──────┘
                          ▼
                Identify strongest need
                          │
                          ▼
              Choose most specific target
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
       Topic           Lesson           Resource
          │               │                │
          └───────────────┼────────────────┘
                          ▼
                       Practice
                          │
                          ▼
                    Re-evaluate
                          │
                   ┌──────┴──────┐
                   ▼             ▼
               Improved      Still weak
                   │             │
                   ▼             ▼
               Continue       Escalate
                                 │
                                 ▼
                              Reassess
```

## 117.10 No Forced Sequential Escalation

The engine must not assume:

```text
Every weakness
→ Course
→ Topic
→ Lesson
→ Resource
→ Practice
→ Assessment
```

Instead:

```text
Evidence
   ↓
Most appropriate specific intervention
```

## 117.11 Recommendation vs Intervention

A recommendation is what the system presents to the student.

An intervention is the learning action the student performs.

Example:

```text
Recommendation:
"Review Normalization Lesson 7"

Intervention:
Lesson review
```

## 117.12 Measuring Intervention Effectiveness

After an intervention, compare evidence before and after.

Example:

```text
Before:
Mastery = 48%

Intervention:
Lesson review + practice

After:
Mastery = 71%
```

If improvement is insufficient, the system may escalate.

## 117.13 Final Policy

The finalized personalization policy is:

```text
1. Respect hard constraints first.
2. Identify the strongest learning need.
3. Select the most specific useful intervention.
4. Prefer the smallest effective intervention.
5. Use practice for application/reinforcement.
6. Use assessment to measure readiness/improvement.
7. Avoid repeating failed interventions indefinitely.
8. Re-evaluate after meaningful intervention.
9. Escalate only when evidence indicates insufficient improvement.
10. Let deterministic rules control authoritative decisions.
11. Let AI enhance explanations and personalization within those boundaries.
```

This policy is now part of the approved personalization architecture.
