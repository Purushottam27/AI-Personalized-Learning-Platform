# AI Based Personalized Learning Platform — User Journeys

## 1. Purpose

This document defines the end-to-end behavioral and product workflows for **Learner, Instructor, and Admin**, including cross-role workflows and important failure/edge cases.

It is a behavioral/product document. Technical implementation belongs in the later architecture, database, API, security, AI, frontend, and infrastructure documents.

The journeys in this document must remain consistent with the finalized product requirements, role model, onboarding model, authentication behavior, account-state semantics, and personalization principles.

---

## 2. Learner Journey

### Signup

For MVP/testing:

```text
Public Signup

  ↓

Select Role

  ├── Learner
  └── Instructor
```

Admin is never selectable through public signup.

Learner flow:

```text
Signup
  ↓
Account Created
  ↓
Login
  ↓
Onboarding
```

The learner selects the **Learner** role during signup.

---

### Learner Onboarding

The learner onboarding follows this progressive flow:

```text
Signup
  ↓
Account Created
  ↓
Login
  ↓
Welcome / Onboarding Introduction
  ↓
Start Onboarding
  ↓
Learning Interests
  ↓
Learning Goals
  ↓
Experience Level
  ↓
Daily Study Capacity
  ↓
Preferred Learning Format
  ↓
Onboarding Completed
  ↓
Personalized Learner Experience
```

The onboarding experience should be concise and progressive rather than a large single form.

The MVP contains five fixed questions.

#### Question 1 — Learning Interests

**What would you like to learn about?**

Multiple selections are allowed:

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology
- Other — Please specify

#### Question 2 — Learning Goals

**What are your main learning goals?**

Multiple selections are allowed:

- Build practical skills
- Prepare for exams or academic studies
- Prepare for a job or career
- Improve existing knowledge
- Learn something new for personal interest
- Prepare for interviews
- Other — Please specify

#### Question 3 — Experience Level

**How would you describe your current experience with your selected interests?**

One selection:

- I have no prior knowledge
- I have a basic understanding
- I am comfortable with the fundamentals
- I have substantial experience
- I'm not sure

This information is an initial self-reported signal and is **not verified mastery**.

#### Question 4 — Daily Study Capacity

**How much time can you dedicate to learning each day?**

One selection:

- Less than 1 hour
- 1–2 hours
- 2–3 hours
- 3–4 hours
- 5 or more hours

#### Question 5 — Preferred Learning Format

**How do you prefer to learn?**

Multiple selections are allowed:

- Reading
- Videos
- Interactive Learning
- Practice Exercises
- Projects

### Onboarding Behavior

The onboarding experience should:

- show one question at a time
- provide Back and Next navigation
- save each answer progressively
- allow the learner to resume after interruption
- store the actual custom value when `Other — Please specify` is selected
- treat preferred learning format as a preference rather than a strict restriction

The onboarding state is:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Onboarding can be revisited after completion to update learner preferences.

---

### Google Sign-In — New Learner

Google authentication has a different initial journey because a permanent platform account is not created until role selection and role-specific onboarding are completed.

```text
Google Sign-In
  ↓
Google Authentication
  ↓
Temporary Setup
  ↓
Select Learner Role
  ↓
Learner Onboarding
  ↓
Complete Setup
  ↓
Create Learner Account
  ↓
Create Learner Profile
  ↓
Authenticated Session
  ↓
Learner Dashboard
```

A new Google learner is not required to create a password during initial setup.

---

### Dashboard

The learner dashboard should answer:

1. Where am I?
2. What am I good at?
3. What should I improve?
4. What should I do next?

Sections may include:

- Continue Learning
- Progress
- Statistics
- Strengths
- Areas to Improve
- Recommended For You

Personalized recommendations should complement explicit learner controls.

---

### Course Discovery

```text
My Courses
Explore Courses
Recommended For You
```

Explore supports:

- search
- learning domain/category
- difficulty

Explicit search and filtering remain available even when AI recommendations exist.

The shared learning-domain taxonomy includes:

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology

---

### Course Overview

Before enrollment, show relevant course information such as:

- title
- description
- instructor
- learning domain/category
- difficulty
- objectives
- prerequisites
- estimated duration
- structure overview

