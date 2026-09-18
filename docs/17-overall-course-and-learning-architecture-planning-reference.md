# AI Based Personalized Learning Platform --- Course & Learning Architecture Planning Reference

## 1. Purpose

This document is the **overall planning reference** for the
architectural decisions made while designing the Course and Course
Structure portions of the platform.

It is intended to guide future implementation of:

-   Course
-   Topic
-   Lesson
-   Resource
-   Practice
-   Question Bank
-   Assessment
-   Enrollment
-   Learning / Evidence
-   Analytics
-   Personalization
-   Recommendation / Intervention
-   AI Learning Plan

It records not only what each module does, but also **how the modules
connect without taking ownership of one another's internal state**.

> This document is a planning/source-of-truth reference. It does not
> mean all described modules have already been implemented.

------------------------------------------------------------------------

# 2. Core Architectural Principle

The platform is a **modular monolith**.

The most important rule is:

> **Each module owns its own data and business rules. Other modules
> consume its outputs rather than directly modifying its internal
> state.**

This prevents the Course module, for example, from becoming responsible
for learner progress, analytics, mastery, or AI-generated plans.

------------------------------------------------------------------------

# 3. The Learning System in One View

``` text
                         INSTRUCTOR
                              │
                              ▼
                           COURSE
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                 TOPICS            FINAL ASSESSMENT
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
       LESSONS   RESOURCES   PRACTICE
          │         │          │
          └─────────┼──────────┘
                    │
             TOPIC ASSESSMENT
                    │
                    ▼
                  LEARNER
                    │
              ENROLLMENT
                    │
                    ▼
            ACTUAL LEARNING ACTIVITY
                    │
                    ▼
             LEARNING EVIDENCE
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       PROGRESS            ANALYTICS
          │                   │
          └─────────┬─────────┘
                    ▼
             PERSONALIZATION
                    │
                    ▼
                AI PLANNER
                    │
                    ▼
              LEARNING PLAN
                    │
                    └──────────────► Learner
```

The critical loop is:

``` text
PLAN → ACTIVITY → EVIDENCE → ANALYSIS → PERSONALIZATION → UPDATED PLAN
```

------------------------------------------------------------------------

# 4. What Each Major Concept Answers

  -----------------------------------------------------------------------
  Concept                             Core question
  ----------------------------------- -----------------------------------
  Course                              What learning offering exists?

  Topic                               What major learning stage exists
                                      inside the course?

  Lesson                              What focused learning segment
                                      exists inside the Topic?

  Resource                            What material supports learning?

  Practice                            Where can the learner practice?

  Assessment                          How is formal performance
                                      evaluated?

  Enrollment                          Is the learner participating in the
                                      course?

  Learning                            What has the learner actually
                                      done/progressed through?

  Evidence                            What observable learning signals
                                      have been produced?

  Analytics                           What patterns/performance can be
                                      derived from the evidence?

  Personalization                     What should adapt for this learner?

  Learning Plan                       What should this learner do next
                                      and in what recommended sequence?
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 5. Course Structure --- Final Conceptual Model

``` text
COURSE
│
├── Course Metadata
├── Ownership
├── Prerequisites
├── Diagnostic Policy
├── Progression Policy
├── Estimated Duration
├── Lifecycle
│
├── TOPICS
│    │
│    ├── LESSONS (0..N)
│    │
│    ├── RESOURCES (0..N)
│    │
│    ├── PRACTICE (0..N)
│    │
│    └── TOPIC ASSESSMENT
│
└── COURSE FINAL ASSESSMENT
```

The entities are conceptually related but remain separate
collections/modules where appropriate.

------------------------------------------------------------------------

# 6. Course Core Decisions

## Course ownership

``` text
Course.createdBy → User._id
```

-   creator must be an Instructor in the normal instructor flow.
-   ownership comes from authenticated identity, never from client
    input.
-   one owner per Course in MVP.
-   no course transfer in MVP.

## Lifecycle

``` text
DRAFT → PUBLISHED → ARCHIVED
```

Allowed:

-   DRAFT → PUBLISHED
-   DRAFT → ARCHIVED
-   PUBLISHED → ARCHIVED

No unarchive and no hard delete in MVP.

## Discovery

Learner discovery uses:

``` http
GET /api/v1/courses
```

with:

``` text
search
domain
category
difficulty
page
limit
```

Normal learner discovery returns published courses.

## Prerequisites

