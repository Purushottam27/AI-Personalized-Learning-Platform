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

Learner/Instructor profile APIs         🟢 Implemented
Learner/Instructor onboarding           🟢 Implemented & manually verified
Course/domain backend features          🟢 Implemented
Topic/lesson/resource backend features  🟢 Implemented
Question bank & practice backend        🟢 Implemented
Assessment backend features             🟢 Implemented
Enrollment backend features             🟢 Implemented
Learning evidence & topic mastery       🟢 Implemented
Personalization backend engine          🟢 Implemented
Analytics backend APIs                  🟢 Implemented
Frontend instructor workspace           🟢 Implemented (Courses, Topics, Lessons, Resources, QB, Practice, Analytics)
Frontend learner core                   🟢 Implemented (Dashboard, Analytics, Practice, Course Discovery, Enrollment, Assessment Runner)
Frontend instructor assessments         🟢 Implemented (Assessment authoring, Question selection matching Practice UX, Edit action, Lifecycle banners)
Automated testing                       🟡 In progress (17+ backend test suites active; frontend tests pending)
Redis/BullMQ implementation              🟡 In progress (Worker architecture designed; in-process event processing active)
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
├── 08-security-authentication-design.md
├── 09-ai-personalization-engine-design.md
├── 10-background-processing-design.md
├── 11-frontend-architecture-ux-design.md
├── 12-testing-strategy.md
├── 13-current-progress.md
├── 14-deployment.md
└── 15-future-implementation.md
```

The exact filenames in the repository are authoritative.

The current intended naming is:

```text
08-security-authentication-design.md
09-ai-personalization-engine-design.md
10-background-processing-design-design.md
11-frontend-architecture-ux-design.md
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

## Learner Profile & Onboarding

```text
Learner profile model                🟢
Learner profile GET                  🟢
Learner profile PATCH                🟢
Learner onboarding                   🟢
Progressive onboarding               🟢
Onboarding resume                    🟢
Onboarding state tracking            🟢
Role-based profile access            🟢
```

## Learner Dashboard

```text
Dashboard shell                      🟢 Implemented in FE
Continue learning                    🟢 Implemented via analytics overview
Next best action                     🟢 Connected to recommendations
Course progress                      🟢 Implemented
Strengths                            🟢 Implemented via mastery
Weaknesses                           🟢 Implemented via mastery
Recommendations                     🟢 Connected in FE dashboard
Study summary                        🟢 Implemented
```

## Course Experience

```text
Course discovery                     🟢 Backend implemented / 🟡 FE in progress (replacing explore placeholder)
Course search                        🟢 Backend implemented / 🟡 FE in progress
Domain filter                        🟢 Backend implemented / 🟡 FE in progress
Course details                       🟢 Backend implemented / 🟡 FE in progress
Enrollment                           🟢 Backend implemented / 🟡 FE in progress (replacing my-courses placeholder)
Prerequisite handling                🟢 Backend implemented / 🟡 FE in progress
Diagnostic assessment                🟢 Backend implemented / 🟡 FE in progress
Course progress                      🟢 Backend implemented / 🟢 Connected in FE Dashboard
```

The project uses **domain/category**, not Department, for course classification.

## Learning

```text
Lesson list                          🟢 Backend implemented / 🟡 FE in progress
Lesson unlocking                     🟢 Backend enforced / 🟡 FE in progress
Lesson explanation                   🟢 Backend implemented / 🟡 FE in progress
Examples                             🟢 Backend implemented / 🟡 FE in progress
Instructor resources                 🟢 Backend implemented / 🟡 FE in progress
YouTube resource support             🟢 Backend implemented / 🟡 FE in progress
PDF/PPT resource support             🟢 Backend implemented / 🟡 FE in progress
Lesson completion                    🟢 Backend implemented / 🟡 FE in progress
```

## Assessment

```text
Question display                     🟢 Backend implemented / 🟡 FE in progress
Options                              🟢 Backend implemented / 🟡 FE in progress
Previous/Next                        🟡 FE in progress
Question navigator                   🟡 FE in progress
Timer                                🟢 Backend enforced / 🟡 FE in progress
Unanswered state                     🟢 Backend preserved & scored / 🟡 FE in progress
Submission                           🟢 Backend implemented / 🟡 FE in progress
Scoring                              🟢 Backend deterministic scoring / 🟡 FE in progress
Result                               🟢 Backend result calculation / 🟡 FE in progress
Question-pool variation              🟢 Backend implemented / 🟡 FE in progress
```