Example:

```text
Database Management Systems

Instructor: Example Instructor
Domain: Programming & Software Development
Level: Intermediate
Prerequisite: Basic SQL
```

---

### Prerequisite / Diagnostic

No prerequisite:

```text
Course Overview
  ↓
Enroll
```

Required diagnostic:

```text
Course Overview
  ↓
Diagnostic
```

Pass:

```text
Diagnostic
  ↓
Threshold satisfied
  ↓
Enroll / proceed
```

Fail:

```text
Diagnostic
  ↓
Analyze prerequisite weaknesses
  ↓
Recommend prerequisite course or targeted refresher
  ↓
Mini assessment
  ↓
Retry diagnostic
```

If the prerequisite course was already completed, targeted revision is preferred over repeating the entire course.

---

### Enrollment

```text
Course Overview
  ↓
Prerequisite Policy Satisfied
  ↓
Enroll
  ↓
Course Added to My Courses
```

Instructor approval is not part of the MVP enrollment flow.

---

### Course Learning

```text
My Courses
  ↓
Course
  ↓
Topics
  ↓
Lessons
```

The learner can see relevant course information such as:

- overall progress
- completed lessons
- current lesson
- locked lessons
- assessment status
- final assessment status

Lesson unlocking follows deterministic course policies.

---

### Lesson

A lesson may contain:

- conceptual explanation
- examples
- visual material
- YouTube video resources
- instructor-provided resources
- external references
- practice
- assessment

Instructors are not required to record their own videos.

Relevant YouTube videos may be embedded when embedding is permitted.

---

### Practice

```text
Lesson
  ↓
Practice
  ↓
Attempt
  ↓
Feedback
  ↓
Repeat if desired
```

Practice is learning-oriented and generally repeatable.

---

### Assessment

Assessments may support:

- question banks
- configurable question count
- marks
- passing threshold
- optional timer
- previous/next navigation
- question numbering
- attempt history
- maximum attempts where configured
- randomized question selection

Response states:

```text
CORRECT
INCORRECT
UNANSWERED
```

Unanswered questions receive zero marks but remain analytically distinct from incorrect answers.

---

### Assessment Result

```text
Assessment
  ↓
Scoring
  ↓
Question-Level Analysis
  ↓
Topic-Level Analysis
  ↓
Learning Evidence
  ↓
Mastery Update
```

Scoring and other critical assessment decisions are deterministic.

---

### Assessment Pass

```text
Assessment
  ↓
Passed
  ↓
Learning Evidence Updated
  ↓
Next Lesson Unlocked According to Policy
  ↓
Next Recommendation
```

Passing an assessment does not by itself represent the complete picture of learner mastery.

---

### Assessment Failure

```text
Assessment
  ↓
Not Passed
  ↓
Weakness Analysis
  ↓
Targeted Remediation
  ↓
Reassessment
```

The purpose of remediation is to address identified learning gaps rather than simply require repeated attempts.

---

### Retry

A retry should not simply reuse the same fixed questions when question-bank selection is configured.

Example:

```text
Question Bank = 30
Questions per Attempt = 10
```

Different attempts can select different questions according to the assessment's selection policy.

---

### Remediation

```text
Weakness
  ↓
Explanation
  ↓
Example
  ↓
Video / Resource
  ↓
Practice
  ↓
Mini Assessment
  ↓
Reassessment
```

AI may assist with explanations, feedback, and recommendations, while deterministic rules remain responsible for critical progression and assessment decisions.

---

### Improvement

Example:

```text
Before: 2NF = 45%
After:  2NF = 74%

Improvement: +29 percentage points
```

The platform should measure improvement rather than relying only on completion or a single score.

---

### Course Completion

```text
Required Lessons Complete
  ↓
Final Assessment
  ↓
Course-Level Analysis
  ↓
Course Mastery Report
```

The report may contain:

- overall mastery
- strong topics
- developing topics
- weak topics
- improvement history
- next steps

A single final score is not the only mastery evidence.

---

### Learner Account Deactivation

A learner may voluntarily deactivate their own account.