``` text
prerequisites: {
    courses: CourseId[],
    knowledge: String[]
}
```

All declared prerequisites must be satisfied for course entry/enrollment
readiness.

## Diagnostic

``` text
diagnosticPolicy: {
    enabled,
    passingScore,
    questionsPerAttempt,
    randomizeQuestions
}
```

When enabled, passing the diagnostic is a readiness gate.

## Progression policy

``` text
progressionPolicy: {
    lockingEnabled
}
```

Locking affects Topic access only. It does not alter personalization or
mastery semantics.

------------------------------------------------------------------------

# 7. Topic Decisions

A Topic is a major ordered learning stage and a key learner
progress/personalization unit.

A Topic can have zero or many Lessons.

A Topic can have zero or many Resources during drafting.

A Topic can have zero or many Practice activities.

A learner-facing/publishable Topic must eventually contain sufficient
learning material and evaluation structure; exact readiness requirements
depend on Resource/Practice/Assessment implementation.

Conceptual structure:

``` text
Topic
├── Lessons (0..N)
├── Resources (0..N)
├── Practice (0..N)
└── Topic Assessment
```

Topic order:

-   editable in Draft.
-   immutable after Course publication.

Topic duration is not required for MVP.

------------------------------------------------------------------------

# 8. Lesson Decisions

A Lesson is a focused learning segment inside a Topic.

``` text
Lesson
├── topicId
├── title
├── description
├── learningObjectives[]
└── order
```

Rules:

-   one Lesson belongs to exactly one Topic.
-   Lesson cannot exist without Topic.
-   Lesson cannot move between Topics.
-   Lesson order is instructional only.
-   Lesson order can change after publication.
-   Lesson locking does not exist in MVP.
-   Lesson deletion is allowed in Draft and prohibited after
    publication.
-   no first-class Lesson completion state in MVP.
-   Lesson interaction can still produce Learning Evidence.

------------------------------------------------------------------------

# 9. Resource Decisions

A Resource is learning material owned by a Topic.

``` text
Resource.topicId → Topic._id
```

A Resource can:

-   support the entire Topic.
-   support one Lesson.
-   support multiple Lessons within the same Topic.

Lesson↔Resource is many-to-many through an association because the
relationship can carry metadata.

``` text
LessonResource
├── lessonId
├── resourceId
├── startPage?
├── endPage?
├── required
└── order?
```

Cross-topic associations are invalid.

Page ranges are optional and are not used as a proxy for duration or
proof of comprehension.

------------------------------------------------------------------------

# 10. Practice Decisions

MVP Practice is MCQ/question-based.

``` text
Practice
├── topicId
├── title
├── description
├── type
├── instructions
├── order
└── timestamps
```

Practice:

-   is optional.
-   can be repeated.
-   can be edited after publication.
-   cannot be deleted after publication.
-   can be reordered after publication.
-   does not itself complete a Topic.
-   produces useful learning evidence.
-   uses Question Bank for questions.

------------------------------------------------------------------------

# 11. Topic Assessment Decisions

Topic Assessment is the formal Topic completion gate.

Rules:

-   one formal Topic Assessment for a learner-facing/publishable Topic.
-   MCQ-based in MVP.
-   passing score required.
-   questions come from Question Bank.
-   attempts/results are separate records.
-   attempts are constrained rather than unlimited by default.
-   cooldown applies after maximum unsuccessful attempts.
-   historical attempts are retained.
-   high-level feedback is allowed; complete answer-key review is not
    the intended MVP behavior.

Conceptual policy:

``` text
attemptPolicy: {
    maxAttempts,
    cooldownHours
}
```

------------------------------------------------------------------------

# 12. Topic Learner State

Topic state is learner-specific:

``` text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Transitions:

``` text
NOT_STARTED
    ↓ qualifying learning interaction
IN_PROGRESS
    ↓ Topic Assessment passed
COMPLETED
```

A qualifying MVP interaction can include:

-   Resource access.
-   Practice start.

Direct assessment from `NOT_STARTED` is rejected.

Assessment failure or exhausted attempts keep the Topic `IN_PROGRESS`.

Passing the assessment completes the Topic.

Topic completion is not mastery = 100%.

------------------------------------------------------------------------

# 13. Why Lesson Completion Is Not First-Class in MVP

A Lesson completion checkmark does not prove comprehension and can
duplicate weak engagement signals.

Instead, the platform can record:

``` text
Lesson interaction
Resource interaction
Practice activity
Practice performance
Assessment attempt
Assessment result
```

as Learning Evidence.

This produces richer inputs for Analytics and Personalization without
introducing a separate `LessonProgress` state merely for UI checkmarks.

------------------------------------------------------------------------

# 14. Course Final Assessment

Course Final Assessment is separate from Topic Assessment.

Eligibility:

``` text
All required Topics completed
          ↓
