# AI Based Personalized Learning Platform — Frontend Architecture & UX Design

## 1. Purpose

This document defines the frontend architecture and UX principles for the AI Based Personalized Learning Platform.

It translates the approved backend, database, API, security, learning-model, personalization, and background-processing designs into a scalable React application.

The frontend must:

- provide a clear learning experience
- enforce the approved role-based navigation experience
- consume backend APIs rather than duplicate business logic
- remain reusable and maintainable
- handle loading, empty, success, and failure states properly
- support student, teacher, and admin workflows
- expose personalization clearly without overwhelming students
- remain responsive and accessible
- be structured so future features can be added without major rewrites

---

# 2. Core Frontend Principle

> **The frontend is the presentation and interaction layer; the backend remains the authoritative source of truth.**

The frontend must not independently decide:

```text
Assessment score
Lesson unlock
Course eligibility
Prerequisite satisfaction
Mastery
Authorization
Enrollment validity
Teacher ownership
Admin permissions
```

Those decisions belong to backend services.

The frontend displays and interacts with the results.

---

# 3. Recommended Frontend Technology

The initial frontend stack is:

```text
React
Vite
React Router
Tailwind CSS
Framer Motion
shadcn/ui
```

Supporting libraries may be added when a concrete requirement justifies them.

Do not add libraries merely because they are popular.

---

# 4. Frontend Architecture Style

The frontend should use a modular feature-oriented architecture.

Conceptually:

```text
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
```

The exact structure can evolve during implementation, but responsibility boundaries should remain clear.

---

# 5. Application Layers

The frontend can be viewed as:

```text
UI Layer
   ↓
Feature Layer
   ↓
State Layer
   ↓
API/Service Layer
   ↓
Backend API
```

Example:

```text
StudentDashboard
      ↓
useStudentDashboard()
      ↓
studentService.getDashboard()
      ↓
GET /api/v1/students/me/dashboard
      ↓
Backend
```

A component should not contain large amounts of direct API logic.

---

# 6. Application Shell

The application shell contains global UI infrastructure.

Potential responsibilities:

```text
Global navigation
Theme
Notifications/toasts
Global loading behavior
Authentication initialization
Error boundary
Responsive shell
```

Conceptually:

```text
App
 ├── ThemeProvider
 ├── AuthProvider / Auth State
 ├── Router
 ├── Global UI
 └── Page
```

The exact provider structure should remain as small as possible.

---

# 7. Public and Protected Areas

The application has two broad areas.

### Public

```text
Landing page
Features
About/overview
Login
Signup
Public course discovery if enabled
```

### Protected

```text
Student
Teacher
Admin
```

Protected areas require authentication.

---

# 8. Authentication State

The frontend needs to know:

```text
Is user authenticated?
Who is the user?
What role does the user have?
Is authentication still being initialized?
```

Conceptually:

```text
UNKNOWN
   ↓
INITIALIZING
   ↓
AUTHENTICATED / UNAUTHENTICATED
```

Avoid showing a protected page before authentication state is resolved.

---

# 9. Token Handling

The approved authentication design uses access and refresh tokens.

The frontend should not unnecessarily manipulate tokens directly.

Prefer:

```text
API client
   ↓
Authenticated request
   ↓
Backend
```

If the backend uses HttpOnly cookies, JavaScript should not attempt to read those cookies.

---

# 10. Refresh Flow

Conceptually:

```text
API request
   ↓
Access token valid?
 ┌───────┴───────┐
 YES             NO
 ↓                ↓
Success       Refresh endpoint
                  ↓
            New access token
                  ↓
            Retry request
```

The frontend API layer should centralize this behavior rather than implementing refresh logic inside every component.

---

# 11. Authentication Pages

Initial public authentication pages:

```text
/signup
/login
```

Potential future pages:

```text
/forgot-password
/reset-password
/verify-email
```

Only implement features that are included in the current approved scope.

---

# 12. Signup Role Handling

The signup page should not allow an arbitrary public user to self-assign privileged roles.

The approved testing/development strategy may temporarily expose controlled role selection, but production must use a secure role-assignment mechanism.

