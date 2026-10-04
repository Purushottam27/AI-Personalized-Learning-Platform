# AI Based Personalized Learning Platform --- Learning & Assessment Module Decisions

## 1. Purpose

This document is the implementation source of truth for the learning and
assessment modules that have been discussed and explicitly locked before
implementation.

It consolidates the finalized decisions for:

``` text
Question Bank
      ↓
Question
      ↓
Practice / Assessment
      ↓
Attempt
      ↓
Learning Evidence
      ↓
Learner Topic Progress
```

The purpose is to prevent architectural drift between discussion,
implementation, validation, services, controllers, routes, frontend
behavior, and later personalization work.

### Implementation rule

Before implementing any one of these modules:

-   Audit this document first.
-   Do not silently introduce behavior that contradicts a locked
    decision.
-   If implementation reveals a genuine architectural conflict, stop and
    discuss it before changing the decision.
-   Later decisions may extend this document, but should not silently
    invalidate existing decisions.

> **Important:** This document records the latest decisions made during
> the project discussion. Older conceptual documents may contain earlier
> examples or proposals that are no longer authoritative where they
> conflict with this document.

------------------------------------------------------------------------

# 2. Core Architecture

The finalized learning flow is:

``` text
Question Bank
      ↓
Questions
      ↓
Practice / Assessment
      ↓
Attempt
      ↓
Learning Evidence
      ↓
Learner Topic Progress
```

The separation is intentional.

-   **Question Bank** owns reusable questions.
-   **Question** is an individual reusable learning/assessment item.
-   **Practice** is learning-oriented and optional.
-   **Assessment** is evaluative and can control topic progression.
-   **Attempt** records an actual learner interaction with Practice or
    Assessment.
-   **Learning Evidence** preserves meaningful historical learning
    signals.
-   **Learner Topic Progress** represents the learner's current derived
    state for a topic.

Historical evidence and current derived state must not be confused.

``` text
Historical:
Attempt / Learning Evidence
        ↓
What actually happened

Current:
LearnerTopicProgress
        ↓
Current derived understanding/state
```

------------------------------------------------------------------------

# 3. Question Bank

## 3.1 Ownership

A Question Bank belongs to the instructor/course/topic context rather
than to an individual Practice or Assessment.

It is the reusable source from which instructors select questions.

``` text
Course
  ↓
Topic
  ↓
Question Bank
  ├── Question
  ├── Question
  ├── Question
  └── ...
```

## 3.2 Entity decision

The Question Bank is a real database entity, not merely an implicit
logical collection of Question documents.

This gives us a stable place to manage questions, imports, usage, and
future extensions.

## 3.3 Relationship with Practice and Assessment

Practice and Assessment do not own the questions.

``` text
Question Bank
      ↓
Questions
      ↑
Practice / Assessment selects questions
```

The same bank can support Practice, Assessment 1, Assessment 2, and
future reassessment.

## 3.4 Minimum question count

The previously proposed universal **30-question minimum is rejected**.

There is no mandatory minimum bank size such as 30.

The required size depends on how the instructor configures Practice and
Assessment. The system must ensure that a configured activity never
requests more unique eligible questions than are available.

## 3.5 Question management

The instructor can:

-   add questions,
-   edit questions where allowed,
-   archive/remove questions where allowed.

The Add Question and Edit Question controls are available throughout
Question Bank management, not only when all existing questions have
already been used.

## 3.6 Questions already in use

The instructor interface should clearly indicate question usage.

Example:

``` text
Included in: Practice
Included in: Assessment 1
Included in: Practice + Assessment 1
```

A question can intentionally be used in both Practice and Assessment.

However, questions already used in an Assessment must be protected from
destructive modification that would invalidate the assessment or its
historical attempts.

------------------------------------------------------------------------

# 4. Question

## 4.1 Topic relationship

Every Question is associated with a Topic.

This supports:

-   topic-level performance,
-   Learning Evidence,
-   topic mastery,
-   remediation,
-   topic assessments,
-   personalization.

