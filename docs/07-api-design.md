**# AI Based Personalized Learning Platform — API Design**

**## 1. Purpose**

This document defines the API architecture and endpoint contracts for the AI Based Personalized Learning Platform.

It translates the approved:

\- Product Requirements

\- MVP Scope

\- Learner Learning Model

\- User Journeys

\- System Architecture

\- Database Design

into a consistent backend API contract.

The API is the boundary between the React frontend and the modular-monolith backend.

This document defines:

\- API conventions

\- route organization

\- authentication

\- authorization

\- validation

\- response formats

\- error handling

\- pagination

\- filtering

\- assessment flows

\- learning flows

\- personalization boundaries

\- instructor/admin APIs

\- asynchronous operations

It does not yet define implementation-specific Express route files or controller code.

**---**

**# 2. API Architecture**

The frontend communicates with the backend through versioned HTTP APIs.

\`\`\`text

React Frontend

      │

      │ HTTPS

      ▼

API Gateway / Backend Entry

      │

      ▼

Express Router

      │

      ├── Authentication Middleware

      ├── Authorization Middleware

      ├── Validation Middleware

      ├── Rate Limiting

      └── Request Context

      │

      ▼

Controllers

      │

      ▼

Application Services

      │

      ▼

Domain / Business Logic

      │

      ├── MongoDB

      ├── Redis

      ├── Background Jobs

      └── External Services

\`\`\`

The frontend should never directly access MongoDB, Redis, object storage credentials, or AI-provider credentials.

**---**

**# 3. API Base URL**

All application APIs use:

\`\`\`text

/api/v1

\`\`\`

Example:

\`\`\`text

/api/v1/auth/login

/api/v1/courses

/api/v1/assessments/\:assessmentId

\`\`\`

Versioning allows future changes without immediately breaking existing clients.

**---**

**# 4. API Design Principles**

The API should follow these principles:

1\. Use resource-oriented URLs.

2\. Use standard HTTP methods appropriately.

3\. Keep controllers thin.

4\. Put business rules in services.

5\. Validate every external input.

6\. Never trust client-supplied authorization information.

7\. Never trust client-supplied progress/mastery values.

8\. Use consistent response structures.

9\. Use consistent error structures.

10\. Paginate large collections.

11\. Keep critical learning operations synchronous where appropriate.

12\. Move expensive/non-critical work to background jobs.

13\. Use idempotency where duplicate requests could cause harmful side effects.

14\. Return only data the requesting user is authorized to see.

15\. Keep AI behind a controlled application boundary.

**---**

**# 5. HTTP Methods**

Use HTTP methods consistently.

\`\`\`text

GET       Read

POST      Create / trigger an operation

PUT       Replace a resource where appropriate

PATCH     Partially update

DELETE    Delete/archive where appropriate

\`\`\`

Example:

\`\`\`text

GET    /api/v1/courses

POST   /api/v1/courses

GET    /api/v1/courses/\:courseId

PATCH  /api/v1/courses/\:courseId

DELETE /api/v1/courses/\:courseId

\`\`\`

Deletion should be used carefully for entities with historical dependencies.

For many important entities, archival/status changes are preferable to destructive deletion.

**---**

**# 6. Resource Naming**

Use plural resource names.

Preferred:

\`\`\`text

/courses

/lessons

/assessments

/enrollments

/recommendations

\`\`\`

Avoid inconsistent names such as:

\`\`\`text

/course

/getCourses

/createCourse

/fetchAllLessons

\`\`\`

The HTTP method already communicates the operation.

**---**

**# 7. URL Parameters**

Use path parameters for resource identity.

Example:

\`\`\`text

GET /api/v1/courses/\:courseId

GET /api/v1/courses/\:courseId/topics

GET /api/v1/lessons/\:lessonId

GET /api/v1/assessments/\:assessmentId

\`\`\`

Do not put resource IDs unnecessarily into query strings when they identify the primary resource.

**---**

**# 8. Query Parameters**

Use query parameters for filtering, sorting, searching, and pagination.

Example:

\`\`\`text

GET /api/v1/courses?domain=CSE&difficulty=BEGINNER

\`\`\`

Possible common parameters:

\`\`\`text

page

limit

search

sort

order

status

domain

category

difficulty

\`\`\`

**---**

**# 9. Pagination**

Large collections must be paginated.

Initial conventional model:

\`\`\`text

?page=1&limit=20

\`\`\`

Example:

\`\`\`text

GET /api/v1/courses?page=1&limit=20

\`\`\`

The backend should enforce a maximum limit.

Example:

\`\`\`text

Requested limit = 5000

Allowed maximum = 100

Actual limit = 100

\`\`\`

The exact maximum can be configured.

**---**

**# 10. Pagination Response**

Conceptually:

\`\`\`json

{

  "success": true,

  "data": [],

  "pagination": {

    "page": 1,

    "limit": 20,

    "totalItems": 125,

    "totalPages": 7,

    "hasNextPage": true,

    "hasPreviousPage": false

  }

}

\`\`\`

For very large historical/event collections, cursor-based pagination may later be preferable.

**---**

**# 11. Sorting**

Use query parameters:

\`\`\`text

?sort=createdAt&order=desc

\`\`\`

The backend should whitelist sortable fields.

Do not allow arbitrary database field expressions from the client.

**---**

**# 12. Search and Filtering**

Example:

\`\`\`text

GET /api/v1/courses?search=database&domain=CSE

\`\`\`

The backend converts allowed filters into validated database queries.

Potential course filters:

\`\`\`text

search

domain

category

difficulty

status

instructor

\`\`\`

Learners should see only courses appropriate to their access state.

**---**

**# 13. Standard Success Response**

Use a consistent response envelope.

Example:

\`\`\`json

{

  "success": true,

  "data": {

    "id": "..."

  },

  "message": "Course fetched successfully"

}

\`\`\`

For lists:

\`\`\`json

{

  "success": true,

  "data": [],

  "pagination": {},

  "message": "Courses fetched successfully"

}

\`\`\`

The exact response schema should remain consistent across modules.

**---**

**# 14. Standard Error Response**

Errors should use a predictable structure.

Example:

\`\`\`json

{

  "success": false,

  "error": {

    "code": "COURSE\_NOT\_FOUND",

    "message": "Course not found",

    "details": null

  }

}

\`\`\`

Validation example:

\`\`\`json

{

  "success": false,

  "error": {

    "code": "VALIDATION\_ERROR",

    "message": "Invalid request data",

    "details": {

      "title": "Title is required"

    }

  }

}

\`\`\`

Do not expose stack traces or internal implementation details to clients in production.

**---**

**# 15. Important HTTP Status Codes**

Use status codes intentionally.

\`\`\`text

200 OK

201 Created

202 Accepted

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity

429 Too Many Requests

500 Internal Server Error

502 Bad Gateway

503 Service Unavailable

\`\`\`

The exact use of \`400\` vs \`422\` should remain consistent throughout the API.

**---**

**# 16. Authentication API**

Base:

```text
/api/v1/auth
```

Core authentication endpoints:

```text
POST /auth/signup
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/change-password
POST /auth/reactivate
```

Google authentication/setup endpoints:

```text
GET   /auth/google
GET   /auth/google/callback
POST  /auth/google/setup/role
PATCH /auth/google/setup/onboarding
POST  /auth/google/setup/complete
```

Email verification endpoints are intentionally deferred from the backend MVP.

```text
POST /auth/verify-email
POST /auth/resend-verification
```

They may be introduced later as part of the email-verification workflow.

**# 17. Signup**

```text
POST /api/v1/auth/signup
```

Purpose:

Create a new Learner or Instructor account.

Conceptual request:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "********",
  "role": "LEARNER"
}
```

