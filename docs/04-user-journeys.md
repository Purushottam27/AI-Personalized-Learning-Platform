# AI Based Personalized Learning Platform --- User Journeys

## 1. Purpose

This document defines the end-to-end workflows for Student, Teacher, and
Admin, plus cross-role workflows and important failure/edge cases.

It is a behavioral/product document. Technical implementation belongs in
later architecture, database, API, security, AI, and infrastructure
documents.

## 2. Student Journey

### Signup

For MVP/testing:

``` text
Public Signup
  ↓
○ Student
○ Teacher
```

Admin is never selectable through public signup.

Student flow:

``` text
Signup
  ↓
Account Created
  ↓
Login
  ↓
Onboarding
```

### Onboarding

The student onboarding follows this progressive flow:

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
Interests
  ↓
Goals
  ↓
Experience Level
  ↓
Daily Study Capacity
  ↓
Preferred Learning Format
  ↓
Onboarding Completed
  ↓
Personalized Student Experience

onboarding uses a combination of:

- structured options
- multiple selection where appropriate
- custom/Other input where appropriate

Experience question:

"How would you describe your current experience with the subjects
you've selected?"

Options:

- I'm completely new to these subjects
- I know some basics
- I'm comfortable with the fundamentals
- I have substantial experience
- I'm not sure

The onboarding experience should be concise and progressive rather than
a large single form.

This is not verified mastery.

### Dashboard

The dashboard answers:

1.  Where am I?
2.  What am I good at?
3.  What should I improve?
4.  What should I do next?

Sections may include:

-   Continue Learning
-   Progress
-   Statistics
-   Strengths
-   Areas to Improve
-   Recommended For You

### Course Discovery

``` text
My Courses
Explore Courses
Recommended For You
```

Explore supports:

-   search
-   department
-   category/subject
-   difficulty

Explicit search/filter remains available even when AI recommendations
exist.

### Course Overview

Before enrollment, show:

-   title
-   description
-   instructor
-   department
-   category
-   difficulty
-   objectives
-   prerequisites
-   estimated duration
-   structure overview

Example:

``` text
Database Management Systems
Instructor: Dr. Rahul Dubey
Department: Computer Science & Engineering
Level: Intermediate
Prerequisite: Basic SQL
```

### Prerequisite / Diagnostic

No prerequisite:

``` text
Course Overview → Enroll
```

Required diagnostic:

``` text
Course Overview
  ↓
Diagnostic
```

Pass:

``` text
Diagnostic
  ↓
Threshold satisfied
  ↓
Enroll / proceed
```

Fail:

``` text
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

If the prerequisite course was already completed, targeted revision is
preferred over repeating the whole course.

### Enrollment

``` text
Course Overview
  ↓
Prerequisite policy satisfied
  ↓
Enroll
  ↓
Course added to My Courses
```

Teacher approval is not part of MVP.

### Course Learning

``` text
My Courses
  ↓
Course
  ↓
Topics
  ↓
Lessons
```

The student sees progress, completed lessons, current lesson, locked
lessons, assessment status, and final assessment status.

### Lesson

A lesson may contain:

-   explanation
-   examples
-   visuals
-   YouTube video
-   teacher notes
-   external references
-   practice
-   assessment

Teachers are not required to record their own videos.

### Practice

``` text
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

Practice is learning-oriented.

### Assessment

Assessment supports:

-   question bank
-   configurable question count
-   marks
-   passing threshold
-   optional timer
-   previous/next navigation
-   question number
-   attempt history
-   maximum attempts where configured

Response states:

``` text
CORRECT
INCORRECT
UNANSWERED
```

Unanswered questions receive zero marks.

### Assessment Result

``` text
Assessment
  ↓
Scoring
  ↓
Question-level analysis
  ↓
Topic-level analysis
  ↓
Learning evidence
  ↓
Mastery update
```

### Pass

``` text
Assessment
  ↓
Passed
  ↓
Learning profile updated
  ↓
Next lesson unlocked according to policy
  ↓
Next recommendation
```

### Fail

``` text
Assessment
  ↓
Not passed
  ↓
Weakness analysis
  ↓
Targeted remediation
  ↓
Reassessment
```