```text
Learner Account Settings
  ↓
Deactivate Account
  ↓
Confirmation
  ↓
Account Deactivated
  ↓
Active Refresh Sessions Revoked
  ↓
Frontend Clears Authenticated State
  ↓
Deactivation Screen
```

The user's account data and learning history are preserved.

Learning activity is paused while the account is deactivated.

The deactivation operation is represented by:

```text
DELETE /api/v1/users/me
```

The operation changes the account state to `DEACTIVATED`; it does not permanently delete the user's preserved learning data.

The deactivation screen should communicate:

```text
Your account is currently deactivated.

Your learning progress has been paused.

Reactivate your account to continue learning.

[ Reactivate Account ]
```

The deactivation screen should not provide a normal Login action.

---

### Learner Account Reactivation

A deactivated learner can reactivate their account.

```text
Deactivation Screen
  ↓
Reactivate Account
  ↓
Enter Email + Password
  ↓
Verify Account
  ↓
Verify Password
  ↓
DEACTIVATED → ACTIVE
  ↓
Create New Authentication Session
  ↓
Dashboard
  ↓
Learning Resumes
```

Previously revoked refresh sessions are not restored or reused.

Learning data and progress remain preserved.

If the account is suspended, the learner cannot use self-service reactivation.

---

## 3. Instructor Journey

### Registration

For MVP/testing:

```text
Public Signup
  ↓
Select Instructor
  ↓
Create Account
  ↓
Login
  ↓
Instructor Onboarding
  ↓
Instructor Dashboard
```

Production instructor verification is deferred.

The instructor selects the **Instructor** role during signup.

---

### Instructor Onboarding

Instructor onboarding is intentionally different from learner onboarding.

The MVP onboarding consists of two questions.

#### Question 1 — Professional Role

**What best describes your professional role?**

One selection:

- Software Developer / Designer
- Data Scientist
- Machine Learning Engineer
- Cybersecurity Professional
- Educator / Instructor
- Finance Professional
- Other — Please specify

This contributes to the instructor's professional title.

#### Question 2 — Teaching Expertise

**What areas are you experienced in teaching?**

Multiple selections are allowed:

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology
- Other — Please specify

This contributes to the instructor's expertise areas.

When `Other — Please specify` is selected, the actual custom value is stored rather than the literal value `Other`.

Instructor onboarding can be revisited after completion.

---

### Google Sign-In — New Instructor

A new Google instructor follows the same temporary setup concept as a new Google learner:

```text
Google Sign-In
  ↓
Google Authentication
  ↓
Temporary Setup
  ↓
Select Instructor Role
  ↓
Instructor Onboarding
  ↓
Complete Setup
  ↓
Create Instructor Account
  ↓
Create Instructor Profile
  ↓
Authenticated Session
  ↓
Instructor Dashboard
```

A new Google instructor is not required to create a password during initial setup.

---

### Instructor Profile

The instructor profile may contain:

- professional title
- expertise areas
- bio
- years of experience
- organization
- social links

General account information such as name, email, and avatar remains part of the user account rather than being duplicated in the instructor profile.

Courses reference the instructor as their owner.

---

### Dashboard

```text
Overview
Recent Courses
Enrollment Summary
Course Performance
Learner Activity
Quick Actions
```

---

### Course Creation

```text
Create Course
  ↓
Basic Information
  ↓
Instructor / Ownership
  ↓
Learning Domain / Metadata
  ↓
Difficulty
  ↓
Objectives
  ↓
Prerequisites
  ↓
Diagnostic Policy
  ↓
Topics
  ↓
Lessons
  ↓
Resources
  ↓
Practice
  ↓
Question Banks
  ↓
Assessments
  ↓
Review
  ↓
Save Draft
  ↓
Publish
```

Instructors can create and publish courses without mandatory Admin pre-approval in the MVP.

---

### Course Lifecycle

```text
DRAFT → PUBLISHED → ARCHIVED
```

Draft courses are not normal public courses.

A future moderation workflow may introduce:

```text
Instructor
  ↓
Submit Course
  ↓
Admin Review
  ↓
Approve / Reject
  ↓
Publish
```

This workflow is not mandatory for the MVP.

---

### Lesson and Resource Management