The current signup implementation accepts `multipart/form-data` because
avatar is optional.

Optional field:

- avatar — uploaded profile image

The backend processes the uploaded file through the shared upload
infrastructure and stores the resulting external storage URL in
`User.avatar`.

Signup validation:

- `name`: required string, trimmed
- `email`: required string, trimmed, lowercased, valid email format
- `password`: required string, minimum 8 characters
- `role`: required enum of `LEARNER` or `INSTRUCTOR`

`ADMIN` must never be selectable through public signup.

Admin accounts are provisioned separately.

Normal signup creates the permanent User account first. Role-specific
onboarding is completed after authentication.

Flow:

```text
Signup
  ↓
Create User
  ↓
Login / authenticated session
  ↓
Role-specific onboarding
  ↓
LearnerProfile or InstructorProfile
  ↓
Dashboard
```

The response returns a safe user representation and never includes the
password.

**# 18. Login**

\`\`\`text

POST /api/v1/auth/login

\`\`\`

Purpose:

Authenticate the user.

Conceptual request:

\`\`\`json

{

  "email": "user\@example.com",

  "password": "\*\*\*\*\*\*\*\*"

}

\`\`\`

The backend:

\`\`\`text

Credentials

   ↓

Find User

   ↓

Verify Password

   ↓

Check User.status

   ↓

ACTIVE?

   ├── YES → Generate authentication session

   │           ↓

   │        Generate Access Token

   │        Generate Refresh Token + JTI

   │        Create RefreshSession

   │        Store hashed refresh token

   │        Set authentication cookies

   │

   ├── SUSPENDED

   │        ↓

   │     ACCOUNT\_SUSPENDED

   │

   └── DEACTIVATED

            ↓

         ACCOUNT\_DEACTIVATED

\`\`\`

A SUSPENDED or DEACTIVATED account must not receive new authentication

tokens through normal login.

ACCOUNT\_DEACTIVATED allows the frontend to present the account

reactivation flow.

ACCOUNT\_SUSPENDED presents a suspended-account state without a

self-reactivation action.

**---**

**# 19. Refresh Token**

\`\`\`text

POST /api/v1/auth/refresh

\`\`\`

Purpose:

Issue a new access token using a valid refresh mechanism.

Refresh Token from HttpOnly Cookie

        ↓

Verify JWT

        ↓

Extract sub + jti

        ↓

Find RefreshSession

        ↓

Check expiration/revocation

        ↓

Hash incoming token

        ↓

Compare tokenHash

        ↓

Find User

        ↓

Check User.status

        ↓

Generate new Access Token

        ↓

Generate new Refresh Token + new JTI

        ↓

Update same RefreshSession

        ↓

Set new cookies

Refresh-token rotation updates the existing RefreshSession; it does not create a new session for every refresh.

The client must not be allowed to create arbitrary access tokens.

Refresh-token handling must follow the final security design.

**---**

**# 20. Logout**

\`\`\`text

POST /api/v1/auth/logout

\`\`\`

Purpose:

Invalidate/revoke the appropriate authentication state.

POST /api/v1/auth/logout

        ↓

Read refreshToken cookie

        ↓

Verify refresh JWT

        ↓

Extract sub + jti

        ↓

Find RefreshSession

        ↓

Set revokedAt

        ↓

Clear accessToken cookie

        ↓

Clear refreshToken cookie

Authentication:

Protected endpoint.

The request passes through authentication middleware. The logout operation
uses the refresh-token cookie to identify and revoke the current
RefreshSession.

The logout service then uses the refresh token cookie to identify and revoke the current RefreshSession.

Normal logout revokes the current refresh session. Logout-all is not part of the current MVP.

Logout should be designed so that refresh credentials cannot simply remain usable forever.

**---**

**# 21. Current User**

GET /api/v1/auth/me

Returns the authenticated user's current safe account context.

Authentication:

Protected endpoint.

The request passes through authentication middleware before reaching

the controller.

The authentication middleware:

1\. extracts the access token,

2\. verifies the JWT,

3\. identifies the User using the JWT \`sub\`,

4\. retrieves the current User record,

5\. checks that User.status is ACTIVE,

6\. attaches the selected safe user context to \`req.user\`.

The \`/me\` controller returns the authenticated user's safe account representation.

Response fields:
- _id
- name
- email
- role
- status
- avatar
- emailVerified

The authentication middleware continues to attach only the
minimal authenticated context to req.user:
- _id
- name
- role
- status

The controller performs a User query to retrieve the safe
account representation.

Sensitive fields such as password/passwordHash,
refresh credentials, token hashes, etc. must never be returned.

**---**

**# 22. User/Profile APIs**

Base:

\`\`\`text

/api/v1/users

\`\`\`

Potential endpoints:

\`\`\`text

GET   /users

GET   /users/\:userId

PATCH /users/\:userId/status

PATCH /users/me

DELETE /users/me

PATCH /users/me/avatar



\`\`\`
### Role-Specific Profile APIs:

Learner and Instructor profiles are role-specific resources associated with
the authenticated User.

The backend uses separate Learner and Instructor modules for their respective
profile and onboarding business logic.

### Learner Profile

/api/v1/learner-profile

GET   /api/v1/learner-profile/me

PATCH /api/v1/learner-profile/me

# GET /api/v1/learner-profile/me

Purpose:

Return the authenticated Learner's current profile.

If a LearnerProfile does not exist, the endpoint must not create one as a
side effect. Profile absence represents that learner onboarding has not yet
started.

# PATCH /api/v1/learner-profile/me

Purpose:

Partially update normal Learner profile data.

Normal profile management must not create a missing LearnerProfile and must
not own onboarding-state calculation.

Learner onboarding is handled by the dedicated onboarding endpoint below.

### Learner Onboarding
PATCH /api/v1/learner-profile/me/onboarding

Purpose:

Persist a Learner's onboarding answer progressively.

Each onboarding answer is saved immediately rather than waiting for the learner to complete all onboarding questions.

The onboarding endpoint may create the LearnerProfile when onboarding begins if no LearnerProfile currently exists.

The endpoint is responsible for:

validating the onboarding answer
creating the LearnerProfile when onboarding begins
persisting the submitted onboarding field
evaluating the persisted onboarding state
returning the updated onboarding/profile state

The five onboarding fields are:

interests
goals
experienceLevel
studyPreferences.dailyStudyTime
studyPreferences.preferredLearningFormat

The backend determines onboarding state:

No meaningful answers
    → NOT_STARTED

At least one meaningful answer
    → IN_PROGRESS

All five meaningful answers
    → COMPLETED

The frontend must not submit or persist an authoritative currentQuestion
field.

### Instructor Profile

Base:

/api/v1/instructor-profile

Authenticated Instructor profile endpoints:

GET   /api/v1/instructor-profile/me
PATCH /api/v1/instructor-profile/me

# GET /api/v1/instructor-profile/me

Purpose:

Return the authenticated Instructor's current profile.

If an InstructorProfile does not exist, the endpoint must not create one as a
side effect.

# PATCH /api/v1/instructor-profile/me

Purpose:

Partially update normal Instructor profile data.

Normal profile management is separate from instructor onboarding.

### Instructor Onboarding

# PATCH /api/v1/instructor-profile/me/onboarding

Purpose:

Persist an Instructor's onboarding answer progressively.

The onboarding endpoint may create the InstructorProfile when onboarding
begins if no InstructorProfile currently exists.

The two onboarding fields are:

professionalTitle
expertiseAreas[]

The onboarding questions are completed progressively. The InstructorProfile
does not persist a separate onboardingState field.

Instructor onboarding is considered complete when:

professionalTitle has a meaningful value
AND expertiseAreas contains at least one meaningful value

The following fields belong to normal Instructor profile management and are not required during onboarding:

bio
experienceYears
organization
socialLinks
Role and Authorization

Learner profile and onboarding endpoints require:

Authentication + LEARNER role

Instructor profile and onboarding endpoints require:

Authentication + INSTRUCTOR role

The authenticated user's identity must be taken from the backend authentication context. The client must not be allowed to specify another user's profile identity.

Profile Creation Boundary

Normal profile GET/PATCH operations must not silently create missing role-specific profiles.

Role-specific profiles are created when role-specific onboarding begins.

This preserves the distinction between:

User exists
    ↓
Profile does not yet exist
    ↓
Onboarding begins
    ↓
Role-specific Profile is created
    ↓
Onboarding answers are progressively persisted

**---**

**# 22. (A) Admin User Management:**

GET   /api/v1/users

GET   /api/v1/users/\:userId

PATCH /api/v1/users/\:userId/status

All require: Authentication + ADMIN role

Admin cannot:

change a user's role

change another user's password

deactivate another user's account

modify learner learning data

modify instructor course data

modify mastery

modify learning evidence

**# GET /users**

Purpose: Returns the paginated list of platform users for the Admin Users dashboard.

Supported query parameters:

search

role

status

page

limit

sort

order

The current user-management list is intended for Learner and Instructor

accounts. ADMIN accounts are excluded from the normal Users management

list.

The Admin table displays:

Name

Email

Role

Status

Action

The Action → View operation uses the user's ID to request:

GET /users/\:userId



**# GET /users/\:userId**

Purpose:

Returns the administrative detail of a specific user.

Conceptually includes:

Account Information

Learner/Instructor Information

Learning Overview

depending on the user's role and available domain data.

Do not say that the endpoint must immediately implement every future learning metric. Those will become available as their respective modules are implemented.

**# PATCH /users/\:userId/status**

Purpose:

Allows Admin to suspend or unsuspend a user.

Supported transitions:

ACTIVE → SUSPENDED

SUSPENDED → ACTIVE

Admin does not deactivate users.

Suspension stores:

suspensionReason

suspendedAt

Suspended users:

cannot access protected APIs

cannot self-reactivate

have their refresh sessions revoked

can regain access when the suspension is resolved by the platform/Admin

**# 23. Account Management**

Current endpoints:

\`\`\`text

PATCH  /users/me

PATCH  /users/me/avatar

DELETE /users/me

\`\`\`

**# PATCH /users/me**

Purpose:

Updates the authenticated user's current account information.

Current supported field:

\- name

Email changes are handled through a separate email-change verification flow and are not part of this simple account update endpoint.

Role and account status cannot be changed through this endpoint.

**# PATCH /users/me/avatar**

Purpose:

Uploads or replaces the authenticated user's avatar.

The request uses multipart/form-data and the approved upload infrastructure.

Avatar belongs to User rather than LearnerProfile or InstructorProfile.

**# DELETE /users/me**

Purpose:

Represents user-initiated account deactivation.

The operation:

User

  ↓

status = DEACTIVATED

  ↓

Active refresh sessions revoked

Account data and historical learning records are preserved.

The user's learning progress is paused while the account remains DEACTIVATED.

A deactivated user cannot authenticate through normal login and receives
`ACCOUNT_DEACTIVATED` so the frontend can present the reactivation flow.

The user can reactivate the account through:

POST /api/v1/auth/reactivate

**---**

**# 23. (A) Account Status**

Account states:

\`\`\`text

ACTIVE

SUSPENDED

DEACTIVATED

\`\`\`

ACTIVE: Normal account access.

DEACTIVATED: User voluntarily deactivated their account.

Behavior:

User

  ↓

DEACTIVATED

  ↓

Refresh sessions revoked

  ↓

Protected API access rejected

  ↓

Normal login rejected

  ↓

Learning progress paused

  ↓

Historical data preserved

A user may reactivate their own DEACTIVATED account through: POST /api/v1/auth/reactivate

Successful reactivation changes:

DEACTIVATED → ACTIVE and creates a new authentication session.

SUSPENDED: Admin/platform-controlled restriction.

Behavior:

Admin

  ↓

SUSPENDED

  ↓

Refresh sessions revoked

  ↓

Protected API access rejected

  ↓

Normal login rejected

  ↓

Learning progress paused

A suspended user cannot self-reactivate.

Only the Admin/platform can resolve:

SUSPENDED → ACTIVE

Suspension metadata:

suspensionReason

suspendedAt

No suspendedBy.

Authentication Error Codes:

ACCOUNT\_DEACTIVATED

    → frontend shows deactivated-account UI

    → Reactivate Account action available

ACCOUNT\_SUSPENDED

    → frontend shows suspended-account UI

    → no self-reactivation action

**---**

**# 24. Avatar/Profile Media**

Potential operation:

\`\`\`text

PATCH /users/me/avatar

\`\`\`

**# PATCH /users/me/avatar**

Purpose:

Upload or replace the authenticated user's avatar.

The request uses multipart/form-data.

Conceptual flow:

Authenticated User

      ↓

Multer / upload handling

      ↓

Cloudinary / approved file storage

      ↓

User.avatar updated

Avatar belongs to User, not LearnerProfile or InstructorProile.

A separate avatar-delete operation is not part of the current implemented

User API.

**---**

**# 24A. Account Reactivation**

\`\`\`text

POST /api/v1/auth/reactivate

\`\`\`

**# POST /api/v1/auth/reactivate**

Purpose:

Reactivate a user-initiated DEACTIVATED account.

Authentication:

Public endpoint

The endpoint does not require an existing access token because account

deactivation revokes the user's previous authentication sessions.

Request:

{

  "email": "user\@example.com",

  "password": "*\*\*\*\*\*\**\*\*"

}

Flow:

Email + Password

      ↓

Find User

      ↓

Check account status

      ↓

DEACTIVATED?

      ↓

Verify password

      ↓

Set status = ACTIVE

      ↓

Generate new Access Token

      ↓

Generate new Refresh Token + JTI

      ↓

Create new RefreshSession

      ↓

Set authentication cookies

Possible outcomes:

ACCOUNT\_NOT\_FOUND

ACCOUNT\_ALREADY\_ACTIVE

ACCOUNT\_SUSPENDED

INCORRECT\_PASSWORD

successful reactivation

A successful reactivation creates a new authentication session. Previously

revoked refresh sessions are not restored.

**---**

**# 24B. Google Authentication and New-User Setup**

New Google users do not immediately become permanent platform Users.

Flow:

```text
GET /api/v1/auth/google
        ↓