## Personalization

```text
Learning event capture               🟢 Backend implemented (LearningEvidence)
Topic performance                    🟢 Backend implemented (TopicMastery)
Mastery calculation                  🟢 Backend implemented (5 tiers: WEAK, DEVELOPING, FUNCTIONAL, STRONG, MASTERED)
Weakness detection                   🟢 Backend implemented (< 60% threshold)
Intervention selection               🟢 Backend implemented (6 granularity levels)
Recommendation                      🟢 Backend implemented (Recommendation service & API)
Remediation                          🟢 Backend implemented
Reassessment                         🟢 Backend implemented
```

---

# 10. Instructor MVP Status

```text
Instructor authentication            🟢 Foundation shared with auth
Instructor onboarding                🟢 Implemented & verified
Instructor profile                   🟢 Implemented & verified
Instructor dashboard                 🟢 Implemented in FE
Create course                        🟢 Implemented (BE + FE)
Edit course                          🟢 Implemented (BE + FE)
Course domain                        🟢 Implemented (BE + FE)
Prerequisites                        🟢 Implemented (BE + FE)
Learning objectives                  🟢 Implemented (BE + FE)
Create lesson                        🟢 Implemented (BE + FE)
Edit lesson                          🟢 Implemented (BE + FE)
Add resources                        🟢 Implemented (BE + FE with Cloudinary upload)
Question bank                        🟢 Implemented (BE + FE)
Practice management                  🟢 Implemented (BE + FE)
Create assessment                    🟢 Backend implemented / 🟡 FE tab integration pending
Configure marks                      🟢 Backend implemented / 🟡 FE tab integration pending
Configure pass threshold             🟢 Backend implemented / 🟡 FE tab integration pending
Question pool                        🟢 Backend implemented / 🟡 FE tab integration pending
Publish course                       🟢 Implemented (BE + FE)
View enrolled learners               🟢 Backend implemented
View course analytics                🟢 Implemented (BE + FE)
View topic weaknesses                🟢 Implemented (BE + FE)
Instructor profile/settings          🟢 Implemented (BE + FE)
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
Admin authentication                 🟢 Implemented
Admin dashboard                      🟢 Implemented (shell & navigation)
User management                      🟢 Implemented (BE + FE)
Course management                    🟡 Backend course APIs active
Platform analytics                   ⬜ Not started
Audit logs                           ⬜ Not started
Moderation                           ⬜ Not started
Administrative controls              🟢 Implemented
Admin settings                       ⬜ Not started
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
User model                          🟢 Implemented
LearnerProfile model                🟢 Implemented
InstructorProfile model             🟢 Implemented
AuthIdentity model                  ⬜ Deferred
RefreshSession model                🟢 Implemented
OAuthSetupSession model             ⬜ Deferred

Course model                        🟢 Implemented
Topic model                         🟢 Implemented
Lesson model                        🟢 Implemented
Resource model                      🟢 Implemented
Enrollment model                    🟢 Implemented
Assessment model                    🟢 Implemented
Assessment attempt model            🟢 Implemented
Question Bank model                 🟢 Implemented
Question model                      🟢 Implemented
Question Import model               🟢 Implemented
Practice model                      🟢 Implemented
Practice Attempt model              🟢 Implemented
Learning Evidence model             🟢 Implemented
Topic Mastery (Mastery record)      🟢 Implemented
Recommendation (service model)      🟢 Implemented
Intervention model                  🟢 Derived via recommendation engine
Notification model                  ⬜ Deferred
Audit log model                     ⬜ Deferred
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

Approved logical modular-monolith boundaries include 19 active backend modules:

```text
auth                                  🟢 Implemented (signup, login, refresh, logout, password, reactivate)
users                                 🟢 Implemented (profiles, avatar, deactivation, admin management)
learnerProfile                        🟢 Implemented (5-step progressive onboarding, profile CRUD)
instructorProfile                     🟢 Implemented (2-step onboarding, profile CRUD)
course                                🟢 Implemented (CRUD, deterministic publication readiness checks, archive, search, filters)
topic                                 🟢 Implemented (course topics CRUD, reordering, requiredAssessmentIds snapshotting, learner locking)
lesson                                🟢 Implemented (topic lessons CRUD, completion, sequence, topic locking enforcement)
resource                              🟢 Implemented (files, links, Cloudinary signed upload, topic locking enforcement)
enrollment                            🟢 Implemented (enroll, withdraw, learner course tracking)
assessment                            🟢 Implemented (topic/diagnostic/final, pass criteria, pool config, publication snapshotting, archive protection)
assessmentAttempt                     🟢 Implemented (session start with topic unlock & final assessment gating, timer, submit, scoring)
questionBank                          🟢 Implemented (question banks, questions, bulk import via Excel)
practice                              🟢 Implemented (topic practice definitions, question pool)
practiceAttempt                       🟢 Implemented (practice sessions, submission, answer review)
learningEvidence                      🟢 Implemented (event capture, deduping, attempt contributions)
topicMastery                          🟢 Implemented (5-tier mastery recalculation, weakness detection)
recommendation                        🟢 Implemented (evidence-based recommendations, 6 intervention levels)
analytics                             🟢 Implemented (learner dashboard metrics, instructor course analytics)
admin                                 🟢 Implemented (user moderation, status control, audit view)
```

Modules should be created incrementally around real feature slices rather than generated blindly.

### Course Publication Readiness & Learner Assessment Progression Status (Fully Implemented & Verified)

```text
Readiness Checklist Validation        🟢 Implemented (courseReadiness.service.js)
  - Ownership & Draft Status check    🟢 Verified
  - Sequential Topic Order (1..N)     🟢 Verified
  - Active Resources per Topic (>=1)  🟢 Verified
  - Published Topic Assessment(s)     🟢 Verified (multiple allowed, pool >= questionsPerAttempt)
  - Published Course FINAL Assessment 🟢 Verified (pool >= questionsPerAttempt)
  - Conditional Diagnostic Assessment 🟢 Verified (enforced iff diagnosticPolicy.enabled)
  - Optional Lessons & Practice       🟢 Verified (publish allowed with 0 lessons and 0 practice)
  - Prerequisite Courses (PUBLISHED)  🟢 Verified (draft & archived rejected, UI filtered)
