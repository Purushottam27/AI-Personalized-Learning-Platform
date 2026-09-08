**# AI Based Personalized Learning Platform — Frontend Architecture & UX Design**

**## 1. Purpose**

This document defines the frontend architecture and UX principles for the AI Based Personalized Learning Platform.

It translates the approved backend, database, API, security, learning-model, personalization, and background-processing designs into a scalable React application.

The frontend must:

\- provide a clear learning experience

\- enforce the approved role-based navigation experience

\- consume backend APIs rather than duplicate business logic

\- remain reusable and maintainable

\- handle loading, empty, success, and failure states properly

\- support learner, instructor, and admin workflows

\- expose personalization clearly without overwhelming learners

\- remain responsive and accessible

\- be structured so future features can be added without major rewrites

**---**

**# 2. Core Frontend Principle**

\> **\*\*The frontend is the presentation and interaction layer; the backend remains the authoritative source of truth.\*\***

The frontend must not independently decide:

\`\`\`text

Assessment score

Lesson unlock

Course eligibility

Prerequisite satisfaction

Mastery

Authorization

Enrollment validity

Instructor ownership

Admin permissions

\`\`\`

Those decisions belong to backend services.

The frontend displays and interacts with the results.

**---**

**# 3. Recommended Frontend Technology**

The initial frontend stack is:

\`\`\`text

React

Vite

React Router

Tailwind CSS

Framer Motion

shadcn/ui

\`\`\`

Supporting libraries may be added when a concrete requirement justifies them.

Do not add libraries merely because they are popular.

**---**

**# 4. Frontend Architecture Style**

The frontend should use a modular feature-oriented architecture.

Conceptually:

\`\`\`text

src/

│

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

\`\`\`

The exact structure can evolve during implementation, but responsibility boundaries should remain clear.

**---**

**# 5. Application Layers**

The frontend can be viewed as:

\`\`\`text

UI Layer

   ↓

Feature Layer

   ↓

State Layer

   ↓

API/Service Layer

   ↓

Backend API

\`\`\`

Example:

\`\`\`text

LearnerDashboard

      ↓

useLearnerDashboard()

      ↓

learnerService.getDashboard()

      ↓

GET /api/v1/learning/me/dashboard

      ↓

Backend

\`\`\`

A component should not contain large amounts of direct API logic.

**---**

**# 6. Application Shell**

The application shell contains global UI infrastructure.

Potential responsibilities:

\`\`\`text

Global navigation

Theme

Notifications/toasts

Global loading behavior

Authentication initialization

Error boundary

Responsive shell

\`\`\`

Conceptually:

\`\`\`text

App

 ├── ThemeProvider

 ├── AuthProvider / Auth State

 ├── Router

 ├── Global UI

 └── Page

\`\`\`

The exact provider structure should remain as small as possible.

**---**

**# 7. Public and Protected Areas**

The application has two broad areas.

**### Public**

\`\`\`text

Landing page

Features

About/overview

Login

Signup

Public course discovery if enabled

\`\`\`

**### Protected**

\`\`\`text

Learner

Instructor

Admin

\`\`\`

Protected areas require authentication.

**---**

**# 8. Authentication State**

The frontend needs to know:

\`\`\`text

Is authentication initialized?

Is the user authenticated?

Who is the authenticated user?

What role does the user have?

\`\`\`

The frontend authentication state should contain appropriate lightweight user information such as:

\- \`\_id\`

\- \`name\`

\- \`role\`

\- \`status\`

\> **\*\*Note:\*\*** The backend remains authoritative for role and status. The frontend state is purely for UI and navigation.

Conceptually:

\`\`\`text

UNKNOWN

   ↓

INITIALIZING

   ↓

AUTHENTICATED / UNAUTHENTICATED

\`\`\`

Avoid showing a protected page before authentication state is resolved.

**---**

**# 9. Token Handling**

The approved authentication design uses short-lived access tokens and refresh tokens.

The frontend should not unnecessarily manipulate authentication tokens directly.

When authentication uses HttpOnly cookies:

\`\`\`text

Browser

   ↓

HttpOnly authentication cookies

   ↓

Backend

\`\`\`

If the backend uses HttpOnly cookies, JavaScript should not attempt to read those cookies. The frontend must not read refresh tokens through JavaScript.

**---**

**# 10. Refresh Flow**

The frontend API layer should centralize access-token renewal.

Conceptually:

\`\`\`text

API request

   ↓

Access token valid?

 ┌───────┴───────┐

 YES             NO

 ↓                ↓

Success       Refresh endpoint

                  ↓

            Validate refresh session

                  ↓

            Rotate refresh token

                  ↓

            Issue new access token

                  ↓

            Retry original request

\`\`\`

The refresh endpoint is: POST /api/v1/auth/refresh

The refresh token is handled through the approved authentication cookie mechanism.

The frontend should treat a successful refresh as an internal authentication operation rather than exposing the refresh token to application components.

If refresh fails because the session is invalid, expired, revoked, or the account is no longer active:

Refresh failure

      ↓

Inspect backend error code

      ↓

ACCOUNT\_DEACTIVATED?

      ├── YES → Clear authenticated frontend state

      │          ↓

      │       Show Deactivated Account UI

      │

      ACCOUNT\_SUSPENDED?

      ├── YES → Clear authenticated frontend state

      │          ↓

      │       Show Suspended Account UI

      │

      OTHER AUTH FAILURE

              ↓

       Clear authenticated state

              ↓

       Redirect to login

The frontend must not determine account state by inspecting human-readable

error messages. It must use the backend error.code.

The frontend must avoid infinite refresh loops.

A failed refresh request must not continuously retry itself.

**---**

**# 11. Authentication Pages**

Initial public authentication pages:

\`\`\`text

/signup

/login

/reactivate

\`\`\`

Potential future pages:

\`\`\`text

/forgot-password

/reset-password

/verify-email

\`\`\`

The /reactivate page is used for DEACTIVATED accounts and is not a normal

login page.

Only implement features that are included in the current approved scope.

**---**

**# 12. Signup Role Handling**

Public signup supports two platform roles:

```text
LEARNER
INSTRUCTOR
```

The role is a fundamental account property and is selected during signup.

The UI must never present `ADMIN` as a public signup option.

Recommended role-selection presentation:

```text
Create your account
        ↓
Choose how you will use the platform

[ Learner ]                 [ Instructor ]

