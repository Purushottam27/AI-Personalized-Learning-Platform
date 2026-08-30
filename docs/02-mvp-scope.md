# AI Based Personalized Learning Platform --- MVP Scope

## 1. Purpose

This document defines the first usable version of the platform.

The MVP must prove the central product idea:

> The platform can observe a student's learning performance, identify
> meaningful weaknesses, recommend targeted learning, and measure
> whether the student improves.

The MVP should be complete enough to demonstrate the entire learning
loop without implementing every advanced feature.

## 2. MVP Success Criterion

A successful MVP should support this complete journey:

``` text
Signup
  ↓
Onboarding
  ↓
Course discovery
  ↓
Enrollment
  ↓
Learning
  ↓
Practice
  ↓
Assessment
  ↓
Performance analysis
  ↓
Weakness detection
  ↓
Targeted recommendation
  ↓
Remediation
  ↓
Reassessment
  ↓
Improvement measurement
  ↓
Updated learning profile
```

If this loop works reliably, the core idea of personalized learning has
been demonstrated.

## 3. Public MVP

The public website should initially contain:

-   landing page
-   product overview
-   explanation of personalized learning
-   feature section
-   call-to-action
-   navigation
-   signup
-   login
-   footer
-   light/dark theme support

The public site should clearly communicate that the product is about
improving learning ability, not simply consuming courses.

## 4. Authentication MVP

The initial authentication system should support:

-   signup
-   login
-   access token
-   refresh token
-   token renewal
-   logout
-   authentication middleware
-   role-based authorization

Roles:

-   student
-   teacher
-   admin

The exact token storage, refresh-token rotation, revocation, cookie
strategy, and security controls will be finalized during the security
and architecture phases.

## 5. Student MVP

The student MVP should include:

### Onboarding


The MVP onboarding collects:

- learning interests
- learning goals
- overall self-reported experience level
- daily study capacity
- preferred learning format

Onboarding information represents initial learner context, not verified
mastery.

The onboarding is a multi-step experience.

The student should be able to answer structured choices, with custom
input where appropriate.

The onboarding should not collect:

- preferred study time
- preferred session duration
- study days

Those are deferred future scheduling features.

### Dashboard

The dashboard should answer:

-   Where am I?
-   What am I good at?
-   What should I improve?
-   What should I do next?

It should contain a focused selection of:

-   current/continuation course
-   progress
-   learning statistics
-   strengths
-   weaknesses
-   recommended actions

### Courses

The student should have:

-   My Courses
-   Explore Courses
-   Recommended For You

Students should be able to view course information before enrollment.

### Enrollment

MVP enrollment should be simple:

``` text
Course Overview
    ↓
Enroll
    ↓
Course added to My Courses
```

Teacher approval is not part of the initial MVP.

### Course Learning

Students should be able to:

-   view course structure
-   see topics and lessons
-   view progress
-   access unlocked lessons
-   complete learning content
-   use provided resources
-   complete practice
-   take assessments

Sequential progression should be supported.

### Lesson

A lesson may contain:

-   explanation
-   examples
-   visual material
-   YouTube resources
-   teacher-provided documents
-   external references
-   practice
-   assessment

### Assessment

The MVP should support:

-   question bank
-   configurable question count
-   marks
-   passing threshold
-   optional timer
-   previous/next navigation
-   question number display
-   unanswered tracking
-   assessment submission
-   result calculation
-   attempt history

Unanswered questions receive zero points.

### Remediation

When performance indicates a weakness:

``` text
Weakness
  ↓
Targeted learning resources
  ↓
Practice
  ↓
Mini assessment / reassessment
```

The platform should recommend remediation rather than simply telling the
student to repeat the same quiz.

### Learning Analytics

The MVP should provide basic:

-   course progress
-   lesson completion
-   assessment scores
-   topic performance
-   strengths
-   weaknesses
-   improvement history

Advanced analytics can be added later.

## 6. Diagnostic Assessment MVP