Recommended production principle:

```text
Student
→ normal public signup

Teacher
→ approved/invited/verified flow

Admin
→ never public self-registration
```

---

# 13. Role-Based Frontend Architecture

The three roles have different application experiences.

```text
Student
   ↓
Student App

Teacher
   ↓
Teacher App

Admin
   ↓
Admin App
```

The frontend should not rely only on hiding buttons.

The backend must enforce authorization.

---

# 14. Role-Based Routing

Conceptually:

```text
/dashboard
   ↓
role
 ┌──────┼──────┐
 ▼      ▼      ▼
Student Teacher Admin
```

More explicit route groups may be used:

```text
/student/*
/teacher/*
/admin/*
```

The final URL strategy can be chosen during implementation.

---

# 15. Route Protection

The frontend should have route guards for UX and navigation control.

Example:

```text
ProtectedRoute
RoleRoute
GuestRoute
```

But:

> Frontend route guards are not security boundaries.

Every protected API endpoint must still perform backend authentication and authorization.

---

# 16. Route Categories

Conceptually:

```text
Public Routes
Auth Routes
Student Routes
Teacher Routes
Admin Routes
Fallback Routes
```

Avoid creating dozens of unrelated route wrappers.

---

# 17. Student Application Structure

The student experience should focus on:

```text
Learning
Progress
Personalization
Practice
Assessment
Analytics
Profile
```

Potential navigation:

```text
Dashboard
My Courses
Explore Courses
Recommendations
Analytics
Profile / Settings
```

Exact navigation can be refined during UX implementation.

---

# 18. Student Dashboard

The dashboard should answer:

```text
Where am I?
What am I learning?
What should I do next?
How am I performing?
What needs my attention?
```

It should not become a wall of charts.

---

# 19. Student Dashboard Structure

Recommended conceptual sections:

```text
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
```

Secondary analytics can live on the dedicated analytics page.

---

# 20. Continue Learning

If the student has an active course:

```text
Course
Current lesson
Progress
Resume button
```

Example:

```text
DBMS
Lesson 6 — Normalization
72% complete

[Resume Learning]
```

The backend determines the correct continuation point.

---

# 21. Next Best Action

The personalization engine can provide one primary action.

Example:

```text
Your next step

Review:
Normalization — Transitive Dependency

Why:
Your recent practice shows difficulty with this concept.

[Start Review]
```

The frontend presents the recommendation; it does not calculate it.

---

# 22. Recommendation Presentation

Recommendations should be:

- understandable
- actionable
- evidence-based
- limited in quantity
- dismissible where appropriate
- linked to the correct learning destination

Avoid overwhelming students with many recommendations.

---

# 23. Student Course Page

The course page may show:

```text
Course title
Teacher
Department
Description
Learning objectives
Progress
Lesson list
Prerequisites
Resources
Assessment status
```

For enrolled students, learning content is available according to backend unlock rules.

---

# 24. Course Discovery

Students may browse courses that they are not enrolled in.

Discovery can support:

```text
Search
Department filter
Topic/category filter
Teacher
Course level
Recommendation
```

Public/private course visibility must follow backend rules.

---

# 25. Recommended vs Discoverable Courses

These are different.

### Recommended

Based on:

```text
Interests
Learning history
Mastery
Goals
Prerequisites
Department
```

### Discoverable

Courses the student is allowed to see or browse.

A course can be discoverable without being recommended.

---

# 26. Course Enrollment UX

For a course requiring enrollment:

```text
Course overview
   ↓
Prerequisite information
   ↓
Diagnostic if required
   ↓
Eligibility result
   ↓
Enroll
```

The backend remains responsible for eligibility.

---

# 27. Diagnostic Assessment UX

If configured by the teacher:

```text
Course
   ↓
Diagnostic required
   ↓
Instructions
   ↓
Assessment
   ↓
Result
```

Possible outcomes:

```text
Eligible
Not eligible
Needs prerequisite
```

The frontend should clearly explain the result.

---

# 28. Lesson Experience

The lesson page is a central learning screen.

