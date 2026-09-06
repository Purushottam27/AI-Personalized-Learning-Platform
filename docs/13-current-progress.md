# AI Based Personalized Learning Platform — Current Progress & Project Control

> **Document Type:** Living Project-Control Document  
> **Purpose:** Track the actual state of the project throughout implementation.  
> **Status:** Finalized baseline — architecture/planning documentation approved; foundation backend implementation in progress.

---

# 1. Purpose

This document is different from the other project documents.

Documents `01–12`, `14`, and `15` primarily define what the system should be, how it should be structured, how it should be tested, deployed, and what is intentionally deferred.

This document defines:

```text
WHAT IS APPROVED
WHAT IS PLANNED
WHAT IS IN PROGRESS
WHAT IS IMPLEMENTED
WHAT IS TESTED
WHAT IS BLOCKED
WHAT IS NEXT
WHAT HAS CHANGED
```

It is the project's operational source for current progress.

It must be updated throughout implementation.

This document must describe **actual implementation state**, not intended state.

---

# 2. Project Vision

The platform is an AI-based personalized learning system designed to help learners:

```text
Learn
  ↓
Practice
  ↓
Assess
  ↓
Understand weaknesses
  ↓
Receive targeted intervention
  ↓
Improve
  ↓
Reassess
  ↓
Progress confidently
```

The goal is not merely to provide courses.

The goal is:

> **Help each learner understand what they know, identify what they struggle with, receive an appropriate learning intervention, and continuously improve their learning efficiency and confidence.**

---

# 3. Current Overall Status

## Documentation

```text
01 Product Requirements                 🟢 Complete
02 MVP Scope                            🟢 Complete
03 Student Learning Model               🟢 Complete
04 User Journeys                        🟢 Complete
05 System Architecture                  🟢 Complete
06 Database Design                      🟢 Complete
07 API Design                           🟢 Complete
08 Security & Authentication            🟢 Complete
09 AI & Personalization Engine          🟢 Complete
10 Background Processing                🟢 Complete
11 Frontend Architecture & UX           🟢 Complete
12 Testing Strategy                     🟢 Complete
13 Current Progress                     🟢 Complete
14 Deployment                           🟢 Complete
15 Future Implementation                🟢 Complete
```

## Implementation

```text
Backend foundation                      🟢 Implemented
Database foundation                     🟢 Implemented
User model                              🟢 Implemented
RefreshSession model                    🟢 Implemented
Authentication foundation               🟢 Implemented
Authorization foundation                🟢 Implemented
Users API                               🟢 Implemented
User account management                 🟢 Implemented
Account deactivation                    🟢 Implemented
Account reactivation                    🟢 Implemented

Learner/Instructor profile APIs         ⬜ Not started
Course/domain features                  ⬜ Not started
Assessment features                     ⬜ Not started
Learning evidence                       ⬜ Not started
Personalization implementation          ⬜ Not started
Redis/BullMQ implementation              ⬜ Not started
Frontend implementation                 ⬜ Not started
Automated testing                       ⬜ Not started
Deployment                              ⬜ Not started
```

The architecture/planning phase is complete.

The project is now in the **implementation phase**, beginning with the backend foundation and identity/account capabilities.

---

# 4. Documentation Source of Truth

The current documentation set is:

```text
docs/
│
├── 01-product-requirements.md
├── 02-mvp-scope.md
├── 03-student-learning-model.md
├── 04-user-journeys.md
├── 05-system-architecture.md
├── 06-database-design.md
├── 07-api-design.md
├── 08-security-authentication.md
├── 09-ai-personalization-engine.md
├── 10-background-processing-design.md
├── 11-frontend-architecture-ux.md
├── 12-testing-strategy.md
├── 13-current-progress.md
├── 14-deployment.md
└── 15-future-implementation.md
```

The exact filenames in the repository are authoritative.

The current intended naming is:

```text
08-security-authentication.md
09-ai-personalization-engine.md
10-background-processing-design.md
11-frontend-architecture-ux.md
```

If the repository uses a different finalized filename, update references to match the actual repository rather than creating duplicate documents.