Diagnostic assessments are course-specific.

A teacher may configure a course with:

-   prerequisite knowledge
-   prerequisite course
-   diagnostic assessment
-   required passing threshold

Example:

``` text
Advanced SQL
    ↓
Diagnostic Assessment
    ↓
Poor performance
    ↓
Identify prerequisite weakness
    ↓
Recommend Basic SQL or targeted refresher
    ↓
Mini assessment
    ↓
Retry diagnostic
```

A student who has already completed the prerequisite course should not
automatically be forced to repeat the entire course.

## 7. Teacher MVP

The teacher MVP should include:

### Dashboard

-   recent courses
-   enrollment counts
-   course progress overview
-   basic course performance

### Course Management

Teacher can:

-   create a course
-   edit a course
-   add topics
-   add lessons
-   edit lessons
-   manage resources
-   configure prerequisites
-   publish/manage course content

### Resources

Teacher can add:

-   written explanations
-   examples
-   YouTube links
-   external references
-   uploaded educational documents

### Question Bank

Teacher can:

-   create questions manually
-   define options
-   define correct answers
-   define marks
-   define topic
-   define difficulty
-   bulk import structured questions through CSV/Excel

PDF question import is deferred until the parsing requirements are
understood.

### Assessment

Teacher can configure:

-   question bank
-   question count
-   marks
-   passing threshold
-   time limit
-   maximum attempts
-   question selection strategy

### Analytics

Teacher can see basic:

-   enrollment
-   completion
-   average performance
-   topic-level difficulty
-   student performance distribution

## 8. Admin MVP

Admin MVP should initially include:

-   platform overview
-   user management
-   student/teacher management
-   basic course moderation
-   platform analytics
-   basic audit/activity information

The admin system should remain intentionally smaller than the student
and teacher systems during MVP development.

## 9. Personalization Engine MVP

The first version should use a hybrid approach.

### Deterministic layer

Handles:

-   assessment scoring
-   passing thresholds
-   progression
-   prerequisite requirements
-   basic mastery thresholds
-   weakness classification

Initial provisional mastery categories:

``` text
80%+       Strong
60–79%     Developing
Below 60%  Needs Improvement
```

These thresholds are expected to evolve after the first complete
implementation.

### AI layer

Handles:

-   personalized feedback
-   explanation of performance patterns
-   recommendation reasoning
-   targeted learning recommendations
-   personalized remediation suggestions

AI should not directly own critical progression decisions.

## 10. Assessment Strategy MVP

Practice and assessment are separate.

### Practice

-   repeatable
-   learning-focused
-   can provide feedback
-   not necessarily used as the primary mastery measure

### Assessment

-   measures knowledge
-   uses a question bank
-   can be timed
-   may have attempt limits
-   contributes stronger evidence to mastery

### Question Bank

A teacher should ideally have more questions than are shown in one
attempt.

Example:

``` text
Question bank = 30
Questions per attempt = 10
```

Different attempts can select different questions.

This reduces memorization of a fixed quiz.

## 11. Deferred Features

The following should not be required for MVP:

-   sophisticated machine-learning recommendation models
-   reinforcement learning
-   advanced knowledge graphs
-   AI-generated complete courses
-   automatic AI-generated assessments without teacher approval
-   advanced spaced repetition
-   predictive dropout detection
-   voice-based AI tutor
-   real-time adaptive lesson generation
-   social learning
-   advanced gamification
-   leaderboards
-   complex teacher approval workflows
-   course versioning
-   advanced notifications
-   complex real-time features
-   advanced admin systems

These can be evaluated after the MVP proves the core learning loop.

## 12. MVP Development Principle

The MVP should be:

-   understandable
-   deterministic where possible
-   testable
-   modular
-   reusable
-   secure
-   maintainable

The MVP should not attempt to solve every possible personalization
problem.

The goal is to build a reliable foundation that can later evolve into a
more sophisticated personalized learning engine.