Conceptually:

```text
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
```

---

# 29. Lesson Content

Teacher-created lesson content may include:

```text
Explanation
Examples
Code/examples
Images
Notes
References
Resources
Practice
```

The frontend should present content in a readable learning-oriented format.

---

# 30. Resource Experience

Resources can include:

```text
YouTube video
PDF
PPT
Teacher notes
Book/reference
External learning resource
```

Only approved/valid resources should be presented.

The frontend should distinguish:

```text
Course content
Teacher resource
External resource
```

when useful.

---

# 31. YouTube Resource

If a teacher adds an approved YouTube resource:

```text
Lesson
   ↓
Video resource
   ↓
Embedded/player experience
```

The exact embedding behavior must respect YouTube and browser policies.

The platform should not download or re-host videos unless the project explicitly gains the necessary rights and infrastructure.

---

# 32. Lesson Progress

The frontend can show:

```text
Completed
In progress
Locked
Current
```

But the backend remains authoritative for unlock state.

Example:

```text
Lesson 1 ✓
Lesson 2 ✓
Lesson 3 → Current
Lesson 4 🔒
```

---

# 33. Locked Lessons

A locked lesson should communicate:

```text
Why it is locked
What must be completed
What the student should do next
```

Example:

```text
Lesson 4 Locked

Complete the assessment for Lesson 3
to unlock this lesson.
```

Do not expose protected lesson content merely because the frontend knows the route.

---

# 34. Assessment/Quiz UX

The quiz interface should support:

```text
Question
Options
Question number
Total questions
Next
Previous
Timer where configured
Answer state
Submit
```

---

# 35. Quiz State

Conceptual:

```text
NOT_STARTED
   ↓
IN_PROGRESS
   ↓
SUBMITTED
   ↓
EVALUATED
```

The frontend should maintain temporary answer state while the backend owns the authoritative attempt.

---

# 36. Timer

If the assessment has a time limit:

```text
Timer
Question navigation
Answer selection
```

The frontend timer improves UX, but the backend must enforce the authoritative time limit.

Never trust only the browser timer.

---

# 37. Quiz Navigation

The question navigator may show:

```text
1 ✓
2 ✓
3 ?
4 —
5 ✓
```

Possible meanings:

```text
Answered
Current
Unanswered
```

The UI should make the state obvious.

---

# 38. Unanswered Questions

Based on the approved learning model, unanswered questions are meaningful evidence.

Therefore the frontend should:

- allow unanswered questions where appropriate
- clearly show unanswered state
- warn before submission if configured
- not silently convert unanswered questions into guessed answers

The backend records them distinctly.

---

# 39. Assessment Submission

The frontend should:

```text
Validate UI state
   ↓
Submit attempt
   ↓
Disable duplicate submission
   ↓
Show processing state
   ↓
Receive authoritative result
```

Avoid allowing multiple accidental submissions.

---

# 40. Assessment Results

The result screen can show:

```text
Score
Correct
Incorrect
Unanswered
Time
Performance summary
Topic-level feedback where available
Next recommended action
```

Do not reveal answer explanations if the assessment policy does not permit them.

---

# 41. Mastery Display

Mastery should be communicated carefully.

Example:

```text
Normalization
Mastery: 52%
Needs improvement
```

Avoid presenting an estimated mastery value as absolute truth.

The UI may label it:

```text
Estimated mastery
Current learning confidence
Learning status
```

depending on final UX testing.

---

# 42. Strengths and Weaknesses

Student analytics can show:

```text
Strengths
 ├── SQL Basics
 └── ER Modeling

Needs Attention
 ├── Normalization
 └── Transactions
```

The frontend should always provide an actionable next step.

---

# 43. Analytics Page

The analytics page can contain deeper information that does not fit on the dashboard.

Potential sections:

```text
Course progress
Topic mastery
Assessment performance
Learning trends
Study activity
Strengths
Weaknesses
Intervention history
```

---

# 44. Analytics Visualization

Charts should answer questions.

Examples:

```text
How is mastery changing?
Which topics are weak?
How is assessment performance changing?
How much course progress has been made?
```

