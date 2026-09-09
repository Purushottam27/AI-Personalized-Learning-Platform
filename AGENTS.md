**# AI Based Personalized Learning Platform --- Agent Instructions**

> This file defines the engineering rules, project context,
implementation workflow, and boundaries that AI coding agents must
follow in this repository.

**## 1. Project Identity**

****Project:**** AI Based Personalized Learning Platform

****Core vision:**** Help learners learn, practice, assess,
understand strengths and weaknesses, receive targeted intervention,
improve, reassess, and progress confidently.

The platform is not merely a course-delivery system. Its central value
is evidence-driven personalized learning.

**## 2. Agent Role**

The AI agent is a:

- coding partner

- implementation assistant

- debugger

- testing assistant

- documentation assistant

- refactoring assistant

- technical research assistant

The developer remains the final decision maker for:

- product requirements

- architecture

- business rules

- security policy

- learning model

- personalization policy

- final technical decisions

The agent must not silently make major architectural or business
decisions.

**## 3. Authoritative Documentation**

Before implementing a meaningful feature, inspect the relevant files
under `docs/`.

```text

docs/

├── 01-product-requirements.md

├── 02-mvp-scope.md

├── 03-student-learning-model.md

├── 04-user-journeys.md

├── 05-system-architecture.md

├── 06-database-design.md

├── 07-api-design.md

├── 08-security-authentication-design.md

├── 09-ai-personalization-engine-design.md

├── 10-background-processing-design.md

├── 11-frontend-architecture-ux-design.md

├── 12-testing-strategy.md

├── 13-current-progress.md

├── 14-deployment.md

└── 15-future-implementation.md

```

Authoritative responsibilities:

```text

01 → Product requirements

02 → MVP scope

03 → Learner learning model

04 → User journeys

05 → System architecture

06 → Database design

07 → API design

08 → Security + authentication

09 → AI + personalization engine

10 → Background processing

11 → Frontend architecture + UX

12 → Testing strategy

13 → Current project status

14 → Deployment + operations

15 → Future plans

```

Critical mapping:

```text

08 = Security & Authentication

09 = AI & Personalization

10 = Background Processing

```

Do not use the old draft meanings of documents 08 and 09.

**## 4. Decision Precedence**

Use this order when resolving decisions:

```text

Explicit developer decision

        ↓

Approved product requirement

        ↓

Approved architecture/design document

        ↓

API/database/security/testing contract

        ↓

Implementation convention

        ↓

AI suggestion

```

If implementation conflicts with an approved decision, stop and explain
the conflict instead of silently overriding the design.

**## 5. Architecture Change Protocol**

Never silently change:

- system architecture

- database architecture

- authentication

- authorization

- API contracts

- assessment rules

- learning progression

- personalization behavior

- background-processing architecture

- frontend architecture

- deployment architecture

If a change is genuinely necessary:

```text

Identify conflict

→ Explain reason

→ Propose solution

→ Identify affected documents

→ Get developer approval

→ Update documentation

→ Implement

→ Update tests

→ Update docs/13-current-progress.md

```

**## 6. Approved Architecture**

The initial backend is a ****modular monolith****.

```text

React Frontend

      ↓

Node.js / Express API

      ↓

Modular Monolith

      ↓

MongoDB

Redis + BullMQ

      ↓

Workers

      ↓

AI / Learning Processing / Notifications

```

Do not prematurely convert the project into microservices.

**## 7. Technology Direction**

Initial stack:

```text

Frontend:

React

TypeScript

Vite

React Router

Tailwind CSS

Framer Motion

shadcn/ui

Backend:

Node.js

Express.js

JavaScript

Language boundary:

Frontend uses TypeScript.

Backend uses JavaScript for the MVP.

Do not mix JavaScript and TypeScript within the backend during the MVP.

The frontend/backend boundary is the versioned HTTP/JSON API, so the two

applications do not need to use the same implementation language.

A future backend TypeScript migration is optional and requires a
deliberate

architectural decision before implementation.

Database:

MongoDB

Mongoose

Authentication:

JWT access token

JWT refresh token

Background processing:

Redis

BullMQ

AI:

AI provider through an application/service abstraction

Testing:

Unit

Component

Integration

API

E2E

Security

Performance

AI evaluation

```

Do not add dependencies merely for convenience.

**## 8. Current Project Context**

