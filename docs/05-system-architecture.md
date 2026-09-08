# AI Based Personalized Learning Platform — System Architecture

## 1. Purpose**

Defines the technical architecture for the approved product, MVP scope, learner learning model, and user journeys.

## 2. Primary Decision**

The MVP uses a **\*\*modular monolith\*\***.

```text

React Frontend

      ↓ HTTPS

Express REST API

      ↓

Modular Backend

 ├── Identity/Auth

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

The principle is: **\*\*design for extraction, not for distribution\*\***. Modules have clear boundaries but initially run in one backend.

## 3. Why Modular Monolith**

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

## 4. Frontend**

React is organized by features/domains:

```text

features/

├── auth

├── learner

├── instructor

├── admin

├── courses

├── lessons

├── assessments

├── analytics

└── recommendations

```

Shared components handle reusable UI.

Frontend role checks are for UX only; backend authorization is authoritative.

## 4A. Frontend Architecture Reference

The frontend uses:

```text
React + TypeScript + Vite
React Router
Tailwind CSS
Framer Motion
shadcn/ui
```

The frontend is feature-oriented and organized around:

```text
src/
├── app/
├── components/
├── features/
├── layouts/
├── pages/
├── routes/
├── services/
├── hooks/
├── lib/
├── stores/
├── types/
└── assets/
```

Shared UI belongs in reusable components. Feature-specific behavior remains
inside feature modules. API communication is centralized through the service
layer rather than duplicated across components.

The frontend follows:

```text
UI
 ↓
Feature
 ↓
State
 ↓
API / Service
 ↓
Backend
```

Frontend role checks and route guards improve UX, but backend authentication,
authorization, ownership, and business rules remain authoritative.

---

## 4B. Backend Technology and Structure

The backend uses:

```text
Node.js
Express.js
JavaScript (ES modules)
MongoDB + Mongoose
Redis
BullMQ
```

The backend is a modular monolith with shared infrastructure and domain
modules.

Conceptually:

```text
backend/src/
├── config/
├── middleware/
├── shared/
└── modules/
    ├── identity/
    ├── users/
    ├── courses/
    ├── lessons/
    ├── resources/
    ├── enrollments/
    ├── questionBank/
    ├── assessments/
    ├── learning/
    ├── personalization/
    ├── recommendations/
    ├── analytics/
    ├── notifications/
    └── admin/
```

Exact file-level structure remains an implementation concern; module
boundaries and responsibilities are the architectural contract.

Express 5 async handlers may forward rejected promises automatically, so a
separate `asyncHandler` abstraction is not required.

---

## 5. Backend Request Flow**

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

## 6. API**

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

## 7. Module Responsibilities**

- **\*\*Auth:\*\*** signup, login, logout, token management, password handling, account reactivation, and authentication-state handling.

- **\*\*Users:\*\*** account information, profiles, preferences, avatars, user-level account management, and administrative user-management operations.

- **\*\*Courses:\*\*** metadata, ownership, domain/category, prerequisites, lifecycle.

- **\*\*Lessons:\*\*** lesson structure, order, availability.

- **\*\*Resources:\*\*** YouTube, files, external references.

- **\*\*Enrollments:\*\*** course membership and enrollment state.

- **\*\*Question Bank:\*\*** questions, options, answers, marks, difficulty, imports.

- **\*\*Assessments:\*\*** attempts, question selection, scoring, results.

- **\*\*Learning:\*\*** progression, unlocking, completion, learning activity.

- **\*\*Analytics:\*\*** learner, instructor, course, and platform aggregations.

- **\*\*Personalization:\*\*** learner state, mastery, weaknesses, interventions.

- **\*\*Recommendations:\*\*** course, lesson, remediation, prerequisite, next action.

- **\*\*Notifications:\*\*** in-app/email notifications and jobs.

- **\*\*Admin:\*\*** platform-level moderation, platform operations, audit actions, and authorized use of the Users module for user management.

Modules communicate through defined service interfaces and lightweight internal events.

## 8. Synchronous vs Asynchronous**

### Synchronous**

- login

- course details

- start/submit assessment

- enrollment

- simple progress reads

### Asynchronous**

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

## 9. Redis and BullMQ**

Redis may provide, where needed:

- caching

- rate limiting

- temporary state

- BullMQ queue backend

- short-lived computed data

MongoDB remains the persistent source of truth.

BullMQ workers handle expensive/non-critical background work.

Kafka/distributed event infrastructure is not required for MVP.

## 10. AI Boundary**

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
- targeted learning recommendations
- natural-language feedback

AI output must pass schema and business-rule validation before influencing
non-authoritative personalization behavior.

AI failure must not prevent assessment submission, scoring, enrollment, progression, or access to existing records.

## 11. Files and External Services**

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

External providers such as YouTube, AI, storage, email, and other external providers should be accessed through dedicated service/adaptor boundaries.

## 11A. File Upload Architecture

For MVP uploads, the backend uses a shared Multer-based upload flow with
temporary local disk storage, followed by Cloudinary upload where applicable.

```text
Multipart Request
      ↓
Multer
      ↓
Temporary Local File
      ↓
Cloudinary Helper
      ↓
Persist External URL / Metadata
      ↓
Cleanup Temporary File
```

Avatar uploads are optional during signup and supported through the dedicated
current-user avatar endpoint. File validation and authorization remain
backend responsibilities.

The architecture should keep provider-specific storage logic behind a
service/helper boundary so storage can evolve later.

---
## 12. Authentication and Authorization**

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

Example instructor access:

```text