Learner                      Instructor
Learn, practice, track       Create courses, teach learners,
progress, and receive        manage assessments, and view
personalized guidance.       course analytics.
```

The selected role is sent to the backend as `LEARNER` or `INSTRUCTOR`.
The frontend must not allow arbitrary role values.

Normal signup is distinct from Google signup. New Google users enter the
temporary Google setup flow before a permanent User is created.





**---**

**# 12A. Account States & Error Handling**

The application must handle account states through backend-provided

machine-readable error codes.

**### ACTIVE**

Normal account access.

**### SUSPENDED**

Backend returns:

\`\`\`text

ACCOUNT\_SUSPENDED

\`\`\`

Frontend behavior:

Clear authenticated state

        ↓

Show suspended-account UI

        ↓

Display suspension message

        ↓

No Reactivate Account action

The frontend may display the suspensionReason when it is returned by an

authorized backend response.

**### DEACTIVATED**

Backend returns:

ACCOUNT\_DEACTIVATED

Frontend behavior:

Clear authenticated state

        ↓

Show deactivated-account UI

        ↓

Display:

"Your account is currently deactivated."

"Your learning progress has been paused."

        ↓

Show [Reactivate Account]

The deactivated-account UI must not provide a normal Login action.

Error-code principle

The frontend must use stable backend error codes for application-state

decisions.

Example:

ACCOUNT\_DEACTIVATED

    → Deactivated Account UI

ACCOUNT\_SUSPENDED

    → Suspended Account UI

Human-readable error messages are for display and must not be used as the

primary frontend decision mechanism.

**---**

**# 12D. Learner Onboarding UX**

Learner onboarding is a fixed five-question progressive flow.

The UI presents **one question at a time** with:

```text
Progress indicator
Question
Answer controls
Optional "Other" input when applicable
Back
Next
```

The first question does not require a meaningful Back action.

Each answer is saved immediately through the onboarding API. The frontend
must not wait until the final question to persist all answers.

If the learner leaves or disconnects, the flow resumes from the first
unanswered fixed field using backend onboarding state.

The frontend loads the current Learner profile using:

GET /api/v1/learner-profile/me

Each onboarding answer is persisted immediately using:

PATCH /api/v1/learner-profile/me/onboarding

### Q1 — What would you like to learn about?
**Multi-select**

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology
- Other — Please specify

### Q2 — What are your main learning goals?
**Multi-select**

- Build practical skills
- Prepare for exams or academic studies
- Prepare for a job or career
- Improve existing knowledge
- Learn something new for personal interest
- Prepare for interviews
- Other — Please specify

### Q3 — How would you describe your current experience with your selected interests?
**Single-select**

- I have no prior knowledge
- I have a basic understanding
- I am comfortable with the fundamentals
- I have substantial experience
- I'm not sure

### Q4 — How much time can you dedicate to learning each day?
**Single-select**

- Less than 1 hour
- 1–2 hours
- 2–3 hours
- 3–4 hours
- 5 or more hours

### Q5 — How do you prefer to learn?
**Multi-select**

- Reading
- Videos
- Interactive Learning
- Practice Exercises
- Projects

Q1, Q2, and Q5 support multiple selections. Q3 and Q4 use single selection.

When `Other — Please specify` is selected, display a text input and store the
custom value rather than the literal value `Other`.

Onboarding is preference/context collection, not an assessment.

**# 12E. Instructor Onboarding UX**

Instructor onboarding is intentionally shorter and is not a mirror of learner
onboarding.

The UI presents two questions one at a time:

### Q1 — What best describes your professional role?
**Single-select**

- Software Developer / Designer
- Data Scientist
- Machine Learning Engineer
- Cybersecurity Professional
- Educator / Instructor
- Finance Professional
- Other — Please specify

Maps to `professionalTitle`.

### Q2 — What areas are you experienced in teaching?
**Multi-select**

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology
- Other — Please specify

Maps to `expertiseAreas[]`.

The frontend loads the current Instructor profile using:

GET /api/v1/instructor-profile/me

Each onboarding answer is persisted immediately using:

PATCH /api/v1/instructor-profile/me/onboarding

When `Other — Please specify` is selected, display a text input and store the
custom value.

Instructor profile-page fields are separate from onboarding:

```text
bio
experienceYears
organization
socialLinks
```

These should not be forced into onboarding.

**# 12F. Onboarding State and Resume UX**

The frontend represents:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

The UI may show `Question 3 of 5`, but it must not create an authoritative
`currentQuestion` field.

On resume, derive the first unanswered fixed field from backend data.

The frontend retrieves the persisted role-specific profile before rendering
or resuming onboarding.

Learner onboarding state is read from the LearnerProfile `onboardingState`.

Instructor onboarding completion is derived from the presence of a meaningful
`professionalTitle` and at least one `expertiseAreas` value, because the
InstructorProfile does not persist a separate onboardingState field.

The frontend may determine which question to display from the persisted
profile data, but the backend remains authoritative for onboarding validity
and completion.

Normal flow:

```text
Signup
  ↓
Login
  ↓
Onboarding
  ↓
Role-specific Profile
  ↓
Dashboard
```

Google new-user flow:

```text
Google Authentication
  ↓
Role Selection
  ↓
Role-specific Onboarding
  ↓
Complete Setup
  ↓
Dashboard
```

**# 12G. Google Authentication UX**

The public authentication UI should provide a clear:

```text
[ Continue with Google ]
```

New Google users enter the temporary setup experience:

```text
Google callback
      ↓
Role selection
      ↓
Role-specific onboarding
      ↓
Setup completion
      ↓
