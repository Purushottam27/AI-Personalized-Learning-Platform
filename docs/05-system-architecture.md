# AI Based Personalized Learning Platform — System Architecture

## 1. Purpose

Defines the technical architecture for the approved product, MVP scope, student learning model, and user journeys.

## 2. Primary Decision

The MVP uses a **modular monolith**.

```text
React Frontend
      ↓ HTTPS
Express REST API
      ↓
Modular Backend
 ├── Auth
 ├── Users
 ├── Courses
 ├── Lessons
 ├── Resources
 ├── Enrollments
 ├── Question Bank
 ├── Assessments
 ├── Learning
 ├── Analytics
 ├── Personalization
 ├── Recommendations
 ├── Notifications
 └── Admin
      │
      ├── MongoDB
      └── Redis → BullMQ → Workers
```

The principle is: **design for extraction, not for distribution**. Modules have clear boundaries but initially run in one backend.

## 3. Why Modular Monolith

Microservices are deferred because they would add unnecessary complexity in service communication, deployment, testing, observability, configuration, and failure handling.

The evolution path is:

```text
Modular Monolith
  ↓
Measure real bottlenecks
  ↓
Optimize
  ↓
Extract only genuinely heavy modules if needed
```

Possible future extraction candidates include Personalization, Analytics, File Processing, and AI Orchestration.

## 4. Frontend

React is organized by features/domains:

```text
features/
├── auth
├── student
├── teacher
├── admin
├── courses
├── lessons
├── assessments
├── analytics
└── recommendations
```

Shared components handle reusable UI.

Frontend role checks are for UX only; backend authorization is authoritative.

## 5. Backend Request Flow

```text
HTTP Request
  ↓
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service / Business Logic
  ↓
Repository / Data Access
  ↓
MongoDB
```

Controllers remain thin. Business rules live in services/domain logic.

## 6. API

Use versioned REST-style endpoints:

```text
/api/v1/auth
/api/v1/users
/api/v1/courses
/api/v1/enrollments
/api/v1/lessons
/api/v1/resources
/api/v1/questions
/api/v1/assessments
/api/v1/learning
/api/v1/analytics
/api/v1/recommendations
/api/v1/admin
```

Exact contracts belong in `07-api-design.md`.

## 7. Module Responsibilities

- **Auth:** signup, login, logout, tokens, password handling.
- **Users:** profiles, preferences, avatars.
- **Courses:** metadata, ownership, department, prerequisites, lifecycle.
- **Lessons:** lesson structure, order, availability.
- **Resources:** YouTube, files, external references.
- **Enrollments:** course membership and enrollment state.
- **Question Bank:** questions, options, answers, marks, difficulty, imports.
- **Assessments:** attempts, question selection, scoring, results.
- **Learning:** progression, unlocking, completion, learning activity.
- **Analytics:** student, teacher, course, and platform aggregations.
- **Personalization:** learner state, mastery, weaknesses, interventions.
- **Recommendations:** course, lesson, remediation, prerequisite, next action.
- **Notifications:** in-app/email notifications and jobs.
- **Admin:** user management, moderation, platform operations, audit actions.

Modules communicate through defined service interfaces and lightweight internal events.

## 8. Synchronous vs Asynchronous

### Synchronous

- login
- course details
- start/submit assessment
- enrollment
- simple progress reads

### Asynchronous

- expensive analytics
- AI analysis
- recommendation processing
- document parsing
- bulk question import
- notifications

Example:

```text
Assessment submitted
  ↓
Save result
  ↓
Return response
  ↓
Background jobs
  ├── analytics
  ├── learning-state update
  └── recommendation processing
```

## 9. Redis and BullMQ

Redis may provide:

- caching
- rate limiting
- temporary state
- BullMQ queue backend
- short-lived computed data

MongoDB remains the persistent source of truth.

BullMQ workers handle expensive/non-critical background work.

Kafka/distributed event infrastructure is not required for MVP.

## 10. AI Boundary

AI is not the source of truth.

```text
Learning Evidence
  ↓
Deterministic Analysis
  ↓
Learning State
  ↓
AI Reasoning
  ↓
Structured Output
  ↓
Backend Validation
  ↓
Recommendation / Feedback
```

Deterministic application logic owns:

- scoring
- pass/fail
- progression
- lesson unlocking
- prerequisite enforcement
- attempts
- authorization
- enrollment
- persistent records

AI assists with:

- explanations
- recommendation reasoning
- remediation suggestions
- learning-plan suggestions
- natural-language feedback

AI failure must not prevent assessment submission, scoring, enrollment, progression, or access to existing records.

## 11. Files and External Services

Large files use object/file storage.

```text
Upload
  ↓
Validate
  ↓
Object Storage
  ↓
Metadata → MongoDB
```

External providers such as YouTube, AI, storage, and email should be accessed through dedicated service/adaptor boundaries.

## 12. Authentication and Authorization

```text
Request
  ↓
Authentication
  ↓
Identity
  ↓
Authorization
  ↓
Resource Ownership
  ↓
Business Rules
```

Example teacher access:

```text
Authenticated?
  ↓
Teacher?
  ↓
Course exists?
  ↓
Teacher owns course?
  ↓
Student enrolled?
  ↓
Allowed course-level data?
```

Role checks alone are insufficient.

Exact token storage, rotation, cookies, revocation, and security controls belong in `11-security.md`.

## 13. Error and Validation Architecture

```text
Route
 ↓
Controller
 ↓
Service
 ↓
Error
 ↓
Central Error Handler
 ↓
Consistent API Response
```

Validation occurs at request and business boundaries. Frontend validation is not a security mechanism.

Error categories include validation, authentication, authorization, not found, conflict, rate limit, external failure, and internal failure.

## 14. Reliability

Critical learning operations must not depend on optional AI, notifications, or delayed analytics.

Critical path:

```text
Authentication
Course Access
Enrollment
Lesson Access
Assessment
Scoring
Progression
Learning Evidence
```

Examples:

- AI unavailable → deterministic learning continues.
- YouTube unavailable → fallback resource/lesson remains usable.
- Notification fails → core action succeeds; retry asynchronously.
- Analytics delayed → student continues learning.
- Background job fails → retry according to policy.

## 15. Logging and Observability

Minimum categories:

```text
Application Logs
Error Logs
Background Job Logs
Audit Logs
Integration Logs
```

Do not log sensitive information unnecessarily.

Audit records should cover important actions such as role changes, course publication/archive, moderation, and security-sensitive operations.

## 16. Database Boundary

MongoDB is the primary persistent store.

Durable domains include:

- users/profiles
- courses/lessons
- resource metadata
- enrollments
- questions/assessments
- attempts
- learning evidence
- mastery
- recommendations
- notifications
- audit records

Detailed schemas and indexes belong in `06-database-design.md`.

## 17. Data Ownership

Each module has conceptual ownership of its data.

```text
Course → course definition
Enrollment → enrollment relationship
Assessment → attempts
Learning → progression
Personalization → learner-state/recommendation state
```

Modules should not silently modify another module's internal state.

## 18. Scalability

Stage 1:

```text
Modular Monolith
MongoDB
Redis
Workers
```

Stage 2:

- indexes
- caching
- more workers
- analytics optimization
- object storage
- horizontal backend instances

Stage 3:

- identify actual bottlenecks
- extract only the modules that need independent scaling

The API should avoid unnecessary in-memory state so multiple instances can serve requests.

## 19. Testing

Support:

```text
Unit
  ↓
Module/Service
  ↓
Integration
  ↓
API
  ↓
End-to-End
```

Priority business logic:

- authentication/authorization
- enrollment
- prerequisites
- scoring
- unanswered handling
- unlocking
- mastery
- recommendations
- teacher course ownership
- teacher student-data access

Detailed testing belongs in `12-testing-strategy.md`.

## 20. Development and Deployment Direction

Local development should support:

```text
React
Express
MongoDB
Redis
BullMQ Worker
```

Environment-specific configuration must be used. Secrets must not be committed.

Initial deployment can remain simple:

```text
Frontend Hosting
      ↓
Backend Hosting
 ├── MongoDB
 ├── Redis
 ├── Object Storage
 └── Worker
```

Exact providers belong in the deployment document.

## 21. Technology Selection Principle

```text
Problem
  ↓
Requirement
  ↓
Options
  ↓
Tradeoffs
  ↓
Simplest adequate solution
```

Do not add technology merely because it sounds production-grade.

## 22. Implementation Rules

1. Keep business logic out of routes.
2. Keep controllers thin.
3. Keep business rules in services/domain logic.
4. Never trust frontend authorization.
5. Never make AI the source of truth for critical state.
6. Do not store large files in ordinary MongoDB documents.
7. Do not introduce microservices without evidence.
8. Use background jobs for expensive asynchronous work.
9. Keep modules loosely coupled.
10. Validate AI/external outputs.
11. Keep critical learning independent of optional services.
12. Prefer reusable abstractions.
13. Document major architectural changes before implementation.
14. Use official documentation for external libraries.
15. Treat approved project documents as the source of truth.

## 23. Source-of-Truth Hierarchy

```text
01 Product Requirements
        ↓
02 MVP Scope
        ↓
03 Student Learning Model
        ↓
04 User Journeys
        ↓
05 System Architecture
        ↓
06+ Detailed Design Documents
        ↓
Implementation
```

If implementation conflicts with an approved decision, discuss and update the decision deliberately rather than silently bypassing it.

## 24. Final Vision

```text
Student / Teacher / Admin
          ↓
     React Frontend
          ↓
      REST API
          ↓
   Modular Monolith
          │
     ┌────┴────┐
     ▼         ▼
 MongoDB     Redis
               ↓
            Workers
               ↓
       Analytics / AI /
       Personalization
               ↓
        Better Learning
```

The architecture is designed so that students learn, assessments generate evidence, evidence updates learning state, learning state drives personalization, teachers create and improve content, teacher analytics expose course-level patterns, AI enhances reasoning, and background workers handle expensive work without making the core learning path fragile.
