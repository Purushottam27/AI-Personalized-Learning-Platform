**# AI Based Personalized Learning Platform — Database Design**

**## 1. Purpose**

This document defines the conceptual database design for the AI Based Personalized Learning Platform.

It translates the approved Product Requirements, MVP Scope, Learner Learning Model, User Journeys, and System Architecture into a durable data model.

The document focuses on what data exists, why it exists, how it relates, how learning history is preserved, and how the data supports personalization.

It intentionally does not define final Mongoose schema implementation code.
The conceptual fields and relationships finalized by the project are defined
here; exact Mongoose syntax, validators, and implementation-level details
belong to schema/API design.

**## 2. Database Goals**

The database must support:

\- Authentication and user identity

\- Learner, instructor, and admin roles

\- Instructor-owned courses

\- Course discovery by domain/category/difficulty

\- Topics, lessons, resources, practice, and assessments

\- Enrollment and course progress

\- Reusable question banks and randomized assessment attempts

\- Diagnostic and prerequisite workflows

\- Detailed assessment responses

\- Historical learning evidence

\- Topic-level mastery

\- Learner learning profiles

\- Personalized recommendations

\- Remediation/intervention tracking

\- Instructor course analytics

\- Admin/audit information

\- Future scalability

**\*\*Core principle:\*\*** store enough reliable learning evidence to understand not only the learner's current state, but also how that state changed over time.

**## 3. Primary Database**

The MVP uses **\*\*MongoDB\*\*** as the primary persistent data store.

MongoDB is suitable for user/profile data, course content, assessment structures, learning evidence, and evolving personalization state.

Flexibility does not mean everything should be embedded. The design deliberately combines references, selective embedding, indexes, and derived state.

**## 4. Core Database Principles**

**### 4.1 Separate Major Domains**

Major entities should generally be separate documents/collections rather than one enormous document.

\`\`\`text

User

Course

Topic

Lesson

Enrollment

Assessment

Question

Attempt

Learning Evidence

Recommendation

\`\`\`

**### 4.2 Avoid Giant Documents**

A Course should not contain every lesson, resource, question, attempt, and learner record.

\`\`\`text

Course

  ↓

Topics

  ↓

Lessons

  ↓

Resources / Assessments

\`\`\`

**### 4.3 Historical Evidence vs Current State**

Historical evidence represents what actually happened:

\`\`\`text

Learner answered Question 7 incorrectly.

Learner completed Lesson 3.

Learner scored 55% on Assessment A.

Learner improved after remediation.

\`\`\`

These records should generally be append-oriented and preserved.

Current derived state represents the latest calculated understanding:

\`\`\`text

Current course progress = 63%

Current mastery of normalization = 71%

Current recommendation = revise 2NF

\`\`\`

Current state can be recalculated or updated from historical evidence.

**## 5. High-Level Domain Model**

\`\`\`text

                         PLATFORM

                            │

       ┌────────────────────┼────────────────────┐

       │                    │                    │

       ▼                    ▼                    ▼

     USERS              COURSES              ADMIN

       │                    │                    │

       │             ┌──────┼──────┐             │

       │             ▼      ▼      ▼             ├── Audit

       │          Topics Lessons Resources        └── Moderation

       │                    │

       │                    ▼

       │               Assessments

       │                    │

       │               Question Bank

       │

       ├── Learner

       │     │

       │     ├── Enrollment

       │     ├── Progress

       │     ├── Attempts

       │     ├── Learning Evidence

       │     ├── Topic Mastery

       │     └── Recommendations

       │

       └── Instructor

             │

             ├── Courses

             └── Course Analytics

\`\`\`

**## 6. Core Collections**

Initial conceptual collections:

\`\`\`text

users

learnerProfiles

instructorProfiles

authIdentities

refreshSessions

oauthSetupSessions

courses

topics

lessons

resources

enrollments

questionBanks / questions

assessments

assessmentAttempts

questionResponses

learningEvidence

topicMastery

learningProfiles

recommendations

interventions

notifications

auditLogs

\`\`\`

The final decision on whether question banks and questions are separate collections or questions are grouped under a bank can be finalized during implementation. The conceptual relationship remains:

\`\`\`text

Question Bank

      ↓

Questions

      ↓

Assessment

\`\`\`

**## 7. User Model**

There should be one central User identity.

\`\`\`text

Approved common User fields:

User

├── name

├── email

├── password

├── role

├── status

├── suspensionReason

├── suspendedAt

├── avatar

└── timestamps

\`\`\`

Clarify:

\- name is common identity information.

\- email is normalized account identity.

\- password represents stored password authentication information;

  never plaintext.

\- Passwords are hashed with bcryptjs before persistence.

  The current implementation uses a cost factor of 12.

\- role is LEARNER / INSTRUCTOR / ADMIN.

\- status is ACTIVE / SUSPENDED / DEACTIVATED.

\- avatar is common User-level profile information.

Do NOT put avatar into LearnerProfile or InstructorProfile.

Roles:

\`\`\`text

LEARNER

INSTRUCTOR

ADMIN

\`\`\`

Public signup may allow Learner or Instructor. Admin accounts are controlled and are not self-created through public role selection.

**### Final Role and Profile Mapping**

```text
LEARNER
   ↓