Course Final Assessment available
```

Course completion:

``` text
All required Topics COMPLETED
          AND
Final Assessment PASSED
          ↓
Course COMPLETED
```

Disabling Topic locking does not bypass this requirement.

Failing the final assessment does not invalidate completed Topics.

------------------------------------------------------------------------

# 15. Ordering Rules

Ordering is parent-scoped.

``` text
Course → Topics
Topic → Lessons
Topic → Practice
Topic → Resource display
Lesson → Resource-association display
```

Final principles:

-   normal order starts at 1.
-   normal persisted order is contiguous.
-   Draft deletion normalizes order.
-   Topic order is immutable after Course publication.
-   Lesson order can change after publication.
-   Practice order can change after publication.
-   Resource display order is not an access rule.
-   Assessment gates are not ordinary content-order items.
-   progress/evidence references stable IDs, not order values.

------------------------------------------------------------------------

# 16. Duration Decision

For MVP, retain only Course-level estimated duration:

``` text
estimatedDuration: {
    source: MANUAL | DERIVED,
    hours: Number | null,
    weeks: Number | null
}
```

Topic/Lesson fixed durations are not necessary for initial
personalization planning.

The planner can use:

``` text
Course estimate
+
Course structure
+
Learner profile
+
Study capacity
+
Current progress/evidence
```

The Course estimate means approximate instructional effort, not
guaranteed learner completion time.

------------------------------------------------------------------------

# 17. The AI Learning Plan Concept

The AI Learning Plan is a **learner-specific recommendation layer over
the Course structure**.

The Course remains instructor-defined.

The AI does not rewrite:

-   Topics
-   Lessons
-   Resources
-   Practice definitions
-   Assessment definitions

Instead, it selects and organizes existing learning units for the
learner.

Example:

``` text
Course
40-hour estimate
│
├── Topic 1
│    ├── Lesson A
│    ├── Lesson B
│    └── Lesson C
│
├── Topic 2
│    ├── Lesson D
│    └── Lesson E
│
└── Topic 3
     └── Lesson F
```

Learner profile:

``` text
Daily availability = 1–2 hours
Goal = Job preparation
Experience = Basic
```

AI can produce an initial plan such as:

``` text
Plan V1

Day 1 → Lesson A + Lesson B
Day 2 → Lesson C + Practice
Day 3 → Lesson D
Day 4 → Lesson E + Practice
Day 5 → Revision
Day 6 → Topic Assessment
Day 7 → Review / buffer
```

The exact plan is AI-generated, but the Course units it references are
authoritative Course data.

------------------------------------------------------------------------

# 18. Plan Is Not Tracking

This distinction must remain fixed.

### Learning Plan answers:

> What should the learner do?

### Learning Activity/Evidence answers:

> What did the learner actually do?

Therefore we should not use the plan as the primary source of truth for
learner activity.

Avoid making the plan itself the sole tracker with fields such as:

``` text
day1Completed
day2Completed
day3Completed
```

Instead:

``` text
Learning Plan
      │
      │ planned
      ▼
Learner Activity
      │
      │ actual
      ▼
Learning Evidence
```

Planned vs actual can be compared later.

------------------------------------------------------------------------

# 19. Learning Evidence Is Broader Than Time

Learning Evidence can contain signals such as:

``` text
Resource access
Lesson interaction
Practice start
Practice answers/results
Assessment attempts
Assessment results
Topic progress
Other meaningful learning events
```

Time/activity behavior is only one signal.

Other important signals include:

-   Practice accuracy.
-   Assessment performance.
-   Weak concepts/topics.
-   Repeated attempts.
-   Progress through Topics.
-   Learning interactions.

This prevents personalization from becoming merely a time-management
system.

------------------------------------------------------------------------

# 20. Initial Plan → Actual Activity

Example:

``` text
PLAN V1

Day 1
→ Python Basics
→ NumPy
→ Practice
```

Learner actually performs:

``` text
Python Basics → accessed
NumPy → accessed
Practice → 80%
```

Learning Evidence records the actual events/results.

The system can derive:

``` text
Day 1 planned activity
        vs