Authenticated application
```

The frontend must not assume that a Google callback immediately means a
permanent authenticated User exists.

If an existing password account has the same email but is not linked to
Google, the UI should instruct the user to sign in through the existing
authentication method. Do not silently merge accounts.

`ACCOUNT_SUSPENDED` and `ACCOUNT_DEACTIVATED` must route to their respective
account-state experiences.

**# 12B. UI States**

Add proper handling for various asynchronous states across the application:

\- **\*\*Loading:\*\*** Skeleton loaders or spinners.

\- **\*\*Success:\*\*** Success toasts or confirmation screens.

\- **\*\*Empty:\*\*** Clear empty states when no data is available.

\- **\*\*Error:\*\*** Friendly error messages with retry options if applicable.

\- **\*\*Processing:\*\*** Disabled buttons and processing indicators during submissions.

\- **\*\*Unauthorized / Forbidden:\*\*** Clear communication of missing permissions without leaking sensitive data.

**---**

**# 12C. Logout UX**

The frontend must provide clear Logout UX. When triggered, the frontend must call the backend logout endpoint (\`POST /api/v1/auth/logout\`), clear local authenticated state, and redirect to the public landing page or login screen.

**# 12H. Account-State Screen UX**

### Deactivated Account

When the backend returns `ACCOUNT_DEACTIVATED`, clear the normal authenticated
state and show a dedicated deactivated-account screen.

Display:

> Your account is currently deactivated. Your learning progress has been
> paused. Reactivate your account to continue learning.

Primary action:

```text
[ Reactivate Account ]
```

Do not present a normal Login action as the primary action on this screen.

### Suspended Account

When the backend returns `ACCOUNT_SUSPENDED`, clear the normal authenticated
state and show a dedicated suspended-account screen.

Explain that access is restricted. If the backend provides an authorized
`suspensionReason`, it may be displayed.

Do not show a self-reactivation action.

**# 13. Role-Based Frontend Architecture**

The three roles have different application experiences.

\`\`\`text

Learner

   ↓

Learner App

Instructor

   ↓

Instructor App

Admin

   ↓

Admin App

\`\`\`

The frontend should not rely only on hiding buttons.

The backend must enforce authorization.

**---**

**# 14. Role-Based Routing**

Conceptually:

\`\`\`text

/dashboard

   ↓

role

 ┌──────┼──────┐

 ▼      ▼      ▼

Learner Instructor Admin

\`\`\`

More explicit route groups may be used:

\`\`\`text

/learner/\*

/instructor/\*

/admin/\*

\`\`\`

The final URL strategy can be chosen during implementation.

**---**

**# 15. Route Protection**

The frontend should have route guards for UX and navigation control.

Example:

\`\`\`text

ProtectedRoute

RoleRoute

GuestRoute

\`\`\`

But:

\> Frontend route guards are not security boundaries.

Every protected API endpoint must still perform backend authentication and authorization.

**---**

**# 15A. Backend Authorization Remains Mandatory**

Frontend route protection exists for navigation and user experience.

It is not a security boundary.

For example:

\`\`\`text

Admin Route

   ↓

Frontend checks role

   ↓

Admin UI displayed

\`\`\`

**# 16. Route Categories**

Conceptually:

\`\`\`text

Public Routes

Auth Routes

Learner Routes

Instructor Routes

Admin Routes

Fallback Routes

\`\`\`

Avoid creating dozens of unrelated route wrappers.

**---**

**# 17. Learner Information Architecture**

The learner application is organized around learning tasks rather than
backend resources.

Primary navigation:

```text
Dashboard
My Courses
Explore
Recommendations
Analytics
Profile / Settings
```

The dashboard is the action-oriented home. The primary learner experience
should make these questions easy to answer:

```text
Where am I?
What should I do next?
How am I progressing?
What needs attention?
```

Learning remains the primary experience. Analytics and personalization support
learning rather than overwhelming the main navigation.

**# 18. Learner Dashboard**

The dashboard should answer:

\`\`\`text

Where am I?

What am I learning?

What should I do next?

How am I performing?

What needs my attention?

\`\`\`

It should not become a wall of charts.

**---**

**# 19. Learner Dashboard Structure**

Recommended conceptual sections:

\`\`\`text

Welcome

   ↓

Continue Learning

   ↓

Next Best Action

   ↓

Current Course Progress

   ↓

Strengths / Weaknesses

   ↓

Study Summary

   ↓

Recommended Learning

\`\`\`

Secondary analytics can live on the dedicated analytics page.

**---**

**# 20. Continue Learning**

If the learner has an active course:

\`\`\`text

Course

Current lesson

Progress

Resume button

\`\`\`

Example:

\`\`\`text

DBMS

Lesson 6 — Normalization

72% complete

[Resume Learning]

\`\`\`

The backend determines the correct continuation point.

**---**

**# 21. Next Best Action**

The personalization engine can provide one primary action.

Example:

\`\`\`text

Your next step

Review:

Normalization — Transitive Dependency

Why:

Your recent practice shows difficulty with this concept.

[Start Review]

\`\`\`

The frontend presents the recommendation; it does not calculate it.

**---**

**# 22. Recommendation Presentation**

Recommendations should be:

\- understandable

\- actionable

\- evidence-based

\- limited in quantity

\- dismissible where appropriate

\- linked to the correct learning destination

Avoid overwhelming learners with many recommendations.

**---**

**# 23. Learner Course Page**

The course page may show:

\`\`\`text

Course title

Instructor

Domain

Description

Learning objectives

Progress

Lesson list

Prerequisites

Resources

Assessment status

\`\`\`

For enrolled learners, learning content is available according to backend unlock rules.

**---**

**# 24. Course Discovery**

Learners may browse courses that they are not enrolled in.

Discovery can support:

\`\`\`text

Search

Domain filter

Topic/category filter

Instructor

Course level

Recommendation

\`\`\`

Public/private course visibility must follow backend rules.

**---**

**# 25. Recommended vs Discoverable Courses**

These are different.

**### Recommended**

Based on:

\`\`\`text

Interests

Learning history

Mastery

Goals

Prerequisites

Domain

\`\`\`

**### Discoverable**

Courses the learner is allowed to see or browse.

A course can be discoverable without being recommended.

**---**

**# 26. Course Enrollment UX**

For a course requiring enrollment:

\`\`\`text

Course overview

   ↓

Prerequisite information

   ↓

Diagnostic if required

   ↓

Eligibility result

   ↓

Enroll

\`\`\`

The backend remains responsible for eligibility.

**---**

**# 27. Diagnostic Assessment UX**

If configured by the instructor:

\`\`\`text

Course

   ↓

Diagnostic required

   ↓

Instructions

   ↓

Assessment

   ↓

Result

\`\`\`

Possible outcomes:

\`\`\`text

Eligible

Not eligible

Needs prerequisite

\`\`\`

The frontend should clearly explain the result.

**---**

**# 28. Lesson Experience**

The lesson page is a central learning screen.

Conceptually:

\`\`\`text

Course navigation

       │

       ▼

Lesson content

       │

       ├── Explanation

       ├── Examples

       ├── Resources

       ├── Notes

       └── Practice / Assessment

\`\`\`

**---**

**# 29. Lesson Content**

Instructor-created lesson content may include:

\`\`\`text

Explanation

Examples

Code/examples

Images

Notes

References

Resources

Practice

\`\`\`

The frontend should present content in a readable learning-oriented format.

**---**

**# 30. Resource Experience**

Resources can include:

\`\`\`text

YouTube video

PDF

PPT

Instructor notes

Book/reference

External learning resource

\`\`\`

Only approved/valid resources should be presented.

The frontend should distinguish:

\`\`\`text

Course content

Instructor resource

External resource

\`\`\`

when useful.

**---**

**# 31. YouTube Resource**

If a instructor adds an approved YouTube resource:

\`\`\`text

Lesson

   ↓

Video resource

   ↓

Embedded/player experience

\`\`\`

The exact embedding behavior must respect YouTube and browser policies.

The platform should not download or re-host videos unless the project explicitly gains the necessary rights and infrastructure.

**---**

**# 32. Lesson Progress**

The frontend can show:

\`\`\`text

Completed

In progress

Locked

Current

\`\`\`

But the backend remains authoritative for unlock state.

Example:

\`\`\`text

Lesson 1 ✓

Lesson 2 ✓

Lesson 3 → Current

Lesson 4 🔒

\`\`\`

**---**

**# 33. Locked Lessons**

A locked lesson should communicate:

\`\`\`text

Why it is locked

What must be completed

What the learner should do next

\`\`\`

Example:

\`\`\`text

Lesson 4 Locked

Complete the assessment for Lesson 3

to unlock this lesson.

\`\`\`

Do not expose protected lesson content merely because the frontend knows the route.

**---**

**# 34. Assessment/Quiz UX**

The quiz interface should support:

\`\`\`text

Question

Options

Question number

Total questions

Next

Previous

Timer where configured

Answer state

Submit

\`\`\`

**---**

**# 35. Quiz State**

Conceptual:

\`\`\`text

NOT\_STARTED

   ↓

IN\_PROGRESS

   ↓

SUBMITTED

   ↓

EVALUATED

\`\`\`

The frontend should maintain temporary answer state while the backend owns the authoritative attempt.

**---**

**# 36. Timer**

If the assessment has a time limit:

\`\`\`text

Timer

Question navigation

Answer selection

\`\`\`

The frontend timer improves UX, but the backend must enforce the authoritative time limit.

Never trust only the browser timer.

**---**

**# 37. Quiz Navigation**

The question navigator may show:

\`\`\`text

1 ✓

2 ✓

3 ?

4 —

5 ✓

\`\`\`

Possible meanings:

\`\`\`text

Answered

Current

Unanswered

\`\`\`

The UI should make the state obvious.

**---**

**# 38. Unanswered Questions**

Based on the approved learning model, unanswered questions are meaningful evidence.

Therefore the frontend should:

\- allow unanswered questions where appropriate

\- clearly show unanswered state

\- warn before submission if configured

\- not silently convert unanswered questions into guessed answers

The backend records them distinctly.

**---**

**# 39. Assessment Submission**

The frontend should:

\`\`\`text

Validate UI state

   ↓

Submit attempt

   ↓

Disable duplicate submission

   ↓

Show processing state

   ↓

Receive authoritative result

\`\`\`

Avoid allowing multiple accidental submissions.

**---**

**# 40. Assessment Results**

The result screen can show:

\`\`\`text

Score

Correct

Incorrect

Unanswered

Time

Performance summary

Topic-level feedback where available

Next recommended action

\`\`\`

Do not reveal answer explanations if the assessment policy does not permit them.

**---**

**# 41. Mastery Display**

Mastery should be communicated carefully.

Example:

\`\`\`text

Normalization

Mastery: 52%

Needs improvement

\`\`\`

Avoid presenting an estimated mastery value as absolute truth.

The UI may label it:

\`\`\`text

Estimated mastery

Current learning confidence

Learning status

\`\`\`

depending on final UX testing.

**---**

**# 42. Strengths and Weaknesses**

Learner analytics can show:

\`\`\`text

Strengths

 ├── SQL Basics

 └── ER Modeling

Needs Attention

 ├── Normalization

 └── Transactions

\`\`\`

The frontend should always provide an actionable next step.

**---**

**# 43. Analytics Page**

The analytics page can contain deeper information that does not fit on the dashboard.

Potential sections:

\`\`\`text

Course progress

Topic mastery

Assessment performance

Learning trends

Study activity

Strengths

Weaknesses

Intervention history

\`\`\`

**---**

**# 44. Analytics Visualization**

Charts should answer questions.

Examples:

\`\`\`text

How is mastery changing?

Which topics are weak?

How is assessment performance changing?

How much course progress has been made?

\`\`\`

Avoid charts that exist only for visual decoration.

**---**

**# 45. Study Hours**

If study-hour tracking is implemented:

\`\`\`text

Today

This week

Average

Trend

\`\`\`

The metric must have a clearly defined backend calculation.

Do not display an approximate number without explaining its meaning.

**---**

**# 46. Streaks**

If streaks are implemented:

\`\`\`text

Current streak

Longest streak

Recent activity

\`\`\`

The calculation belongs to backend logic.

The frontend only displays the result.

**---**

**# 47. Profile and Settings**

Learner profile/settings may include:

\`\`\`text

Profile information

Avatar

Preferences

Theme

Account settings

Logout

Account deactivation

\`\`\`

Account deactivation is a user-initiated reversible operation.

When deactivation succeeds:

Account

  ↓

DEACTIVATED

  ↓

Authentication state cleared

  ↓

Deactivated-account UI

  ↓

Reactivate Account action

The frontend must not present account deactivation as immediate destructive

data deletion.

Reactivation is handled through the dedicated reactivation flow.

Sensitive account operations should require backend authorization and appropriate confirmation.

**---**

**# 48. Instructor Application**

Instructor experience focuses on:

\`\`\`text

Course creation

Course management

Lesson management

Resource management

Question banks

Assessments

Learner enrollment

Course analytics

Learner performance

Profile/settings

\`\`\`

**---**

**# 49. Instructor Dashboard**

Potential sections:

\`\`\`text

Overview

Recent courses

Enrollment summary

Course performance

Learner activity

Weak topic overview

Recent activity

\`\`\`

The instructor should be able to quickly understand the state of their courses.

**---**

**# 50. Instructor Course Management**

Instructor course page:

\`\`\`text

Course details

Lessons

Resources

Assessments

Question bank

Learners

Analytics

Edit

Publish/unpublish

\`\`\`

**---**

**# 51. Course Creation UX**

Conceptual flow:

\`\`\`text

Create Course

   ↓

Basic Information

   ↓

Domain

   ↓

Learning Objectives

   ↓

Prerequisites

   ↓

Course Structure

   ↓

Lessons

   ↓

Resources

   ↓

Assessments

   ↓

Review

   ↓

Publish

\`\`\`

The UI should support drafts before publishing.

**---**

**# 52. Course Metadata**

Instructor may provide:

\`\`\`text

Course title

Description

Domain

Level

Learning objectives

Prerequisites

Estimated duration

Tags/categories

Instructor information

\`\`\`

This supports discovery and personalization.

**---**

**# 53. Lesson Builder**

Instructor should be able to:

\`\`\`text

Add lesson

Edit lesson

Reorder lesson

Archive lesson

Add explanation

Add examples

Add resources

Configure practice

\`\`\`

The backend determines what operations are permitted.

**---**

**# 54. Resource Management**

Instructor may add:

\`\`\`text

YouTube URL

PDF

PPT

Notes

External reference

\`\`\`

Uploaded files must pass backend validation and security controls.

**---**

**# 55. Question Bank**

Instructor should be able to:

\`\`\`text

Create question

Edit question

Delete/archive question

Assign topic

Assign difficulty

Add options

Set correct answer

Set marks/weight

Add explanation where permitted

\`\`\`

**---**

**# 56. Bulk Question Import**

The instructor workflow should support:

\`\`\`text

Upload Excel/PDF

      ↓

Processing

      ↓

Validation

      ↓

Preview

      ↓

Instructor correction/approval

      ↓

Publish to question bank

\`\`\`

This connects directly to the background-processing design.

**---**

**# 57. Assessment Builder**

Instructor configures:

\`\`\`text

Assessment title

Questions

Question pool

Time limit

Marks

Passing threshold

Attempt policy

Topic mapping

\`\`\`

Hard assessment rules must be stored and enforced by backend services.

**---**

**# 58. Question Pool Strategy**

The frontend should allow instructors to provide a sufficiently large question pool.

Example:

\`\`\`text

10 questions shown

30 questions available

\`\`\`

The backend can select an appropriate randomized set.

This supports fairer retry behavior and better learning analytics.

**---**

**# 59. Instructor Learner Management**

A instructor who owns/publishes a course should be able to see the learners enrolled in that course, subject to backend authorization.

Potential information:

\`\`\`text

Learner name

Enrollment date

Course progress

Assessment performance

Topic weaknesses

Learning status

\`\`\`

The instructor should not see unrelated private learner information.

**---**

**# 60. Instructor Analytics**

Instructor analytics should answer:

\`\`\`text

Which topics are learners struggling with?

Which lessons have high failure rates?

How are learners progressing?

Which assessments are difficult?

Which learners need attention?

\`\`\`

**---**

**# 61. Instructor Weakness Heatmap**

Potential visualization:

\`\`\`text

Topic                Avg mastery

\--------------------------------

SQL Basics              84%

Normalization           61%

Transactions            57%

Indexing                76%

\`\`\`

This helps instructors improve course content.

**---**

**# 62. Instructor Learner Detail**

A instructor may open an enrolled learner's course-level learning view.

The information should be scoped to:

\`\`\`text

That instructor

\+

That instructor's course

\`\`\`

The backend must enforce this relationship.

**---**

**# 63. Admin Application**

Admin handles platform-level operations.

Potential areas:

\`\`\`text

Dashboard

Users

Courses

Instructors

Learners

System analytics

Audit logs

Reports

Moderation

Settings

\`\`\`

The exact admin MVP should remain limited to required operations.

**---**

**# 64. Admin Dashboard**

Potential metrics:

\`\`\`text

Total users

Learners

Instructors

Courses

Enrollments

Assessment activity

System health

Recent administrative activity

\`\`\`

**---**

**# 65. Admin User Management**

Potential operations:

\`\`\`text

View user

Search user

Change controlled account state

Suspend

Reactivate

Review role

\`\`\`

Admin actions must be protected and audited.

**---**



**---**

**# 65A. Admin User Management UX**

Admin User Management UX must cover:

\- **\*\*User list:\*\*** Showing Name, Email, Role, Status, and Action/View.

\- **\*\*Search, Filters, Pagination:\*\*** For efficiently navigating users.

\- **\*\*User detail:\*\*** 

  - Account Information (Name, Email, Role, Status, Avatar, Joined)

  - For Learner: Learner information and appropriate learning overview

  - For Instructor: Instructor information and appropriate learning overview

\- **\*\*Suspend/Unsuspend UI:\*\*** Admins may suspend an ACTIVE user or unsuspend a SUSPENDED user.

\> **\*\*CRITICAL:\*\*** Admin UI must NOT contain role-change controls, deactivation controls, or controls to change another user's password, mastery, or learning evidence.

**# 66. Admin Course Management**

Potential operations:

\`\`\`text

Review course

Publish/unpublish where permitted

Moderate content

View owner

View enrollment

Archive

\`\`\`

The admin should not silently modify instructor-owned content without an auditable reason.

**---**

**# 67. Admin Audit Logs**

Admin actions should be visible in an appropriate audit interface.

Examples:

\`\`\`text

Who

What

When

Target

Result

\`\`\`

Sensitive values should not be exposed unnecessarily.

**---**

**# 67A. UI Design Direction and Design System**

The product should use a calm, learning-first visual language rather than a
generic analytics-dashboard appearance.

Primary design qualities:

```text
Clarity
Readability
Focus
Trust
Consistent hierarchy
Low cognitive load
Accessible interaction
```

### Page hierarchy

Important pages should generally establish:

```text
Page purpose
    ↓