Do not recreate old draft names.

---

# 5. Documentation Governance

The project follows:

> **Implementation must follow approved architecture unless a deliberate change is made.**

If a major decision changes:

```text
Identify affected document
        ↓
Discuss change
        ↓
Approve decision
        ↓
Update relevant document
        ↓
Update 13-current-progress.md
        ↓
Update implementation
        ↓
Update tests
```

Do not silently change architecture inside source code.

---

# 6. Approved Core Architecture

The approved high-level architecture is:

```text
React Frontend
       │
       ▼
API / Application Layer
       │
       ▼
Modular Monolith Backend
       │
 ┌─────┼───────────────────────────────┐
 ▼     ▼                               ▼
MongoDB                         Redis + BullMQ
                                       │
                                       ▼
                                    Workers
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼             ▼
                       AI Jobs    Learning Jobs  Notifications
```

The backend remains a **modular monolith** for the initial project.

Workers are separate runtime processes for background execution, not separate microservices.

Do not prematurely split the system into microservices.

---

# 7. Approved Technology Direction

Initial technology direction:

```text
Frontend:
React
Vite
React Router
Tailwind CSS
Framer Motion
shadcn/ui

Backend:
Node.js
Express.js
JavaScript ES modules

Database:
MongoDB
Mongoose

Authentication:
JWT-based authentication
Access token
Refresh token
RefreshSession persistence

Caching / Background processing:
Redis
BullMQ

AI:
AI provider integration through a controlled service layer

Testing:
Unit
Integration
Component
API
E2E
Security
Performance
AI evaluation
Background-job testing
```

Approved implementation versions currently include:

```text
Mongoose 9.9.3
Zod 4.4.3
```

Exact AI provider, deployment provider, email provider, and file-storage provider remain implementation decisions until explicitly finalized.

---

# 8. Current MVP Philosophy

The MVP should prove the core learning loop before expanding into every possible LMS feature.

The core loop is:

```text
Learner
  ↓
Enroll
  ↓
Learn lesson
  ↓
Practice
  ↓
Assessment
  ↓
Learning evidence
  ↓
Mastery / weakness analysis
  ↓
Personalized intervention
  ↓
Improve
  ↓
Reassess
  ↓
Continue
```

---

# 9. Learner MVP Status

## Authentication

```text
Signup                               🟢
Public Learner/Instructor role       🟡
Login                                🟢
Access token                         🟢
Refresh token                        🟢
Refresh-token rotation               🟢
Logout                               🟢
Authentication middleware            🟢
Protected routes                     🟢
Current user (/me)                   🟢
Role resolution                      🟢
Role-based authorization             🟢
Change password                      🟢
Account deactivation                 🟢
Account reactivation                 🟢
Google authentication                ⬜
Email verification                   ⚪ Deferred
Forgot/reset password                ⚪ Deferred
```

**Status note:** The authentication foundation is implemented and manually verified. Public signup role selection must remain limited to `LEARNER` and `INSTRUCTOR`; `ADMIN` is never publicly selectable.

## Learner Dashboard

```text
Dashboard shell                      ⬜
Continue learning                    ⬜
Next best action                     ⬜
Course progress                      ⬜
Strengths                            ⬜
Weaknesses                           ⬜
Recommendations                     ⬜
Study summary                        ⬜
```

## Course Experience

```text
Course discovery                     ⬜
Course search                        ⬜
Domain filter                        ⬜
Course details                       ⬜
Enrollment                           ⬜
Prerequisite handling                ⬜
Diagnostic assessment                ⬜
Course progress                      ⬜
```

The project uses **domain/category**, not Department, for course classification.

## Learning

```text
Lesson list                          ⬜
Lesson unlocking                     ⬜
Lesson explanation                   ⬜
Examples                             ⬜
Instructor resources                 ⬜
YouTube resource support             ⬜
PDF/PPT resource support             ⬜
Lesson completion                    ⬜
```

## Assessment