Google authentication
        ↓
Google callback
        ↓
OAuthSetupSession
        ↓
Select role
        ↓
Role-specific onboarding
        ↓
Complete setup
        ↓
Create User
        ↓
Create LearnerProfile / InstructorProfile
        ↓
Create AuthIdentity
        ↓
Create RefreshSession
        ↓
Issue application access + refresh tokens
        ↓
Dashboard
```

The temporary `OAuthSetupSession` is server-side and short-lived. A secure
temporary httpOnly cookie can identify it during setup.

For an existing Google-linked account:

```text
Google identity
      ↓
AuthIdentity
      ↓
User
      ↓
Check User.status
      ↓
Issue application session if ACTIVE
```

An existing password-based account with the same verified Google email is
not automatically linked.

The API must not issue an application session solely from a matching email
when no `AuthIdentity` link exists. The user must sign in using the existing
authentication method. Account linking is a future authenticated settings
workflow.

If the existing account is suspended or deactivated, Google authentication
must not bypass that state.

A Google-only User may have no local password. The application never receives
the user's Google password.

Google access/ID tokens are not the application's API authentication tokens.

**---**

**# 25. Course APIs**

Base:

\`\`\`text

/api/v1/courses

\`\`\`

Core endpoints:

\`\`\`text

GET    /courses

POST   /courses

GET    /courses/\:courseId

PATCH  /courses/\:courseId

DELETE /courses/\:courseId

\`\`\`

Instructor ownership and authorization are required for protected mutation operations.

**---**

**# 26. Course Discovery**

\`\`\`text

GET /api/v1/courses

\`\`\`

Supports:

\`\`\`text

search

domain

category

difficulty

status

instructor

page

limit

sort

order

\`\`\`

Public/course-discovery visibility must respect course publication status.

Learners should not automatically receive unpublished instructor drafts.

**---**

**# 27. Create Course**

\`\`\`text

POST /api/v1/courses

\`\`\`

Authorization:

\`\`\`text

Authenticated

\+

INSTRUCTOR

\`\`\`

Conceptual request:

\`\`\`json

{

  "title": "Database Management Systems",

  "description": "Learn DBMS concepts...",

  "domain": "CSE",

  "category": "DATABASE",

  "difficulty": "BEGINNER",

  "objectives": [],

  "prerequisites": []

}

\`\`\`

The backend determines the owner from the authenticated identity.

The client must not be trusted to assign another instructor as owner.

**---**

**# 28. Update Course**

\`\`\`text

PATCH /api/v1/courses/\:courseId

\`\`\`

Authorization:

\`\`\`text

Authenticated

\+

INSTRUCTOR

\+

Course Owner

\`\`\`

Only allowed fields may be modified.

Published-course changes may require additional validation depending on the change.

**---**

**# 29. Publish Course**

Publishing is a meaningful business operation.

Possible endpoint:

\`\`\`text

POST /api/v1/courses/\:courseId/publish

\`\`\`

The service validates that required content exists before publishing.

For example:

\`\`\`text

Course metadata

\+

At least one topic

\+

Lessons

\+

Required assessment configuration

\`\`\`

The exact publishing checklist will be defined later.

**---**

**# 30. Archive Course**

\`\`\`text

POST /api/v1/courses/\:courseId/archive

\`\`\`

Archiving should preserve historical learner records.

**---**

**# 31. Course Topics**

\`\`\`text

GET  /api/v1/courses/\:courseId/topics

POST /api/v1/courses/\:courseId/topics

\`\`\`

Instructor authorization is required for creation.

Learners may read published course topics according to their enrollment/access state.

**---**

**# 32. Topic APIs**

\`\`\`text

GET   /api/v1/topics/\:topicId

PATCH /api/v1/topics/\:topicId

DELETE /api/v1/topics/\:topicId

\`\`\`

Instructor mutations require course ownership.

**---**

**# 33. Lessons**

Course/topic-oriented endpoints:

\`\`\`text

GET  /api/v1/topics/\:topicId/lessons

POST /api/v1/topics/\:topicId/lessons

\`\`\`

Individual lesson:

\`\`\`text

GET    /api/v1/lessons/\:lessonId

PATCH  /api/v1/lessons/\:lessonId

DELETE /api/v1/lessons/\:lessonId

\`\`\`

**---**

**# 34. Lesson Access**

A learner requesting a lesson does not automatically receive content.

The backend evaluates:

\`\`\`text

Authenticated?

   ↓

Enrolled?

   ↓

Course published?

   ↓

Lesson belongs to course?

   ↓

Lesson unlocked?

   ↓

Prerequisites satisfied?

   ↓

Return lesson

\`\`\`

This is a critical business rule.

The frontend cannot enforce this alone.

**---**

**# 35. Lesson Completion**

Possible endpoint:

\`\`\`text

POST /api/v1/lessons/\:lessonId/complete

\`\`\`

However, completion should be based on valid business evidence rather than blindly trusting:

\`\`\`json

{

  "completed": true

}

\`\`\`

The backend should determine whether the completion condition is satisfied.

**---**

**# 36. Resources**

\`\`\`text

GET  /api/v1/lessons/\:lessonId/resources

POST /api/v1/lessons/\:lessonId/resources

GET  /api/v1/resources/\:resourceId

PATCH /api/v1/resources/\:resourceId

DELETE /api/v1/resources/\:resourceId

\`\`\`

Instructor ownership applies to mutations.

**---**

**# 37. External Video Resources**

A instructor may add an approved YouTube resource.

The backend should validate:

\- URL format

\- supported provider

\- resource metadata

The application should embed/play the allowed resource without exposing provider credentials.

**---**

**# 38. File Resources**

Conceptual flow:

\`\`\`text

Instructor

  ↓

Upload Request

  ↓

Validation

  ↓

Storage

  ↓

Metadata

  ↓

Resource

\`\`\`

Large binary content should not be unnecessarily stored directly in MongoDB.

**---**

**# 39. Enrollment APIs**

Base:

\`\`\`text

/api/v1/enrollments

\`\`\`

Potential endpoints:

\`\`\`text

POST /courses/\:courseId/enroll

GET  /users/me/enrollments

GET  /enrollments/\:enrollmentId

POST /enrollments/\:enrollmentId/withdraw

\`\`\`

**---**

**# 40. Enrollment Flow**

\`\`\`text

Learner views course

       ↓

Checks prerequisites

       ↓

Diagnostic if required

       ↓

Eligible?

       ↓

Create enrollment

       ↓

Create initial learning state

       ↓

Return enrollment

\`\`\`

The client cannot simply set:

\`\`\`text

enrollment.status = ACTIVE

\`\`\`

The backend creates it after validation.

**---**

**# 41. Prerequisite Check**

Possible endpoint:

\`\`\`text

GET /api/v1/courses/\:courseId/eligibility

\`\`\`

Response can indicate:

\`\`\`json

{

  "eligible": false,

  "reasons": [

    {

      "type": "PREREQUISITE",

      "courseId": "...",

      "message": "Basic SQL knowledge is required"

    }

  ]

}

\`\`\`

If a diagnostic is required:

\`\`\`text

diagnosticRequired = true

\`\`\`

**---**

**# 42. Diagnostic Assessment APIs**

Potential endpoints:

\`\`\`text

GET  /api/v1/courses/\:courseId/diagnostic

POST /api/v1/courses/\:courseId/diagnostic/attempts

\`\`\`

The diagnostic may identify prerequisite gaps.

Example flow:

\`\`\`text

Advanced SQL

   ↓

Diagnostic

   ↓

Weak Basic SQL

   ↓

Recommend Basic SQL

   ↓

Learner refines knowledge

   ↓

Diagnostic again

   ↓

Enrollment eligibility

\`\`\`

**---**

**# 43. Question Bank APIs**

Base:

\`\`\`text

/api/v1/question-banks

\`\`\`

Potential endpoints:

\`\`\`text

POST /courses/\:courseId/question-banks

GET  /question-banks/\:questionBankId

PATCH /question-banks/\:questionBankId

\`\`\`

Questions:

\`\`\`text

POST   /question-banks/\:questionBankId/questions

GET    /question-banks/\:questionBankId/questions

PATCH  /questions/\:questionId

DELETE /questions/\:questionId

\`\`\`

Instructor ownership is required for modifications.

**---**

**# 44. Bulk Question Import**

Potential endpoint:

\`\`\`text

POST /question-banks/\:questionBankId/import

\`\`\`

Conceptual flow:

\`\`\`text

Upload

  ↓

Parse

  ↓

Validate

  ↓

Generate Preview

  ↓

Instructor Confirms

  ↓

Persist Questions

\`\`\`

For large imports, the endpoint may return:

\`\`\`text

202 Accepted

\`\`\`

and provide a processing/job reference.

**---**

**# 45. Import Job Status**

Possible endpoint:

\`\`\`text

GET /api/v1/jobs/\:jobId

\`\`\`

Response:

\`\`\`json

{

  "status": "PROCESSING",

  "progress": 65

}

\`\`\`

This keeps expensive file parsing out of the request path.

**---**

**# 46. Assessment APIs**

Base:

\`\`\`text

/api/v1/assessments

\`\`\`

Instructor configuration:

\`\`\`text

POST  /courses/\:courseId/assessments

GET   /assessments/\:assessmentId

PATCH /assessments/\:assessmentId

DELETE /assessments/\:assessmentId

\`\`\`

Learner access:

\`\`\`text

GET /assessments/\:assessmentId

\`\`\`

The response should contain only questions the learner is actually allowed to see.

**---**

**# 47. Assessment Attempt Lifecycle**

The recommended lifecycle:

\`\`\`text

Assessment

    ↓

Start Attempt

    ↓

Attempt State

    ↓

Answer Questions

    ↓

Submit

    ↓

Server Scoring

    ↓

Learning Evidence

    ↓

Mastery Update

    ↓

Progression

    ↓

Recommendation

\`\`\`

**---**

**# 48. Start Assessment Attempt**

\`\`\`text

POST /api/v1/assessments/\:assessmentId/attempts

\`\`\`

The backend:

1\. authenticates the learner

2\. verifies enrollment/access

3\. checks attempt eligibility

4\. selects questions

5\. creates the attempt

6\. records start time

7\. returns the attempt state

The server should select questions.

The client must not choose the correct answers or alter marks.

**---**

**# 49. Get Attempt**

\`\`\`text

GET /api/v1/attempts/\:attemptId

\`\`\`

Returns the learner's authorized attempt state.

The response must not expose answer keys before submission.

**---**

**# 50. Save/Submit Answers**

There are two possible approaches.

**### Option A — Submit all answers**

\`\`\`text

POST /api/v1/attempts/\:attemptId/submit

\`\`\`

with:

\`\`\`json

{

  "responses": [

    {

      "questionId": "...",

      "selectedAnswer": "B"

    }

  ]

}

\`\`\`

**### Option B — Save individual responses**

\`\`\`text

PATCH /api/v1/attempts/\:attemptId/responses/\:questionId

\`\`\`

The MVP can initially use a controlled save-answer mechanism plus final submission.

The backend remains authoritative for final scoring.

**---**

**# 51. Submit Attempt**

\`\`\`text

POST /api/v1/attempts/\:attemptId/submit

\`\`\`

The backend:

\`\`\`text

Validate attempt

   ↓

Check time/status

   ↓

Lock attempt

   ↓

Evaluate responses

   ↓

Calculate marks

   ↓

Calculate percentage

   ↓

Store Question Responses

   ↓

Create Learning Evidence

   ↓

Update Mastery

   ↓

Evaluate Progression

   ↓

Queue expensive personalization work

   ↓

Return Result

\`\`\`

This is one of the most important API workflows.

**---**

**# 52. Unanswered Questions**

The backend must preserve unanswered questions.

For example:

\`\`\`text

CORRECT

INCORRECT

UNANSWERED

\`\`\`

Unanswered is not silently converted into a successful pass.

This gives the personalization system stronger evidence about what the learner could not answer.

**---**

**# 53. Timed Assessment**

The server should be authoritative for time.

Do not rely only on:

\`\`\`text

JavaScript timer in browser

\`\`\`

The attempt stores:

\`\`\`text

startedAt

timeLimit

\`\`\`

The server calculates whether the attempt has expired.

If expired:

\`\`\`text

AUTO\_SUBMITTED

\`\`\`

may be used according to assessment rules.

**---**

**# 54. Retry Assessment**

Retry should create a **\*\*new attempt\*\***.

\`\`\`text

Attempt 1

   ↓

Result

   ↓

Remediation

   ↓

Attempt 2

\`\`\`

Do not overwrite the previous attempt.

Question selection may differ because the assessment draws from a larger question bank.

**---**

**# 55. Assessment Result**

Possible endpoint:

\`\`\`text

GET /api/v1/attempts/\:attemptId/result

\`\`\`

The result can include:

\`\`\`text

score

percentage

correctCount

incorrectCount

unansweredCount

topicBreakdown

timeTaken

passed

\`\`\`

Detailed answer review should reveal only information appropriate to the learner's access policy.

**---**

**# 56. Learning APIs**

Base:

\`\`\`text

/api/v1/learning

\`\`\`

Potential endpoints:

\`\`\`text

GET /learning/me

GET /learning/me/courses/\:courseId

GET /learning/me/courses/\:courseId/progress

GET /learning/me/topics/\:topicId/mastery

\`\`\`

**---**

**# 57. Learner Dashboard API**

A dashboard endpoint may aggregate multiple read models:

\`\`\`text

GET /api/v1/learning/me/dashboard

\`\`\`

Potential response sections:

\`\`\`text

currentCourse

courseProgress

recentActivity

streak

studySummary

strengths

weaknesses

recommendations

nextAction

\`\`\`

This endpoint should avoid doing expensive AI work synchronously on every page load.

**---**

**# 58. Current Learning State**

\`\`\`text

GET /api/v1/learning/me/courses/\:courseId

\`\`\`

Returns:

\`\`\`text

enrollment

progress

currentLesson

unlockedLessons

completedLessons

topicSummary

\`\`\`

The backend derives access based on stored state and business rules.

**---**

**# 59. Topic Mastery API**

\`\`\`text

GET /api/v1/learning/me/topics/\:topicId/mastery

\`\`\`

May return:

\`\`\`json

{

  "topicId": "...",

  "masteryScore": 72,

  "status": "DEVELOPING",

  "confidence": 0.74

}

\`\`\`

The learner cannot directly PATCH mastery.

**---**

**# 60. Learning Evidence API**

Learners should generally not be allowed to arbitrarily create or modify evidence.

Evidence is generated by trusted application events.

Possible read endpoint:

\`\`\`text

GET /api/v1/learning/me/evidence

\`\`\`

with filters:

\`\`\`text

courseId

topicId

eventType

from

to

page

limit

\`\`\`

Creation should occur through controlled domain operations.

**---**

**# 61. Personalization APIs**

Base:

\`\`\`text

/api/v1/personalization

\`\`\`

Potential endpoints:

\`\`\`text

GET /personalization/me

GET /personalization/me/next-action

GET /personalization/me/weaknesses

GET /personalization/me/strengths

\`\`\`

The client should consume personalization results rather than directly manipulating the learner model.

**---**

**# 62. Recommendations**

Base:

\`\`\`text

/api/v1/recommendations

\`\`\`

Learner:

\`\`\`text

GET /recommendations/me

GET /recommendations/me/next

POST /recommendations/\:recommendationId/accept

POST /recommendations/\:recommendationId/dismiss

\`\`\`

The exact mutation behavior should remain limited.

A learner accepting a recommendation does not automatically mark the learning objective as complete.

**---**

**# 63. Recommendation Generation**

Recommendation generation may be asynchronous.

\`\`\`text

Learning Event

   ↓

Queue

   ↓

Personalization Worker

   ↓

Learning State Analysis

   ↓

AI / Rules

   ↓

Recommendation

\`\`\`

The API can return the last available recommendation immediately.

**---**

**# 64. AI Boundary**

The frontend must not call the AI provider directly for core personalization.

Preferred:

\`\`\`text

Frontend

   ↓

Backend

   ↓

Personalization Service

   ↓

AI Provider

\`\`\`

This protects:

\- API credentials

\- prompts

\- internal learning logic

\- sensitive learner context

\- output validation

**---**

**# 65. AI Output Validation**

AI output must be treated as untrusted external input.

Flow:

\`\`\`text

AI Output

   ↓

Schema Validation

   ↓

Business Rule Validation

   ↓

Safe Recommendation

\`\`\`

If invalid:

\`\`\`text

Reject / fallback

\`\`\`

Do not persist arbitrary AI output as authoritative learning state.

**---**

**# 66. Intervention APIs**

Base:

\`\`\`text

/api/v1/interventions

\`\`\`

Potential endpoints:

\`\`\`text

GET /interventions/me

GET /interventions/\:interventionId

POST /interventions/\:interventionId/start

POST /interventions/\:interventionId/complete

\`\`\`

Interventions should correspond to actual personalized actions.

**---**

**# 67. Intervention Completion**

Completion should produce valid learning evidence.

\`\`\`text

Intervention

   ↓

Completion

   ↓

Learning Evidence

   ↓

Mastery Re-evaluation

\`\`\`

The learner should not be able to claim completion simply by changing a frontend flag.

**---**

**# 68. Learner Analytics**

\`\`\`text

GET /api/v1/analytics/me

GET /api/v1/analytics/me/courses/\:courseId

GET /api/v1/analytics/me/topics/\:topicId

\`\`\`

Potential analytics:

\`\`\`text

course progress

assessment performance

topic mastery

strengths

weaknesses

learning trend

study activity

intervention outcomes

\`\`\`

**---**

**# 69. Instructor APIs**

Instructor operations are separated by responsibility.

\`\`\`text

GET /api/v1/instructor/dashboard

GET /api/v1/instructor/courses

GET /api/v1/instructor/courses/\:courseId

GET /api/v1/instructor/courses/\:courseId/learners

GET /api/v1/instructor/courses/\:courseId/analytics

\`\`\`

Instructor-specific APIs should still enforce course ownership.

**---**

**# 70. Instructor Dashboard**

\`\`\`text

GET /api/v1/instructor/dashboard

\`\`\`

May return:

\`\`\`text

recentCourses

enrollmentSummary

coursePerformance

learnerActivity

attentionAreas

\`\`\`

Expensive analytics should come from cached/materialized data where appropriate.

**---**

**# 71. Instructor Learner List**

This endpoint is important based on the approved user journey:

\`\`\`text

GET /api/v1/instructor/courses/\:courseId/learners

\`\`\`

Authorization:

\`\`\`text

Authenticated

\+

Instructor

\+

Owns Course

\`\`\`

It returns course-relevant enrolled-learner information.

The instructor must not automatically receive unrelated learner data.

**---**

**# 72. Instructor Learner Detail**

Possible:

\`\`\`text

GET /api/v1/instructor/courses/\:courseId/learners/\:learnerId

\`\`\`

Before returning data, verify:

\`\`\`text

Instructor owns course

AND

Learner is/was enrolled in course

\`\`\`

Possible information:

\`\`\`text

enrollment

course progress

lesson progress

topic mastery

assessment performance

course-relevant strengths

course-relevant weaknesses

\`\`\`

**---**

**# 73. Instructor Course Analytics**

\`\`\`text

GET /api/v1/instructor/courses/\:courseId/analytics

\`\`\`

Possible data:

\`\`\`text

totalLearners

activeLearners

completionRate

averageScore

topicDifficulty

assessmentDistribution

weakestTopics

strongestTopics

\`\`\`

This helps the instructor identify where the majority of learners are struggling.

**---**

**# 74. Instructor Course Management**

Instructor can:

\`\`\`text

Create Course

Update Course

Create Topics

Update Topics

Create Lessons

Update Lessons

Manage Resources

Create Question Banks

Add Questions

Import Questions

Create Assessments

Publish Course

Archive Course

\`\`\`

All operations require appropriate course ownership checks.

**---**

**# 75. Admin APIs**

Base:

\`\`\`text

/api/v1/admin

\`\`\`

Admin operations may include:

\`\`\`text

GET /admin/dashboard

GET /admin/courses

GET /admin/audit-logs

GET /admin/analytics

POST /admin/courses/\:courseId/moderate

\`\`\`

Exact admin permissions must be explicitly defined.

**---**

**# 77. Notifications API**

\`\`\`text

GET   /api/v1/notifications

PATCH /api/v1/notifications/\:notificationId/read

POST  /api/v1/notifications/read-all

\`\`\`

Notification creation may occur asynchronously.

**---**

**# 78. Background Job APIs**

Not every job should expose a public job-management endpoint.

Where a long-running user-initiated operation exists:

\`\`\`text

POST /api/v1/question-banks/\:id/import

\`\`\`

may return:

\`\`\`json

{

  "success": true,

  "data": {

    "jobId": "..."

  },

  "message": "Import started"

}

\`\`\`

Then:

\`\`\`text

GET /api/v1/jobs/\:jobId

\`\`\`

The job endpoint must enforce ownership/access.

**---**

**# 79. Synchronous vs Asynchronous API Work**

**### Synchronous**

\`\`\`text

Login

Course details

Enrollment

Start assessment

Submit assessment

Read progress

Read recommendations

\`\`\`

**### Potentially asynchronous**

\`\`\`text

Large question import

PDF parsing

Expensive analytics

AI analysis

Bulk processing

Notification delivery

\`\`\`

**---**

**# 80. Idempotency**

Idempotency protects against duplicate requests.

Important operations include:

\`\`\`text

Enrollment creation

Assessment submission

File import

Payment-like future operations

Notification-triggering actions

\`\`\`

For example, if a user double-clicks:

\`\`\`text

POST /courses/\:courseId/enroll

\`\`\`

the backend should not create two active enrollments.

Assessment submission must similarly prevent duplicate finalization.

**---**

**# 81. Request Validation**

Every external request must be validated.

Validation layers:

\`\`\`text

Request Schema

   ↓

Business Validation

   ↓

Authorization

   ↓

Persistence

\`\`\`

Examples:

\`\`\`text

email format

password constraints

course ID

assessment ID

question structure

time limit

marks

role

status

\`\`\`

**---**

**# 82. Authorization Model**

Authorization should happen at multiple levels.

\`\`\`text

Authentication

      ↓

Role Authorization

      ↓

Resource Ownership

      ↓

Relationship Authorization

      ↓

Business Rule

\`\`\`

Example:

\`\`\`text

Instructor requests learner data

        ↓

Is authenticated?

        ↓

Is instructor?

        ↓

Owns course?

        ↓

Learner enrolled?

        ↓

Return allowed course data

\`\`\`

**---**

**# 83. Learner Authorization**

Learners may access:

\`\`\`text

Their profile

Their enrollments

Their course content when authorized

Their assessments

Their attempts

Their learning evidence

Their mastery

Their recommendations

Their analytics

\`\`\`

Learners cannot modify:

\`\`\`text

Official scores

Mastery

Learning evidence

Course ownership

Instructor content

Admin state

\`\`\`

**---**

**# 84. Instructor Authorization**

Instructors may access:

\`\`\`text

Their own profile

Their own courses

Their own course content

Their question banks

Their assessments

Learners enrolled in their courses

Course-level analytics

\`\`\`

They cannot access unrelated instructor courses or unrelated learner learning histories.

**---**

**# 85. Admin Authorization**

Admin permissions are platform-level and should be explicitly scoped.

Admin can manage user accounts, but cannot change user roles through the Users/Admin APIs.

Admin actions should be auditable.

**---**

**# 86. Critical Security Rule**

The client must never be authoritative for:

\`\`\`text

role

course ownership

enrollment state

lesson unlocking

assessment score

mastery

learning evidence

instructor access

admin privileges

\`\`\`

The server calculates and verifies these.

**---**

**# 87. Example: Learner Dashboard Flow**

\`\`\`text

GET /api/v1/learning/me/dashboard

          ↓

Authentication

          ↓

Learning Service

          ↓

Read current state

          ↓

Read latest recommendations

          ↓

Read lightweight analytics

          ↓

Return dashboard model

\`\`\`

Expensive calculations should not run synchronously on every dashboard request.

**---**

**# 88. Example: Learner Opens Course**

\`\`\`text

GET /api/v1/courses/\:courseId

          ↓

Authentication

          ↓

Course visibility

          ↓

Return course metadata

\`\`\`

If the learner is not enrolled, content visibility is restricted.

**---**

**# 89. Example: Learner Opens Lesson**

\`\`\`text

GET /api/v1/lessons/\:lessonId

          ↓

Authentication

          ↓

Find lesson

          ↓

Find course

          ↓

Verify enrollment

          ↓

Check unlock rules

          ↓

Return lesson content

\`\`\`

**---**

**# 90. Example: Assessment Submission**

\`\`\`text

POST /api/v1/attempts/\:attemptId/submit

          ↓

Authenticate

          ↓

Verify ownership

          ↓

Check attempt status

          ↓

Check time

          ↓

Lock attempt

          ↓

Score deterministically

          ↓

Persist responses

          ↓

Create evidence

          ↓

Update mastery

          ↓

Evaluate progression

          ↓

Queue personalization

          ↓

Return result

\`\`\`

**---**

**# 91. Example: Weakness Detection**

\`\`\`text

Assessment Result

       ↓

Question Responses

       ↓

Learning Evidence

       ↓

Topic Analysis

       ↓

Mastery Update

       ↓

Weakness detected

       ↓

Recommendation

\`\`\`

The frontend does not directly call:

\`\`\`text

POST /mastery = weak

\`\`\`

The backend derives it.

**---**

**# 92. Example: Recommendation Cycle**

\`\`\`text

Learner submits assessment

       ↓

Learning evidence

       ↓

Mastery calculation

       ↓

Background personalization job

       ↓

Rules + AI reasoning

       ↓

Validated recommendation

       ↓

GET /api/v1/recommendations/me

\`\`\`

**---**

**# 93. Example: Advanced SQL Prerequisite Flow**

\`\`\`text

GET /courses/advanced-sql/eligibility

          ↓

Prerequisite check

          ↓

Diagnostic required?

          ↓

POST /courses/advanced-sql/diagnostic/attempts

          ↓

Diagnostic result

          ↓

Weak Basic SQL

          ↓

Recommendation

          ↓

Learner refines Basic SQL

          ↓

New evidence

          ↓

Reassessment

          ↓

Eligible

          ↓

POST /courses/advanced-sql/enroll

\`\`\`

**---**

**# 94. Error Handling Flow**

\`\`\`text

Request

  ↓

Validation

  ↓

Authentication

  ↓

Authorization

  ↓

Controller

  ↓

Service

  ↓

Error

  ↓

Central Error Handler

  ↓

Standard Error Response

\`\`\`

The API should never expose:

\`\`\`text

MongoDB stack traces

JWT secrets

database connection strings

AI provider keys

internal file paths

raw provider errors

\`\`\`

**---**

**# 95. Conflict Handling**

Use \`409 Conflict\` where the requested state conflicts with current state.

Examples:

\`\`\`text

Already enrolled

Already submitted assessment

Course already published

Course already archived

Duplicate active resource

\`\`\`

This makes state conflicts explicit.

**---**

**# 96. Rate Limiting**

Rate limiting should apply especially to:

\`\`\`text

Login

Signup

Refresh

Password-related endpoints

AI-triggering endpoints

File imports

Admin-sensitive operations

\`\`\`

Redis can support distributed rate limiting.

**---**

**# 97. API Security**

The API should implement:

\- HTTPS in production

\- secure authentication

\- authorization

\- input validation

\- rate limiting

\- safe CORS configuration

\- secure headers

\- request-size limits

\- file validation

\- output filtering

\- secret management

\- audit logging for sensitive operations

Exact implementation belongs in the Security document.

**---**

**# 98. Sensitive Data**

API responses should use explicit projections/DTOs.

Do not return complete database documents blindly.

For example, a user response should not accidentally contain:

\`\`\`text

passwordHash

refreshTokenHash

security metadata

internal flags

\`\`\`

**---**

**# 99. DTO / Response Mapping**

A controller should not necessarily return a raw MongoDB document.

Preferred:

\`\`\`text

Database Document

       ↓

Service

       ↓

DTO / Response Model

       ↓

API Response

\`\`\`

This reduces accidental data exposure and couples the API less tightly to database structure.

**---**

**# 100. API and Database Independence**

The API should not expose database implementation details.

Avoid APIs such as:

\`\`\`text

GET /users?mongoQuery=...

\`\`\`

or response structures that force the frontend to understand MongoDB internals.

The API represents business resources, not database collections.

**---**

**# 101. API and Background Workers**

Workers should reuse application services where appropriate.

Example:

\`\`\`text

API

  ↓

Assessment Service

  ↓

Save Result

  ↓

Queue Job

  ↓

Personalization Worker

  ↓

Personalization Service

\`\`\`

Do not duplicate business rules in workers and controllers.

**---**

**# 102. API and Redis**

Redis is infrastructure, not a public API resource.

The frontend should not directly communicate with Redis.

The backend uses Redis for:

\`\`\`text

Caching

Queues

Rate Limiting

Temporary State

\`\`\`

**---**

**# 103. API and Object Storage**

The frontend should not receive unrestricted storage credentials.

Preferred flow:

\`\`\`text

Backend

  ↓

Authorize upload

  ↓

Generate controlled upload mechanism

  ↓

Storage

  ↓

Store metadata

\`\`\`

The exact upload strategy will be finalized during the storage/security design.

**---**

**# 104. API Contract for Instructor Course Publishing**

Before publishing:

\`\`\`text

Course metadata valid

Topic exists

Required lessons exist

Required resources/content valid

Required assessment exists

Question bank sufficient

Prerequisite configuration valid

\`\`\`

If requirements are not met:

\`\`\`text

409 Conflict

\`\`\`

with a useful error code.

**---**

**# 105. API Contract for Lesson Unlocking**

A lesson unlock decision may depend on:

\`\`\`text

Enrollment

Previous lesson completion

Assessment result

Prerequisite state

Course configuration

\`\`\`

The frontend receives the resulting access state.

It does not calculate the official state.

**---**

**# 106. API Contract for Mastery**

The API may expose:

\`\`\`text

GET /learning/me/topics/\:topicId/mastery

\`\`\`

but there should be no ordinary learner endpoint such as:

\`\`\`text

PATCH /learning/me/topics/\:topicId/mastery

\`\`\`

because mastery is derived from evidence.

**---**

**# 107. API Contract for Learning Evidence**

Evidence should be created by trusted application operations such as:

\`\`\`text

Assessment submission

Lesson completion

Practice completion

Intervention completion

Diagnostic result

\`\`\`

This prevents fabricated learning history.

**---**

**# 108. API Contract for Recommendations**

Recommendations are outputs of the personalization layer.

The frontend can:

\`\`\`text

read

accept

dismiss

open target

\`\`\`

but cannot manually create an authoritative recommendation.

**---**

**# 109. API Contract for Instructor Analytics**

Instructor analytics are scoped to owned courses.

\`\`\`text

Instructor

  ↓

Own Course

  ↓

Course Analytics

\`\`\`

Analytics should not accidentally become a mechanism for cross-course learner surveillance.

**---**

**# 110. API Evolution**

Future breaking changes should use:

\`\`\`text

/api/v2

\`\`\`

Avoid changing the meaning of an existing v1 endpoint silently.

Non-breaking additions should remain backward compatible where possible.

**---**

**# 111. API Documentation**

The implementation should eventually expose machine-readable API documentation, preferably using OpenAPI.

This allows:

\`\`\`text

API Contract

   ↓

Frontend Development

   ↓

Backend Development

   ↓

Testing

\`\`\`

The final OpenAPI specification should be generated/maintained alongside implementation rather than manually drifting away from actual endpoints.

**---**

**# 112. API Testing Strategy**

Every critical endpoint should eventually have:

**### Happy path**

\`\`\`text

Valid request

→ expected response

\`\`\`

**### Validation failure**

\`\`\`text

Invalid request

→ 400/422

\`\`\`

**### Authentication failure**

\`\`\`text

No valid authentication

→ 401

\`\`\`

**### Authorization failure**

\`\`\`text

Authenticated but not allowed

→ 403

\`\`\`

**### Not found**

\`\`\`text

Missing resource

→ 404

\`\`\`

**### Conflict**

\`\`\`text

Invalid state transition

→ 409

\`\`\`

**### Failure handling**

\`\`\`text

External/background dependency failure

→ safe controlled response

\`\`\`

**---**

**# 113. API Module Summary**

\`\`\`text

/api/v1

│

├── auth

├── users

├── courses

├── topics

├── lessons

├── resources

├── enrollments

├── question-banks

├── questions

├── assessments

├── attempts

├── learning

├── personalization

├── recommendations

├── interventions

├── analytics

├── notifications

├── instructor

├── admin

└── jobs

\`\`\`

Some nested resource routes may be used where they clearly express ownership/context.

**---**

**# 114. Critical API Rules**

The following rules are mandatory architectural principles:

1\. The backend is the authority for authorization.

2\. The backend is the authority for assessment scoring.

3\. The backend is the authority for lesson unlocking.

4\. The backend is the authority for enrollment state.

5\. The backend is the authority for mastery.

6\. Learning evidence is generated by trusted business operations.

7\. Learners cannot directly modify mastery/evidence.

8\. Instructors can only manage their own courses.

9\. Instructors can only access course-relevant enrolled-learner data.

10\. Admin operations are explicitly authorized and audited.

11\. AI output is validated before use.

12\. AI is not the source of truth for critical state.

13\. Large operations should move to background workers.

14\. Large collections must be paginated.

15\. Sensitive fields must never be returned accidentally.

16\. Critical state transitions should be idempotent.

17\. Database implementation details should remain behind the API boundary.

18\. Admin cannot change a user's role through normal user-management APIs.

19\. User deactivation is user-initiated.

20\. Admin suspension is platform-controlled.

**---**

**# 115. Final End-to-End API Architecture**

\`\`\`text

                         React Frontend

                               │

                               ▼

                         /api/v1/\*

                               │

                    ┌──────────┴──────────┐

                    │                     │

              Authentication        Validation

                    │                     │

                    └──────────┬──────────┘

                               ▼

                         Authorization

                               │

                               ▼

                           Controller

                               │

                               ▼

                         Application Service

                               │

              ┌────────────────┼────────────────┐

              │                │                │

              ▼                ▼                ▼

           MongoDB           Redis          External APIs

              │                │                │

              │           BullMQ Jobs      AI / Storage /

              │                │             YouTube /

              │                │              Email

              └────────────────┼────────────────┘

                               ▼

                         Learning Evidence

                               │

                               ▼

                         Learning State

                               │

                               ▼

                       Personalization

                               │

                               ▼

                        Recommendations

\`\`\`

**---**

**# 116. Source-of-Truth Hierarchy**

The API must respect the project documentation hierarchy:

\`\`\`text

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

06 Database Design

        ↓

07 API Design

        ↓

Implementation

\`\`\`

If implementation reveals a necessary change, update the appropriate design document rather than silently creating contradictory behavior.

**---**

**# 117. Scope Boundary**

This document intentionally does not yet finalize:

\- Express router implementation

\- controller code

\- service implementation

\- Mongoose schema code

\- exact OpenAPI YAML

\- exact JWT/cookie implementation

\- complete security policy

\- exact file-upload provider

\- exact AI provider

\- exact Redis caching keys

\- exact BullMQ job definitions

\- production deployment configuration

Those belong to later implementation-specific documents.

**---**

**# 118. Final API Principle**

The most important API principle is:

\> **\*\*The client requests actions and information; the backend decides whether those actions are valid and what the resulting learning state should be.\*\***

For example:

\`\`\`text

Client:

"Submit this assessment."

Backend:

"Is this attempt yours?"

"Is it still active?"

"Has time expired?"

"What answers were submitted?"

"What is the deterministic score?"

"What learning evidence was generated?"

"Did mastery change?"

"Is the next lesson unlocked?"

"What should the learner do next?"

\`\`\`

This keeps the platform secure, reliable, explainable, and suitable for future personalization.