# AI Based Personalized Learning Platform — Course Module Design

## 1. Purpose

This document is the source of truth for the **Course Module** decisions finalized during Course Core, Course API, and Course Structure planning.

It consolidates the finalized decisions for:

- Course model
- Course ownership
- Course lifecycle
- Course fields
- Estimated course duration
- Prerequisites
- Diagnostic policy
- Progression policy
- Instructor course APIs
- Learner discovery APIs
- Course API representations
- Course discovery query behavior
- Topic and Lesson structure
- Topic–Resource and Lesson–Resource relationships
- Topic Practice
- Topic Assessment
- Course Final Assessment
- Topic locking and completion
- Ordering rules
- Course/module responsibility boundaries
- Relationship between Course content and the future Learning, Analytics, Personalization, and AI Learning Plan modules

This document is an **architecture/design source of truth**. It does not mean every item described here has already been implemented.

---

# 2. Architectural Context

The platform uses a **modular monolith**.

The Course module owns the definition, structure, discovery, and lifecycle of a course. Learner-specific progress, evidence, analytics, mastery, recommendations, and learning plans remain outside the Course module.

High-level relationship:

```text
Course
│
├── Topics
│   ├── Lessons
│   ├── Resources
│   ├── Practice
│   └── Topic Assessment
│
└── Course Final Assessment
```

These are separate entities/collections rather than one large embedded Course document.

The broader platform relationship is:

```text
Course Content
      ↓
Learner
      ↓
Actual Learning Activity
      ↓
Learning Evidence
      ↓
Progress + Assessment Results
      ↓
Analytics
      ↓
Personalization
      ↓
AI Learning Plan
      ↓
Possible Plan Refinement
```

The Course module defines **what can be learned**. It does not own the learner's personalized path through that content.

---

# 3. Course Module Responsibilities

The Course module is responsible for:

- Course metadata
- Course ownership
- Domain and category
- Difficulty
- Learning objectives
- Optional estimated course duration
- Prerequisite configuration
- Diagnostic policy configuration
- Progression policy configuration
- Course lifecycle
- Topics
- Lessons
- Course structure/order
- Course-level learner discovery
- Course overview representation
- Instructor course management

The Course module is not responsible for:

- Enrollment relationship
- Learner-specific progress
- Learner-specific Topic status
- Lesson completion state
- Learning evidence
- Learner mastery
- Assessment attempts/results
- Question selection/scoring
- Analytics
- Recommendations
- Personalization decisions
- AI learning plans
- Learner-specific actual study time
- Remediation execution

Other modules consume Course information rather than placing their internal state inside the Course model.

---

# 4. Course Model — Finalized

Conceptually:

```text
Course
├── _id
├── title
├── description
├── createdBy
├── domain
├── category
├── difficulty
├── objectives[]
├── estimatedDuration
├── prerequisites
├── diagnosticPolicy
├── progressionPolicy
├── status
├── createdAt
└── updatedAt
```

## 4.1 Title

```text
title: String
```

Rules:

- Required
- Trimmed
- Suggested length: 3–150 characters

## 4.2 Description

```text
description: String
```

Rules:

- Required
- Trimmed
- Suggested length: 20–5000 characters

## 4.3 Ownership

```text
createdBy → User._id
```

The referenced User must have the `INSTRUCTOR` role for normal instructor-created courses.

Rules:

- Required
- Indexed
- Set by the backend from the authenticated instructor
- Never trusted from the client
- Immutable through normal Course updates
- One owner per Course in MVP
- No Course transfer operation in MVP

There is no `courses[]` field on User or InstructorProfile. Courses are queried using `Course.createdBy`.

## 4.4 Domain

```text
domain: String
```

Domain represents the platform learning taxonomy.

The exact taxonomy mechanism is a platform-level concern and should be centralized.

## 4.5 Category

```text
category: String
```

Category is a controlled platform taxonomy used for course discovery and filtering.

## 4.6 Difficulty

```text
difficulty: BEGINNER | INTERMEDIATE | ADVANCED
```

Difficulty is a controlled enum.

## 4.7 Objectives

```text
objectives: String[]
```

Recommended constraints:

- Default `[]`
- Recommended minimum: 1
- Recommended maximum: 10
- Each objective should be a meaningful string

The exact publication minimum will be finalized as part of the dependent structure/content validation.

---

# 5. Estimated Course Duration — Finalized MVP Direction

Estimated duration is **optional**.

A course may exist without an estimated duration.

Conceptually:

```text
estimatedDuration: {
    source: "MANUAL" | "DERIVED",
    hours: Number | null,
    weeks: Number | null
}
```

## Meaning

### `hours`

Represents the instructor/system's approximate estimate of the **total learning effort** associated with the course.

It is not:

- A guaranteed completion time
- A personalized learner duration
- A requirement that the learner spend exactly that amount of time
- A direct calculation from PDF page count
- A direct calculation from file size
- A direct calculation from number of resources
- A direct calculation from number of lessons

### `weeks`

Represents an instructor's recommended overall calendar duration.

Learning effort and calendar duration are separate concepts.