Day 1 actual activity
```

But this does not automatically mean the plan version changes.

------------------------------------------------------------------------

# 21. Minor Deviation vs Replanning

Not every deviation should trigger AI.

### Minor deviation

``` text
Day 1 incomplete
      ↓
Carry remaining work forward
      ↓
Continue current plan
```

No new plan version is required.

### Significant/repeated deviation

``` text
Repeated incomplete activities
        OR
Significant performance change
        OR
Meaningful learner availability change
        OR
Weakness detected
        ↓
Potential replanning signal
```

Exact thresholds are deferred to Analytics/Personalization design.

------------------------------------------------------------------------

# 22. Personalization Does Not Wait for Day 7

A weekly checkpoint is useful, but it is not a mandatory waiting period.

For example:

``` text
Day 1 → evidence
Day 2 → evidence
Day 3 → evidence
```

If a meaningful pattern is detected on Day 3, the system can identify a
potential need for plan refinement.

The learner does not have to reach Day 7 before the system notices the
change.

At the same time, the system should avoid reacting to every small event.

------------------------------------------------------------------------

# 23. Replanning UX

A recommended MVP interaction is:

``` text
Analytics / Personalization
          ↓
Potential plan refinement detected
          ↓
Learner sees:
"Your recent learning pattern suggests
that your current plan may need refinement."
          ↓
[Review & Update Plan]
          ↓
Learner approves
          ↓
AI Planner
          ↓
Plan V2
```

The learner remains in control of substantial plan changes.

The system can still make small deterministic execution adjustments
without generating a new plan.

------------------------------------------------------------------------

# 24. Example: Time-Based Adaptation

Initial:

``` text
Learner availability = 1–2 hours/day
```

Plan V1:

``` text
Day 1 → 90 min
Day 2 → 90 min
Day 3 → 90 min
```

Observed activity:

``` text
Day 1 → 30 min
Day 2 → 40 min
Day 3 → 35 min
```

Analytics may identify a repeated pace mismatch.

The system can show:

``` text
Your recent study pattern is below the pace
assumed by your current plan.
Would you like to adjust the plan?
```

If approved, AI receives current state and generates V2.

------------------------------------------------------------------------

# 25. Example: Performance-Based Adaptation

The learner may follow the schedule perfectly but still struggle.

Example:

``` text
Study adherence → good

Practice → 45%
Topic Assessment → 48%
Weak concepts → Classification Metrics
```

This is also a personalization signal.

The system can propose:

``` text
Review relevant resources
        ↓
Targeted Practice
        ↓
Reassessment
        ↓
Continue course path
```

Therefore:

``` text
Personalization ≠ time tracking only
```

------------------------------------------------------------------------

# 26. Plan Versioning

Plans should be versioned rather than overwritten.

``` text
Learning Plan V1
Status: SUPERSEDED
        ↓
Learning Plan V2
Status: ACTIVE
        ↓
Learning Plan V3
Status: ACTIVE/current
```

A new version should preserve enough history to understand:

-   when it was generated.
-   why it was generated.
-   what learner state it was based on.
-   what previous plan it replaced.

The exact LearningPlan schema is deferred to Personalization design.

------------------------------------------------------------------------

# 27. Weekly Checkpoint

A weekly checkpoint remains useful for:

-   learner summary.
-   planned vs actual comparison.
-   progress summary.
-   performance summary.
-   weaknesses.
-   plan effectiveness review.
-   possible next-week plan generation.

But:

``` text
Weekly checkpoint
≠
Only time personalization is allowed to run
```

Meaningful signals can be detected earlier.

------------------------------------------------------------------------

# 28. Deterministic Logic vs AI Logic

This boundary is critical.

## Deterministic backend logic

Should handle things such as:

``` text
Is the learner enrolled?
Is the Topic accessible?
Is the Topic locked?
Has the Topic been completed?
Can another assessment attempt be made?
Has cooldown expired?
Has the learner completed all required Topics?
Is the final assessment eligible?
```

These should not be delegated to an LLM.

## AI / Personalization

Can handle questions such as:

``` text
What should this learner study next?
Which weak area deserves intervention?
How should the learner's remaining plan be reorganized?
Which existing learning units should be prioritized?
```

------------------------------------------------------------------------

# 29. Complete Adaptive Learning Loop

``` text
              ┌──────────────────────┐
              │ Learner Profile     │
              │ Study capacity      │
              │ Goals / experience  │
              └──────────┬───────────┘
                         │
                         ▼
                    ┌──────────┐
                    │ Course   │
                    │ Structure│
                    └────┬─────┘
                         │
                         ▼
                    AI Planner
                         │
                         ▼
                    PLAN V1
                         │
                         ▼
                    Learner
                         │
                         ▼
                Actual Activities
                         │
                         ▼
               Learning Evidence
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          Progress              Analytics
              │                     │
              └──────────┬──────────┘
                         ▼
                  Personalization
                         │
                 Significant change?
                    ┌────┴────┐
                   NO        YES
                    │          │
                    ▼          ▼
               Continue    Suggest update
                 V1             │
                            Learner approves
                                 │
                                 ▼
                             AI Planner
                                 │
                                 ▼
                              PLAN V2