```text
Question display                     ⬜
Options                              ⬜
Previous/Next                        ⬜
Question navigator                   ⬜
Timer                                ⬜
Unanswered state                     ⬜
Submission                           ⬜
Scoring                              ⬜
Result                               ⬜
Question-pool variation              ⬜
```

## Personalization

```text
Learning event capture               ⬜
Topic performance                    ⬜
Mastery calculation                  ⬜
Weakness detection                   ⬜
Intervention selection               ⬜
Recommendation                      ⬜
Remediation                          ⬜
Reassessment                         ⬜
```

---

# 10. Instructor MVP Status

```text
Instructor authentication            🟢 Foundation shared with auth
Instructor onboarding                ⬜
Instructor profile                   ⬜
Instructor dashboard                 ⬜
Create course                        ⬜
Edit course                          ⬜
Course domain                        ⬜
Prerequisites                        ⬜
Learning objectives                  ⬜
Create lesson                        ⬜
Edit lesson                          ⬜
Add resources                        ⬜
Question bank                        ⬜
Create assessment                    ⬜
Configure marks                      ⬜
Configure pass threshold             ⬜
Question pool                        ⬜
Publish course                       ⬜
View enrolled learners               ⬜
View course analytics                ⬜
View topic weaknesses                ⬜
Instructor profile/settings          ⬜
```

MVP policy:

```text
Instructor can create/publish courses
without mandatory Admin pre-approval.
```

Admin governance and moderation remain separate.

---

# 11. Admin MVP Status

```text
Admin authentication                 🟢
Admin dashboard                      ⬜
User management                      🟢
Course management                    ⬜
Platform analytics                   ⬜
Audit logs                           ⬜
Moderation                           ⬜
Administrative controls              🟢
Admin settings                       ⬜
```

Current implemented Admin user-management capabilities:

```text
List users
Search users
Filter users
Paginate users
View individual user
Suspend user
Unsuspend user
```

Admin cannot:

```text
Change user role
Deactivate another user's account
Change another user's password
Modify learning evidence
Modify mastery
```

Admin scope remains limited to genuine platform-management requirements.

---

# 12. Database Implementation Status

Approved database design exists in `06-database-design.md`.

Current implementation:

```text
User model                          🟢
LearnerProfile model                ⬜
InstructorProfile model             ⬜
AuthIdentity model                  ⬜
RefreshSession model                🟢
OAuthSetupSession model             ⬜

Course model                        ⬜
Lesson model                        ⬜
Resource model                      ⬜
Enrollment model                    ⬜
Assessment model                    ⬜
Question model                      ⬜
Question bank                       ⬜
Assessment attempt                  ⬜
Learning event                      ⬜
Learning Evidence                   ⬜
Mastery record                      ⬜
Recommendation                     ⬜
Intervention                        ⬜
Notification                        ⬜
Audit log                           ⬜
```

Before implementing each model:

```text
Read 06
  ↓
Read relevant API requirements
  ↓
Implement schema
  ↓
Add validation/indexes
  ↓
Test
```

Do not implement future domain models merely because they are documented.

---

# 13. Backend Module Status

Approved logical modular-monolith boundaries include:

```text
identity/auth
users
learners
instructors
courses
lessons
enrollments
assessments
questions
learning
personalization
analytics
notifications
files/resources
admin
```

Current implementation is concentrated in the identity/user foundation.

Implemented or partially established:

```text
identity/auth                         🟢
users                                 🟢
```

Not yet implemented:

```text
learners                              ⬜
instructors                           ⬜
courses                               ⬜
lessons                               ⬜
enrollments                           ⬜
assessments                           ⬜
questions                             ⬜
learning                              ⬜
personalization                       ⬜
analytics                             ⬜
notifications                         ⬜
files/resources                       ⬜
admin domain features                 ⬜
```

Modules should be created incrementally around real feature slices rather than generated blindly.

---

# 14. API Implementation Status

The API design is documented in `07-api-design.md`.

Current status:

```text
Auth APIs                           🟢
User APIs                           🟢
Learner profile APIs                ⬜
Learner onboarding APIs             ⬜
Instructor profile APIs             ⬜
Instructor onboarding APIs          ⬜
Course APIs                         ⬜
Enrollment APIs                     ⬜
Lesson APIs                         ⬜
Assessment APIs                     ⬜
Question APIs                       ⬜
Learning APIs                       ⬜
Personalization APIs                ⬜
Analytics APIs                      ⬜
Instructor APIs                     ⬜
Admin APIs                          🟡
Notification APIs                   ⬜
```

## Implemented Auth APIs

```text
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/change-password
POST /api/v1/auth/reactivate
```

Google authentication/setup endpoints are documented but not implemented.

## Implemented User APIs

```text
GET    /api/v1/users
GET    /api/v1/users/:userId
PATCH  /api/v1/users/:userId/status
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/avatar
DELETE /api/v1/users/me
```

The `DELETE /users/me` operation is intentionally retained as the approved account-deactivation API.

---

# 15. Security & Authentication Status

Approved security and authentication design exists in `08-security-authentication.md`.

Current implementation:

```text
Authentication foundation             🟢
Signup                                🟢
Login                                 🟢
Access-token handling                 🟢
Refresh-token handling                🟢
Refresh-token rotation                🟢
Logout                                🟢
Authentication middleware             🟢
Protected routes                      🟢
Current user (/me)                    🟢
Role-based authorization              🟢
Password change                       🟢
Account deactivation                  🟢
Account reactivation                  🟢

Teacher/Instructor ownership auth     ⬜
Input validation                      🟢
Rate limiting                         ⬜
Cookie production hardening           🟡
Sensitive-data protection             🟡
File-upload security                  🟡
Audit/security logging                ⬜
Security testing                      ⬜
Google OAuth security                 ⬜
Email verification                    ⚪ Deferred
```

Security remains a cross-cutting concern.

It must not be implemented only at the frontend level.

The backend remains authoritative for:

```text
Authentication
Authorization
Ownership
Enrollment eligibility
Lesson access
Assessment permissions
Administrative permissions
```

## Account-State Security Behavior

Implemented account states:

```text
ACTIVE
SUSPENDED
DEACTIVATED
```

Approved behavior:

```text
User deactivation
    ↓
DEACTIVATED
    ↓
Refresh sessions revoked
```

```text
Admin suspension
    ↓
SUSPENDED
    ↓
Refresh sessions revoked
```

```text
DEACTIVATED
    ↓
Normal login rejected
    ↓
Reactivate endpoint
    ↓
ACTIVE
    ↓
New authentication session
```

Protected requests check the current `User.status`, so an old valid access token cannot bypass a suspended/deactivated account.

Admin suspension requires a suspension reason and uses the approved ACTIVE ↔ SUSPENDED administrative flow.

---

# 16. AI & Personalization Engine Status

Approved in `09-ai-personalization-engine.md`.

Current implementation:

```text
Learning evidence model                ⬜
Mastery calculation                    ⬜
Weakness detection                     ⬜
Intervention selection                 ⬜
Intervention intensity                ⬜
Recommendation ranking                 ⬜
Escalation logic                       ⬜
Effectiveness evaluation               ⬜
AI provider integration                ⬜
AI output validation                   ⬜
AI fallback                            ⬜
```

Approved intervention levels:

```text
Course
Topic
Lesson
Resource
Practice
Assessment
```

Approved principle:

> **Select the most specific useful intervention supported by evidence and escalate only when the current intervention is insufficient.**

AI does not control:

```text
Authorization
Authoritative assessment scoring
Authoritative learning evidence
Lesson unlocking
Core business rules
```

---

# 17. Background Processing Status

Approved in `10-background-processing-design.md`.

Current status:

```text
Redis setup                          ⬜
BullMQ setup                         ⬜
Queue definitions                    ⬜
Worker structure                     ⬜
Retry strategy                       ⬜
Backoff strategy                     ⬜
Idempotency                          ⬜
Failed-job handling                  ⬜
Graceful shutdown                    ⬜
Queue monitoring                     ⬜
Reconciliation                       ⬜
```

Potential initial jobs:

```text
Learning event processing
Mastery recalculation
Personalization refresh
Recommendation generation
Question-file processing
Notifications
Analytics aggregation
```