For example:

```text
Estimated effort: 40 hours
Recommended duration: 8 weeks
```

does not impose an exact daily schedule.

## Source

### `MANUAL`

The instructor controls the estimate.

### `DERIVED`

The system may derive course hours from finalized course learning structure.

The exact derivation formula is intentionally not fixed at this stage because the complete learning-unit models and measurable learning activities are designed separately.

## Important MVP decision

**Course-level estimated duration is sufficient for the initial AI planning use case.**

We do not require fixed Topic or Lesson duration fields in MVP merely to generate personalized learning plans.

The AI planning system can use:

```text
Course estimated workload
+
Course structure
+
Learner profile
+
Learner availability
+
Current progress/evidence
```

to generate a learner-specific plan.

Learner actual time is a separate Learning/Evidence concern.

---

# 6. Prerequisites — Finalized

Structure:

```text
prerequisites: {
    courses: CourseId[],
    knowledge: String[]
}
```

Rules:

- `courses[]` references prerequisite Course documents.
- `knowledge[]` contains descriptive knowledge requirements.
- All declared prerequisites must be satisfied.
- No nested AND/OR prerequisite rule engine in MVP.
- A prerequisite Course is satisfied when the learner has **COMPLETED** it, not merely enrolled in it.
- Prerequisites affect course entry/enrollment readiness.
- Prerequisites do not control individual Lesson progression.
- Discovery remains open: a learner may discover a course even when prerequisites are not satisfied.
- Archived prerequisite Courses remain valid references because Course hard deletion is not part of MVP.

Learner-specific prerequisite evaluation belongs to Enrollment/course-entry logic.

---

# 7. Diagnostic Policy — Finalized

Structure:

```text
diagnosticPolicy: {
    enabled: Boolean,
    passingScore: Number | null,
    questionsPerAttempt: Number | null,
    randomizeQuestions: Boolean
}
```

Rules:

- Diagnostic is optional and instructor-controlled.
- When enabled, the learner cannot bypass the diagnostic readiness gate.
- Passing means `score >= passingScore`.
- Retakes are allowed in MVP.
- Diagnostic questions come from a separate question pool.
- Questions are not embedded inside Course.
- `questionsPerAttempt` must not exceed the available diagnostic question pool.
- Question selection may be randomized.
- Attempts/results are retained separately.
- Correct answers are not exposed as individual answer-review content after the diagnostic.
- High-level weak-area feedback may be provided.
- Diagnostic results may later become personalization/remediation signals.

Course learning entry follows:

```text
Prerequisites satisfied
        AND
Diagnostic passed (when enabled)
        ↓
Course learning access
```

If diagnostic is disabled, the prerequisite requirement remains.

The Course module stores the policy. Question selection, attempts, scoring, and results belong to Question Bank/Assessment.

---

# 8. Progression Policy — Finalized

Topic locking is configured at Course level.

Structure:

```text
progressionPolicy: {
    lockingEnabled: Boolean
}
```

Rules:

- Locking is optional.
- It applies to Topic access/progression.
- It does not control Lesson access.
- It does not determine mastery.
- It does not determine personalization.
- It does not change learning evidence.
- In MVP, the locking policy should be configurable before publication and immutable after publication.
- First Topic is accessible once general course-entry requirements are satisfied.
- When locking is enabled, the next Topic becomes accessible after the previous required Topic is completed.
- When locking is disabled, Topics can be accessed independently after general course-entry requirements are satisfied.
- Learners can revisit completed Topics.
- Final Course Assessment eligibility still requires all required Topics to be completed regardless of locking mode.

The lock itself is **learner-specific derived state**. Do not store a global `Topic.isLocked` field.

---

# 9. Course Ownership — Finalized

Ownership:

```text
Instructor User
    │
    ├── Course A
    ├── Course B
    └── Course C
```

Technically:

```text
Course.createdBy → User._id
```

Rules:

1. Only authenticated instructors can create normal instructor courses.
2. `createdBy` is derived from `req.user._id`.
3. The client cannot assign ownership.
4. `createdBy` cannot be changed through normal PATCH.
5. Only the owner instructor can normally manage a course.
6. An instructor cannot manage another instructor's draft/management data.
7. Learner discovery normally exposes only published courses.
8. Admin governance actions are explicit.
9. Course transfer is not an MVP feature.

Ownership is validated by the backend.

---

# 10. Course Lifecycle — Finalized

Lifecycle:

```text
DRAFT → PUBLISHED → ARCHIVED
```

Allowed:

```text
DRAFT → PUBLISHED
DRAFT → ARCHIVED
PUBLISHED → ARCHIVED
```

Not allowed:

```text
PUBLISHED → DRAFT
ARCHIVED → DRAFT
ARCHIVED → PUBLISHED
```

Rules:

- New Course starts as `DRAFT`.
- Draft Courses are not normally discoverable/enrollable by learners.
- Published Courses are available for normal learner discovery.
- Archived Courses are retained but excluded from normal learner discovery.
- No hard Course deletion in MVP.
- No unarchive operation in MVP.
- Lifecycle changes use dedicated operations rather than generic PATCH.