### Retry

A retry should not simply reuse the same fixed questions.

Example:

``` text
Question Bank = 30
Questions per attempt = 10
```

Different attempts can select different questions.

### Remediation

``` text
Weakness
  ↓
Explanation
  ↓
Example
  ↓
Video/resource
  ↓
Practice
  ↓
Mini assessment
  ↓
Reassessment
```

### Improvement

Example:

``` text
Before: 2NF = 45%
After:  2NF = 74%
Improvement: +29 percentage points
```

### Course Completion

``` text
Required lessons complete
  ↓
Final Assessment
  ↓
Course-level analysis
  ↓
Course Mastery Report
```

The report may contain overall mastery, strong topics, developing
topics, weak topics, improvement history, and next steps.

A single final score is not the only mastery evidence.

## 3. Teacher Journey

### Registration

For MVP/testing:

``` text
Public Signup
  ↓
Select Teacher
  ↓
Create Account
  ↓
Login
  ↓
Teacher Dashboard
```

Production teacher verification is deferred.

### Teacher Profile

May contain:

-   name
-   professional title
-   department
-   subject areas
-   profile information
-   avatar

Courses reference the teacher as owner.

### Dashboard

``` text
Overview
Recent Courses
Enrollment Summary
Course Performance
Student Activity
Quick Actions
```

### Course Creation

``` text
Create Course
  ↓
Basic Information
  ↓
Instructor/Ownership
  ↓
Department
  ↓
Category
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

### Course Lifecycle

``` text
DRAFT → PUBLISHED → ARCHIVED
```

Draft courses are not normal public courses.

### Lesson and Resource Management

Teacher can:

-   add/edit lessons
-   associate lessons with topics
-   add explanations
-   add examples
-   add visuals
-   add YouTube videos
-   upload notes
-   add external references
-   create practice
-   configure assessments

Resources may include:

``` text
YouTube
PDF
PPT/PPTX
DOC/DOCX
External Link
```

### Question Bank

Manual questions support:

-   question
-   options
-   correct answer
-   explanation
-   marks
-   topic
-   difficulty

CSV/Excel bulk import:

``` text
Upload
  ↓
Parse
  ↓
Validate
  ↓
Preview
  ↓
Teacher confirms
  ↓
Question Bank
```

Future AI generation:

``` text
Teacher Content
  ↓
AI Draft
  ↓
Teacher Review/Edit
  ↓
Teacher Approval
  ↓
Question Bank
```

### Assessment Management

Teacher configures:

-   question bank
-   questions per attempt
-   marks
-   passing threshold
-   timer
-   maximum attempts
-   selection strategy
-   difficulty distribution where supported

Assessment types:

-   practice
-   lesson/topic assessment
-   diagnostic
-   final assessment

### Enrolled Students

For every course owned by the teacher:

``` text
My Courses
  ↓
Course
  ↓
Students
```

Teacher can see enrolled students and course-relevant information:

-   enrollment status
-   progress
-   lesson completion
-   assessment performance
-   topic performance
-   relevant strengths/weaknesses
-   course activity

Teacher cannot automatically access unrelated learning data from other
teachers' courses.

### Teacher Analytics

``` text
Enrollment
Completion
Average Performance
Topic Performance
Difficult Topics
Student Progress
Assessment Performance
```

### Teacher Improvement Loop

``` text
Teacher creates course
  ↓
Students learn
  ↓
Performance data
  ↓
Teacher analytics
  ↓
Difficult content identified
  ↓
Teacher improves course
  ↓
Students receive improved material
```

## 4. Admin Journey

### Access

Admin accounts are controlled and are not created through public
self-selected signup.

### Dashboard

``` text
Platform Overview
Users
Students
Teachers
Courses
Moderation
Analytics
Audit Logs
```

### User Management

Admin may manage platform users according to authorization policy.

### Course Moderation

Admin may review and moderate platform courses according to platform
policy.

Detailed destructive actions and workflows are deferred.

## 5. Cross-Role Workflows

### Teacher Creates Course

``` text
Teacher
  ↓
Create Course
  ↓
Department / Metadata
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
Students discover/enroll
```

### Student Enrollment

``` text
Student
  ↓