The authoritative transaction should be persisted before downstream background processing is relied upon.

---

# 18. Frontend Status

Approved architecture exists in `11-frontend-architecture-ux.md`.

Current implementation:

```text
Project setup                         ⬜
Design system                         ⬜
Theme                                 ⬜
Application shell                    ⬜
API client                            ⬜
Authentication state                 ⬜
Role routing                          ⬜
Learner layout                        ⬜
Instructor layout                     ⬜
Admin layout                          ⬜
Learner dashboard                     ⬜
Course experience                     ⬜
Lesson experience                     ⬜
Assessment UI                         ⬜
Personalization UI                   ⬜
Analytics UI                          ⬜
Instructor UI                         ⬜
Admin UI                              ⬜
```

The frontend has not yet been marked complete merely because frontend architecture has been documented.

---

# 19. Testing Status

Approved testing strategy exists in `12-testing-strategy.md`.

Current implementation:

```text
Linting                             ⬜
Unit tests                          ⬜
Component tests                     ⬜
Integration tests                   ⬜
API tests                            ⬜
E2E tests                            ⬜
Security tests                       ⬜
Performance baseline                 ⬜
AI evaluation tests                  ⬜
Background-job tests                 ⬜
Regression suite                     ⬜
```

The implemented authentication/user features have been **manually verified through API testing**, but this does not count as the automated testing suite being complete.

Testing status must distinguish manual verification from automated coverage.

---

# 20. Deployment Status

Deployment architecture is finalized in `14-deployment.md`.

Current implementation status:

```text
Deployment architecture               🟢 Designed
Environment configuration              ⬜
Production database                    ⬜
Production Redis                       ⬜
Backend deployment                     ⬜
Frontend deployment                   ⬜
Worker deployment                      ⬜
CI/CD                                 ⬜
Monitoring                            ⬜
Logging                               🟡 Development logging exists
Backups                               ⬜
Restore testing                       ⬜
Production smoke tests                ⬜
```

The project does not need production deployment during the current foundation stage.

---

# 21. Current Milestone

## Milestone 0 — Architecture & Planning

Status:

```text
████████████████████  COMPLETE
```

Completed:

```text
Product requirements
MVP scope
Student learning model
User journeys
System architecture
Database design
API design
Security & authentication
AI & personalization engine
Background processing
Frontend architecture & UX
Testing strategy
Deployment design
Future implementation/deferred roadmap
```

Architecture audit:

```text
🟢 Complete
```

---

# 22. Current Major Milestone

## Milestone 1 — Foundation Implementation

Status:

```text
██████████████░░░░░░  IN PROGRESS
```

Completed foundation work:

```text
Repository/project setup
Backend foundation
Database connection
User model
RefreshSession model
Authentication foundation
Authorization foundation
Users API
User account management
Account deactivation
Account reactivation
```

Remaining foundation work:

```text
Implementation cleanup/hardening
Environment configuration
Profile/onboarding foundation
Frontend foundation
Testing foundation
```

Do not start advanced AI functionality before the foundation is stable.

---

# 23. Recommended Implementation Order

The initial implementation should follow vertical slices.

Recommended order:

```text
1. Repository/project setup                     [🟢]
2. Backend foundation                           [🟢]
3. Database connection                          [🟢]
4. User/identity foundation                     [🟢]
5. Authentication & verification                [🟢]
6. Role-based authorization                     [🟢]
7. Users and account-management APIs             [🟢]
8. Learner/Instructor profiles & onboarding      [⬜]
9. Frontend foundation                           [⬜]
10. Application shell                            [⬜]
11. Student course foundation                    [⬜]
12. Enrollment                                   [⬜]
13. Lessons                                      [⬜]
14. Assessments                                  [⬜]
15. Learning evidence                            [⬜]
16. Mastery                                      [⬜]
17. Personalization                              [⬜]
18. Instructor course management                 [⬜]
19. Instructor assessments/question bank         [⬜]
20. Instructor analytics                         [⬜]
21. Admin platform features                      [⬜]
22. Background processing                        [⬜]
23. Advanced AI                                  [⬜]
24. Full automated testing                       [⬜]
25. Deployment                                   [⬜]
```