Endpoints:

```http
POST /api/v1/courses/:courseId/publish
POST /api/v1/courses/:courseId/archive
```

The final publication-readiness checklist depends on the completed Topic, Resource, Practice, Question Bank, and Assessment designs.

---

# 11. Course Structure — Finalized

The Course structure is:

```text
Course
│
├── Topic 1
│   ├── Lessons (0..N)
│   ├── Resources (0..N)
│   ├── Practice (0..N)
│   └── Topic Assessment
│
├── Topic 2
│   ├── Lessons (0..N)
│   ├── Resources (0..N)
│   ├── Practice (0..N)
│   └── Topic Assessment
│
└── Course Final Assessment
```

Important:

- Topics are separate entities.
- Lessons are separate entities.
- Resources are separate entities.
- Practice is separate.
- Assessments are separate.
- Questions are managed by Question Bank.
- Learner progress/evidence is separate.
- Do not embed all course content and learner state inside Course.

---

# 12. Topic — Finalized

Definition:

> A Topic is a major, ordered learning unit within a Course that groups related Lessons, learning Resources, Practice activities, and a Topic Assessment around a coherent area of knowledge or skill. A Topic represents a meaningful stage of the learner's journey and serves as an important unit for learning progression, completion, performance analysis, and future personalization.

Conceptual fields:

```text
Topic
├── _id
├── courseId
├── title
├── description
├── learningObjectives[]
├── order
└── timestamps
```

Rules:

- A Topic belongs to exactly one Course.
- A Course can have multiple Topics.
- A Topic is a meaningful learning stage.
- A Topic can contain zero or more Lessons.
- A Topic can contain zero or more Resources.
- A Topic can contain zero or more Practice activities.
- A learner-facing/publishable Topic must have sufficient learning material and evaluation structure.
- A Topic is not considered empty merely because it has zero Lessons.
- A Topic with no meaningful learning material/evaluation is not learner-ready.
- Exact publish-readiness requirements depend on Resources, Practice, and Assessment rules.
- Topic order is distinct from locking.
- Topic completion is learner-specific and is not stored globally on Topic.

---

# 13. Lesson — Finalized

Definition:

> A Lesson is a focused, ordered learning unit within a Topic that introduces a specific concept or skill and provides the learner with a clear description, learning objectives, and access to relevant learning materials.

Conceptual fields:

```text
Lesson
├── _id
├── topicId
├── title
├── description
├── learningObjectives[]
├── order
└── timestamps
```

Rules:

- A Lesson belongs to exactly one Topic.
- `topicId` is required.
- A Lesson cannot exist without a Topic.
- A Lesson cannot be transferred from one Topic to another through normal APIs, including while the Course is in Draft.
- A Lesson does not own the actual learning material; Resources provide that material.
- A Lesson may have no directly associated Resource if Topic-level Resources support it.
- Lesson order represents instructional sequence only.
- Lesson order does not create access locking.
- There is no Lesson locking in MVP.
- Lesson completion is not a first-class learner state in MVP.
- Lesson/resource interactions may still produce Learning Evidence.
- Published Lesson deletion is not allowed.
- Draft Lesson deletion is allowed.
- Published Lesson metadata editing may be allowed subject to future safe-content restrictions.
- Learner evidence references stable Lesson IDs, not order numbers.

---

# 14. Lessons Are Optional — Finalized

Lessons are **optional within a Topic**.

A Topic may use Lessons to provide a structured lesson-by-lesson experience, but Lessons are not mandatory for a Topic to be meaningful.

Valid example:

```text
Topic
├── Resources
├── Practice
└── Topic Assessment
```

with zero Lessons.

Another valid example:

```text
Topic
├── Lesson 1
├── Lesson 2
├── Resources
├── Practice
└── Topic Assessment
```

A Topic is not considered empty simply because it has no Lessons.

Topic readiness depends on whether it contains sufficient learning material and evaluation structure, with exact minimum requirements determined by the dependent modules.

---

# 15. Topic ↔ Lesson — Finalized

Relationship:

```text
Course
  └── Topic
        └── Lesson
```

Rules:

- One Topic → zero or many Lessons.
- One Lesson → exactly one Topic.
- Lesson `topicId` is required.
- Lesson cannot be moved between Topics.
- Topic order affects course progression.
- Lesson order does not affect access.
- Learner access to Lessons is not sequentially locked.
- Learner progress/evidence uses Lesson ID.

### Topic order

```text
Draft:
    editable

Published:
    immutable
```

### Lesson order

```text
Draft:
    editable

Published:
    editable
```

This distinction is intentional.

---

# 16. Resources — Finalized Relationship Direction

Resources represent learning material.

A Resource belongs to one Topic in MVP:

```text
Resource.topicId → Topic._id
```

A Resource can be:

- Topic-level material
- Associated with one Lesson
- Associated with multiple Lessons within the same Topic

A Resource does not need to be one-per-Lesson.

Example:

```text
Topic: Introduction to ML

Resources:
R1 = Complete ML Notes.pdf
R2 = Introduction Video
R3 = Classification Examples.pdf

Lessons:
L1 = What is ML?
L2 = Types of ML
L3 = Supervised Learning

Associations:
R1 → L1
R1 → L2
R1 → L3
R2 → L1
R3 → L3
```

The Resource itself remains Topic-owned.

---

# 17. Lesson ↔ Resource — Finalized

Lesson ↔ Resource is a many-to-many relationship within the same Topic.

Conceptually:

```text
LessonResource
├── lessonId
├── resourceId
├── startPage?
├── endPage?
├── required
└── order?
```

Rules:

- One Lesson → many Resources.
- One Resource → many Lessons.
- Resource belongs to one Topic.
- Lesson belongs to one Topic.
- Association must connect a Lesson and Resource from the same Topic.
- Cross-topic association is invalid.
- `required` belongs to the association because a Resource may be required for one Lesson and optional for another.
- `order` is display/instructional order within the Lesson.
- `startPage` and `endPage` are optional and mainly relevant to page-based resources such as PDFs.
- If page ranges are supplied: `startPage >= 1` and `endPage >= startPage`.
- Page ranges may overlap or contain gaps.
- Page count is not automatically learning duration.
- No learner progress is stored in the association.
- Learning evidence is a separate concern.

A Resource can simultaneously be:

```text
Topic-wide
+
associated with specific Lessons
```

without duplicating the physical Resource.

---

# 18. Topic Practice — Finalized

Practice is an optional learning activity associated with a Topic.

MVP Practice is **MCQ/question-based**.

Conceptual structure:

```text
Practice
├── _id
├── topicId
├── title
├── description
├── type
├── instructions
├── order
└── timestamps
```

MVP:

```text
type = QUESTION_BASED
```

Questions are managed by Question Bank and are not embedded inside Practice.

Rules:

- A Topic may have zero or more Practice activities.
- Practice is optional.
- Practice does not itself determine Topic completion.
- Practice can be repeated.
- Practice does not require a formal pass/fail gate in MVP.
- Practice order is instructional only.
- Practice order can change after publication.
- Draft Practice can be deleted.
- Published Practice cannot be deleted.
- Published Practice can be edited subject to safe restrictions.
- Practice generates useful Learning Evidence.
- Long-term mastery is not owned by Practice.

---

# 19. Topic Assessment — Finalized

Each learner-facing/publishable Topic requires **one formal Topic Assessment**.

The assessment is:

- MCQ-based
- Connected to a Topic
- Managed through Question Bank
- Separate from Practice
- Required for Topic completion

The Topic Assessment has:

```text
passingScore
attemptPolicy
questionPool
```

Attempt policy:

```text
attemptPolicy: {
    maxAttempts: Number,
    cooldownHours: Number
}
```

The initial recommended configuration is:

```text
maxAttempts = 3
cooldownHours = 24
```

with platform-level bounds such as:

```text
maxAttempts: 1–10
cooldownHours: 1–168
```

These numerical defaults are implementation/configuration decisions and can be adjusted without changing the conceptual model.

Rules:

- Attempts are multiple but not unlimited by default.
- Historical attempts are retained.
- Cooldown applies after the learner exhausts unsuccessful attempts.
- During cooldown, the learner can continue current Topic learning and Practice.
- Cooldown only prevents another assessment submission.
- Passing means the learner satisfies the configured passing threshold.
- Failed assessment does not create a permanent Topic `FAILED` state.
- Correct answers are not exposed as a full answer key.
- Feedback may include score and high-level areas needing attention.
- Personalization/Recommendation determines interventions rather than hard-coding recommendations into Assessment.

---

# 20. Topic Completion — Finalized

Topic learner state:

```text
NOT_STARTED
     ↓
IN_PROGRESS
     ↓
COMPLETED
```

## NOT_STARTED → IN_PROGRESS

A qualifying learning interaction can move the Topic to `IN_PROGRESS`.

MVP qualifying interactions include:

- Accessing a Resource
- Starting a Practice activity

This is an engagement signal, not proof that the learner understood the material.

## IN_PROGRESS → COMPLETED

Only after:

```text
Topic Assessment
      ↓
Passing score
      ↓
COMPLETED
```

There is no direct:

```text
NOT_STARTED → COMPLETED
```

A direct assessment attempt from `NOT_STARTED` is rejected.

If an assessment fails:

```text
IN_PROGRESS → IN_PROGRESS
```

If maximum unsuccessful attempts are exhausted:

```text
IN_PROGRESS → IN_PROGRESS
```

The learner remains incomplete and may receive intervention/reassessment opportunities according to the assessment policy.

If a completed learner revisits the Topic:

```text
COMPLETED → COMPLETED
```

Additional learning does not undo completion.

Topic completion is learner-specific and belongs to the Learning module.

---

# 21. Lesson Completion — Finalized MVP Decision

There is **no first-class Lesson completion state in MVP**.

We do not maintain:

```text
LessonProgress
```

merely to provide a Lesson completion checkmark.

Reason:

- Accessing a Lesson does not prove comprehension.
- Practice and assessment performance are stronger learning signals.
- Resource/Lesson interactions can still be recorded as Learning Evidence.
- Topic completion is the meaningful formal milestone.

Therefore:

```text
Lesson
    ↓
Interaction/Evidence
    ↓
Topic Progress
    ↓
Topic Completion
```

rather than:

```text
Lesson
    ↓
Lesson Completed
    ↓
Topic Completed
```

---

# 22. Topic Locking and Unlocking — Finalized

Locking is Course-level:

```text
Course.progressionPolicy.lockingEnabled
```

### Locking enabled

```text
Topic 1
   ↓
completed
   ↓
Topic 2
   ↓
completed
   ↓
Topic 3
```

### Locking disabled

```text
Topic 1 ─┐
Topic 2 ─┼── independently accessible
Topic 3 ─┘
```

Rules:

- First Topic is accessible after general course-entry requirements.
- Next Topic unlocks after previous required Topic is completed when locking is enabled.
- Failed/exhausted Topic Assessment keeps the next Topic locked when locking is enabled.
- Assessment cooldown does not lock the current Topic's learning material or Practice.
- Completed Topics remain revisit-able.
- Topic order is immutable after Course publication.
- Locking policy should be immutable after Course publication in MVP.
- Do not store global `Topic.isLocked`.
- Lock status is derived per learner.
- Locking affects access only.
- Locking does not affect mastery, analytics, evidence, personalization, or recommendations.

---

# 23. Course Final Assessment — Finalized

The Course Final Assessment is a separate course-level formal evaluation.

It is:

- MCQ-based
- Managed through a course-level question pool
- Separate from Topic Assessments
- Required for formal Course completion

Eligibility:

```text
All required Topics COMPLETED
        ↓
Course Final Assessment available
```

This remains true even when Topic locking is disabled.

The final assessment has:

```text
passingScore
attemptPolicy
questionPool
```

It uses the same conceptual attempt policy:

```text
maxAttempts
cooldownHours
```

Rules:

- Multiple attempts are allowed according to policy.
- Historical attempts are retained.
- Cooldown is enforced after exhausting unsuccessful attempts.
- Completed Topics remain completed even when the final assessment is failed.
- Learners can revisit Topics.
- Passing the final assessment is required for formal Course Completion.
- Full correct-answer review is not exposed.
- Feedback can include score and high-level learning areas.
- Personalization/Recommendation determines interventions.

Course completion is:

```text
All Required Topics Completed
            AND
Course Final Assessment Passed
            ↓
      COURSE COMPLETED
```

The system should not simply average Topic Assessment scores to determine final Course completion.

---

# 24. Ordering — Finalized

Ordering is parent-scoped.

```text
Course
    └── Topics → order

Topic
    ├── Lessons → order
    ├── Practice → order
    └── Resources → display order

Lesson ↔ Resource association
    └── display order
```

Rules:

1. Normal persisted order starts at `1`.
2. Ordering is unique within its parent collection.
3. Normal persisted order should be contiguous.
4. Draft deletions normalize remaining order.
5. Topic order is structurally significant.
6. Topic order can change in Draft.
7. Topic order cannot change after Course publication.
8. Lesson order is instructional only.
9. Lesson order can change after publication.
10. Practice order is instructional only.
11. Practice order can change after publication.
12. Resource order is display/instructional metadata.
13. Topic Assessment is not treated as an ordinary ordered content item.
14. Course Final Assessment is not part of Topic ordering.
15. Learner progress/evidence references stable IDs, never order values.
16. Reordering should use dedicated backend operations rather than blindly trusting arbitrary client-supplied order numbers.

---

# 25. Published-Course Structural Rules

The following decisions are finalized for current Course Structure behavior.

## Topics

```text
Draft:
    create/edit/reorder/delete according to Topic rules

Published:
    existing Topic order cannot change
```

Topic deletion/addition on a published Course requires additional safe-content rules and is not generalized here.

## Lessons

```text
Draft:
    create/edit/reorder/delete

Published:
    edit/reorder allowed subject to safe restrictions
    delete prohibited
    transfer prohibited
```

## Practice

```text
Draft:
    create/edit/reorder/delete

Published:
    edit/reorder allowed subject to safe restrictions
    delete prohibited
```

## Resources

Published Resource editing/deletion rules remain dependent on the Resource implementation and are not over-specified here.

---

# 26. Instructor Course APIs — Finalized Course Core

```http
POST   /api/v1/courses
GET    /api/v1/instructor/courses
GET    /api/v1/courses/:courseId
PATCH  /api/v1/courses/:courseId
POST   /api/v1/courses/:courseId/publish
POST   /api/v1/courses/:courseId/archive
```

## Create Course

```http
POST /api/v1/courses
```

Requirements:

- Authenticated
- `INSTRUCTOR` role

Backend sets:

```text
createdBy = req.user._id
status = DRAFT
```

The client cannot control these fields.

Course creation is progressive. A draft can receive structure and configuration through subsequent operations.

## Instructor Course List

```http
GET /api/v1/instructor/courses
```

Ownership:

```text
Course.find({ createdBy: req.user._id })
```

The instructor may see their own:

- DRAFT
- PUBLISHED
- ARCHIVED

courses for management.

## Get Course

```http
GET /api/v1/courses/:courseId
```

Actor-aware representation:

- Owner Instructor → management representation
- Learner → published learner-facing representation
- Unrelated Instructor → no access to another instructor's management data
- Learner → unpublished/archived course is not exposed through normal learner access

## Update Course

```http
PATCH /api/v1/courses/:courseId
```

Partial update.

Course fields that can be updated through normal Course PATCH include:

```text
title
description
domain
category
difficulty
objectives
estimatedDuration
prerequisites
diagnosticPolicy
progressionPolicy
```

Not generic PATCH fields:

```text
_id
createdBy
status
createdAt
updatedAt
```

Status changes use lifecycle endpoints.

## Publish

```http
POST /api/v1/courses/:courseId/publish
```

Conceptual flow:

```text
Authenticate
    ↓
INSTRUCTOR
    ↓
Course exists
    ↓
Owner?
    ↓
Status = DRAFT?
    ↓
Publish readiness passes
    ↓
DRAFT → PUBLISHED
```

The exact readiness checklist is finalized only after dependent modules are defined.

## Archive

```http
POST /api/v1/courses/:courseId/archive
```

Allowed from:

```text
DRAFT
PUBLISHED
```

to:

```text
ARCHIVED
```

---

# 27. Learner Course Discovery APIs — Finalized

## Explore Courses

```http
GET /api/v1/courses
```

Purpose:

- Discover published Courses
- Search
- Filter
- Paginate

Normal discovery:

```text
status = PUBLISHED
```

This is not:

- Enrollment
- My Courses
- Personalized recommendation

## Course Overview

```http
GET /api/v1/courses/:courseId
```

For learners, the Course must be published.

Conceptually includes:

- Title
- Description
- Instructor
- Domain
- Category
- Difficulty
- Objectives
- Prerequisites
- Estimated duration, when provided
- Diagnostic requirement
- Structure overview

The exact `structureOverview` response shape can be implemented using the finalized Topic/Lesson structure.

---

# 28. Course Discovery Query Contract — Finalized

Endpoint:

```http
GET /api/v1/courses
```

Query parameters:

```text
search
domain
category
difficulty
page
limit
```

Defaults:

```text
page = 1
limit = 20
sort = createdAt DESC
```

## Search

Search may cover:

- title
- description
- domain
- category

Maximum search length:

```text
100 characters
```

Empty search means no search filter.

Exact MongoDB search/index strategy is an implementation concern.

## Filters

Domain and category use approved taxonomy values.

Difficulty:

```text
BEGINNER
INTERMEDIATE
ADVANCED
```

Multiple filters use AND semantics.

## Pagination

```text
page >= 1
1 <= limit <= 50
```

Out-of-range pages may return an empty course list with normal pagination metadata.

Response:

```json
{
  "success": true,
  "data": {
    "courses": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 73,
      "totalPages": 4,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "message": "Courses retrieved successfully"
}
```

## Sorting

Current discovery does not expose user-selectable sorting.

Default:

```text
createdAt DESC
```

Personalized ranking, popularity, trending, and recommendation ordering are separate concerns.

---

# 29. Course API Representations — Finalized

The same Course document may have different representations.

```text
Course document
      │
      ├── Instructor representation
      ├── Course list representation
      └── Learner overview representation
```

## Instructor representation

May include:

```text
_id
title
description
createdBy
domain
category
difficulty
objectives
estimatedDuration
prerequisites
diagnosticPolicy
progressionPolicy
status
createdAt
updatedAt
```

## Course List representation

Optimized for discovery cards:

```text
_id
title
description
instructor summary
domain
category
difficulty
objective summary
estimatedDuration when provided
diagnostic requirement where useful
```

## Learner Overview

May include:

```text
_id
title
description
instructor
domain
category
difficulty
objectives
estimatedDuration when provided
prerequisites
diagnostic requirement
structureOverview
```

Do not expose unnecessary internal diagnostic configuration to normal learners, such as:

```text
questionsPerAttempt
randomizeQuestions
```

---

# 30. Course vs Other Modules

The boundaries are:

```text
Course
    → What is this course?

Enrollment
    → Is this learner enrolled?

Learning
    → What has this learner done/completed?

Assessment
    → How did this learner perform?

Analytics
    → What patterns are visible?

Personalization
    → What should adapt?

Recommendation
    → What content/action should be recommended?

Learning Plan
    → What should this learner do and in what planned sequence?
```

Therefore:

```text
Explore Courses
→ Course

My Courses
→ Enrollment

Course Progress
→ Learning

Topic Mastery
→ Learning / Personalization

Recommended For You
→ Recommendation / Personalization
```

Course does not absorb these responsibilities.

---

# 31. Course Content vs Learner Learning Plan

This distinction is critical for the AI-based architecture.

The Course defines the available learning structure:

```text
Course
 ├── Topic
 │    ├── Lesson
 │    ├── Resource
 │    ├── Practice
 │    └── Assessment
 └── ...
```