Primary action
    ↓
Relevant context
    ↓
Secondary information
    ↓
Optional deeper detail
```

### Learning surfaces

Learning pages prioritize content and the next learning action:

```text
Course / Lesson context
        ↓
Main learning content
        ↓
Practice / Assessment action
        ↓
Supporting resources
```

### Dashboard surfaces

Dashboards prioritize action over data density:

```text
Primary next action
        ↓
Continue learning
        ↓
Important progress/context
        ↓
Recommendations
        ↓
Secondary analytics
```

### Cards

A card should represent a meaningful piece of information or action. Avoid
using cards only to decorate empty space.

### Buttons

The primary button should represent the most important action on the current
screen. Destructive actions require explicit confirmation.

### Forms

Long forms should be divided into logical sections. Field errors should be
shown close to the affected field, with clear required/optional semantics.

### Design tokens

Use centralized tokens for:

```text
Color
Typography
Spacing
Radius
Elevation
Borders
Motion
Breakpoints
Focus states
```

Feature components should consume the design system instead of scattering
hard-coded visual values throughout the codebase.

### Responsive principle

Responsive design should preserve task hierarchy and content readability.
Do not simply shrink the desktop UI onto mobile.

**# 68. Shared Layouts**

Potential layouts:

\`\`\`text

PublicLayout

AuthLayout

LearnerLayout

InstructorLayout

AdminLayout

\`\`\`

Each layout can provide role-appropriate navigation and shell structure.

**---**

**# 69. Navigation**

Learner:

\`\`\`text

Dashboard

My Courses

Explore

Recommendations

Analytics

Profile

\`\`\`

Instructor:

\`\`\`text

Dashboard

My Courses

Learners

Analytics

Profile

\`\`\`

Admin:

\`\`\`text

Dashboard

Users

Courses

Analytics

Audit Logs

Settings

\`\`\`

The final navigation should remain consistent with actual MVP scope.

**---**

**# 70. Responsive Navigation**

Desktop may use:

\`\`\`text

Sidebar + top bar

\`\`\`

Mobile may use:

\`\`\`text

Top bar

Drawer

Bottom navigation where appropriate

\`\`\`

Do not force desktop navigation onto small screens.

**---**

**# 71. Theme System**

The platform should support:

\`\`\`text

Light

Dark

System preference

\`\`\`

Theme state should be centralized.

Components should use design tokens rather than hard-coded colors everywhere.

**---**

**# 72. Design System**

The frontend should establish reusable tokens for:

\`\`\`text

Colors

Typography

Spacing

Radius

Shadows

Borders

Motion

Breakpoints

\`\`\`

The exact visual style should be finalized during UI design.

**---**

**# 73. Component Strategy**

Components should be reusable at appropriate levels.

**### Primitive**

\`\`\`text

Button

Input

Dialog

Card

Badge

Tooltip

\`\`\`

**### Shared**

\`\`\`text

Navbar

Sidebar

PageHeader

EmptyState

LoadingState

ErrorState

\`\`\`

**### Feature-specific**

\`\`\`text

CourseCard

LessonList

QuizQuestion

MasteryCard

RecommendationCard

InstructorCourseEditor

\`\`\`

Avoid creating a component abstraction for every tiny element.

**---**

**# 74. Component Ownership**

Feature components should primarily live near their feature.

Example:

\`\`\`text

features/

└── courses/

    ├── components/

    ├── hooks/

    ├── services/

    └── types/

\`\`\`

This improves discoverability and maintainability.

**---**

**# 75. State Management**

Not all state belongs in a global store.

Separate:

**### Server state**

\`\`\`text

Courses

User profile

Enrollments

Analytics

Recommendations

Assessment data

\`\`\`

**### Client/UI state**

\`\`\`text

Modal open

Sidebar open

Selected tab

Theme

Temporary form state

\`\`\`

**### Authentication state**

\`\`\`text

Current user

Authentication initialization

Role

\`\`\`

Use the simplest suitable mechanism for each.

**---**

**# 76. API State**

The frontend should centralize API communication.

Conceptually:

\`\`\`text

services/

 ├── auth.service

 ├── course.service

 ├── enrollment.service

 ├── lesson.service

 ├── assessment.service

 ├── personalization.service

 └── analytics.service

\`\`\`

Components should not duplicate endpoint construction.

**---**

**# 77. API Client**

A centralized HTTP client should handle common concerns:

\`\`\`text

Base URL

Credentials/cookies

Headers

Error normalization

Authentication refresh

Request cancellation where useful

\`\`\`

The exact library can be selected during implementation.

**---**

**# 78. API Response Handling**

The frontend should have a consistent interpretation of:

\`\`\`text

Success

Validation error

Authentication error

Authorization error

Not found

Conflict

Rate limit

Server error

Network error

\`\`\`

The backend API design remains authoritative.

**---**

**# 79. Error UX**

Different errors need different UX.

**### 401**

\`\`\`text

Session expired

→ attempt refresh

→ redirect to login if refresh fails

\`\`\`

**### 403**

\`\`\`text

You do not have permission.

\`\`\`

**### 404**

\`\`\`text

The requested resource could not be found.

\`\`\`

**### 409**

\`\`\`text

The requested operation conflicts with current state.

\`\`\`

**### 429**

\`\`\`text

Too many requests.

Please try again shortly.

\`\`\`

**### 500**

\`\`\`text

Something went wrong.

Try again.

\`\`\`

**---**

**# 79A. Standard UI State Model**

Reusable pages/components should follow consistent state semantics.

Data state:

```text
INITIAL
  ↓