This is a recommended sequence, not an immutable rule.

Dependencies may change the exact order.

---

# 24. Current Active Task

Current milestone:

```text
Milestone 1 — Foundation Implementation
```

Current completed implementation slice:

```text
Authentication
Authorization
Users API
User account management
Account deactivation
Account reactivation
```

Current status:

```text
Implemented and manually verified through API testing.
```

Current immediate next focus:

```text
Synchronize documentation
        ↓
Finish foundation hardening where required
        ↓
Implement Learner/Instructor profile and onboarding foundation
        ↓
Begin frontend foundation
        ↓
Proceed into the first approved vertical learning slice
```

This section must be updated whenever the active task changes.

---

# 25. Current Blockers

Current status:

```text
No known implementation blocker.
```

When a blocker appears, record:

```text
Blocker:
Impact:
Cause:
Possible solutions:
Decision required:
Owner:
Status:
```

Do not hide blockers.

---

# 26. Open Decisions

Only genuinely unresolved decisions belong here.

Current implementation-level decisions still open include:

```text
Exact AI provider/model
Exact frontend data-fetching library
Exact deployment provider
Exact email/notification provider
Exact file-storage provider
```

These are implementation decisions, not reasons to change the approved architecture.

Once decided:

```text
Discuss
  ↓
Approve
  ↓
Record decision
  ↓
Remove from open decisions
  ↓
Add to change log
```

Do not keep already-resolved architectural decisions listed as open.

---

# 27. Approved Decisions That Must Not Be Silently Changed

The following are architectural/product constraints:

```text
Modular monolith for initial backend

Backend is authoritative for business rules

JWT access + refresh-token authentication

Durable RefreshSession records

Role-based access control

Roles:
LEARNER
INSTRUCTOR
ADMIN

Public signup may select LEARNER or INSTRUCTOR only

ADMIN is provisioned separately

One account has one platform role in MVP

Teacher/instructor-owned course boundaries

Prerequisites may be configured by instructor

Diagnostic assessment can be required by instructor

Lesson unlocking follows approved learning rules

Unanswered assessment questions are meaningful evidence

Question pools support meaningful retry variation

Personalization is evidence-driven

Mastery uses five categories:
Weak
Developing
Functional
Strong
Mastered

Mastery below 60% is a weakness-candidate threshold

Intervention thresholds are distinct from mastery categories

Below 50% prioritizes review/remediation

50–70% prioritizes targeted practice

Above 70% generally supports continuation

Hard constraints override AI recommendations

Most specific useful intervention is preferred

Intervention escalates when insufficient

AI does not control authorization or authoritative scoring

Background jobs use Redis/BullMQ where appropriate

Frontend is not a security boundary

Testing covers the core learning loop
```

Any change to these requires explicit discussion and documentation update.

---

# 28. Antigravity Rules

Antigravity is a coding partner, not the project architect.

It may:

```text
Implement approved designs
Generate boilerplate
Refactor repetitive code
Suggest improvements
Write tests
Debug errors
Use official documentation through connected tools
```

It must not silently:

```text
Change architecture
Invent APIs
Invent database fields
Change authorization rules
Change assessment rules
Change personalization rules
Replace approved authentication behavior
Introduce unnecessary dependencies
Delete important project functionality
```

If it believes a design should change:

```text
Stop
Explain reason
Propose change
Discuss
Update documentation
Then implement
```

---

# 29. Coding Contribution Strategy

The developer should actively contribute to:

```text
Models
Controllers
Services
Business logic
API integration
Tests
Debugging
Architecture decisions
```

Antigravity can refine, review, generate boilerplate, and help implement repetitive parts.

The goal is not:

```text
AI writes everything
```

The goal is:

```text
Developer understands + decides
        +
AI accelerates implementation
        =
Smarter development
```

---

# 30. Definition of Feature Complete

A feature is not considered complete merely because the UI or backend code works.

A feature should satisfy:

```text
Requirements
+
Backend implementation
+
Database behavior
+
API
+
Authorization
+
Frontend where applicable
+
Loading/error/empty states where applicable
+
Tests
+
Security checks
+
Documentation alignment
```

Manual testing alone does not automatically satisfy the complete automated-testing requirement.

---

# 31. Definition of MVP Complete

The MVP is complete when a learner can reliably perform:

```text
Signup
  ↓
Login
  ↓
Discover/enroll
  ↓
Complete prerequisite/diagnostic where required
  ↓
Learn lessons
  ↓
Access approved resources
  ↓
Practice
  ↓
Take assessment
  ↓
Receive result
  ↓
Learning evidence recorded
  ↓
Weakness identified
  ↓
Personalized intervention
  ↓
Improve
  ↓
Reassess
  ↓
Continue learning
```

Instructor must also be able to:

```text
Create course
  ↓
Create lessons
  ↓
Add resources
  ↓
Create question pool
  ↓
Configure assessment
  ↓
Publish
  ↓
See enrolled learners
  ↓
View course analytics
```

Admin must have the minimum approved operational controls.

---

# 32. Post-MVP Backlog

Ideas that should not distract from the MVP:

```text
Advanced gamification
Leaderboards
Social learning
Live classes
Advanced recommendation models
Advanced predictive analytics
Mobile application
Real-time collaboration
Complex microservice decomposition
Advanced AI tutoring
Voice-based learning
Advanced adaptive assessment
```

These may be evaluated after MVP stability.

Deferred implementation items already approved in `15-future-implementation.md` include:

```text
Email verification
Forgot/reset password
Account linking / Connect Google
Optional password for Google-only accounts
Trusted instructor verification
Advanced study scheduling
Advanced notifications
Advanced recommendation scheduling
Advanced personalization signals
```

---

# 33. Technical Debt Register

When technical debt is intentionally accepted, record:

```text
ID:
Area:
Debt:
Reason:
Risk:
Future solution:
Priority:
```

Example:

```text
TD-001

Area: Analytics

Debt: Initial analytics uses simple aggregation

Reason: MVP

Risk: Limited scalability

Future: Pre-aggregated analytics

Priority: Medium
```

---

# 34. Change Log

Every important approved project change should be recorded.

Format:

```text
Date:
Document:
Change:
Reason:
Impact:
Status:
```

Initial changes:

```text
Date: Initial project-control creation

Document: 13-current-progress.md

Change: Created living project-control document

Reason: Track implementation state after architecture phase

Impact: Establishes a single current-status reference

Status: Active
```

```text
Date: September 2026

Document:
06-database-design.md
07-api-design.md
08-security-authentication.md

Change: Finalized user account-state semantics and
user-management boundaries.

Reason: Align documentation with the implemented authentication
and authorization design.

Impact:
DEACTIVATED is user-initiated.
SUSPENDED is Admin/platform-controlled.
Admin cannot change roles.
User-management operations are handled through the Users API.

Status: Active
```

```text
Date: September 2026

Document: 07-api-design.md

Change: Added change-password API and finalized Users API boundaries.

Reason: Complete the authentication foundation and separate user
management from Admin-specific platform operations.

Impact:
Users API handles user account management.
Admin API remains focused on platform-level operations.

Status: Active
```

```text
Date: September 2026

Document:
01-product-requirements.md
03-student-learning-model.md
04-user-journeys.md
06-database-design.md
07-api-design.md
09-ai-personalization-engine.md
11-frontend-architecture-ux.md

Change: Finalized Learner/Instructor onboarding and shared learning
domain taxonomy.

Reason: Remove ambiguity before profile/onboarding implementation.

Impact:
Learner onboarding uses five fixed questions.
Instructor onboarding uses two fixed questions.
Learning domains are shared between learner interests and instructor expertise.
No Department-based personalization.

Status: Active
```

```text
Date: September 2026

Document:
09-ai-personalization-engine.md
10-background-processing-design.md

Change: Finalized evidence-driven personalization and background
processing boundaries.

Reason: Establish deterministic system authority and safe AI/background
processing boundaries.

Impact:
AI enhances rather than controls authoritative learning decisions.
Authoritative results are persisted before downstream background processing.
Redis/BullMQ workers handle appropriate asynchronous work.

Status: Active
```