The AI Learning Plan defines a learner-specific recommended path through that structure.

Example:

```text
Course:
40-hour Machine Learning course

Learner:
1–2 hours/day

AI:
Generate an initial learning plan
```

The plan may contain day-wise activities, but the plan does not replace Course structure.

---

# 32. Learning Plan, Evidence, Analytics, and Personalization Relationship

The Course module provides content and structure to downstream systems.

The intended relationship is:

```text
Course
  ↓
Course Structure
  ↓
AI Learning Plan V1
  ↓
Planned Activities
  ↓
Learner
  ↓
Actual Activities
  ↓
Learning Evidence
  ↓
Progress + Assessment Results
  ↓
Analytics
  ↓
Personalization
  ↓
Plan Evaluation
```

The important distinction is:

```text
Learning Plan
    = What should happen

Learning Activity
    = What the learner actually does

Learning Evidence
    = Recorded evidence of that activity

Analytics
    = Aggregated/derived observations

Personalization
    = Determines whether the learner's path should adapt
```

The plan is not the primary tracking system.

---

# 33. Plan Adaptation — Architectural Direction

A learner does not have to wait until the end of a 7-day plan for personalization.

For example:

```text
Day 1
    ↓
Evidence

Day 2
    ↓
Evidence

Day 3
    ↓
Repeated deviation detected
```

The system can detect that the current plan may no longer fit the learner.

However, one missed activity should not automatically create a new AI plan.

Small deviations can be handled through normal plan execution.

A meaningful pattern may produce:

```text
Potential Plan Refinement
```

The learner can then review/approve substantial replanning.

Conceptually:

```text
Plan V1
   ↓
Learner Activity
   ↓
Evidence
   ↓
Analytics
   ↓
Significant change?
   ├── No → Continue Plan V1
   └── Yes
         ↓
     Suggest refinement
         ↓
     Learner approval
         ↓
     Personalization
         ↓
     AI Planner
         ↓
     Plan V2
```

A weekly checkpoint is useful for summary and planning, but it is **not a mandatory waiting period** for adaptation.

---

# 34. Plan Versioning

When a substantial replan occurs:

```text
Plan V1
    ↓
Plan V2
    ↓
Plan V3
```

The previous plan should not simply be overwritten.

The future Learning Plan module should retain plan history so the system can understand:

- What the original plan was
- Why a plan changed
- When it changed
- What evidence preceded the change
- Which plan is currently active

The exact Learning Plan schema and replanning triggers are intentionally deferred to the Personalization/Analytics design.

---

# 35. Important Separation: Ordering, Locking, Completion, Evidence

These concepts must not be merged.

## Ordering

```text
What should be shown first?
```

## Locking

```text
Can the learner access this yet?
```

## Completion

```text
Has the learner satisfied the required completion condition?
```

## Learning Evidence

```text
What did the learner actually do?
```

For example:

```text
Lesson
order = 3
locking = none
completion state = none
interaction evidence = tracked separately
```

while:

```text
Topic
order = 3
locking = derived from Course progression policy
completion = learner-specific
assessment = formal completion gate
```

---

# 36. Ownership Chain for Course Structure

Backend ownership validation follows:

```text
Instructor
    ↓
Course
    ↓
Topic
    ↓
Lesson / Resource / Practice
```

For example, modifying a Lesson requires validation that:

```text
Authenticated User
      ↓
owns Course
      ↓
Topic belongs to Course
      ↓
Lesson belongs to Topic
      ↓
operation allowed
```

The client cannot establish ownership.

---

# 37. Error Contract — Course

Important Course errors include:

| Situation | HTTP | Error Code |
|---|---:|---|
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Instructor does not own Course | 403 | `COURSE_ACCESS_DENIED` |
| Learner requests unavailable Course | 404 | `COURSE_NOT_FOUND` |
| Invalid lifecycle transition | 409 | `INVALID_COURSE_STATUS_TRANSITION` |
| Course not ready for publication | 409 | `COURSE_NOT_READY_FOR_PUBLICATION` |
| Non-instructor attempts instructor operation | 403 | `FORBIDDEN` |
| Invalid input | 400/422 | `VALIDATION_ERROR` |

Exact validation status conventions should remain consistent with the existing backend error-handling architecture.

---

# 38. Final Course API Surface

## Course Core — Instructor

```http
POST   /api/v1/courses
GET    /api/v1/instructor/courses
GET    /api/v1/courses/:courseId
PATCH  /api/v1/courses/:courseId
POST   /api/v1/courses/:courseId/publish
POST   /api/v1/courses/:courseId/archive
```

## Course Discovery — Learner

```http
GET    /api/v1/courses
GET    /api/v1/courses/:courseId
```

Topic, Lesson, Resource, Practice, and Assessment-specific endpoints will be defined when those modules are implemented.

---

# 39. Final Course Structure Diagram