Authenticated?

  ↓

Instructor?

  ↓

Course exists?

  ↓

Instructor owns course?

  ↓

Learner enrolled?

  ↓

Allowed course-level data?

```

Account status is checked against the current User record during

authentication.

The platform distinguishes:

```text

ACTIVE

SUSPENDED

DEACTIVATED

```

Suspended or deactivated users cannot access protected resources even if an otherwise valid access token has not yet expired.

When an account becomes SUSPENDED or DEACTIVATED, active refresh sessions

are revoked.

DEACTIVATED users may reactivate their own accounts through the dedicated

reactivation flow. Reactivation does not reuse revoked authentication

sessions; it creates a new authentication session.

SUSPENDED users cannot self-reactivate. Only the Admin/platform can resolve

a suspension.

User role is treated as authoritative from the current User record for authorization decisions.

Role checks alone are insufficient.

Exact token storage, rotation, cookies, revocation, and security controls belong in `08-security-authentication.md`.

## 12A. Google Authentication Setup Boundary

Google authentication uses a separate temporary setup flow for new Google
accounts.

```text
Google Identity
      ↓
Temporary OAuth Setup Session
      ↓
Role Selection
      ↓
Progressive Onboarding
      ↓
Complete Account
      ↓
User + AuthIdentity + role-specific profile
      ↓
Authentication Session
```

The temporary setup state is server-side and short-lived. It is not a
permanent User record and must be invalidated after completion.

The permanent account is not created until the required setup information is
complete.

The exact endpoints are defined in `07-api-design.md`.

---
## 13. Error and Validation Architecture**

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

## 13A. Shared API Response and Error Contract

Successful API responses use the approved envelope:

```json
{
  "success": true,
  "data": {},
  "message": "..."
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "...",
    "message": "...",
    "details": null
  }
}
```

Request validation, authentication, authorization, business-rule, external
service, and internal errors are normalized through the shared error
architecture.

Exact API behavior belongs in `07-api-design.md`.

---
## 14. Reliability**

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

- Analytics delayed → learner continues learning.

- Background job fails → retry according to policy.

## 15. Logging and Observability**

Minimum categories:

```text

Application Logs

Error Logs

Background Job Logs

Audit Logs

Integration Logs

```

Do not log sensitive information unnecessarily.

Audit records should cover important actions such as course publication/archive, moderation, account suspension/unsuspension, and other security-sensitive operations. Role changes are not an MVP operation.

## 16. Database Boundary**

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

## 17. Data Ownership**

Each module has conceptual ownership of its data.

```text

Course → course definition

Enrollment → enrollment relationship

Assessment → attempts

Learning → progression

Personalization → learner-state/recommendation state

```

Modules should not silently modify another module's internal state.

## 17A. Domain Ownership Clarification

The modular monolith must preserve clear domain ownership:

```text
Identity/Auth
→ authentication identities, credentials, sessions, OAuth setup

Users
→ account/profile management and user administration boundaries

Courses
→ course definition, ownership, lifecycle, domain, prerequisites

Lessons
→ lesson structure, ordering, unlocking-related lesson state

Resources
→ learning resources and provider metadata

Enrollments
→ learner-course relationship

Question Bank
→ questions and question-bank management

Assessments
→ assessment configuration, attempts, scoring, results

Learning
→ progression, completion, learning events/evidence

Personalization
→ mastery, weaknesses, interventions, learner-state derivation

Recommendations
→ actionable recommendation records and delivery/read state

Analytics
→ derived aggregations and reporting

Admin
→ governance workflows using explicitly authorized domain operations
```

A module may request another module's public service behavior, but should not
directly mutate another module's internal state.

---
## 18. Scalability**

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

## 19. Testing**

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

- instructor course ownership

- instructor learner-data access

Detailed testing belongs in `12-testing-strategy.md`.

## 20. Development and Deployment Direction**

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

## 20A. Approved Language Strategy**

The MVP uses different languages for the frontend and backend.

```text

Frontend:

React + TypeScript

Backend:

Node.js + Express.js + JavaScript

```

## 21. Technology Selection Principle**

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

## 22. Implementation Rules**

1\. Keep business logic out of routes.

2\. Keep controllers thin.

3\. Keep business rules in services/domain logic.

4\. Never trust frontend authorization.

5\. Never make AI the source of truth for critical state.

6\. Do not store large files in ordinary MongoDB documents.

7\. Do not introduce microservices without evidence.

8\. Use background jobs for expensive asynchronous work.

9\. Keep modules loosely coupled.

10\. Validate AI/external outputs.

11\. Keep critical learning independent of optional services.

12\. Prefer reusable abstractions.

13\. Document major architectural changes before implementation.

14\. Use official documentation for external libraries.

15\. Treat approved project documents as the source of truth.

## 23. Source-of-Truth Hierarchy**

```text

01 Product Requirements

        ↓

02 MVP Scope

        ↓

03 Learner Learning Model

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

## 24. Final Vision**

```text

Learner / Instructor / Admin

          ↓

     React Frontend

          ↓

      REST API

          ↓

   Modular Monolith

          │

     ┌────┴────┐

     ▼         ▼

 MongoDB     Redis

               ↓

            Workers

               ↓

       Analytics / AI /

       Personalization

               ↓

        Better Learning

```

The architecture is designed so that students learn, assessments generate evidence, evidence updates learning state, learning state drives personalization, teachers create and improve content, instructor analytics expose course-level patterns, AI enhances reasoning, and background workers handle expensive work without making the core learning path fragile.