LearnerProfile

INSTRUCTOR
   ↓
InstructorProfile

ADMIN
   ↓
No role-specific learning profile required
```

One account has one platform role in the MVP.

Role is not changed through normal profile editing or user-status management.

**### Account Status Semantics**

ACTIVE represents normal account access.

DEACTIVATED represents user-initiated account deactivation.

SUSPENDED represents an Admin/platform-controlled restriction.

The platform must distinguish suspension from deactivation:

\`\`\`text

ACTIVE

  ├── User deactivates → DEACTIVATED

  └── Admin suspends → SUSPENDED

DEACTIVATED

  └── User reactivates → ACTIVE

SUSPENDED

  └── Admin resolves → ACTIVE

  \`\`\`

Admin does not directly deactivate users.

A suspended user cannot self-reactivate.

Suspension metadata is stored as:

suspensionReason

suspendedAt

No suspendedBy field is required for the current design.

Role changes are not supported as a normal user-management operation.

**### Authentication Session Behavior**

Account-state changes affect authentication sessions:

\`\`\`text

ACTIVE

    ↓

Normal authentication sessions

User deactivates

    ↓

DEACTIVATED

    ↓

Active RefreshSession records revoked

Admin suspends

    ↓

SUSPENDED

    ↓

Active RefreshSession records revoked

DEACTIVATED

    ↓

User reactivates

    ↓

ACTIVE

    ↓

New RefreshSession created

\`\`\`

**## 8. Learner Profile**

Learner-specific information belongs conceptually in a Learner Profile.

\`\`\`text

LearnerProfile

├── userId

├── interests

├── goals

├── experienceLevel

├── studyPreferences

│   ├── dailyStudyTime

│   └── preferredLearningFormat

├── onboardingState

└── timestamps

\`\`\`

Clarify:

**### interests**

Multiple learner interests selected during onboarding.

**### goals**

Learner goals declared during onboarding.

**### experienceLevel**

A single overall, self-reported experience level relating to the

subjects/interests selected by the learner.

It is NOT:

\- platform experience

\- verified mastery

\- subject-specific mastery

Onboarding question:

"How would you describe your current experience with the subjects

you've selected?"

Options:

- I have no prior knowledge
- I have a basic understanding
- I am comfortable with the fundamentals
- I have substantial experience
- I'm not sure

The project intentionally uses ONE overall experience level for the MVP,

even if multiple interests are selected.

Do not create per-interest experience records.

**### studyPreferences**

MVP contains only:

studyPreferences

├── dailyStudyTime

└── preferredLearningFormat

dailyStudyTime represents realistic daily learning capacity.

Approved displayed choices:

- Less than 1 hour
- 1–2 hours
- 2–3 hours
- 3–4 hours
- 5 or more hours

This information is intentionally relevant to personalization because

recommendation volume/granularity can be adjusted according to learner

capacity.

preferredLearningFormat supports multiple selections.

Approved options:

- Reading
- Videos
- Interactive Learning
- Practice Exercises
- Projects

Do NOT make preferredLearningFormat a single-value preference.

Conceptually:

preferredLearningFormat → array of strings

Exact implementation-level enum naming belongs to schema implementation.

**### onboardingState**

Approved states:

NOT\_STARTED

IN\_PROGRESS

COMPLETED

Reason:

The MVP uses a multi-step onboarding experience.

**## 9. Instructor Profile**

Instructor-specific professional information belongs conceptually in an
Instructor Profile.

```text
InstructorProfile
├── userId
├── professionalTitle
├── expertiseAreas[]
├── bio
├── experienceYears
├── organization
├── socialLinks
├── createdAt
└── updatedAt
```

professionalTitle:

Represents the instructor's professional role or title collected during
instructor onboarding.

The MVP onboarding options include:

Software Developer / Designer
Data Scientist
Machine Learning Engineer
Cybersecurity Professional
Educator / Instructor
Finance Professional
Other — Please specify

If Other — Please specify is selected, the actual custom value is stored.

expertiseAreas:

Represents the areas in which the instructor is experienced in teaching.

Multiple areas may be selected.

Approved options include:

Programming & Software Development
Data Science & Artificial Intelligence
Mathematics & Statistics
Business & Entrepreneurship
Finance & Economics
Science & Technology
Other — Please specify

If Other — Please specify is selected, the actual custom value is stored.

Additional Profile Fields:

The instructor profile also supports:

bio
experienceYears
organization
socialLinks

These fields belong to the instructor profile but are not required as part
of the initial two-question onboarding flow.

Avatar belongs to User because it is common across Learner, Instructor,
and Admin.

Courses reference the instructor/user as owner rather than duplicating the
full instructor profile.


**## User → Profile Relationship**

For Learner:

User.role = LEARNER

        ↓

LearnerProfile

For Instructor:

User.role = INSTRUCTOR

        ↓

InstructorProfile

For Admin:

User.role = ADMIN

        ↓

No LearnerProfile/InstructorProfile required.

For both LearnerProfile and InstructorProfile:

userId is:

\- required

\- reference to User

\- unique within the respective profile collection

This represents one profile per user for the applicable profile type.

This is an APPLICATION-LEVEL invariant.

Do not imply that MongoDB must atomically create User + Profile through

a schema hook.

Registration/onboarding may temporarily have:

User exists

    ↓

Profile not yet completed

    ↓

Onboarding

    ↓

Profile completed

**## 10. Course Model**

A Course represents the educational product created by a instructor.

\`\`\`text

Course

├── title

├── description

├── createdBy

├── domain

├── category

├── difficulty

├── objectives

├── prerequisites

├── diagnosticPolicy

├── status

└── timestamps

\`\`\`

Course status:

\`\`\`text

DRAFT

PUBLISHED

ARCHIVED

\`\`\`

**## 11. Course Ownership and Discovery**

Each course has a instructor/owner:

\`\`\`text

Instructor

   │

   ├── Course A

   ├── Course B

   └── Course C

\`\`\`

Conceptually:

\`\`\`text

Course.createdBy → User/Instructor

\`\`\`

Discovery metadata includes:

\`\`\`text

domain/category

difficulty

title

status

\`\`\`

This supports search, domain/category filtering, and AI recommendations.

**## 12. Prerequisite and Diagnostic Model**

A course may require prerequisite knowledge:

\`\`\`text

Advanced SQL

   │

   └── Prerequisite

          ↓

       Basic SQL

\`\`\`

A prerequisite may reference a prerequisite course, required knowledge/topic, and/or diagnostic requirement.

Some courses have a diagnostic assessment:

\`\`\`text

Course

   ├── prerequisites

   └── diagnosticAssessment

\`\`\`

The instructor decides whether the diagnostic is required. A learner's diagnostic attempt is stored separately from course configuration.

**## 13. Topic Model**

Topics are a major structural layer:

\`\`\`text

Course

  │

  ├── Topic A

  ├── Topic B

  └── Topic C

\`\`\`

Conceptually:

\`\`\`text

Topic

├── courseId

├── title

├── description

├── order

└── learningObjectives

\`\`\`

Topic-level identity is essential because personalization must reason about specific concepts.

**## 14. Lesson Model**

A lesson belongs to a topic:

\`\`\`text

Course

  ↓

Topic

  ↓

Lesson

\`\`\`

Conceptually:

\`\`\`text

Lesson

├── topicId

├── title

├── explanation

├── examples

├── order

├── accessPolicy

└── status

\`\`\`

Lesson content may later use structured content blocks, rich text, or resource references.

**## 15. Lesson Ordering and Unlocking**

Lesson order is stored explicitly:

\`\`\`text

Lesson 1 → order 1

Lesson 2 → order 2

Lesson 3 → order 3

\`\`\`

Unlocking is a business rule, not merely a database field. The Learning module decides whether a learner can access the next lesson using stored state and evidence.

**## 16. Resource Model**

A lesson may have multiple resources:

\`\`\`text

Lesson

  ├── YouTube Video

  ├── PDF Notes

  ├── External Reference

  └── Instructor Material

\`\`\`

Conceptually:

\`\`\`text

Resource

├── lessonId

├── type

├── title

├── externalUrl / storageReference

├── metadata

└── createdBy

\`\`\`

Potential types:

\`\`\`text

VIDEO

PDF

PRESENTATION

DOCUMENT

LINK

\`\`\`

Actual files are stored in object/file storage; MongoDB stores metadata.

**## 17. Enrollment Model**

Enrollment represents:

\`\`\`text

Learner ↔ Course

\`\`\`

Conceptually:

\`\`\`text

Enrollment

├── learnerId

├── courseId

├── status

├── enrolledAt

├── completedAt

└── currentProgressState

\`\`\`

Possible statuses:

\`\`\`text

ACTIVE

COMPLETED

ARCHIVED

\`\`\`

The exact lifecycle can be refined later.

**## 18. Current Progress vs Historical Activity**

Enrollment can hold current derived state such as:

\`\`\`text

progressPercentage

currentLessonId

currentTopicId

\`\`\`

It should not become the historical activity store. Historical activity belongs to learning evidence/activity records.

**## 19. Question Bank**

Instructors maintain reusable question banks:

\`\`\`text

Question Bank

      │

      ├── Question 1

      ├── Question 2

      ├── Question 3

      └── ...

\`\`\`

Conceptually:

\`\`\`text

Question

├── courseId

├── topicId

├── questionText

├── options

├── correctAnswer

├── explanation

├── marks

├── difficulty

└── metadata

\`\`\`

**## 20. Why Question Banks Matter**

Example:

\`\`\`text

Question Bank = 30

Questions per attempt = 10

\`\`\`

Attempt 1 selects one combination and a retry can select another.

This supports better retries, less memorization, broader evidence, and more reliable assessment.

**## 21. Bulk Question Import**

Questions may enter through:

\`\`\`text

Manual Creation

CSV/Excel Import

Future AI-Assisted Drafting

\`\`\`

Pipeline:

\`\`\`text

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

\`\`\`

AI-generated questions are not automatically trusted as official assessment content.

**## 22. Assessment Model**

Assessment represents a configured evaluation.

Types:

\`\`\`text

PRACTICE

LESSON\_ASSESSMENT

DIAGNOSTIC

FINAL

\`\`\`

Conceptually:

\`\`\`text

Assessment

├── courseId

├── topicId / lessonId

├── type

├── questionBankId

├── questionCount

├── passingThreshold

├── timeLimit

├── maxAttempts

└── configuration

\`\`\`

**## 23. Assessment Attempt**

An Attempt represents one actual learner session/submission.

\`\`\`text

Assessment

     │

     ├── Attempt 1

     ├── Attempt 2

     └── Attempt 3

\`\`\`

Conceptually:

\`\`\`text

AssessmentAttempt

├── learnerId

├── assessmentId

├── startedAt

├── submittedAt

├── score

├── percentage

├── status

└── attemptNumber

\`\`\`

Possible statuses:

\`\`\`text

IN\_PROGRESS

SUBMITTED

AUTO\_SUBMITTED

\`\`\`

**## 24. Question Response**

Question Response represents what happened for one question during one attempt.

\`\`\`text

AssessmentAttempt

     ├── Response Q1

     ├── Response Q2

     ├── Response Q3

     └── ...

\`\`\`

Conceptually:

\`\`\`text

QuestionResponse

├── attemptId

├── questionId

├── selectedAnswer

├── responseStatus

├── isCorrect

├── marksObtained

└── timeSpent

\`\`\`

Response status:

\`\`\`text

CORRECT

INCORRECT

UNANSWERED

\`\`\`

Unanswered remains analytically distinct from incorrect.

**## 25. Assessment Scoring and History**

Scoring is deterministic:

\`\`\`text

Question Responses

      ↓

Marks Calculation

      ↓

Score

      ↓

Percentage

      ↓

Pass/Fail

\`\`\`

AI does not decide official numerical scores.

Attempts remain historical:

\`\`\`text

Attempt 1 → 45%

Attempt 2 → 61%

Attempt 3 → 78%

\`\`\`

This allows improvement measurement.

**## 26. Learning Evidence**

Learning Evidence records meaningful learning events:

\`\`\`text

Lesson completed

Practice attempted

Assessment submitted

Question answered incorrectly

Question answered correctly

Diagnostic failed

Remediation completed

Mastery improved

\`\`\`

Conceptually:

\`\`\`text

LearningEvidence

├── learnerId

├── courseId

├── topicId

├── lessonId

├── assessmentId

├── attemptId

├── eventType

├── eventData

└── occurredAt

\`\`\`

Not every event needs every reference.

**## 27. Immutable Learning Evidence**

Learning evidence should generally be append-oriented.

Example:

\`\`\`text

Evidence 1

Normalization question → incorrect

Evidence 2

Normalization practice → completed

Evidence 3

2NF mini assessment → 68%

Evidence 4

2NF assessment → 82%

\`\`\`

Evidence 1 is not rewritten later.

This preserves the learning trajectory.

**## 28. Topic Mastery**

Topic Mastery is derived/current state:

\`\`\`text

Learner

   ↓

Topic

   ↓

TopicMastery

\`\`\`

Conceptually:

\`\`\`text

TopicMastery

├── learnerId

├── topicId

├── courseId

├── masteryScore

├── status

├── confidence

├── evidenceCount

└── lastEvaluatedAt

\`\`\`

Possible statuses:

\`\`\`text

STRONG

DEVELOPING

NEEDS\_IMPROVEMENT

\`\`\`

Exact formulas remain a personalization-design decision.

**## 29. Mastery Is Derived**

The flow is:

\`\`\`text

Learning Evidence

       ↓

Mastery Calculation

       ↓

Topic Mastery

\`\`\`

If the calculation strategy changes, historical evidence can support recalculation.

**## 30. Learner Learning Profile**

The Learning Profile represents a higher-level, derived view of the learner:

\`\`\`text

LearningProfile

├── learnerId

├── goals

├── interests

├── strengths

├── weaknesses

├── learningPatterns

└── personalizationState

\`\`\`

It should not contain every historical learning event.

**## 31. Learner Profile vs Learning Profile**

**### LearnerProfile**

Answers:

> What did the learner explicitly tell us during onboarding/profile setup?

Examples:

- interests
- goals
- experience level
- study preferences
- onboarding state

**### Learning Profile**

Answers:

\> Who is the learner and what did they tell us?

Examples:

\- interests

\- goals

\- experience level

**### Learning Profile**

Answers:

\> What have we learned about the learner's learning?

Examples:

\- mastery

\- weaknesses

\- strengths

\- learning patterns

\- intervention outcomes

**## 32. Recommendation Model**

Recommendation represents a proposed next action:

\`\`\`text

Recommendation

├── learnerId

├── type

├── target

├── reason

├── priority

├── status

├── generatedAt

└── expiresAt

\`\`\`

Potential types:

\`\`\`text

COURSE

LESSON

TOPIC

RESOURCE

PRACTICE

PREREQUISITE

REASSESSMENT

\`\`\`

**## 33. Recommendation Flow**

\`\`\`text

Learning Evidence

      ↓

Analysis

      ↓

Learning State

      ↓

Recommendation

\`\`\`

Example:

\`\`\`text

Topic mastery:

2NF = 42%

Recommendation:

Review 2NF lesson

→ Watch recommended video

→ Complete practice

→ Take mini assessment

\`\`\`

**## 34. Recommendation History**

Recommendation history can help answer:

\`\`\`text

What was recommended?

Did the learner follow it?

Did it help?

\`\`\`

This can become future evidence for improving the personalization engine.

**## 35. Intervention / Remediation Model**

An intervention represents an attempt to address a weakness:

\`\`\`text

Intervention

├── learnerId

├── targetTopicId

├── type

├── reason

├── recommendedAction

├── startedAt

├── completedAt

└── outcome

\`\`\`

Types may include:

\`\`\`text

LESSON\_REVIEW

RESOURCE\_REVIEW

PRACTICE

MINI\_ASSESSMENT

PREREQUISITE\_REVIEW

REASSESSMENT

\`\`\`

**## 36. Intervention Outcome**

The platform should eventually measure:

\`\`\`text

Weakness

   ↓

Intervention

   ↓

Outcome

\`\`\`

Example:

\`\`\`text

Before intervention: 45%

Intervention: targeted practice

After intervention: 73%

\`\`\`

This helps evaluate which remediation strategies are effective.

**## 37. Instructor Analytics**

Instructor analytics are primarily derived from learner/course learning data:

\`\`\`text

Learner Learning Evidence

          ↓

Aggregation

          ↓

Course Analytics

          ↓

Instructor Dashboard

\`\`\`

Examples:

\- enrollment count

\- active learners

\- completion rate

\- average assessment score

\- difficult topics

\- strongest topics

\- assessment distribution

**## 38. Analytics Data Strategy**

Avoid unnecessarily duplicating all learner data.

For expensive calculations:

\`\`\`text

Raw Data

  ↓

Background Aggregation

  ↓

Cached/Materialized Analytics

\`\`\`

The exact analytics storage strategy can evolve after performance testing.

**## 39. Notification Model**

A Notification represents a message/event intended for a user:

\`\`\`text

Notification

├── recipientId

├── type

├── title

├── message

├── relatedEntity

├── readAt

└── createdAt

\`\`\`

Examples:

\- course published

\- enrollment confirmation

\- assessment result

\- recommendation available

Notifications are not part of the critical learning path.

**## 40. Audit Log Model**

Audit records capture important administrative/security actions:

\`\`\`text

AuditLog

├── actorId

├── action

├── targetType

├── targetId

├── metadata

└── occurredAt

\`\`\`

Examples:

\`\`\`text

Admin suspended/unsuspended user

Instructor published course

Instructor archived course

Admin moderated course

\`\`\`

**## 41. Application Logs vs Audit Logs**

Application logs answer:

\> What happened technically?

Audit logs answer:

\> Who performed an important business/security action?

They should not be treated as the same data.

**## 42. Relationship Map**

\`\`\`text

User

 │

 ├── LearnerProfile

 └── InstructorProfile

       │

       └── Course

            │

            ├── Topic

            │    └── Lesson

            │         └── Resource

            │

            ├── Question Bank

            │    └── Question

            │

            ├── Diagnostic Assessment

            └── Final Assessment

Learner

 │

 └── Enrollment

       │

       └── Course

Learner

 │

 ├── AssessmentAttempt

 │      └── QuestionResponse

 │

 ├── LearningEvidence

 │

 ├── TopicMastery

 │

 ├── LearningProfile

 │

 ├── Recommendation

 │

 └── Intervention

\`\`\`

**## 43. Complete Learning Data Flow**

\`\`\`text

Learner

   ↓

Enrollment

   ↓

Course

   ↓

Topic

   ↓

Lesson

   ↓

Practice / Assessment

   ↓

Assessment Attempt

   ↓

Question Responses

   ↓

Learning Evidence

   ↓

Topic Mastery

   ↓

Learning Profile

   ↓

Personalization

   ↓

Recommendation

   ↓

Intervention

   ↓

New Learning Evidence

   ↓

Updated Mastery

\`\`\`

This is the central data loop of the platform.

**## 44. Historical vs Current Data**

**### Historical**

\`\`\`text

LearningEvidence

AssessmentAttempt

QuestionResponse

Intervention history

Recommendation history

AuditLog

\`\`\`

**### Current / Derived**

\`\`\`text

Enrollment progress

TopicMastery

LearningProfile

Current recommendations

Course analytics snapshots

\`\`\`

This separation is important for analytics and future personalization.

**## 45. Data Lifecycle Example**

For a learner learning 2NF:

\`\`\`text

1\. Learner opens 2NF lesson

       ↓

2\. Lesson completion event

       ↓

3\. Practice attempt

       ↓

4\. Assessment

       ↓

5\. Question responses

       ↓

6\. Learning evidence created

       ↓

7\. Mastery recalculated

       ↓

8\. Weakness detected

       ↓

9\. Recommendation created

       ↓

10\. Learner completes remediation

       ↓

11\. New assessment

       ↓

12\. New evidence

       ↓

13\. Mastery updated

\`\`\`

The database preserves the journey rather than only the final state.

**## 46. Data Integrity Principles**

Important invariants include:

\- A learner should not have multiple unintended active enrollments for the same course.

\- An attempt belongs to exactly one learner and assessment.

\- A response belongs to one attempt and one question.

\- A course belongs to its creator/owner.

\- Instructor access is validated through course ownership and enrollment.

\- Learning evidence must reference valid relevant entities when applicable.

**## 47. Referential Integrity in MongoDB**

MongoDB does not enforce traditional relational foreign keys.

Integrity will therefore be enforced through:

\- application validation

\- service-layer business rules

\- schema validation where appropriate

\- indexes

\- controlled deletion rules

\- careful reference handling

References should not be trusted merely because an ID is syntactically valid.

**## 48. Deletion and Archival Strategy**

Not every record should be hard-deleted immediately.

Important historical data may affect analytics, instructor reports, learning history, and auditability.

The platform should distinguish where appropriate between:

\`\`\`text

ACTIVE

ARCHIVED

DELETED

\`\`\`

Exact retention rules belong in the Security/Privacy document.

**## 49. Course Archival**

When a course becomes archived, historical records should remain meaningful.

For example:

\`\`\`text

Enrollment

Assessment Attempts

Learning Evidence

Mastery History

\`\`\`

should not disappear merely because the course is archived.

**## 50. Indexing Strategy**

Indexes should be based on real query patterns.

Conceptual candidates:

\`\`\`text

users:

  email

  role

courses:

  createdBy

  department

  category

  difficulty

  status

topics:

  courseId

  order

lessons:

  topicId

  order

enrollments:

  learnerId

  courseId

  status

assessments:

  courseId

  topicId

  type

assessmentAttempts:

  learnerId

  assessmentId

  submittedAt

questionResponses:

  attemptId

  questionId

learningEvidence:

  learnerId

  courseId

  topicId

  eventType

  occurredAt

topicMastery:

  learnerId

  topicId

  courseId

recommendations:

  learnerId

  status

  createdAt

\`\`\`

These are conceptual candidates, not final index definitions.

**## 51. Compound Index Thinking**

Some queries require multiple fields.

Examples:

\`\`\`text

Find all active enrollments for a learner.

Find a learner's recent evidence for a topic.

\`\`\`

Potential compound indexes:

\`\`\`text

(learnerId, status)

(learnerId, topicId, occurredAt)

\`\`\`

The exact order should be determined from actual query patterns and explain plans.

**## 52. Uniqueness**

Potential uniqueness constraints include:

\`\`\`text

User email

Learner + Course active enrollment

\`\`\`

Other uniqueness requirements should be evaluated individually.

Uniqueness is not merely a frontend validation concern.

**## 53. Pagination**

Large collections must not be retrieved without limits.

Potentially large collections include:

\- learning evidence

\- assessment attempts

\- question responses

\- notifications

\- audit logs

\- course lists

The API should use appropriate pagination strategies.

**## 54. Growth-Sensitive Collections**

Collections that can grow rapidly include:

\`\`\`text

learningEvidence

questionResponses

assessmentAttempts

auditLogs

notifications

\`\`\`

They should be designed with indexes, pagination, retention considerations, asynchronous aggregation, and future archival strategies.

**## 55. Personalization Data Principle**

The database should not store only:

\`\`\`text

Learner → Score

\`\`\`

It should preserve:

\`\`\`text

Learner

  ↓

Course

  ↓

Topic

  ↓

Lesson

  ↓

Assessment

  ↓

Question

  ↓

Response

  ↓

Evidence

  ↓

Mastery

  ↓

Intervention

  ↓

Outcome

\`\`\`

This enables evidence-based personalization.

**## 56. AI Data Boundary**

AI should not query the entire database indiscriminately.

Instead:

\`\`\`text

MongoDB

   ↓

Personalization Service

   ↓

Relevant structured learning state

   ↓

AI

\`\`\`

Example AI context:

\`\`\`text

Topic: Normalization

Mastery: 48%

Recent attempts: 3

Recent trend: improving

Common error pattern: 2NF dependency reasoning

Completed remediation: yes

\`\`\`

This is safer and more reliable than unrestricted database access.

**## 57. Privacy Principle**

Only data required for a specific operation should be exposed to another module, instructor, admin, or AI provider.

Examples:

\- Instructor receives relevant course-level learner data.

\- AI receives relevant learning context.

\- Admin receives data required for administrative operations.

\- Learner receives their own learning data.

Data minimization should guide access design.

**## 58. Instructor Data Boundary**

Instructor access follows:

\`\`\`text

Instructor

  ↓

Own Course

  ↓

Enrolled Learners

  ↓

Course-Relevant Data

\`\`\`

A instructor should not automatically receive:

\`\`\`text

Learner's unrelated courses

Learner's unrelated assessments

Learner's unrelated learning history

\`\`\`

**## 59. Admin Data Boundary**

Admin has broader platform access, but sensitive operations should still be:

\- authorized

\- audited

\- minimized

\- explicitly designed

Admin does not mean unlogged unrestricted access.

**## 60. Performance Strategy**

Initial performance priorities:

1\. Correct indexes.

2\. Efficient queries.

3\. Pagination.

4\. Avoid giant documents.

5\. Avoid unnecessary populate chains.

6\. Selective caching.

7\. Background aggregation.

8\. Efficient question selection.

9\. Appropriate field projection.

Optimization should follow measured bottlenecks.

**## 61. Future Evolution**

The model should allow future additions such as:

\- spaced repetition

\- richer learning patterns

\- knowledge graphs

\- advanced recommendation models

\- ML-based mastery estimation

\- adaptive assessments

\- more sophisticated intervention tracking

These should extend the model rather than rewrite the core identity/course/enrollment/evidence architecture.

**## 62. Conceptual Entity Checklist**

\`\`\`text

Identity

├── User

├── LearnerProfile

├── InstructorProfile

├── AuthIdentity

├── RefreshSession

└── OAuthSetupSession

Content

├── Course

├── Topic

├── Lesson

└── Resource

Enrollment

└── Enrollment

Assessment

├── Question Bank

├── Question

├── Assessment

├── Assessment Attempt

└── Question Response

Personalization

├── Learning Evidence

├── Topic Mastery

├── Learning Profile

├── Recommendation

└── Intervention

Platform

├── Notification

└── Audit Log

\`\`\`

**## 63. Final Database Architecture**

\`\`\`text

                              USER

                               │

                 ┌─────────────┴─────────────┐

                 ▼                           ▼

          Learner Profile              Instructor Profile

                 │                           │

                 │                           ▼

                 │                        Course

                 │                           │

                 │                  ┌────────┼────────┐

                 │                  ▼        ▼        ▼

                 │                Topics   Lessons  Assessments

                 │                  │        │        │

                 │                  │        ▼        ▼

                 │                  │    Resources Question Bank

                 │                  │                 │

                 │                  │                 ▼

                 │                  │             Questions

                 │                  │

                 ▼                  ▼

              Enrollment         Learning

                 │               Activity

                 │                  │

                 └─────────┬────────┘

                           ▼

                    Assessment Attempt

                           │

                           ▼

                    Question Responses

                           │

                           ▼

                    Learning Evidence

                           │

                 ┌─────────┴─────────┐

                 ▼                   ▼

            Topic Mastery      Learning Profile

                 │                   │

                 └─────────┬─────────┘

                           ▼

                     Personalization

                           │

                 ┌─────────┴─────────┐

                 ▼                   ▼

          Recommendation       Intervention

                 │                   │

                 └─────────┬─────────┘

                           ▼

                    New Learning Evidence

\`\`\`

**## 64. Core Database Principle**

The most important decision is:

\> **\*\*The database must preserve the learner's learning journey, not merely their latest score.\*\***

Therefore:

\`\`\`text

Historical Evidence

        ↓

Current Derived State

        ↓

Personalization

        ↓

Intervention

        ↓

New Evidence

        ↓

Updated State

\`\`\`

This makes the database a foundation for an actual personalized learning system rather than simply a CRUD course-management database.

**## 65. External Authentication Identity**

External authentication identities are maintained separately from User.

Conceptually:

```text
AuthIdentity