Avoid charts that exist only for visual decoration.

---

# 45. Study Hours

If study-hour tracking is implemented:

```text
Today
This week
Average
Trend
```

The metric must have a clearly defined backend calculation.

Do not display an approximate number without explaining its meaning.

---

# 46. Streaks

If streaks are implemented:

```text
Current streak
Longest streak
Recent activity
```

The calculation belongs to backend logic.

The frontend only displays the result.

---

# 47. Profile and Settings

Student profile/settings may include:

```text
Profile information
Avatar
Department
Preferences
Theme
Account settings
Logout
Account deletion
```

Sensitive account operations should require backend authorization and appropriate confirmation.

---

# 48. Teacher Application

Teacher experience focuses on:

```text
Course creation
Course management
Lesson management
Resource management
Question banks
Assessments
Student enrollment
Course analytics
Student performance
Profile/settings
```

---

# 49. Teacher Dashboard

Potential sections:

```text
Overview
Recent courses
Enrollment summary
Course performance
Student activity
Weak topic overview
Recent activity
```

The teacher should be able to quickly understand the state of their courses.

---

# 50. Teacher Course Management

Teacher course page:

```text
Course details
Lessons
Resources
Assessments
Question bank
Students
Analytics
Edit
Publish/unpublish
```

---

# 51. Course Creation UX

Conceptual flow:

```text
Create Course
   ↓
Basic Information
   ↓
Department
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
```

The UI should support drafts before publishing.

---

# 52. Course Metadata

Teacher may provide:

```text
Course title
Description
Department
Level
Learning objectives
Prerequisites
Estimated duration
Tags/categories
Teacher information
```

This supports discovery and personalization.

---

# 53. Lesson Builder

Teacher should be able to:

```text
Add lesson
Edit lesson
Reorder lesson
Archive lesson
Add explanation
Add examples
Add resources
Configure practice
```

The backend determines what operations are permitted.

---

# 54. Resource Management

Teacher may add:

```text
YouTube URL
PDF
PPT
Notes
External reference
```

Uploaded files must pass backend validation and security controls.

---

# 55. Question Bank

Teacher should be able to:

```text
Create question
Edit question
Delete/archive question
Assign topic
Assign difficulty
Add options
Set correct answer
Set marks/weight
Add explanation where permitted
```

---

# 56. Bulk Question Import

The teacher workflow should support:

```text
Upload Excel/PDF
      ↓
Processing
      ↓
Validation
      ↓
Preview
      ↓
Teacher correction/approval
      ↓
Publish to question bank
```

This connects directly to the background-processing design.

---

# 57. Assessment Builder

Teacher configures:

```text
Assessment title
Questions
Question pool
Time limit
Marks
Passing threshold
Attempt policy
Topic mapping
```

Hard assessment rules must be stored and enforced by backend services.

---

# 58. Question Pool Strategy

The frontend should allow teachers to provide a sufficiently large question pool.

Example:

```text
10 questions shown
30 questions available
```

The backend can select an appropriate randomized set.

This supports fairer retry behavior and better learning analytics.

---

# 59. Teacher Student Management

A teacher who owns/publishes a course should be able to see the students enrolled in that course, subject to backend authorization.

Potential information:

```text
Student name
Enrollment date
Course progress
Assessment performance
Topic weaknesses
Learning status
```

The teacher should not see unrelated private student information.

---

# 60. Teacher Analytics

Teacher analytics should answer:

```text
Which topics are students struggling with?
Which lessons have high failure rates?
How are students progressing?
Which assessments are difficult?
Which students need attention?
```

---

# 61. Teacher Weakness Heatmap

Potential visualization:

```text
Topic                Avg mastery
--------------------------------
SQL Basics              84%
Normalization           61%
Transactions            57%
Indexing                76%
```

This helps teachers improve course content.

---

# 62. Teacher Student Detail

A teacher may open an enrolled student's course-level learning view.

The information should be scoped to:

```text
That teacher
+
That teacher's course
```

The backend must enforce this relationship.

---

# 63. Admin Application