LOADING
  ↓
SUCCESS
  ├── DATA
  └── EMPTY
  ↓
ERROR
```

Mutation state:

```text
IDLE
  ↓
SUBMITTING / SAVING / PROCESSING
  ↓
SUCCESS or ERROR
```

Authentication state:

```text
INITIALIZING
  ↓
AUTHENTICATED
  or
UNAUTHENTICATED
```

Account-state errors:

```text
ACCOUNT_DEACTIVATED → Deactivated Account UI
ACCOUNT_SUSPENDED   → Suspended Account UI
Other 401           → Refresh / Login flow
```

Shared UI primitives should provide consistent loading, empty, error, and
processing patterns rather than every feature inventing its own.

**# 80. Loading States**

Every data-driven page should consider:

\`\`\`text

Initial loading

Background refresh

Submitting

Saving

Processing

\`\`\`

Avoid displaying blank screens.

Use:

\`\`\`text

Skeletons

Spinners

Progress indicators

Disabled buttons

\`\`\`

appropriately.

**---**

**# 81. Empty States**

Examples:

\`\`\`text

No enrolled courses

No recommendations yet

No analytics data yet

No learners enrolled

No courses created

No questions in bank

\`\`\`

Every empty state should tell the user what they can do next.

**---**

**# 82. Processing States**

For asynchronous operations:

\`\`\`text

Question import processing

AI recommendation processing

Analytics updating

\`\`\`

The frontend should display honest status.

Example:

\`\`\`text

Your question file is being processed.

You can continue working and return when it is ready.

\`\`\`

**---**

**# 83. Error Recovery**

Where possible provide:

\`\`\`text

Retry

Go back

Return to dashboard

Contact support

\`\`\`

Do not force users to reload the entire application to recover from a recoverable failure.

**---**

**# 84. Forms**

Forms should provide:

\`\`\`text

Clear labels

Validation

Helpful errors

Disabled submit during processing

Success feedback

Preserved values when appropriate

\`\`\`

Client-side validation improves UX.

Backend validation remains mandatory.

**---**

**# 85. Course Editor Forms**

Instructor course forms may be long.

Use logical sections:

\`\`\`text

Basic information

Learning objectives

Prerequisites

Lessons

Resources

Assessments

Publishing

\`\`\`

Avoid one enormous undifferentiated form.

**---**

**# 86. Accessibility**

The frontend should target accessible interaction.

Important practices:

\`\`\`text

Semantic HTML

Keyboard navigation

Visible focus

Accessible labels

Color contrast

Alt text

Accessible dialogs

Screen-reader-friendly state

Reduced-motion consideration

\`\`\`

Accessibility should be built into reusable components.

**---**

**# 87. Motion**

Framer Motion can be used for:

\`\`\`text

Page transitions

Card entrance

Micro-interactions

Modal transitions

Progress animations

\`\`\`

Avoid excessive animation during learning.

Motion should support understanding, not distract from content.

**---**

**# 88. UX Principle — Learning First**

The learner interface should prioritize:

\`\`\`text

Understand

Practice

Measure

Improve

Continue

\`\`\`

not:

\`\`\`text

Gamification

Animations

Decorative dashboards

\`\`\`

Features should support learning efficiency.

**---**

**# 89. UX Principle — Reduce Cognitive Load**

Do not show every metric simultaneously.

Prefer:

\`\`\`text

Primary action

\+

Relevant context

\+

Optional deeper analytics

\`\`\`

This is especially important on the learner dashboard.

**---**

**# 90. UX Principle — Explain Recommendations**

When showing a recommendation:

\`\`\`text

What?

Why?

What will happen?

\`\`\`

Example:

\`\`\`text

Review Normalization

Why:

Your recent practice shows difficulty with transitive dependencies.

Action:

Review Lesson 7 and complete targeted practice.

[Start]

\`\`\`

**---**

**# 91. UX Principle — No False Intelligence**

The UI should not imply:

\`\`\`text

AI knows everything about you.

\`\`\`

Use language such as:

\`\`\`text

Based on your recent learning activity

Estimated mastery

Recommended next step

\`\`\`

This improves trust.

**---**

**# 92. UX Principle — Preserve Learner Agency**

Personalization should guide, not trap.

The learner should generally be able to:

\`\`\`text

Understand recommendation

Choose to follow it

Return later

Explore other allowed courses

\`\`\`

Hard prerequisites are exceptions because they are curriculum constraints.

**---**

**# 93. UX Principle — Instructor Control**

Instructors should understand:

\`\`\`text

What content they created

What prerequisites they configured

What assessment rules they configured

What learners are seeing

What analytics are measuring

\`\`\`

Personalization should operate within instructor-defined curriculum boundaries.

**---**

**# 94. UX Principle — Admin Control**

Admin UI should prioritize:

\`\`\`text

Safety

Auditability

Clarity

Operational visibility

\`\`\`

Admin actions should be explicit and confirmation-protected where destructive.

**---**

**# 95. Frontend Security Principles**

Never rely on frontend hiding for authorization.

Avoid:

\`\`\`text

if (role === "instructor") {

    show admin data

}

\`\`\`

as the security mechanism.

Instead:

\`\`\`text

Frontend:

controls UX

Backend:

enforces authorization

\`\`\`

Never put:

\`\`\`text

JWT secrets

database credentials

AI provider secrets

private API keys

\`\`\`

in frontend code.

**---**

**# 96. XSS and Content Rendering**

Instructor-created content may contain rich text.

The frontend must safely render it.

Avoid blindly injecting arbitrary HTML.

Use a trusted sanitization/rendering strategy before allowing HTML-like content.

**---**

**# 97. File Handling**

For instructor uploads:

\`\`\`text

Frontend

 ↓

Validate basic UX constraints

 ↓

Backend validates security constraints

 ↓

Upload

 ↓

Background processing if required

\`\`\`

Frontend file validation is not a security boundary.

**---**

**# 98. Performance**

Important frontend goals:

\`\`\`text

Fast initial load

Lazy-load large features

Avoid unnecessary API requests

Avoid unnecessary re-renders

Optimize images

Paginate large datasets

Virtualize long lists when needed

\`\`\`

Do not prematurely optimize everything.

Measure first when possible.

**---**

**# 99. Code Splitting**

Role-specific and heavy pages can be lazy-loaded.

Examples:

\`\`\`text

Admin dashboard

Instructor course editor

Analytics

Assessment builder

\`\`\`

This reduces initial learner bundle size.

**---**

**# 100. Data Fetching**

Pages should request only the data they need.

Avoid:

\`\`\`text

Dashboard loads entire database

\`\`\`

Prefer backend dashboard endpoints or appropriate API composition.

**---**

**# 101. Caching**

Safe-to-cache server data may include:

\`\`\`text

Course metadata

Domain lists

Static reference information

\`\`\`

Highly dynamic data should be handled carefully:

\`\`\`text

Assessment state

Current attempt

Authorization-sensitive data

\`\`\`

Cache invalidation must not cause stale authoritative information to be presented as current.

**---**

**# 102. Pagination and Infinite Lists**

Use pagination for:

\`\`\`text

Courses

Learners

Questions

Audit logs

Notifications

\`\`\`

Do not load thousands of records into the browser unnecessarily.

**---**

**# 103. Search**

Search should be backed by appropriate backend APIs.

Frontend:

\`\`\`text

Search input

   ↓

Debounce if appropriate

   ↓

API

   ↓

Results

\`\`\`

Do not fetch all records and filter everything in the browser.

**---**

**# 104. Frontend Analytics**

The frontend may render:

\`\`\`text

Charts

Cards

Progress bars

Tables

\`\`\`

but analytics calculations should generally come from backend services.

The frontend should not independently calculate official mastery or course analytics.

**---**

**# 105. Learner Dashboard Data Contract**

Conceptually the dashboard needs:

\`\`\`text

User summary

Continue-learning state

Next best action

Course progress

Key strengths

Key weaknesses

Recent activity

Recommended courses

\`\`\`

The exact endpoint/response contract follows the approved API design.

**---**

**# 106. Instructor Dashboard Data Contract**

Conceptually:

\`\`\`text

Instructor summary

Recent courses

Enrollment summary

Course performance

Weak-topic summary

Recent activity

\`\`\`

**---**

**# 107. Admin Dashboard Data Contract**

Conceptually:

\`\`\`text

Platform summary

User counts

Course counts

Enrollment counts

System activity

Moderation indicators

\`\`\`

**---**

**# 108. Cross-Role Design Consistency**

All roles should share:

\`\`\`text

Typography

Theme

Spacing

Interaction patterns

Feedback patterns

Accessibility

\`\`\`

but have role-specific navigation and functionality.

**---**

**# 109. UX for Failure in Background Processing**

If a personalization worker fails:

\`\`\`text

Learner still sees current learning state

       ↓

Fallback recommendation if available

       ↓

No broken dashboard

\`\`\`

If a instructor import fails:

\`\`\`text

Import status = FAILED

       ↓

Show useful reason

       ↓

Retry/upload corrected file

\`\`\`

**---**

**# 110. UX for Eventual Consistency**

After an assessment:

\`\`\`text

Score:

Immediately available

Personalization:

Updating...

\`\`\`

Then:

\`\`\`text

Recommendation:

Ready

\`\`\`

The UI should clearly distinguish authoritative result from background-generated enrichment.

**---**

**# 111. Frontend Testing Strategy Alignment**

Frontend tests should cover:

\`\`\`text

Rendering

Interaction

Forms

Routing

Authentication flows

Role-based navigation

API error states

Assessment behavior

Recommendation presentation

Accessibility

\`\`\`

Detailed testing strategy will be finalized in \`12-testing-strategy.md\`.

**---**

**# 112. E2E User Journeys**

Important E2E journeys:

**### Learner**

\`\`\`text

Signup

 ↓

Login

 ↓

Dashboard

 ↓

Course

 ↓

Lesson

 ↓

Assessment

 ↓

Result

 ↓

Recommendation

 ↓

Remediation

\`\`\`

**### Instructor**

\`\`\`text

Login

 ↓

Create Course

 ↓

Add Lesson

 ↓

Add Questions

 ↓

Publish

 ↓

Learner Enrolls

 ↓

Instructor Views Learner

 ↓

Analytics

\`\`\`

**### Admin**

\`\`\`text

Login

 ↓

Dashboard

 ↓

User/Course management

 ↓

Audit

\`\`\`

**---**

**# 113. Frontend Development Workflow**

Recommended workflow:

\`\`\`text

Read relevant docs

      ↓

Define feature

      ↓

Define API contract

      ↓

Create service

      ↓

Create state/hooks

      ↓

Create components

      ↓

Create page

      ↓

Handle loading/error/empty

      ↓

Integrate

      ↓

Test

\`\`\`

Do not start by creating dozens of pages without backend contracts.

**---**

**# 114. Antigravity Development Rules**

Antigravity should be given:

\`\`\`text

Relevant documentation

Current project progress

Approved API contract

Existing component patterns

Existing design system

\`\`\`

It should not:

\`\`\`text

Invent backend endpoints

Invent database fields

Duplicate business logic

Create fake production data as a permanent solution

Change architecture without discussion

Replace approved authentication behavior

\`\`\`

**---**

**# 115. Frontend Change Discipline**

Before changing architecture, ask:

\`\`\`text

Does this conflict with approved docs?

Does it duplicate an existing abstraction?

Does it change an API contract?

Does it change authorization assumptions?

Does it introduce unnecessary dependencies?

\`\`\`

If yes, update the relevant design first.

**---**

**# 116. Definition of Done for a Frontend Feature**

A feature is not complete merely because the UI renders.

It should have:

\`\`\`text

UI

API integration

Authentication/authorization handling

Loading state

Empty state

Error state

Success state

Responsive behavior

Accessibility considerations

Validation

Relevant tests

\`\`\`

**---**

**# 117. Recommended Frontend Implementation Order**

Do not build all dashboards at once.

Recommended order:

\`\`\`text

1\. Frontend foundation

2\. Theme/design system

3\. Authentication

4\. Application shell

5\. Role-based routing

6\. Learner dashboard

7\. Course discovery

8\. Enrollment

9\. Course/lesson experience

10\. Assessment experience

11\. Personalization UI

12\. Learner analytics

13\. Instructor course management

14\. Instructor assessments/question bank

15\. Instructor analytics

16\. Learner management

17\. Admin dashboard

18\. Admin management

19\. Final UX polish

\`\`\`

The order can change when backend dependencies require it.

**---**

**# 118. Frontend and Backend Development Strategy**

Do not build the entire frontend first and the entire backend afterward.

Use vertical slices:

\`\`\`text

Backend Feature

      ↓

API

      ↓

Frontend Feature

      ↓

Integration

      ↓

Test

\`\`\`

Example:

\`\`\`text

Authentication

   ↓

Auth API

   ↓

Login UI

   ↓

Protected routes

   ↓

Integration test

\`\`\`

Then:

\`\`\`text

Course

   ↓

Course API

   ↓

Course UI

   ↓

Integration test

\`\`\`

**---**

**# 119. Frontend Source of Truth**

The hierarchy should be:

\`\`\`text

Backend domain rules

        ↓

API contract

        ↓

Frontend service

        ↓

Frontend state

        ↓

UI

\`\`\`

The UI should never become the source of truth for business rules.

**---**

**# 120. Final Frontend Architecture**

\`\`\`text

                        REACT APPLICATION

                               │

                 ┌─────────────┴─────────────┐

                 ▼                           ▼

            Public App                 Protected App

                                             │

                              ┌──────────────┼──────────────┐

                              ▼              ▼              ▼

                           Learner        Instructor         Admin

                              │              │              │

                              └──────────────┼──────────────┘

                                             ▼

                                      Feature Modules

                                             │

                              ┌──────────────┼──────────────┐

                              ▼              ▼              ▼

                            Pages       Components       Hooks

                                             │

                                             ▼

                                      Service / API Layer

                                             │

                                             ▼

                                       Backend APIs

                                             │

                   ┌─────────────────────────┼────────────────────┐

                   ▼                         ▼                    ▼

                MongoDB                  Redis/BullMQ        AI Services

\`\`\`

**---**

**# 121. Final UX Principles**

The frontend should follow these principles:

\`\`\`text

1\. Learning first.

2\. Keep the primary action clear.

3\. Reduce cognitive load.

4\. Explain recommendations.

5\. Preserve learner agency.

6\. Keep instructor control visible.

7\. Never rely on frontend security.

8\. Handle every important loading/error/empty state.

9\. Use reusable components without over-abstraction.

10\. Build responsive and accessible experiences.

11\. Keep backend business logic out of UI components.

12\. Build vertical slices instead of isolated mock pages.

13\. Do not invent API contracts.

14\. Treat AI output as enhancement, not authoritative state.

15\. Make the application understandable before making it visually impressive.

\`\`\`

**---**

**# 122. Final Frontend Principle**

The frontend should turn the platform's intelligence into a simple learner experience:

\`\`\`text

Complex System

      ↓

Clear UI

      ↓

Learner understands:

      ↓

Where I am

What I know

What I struggle with

What I should do next

Why it is recommended

How I am improving

\`\`\`

The goal is not merely to create a beautiful LMS.

\> **\*\*The frontend should make the platform's personalized learning intelligence understandable, actionable, trustworthy, and easy to use.\*\***