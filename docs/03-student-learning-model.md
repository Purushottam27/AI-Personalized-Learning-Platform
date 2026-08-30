# AI Based Personalized Learning Platform --- Student Learning Model

## 1. Purpose

The Student Learning Model defines how the platform represents,
observes, evaluates, and improves a student's learning journey.

The platform is not intended to function only as a traditional LMS. Its
primary objective is to help students:

- gain conceptual and practical knowledge
- identify strengths
- identify weaknesses
- receive targeted learning material
- practice weak concepts
- reassess understanding
- measure improvement
- receive personalized recommendations
- become more capable and confident learners

### Core Learning Principle

**Learn → Measure → Understand → Improve → Adapt → Repeat**

## 2. High-Level Model

```text
Student
   ↓
Learning Profile
   ↓
Course
   ↓
Topic
   ↓
Lesson
   ├── Explanation
   ├── Examples
   ├── Videos
   ├── Documents
   ├── External Resources
   ├── Practice
   └── Assessment
            ↓
       Assessment Attempt
            ↓
       Question Responses
            ↓
       Performance Evidence
            ↓
       Topic Mastery
            ↓
       Strength / Weakness
            ↓
       Recommendation
            ↓
       Intervention
            ↓
       Improvement
            ↓
       Updated Learning Profile
```

## 3. Student

The Student is the learner using the platform.

Student information has two conceptual categories.

### Account Information

Examples:

- name
- email
- authentication information
- role
- account status
- profile information
- preferences

### Learning Information

Examples:

- interests
- learning goals
- experience level
- enrolled courses
- completed lessons
- assessment history
- topic performance
- strengths
- weaknesses
- mastery
- recommendations
- learning activity
- improvement history

Account information answers:

> Who is the user?

Learning information answers:

> How is this user learning?

## 4. Learning Profile

The Learning Profile represents the platform's current understanding of
the student as a learner.

### Initial Profile

Initially the system may know:

- interests
- goals
- overall self-reported experience level
- daily study capacity
- preferred learning format
- selected subjects/interests

Clarify:

daily study capacity is used as an initial personalization constraint.

It can influence the amount/granularity of learning activity that the
system recommends.

Do NOT imply that the system generates the student's entire future
learning plan at onboarding.

Also preserve the existing distinction:

Declared learner context
        ≠
Verified mastery

The system should later update its understanding using actual learning
evidence.

This is initial learner context and should not automatically be treated
as verified mastery.

### Evolving Profile

As the student learns, the profile can contain:

```text
Learning Profile
├── Interests
├── Goals
├── Experience Level
├── Course Progress
├── Topic Mastery
├── Strengths
├── Weaknesses
├── Assessment History
├── Learning Activity
├── Improvement History
└── Recommendations
```

The profile evolves based on learning evidence.

## 5. Course

A Course is a structured learning program created by a Teacher.

A course contains:

- course information
- learning objectives
- prerequisites
- topics
- lessons
- resources
- practice
- assessments
- final assessment

Students can:

- explore a course
- view its description
- view objectives
- view prerequisites
- enroll
- learn
- complete assessments
- receive course-level mastery analysis

## 6. Course Prerequisites

Courses may require prior knowledge.

Example:

```text
Advanced SQL
    ↓
Prerequisite: Basic SQL
```

Teachers should be able to configure:

- no prerequisite
- one prerequisite
- multiple prerequisites
- optional diagnostic assessment
- required diagnostic assessment

The purpose of prerequisites is to help students become ready, not
merely to block them.

## 7. Diagnostic Assessment

A Diagnostic Assessment determines whether a student has sufficient
prerequisite knowledge.

It is course-specific and teacher-configured.

Example:

```text
Advanced SQL
    ↓
Diagnostic Assessment
    ↓
Poor performance
    ↓
Identify prerequisite weakness
    ↓
Recommend Basic SQL or targeted refresher
    ↓
Mini assessment
    ↓
Retry diagnostic
```

If the student already completed the prerequisite course, targeted
revision should be preferred over automatically repeating the entire
course.

## 8. Enrollment

Enrollment represents the relationship between a Student and a Course.

Initial flow:

```text
Course Overview
    ↓
Enroll
    ↓
Course added to My Courses
```