Admin handles platform-level operations.

Potential areas:

```text
Dashboard
Users
Courses
Teachers
Students
System analytics
Audit logs
Reports
Moderation
Settings
```

The exact admin MVP should remain limited to required operations.

---

# 64. Admin Dashboard

Potential metrics:

```text
Total users
Students
Teachers
Courses
Enrollments
Assessment activity
System health
Recent administrative activity
```

---

# 65. Admin User Management

Potential operations:

```text
View user
Search user
Change controlled account state
Suspend
Reactivate
Review role
```

Admin actions must be protected and audited.

---

# 66. Admin Course Management

Potential operations:

```text
Review course
Publish/unpublish where permitted
Moderate content
View owner
View enrollment
Archive
```

The admin should not silently modify teacher-owned content without an auditable reason.

---

# 67. Admin Audit Logs

Admin actions should be visible in an appropriate audit interface.

Examples:

```text
Who
What
When
Target
Result
```

Sensitive values should not be exposed unnecessarily.

---

# 68. Shared Layouts

Potential layouts:

```text
PublicLayout
AuthLayout
StudentLayout
TeacherLayout
AdminLayout
```

Each layout can provide role-appropriate navigation and shell structure.

---

# 69. Navigation

Student:

```text
Dashboard
My Courses
Explore
Recommendations
Analytics
Profile
```

Teacher:

```text
Dashboard
My Courses
Students
Analytics
Profile
```

Admin:

```text
Dashboard
Users
Courses
Analytics
Audit Logs
Settings
```

The final navigation should remain consistent with actual MVP scope.

---

# 70. Responsive Navigation

Desktop may use:

```text
Sidebar + top bar
```

Mobile may use:

```text
Top bar
Drawer
Bottom navigation where appropriate
```

Do not force desktop navigation onto small screens.

---

# 71. Theme System

The platform should support:

```text
Light
Dark
System preference
```

Theme state should be centralized.

Components should use design tokens rather than hard-coded colors everywhere.

---

# 72. Design System

The frontend should establish reusable tokens for:

```text
Colors
Typography
Spacing
Radius
Shadows
Borders
Motion
Breakpoints
```

The exact visual style should be finalized during UI design.

---

# 73. Component Strategy

Components should be reusable at appropriate levels.

### Primitive

```text
Button
Input
Dialog
Card
Badge
Tooltip
```

### Shared

```text
Navbar
Sidebar
PageHeader
EmptyState
LoadingState
ErrorState
```

### Feature-specific

```text
CourseCard
LessonList
QuizQuestion
MasteryCard
RecommendationCard
TeacherCourseEditor
```

Avoid creating a component abstraction for every tiny element.

---

# 74. Component Ownership

Feature components should primarily live near their feature.

Example:

```text
features/
└── courses/
    ├── components/
    ├── hooks/
    ├── services/
    └── types/
```

This improves discoverability and maintainability.

---

# 75. State Management

Not all state belongs in a global store.

Separate:

### Server state

```text
Courses
User profile
Enrollments
Analytics
Recommendations
Assessment data
```

### Client/UI state

```text
Modal open
Sidebar open
Selected tab
Theme
Temporary form state
```

### Authentication state

```text
Current user
Authentication initialization
Role
```

Use the simplest suitable mechanism for each.

---

# 76. API State

The frontend should centralize API communication.

Conceptually:

```text
services/
 ├── auth.service
 ├── course.service
 ├── enrollment.service
 ├── lesson.service
 ├── assessment.service
 ├── personalization.service
 └── analytics.service
```

Components should not duplicate endpoint construction.

---

# 77. API Client

A centralized HTTP client should handle common concerns:

```text
Base URL
Credentials/cookies
Headers
Error normalization
Authentication refresh
Request cancellation where useful
```

The exact library can be selected during implementation.

---

# 78. API Response Handling

The frontend should have a consistent interpretation of:

```text
Success
Validation error
Authentication error
Authorization error
Not found
Conflict
Rate limit
Server error
Network error
```

The backend API design remains authoritative.

---

# 79. Error UX