The repository is currently in the implementation phase.

The approved documentation set is complete and is the source of truth.
The current backend foundation includes:

``` text
Backend foundation                  Implemented
Database connection                 Implemented
User model                          Implemented
RefreshSession model                Implemented
Authentication foundation          Implemented
Authorization foundation            Implemented
Users API                           Implemented
Account management                 Implemented
Account deactivation               Implemented
Account reactivation               Implemented
```

The role model is finalized as:

``` text
LEARNER
INSTRUCTOR
ADMIN
```

Public signup may create only `LEARNER` or `INSTRUCTOR`. `ADMIN` is
never a public signup option.

The current implementation is a modular monolith. Frontend and backend
are separate applications connected through the versioned HTTP/JSON API.

### Important current implementation state

The learner and instructor profile work is currently being implemented
locally and should be inspected from the actual working tree before
making assumptions about its committed state.

Do not treat uncommitted local feature modules as already present on
GitHub `main`.

The current committed backend on `main` remains the authoritative
committed repository state. The developer may intentionally keep a
feature uncommitted until it has been reviewed and reimplemented
correctly.

### Current role-specific profile design

``` text
LEARNER
  → LearnerProfile

INSTRUCTOR
  → InstructorProfile

ADMIN
  → No role-specific learning profile required
```

Learner profile fields:

``` text
userId
interests[]
goals[]
experienceLevel
studyPreferences.dailyStudyTime
studyPreferences.preferredLearningFormat[]
onboardingState
timestamps
```

Instructor profile fields:

``` text
userId
professionalTitle
expertiseAreas[]
bio
experienceYears
organization
socialLinks
timestamps
```

`avatar` belongs to the common `User` model, not role-specific profiles.

### Onboarding design

Learner onboarding is a fixed five-question progressive flow. Each
meaningful answer is persisted immediately.

Learner profile/onboarding API contract:

``` text
GET   /api/v1/learner-profile/me
PATCH /api/v1/learner-profile/me
PATCH /api/v1/learner-profile/me/onboarding
```

Instructor onboarding is a fixed two-question progressive flow.

Instructor profile/onboarding API contract:

``` text
GET   /api/v1/instructor-profile/me
PATCH /api/v1/instructor-profile/me
PATCH /api/v1/instructor-profile/me/onboarding
```

Normal profile management must remain separate from onboarding.

`GET` profile endpoints must not create missing profiles.

For learners, the absence of a LearnerProfile means onboarding has not
started. The LearnerProfile is created when learner onboarding begins.

Learner onboarding persists:

``` text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

InstructorProfile intentionally does not persist an onboardingState
field. Instructor completion is derived from meaningful
`professionalTitle` plus at least one `expertiseAreas` value.

The frontend may derive which fixed question to display from persisted
profile data, but the backend remains authoritative for validation and
completion.

### Frontend project direction

The frontend uses:

``` text
React
TypeScript
Vite
React Router
Tailwind CSS
Framer Motion
shadcn/ui
```

The frontend architecture is defined by
`docs/11-frontend-architecture-ux-design.md`.

Frontend responsibilities include presentation, interaction, navigation,
client state, API integration, and user feedback.

The frontend must never become authoritative for:

``` text
Authorization
Assessment scoring
Lesson unlocking
Course eligibility
Prerequisite satisfaction
Enrollment validity
Instructor ownership
Admin permissions
Mastery
```

### Documentation and implementation boundary

If frontend work needs a backend API, data-model, authorization, or
business-rule change:

``` text
Identify requirement
→ Check approved documentation
→ Identify affected backend decision
→ Discuss/approve the change
→ Update relevant documentation
→ Update implementation
→ Update tests
→ Update docs/13-current-progress.md
```

Do not silently change the backend contract from the frontend.

**## 9. Implementation Philosophy**

Before coding:

```text

Understand requirement

→ Read relevant docs

→ Inspect existing implementation

→ Check dependencies/version

→ Plan smallest correct change

→ Implement

→ Test

→ Review

```

Prefer small vertical slices over generating the entire application at
once.

**## 9. Backend Rules**

Organize the modular monolith by business domains such as:

```text

auth

users

courses

lessons

enrollments

assessments

questions

learning

personalization

analytics

notifications

resources/files

admin

```

Follow `05-system-architecture.md` for the final structure.

Prefer:

```text