Teacher approval is not part of the initial MVP.

## 9. Topic

A Topic is a conceptual area inside a course.

Example:

```text
DBMS
├── ER Model
├── Relational Model
├── SQL
├── Normalization
├── Transactions
└── Indexing
```

Topic-level performance is important because a student may have
different mastery levels across topics within the same course.

## 10. Lesson

A Lesson is a specific learning unit inside a Topic.

A lesson should provide a complete learning experience.

Possible components:

- conceptual explanation
- examples
- visual material
- video resources
- documents/notes
- external references
- practice
- assessment

Teachers should be able to provide meaningful educational content
without being required to record their own videos.

## 11. Lesson Resources

Possible resource types include:

### Video

Relevant YouTube videos may be embedded where permitted.

### Documents

Teacher-provided resources may include:

- PDF
- PPT/PPTX
- DOC/DOCX
- other supported formats

### External References

Examples:

- educational articles
- official documentation
- book/reference information
- external learning websites

The resource model should remain provider-independent so additional
sources can be added later.

## 12. Practice

Practice is a learning-oriented activity.

Its purpose is to help the student understand and strengthen a concept.

Practice should generally be repeatable and may provide explanations or
feedback.

Practice performance may be used as supporting evidence by
personalization but should be distinguished from formal assessment
performance.

## 13. Assessment

Assessment measures student understanding.

Assessment configuration may include:

- question count
- question bank
- passing threshold
- time limit
- marks/weightage
- maximum attempts
- question selection strategy
- difficulty distribution

## 14. Final Assessment

The Final Assessment evaluates understanding across the course.

It contributes to course-level mastery analysis.

A single final assessment score should not be treated as the only
evidence of mastery.

## 15. Question

A Question may contain:

- question text
- options
- correct answer
- explanation
- marks
- topic
- lesson
- difficulty
- question type

Initial question types may include:

- multiple choice
- true/false

Additional types can be introduced later.

## 16. Question Bank

A Question Bank contains a larger collection of questions from which
assessments select questions.

Example:

```text
Question Bank = 30 questions
Assessment = 10 questions per attempt
```

This reduces repeated exposure to the same fixed assessment.

## 17. Question Creation

Initial teacher question creation methods:

### Manual

Individual question creation.

### CSV/Excel

Structured bulk import.

### AI-assisted generation

AI may generate draft questions later, but teachers must review and
approve them before publication.

### PDF import

Deferred until reliable parsing requirements are established.

## 18. Assessment Attempt

Every assessment attempt should be represented separately.

It may record:

- attempt number
- start time
- submission time
- score
- total marks
- time used
- question responses
- correct answers
- incorrect answers
- unanswered questions

Historical attempts should remain distinguishable.

## 19. Question Response

Each question response should have a status:

```text
CORRECT
INCORRECT
UNANSWERED
```

Unanswered questions receive zero points.

However, unanswered and incorrect responses should remain analytically
distinct.

## 20. Timed Assessment

Assessments may optionally have a time limit.

When time expires:

```text
Assessment
    ↓
Automatic submission
    ↓
Unanswered questions = 0 points
```

Time-related analytics can be introduced later.

## 21. Scoring

Initial scoring should be deterministic:

```text
Score =
earned marks / total possible marks × 100
```

Unanswered questions contribute zero marks.

The score should not be calculated only from answered questions.

## 22. Passing Threshold

Passing thresholds should be configurable.

The platform should not hard-code a universal value such as 85%.

Example:

```text
Lesson Assessment → 80%
Diagnostic → 70%
Final Assessment → 75%
```

Exact defaults can be determined during implementation.

## 23. Progression

Assessment results may control lesson progression according to course
configuration.

Example:

```text
Assessment passed
    ↓
Next lesson unlocked
```

or:

```text
Assessment failed
    ↓
Remediation recommended
    ↓
Reassessment
```

The exact progression policy will be finalized during course
architecture design.

## 24. Remediation

Remediation is targeted learning intended to address a detected
weakness.

Example:

```text
Assessment
    ↓
Normalization performance = 45%
    ↓
Weakness identified
    ↓
Targeted resources
    ├── Explanation
    ├── Example
    ├── Video
    ├── Practice
    └── Mini assessment
    ↓
Reassessment
```