Different errors need different UX.

### 401

```text
Session expired
→ attempt refresh
→ redirect to login if refresh fails
```

### 403

```text
You do not have permission.
```

### 404

```text
The requested resource could not be found.
```

### 409

```text
The requested operation conflicts with current state.
```

### 429

```text
Too many requests.
Please try again shortly.
```

### 500

```text
Something went wrong.
Try again.
```

---

# 80. Loading States

Every data-driven page should consider:

```text
Initial loading
Background refresh
Submitting
Saving
Processing
```

Avoid displaying blank screens.

Use:

```text
Skeletons
Spinners
Progress indicators
Disabled buttons
```

appropriately.

---

# 81. Empty States

Examples:

```text
No enrolled courses
No recommendations yet
No analytics data yet
No students enrolled
No courses created
No questions in bank
```

Every empty state should tell the user what they can do next.

---

# 82. Processing States

For asynchronous operations:

```text
Question import processing
AI recommendation processing
Analytics updating
```

The frontend should display honest status.

Example:

```text
Your question file is being processed.
You can continue working and return when it is ready.
```

---

# 83. Error Recovery

Where possible provide:

```text
Retry
Go back
Return to dashboard
Contact support
```

Do not force users to reload the entire application to recover from a recoverable failure.

---

# 84. Forms

Forms should provide:

```text
Clear labels
Validation
Helpful errors
Disabled submit during processing
Success feedback
Preserved values when appropriate
```

Client-side validation improves UX.

Backend validation remains mandatory.

---

# 85. Course Editor Forms

Teacher course forms may be long.

Use logical sections:

```text
Basic information
Learning objectives
Prerequisites
Lessons
Resources
Assessments
Publishing
```

Avoid one enormous undifferentiated form.

---

# 86. Accessibility

The frontend should target accessible interaction.

Important practices:

```text
Semantic HTML
Keyboard navigation
Visible focus
Accessible labels
Color contrast
Alt text
Accessible dialogs
Screen-reader-friendly state
Reduced-motion consideration
```

Accessibility should be built into reusable components.

---

# 87. Motion

Framer Motion can be used for:

```text
Page transitions
Card entrance
Micro-interactions
Modal transitions
Progress animations
```

Avoid excessive animation during learning.

Motion should support understanding, not distract from content.

---

# 88. UX Principle — Learning First

The student interface should prioritize:

```text
Understand
Practice
Measure
Improve
Continue
```

not:

```text
Gamification
Animations
Decorative dashboards
```

Features should support learning efficiency.

---

# 89. UX Principle — Reduce Cognitive Load

Do not show every metric simultaneously.

Prefer:

```text
Primary action
+
Relevant context
+
Optional deeper analytics
```

This is especially important on the student dashboard.

---

# 90. UX Principle — Explain Recommendations

When showing a recommendation:

```text
What?
Why?
What will happen?
```

Example:

```text
Review Normalization

Why:
Your recent practice shows difficulty with transitive dependencies.

Action:
Review Lesson 7 and complete targeted practice.

[Start]
```

---

# 91. UX Principle — No False Intelligence

The UI should not imply:

```text
AI knows everything about you.
```

Use language such as:

```text
Based on your recent learning activity
Estimated mastery
Recommended next step
```

This improves trust.

---

# 92. UX Principle — Preserve Student Agency

Personalization should guide, not trap.

The student should generally be able to:

```text
Understand recommendation
Choose to follow it
Return later
Explore other allowed courses
```

Hard prerequisites are exceptions because they are curriculum constraints.

---

# 93. UX Principle — Teacher Control

Teachers should understand:

```text
What content they created
What prerequisites they configured
What assessment rules they configured
What students are seeing
What analytics are measuring
```

Personalization should operate within teacher-defined curriculum boundaries.

---

# 94. UX Principle — Admin Control

Admin UI should prioritize:

```text
Safety
Auditability
Clarity
Operational visibility
```

Admin actions should be explicit and confirmation-protected where destructive.

---

# 95. Frontend Security Principles

Never rely on frontend hiding for authorization.

Avoid:

```text
if (role === "teacher") {
    show admin data
}
```

as the security mechanism.

Instead:

```text
Frontend:
controls UX

Backend:
enforces authorization
```

Never put:

```text
JWT secrets
database credentials
AI provider secrets
private API keys
```

in frontend code.

---

# 96. XSS and Content Rendering

Teacher-created content may contain rich text.

The frontend must safely render it.

Avoid blindly injecting arbitrary HTML.

Use a trusted sanitization/rendering strategy before allowing HTML-like content.

---

# 97. File Handling

For teacher uploads:

```text
Frontend
 ↓
Validate basic UX constraints
 ↓
Backend validates security constraints
 ↓
Upload
 ↓
Background processing if required
```

Frontend file validation is not a security boundary.

---

# 98. Performance

Important frontend goals:

```text
Fast initial load
Lazy-load large features
Avoid unnecessary API requests
Avoid unnecessary re-renders
Optimize images
Paginate large datasets
Virtualize long lists when needed
```

Do not prematurely optimize everything.

Measure first when possible.

---

# 99. Code Splitting

Role-specific and heavy pages can be lazy-loaded.

Examples:

```text
Admin dashboard
Teacher course editor
Analytics
Assessment builder
```

This reduces initial student bundle size.

---

# 100. Data Fetching

Pages should request only the data they need.

Avoid:

```text
Dashboard loads entire database
```

Prefer backend dashboard endpoints or appropriate API composition.

---

# 101. Caching

Safe-to-cache server data may include:

```text
Course metadata
Department lists
Static reference information
```

Highly dynamic data should be handled carefully:

```text
Assessment state
Current attempt
Authorization-sensitive data
```

Cache invalidation must not cause stale authoritative information to be presented as current.

---

# 102. Pagination and Infinite Lists

Use pagination for:

```text
Courses
Students
Questions
Audit logs
Notifications
```

Do not load thousands of records into the browser unnecessarily.

---

# 103. Search

Search should be backed by appropriate backend APIs.

Frontend:

```text
Search input
   ↓
Debounce if appropriate
   ↓
API
   ↓
Results
```

Do not fetch all records and filter everything in the browser.

---

# 104. Frontend Analytics

The frontend may render:

```text
Charts
Cards
Progress bars
Tables
```

but analytics calculations should generally come from backend services.

The frontend should not independently calculate official mastery or course analytics.

---

# 105. Student Dashboard Data Contract

Conceptually the dashboard needs:

```text
User summary
Continue-learning state
Next best action
Course progress
Key strengths
Key weaknesses
Recent activity
Recommended courses
```

The exact endpoint/response contract follows the approved API design.

---

# 106. Teacher Dashboard Data Contract

Conceptually:

```text
Teacher summary
Recent courses
Enrollment summary
Course performance
Weak-topic summary
Recent activity
```

---

# 107. Admin Dashboard Data Contract

Conceptually:

```text
Platform summary
User counts
Course counts
Enrollment counts
System activity
Moderation indicators
```

---

# 108. Cross-Role Design Consistency

All roles should share:

```text
Typography
Theme
Spacing
Interaction patterns
Feedback patterns
Accessibility
```

but have role-specific navigation and functionality.

---

# 109. UX for Failure in Background Processing

If a personalization worker fails:

```text
Student still sees current learning state
       ↓
Fallback recommendation if available
       ↓
No broken dashboard
```

If a teacher import fails:

```text
Import status = FAILED
       ↓
Show useful reason
       ↓
Retry/upload corrected file
```

---

# 110. UX for Eventual Consistency

After an assessment:

```text
Score:
Immediately available

Personalization:
Updating...
```

Then:

```text
Recommendation:
Ready
```

The UI should clearly distinguish authoritative result from background-generated enrichment.

---

# 111. Frontend Testing Strategy Alignment

Frontend tests should cover:

```text
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
```

Detailed testing strategy will be finalized in `12-testing-strategy.md`.

---

# 112. E2E User Journeys

Important E2E journeys:

### Student

```text
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
```

### Teacher