Search / Explore / Recommendation
  ↓
Course Details
  ↓
Prerequisite / Diagnostic
  ↓
Enroll
  ↓
Course added to My Courses
  ↓
Teacher enrollment data updates
```

### Student Learning Data

``` text
Student
  ↓
Lesson
  ↓
Practice
  ↓
Assessment
  ↓
Performance Evidence
  ├───────────────┐
  ▼               ▼
Student        Teacher
Analytics      Course Analytics
  │               │
  ▼               ▼
Personalization  Course Improvement
```

### Teacher Views Student

``` text
Teacher
  ↓
My Courses
  ↓
Course
  ↓
Students
  ↓
Student
  ↓
Course-specific learning data
```

Server-side authorization must confirm course ownership.

### Personalization

``` text
Student Activity
  ↓
Learning Evidence
  ↓
Performance Analysis
  ↓
Learning Profile
  ↓
Rules + AI
  ↓
Recommendation
  ↓
Student
```

## 6. Important Failure and Edge Cases

### Failed Diagnostic

``` text
Diagnostic
  ↓
Fail
  ↓
Identify prerequisite weakness
  ↓
Recommend prerequisite/refresher
  ↓
Mini assessment
  ↓
Retry diagnostic
```

### Failed Assessment

``` text
Assessment
  ↓
Fail
  ↓
Weakness analysis
  ↓
Targeted remediation
  ↓
Reassessment
```

### Timer Expiration

``` text
Timer reaches zero
  ↓
Automatic submission
  ↓
Unanswered = zero marks
```

### Repeated Attempts

Different attempts should use question-bank selection rather than always
repeating the exact same questions.

### Repeated Difficulty

``` text
Repeated difficulty
  ↓
Stronger remediation
  ↓
Prerequisite/refresher recommendation
  ↓
Additional practice
  ↓
Reassessment
```

The same intervention should not be repeated indefinitely.

### YouTube Resource Unavailable

``` text
Video unavailable
  ↓
Graceful fallback
  ↓
Alternative resource if available
```

The lesson must not fail because one external resource is unavailable.

### Incomplete Course

An incomplete teacher course remains DRAFT and should not be treated as
a normal published course.

### Unauthorized Teacher Access

If Teacher A requests Teacher B's student data:

``` text
Request
  ↓
Authorization check
  ↓
Ownership fails
  ↓
Access denied
```

### Unauthorized Role Escalation

Client-side manipulation must never allow:

``` text
STUDENT → ADMIN
```

Roles are controlled server-side.

### Archived Course After Enrollment

Historical records should remain meaningful and progress should not be
silently destroyed. Exact active-learner handling is a later decision.

### Account Deletion

Deletion must consider enrollments, assessment attempts, teacher
analytics, historical records, and privacy requirements. Exact rules
belong to later security/data design.

## 7. User Journey Principles

1.  Every important action has a clear next step.
2.  Failure leads toward recovery.
3.  Students understand why an action is required.
4.  Teachers control educational content and assessment configuration.
5.  Teachers see relevant performance data for their own courses.
6.  Admins operate at platform level.
7.  AI recommendations complement explicit user controls.
8.  Authorization is enforced server-side.
9.  External resource failure does not break learning.
10. MVP flows remain simple enough to test end-to-end.

## 8. Core Journey Summaries

### Student

``` text
Signup
  ↓
Onboarding
  ↓
Dashboard
  ↓
Explore/Search
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
Updated Learning Profile
  ↓
Personalized Next Action
```

### Teacher

``` text
Signup/Login
  ↓
Teacher Profile
  ↓
Create Course
  ↓
Metadata / Department / Prerequisites
  ↓
Topics / Lessons / Resources
  ↓
Question Bank / Assessments
  ↓
Review
  ↓
Publish
  ↓
Students Enroll
  ↓
Teacher Sees Enrolled Students
  ↓
Course Analytics
  ↓
Course Improvement
```

### Admin

``` text
Controlled Admin Access
  ↓
Admin Dashboard
  ↓
Users
  ↓
Teachers
  ↓
Students
  ↓
Courses
  ↓
Moderation
  ↓
Analytics
  ↓
Audit Information
```