## 4.2 Lesson relationship

A Question may optionally reference a specific Lesson.

``` text
Question
 ├── topicId      required
 └── lessonId     optional
```

A question therefore remains independent of any single Lesson.

## 4.3 Question types

MVP types:

``` text
MCQ_SINGLE
MCQ_MULTIPLE
TRUE_FALSE
```

## 4.4 Option structure

Options have stable identifiers/keys and display text.

Conceptually:

``` js
options: [
  { key: "A", text: "..." },
  { key: "B", text: "..." }
]
```

Correct answers reference stable option keys rather than display text or
position.

This is required because option order can be randomized for different
learners.

For example, one learner may see TCP as option A while another sees it
as option B. The underlying option key remains the identity used for
correctness.

## 4.5 Correct answer

Single choice:

``` text
correctAnswer = ["A"]
```

Multiple choice:

``` text
correctAnswer = ["A", "C"]
```

The exact schema representation can follow the final Mongoose
implementation, but the stable-key principle is mandatory.

## 4.6 Difficulty

Difficulty is controlled rather than arbitrary text.

It can later support:

-   assessment difficulty distribution,
-   mastery calculation,
-   analytics,
-   personalization.

The exact mastery weighting belongs to the learning/personalization
layer.

## 4.7 Marks

Questions support marks.

Official numerical scores are deterministic and are never decided by AI.

## 4.8 Explanation

Questions support an explanation for feedback, remediation, and future
learning assistance.

## 4.9 Lifecycle and deletion

Questions should favor lifecycle protection such as:

``` text
ACTIVE
ARCHIVED
```

over destructive deletion when historical usage exists.

A Question currently included in an Assessment should not be freely
deleted or materially edited.

If a materially different question is needed, create a new Question.

------------------------------------------------------------------------

# 5. Question Creation

## 5.1 Manual creation

Manual creation is a first-class creation path:

``` text
Manual Creation
       ↓
Question
```

## 5.2 CSV/Excel import

CSV/Excel is an MVP creation path.

Pipeline:

``` text
Upload
  ↓
Parse
  ↓
Validate
  ↓
Preview
  ↓
Instructor Approval
  ↓
Question Bank
```

Imported questions must produce the same Question entity as manual
questions.

## 5.3 Import validation

Validation must cover the same business constraints as manual creation,
including:

-   required fields,
-   question type,
-   option structure,
-   correct-answer references,
-   difficulty,
-   marks where required,
-   topic/question-bank context,
-   duplicate handling.

Invalid rows must be visible before final import.

## 5.4 Import preview

The instructor must be able to review parsed questions and validation
errors before the questions become official Question Bank content.

## 5.5 Duplicate questions

Import must not silently overwrite obvious existing questions.

The exact duplicate-detection strategy can be finalized during
implementation, but duplicate handling must be explicit.

## 5.6 Future AI generation

Future AI-generated questions follow:

``` text
AI Generation
      ↓
Draft Question
      ↓
Instructor Review
      ↓
Official Question
```

AI-generated questions ultimately become the same Question entity as
manual/imported questions.

AI output is not automatically trusted as official assessment content.

------------------------------------------------------------------------

# 6. Practice

## 6.1 Purpose

Practice is learning-oriented.

``` text
Practice
   ↓
Attempt
   ↓
Feedback
   ↓
Repeat if desired
```

## 6.2 Optional

Practice is optional. A Topic does not require Practice.

## 6.3 Practice vs Assessment

Practice is primarily for learning, feedback, repetition, and optional
evidence.

Assessment is for formal evaluation, pass/fail, and potentially topic
progression.

They are separate activities even when they use the same Question Bank.

## 6.4 Practice question count

Practice has no fixed 5--10 question limit.

However, it cannot request more unique questions than are available in
the relevant Question Bank/configuration.

## 6.5 Practice evidence setting

The instructor controls whether Practice contributes to Learning
Evidence:

``` text
Contribute to Learning Evidence
    ON  → practice can influence learning state
    OFF → practice remains self-practice only
```