Route

→ Middleware

→ Controller

→ Service/business logic

→ Data access

→ Database

```

Do not put substantial business logic in route definitions.

**## 10. Database Rules**

MongoDB is the persistent source of truth.

Do not use Redis as authoritative storage for:

- users

- courses

- enrollments

- learning records

- assessment results

- mastery history

Before changing a model:

```text

Check 06

→ Check related API

→ Check relationships/indexes

→ Implement

→ Test

```

Do not invent persistent fields without understanding their
architectural impact.

**## 11. Authentication and Authorization**

Authentication answers:

```text

Who is the user?

```

Authorization answers:

```text

What may the user do?

```

Use the approved JWT access-token + refresh-token architecture from
`08`.

Roles:

```text

LEARNER

INSTRUCTOR

ADMIN

```

Role alone is not sufficient. Authorization may also depend on:

```text

Ownership

Enrollment

Course state

Prerequisites

Lesson unlock state

Resource ownership

```

Example:

```text

Instructor A

→ Course owned by Instructor B

→ Denied

```

The backend is authoritative. Frontend hiding is never a security
mechanism.

**## 12. Learner Learning Rules**

Follow `03-student-learning-model.md`.

Core loop:

```text

Learn

→ Practice

→ Assess

→ Analyze

→ Personalize

→ Remediate

→ Reassess

→ Improve

→ Continue

```

Do not introduce learning rules that contradict the approved model.

**## 13. Course and Enrollment Rules**

Learners may discover non-enrolled courses and see approved public
metadata such as:

- title

- description

- instructor

- domain/category

- learning objectives

- prerequisites

Protected lesson/assessment content must not become accessible merely
because a course is visible.

Expected flow:

```text

Discover

→ Review

→ Enroll

→ Diagnostic if required

→ Learn

```

**## 14. Diagnostic Assessment**

A instructor may require a diagnostic/prerequisite assessment.

```text

Diagnostic required?

├── No → Continue according to course rules

└── Yes

      ↓

   Diagnostic

      ↓

   Pass / Fail

      ↓

Fail → prerequisite/remediation recommendation

Pass → continue

```

AI may recommend remediation but must not override deterministic
instructor-defined eligibility rules.

**## 15. Lesson Unlocking**

Lesson access must be enforced by the backend.

The frontend may show a locked state, but the API must verify:

```text

Authentication

Authorization

Enrollment

Unlock condition

```

Do not create frontend-only lesson protection.

**## 16. Assessment Rules**

Preserve meaningful evidence:

```text

Correct

Incorrect

Unanswered

```

Unanswered questions must not be silently discarded.

The backend is authoritative for:

```text

Attempt

Timing

Submission

Scoring

Result

Progression

```

Prevent:

- client-side score manipulation

- unauthorized answer access

- duplicate submission corruption

- locked assessment bypass

- question-pool bypass

**## 17. Question Pools and Retry**

Use instructor-created question pools for meaningful retry variation.

```text

Instructor question pool

→ Assessment selection

→ Attempt

→ Result

→ Remediation

→ New valid selection

→ Retry

```

Imported questions must be validated and instructor-approved before
becoming authoritative.

For Excel/PDF imports:

```text

Upload

→ Validate

→ Parse

→ Validate questions

→ Preview

→ Instructor approval

→ Persist

```

**## 18. Instructor Rules**

Instructors may manage their own courses according to the approved
authorization model:

- create/edit courses

- add/edit lessons

- add resources

- create question pools

- create/configure assessments

- publish courses

- view enrolled learners

- view course analytics

A instructor must not modify another instructor's protected course.

Instructor course metadata may include:

```text

Instructor

Domain/category

Description

Objectives

Prerequisites

Lessons

Resources

Assessments

```

**## 19. Instructor Learner Visibility**

For an instructor's own course:

```text

Instructor

→ Own course

→ Enrolled learners

→ Permitted course-specific information

```

Do not expose unrelated learner information.

**## 20. Admin Rules**

Admin functionality is for approved platform-management operations.

Admin routes must be explicitly protected and sensitive actions should
be auditable.

Do not grant admin privileges to learner/instructor routes for
convenience.

**## 21. AI Rules**

AI architecture is defined in
`09-ai-personalization-engine-design.md`.

Prefer:

```text

Application

→ AI service layer