```text
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
Student Enrolls
 ↓
Teacher Views Student
 ↓
Analytics
```

### Admin

```text
Login
 ↓
Dashboard
 ↓
User/Course management
 ↓
Audit
```

---

# 113. Frontend Development Workflow

Recommended workflow:

```text
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
```

Do not start by creating dozens of pages without backend contracts.

---

# 114. Antigravity Development Rules

Antigravity should be given:

```text
Relevant documentation
Current project progress
Approved API contract
Existing component patterns
Existing design system
```

It should not:

```text
Invent backend endpoints
Invent database fields
Duplicate business logic
Create fake production data as a permanent solution
Change architecture without discussion
Replace approved authentication behavior
```

---

# 115. Frontend Change Discipline

Before changing architecture, ask:

```text
Does this conflict with approved docs?
Does it duplicate an existing abstraction?
Does it change an API contract?
Does it change authorization assumptions?
Does it introduce unnecessary dependencies?
```

If yes, update the relevant design first.

---

# 116. Definition of Done for a Frontend Feature

A feature is not complete merely because the UI renders.

It should have:

```text
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
```

---

# 117. Recommended Frontend Implementation Order

Do not build all dashboards at once.

Recommended order:

```text
1. Frontend foundation
2. Theme/design system
3. Authentication
4. Application shell
5. Role-based routing
6. Student dashboard
7. Course discovery
8. Enrollment
9. Course/lesson experience
10. Assessment experience
11. Personalization UI
12. Student analytics
13. Teacher course management
14. Teacher assessments/question bank
15. Teacher analytics
16. Student management
17. Admin dashboard
18. Admin management
19. Final UX polish
```

The order can change when backend dependencies require it.

---

# 118. Frontend and Backend Development Strategy

Do not build the entire frontend first and the entire backend afterward.

Use vertical slices:

```text
Backend Feature
      ↓
API
      ↓
Frontend Feature
      ↓
Integration
      ↓
Test
```

Example:

```text
Authentication
   ↓
Auth API
   ↓
Login UI
   ↓
Protected routes
   ↓
Integration test
```

Then:

```text
Course
   ↓
Course API
   ↓
Course UI
   ↓
Integration test
```

---

# 119. Frontend Source of Truth

The hierarchy should be:

```text
Backend domain rules
        ↓
API contract
        ↓
Frontend service
        ↓
Frontend state
        ↓
UI
```

The UI should never become the source of truth for business rules.

---

# 120. Final Frontend Architecture

```text
                        REACT APPLICATION
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
            Public App                 Protected App
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                           Student        Teacher         Admin
                              │              │              │
                              └──────────────┼──────────────┘
                                             ▼
                                      Feature Modules
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                            Pages       Components       Hooks
                                             │
                                             ▼
                                      Service / API Layer
                                             │
                                             ▼
                                       Backend APIs
                                             │
                   ┌─────────────────────────┼────────────────────┐
                   ▼                         ▼                    ▼
                MongoDB                  Redis/BullMQ        AI Services
```

---

# 121. Final UX Principles

The frontend should follow these principles:

```text
1. Learning first.
2. Keep the primary action clear.
3. Reduce cognitive load.
4. Explain recommendations.
5. Preserve student agency.
6. Keep teacher control visible.
7. Never rely on frontend security.
8. Handle every important loading/error/empty state.
9. Use reusable components without over-abstraction.
10. Build responsive and accessible experiences.
11. Keep backend business logic out of UI components.
12. Build vertical slices instead of isolated mock pages.
13. Do not invent API contracts.
14. Treat AI output as enhancement, not authoritative state.
15. Make the application understandable before making it visually impressive.
```

---

# 122. Final Frontend Principle

The frontend should turn the platform's intelligence into a simple student experience:

```text
Complex System
      ↓
Clear UI
      ↓
Student understands:
      ↓
Where I am
What I know
What I struggle with
What I should do next
Why it is recommended
How I am improving
```

The goal is not merely to create a beautiful LMS.

> **The frontend should make the platform's personalized learning intelligence understandable, actionable, trustworthy, and easy to use.**