The student should not automatically be required to repeat the entire
course.

## 25. Mastery

Mastery represents the platform's current estimate of understanding of a
topic.

For v1, mastery should be primarily based on deterministic evidence.

Potential evidence includes:

- assessment performance
- question-level performance
- practice performance
- previous performance
- recent performance
- completed learning activities

The exact formula will be designed separately.

## 26. Initial Mastery Categories

A provisional v1 classification:

```text
0–39       Weak
40–59      Developing
60–74      Functional
75–89      Strong
90–100     Mastered
```

These values are intentionally simple and may be improved after the
first complete application is stable.

## 27. Strength

A Strength is a topic where accumulated evidence indicates strong
understanding.

Strengths should be based on accumulated evidence rather than one
unusually high score.

## 28. Weakness

A Weakness is a topic where accumulated evidence indicates insufficient
understanding or difficulty.

Weakness detection should become more reliable as historical evidence
grows.

## 29. Recommendation

Recommendations are actionable next learning suggestions.

Possible recommendation types:

- continue current lesson
- start next lesson
- revise weak topic
- complete targeted practice
- take a mini assessment
- revisit prerequisite knowledge
- enroll in a recommended course
- explore related learning material

## 30. Recommendation Engine

The recommendation engine combines deterministic rules and AI reasoning.

```text
Learning Evidence
    ↓
Performance Analysis
    ↓
Learning Profile
    ↓
Recommendation Engine
    ├── Rules
    └── AI
    ↓
Recommended Action
```

## 31. Rules vs AI

### Deterministic Rules

Used for:

- assessment scoring
- passing thresholds
- progression
- prerequisite requirements
- basic mastery thresholds
- access control

### AI

Used for:

- personalized feedback
- explanation of performance patterns
- recommendation reasoning
- targeted learning recommendations
- personalized remediation suggestions

AI should interpret structured evidence rather than inventing the
student's learning state.

## 32. Improvement Tracking

The system should compare performance before and after an intervention.

Example:

```text
Normalization

Before:
48%

Intervention:
2NF explanation
+ video
+ practice
+ mini assessment

After:
74%

Improvement:
+26 percentage points
```

This allows the platform to determine whether an intervention was
useful.

## 33. Core Personalization Loop

```text
Student learns
    ↓
Student practices
    ↓
Student is assessed
    ↓
System collects evidence
    ↓
Topic mastery updated
    ↓
Strengths / weaknesses updated
    ↓
Recommendation generated
    ↓
Student completes intervention
    ↓
Student is reassessed
    ↓
Improvement measured
    ↓
Learning profile updated
    ↓
Next recommendation
    ↓
Repeat
```

## 34. Example: DBMS

A student studies Normalization.

```text
Lesson
    ↓
Explanation
    ↓
Video
    ↓
Teacher PDF
    ↓
Practice
    ↓
Assessment
```

Result:

```text
Correct = 5
Incorrect = 3
Unanswered = 2
Score = 50%
```

Topic analysis:

```text
ER Model → Strong
Functional Dependency → Developing
2NF → Weak
3NF → Weak
```

The platform recommends:

```text
1. Review 2NF explanation
2. Watch recommended video
3. Study example
4. Complete practice
5. Take mini assessment
```

After remediation:

```text
2NF → 78%
3NF → 74%
```

The learning profile is updated and future recommendations change.

## 35. Design Principles

1.  Evidence before inference.
2.  Topic-level personalization.
3.  Deterministic rules for deterministic decisions.
4.  AI for reasoning and personalization.
5.  Practice and assessment remain distinct.
6.  Failed assessment should lead to a path for improvement.
7.  Improvement must be measurable.
8.  The learner profile evolves.
9.  Teacher content remains important.
10. Start simple and improve iteratively.

## 36. Deferred Personalization Complexity

Not part of v1:

- sophisticated ML recommendation models
- reinforcement learning
- advanced knowledge graphs
- complex psychometric modeling
- AI-generated complete courses
- AI-generated assessments without teacher approval
- advanced spaced repetition
- predictive dropout modeling
- voice tutor
- real-time adaptive lesson generation

These can be considered after the core platform works reliably.