→ Provider adapter

→ AI provider

```

AI must not be authoritative for:

```text

Authorization

Enrollment eligibility

Prerequisite satisfaction

Lesson unlocking

Official assessment scoring

Instructor ownership

Admin permissions

Database integrity

```

AI may assist with:

```text

Recommendations

Explanations

Learning summaries

Resource suggestions

Weakness interpretation

Personalized guidance

```

**## 22. AI Output Validation**

Never trust raw AI output.

```text

AI response

→ Parse

→ Schema validation

→ Business-rule validation

→ Accept / Reject

```

Invalid AI output must not directly mutate authoritative learning state.

Do not let AI invent unsupported:

```text

Learner performance

Instructor identity

Prerequisites

Grades

Course content

Learning history

```

**## 23. Personalization Rules**

The six intervention levels are ****granularities****, not mandatory
sequential stages:

```text

Course

Topic

Lesson

Resource

Practice

Assessment

```

The engine should select:

> The smallest useful intervention supported by evidence.

Approved strategy:

```text

Hard constraints

→ Strongest learning need

→ Most specific useful intervention

→ Smallest effective intervention

→ Evaluate evidence

→ Escalate if insufficient

```

Do not recommend an entire course for every small weakness.

Avoid endless intervention loops.

**## 24. Learning Evidence and Mastery**

Relevant evidence may include:

- lesson completion

- practice responses

- assessment responses

- assessment results

- unanswered questions

- relevant learning events

Evidence should be attributable, timestamped, and tied to the
appropriate learner/course/topic.

Mastery must use the approved model. Do not create competing mastery
calculations in controllers or frontend code.

**## 25. Background Processing**

Follow `10-background-processing-design.md`.

Use Redis/BullMQ for appropriate asynchronous work such as:

```text

Learning event processing

Mastery recalculation

Personalization refresh

Recommendation generation

Question-file processing

Notifications

Analytics aggregation

```

Do not put every operation into a queue.

Immediate learner-facing operations should normally remain synchronous:

```text

Login

Enrollment

Authorized lesson access

Assessment submission

Immediate score

```

Heavy/non-critical work may be asynchronous.

Jobs must be designed for idempotency, retry limits, backoff, and
failure handling.

**## 26. Frontend Rules**

Follow `11-frontend-architecture-ux-design.md`.

Prefer:

```text

Reusable components

Reusable hooks

API abstraction

Clear state management

Feature-oriented organization

Responsive/accessibility-aware UI

```

Important async states:

```text

Loading

Success

Empty

Error

Processing

```

Do not duplicate API logic across components.

**## 27. API Rules**

Follow `07-api-design.md`.

Before creating an endpoint, check:

```text

HTTP method

Path

Request shape

Response shape

Authentication

Authorization

Validation

Error behavior

```

Do not create duplicate endpoints unnecessarily.

Never return sensitive fields or entire database documents when only a
safe subset is required.

**## 28. Role-Specific Profile and Onboarding Rules**

Follow `docs/06-database-design.md`, `docs/07-api-design.md`, and
`docs/11-frontend-architecture-ux-design.md` for the finalized
profile/onboarding design.

Do not merge normal profile management and onboarding into one service
merely because they update the same MongoDB document.

Learner:

``` text
GET profile
→ read only; never create

PATCH profile
→ normal profile management
→ must not own onboarding-state calculation

PATCH onboarding
→ create profile when onboarding begins
→ validate and persist the submitted onboarding answer
→ update learner onboardingState
→ determine the next unanswered fixed field when required
```

Instructor:

``` text
GET profile
→ read only; never create

PATCH profile
→ normal instructor profile management

PATCH onboarding
→ create profile when onboarding begins
→ validate and persist the submitted onboarding answer
→ derive onboarding completion when required
```

Do not introduce:

``` text
onboardingResponses
currentQuestion
```

as authoritative persistent fields unless the developer explicitly
approves an architecture change.

The fixed onboarding questions and their mappings are defined by the
approved documentation. Do not invent additional onboarding questions or
profile fields during implementation.

**## 48. Error Handling and Validation**

Backend validation is mandatory for untrusted input:

```text

Body

Query

Route params

Files

Imported questions

Instructor content

```

Distinguish appropriately between:

```text

Validation

Authentication

Authorization

Not found

Conflict

Rate limit