Instructor can:

- add/edit lessons
- associate lessons with topics
- add explanations
- add examples
- add visuals
- add YouTube videos
- upload learning resources
- add external references
- create practice
- configure assessments

Resources may include:

```text
YouTube
PDF
PPT / PPTX
DOC / DOCX
External Link
```

---

### Question Bank

Manual questions support:

- question
- options
- correct answer
- explanation
- marks
- topic
- difficulty

CSV/Excel bulk import:

```text
Upload
  ↓
Parse
  ↓
Validate
  ↓
Preview
  ↓
Instructor Confirms
  ↓
Question Bank
```

Future AI generation:

```text
Instructor Content
  ↓
AI Draft
  ↓
Instructor Review / Edit
  ↓
Instructor Approval
  ↓
Question Bank
```

AI-generated questions must not automatically become official assessment content.

---

### Assessment Management

Instructor configures:

- question bank
- questions per attempt
- marks
- passing threshold
- timer
- maximum attempts
- selection strategy
- difficulty distribution where supported

Assessment types include:

- practice
- lesson/topic assessment
- diagnostic
- final assessment

---

### Enrolled Learners

For every course owned by the instructor:

```text
My Courses
  ↓
Course
  ↓
Learners
```

The instructor can see course-relevant information such as:

- enrollment status
- progress
- lesson completion
- assessment performance
- topic performance
- relevant strengths/weaknesses
- course activity

The instructor cannot automatically access unrelated learning data from courses owned by other instructors.

---

### Instructor Analytics

```text
Enrollment
Completion
Average Performance
Topic Performance
Difficult Topics
Learner Progress
Assessment Performance
```

Analytics should support course improvement while respecting course ownership and authorization boundaries.

---

### Instructor Improvement Loop

```text
Instructor Creates Course
  ↓
Learners Learn
  ↓
Performance Data
  ↓
Instructor Analytics
  ↓
Difficult Content Identified
  ↓
Instructor Improves Course
  ↓
Learners Receive Improved Material
```

---

## 4. Admin Journey

### Access

Admin accounts are controlled and are not created through public self-selected signup.

Admin accounts are provisioned separately.

---

### Dashboard

```text
Platform Overview
Users
Learners
Instructors
Courses
Moderation
Analytics
Audit Information
```

---

### User Management

Admin may manage platform users according to authorization policy.

The Admin user-management flow includes:

```text
Admin Dashboard
  ↓
Users
  ↓
Search / Filter / Paginate
  ↓
User List
  ↓
View User
  ↓
User Details
```

The User Details view may contain:

- account information
- role-specific profile information
- learning overview where appropriate
- administrative actions

Administrative account-status actions include:

```text
ACTIVE → SUSPENDED

SUSPENDED → ACTIVE
```

When suspending a user, a suspension reason is required.

Admin cannot change a user's role.

Admin does not deactivate users.

User deactivation is initiated by the user through their own account.

---

### Course Moderation

Admin may review and moderate platform courses according to platform policy.

In the MVP, course publishing does not require mandatory Admin pre-approval.

Admin moderation remains available for governance and intervention when content is reported or violates platform requirements.

Detailed destructive moderation workflows are deferred.

---

## 5. Cross-Role Workflows

### Instructor Creates Course

```text
Instructor
  ↓
Create Course
  ↓
Learning Domain / Metadata
  ↓
Prerequisites
  ↓
Topics
  ↓
Lessons
  ↓
Resources
  ↓
Question Bank
  ↓
Assessments
  ↓
Review
  ↓
Publish
  ↓
Learners Discover / Enroll
```

---

### Learner Enrollment

```text
Learner
  ↓
Search / Explore / Recommendation
  ↓
Course Details
  ↓
Prerequisite / Diagnostic
  ↓
Enroll
  ↓
Course Added to My Courses
  ↓
Instructor Enrollment Data Updates
```

---

### Learner Learning Data

```text
Learner
  ↓
Lesson
  ↓
Practice
  ↓
Assessment
  ↓
Performance Evidence
  ├─────────────────┐
  ↓                 ↓
Learner Analytics   Instructor Course Analytics
  ↓                 ↓
Personalization    Course Improvement
```