Transactional Publication & Fencing   🟢 Implemented (course.service.js with withTransaction)
  - Durable Snapshotting              🟢 Implemented (Topic.requiredAssessmentIds & Course.publicationRequirements)
  - Lifecycle & Attempt Fences        🟢 Implemented (lifecycleVersion + 1, attemptVersion + 1)
  - Post-publication Non-interference 🟢 Verified (new assessments don't alter existing requirements)
  - Required Assessment Archiving     🟢 Implemented (blocked with 409 CANNOT_ARCHIVE_REQUIRED_ASSESSMENT)
Learner Topic Progression & Locking    🟢 Implemented (topicProgression.service.js)
  - Sequential Topic Unlocking        🟢 Verified (passing all snapshotted required assessments for prior topics)
  - Direct API Locking Protection     🟢 Verified (403 TOPIC_LOCKED for topic, lessons, resources, practice, attempts)
  - Final Assessment Gating           🟢 Verified (403 TOPICS_NOT_COMPLETED if any prior topic incomplete)
Test Suite (25 Tests)                 🟢 100% Passing (backend/tests/course-publication-readiness.test.js)
```

---

# 14. API Implementation Status

The API design is documented in `07-api-design.md`.

Current status:

```text
Auth APIs                           🟢 Implemented
User APIs                           🟢 Implemented
Learner profile APIs                🟢 Implemented
Learner onboarding APIs             🟢 Implemented
Instructor profile APIs             🟢 Implemented
Instructor onboarding APIs          🟢 Implemented
Course APIs                         🟢 Implemented
Enrollment APIs                     🟢 Implemented
Topic APIs                          🟢 Implemented
Lesson APIs                         🟢 Implemented
Resource APIs                       🟢 Implemented
Assessment APIs                     🟢 Implemented
Assessment Attempt APIs             🟢 Implemented
Question Bank & Question APIs       🟢 Implemented
Practice & Practice Attempt APIs    🟢 Implemented
Learning Evidence APIs              🟢 Implemented
Topic Mastery APIs                  🟢 Implemented
Personalization / Recommendation    🟢 Implemented
Analytics APIs                      🟢 Implemented
Admin APIs                          🟢 Implemented
Notification APIs                   ⬜ Deferred
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

## Implemented User APIs

```text
GET    /api/v1/users
GET    /api/v1/users/:userId
PATCH  /api/v1/users/:userId/status
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/avatar
DELETE /api/v1/users/me
```

## Implemented Profile & Onboarding APIs

```text
GET   /api/v1/learner-profile/me
PATCH /api/v1/learner-profile/me
PATCH /api/v1/learner-profile/me/onboarding
GET   /api/v1/instructor-profile/me
PATCH /api/v1/instructor-profile/me
PATCH /api/v1/instructor-profile/me/onboarding
```

## Implemented Course & Topic APIs

```text
GET    /api/v1/courses
POST   /api/v1/courses
GET    /api/v1/courses/:courseId
PATCH  /api/v1/courses/:courseId
POST   /api/v1/courses/:courseId/publish
POST   /api/v1/courses/:courseId/archive
GET    /api/v1/courses/:courseId/topics
POST   /api/v1/courses/:courseId/topics
GET    /api/v1/topics/:topicId
PATCH  /api/v1/topics/:topicId
DELETE /api/v1/topics/:topicId
PATCH  /api/v1/courses/:courseId/topics/reorder
```

## Implemented Lesson & Resource APIs

```text
GET    /api/v1/topics/:topicId/lessons
POST   /api/v1/topics/:topicId/lessons
GET    /api/v1/lessons/:lessonId
PATCH  /api/v1/lessons/:lessonId
DELETE /api/v1/lessons/:lessonId
POST   /api/v1/lessons/:lessonId/complete
GET    /api/v1/topics/:topicId/resources
POST   /api/v1/topics/:topicId/resources
PATCH  /api/v1/resources/:resourceId
DELETE /api/v1/resources/:resourceId
POST   /api/v1/resources/upload-signature
```

## Implemented Enrollment APIs

```text
POST   /api/v1/courses/:courseId/enroll
GET    /api/v1/users/me/enrollments
GET    /api/v1/enrollments/:enrollmentId
POST   /api/v1/enrollments/:enrollmentId/withdraw
```

## Implemented Question Bank, Practice, & Assessment APIs

```text
GET    /api/v1/topics/:topicId/question-banks
POST   /api/v1/topics/:topicId/question-banks
GET    /api/v1/question-banks/:id
PATCH  /api/v1/question-banks/:id
POST   /api/v1/question-banks/:id/questions
POST   /api/v1/question-banks/:id/import
GET    /api/v1/topics/:topicId/practices
POST   /api/v1/topics/:topicId/practices
GET    /api/v1/practices/:id
PATCH  /api/v1/practices/:id
POST   /api/v1/practices/:id/attempts
GET    /api/v1/practice-attempts/:id
GET    /api/v1/topics/:topicId/assessments
POST   /api/v1/topics/:topicId/assessments
GET    /api/v1/assessments/:id
PATCH  /api/v1/assessments/:id
POST   /api/v1/assessments/:id/publish
POST   /api/v1/assessments/:id/archive
POST   /api/v1/assessments/:id/restore
POST   /api/v1/assessments/:id/attempts
GET    /api/v1/assessment-attempts/:id
POST   /api/v1/assessment-attempts/:id/submit
GET    /api/v1/assessment-attempts/:id/result
```

## Implemented Evidence, Personalization, & Analytics APIs

```text
POST   /api/v1/learning-evidence/events
GET    /api/v1/learning-evidence/me
GET    /api/v1/topic-mastery/me
GET    /api/v1/topic-mastery/me/topics/:topicId
GET    /api/v1/recommendations/me
POST   /api/v1/recommendations/me/refresh
GET    /api/v1/learning/me/dashboard
GET    /api/v1/learning/me/analytics/overview
GET    /api/v1/learning/me/courses/:courseId/progress
GET    /api/v1/instructor/analytics/courses/:courseId
```

---

# 15. Security & Authentication Status

Approved security and authentication design exists in `08-security-authentication.md`.

Current implementation:

```text
Authentication foundation             🟢 Implemented
Signup                                🟢 Implemented
Login                                 🟢 Implemented
Access-token handling                 🟢 Implemented
Refresh-token handling                🟢 Implemented
Refresh-token rotation                🟢 Implemented
Logout                                🟢 Implemented
Authentication middleware             🟢 Implemented
Protected routes                      🟢 Implemented
Current user (/me)                    🟢 Implemented
Role-based authorization              🟢 Implemented
Password change                       🟢 Implemented
Account deactivation                  🟢 Implemented
Account reactivation                  🟢 Implemented

Teacher/Instructor ownership auth     🟢 Implemented (course, topic, lesson, resource, assessment, QB ownership verified)
Input validation                      🟢 Implemented with Zod schemas
Rate limiting                         🟢 Implemented (express-rate-limit)
Cookie production hardening           🟡 Configured for HTTPS in production
Sensitive-data protection             🟢 Password hashing (bcryptjs), projection sanitization
File-upload security                  🟢 Cloudinary signed params, MIME checks, size limits
Audit/security logging                🟡 Standard request logging active
Security testing                      🟢 Auth & authorization test suites active
Google OAuth security                 ⬜ Deferred
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
Learning evidence model                🟢 Implemented
Mastery calculation                    🟢 Implemented (5 categories: WEAK, DEVELOPING, FUNCTIONAL, STRONG, MASTERED)
Weakness detection                     🟢 Implemented (< 60% mastery threshold)
Intervention selection                 🟢 Implemented (6 granularity levels: COURSE, TOPIC, LESSON, RESOURCE, PRACTICE, ASSESSMENT)
Intervention intensity                 🟢 Implemented (LOW, MEDIUM, HIGH)
Recommendation ranking                 🟢 Implemented (urgency-weighted scoring)
Escalation logic                       🟢 Implemented (escalates when lower granularity insufficient)
Effectiveness evaluation               🟡 In progress
AI provider integration                🟢 Implemented (service abstraction)
AI output validation                   🟢 Implemented (Zod schema validation)
AI fallback                            🟢 Implemented (heuristic rule fallback)
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
Redis setup                          🟡 Development config ready
BullMQ setup                         🟡 Worker patterns designed
Queue definitions                    🟡 Queues mapped for heavy workloads
Worker structure                     🟡 Background job handlers structured
Retry strategy                       🟢 Backoff and retry policies designed
Backoff strategy                     🟢 Exponential backoff configured
Idempotency                          🟢 Event deduplication in learningEvidence service
Failed-job handling                  🟡 Error capture implemented
Graceful shutdown                    🟢 Database & worker connection handling
Queue monitoring                     ⬜ Not started
Reconciliation                       ⬜ Not started
```

In-process asynchronous event handling currently executes learning evidence and mastery calculations reliably, ready for BullMQ worker decoupling as scale requires.

---

# 18. Frontend Status

Approved architecture exists in `11-frontend-architecture-ux.md`.

Current implementation:

```text
Project setup                         🟢 Implemented (Vite + React 19 + TypeScript)
Design system                         🟢 Implemented (Tailwind CSS 4, CSS variable tokens)
Theme                                 🟢 Implemented (Warm dark/light palette)
Application shell                     🟢 Implemented (TopNav, Sidebar, responsive layouts)
API client                            🟢 Implemented (Axios with auto-refresh token interceptor)
Authentication state                  🟢 Implemented (AuthContext + persistent session)
Role routing                          🟢 Implemented (ProtectedRoutes, RoleRoute)
Learner layout                        🟢 Implemented
Instructor layout                     🟢 Implemented
Admin layout                          🟢 Implemented
Learner dashboard                     🟢 Implemented & connected to analytics/recommendations
Course experience                     🟢 Implemented (Catalog, Detail, Enrollment, Course Study)
Lesson experience                     🟢 Implemented (Course Study viewer, Content, Video, Markdown)
Assessment UI                         🟢 Implemented (Authoring, Question Picker matching Practice UX, Edit action, Lifecycle banners, Overview & Session runners)
Personalization UI                    🟢 Connected on Learner Dashboard
Analytics UI                          🟢 Implemented (Learner & Instructor views)
Instructor UI                         🟢 Implemented (Courses, Topics, Lessons, Resources, QB, Practice)
Admin UI                              🟢 Implemented (User management)
```

---

# 19. Testing Status

Approved testing strategy exists in `12-testing-strategy.md`.

Current implementation:

```text
Linting                              🟢 Implemented (OxLint / ESLint)
Unit tests                           🟢 Implemented (Node test runner)
Component tests                      ⬜ Not started
Integration tests                    🟢 Implemented (17 backend integration suites)
API tests                            🟢 Implemented
E2E tests                            ⬜ Not started
Security tests                       🟢 Implemented (Auth & ownership suites)
Performance baseline                 ⬜ Not started
AI evaluation tests                  ⬜ Deferred
Background-job tests                 ⬜ Not started
Regression suite                     🟢 Active
```

The implemented authentication, user-management, learner-profile, learner-onboarding, instructor-profile, and instructor-onboarding features have been manually verified through API testing. This does not count as the automated testing suite being complete.

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
████████████████████  COMPLETE
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
LearnerProfile model & 5-step progressive onboarding
InstructorProfile model & 2-step progressive onboarding
Frontend application shell & authentication routing
19 backend domain modules implemented
17+ backend automated test suites active
```

---

## Milestone 2 — End-to-End Learning Loop & Frontend Stabilization

Status:

```text
██████████████░░░░░░  IN PROGRESS
```

Active work:

```text
1. Learner Course Discovery & Enrollment UI integration
2. Instructor Assessment Management UI integration
3. Learner Assessment Runner UI integration
4. Personalization evidence loop verification
```

---

# 23. Recommended Implementation Order

The initial implementation follows vertical slices:

```text
1. Repository/project setup                     [🟢]
2. Backend foundation                           [🟢]
3. Database connection                          [🟢]
4. User/identity foundation                     [🟢]
5. Authentication & verification                [🟢]
6. Role-based authorization                     [🟢]
7. Users and account-management APIs             [🟢]
8. Learner/Instructor profiles & onboarding      [🟢]
9. Frontend foundation & app shell               [🟢]
10. Instructor course management                 [🟢]
11. Topic, lesson, and resource management       [🟢]
12. Question bank & practice authoring           [🟢]
13. Student course discovery & enrollment        [🟡 BE 🟢 / FE 🟡]
14. Learner lesson & resource experience         [🟡 BE 🟢 / FE 🟡]
15. Assessment authoring & session runner        [🟡 BE 🟢 / FE 🟡]
16. Learning evidence & event capture            [🟢]
17. Topic mastery recalculation                  [🟢]
18. Evidence-driven personalization & recommend  [🟢]
19. Instructor & Learner analytics               [🟢]
20. Admin user management                        [🟢]
21. Background processing decoupling             [🟡]
22. Advanced AI tutoring integration             [🟡]
23. Full automated test suite                    [🟡]
24. Deployment pipeline                          [⬜]
```

---

# 24. Current Active Task

Current milestone:

```text
Milestone 2 — End-to-End Learning Loop & Frontend Stabilization
```

Current completed implementation slice:

```text
Full Backend 19-module suite
Instructor course/topic/lesson/resource/practice workspace
Learner dashboard & analytics overview
17+ backend integration test suites
```

Current immediate next focus:

```text
Replace Learner Explore & My Courses placeholders with real course discovery & enrollment
        ↓
Connect Instructor Assessment Management in TopicWorkspacePage
        ↓
Implement Learner Assessment Session & Results UI
        ↓
Verify learning evidence generation from submitted assessment attempts
        ↓
Run full backend test suite & frontend typecheck
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
09-ai-personalization-engine-design.md
11-frontend-architecture-ux-design.md

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
09-ai-personalization-engine-design.md
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

Feature implementation                🟢 Backend Complete / 🟡 Frontend In Progress
Frontend implementation                🟡 In progress (Instructor complete, Learner in progress)
Automated testing                      🟡 In progress (17+ backend test suites active)
Background processing                  🟡 In progress (In-process active, BullMQ worker architecture ready)
AI/personalization implementation      🟢 Implemented (evidence, mastery, recommendations)
Deployment implementation              ⬜ Not started
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


Backend Foundation & 19 Modules

████████████████████  COMPLETE


Identity / Authentication / Authorization

████████████████████  COMPLETE


Account & Users Management

████████████████████  COMPLETE


Profile / Onboarding

████████████████████  COMPLETE


Domain Feature Implementation

████████████████░░░░  BACKEND COMPLETE / FRONTEND IN PROGRESS


Frontend

██████████████░░░░░░  IN PROGRESS (Instructor 🟢, Learner 🟡)


Testing

██████████████░░░░░░  IN PROGRESS (17 Backend Suites 🟢)


Background Processing

██████████░░░░░░░░░░  IN PROGRESS (In-process active, Worker queues designed)


Deployment

░░░░░░░░░░░░░░░░░░░░  NOT STARTED


CURRENT PHASE:

Integration & Stabilization

CURRENT MILESTONE:

Milestone 2 — End-to-End Learning Loop & Frontend Stabilization

CURRENT PRIORITY:

Connect Learner Course Discovery, Enrollment, and Assessment Runner to complete the full learner journey

NEXT:

Learner Explore & My Courses UI
→ Instructor Assessment Tab Integration
→ Learner Assessment Session & Submission UI
→ Full Test Suite Run & Type-Check
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