External dependency failure

Internal error

```

Do not expose secrets, stack traces, or internal database/provider
details in production responses.

**## 48. Security**

Follow `08-security-authentication-design.md`.

Consider security for every feature:

```text

Authentication

Authorization

Ownership

Validation

Rate limiting

Cookie security

File uploads

Sensitive data

IDOR/BOLA

Injection

XSS

CSRF where applicable

```

Never commit secrets.

Use secure environment/secret storage.

**## 48. MCP and External Documentation**

Context7 and GitHub MCP are supporting tools, not architecture
authorities.

Use Context7 for:

```text

Current library APIs

Official configuration

Version-specific behavior

Official examples

```

Use GitHub MCP for:

```text

Repository state

Code

Issues

Pull requests

Documentation

History

```

If external documentation conflicts with project architecture:

```text

Do not silently change architecture.

```

Investigate and discuss first.

Prefer official/current documentation over random tutorials.

**## 48. Dependencies**

Before adding a dependency:

```text

Check whether existing code already solves it

→ Check architecture

→ Check official documentation

→ Check compatibility/version

→ Check security/maintenance

→ Confirm it is actually needed

```

Do not add packages just to save a few lines.

**## 34. Reusability and Scalability**

Prefer reusable abstractions for genuinely repeated behavior:

```text

API client

Auth middleware

Role/ownership checks

Validation

Error handling

UI primitives

Assessment components

Loading/error states

```

Avoid premature abstraction.

For scalability prefer:

```text

Stateless APIs

Indexed queries

Pagination

Bounded queries

Background processing

Clear module boundaries

```

Avoid unbounded queries, giant controllers, global mutable state,
repeated expensive calculations, and unnecessary synchronous AI calls.

**## 35. Testing**

Follow `12-testing-strategy.md`.

Prioritize tests for:

```text

Authentication

Authorization

Ownership

Enrollment

Prerequisites

Lesson unlocking

Assessment scoring

Unanswered questions

Mastery

Personalization

Background jobs

Data integrity

```

The central E2E learning loop must be tested:

```text

Learn

→ Practice

→ Assess

→ Analyze

→ Personalize

→ Remediate

→ Reassess

→ Improve

```

AI-generated tests must be reviewed against approved requirements.
Passing generated tests alone does not prove correctness.

When a meaningful bug is fixed, add a regression test.

**## 36. Deployment**

Follow `14-deployment.md`.

Initial deployment should remain simple:

```text

React frontend

\+

Node/Express API

\+

Worker

\+

MongoDB

\+

Redis/BullMQ

\+

AI provider

```

Do not introduce Kubernetes or microservices merely for complexity.

Separate:

```text

Local

Test

Staging

Production

```

Never use production secrets or data for casual development/testing.

**## 37. Git**

Use meaningful commits, for example:

```text

feat(auth): add refresh token flow

feat(course): add course creation

feat(assessment): implement submission

fix(auth): reject expired refresh token

test(enrollment): add ownership tests

refactor(api): extract course service

docs(progress): update implementation status

```

Avoid vague commits such as:

```text

stuff

changes

final

working

```

Use feature/fix branches when appropriate.

**## 38. Documentation Synchronization**

When implementation reveals a necessary design change:

```text

Discover change

→ Identify affected document

→ Discuss/approve

→ Update document

→ Update 13-current-progress.md

→ Update implementation

→ Update tests

```

Documentation drift is considered a defect.

Do not delete valid approved decisions merely to make new implementation
easier.

**## 39. Debugging Workflow**

When an error occurs:

```text

1. Read the complete error.

2. Identify the failing layer.

3. Reproduce it.

4. Inspect relevant code.

5. Check official/current documentation and installed version.

6. Identify root cause.

7. Apply the smallest correct fix.

8. Add/update a regression test.

9. Re-run relevant tests.

10. Update project status if materially affected.

```

Do not randomly modify many files until the error disappears.

**## 40. Definition of Done**

A meaningful feature should satisfy, where applicable:

```text

\[ \] Requirement understood

\[ \] Relevant docs checked

\[ \] Database updated if necessary

\[ \] API implemented

\[ \] Authorization implemented

\[ \] Business logic implemented

\[ \] Frontend implemented

\[ \] Loading state

\[ \] Empty state

\[ \] Error state

\[ \] Tests added

\[ \] Security considered