------------------------------------------------------------------------

# 7. Multiple Assessments per Topic

A Topic may contain more than one Assessment.

Example:

``` text
Topic
 ├── Practice
 ├── Assessment 1
 └── Assessment 2
```

The instructor decides whether additional assessments are needed.

When selecting questions for Assessment 2, all questions in the bank
remain available subject to the configured eligibility rules, while the
UI shows where each question is already used.

If the instructor has already used all suitable questions and needs
more, the Question Bank should provide an Add Question path rather than
silently reusing or inventing questions.

------------------------------------------------------------------------

# 8. Assessment

## 8.1 Purpose

Assessment is the formal evaluation mechanism.

It can determine whether the learner has demonstrated sufficient
knowledge of a defined scope.

## 8.2 Assessment types

The learning architecture supports:

``` text
TOPIC
DIAGNOSTIC
FINAL
```

Practice is separate and is not a formal Assessment type.

## 8.3 Topic Assessment

A Topic Assessment evaluates knowledge of that Topic.

If the course configuration uses sequential unlocking, passing the Topic
Assessment can be the condition for accessing the next Topic.

## 8.4 Diagnostic Assessment

Diagnostic Assessment measures prior knowledge and can provide an
initial personalization signal.

The detailed diagnostic-to-personalization algorithm is deferred.

## 8.5 Final Assessment

Final Assessment is course-level.

Its complete relationship with Course Progress will be finalized later,
but the Assessment architecture must support course-level scope.

------------------------------------------------------------------------

# 9. Assessment Configuration

## 9.1 Question selection

The instructor selects questions from the Question Bank.

The system does not silently invent an assessment question set.

## 9.2 Question count

For MVP:

``` text
Minimum = 5
Maximum = 10
```

The configured Assessment question count must not exceed the number of
eligible questions available.

## 9.3 Passing threshold

The instructor configures the passing threshold.

Example:

``` text
60%
```

Passing is separate from mastery.

## 9.4 Difficulty

Questions have controlled difficulty values, allowing future or
configured difficulty distributions.

Difficulty must respect available questions.

## 9.5 Randomization

The system supports randomization of:

-   question order/selection where configured,
-   option order.

Correctness always uses stable option identity.

Retries should not simply reuse the same fixed question set when enough
eligible questions are available.

## 9.6 Maximum attempts

Maximum attempts are instructor-controlled.

A typical college configuration may be:

``` text
1 attempt
```

but the instructor may increase the number.

Maximum attempts are editable in Assessment configuration.

## 9.7 Cooldown

MVP uses immediate retakes.

No mandatory cooldown such as:

``` text
2 hours
24 hours
```

is required.

If attempts remain, the learner may start another attempt after the
previous attempt is completed.

## 9.8 Time limit

The time limit is optional.

## 9.9 Open/close window

The instructor may optionally configure:

``` text
opensAt
closesAt
```

If configured, the learner may start the assessment only within the
allowed period.

## 9.10 Hard closing deadline

The closing time is a hard deadline.

Example:

``` text
Assessment timer = 30 minutes
closesAt = 5:00 PM
Learner starts = 4:45 PM
```

The learner gets only 15 minutes.

Conceptually:

``` text
effectiveEndTime =
    min(startTime + timeLimit, closesAt)
```

This must be enforced server-side.

------------------------------------------------------------------------

# 10. Assessment Lifecycle

The Assessment configuration itself should have a lifecycle such as:

``` text
DRAFT
PUBLISHED / ACTIVE
ARCHIVED
```

The exact enum names should follow the existing project conventions.

An Assessment should not be destructively deleted when historical
learner records depend on it.

------------------------------------------------------------------------

# 11. Attempt

An Attempt is one actual learner session with a Practice or Assessment.

``` text
Practice / Assessment
        ↓
      Attempt
```

## 11.1 Attempt lifecycle

The attempt must distinguish active and completed states.

At minimum, the semantics are:

``` text
IN_PROGRESS
COMPLETED
AUTO_SUBMITTED
```

Exact enum naming may follow the project convention.

## 11.2 Leaving an Assessment

If the learner attempts to leave an Assessment page:

``` text
Learner tries to leave
        ↓
Warning
        ↓
Cancel → continue attempt

Confirm leave
        ↓
Attempt is completed/submitted
```

This prevents leaving the assessment, looking up answers, and returning
later to continue the same attempt.

## 11.3 Resume behavior

A deliberately abandoned Assessment should not remain resumable after
the learner confirms leaving.

The server is authoritative for attempt validity.

## 11.4 Timeout

When the effective assessment time expires:

``` text
Timer expires
      ↓
Automatic submission
      ↓
Scoring
```

The earlier of the assessment timer and closing deadline determines the
effective end.

------------------------------------------------------------------------

# 12. Question Response

Each Attempt contains the learner's responses.

Conceptually:

``` text
Attempt
 ├── Response 1
 ├── Response 2
 ├── Response 3
 └── ...
```

A response must preserve enough information for scoring and historical
interpretation.

Relevant information includes:

-   question identity,
-   selected answer,
-   response state,
-   correctness,
-   marks obtained,
-   timing information where supported.

## 12.1 Response states

``` text
CORRECT
INCORRECT
UNANSWERED
```

Unanswered is analytically distinct from incorrect.

Unanswered receives zero marks in standard objective scoring.

------------------------------------------------------------------------

# 13. Attempt Snapshot

The Attempt should preserve the relevant question state presented to the
learner.

This protects historical interpretation.

If an instructor later changes or archives a Question, the old Attempt
must still represent what the learner actually saw and answered.

The snapshot should be sufficient for historical interpretation without
unnecessarily duplicating unrelated Question data.

------------------------------------------------------------------------

# 14. Scoring

Scoring is deterministic:

``` text
Question Responses
       ↓
Marks Calculation
       ↓
Score
       ↓
Percentage
       ↓
Pass / Fail
```

AI does not determine the official score.

For objective questions, the score must be reproducible from the stored
response and question/snapshot information.

------------------------------------------------------------------------

# 15. Pass / Fail

``` text
percentage >= passingThreshold
        ↓
PASSED

percentage < passingThreshold
        ↓
FAILED
```

Passing does not mean that the learner has the same percentage as their
mastery.

------------------------------------------------------------------------

# 16. Historical Attempts

Attempts are immutable historical records once completed.

Example:

``` text
Attempt 1 → 45%
Attempt 2 → 61%
Attempt 3 → 78%
```

Later attempts must not overwrite previous attempts.

This history supports:

-   improvement tracking,
-   Learning Evidence,
-   analytics,
-   personalization.

------------------------------------------------------------------------

# 17. Learning Evidence

Learning Evidence is historical information about meaningful learning
activity.

It is not mastery.

``` text
Learning Evidence
        ≠
Mastery
```

A single wrong answer does not prove lack of knowledge.

A single correct answer does not prove mastery.

The learning system must aggregate evidence.

## 17.1 Historical principle

Evidence should generally be append-oriented and preserved.

It represents what actually happened.

Current derived state belongs in LearnerTopicProgress.

## 17.2 Evidence sources

Potential evidence includes:

``` text
Practice activity
Assessment results
Question responses
Lesson completion
Diagnostic results
Other approved learning events
```

The current implementation focus is Practice/Assessment-driven evidence.

------------------------------------------------------------------------

# 18. Learner Topic Progress

LearnerTopicProgress represents the current state of one learner for one
Topic.

``` text
Learner
   +
Topic
   ↓
LearnerTopicProgress
```

There should be one current record per:

``` text
learnerId + topicId
```

## 18.1 Status

``` text
LOCKED
NOT_STARTED
IN_PROGRESS
COMPLETED
```

### LOCKED

The learner cannot access the Topic under the current unlocking policy.

### NOT_STARTED

The Topic is accessible but not meaningfully started.

### IN_PROGRESS