├── userId
├── provider
├── providerAccountId
└── timestamps
```

The primary current external provider is Google.

The conceptual relationship is:

```text
Google Identity
      ↓
AuthIdentity
      ↓
User
```

The same external identity must not create multiple unintended platform
accounts.

For an existing password-based account, a matching Google email does not
automatically link the accounts.

Account linking is a future authenticated account-settings workflow.

Google-only users may exist without a local password.

For new Google users, a temporary OAuth setup record is used before the
permanent User account is created.

Conceptually:

```text
OAuthSetupSession

├── provider
├── providerAccountId
├── email
├── name
├── avatar
├── role
├── onboardingState
├── onboardingData
├── expiresAt
└── timestamps
```

OAuthSetupSession is temporary and is invalidated/removed after successful
account creation.

Google authentication is not the platform's API access token. After a
successful platform account setup or existing-account authentication, the
application issues its own access and refresh session.

**## 66. Refresh Session**

Do NOT place refreshToken directly inside User.

The authentication architecture uses a separate RefreshSession

persistence

RefreshSession stores the server-side state required to validate and

revoke refresh-token sessions.

RefreshSession

├── userId

├── jti

├── tokenHash

├── expiresAt

├── revokedAt

├── tokenFamily

└── timestamps

Login

 ↓

Create RefreshSession

Refresh

 ↓

Same RefreshSession

 ↓

Update jti + tokenHash

 ↓

Keep tokenFamily

Logout

 ↓

Set revokedAt

One User may have multiple RefreshSession records.

RefreshSession persistence has been finalized for the current

authentication implementation.

RefreshSession is maintained separately from User.

Each session is associated with a User through userId.

The refresh token contains a unique jti that identifies the

corresponding persisted refresh session.

Logout revokes the current session by setting revokedAt.

Password change revokes other active refresh sessions while preserving

the current authenticated session according to the authentication flow.

A User may have multiple refresh sessions.

**## 67. Scope Boundary**

This document intentionally does not yet finalize:

\- Mongoose schema code

\- exact field types

\- exact validation syntax

\- exact collection naming conventions

\- complete API endpoints

\- detailed aggregation pipelines

\- mastery formula implementation

\- AI prompt schemas

\- production database deployment

\- advanced sharding/partitioning

Those decisions belong to later design and implementation documents.