\[ \] Regression tests added if needed

\[ \] Documentation synchronized

\[ \] Code reviewed

```

**## 41. MVP Boundary**

Respect `02-mvp-scope.md`.

Do not automatically implement post-MVP ideas such as advanced
gamification, mobile apps, complex social features, or unnecessary
infrastructure.

If a useful feature is outside MVP:

```text

Record it

→ Keep it out of the current implementation

```

Avoid scope creep.

**## 42. Implementation Sequence**

The broad implementation sequence is:

```text

1. Repository setup

2. Backend foundation

3. Frontend foundation

4. Database connection

5. Authentication

6. User/role foundation

7. Student application shell

8. Course discovery

9. Enrollment

10. Lesson experience

11. Assessment

12. Learning evidence

13. Mastery

14. Personalization

15. Instructor course management

16. Instructor assessment/question management

17. Instructor analytics

18. Admin foundation

19. Background processing

20. AI enhancement

21. Full testing

22. Deployment

```

Use dependency-aware judgment; this is not permission to skip
architecture requirements.

**## 43. First Implementation Principle**

Do not begin by implementing every documented endpoint.

Start with a small working foundation and vertical slice:

```text

Repository

→ Backend

→ Database

→ Authentication

→ Frontend

→ Login

→ Protected application shell

```

Then expand:

```text

Course

→ Enrollment

→ Lesson

→ Assessment

```

**## 44. Do Not Overbuild**

For every proposed abstraction/service/dependency ask:

```text

What problem does it solve?

Is it required now?

Can the current architecture handle it?

Does it increase maintenance?

Does it add failure points?

```

Prefer the simplest production-quality solution.

Simplicity does not mean skipping:

```text

Authorization

Validation

Error handling

Testing

Security

Data integrity

Logging

Retry handling

```

**## 45. Current Progress**

`docs/13-current-progress.md` is the living project-control document.

Update it when there is a meaningful change to:

```text

Implementation status

Milestone

Current task

Blocker

Architecture

Testing status

Deployment status

Open decisions

Technical debt

```

Do not duplicate all architecture content inside it.

**## 46. When Requirements Are Ambiguous**

Do not invent important business rules when ambiguity affects:

```text

Security

Data model

API contract

Assessment

Learning progression

Personalization

Architecture

```

Ask for clarification.

For minor implementation details, follow established project
conventions.

**## 47. Final Non-Negotiable Rules**

```text

1. Never silently change approved architecture.

2. Never invent business rules when approved documentation defines
them.

3. Never treat AI output as authoritative application state.

4. Never rely on frontend security.

5. Never bypass authorization for convenience.

6. Never expose or commit secrets.

7. Never add unnecessary dependencies.

8. Never over-engineer the MVP.

9. Never under-build security or data integrity.

10. Never skip tests for critical business logic.

11. Never allow implementation and documentation to drift.

12. Never delete approved decisions without explicit approval.

13. Use official/current library documentation for implementation
details.

14. Use Context7 as a documentation/reference assistant, not an
architecture authority.

15. Use GitHub context to understand the actual repository before
modifying existing code.

16. Keep docs/13-current-progress.md synchronized with meaningful
project-state changes.

17. When an important architectural or business decision is uncertain,
ask the developer instead of guessing.

```

**## 48. Final Operating Model**

```text

                 DEVELOPER

                     │

          Product + architecture decisions

                     │

                     ▼

             APPROVED DOCUMENTS

                     │

                     ▼

                AGENTS.md

                     │

                     ▼

                AI AGENT

             ┌───────┴────────┐

             ▼                ▼

        Context7            GitHub

       Official Docs       Repository

             │                │

             └───────┬────────┘

                     ▼

                IMPLEMENTATION

                     │

                     ▼

                   TESTS

                     │

                     ▼

                  REVIEW

                     │

             ┌───────┴────────┐

             ▼                ▼

       Documentation       Git Commit

          Update

             │

             ▼

      docs/13-current-progress.md

```

**## 49. Final Principle**

> ****The agent should make the developer faster, not make the
developer less informed.****

The goal is:

```text

Developer reasoning

\+

Approved architecture

\+

Official documentation

\+

AI implementation assistance

\+

Automated testing

\+

Continuous review

=

High-quality solo development

```

The project must remain understandable to its developer from beginning
to end.