Learning evidence may contribute to both learner personalization and relevant course analytics.

---

### Instructor Views Learner

```text
Instructor
  ↓
My Courses
  ↓
Course
  ↓
Learners
  ↓
Learner
  ↓
Course-Specific Learning Data
```

Server-side authorization must confirm that the instructor owns the relevant course.

The instructor should only receive learning information relevant to that course.

---

### Personalization

```text
Learner Activity
  ↓
Learning Evidence
  ↓
Performance Analysis
  ↓
Learning Profile
  ↓
Deterministic Rules + AI
  ↓
Recommendation
  ↓
Learner
```

AI recommendations complement deterministic application logic and explicit learner controls.

---

### Google Authentication — Existing Google Account

When a Google identity is already linked to a platform account:

```text
Google Sign-In
  ↓
Google Authentication
  ↓
Find Linked AuthIdentity
  ↓
Find Platform User
  ↓
Check Account Status
  ↓
Create / Refresh Platform Session
  ↓
Platform
```

The platform's own access and refresh tokens are used for authenticated application access.

---

### Google Authentication — Existing Password Account

If Google authentication matches an existing password-based account but the Google identity is not linked:

```text
Google Sign-In
  ↓
Existing Password Account Found
  ↓
Google Identity Not Linked
  ↓
Do Not Auto-Link
  ↓
Do Not Create Application Session
  ↓
Ask User to Sign In Using Existing Account
```

Account linking may be introduced later through an authenticated account-settings workflow.

---

## 6. Important Failure and Edge Cases

### Failed Diagnostic

```text
Diagnostic
  ↓
Fail
  ↓
Identify Prerequisite Weakness
  ↓
Recommend Prerequisite / Refresher
  ↓
Mini Assessment
  ↓
Retry Diagnostic
```

---

### Failed Assessment

```text
Assessment
  ↓
Fail
  ↓
Weakness Analysis
  ↓
Targeted Remediation
  ↓
Reassessment
```

---

### Timer Expiration

```text
Timer Reaches Zero
  ↓
Automatic Submission
  ↓
Unanswered = Zero Marks
```

---

### Repeated Attempts

Different attempts should use question-bank selection rather than always repeating the exact same questions when the assessment is configured for randomized selection.

---

### Repeated Difficulty

```text
Repeated Difficulty
  ↓
Stronger Remediation
  ↓
Prerequisite / Refresher Recommendation
  ↓
Additional Practice
  ↓
Reassessment
```

The same intervention should not be repeated indefinitely.

---

### YouTube Resource Unavailable

```text
Video Unavailable
  ↓
Graceful Fallback
  ↓
Alternative Resource if Available
```

The lesson must not fail because one external resource is unavailable.

---

### Incomplete Course

An incomplete instructor course remains `DRAFT` and should not be treated as a normal published course.

---

### Unauthorized Instructor Access

If Instructor A requests Instructor B's learner data:

```text
Request
  ↓
Authorization Check
  ↓
Ownership Fails
  ↓
Access Denied
```

---

### Unauthorized Role Escalation

Client-side manipulation must never allow:

```text
LEARNER → INSTRUCTOR
LEARNER → ADMIN
INSTRUCTOR → ADMIN
```

Roles are controlled server-side.

Admin user-management operations do not provide a role-change operation.

---

### Archived Course After Enrollment

Historical records should remain meaningful and learner progress should not be silently destroyed.

Exact active-learner handling for archived courses is a later implementation decision.

---

### Account Deactivation

Account deactivation is user-initiated and reversible.

```text
User Account Settings
  ↓
Deactivate Account
  ↓
Confirmation
  ↓
Account Status → DEACTIVATED
  ↓
All Active Refresh Sessions Revoked
  ↓
Frontend Clears Authenticated State
  ↓
Deactivation Screen
```

The user's account data and learning history are preserved.

The user's learning progress is paused while the account remains `DEACTIVATED`.

Existing access tokens must not bypass the deactivated account state.

Protected API requests are rejected after the current account status is checked.

Normal login does not authenticate a `DEACTIVATED` account.

---

### Account Reactivation

A `DEACTIVATED` account can be reactivated by the account owner.

