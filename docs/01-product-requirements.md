# AI Based Personalized Learning Platform --- Product Requirements

## 1. Product Vision

The AI Based Personalized Learning Platform is intended to help students
gain knowledge while continuously identifying and overcoming weaknesses
so they can become more capable, efficient, and confident learners.

The platform should not behave like a conventional Learning Management
System where the journey is simply:

Course → Lesson → Quiz → Score → Completion.

Instead, the core experience should be:

**Learn → Measure → Understand → Improve → Adapt → Repeat**

The platform should continuously use learning evidence to understand the
student and recommend the most useful next learning action.

## 2. Core Product Promise

The platform should help a learner:

-   learn conceptual and practical knowledge
-   understand their current strengths
-   identify areas of weakness
-   receive targeted learning material
-   practice weak concepts
-   reassess their understanding
-   measure improvement
-   receive personalized recommendations
-   progress through learning with greater confidence

The desired outcome is:

**Knowledge → Competence → Improvement → Confidence**

## 3. Primary User Roles

The platform will initially support three roles:

### Student

The student consumes learning content, practices, takes assessments,
tracks progress, and receives personalized recommendations.

### Teacher

The teacher creates and manages educational content, courses, lessons,
resources, question banks, assessments, prerequisites, and course
analytics.

### Admin

The admin manages the overall platform, users, moderation, system-level
analytics, logs, and administrative operations.

## 4. Student Capabilities

The student experience should eventually include:

-   signup and login
-   secure authentication
-   role-based authorization
-   onboarding
-   learning interests and goals
-   course discovery
-   enrolled courses
-   recommended courses
-   course progress
-   sequential lesson progression
-   lesson explanations
-   examples
-   videos
-   documents and notes
-   external learning resources
-   practice activities
-   assessments
-   timed assessments where configured
-   question navigation
-   assessment history
-   strengths
-   weaknesses
-   topic mastery
-   personalized recommendations
-   remediation
-   reassessment
-   course-level mastery analysis
-   overall learning analytics
-   profile and account settings

## 5. Teacher Capabilities

The teacher experience should eventually include:

-   teacher dashboard
-   course creation
-   course editing
-   course publishing
-   topic management
-   lesson management
-   resource management
-   YouTube resource integration
-   document/resource uploads
-   practice question management
-   question bank management
-   manual question creation
-   CSV/Excel bulk question import
-   assessment creation
-   assessment configuration
-   prerequisite configuration
-   diagnostic assessment configuration
-   course analytics
-   student performance analytics
-   profile and settings

AI-assisted question generation may be added later, but teacher review
and approval should be required before generated questions become
official assessment content.

## 6. Admin Capabilities

The admin system should initially focus on:

-   platform overview
-   user management
-   teacher/student management
-   course moderation
-   platform analytics
-   audit/activity logs
-   system configuration

Advanced administration can be introduced later.

## 7. Learning Content Model

A lesson should provide an actual learning experience rather than only
plain text.

A lesson may contain:

-   conceptual explanation
-   examples
-   visual material
-   YouTube video resources
-   teacher-provided PDF/PPT/PPTX/DOCX resources
-   external references
-   practice activities
-   assessments

Teachers should not be required to record their own videos. Relevant
YouTube videos may be embedded when embedding is permitted.

## 8. Assessment Model

The platform should distinguish:

### Practice

Learning-oriented and generally repeatable.

### Assessment

Used to measure learning.

### Diagnostic Assessment

Used to determine whether a student has prerequisite knowledge for a
course.

### Final Assessment

Used to evaluate course-level knowledge.

Assessments should support:

-   question banks
-   configurable question count
-   configurable marks
-   passing thresholds
-   optional time limits
-   maximum attempt policies
-   randomized question selection
-   question-level response tracking

Unanswered questions should contribute zero points but remain
analytically distinct from incorrect answers.

## 9. Personalization

Personalization is the central differentiator of the platform.

The system should collect structured evidence from:

-   lesson completion
-   practice
-   assessment results
-   question-level responses
-   topic performance
-   course progress
-   learning activity
-   diagnostic assessments

The system should use this evidence to maintain an evolving learning
profile.

The platform should identify:

-   strengths
-   weaknesses
-   developing topics
-   current mastery
-   learning gaps

It should then recommend actions such as:

-   continue current lesson
-   study the next lesson
-   revise a weak topic
-   complete targeted practice
-   take a mini assessment
-   revisit prerequisite knowledge
-   enroll in a recommended course

## 10. AI Role

AI should complement deterministic application logic.

Deterministic rules should handle decisions such as:

-   scoring
-   passing thresholds
-   access control
-   lesson unlocking
-   prerequisite requirements
-   assessment policies

AI should be used for reasoning-heavy tasks such as:

-   interpreting structured learning evidence
-   generating personalized explanations
-   summarizing performance
-   recommending targeted learning actions
-   generating personalized feedback
-   helping prioritize interventions

AI should not be the sole authority for critical progression or mastery
decisions.

## 11. Improvement Loop

The core improvement loop is:

``` text
Student learns
    ↓
Student practices
    ↓
Student is assessed
    ↓
Performance evidence is collected
    ↓
Topic mastery is updated
    ↓
Strengths and weaknesses are identified
    ↓
Targeted recommendation is generated
    ↓
Student completes intervention
    ↓
Student is reassessed
    ↓
Improvement is measured
    ↓
Learning profile is updated
    ↓
Next personalized action
```

## 12. Non-Functional Product Goals

The platform should be designed for:

-   scalability
-   maintainability
-   modularity
-   reusability
-   reliability
-   security
-   testability
-   clear separation of responsibilities
-   explainable personalization
-   future extensibility

The project should avoid unnecessary complexity during the MVP.

## 13. Product Principles

1.  Understand requirements before implementation.
2.  Prefer evidence over unsupported AI inference.
3.  Keep deterministic decisions deterministic.
4.  Use AI where reasoning provides real value.
5.  Build reusable and modular components.
6.  Avoid unnecessary over-engineering.
7.  Keep the MVP focused.
8.  Measure improvement rather than only completion.
9.  Treat teacher content as a core source of educational knowledge.
10. Every major architectural decision should have a documented reason.