```

------------------------------------------------------------------------

# 30. What Must Never Be Confused

### Course vs Learning Plan

Course = instructor-defined learning universe.

Plan = learner-specific recommended route.

### Plan vs Evidence

Plan = what should happen.

Evidence = what actually happened.

### Progress vs Mastery

Progress = how far the learner has moved through required learning
structure.

Mastery = estimated understanding/competence derived from evidence and
performance.

### Assessment vs Practice

Practice = learning activity.

Assessment = formal evaluation.

### Locking vs Completion

Locking = access rule.

Completion = learner milestone.

### Analytics vs Personalization

Analytics = measurement/pattern interpretation.

Personalization = deciding what should adapt.

### AI vs Business Rules

AI = intelligent recommendation/planning.

Backend business rules = authoritative system behavior.

------------------------------------------------------------------------

# 31. Future Module Design Order

When implementation design continues, use this conceptual order so
dependencies remain clear:

``` text
1. Course
2. Topic
3. Lesson
4. Resource
5. Practice
6. Question Bank
7. Assessment
8. Enrollment
9. Learning / Evidence
10. Analytics
11. Personalization / Recommendation
12. AI Learning Plan
13. Background processing / optimization
```

The exact implementation order may change where dependencies require it,
but the ownership boundaries should remain.

------------------------------------------------------------------------

# 32. Final Reference Checklist

Before implementing any future module, ask:

### Ownership

-   Which module owns this data?
-   Is another module incorrectly storing it?

### Progress

-   Is this global Course state or learner-specific state?

### Evidence

-   Is this an actual learner event or merely a planned activity?

### AI

-   Does this really require AI, or is deterministic logic sufficient?

### Personalization

-   What evidence supports the adaptation?
-   Is the adaptation temporary or a new plan version?

### Publication

-   Does changing this structure affect learners already using the
    Course?

### Identity

-   Does the operation use stable IDs rather than mutable order values?

### Explainability

-   Can we explain why a plan or recommendation changed?

------------------------------------------------------------------------

# 33. Current Architectural Status

The Course Core and Course Structure planning discussed in this phase is
complete at the conceptual level.

``` text
Course Core                         ✅
Course ownership                   ✅
Course lifecycle                   ✅
Prerequisites                      ✅
Diagnostic policy                  ✅
Course APIs                        ✅
Course discovery                   ✅
Topic definition                   ✅
Lesson definition                  ✅
Lessons optional                   ✅
Topic↔Lesson                       ✅
Topic↔Resource                     ✅
Lesson↔Resource                    ✅
Topic Practice                     ✅
Topic Assessment                   ✅
Topic locking                      ✅
Topic completion                   ✅
Lesson completion decision         ✅
Course Final Assessment            ✅
Ordering                           ✅
Duration direction                 ✅
Plan/Evidence/Analytics boundary  ✅
Adaptive planning concept          ✅
```

Detailed implementation contracts remain to be designed module by
module.

------------------------------------------------------------------------

# 34. Source-of-Truth Rule Going Forward

When implementing a later module:

1.  Start from this planning document for cross-module relationships.
2.  Start from the Course Module Design document for Course-owned
    decisions.
3.  Define the new module's own data and business rules without taking
    ownership from existing modules.
4.  If a new requirement conflicts with a locked decision, explicitly
    identify the conflict before changing the architecture.
5.  Do not implement deferred features merely because they are mentioned
    in this document.
6.  Update the relevant source-of-truth document after an architectural
    decision is formally changed.

This document is intended to keep future module design aligned without
requiring the entire architecture to be re-discussed from the beginning.