```text
Date: September 2026

Document:
14-deployment.md

Change: Finalized MVP deployment architecture.

Reason: Establish a simple, secure, observable deployment path without
premature infrastructure complexity.

Impact:
Initial production model uses frontend, API, worker, managed MongoDB,
managed Redis/BullMQ, and controlled AI integration.

Status: Active
```

---

# 35. Progress Status Legend

Use:

```text
⬜ Not started
🟡 In progress
🟢 Complete
🔴 Blocked
🟠 Needs review
⚪ Deferred
```

Do not mark something complete merely because code exists.

A complete implementation should meet the project's relevant definition of done.

---

# 36. Weekly/Session Review

At the end of a meaningful development session, review:

```text
What was completed?

What failed?

What changed?

What remains?

Any new blocker?

Any architecture decision?

Any documentation update?

Any regression?

What is the next task?
```

Update this document whenever the answer materially changes project status.

---

# 37. Project Health Checklist

Current baseline:

```text
Architecture clarity                  🟢
Documentation completeness            🟢
MVP definition                        🟢
Student learning model                🟢
Personalization policy                🟢
Frontend architecture                 🟢
Testing strategy                      🟢
Deployment design                     🟢

Backend foundation                    🟢
Authentication foundation             🟢
Authorization foundation              🟢
Users/account management              🟢

Feature implementation                ⬜
Frontend implementation                ⬜
Automated testing                      ⬜
Background processing                  ⬜
AI/personalization implementation      ⬜
Deployment implementation              ⬜
```

---

# 38. Final Project Control Rule

This document must remain concise enough to be useful but detailed enough to reflect actual project state.

It should not become another copy of the architecture documents.

Its primary questions are:

```text
Where are we?

What is finished?

What are we doing now?

What comes next?

What is blocked?

What changed?
```

---

# 39. Final Status Snapshot

```text
                         PROJECT STATUS

Planning / Architecture

████████████████████  COMPLETE


Backend Foundation

████████████████████  COMPLETE


Identity / Authentication / Authorization

████████████████████  COMPLETE


Account & Users Management

████████████████████  COMPLETE


Profile / Onboarding

░░░░░░░░░░░░░░░░░░░░  NOT STARTED


Feature Implementation

░░░░░░░░░░░░░░░░░░░░  NOT STARTED


Frontend

░░░░░░░░░░░░░░░░░░░░  NOT STARTED


Testing

░░░░░░░░░░░░░░░░░░░░  NOT STARTED


Background Processing

░░░░░░░░░░░░░░░░░░░░  NOT STARTED


Deployment

░░░░░░░░░░░░░░░░░░░░  NOT STARTED


CURRENT PHASE:

Implementation

CURRENT MILESTONE:

Milestone 1 — Foundation

CURRENT PRIORITY:

Finish foundation hardening and begin
Learner/Instructor profile + onboarding implementation

NEXT:

Profile / Onboarding
→ Frontend Foundation
→ First Vertical Learning Slice
```

---

# 40. Documentation Integrity Rule

Because these documents form the shared reference for the developer and Antigravity:

```text
Filename changes
      ↓
Update references everywhere
      ↓
Verify document numbering
      ↓
Verify dependency relationships
      ↓
Only then continue implementation
```

A document number must always refer to one unambiguous responsibility.

Current mapping:

```text
08 → Security & Authentication
09 → AI & Personalization Engine
10 → Background Processing
11 → Frontend Architecture & UX
12 → Testing Strategy
13 → Current Progress
14 → Deployment
15 → Future Implementation
```

This mapping is authoritative for the project.

---

# 41. Final Principle

> **Never lose the project state.**

When implementation becomes complicated, return to this document.

The project should always make it possible to answer:

```text
What are we building?

Why are we building it?

What has already been decided?

What has already been implemented?

What is currently broken?

What should I work on next?
```

That is the purpose of `13-current-progress.md`.