```text
                              COURSE
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
      Metadata              Progression             Duration
      Ownership                Policy               Estimate
      Lifecycle
          │
          ▼
        TOPICS
          │
    ┌─────┼───────────────┐
    │     │               │
    ▼     ▼               ▼
 LESSONS RESOURCES      PRACTICE
    │     │               │
    │     │               └── Questions
    │     │                    via Question Bank
    │     │
    │     └── Topic-level
    │         and Lesson associations
    │
    └── Instructional units
          │
          ▼
    TOPIC ASSESSMENT
          │
          ▼
     Topic Completion
          │
          ▼
    Next Topic Access
          │
          └───────────────┐
                          ▼
                 COURSE FINAL
                   ASSESSMENT
                          │
                          ▼
                  COURSE COMPLETION
```

Learner-specific systems remain outside:

```text
Course Structure
      ↓
Learner
      ↓
Learning Activity
      ↓
Learning Evidence
      ↓
Progress + Assessment Results
      ↓
Analytics
      ↓
Personalization
      ↓
AI Learning Plan
```

---

# 40. Finalized Decisions — Status

The following Course and Course Structure decisions are now locked at the architectural level:

```text
Course Model                         ✅ LOCKED
Course Ownership                     ✅ LOCKED
Course Lifecycle                     ✅ LOCKED
Course Fields                        ✅ LOCKED
Course Duration Direction             ✅ LOCKED
Prerequisites                        ✅ LOCKED
Diagnostic Policy                    ✅ LOCKED
Progression Policy                   ✅ LOCKED

Topic Definition                     ✅ LOCKED
Lesson Definition                    ✅ LOCKED
Lessons Optional                     ✅ LOCKED
Topic ↔ Lesson                       ✅ LOCKED
Topic ↔ Resource                     ✅ LOCKED
Lesson ↔ Resource                    ✅ LOCKED
Topic Practice                       ✅ LOCKED
Topic Assessment                     ✅ LOCKED
Course Final Assessment              ✅ LOCKED
Topic Locking                        ✅ LOCKED
Topic Completion                     ✅ LOCKED
Lesson Completion Decision            ✅ LOCKED
Ordering                             ✅ LOCKED

Course Core APIs                     ✅ LOCKED
Learner Discovery APIs               ✅ LOCKED
Course Representations               ✅ LOCKED
Search/Filter/Pagination             ✅ LOCKED
Module Responsibility Boundaries     ✅ LOCKED
Plan/Evidence/Analytics Boundaries   ✅ ARCHITECTURALLY DEFINED
```

---

# 41. Intentionally Deferred

The following are not being silently invented by this document:

### Topic/Lesson implementation details

- Exact validation limits
- Exact Topic API surface
- Exact Lesson API surface
- Exact reorder endpoint payload
- Exact deletion implementation

### Resources

- Exact Resource schema
- Storage provider
- Supported resource types
- Upload flow
- Published Resource replacement/deletion rules
- Exact association implementation

### Practice / Question Bank / Assessment

- Exact Practice schema
- Question Bank schema
- Question selection algorithm
- Assessment schema
- Exact scoring implementation
- Exact assessment API surface

### Learning

- Exact Learning Evidence schema
- Exact event taxonomy
- Progress storage model
- Exact Topic progress implementation
- Mastery calculation

### Analytics / Personalization

- Exact analytics metrics
- Weakness detection algorithm
- Replanning thresholds/triggers
- Personalization state
- Recommendation logic
- Intervention model

### AI Learning Plan

- Exact LearningPlan schema
- Prompt/input contract
- AI output schema
- Validation of AI-generated plans
- Plan execution model
- Plan version model
- Exact replanning workflow

These should be designed in their respective module phases without contradicting the boundaries established here.

---

# 42. Architectural Principles to Preserve

The following principles should be preserved when implementing later modules:

1. **Course defines content; Learning tracks learner behavior.**
2. **Plan defines intended activities; Evidence records actual activities.**
3. **Analytics observes patterns; Personalization decides adaptation.**
4. **AI generates intelligent plans; deterministic backend rules enforce system constraints.**
5. **Ordering does not automatically mean locking.**
6. **Locking does not mean completion.**
7. **Completion does not mean mastery.**
8. **Learning interaction is not proof of understanding.**
9. **Assessment evaluates performance; Personalization interprets performance for adaptation.**
10. **Learner-specific state must not be stored as global Course/Topic state.**
11. **Stable IDs, not mutable order numbers, identify learning entities in progress/evidence.**
12. **Published-course structure must remain sufficiently stable to protect existing learner progress.**
13. **AI must not directly mutate another module's internal state.**
14. **Small plan deviations do not automatically require AI replanning.**
15. **Substantial replanning creates a new plan version rather than silently overwriting the previous plan.**

---

# 43. Document Status

This document represents the current **Course Module + Course Structure architectural source of truth** after completion of the Course Core and Steps 8A–8O planning.

It should be consulted before implementing:

- Topic
- Lesson
- Resource
- Practice
- Question Bank
- Assessment
- Learning
- Analytics
- Personalization
- Recommendation
- AI Learning Plan

Any future architectural change that contradicts a locked decision should be explicitly identified and resolved rather than silently changing the behavior.