```text
Deactivation Screen
  ↓
Reactivate Account
  ↓
Enter Email + Password
  ↓
Verify Account
  ↓
Verify Status
  ↓
Verify Password
  ↓
DEACTIVATED → ACTIVE
  ↓
Create New Authentication Session
  ↓
Dashboard
  ↓
Learning Resumes
```

Reactivation does not restore or reuse previously revoked refresh sessions.

A new refresh session is created.

If the account does not exist:

```text
ACCOUNT_NOT_FOUND
```

If the account is already active:

```text
ACCOUNT_ALREADY_ACTIVE
```

The user should be directed toward normal login.

If the account is suspended:

```text
ACCOUNT_SUSPENDED
```

The user cannot self-reactivate.

---

### Account State During Authentication

```text
Login Attempt
      ↓
Check Account
      │
      ├── ACTIVE
      │     ↓
      │   Normal Login
      │
      ├── DEACTIVATED
      │     ↓
      │   ACCOUNT_DEACTIVATED
      │     ↓
      │   Show Deactivation Screen
      │     ↓
      │   Reactivate Account
      │
      └── SUSPENDED
            ↓
          ACCOUNT_SUSPENDED
            ↓
          Show Suspension State
            ↓
          No Self-Reactivation
```

Authentication methods must not bypass account-state restrictions.

---

### Google Sign-In for Restricted Accounts

If a Google identity is associated with a platform account that is suspended or deactivated:

```text
Google Sign-In
  ↓
Existing Platform Account Found
  ↓
Check Account Status
  ↓
SUSPENDED / DEACTIVATED
  ↓
Access Denied
```

Google authentication must not be used to bypass the platform account state.

---

## 7. User Journey Principles

1. **Every important action has a clear next step.**

2. **Failure should lead toward recovery where recovery is appropriate.**

3. **Learners should understand why an action is required.**

4. **Instructors control educational content and assessment configuration for their own courses.**

5. **Instructors see relevant performance data for their own courses.**

6. **Admins operate primarily at the platform governance level.**

7. **AI recommendations complement explicit user controls.**

8. **Authorization is enforced server-side.**

9. **External resource failure does not break the learning experience.**

10. **MVP flows remain simple enough to test end-to-end.**

11. **Learner onboarding establishes initial preferences and self-reported context; it is not treated as verified mastery.**

12. **Account suspension and account deactivation are distinct workflows.**

13. **Learning data and progress are preserved when an account is suspended or deactivated.**

14. **Authentication methods must not bypass account restrictions.**

---

## 8. Core Journey Summaries

### Learner

```text
Signup
  ↓
Login
  ↓
Learner Onboarding
  ↓
Dashboard
  ↓
Explore / Search / Recommendations
  ↓
Course Details
  ↓
Prerequisite / Diagnostic
  ↓
Enroll
  ↓
Lesson
  ↓
Resources
  ↓
Practice
  ↓
Assessment
  ↓
Performance Analysis
  ↓
Pass → Next Lesson

OR

Weakness → Remediation → Reassessment
  ↓
Updated Learning Evidence
  ↓
Personalized Next Action
```

---

### Instructor

```text
Signup / Login
  ↓
Instructor Onboarding
  ↓
Instructor Profile
  ↓
Create Course
  ↓
Metadata / Prerequisites
  ↓
Topics / Lessons / Resources
  ↓
Question Bank / Assessments
  ↓
Review
  ↓
Publish
  ↓
Learners Enroll
  ↓
Instructor Sees Course Learners
  ↓
Course Analytics
  ↓
Course Improvement
```

---

### Admin

```text
Controlled Admin Access
  ↓
Admin Dashboard
  ↓
Users
  ↓
Learners
  ↓
Instructors
  ↓
Courses
  ↓
Moderation
  ↓
Analytics
  ↓
Audit Information
```

---

### New Google User

```text
Google Sign-In
  ↓
Google Authentication
  ↓
Temporary Setup
  ↓
Role Selection
  ↓
Role-Specific Onboarding
  ↓
Complete Setup
  ↓
Platform Account + Profile
  ↓
Authenticated Session
  ↓
Role Dashboard
```