The learner has started the Topic.

### COMPLETED

The configured completion requirements are satisfied.

------------------------------------------------------------------------

# 19. Progress vs Mastery

These must remain separate.

### Progress

How much required learning activity has been completed.

### Mastery

How strong the learner's demonstrated understanding appears based on
accumulated evidence.

Valid example:

``` text
Progress = 100%
Mastery = 55%
```

Completion does not automatically mean mastery.

------------------------------------------------------------------------

# 20. LearnerTopicProgress conceptual model

``` text
LearnerTopicProgress
├── learnerId
├── topicId
├── status
├── progressPercentage
├── masteryPercentage
├── completedAt
├── lastActivityAt
├── createdAt
└── updatedAt
```

Final field types and implementation details follow project conventions.

Counts such as `lessonsCompleted` should not be duplicated unless later
performance requirements justify denormalization.

------------------------------------------------------------------------

# 21. Mastery Calculation

The exact mastery algorithm is intentionally deferred to the
learning/personalization layer.

LearnerTopicProgress stores the current derived mastery value.

The future engine may consider:

``` text
Performance
Consistency
Recency
Difficulty
Coverage
Assessment Evidence
```

It must not simply use:

``` text
lastQuizPercentage
```

Mastery is an estimate of learning state, not a claim of absolute
knowledge.

------------------------------------------------------------------------

# 22. Topic Completion

Topic completion is distinct from mastery.

If an instructor requires an Assessment:

``` text
Assessment passed
      ↓
Topic completion requirement satisfied
```

If an Assessment is not required, completion may depend on other
configured learning activities.

The full completion policy will be finalized with learner activity
tracking.

------------------------------------------------------------------------

# 23. Topic Unlocking

Topic unlocking is a course/topic policy.

Possible flow:

``` text
Topic 1
   ↓
Assessment passed
   ↓
Topic 2 unlocked
```

Sequential unlocking is not assumed for every course.

The detailed prerequisite/unlocking model is intentionally deferred.

------------------------------------------------------------------------

# 24. Remediation and Reassessment

A failed assessment can later feed:

``` text
Weakness analysis
      ↓
Targeted lesson/resource/practice
      ↓
Reassessment
```

This is a future learning/personalization layer.

Current modules must preserve the evidence needed for that layer.

Historical reassessment attempts remain separate.

Example:

``` text
Assessment 1 → 40%
Assessment 2 → 55%
Assessment 3 → 78%
```

------------------------------------------------------------------------

# 25. Implementation Boundaries

## Question Bank owns

-   Question Bank identity
-   Question membership/management
-   Import workflow context

## Question owns

-   Question content
-   Options
-   Correct-answer representation
-   Difficulty
-   Marks
-   Explanation
-   Topic relationship
-   Optional Lesson relationship
-   Question lifecycle

## Practice/Assessment owns

-   Activity configuration
-   Selected questions
-   Activity-specific rules

## Attempt owns

-   One learner session
-   Response records
-   Submission/result state
-   Historical attempt information
-   Snapshot information

## Learning Evidence owns

-   Historical learning signals

## LearnerTopicProgress owns

-   Current derived topic state
-   Progress
-   Mastery
-   Topic status

No module should silently take ownership of another module's internal
state.

------------------------------------------------------------------------

# 26. Decisions Explicitly Rejected

The following must not be reintroduced without a new architecture
discussion:

-   Universal 30-question Question Bank minimum.
-   Separate Question Banks for Practice and every Assessment.
-   Mandatory Practice.
-   Prohibiting a question from being used in both Practice and
    Assessment.
-   Mandatory Assessment cooldowns.
-   Mandatory Assessment timers.
-   Mandatory Assessment availability windows.
-   Indefinitely resumable abandoned assessments.
-   Destructive deletion/editing of questions already used in
    assessments.
-   AI deciding official assessment scores.
-   Treating a single answer as definitive mastery.

------------------------------------------------------------------------

# 27. Deferred Decisions

These are intentionally outside the current implementation contract:

-   Learner Course Progress
-   Enrollment implementation
-   Detailed Lesson/Resource completion tracking
-   Full Topic prerequisite/unlocking model
-   Complete Final Assessment/Course Completion design
-   Exact mastery formula
-   Personalization engine
-   Recommendation model
-   Remediation engine
-   Course-level analytics
-   Learner dashboard
-   Instructor analytics
-   Notifications
-   Advanced AI features

They may consume the data produced by the current modules.

------------------------------------------------------------------------

# 28. Required Implementation Order

The seven implementation areas are:

``` text
Phase 1 — Question Bank
        ↓
Phase 2 — Question
        ↓
Phase 3 — Practice
        ↓
Phase 4 — Assessment
        ↓
Phase 5 — Attempt
        ↓
Phase 6 — Learning Evidence
        ↓
Phase 7 — Learner Topic Progress
```

Practice and Assessment can share infrastructure where appropriate, but
their business semantics must remain separate.

------------------------------------------------------------------------

# 29. Module Implementation Workflow

Every module follows:

``` text
1. Audit this source-of-truth document
        ↓
2. Inspect existing project architecture
        ↓
3. Finalize implementation contract
        ↓
4. Model
        ↓
5. Validation
        ↓
6. Services
        ↓
7. Controllers
        ↓
8. Routes
        ↓
9. Integration
        ↓
10. Testing
        ↓
11. Review
        ↓
12. Git commit
```

Claude or another implementation assistant must not assume access to the
GitHub repository unless the repository contents have actually been
provided to it.

Existing project conventions must be inspected or explicitly supplied
before generating implementation code.

------------------------------------------------------------------------

# 30. Pre-Implementation Audit Checklist

Before Phase 1 begins, verify:

-   [ ] Question Bank is a separate entity.
-   [ ] No universal 30-question minimum exists.
-   [ ] Questions belong to a Question Bank.
-   [ ] Questions are Topic-associated.
-   [ ] Lesson association is optional.
-   [ ] Supported types are MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE.
-   [ ] Options use stable keys.
-   [ ] Correct answers reference stable keys.
-   [ ] Difficulty is controlled.
-   [ ] Marks are supported.
-   [ ] Explanation is supported.
-   [ ] Question lifecycle protects historical usage.
-   [ ] Manual creation is supported.
-   [ ] CSV/Excel import is supported/planned.
-   [ ] Import has validation and preview.
-   [ ] Future AI generation produces the same Question entity.
-   [ ] Practice is optional.
-   [ ] Practice can share a Question Bank with Assessments.
-   [ ] A question may intentionally be used in both Practice and
    Assessment.
-   [ ] Assessment question count is 5--10.
-   [ ] Practice has no fixed 5--10 limit.
-   [ ] Maximum attempts are instructor-configurable.
-   [ ] Immediate retakes are supported.
-   [ ] Time limit is optional.
-   [ ] Open/close window is optional.
-   [ ] Closing time is a hard deadline.
-   [ ] Leaving an Assessment requires a warning.
-   [ ] Confirmed leaving completes/submits the attempt.
-   [ ] Attempts are historical.
-   [ ] Question snapshots preserve historical interpretation.
-   [ ] Used Assessment questions cannot be destructively changed.
-   [ ] Learning Evidence is historical.
-   [ ] Practice evidence contribution is instructor-controlled.
-   [ ] LearnerTopicProgress is current derived state.
-   [ ] Progress and mastery remain separate.

------------------------------------------------------------------------

# 31. Final Architectural Principle

The platform must preserve this distinction:

``` text
WHAT WAS CREATED
        ↓
Question Bank / Question / Activity
        ↓
WHAT THE LEARNER DID
        ↓
Attempt / Response
        ↓
WHAT THAT ACTIVITY TELLS US
        ↓
Learning Evidence
        ↓
WHAT WE CURRENTLY BELIEVE ABOUT THE LEARNER
        ↓
LearnerTopicProgress
```

This separation is the foundation for the later personalized-learning
engine.
