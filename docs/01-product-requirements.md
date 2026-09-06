# AI Based Personalized Learning Platform — Product Requirements

## 1. Product Vision

The AI Based Personalized Learning Platform is intended to help **learners** gain knowledge while continuously identifying and overcoming weaknesses so they can become more capable, efficient, and confident learners.

The platform should not behave like a conventional Learning Management System where the journey is simply:

**Course → Lesson → Quiz → Score → Completion**

Instead, the core experience should be:

**Learn → Measure → Understand → Improve → Adapt → Repeat**

The platform should continuously use learning evidence to understand the learner and recommend the most useful next learning action.

The platform is designed as a **personalized learning system**, rather than only a content-delivery or course-management system.

---

## 2. Core Product Promise

The platform should help a learner:

- learn conceptual and practical knowledge
- understand their current strengths
- identify areas of weakness
- receive targeted learning material
- practice weak concepts
- reassess their understanding
- measure improvement
- receive personalized recommendations
- progress through learning with greater confidence

The desired outcome is:

**Knowledge → Competence → Improvement → Confidence**

The platform should focus on **measurable learning improvement**, not merely course completion.

---

## 3. Primary User Roles

The platform will initially support three roles:

### Learner

The learner consumes learning content, practices, takes assessments, tracks progress, and receives personalized recommendations.

Learners provide onboarding information about their:

- learning interests
- learning goals
- current experience level
- available daily study time
- preferred learning formats

This information contributes to the learner's evolving learning profile and personalization.

### Instructor

The instructor creates and manages educational content and learning experiences.

Instructors can eventually manage:

- courses
- topics
- lessons
- learning resources
- practice questions
- question banks
- assessments
- prerequisites
- course analytics

Instructors are responsible for the educational content they create.

### Admin

The admin is responsible for platform-level governance and administration.

The admin initially focuses on:

- user management
- platform governance
- moderation
- system-level analytics
- audit/activity information
- system configuration
- administrative operations

Admin access should follow the principle of **platform governance rather than unrestricted access to every domain's data or operations**.

### Role Rules

The platform uses the following internal role values:

```text
LEARNER
INSTRUCTOR
ADMIN
```

In the MVP:

- one user account has one platform role
- Learner accounts have a `LearnerProfile`
- Instructor accounts have an `InstructorProfile`
- Admin accounts do not require a learner or instructor profile
- public signup may create a Learner or Instructor account
- Admin accounts are provisioned separately and are never publicly selectable during signup
- normal profile editing does not change a user's role

A future role-change workflow may be introduced separately if required.

---

## 4. Learner Capabilities

The learner experience should eventually include:

- signup and login
- password-based authentication
- Google Sign-In
- secure authentication and session management
- role-based authorization
- learner onboarding
- learning interests
- learning goals
- experience-level information
- daily study capacity
- preferred learning formats
- course discovery
- enrolled courses
- recommended courses
- course progress
- sequential lesson progression
- lesson explanations
- examples
- videos
- documents and notes
- external learning resources
- practice activities
- assessments
- timed assessments where configured
- question navigation
- assessment history
- strengths
- weaknesses
- topic mastery
- personalized recommendations
- remediation
- reassessment
- course-level mastery analysis
- overall learning analytics
- profile and account settings
- account deactivation
- account reactivation

Learner profile information should remain separate from general account information.

The learner's account contains identity and account-level information, while the learner profile contains learning-specific information.

---

## 5. Learner Onboarding

Learner onboarding should establish an initial understanding of the learner before or during the beginning of their learning journey.

The MVP onboarding consists of five questions:

### Question 1 — Learning Interests

**What would you like to learn about?**

The learner can select multiple interests, including:

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology
- Other — Please specify

### Question 2 — Learning Goals

**What are your main learning goals?**

The learner can select multiple goals, including:

- Build practical skills
- Prepare for exams or academic studies
- Prepare for a job or career
- Improve existing knowledge
- Learn something new for personal interest
- Prepare for interviews
- Other — Please specify

### Question 3 — Experience Level

**How would you describe your current experience with your selected interests?**

The learner selects one:

- I have no prior knowledge
- I have a basic understanding
- I am comfortable with the fundamentals
- I have substantial experience
- I'm not sure

### Question 4 — Daily Study Capacity

**How much time can you dedicate to learning each day?**

The learner selects one:

- Less than 1 hour
- 1–2 hours
- 2–3 hours
- 3–4 hours
- 5 or more hours

### Question 5 — Preferred Learning Format

**How do you prefer to learn?**

The learner can select multiple formats:

- Reading
- Videos
- Interactive Learning
- Practice Exercises
- Projects

### Onboarding Behavior

The onboarding experience should:

- present one question at a time
- provide Back and Next navigation
- save answers progressively
- allow the learner to resume after interruption
- store the actual custom value when `Other — Please specify` is selected
- treat preferred learning format as a preference rather than a strict restriction

The MVP uses a fixed five-question onboarding flow.

The onboarding state is:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Onboarding can also be revisited after initial completion to update learner preferences.

---

## 6. Instructor Capabilities

The instructor experience should eventually include:

- instructor dashboard
- instructor onboarding
- course creation
- course editing
- course publishing
- topic management
- lesson management
- resource management
- YouTube resource integration
- document/resource uploads
- practice question management
- question bank management
- manual question creation
- CSV/Excel bulk question import
- assessment creation
- assessment configuration
- prerequisite configuration
- diagnostic assessment configuration
- course analytics
- learner performance analytics
- profile and settings

### Instructor Onboarding

Instructor onboarding is intentionally different from learner onboarding.

The MVP onboarding consists of two questions:

### Question 1 — Professional Role

**What best describes your professional role?**

The instructor selects one:

- Software Developer / Designer
- Data Scientist
- Machine Learning Engineer
- Cybersecurity Professional
- Educator / Instructor
- Finance Professional
- Other — Please specify

This contributes to the instructor's professional title.

### Question 2 — Teaching Expertise

**What areas are you experienced in teaching?**

The instructor can select multiple areas:

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology
- Other — Please specify

This contributes to the instructor's expertise areas.

Instructor profile information may additionally contain:

- professional title
- expertise areas
- bio
- years of experience
- organization
- social links

These profile-page fields are not mandatory onboarding questions.

### Instructor Publishing

In the MVP, instructors can create and publish courses without mandatory Admin pre-approval.

The Admin remains responsible for platform governance and moderation and can intervene when content is reported or violates platform requirements.

A future workflow may introduce:

**Instructor → Submit Course → Admin Review → Approve/Reject → Publish**

but this is not mandatory for the MVP.

---

## 7. Admin Capabilities

The admin system should initially focus on:

- platform overview
- user management
- learner management
- instructor management
- account status management
- course moderation
- platform analytics
- audit/activity logs
- system configuration
- administrative operations

Admin account management should distinguish between:

### Suspension

An admin can suspend an active user account when platform intervention is required.

A suspension should include a reason and prevent the user from accessing protected platform functionality.

An admin can subsequently restore a suspended account to active status.

### User Deactivation

User deactivation is different from suspension.

A learner or instructor may voluntarily deactivate their own account.

Admin does not use the normal user status-management operation to deactivate accounts.

### Admin Role Management

Admin cannot change a user's platform role through the normal user-management workflow.

There is no normal role-change operation in the MVP.

---

## 8. Account States

The platform supports three account states:

```text
ACTIVE
SUSPENDED
DEACTIVATED
```

### ACTIVE

The account can use normal platform functionality according to its role.

### DEACTIVATED

The user voluntarily deactivated their account.

While deactivated:

- protected platform access is blocked
- learning activity is paused
- learning data and history are preserved
- the user can reactivate the account
- previous sessions are revoked

Reactivation requires the user's authentication credentials and creates a new authenticated session.

### SUSPENDED

The account has been restricted by the platform.

While suspended:

- protected platform access is blocked
- learning activity is paused
- learning data and history are preserved
- the user cannot self-reactivate the account
- active sessions are revoked

Only the appropriate administrative workflow can restore a suspended account.

The platform must not allow authentication flows such as Google Sign-In to bypass an existing suspension or deactivation.

---

## 9. Authentication

The platform should support secure authentication using:

- email and password
- Google Sign-In

### Password Authentication

The platform should support:

- signup
- login
- access-token-based API authentication
- refresh-token-based session continuation
- logout
- password change
- account reactivation

Passwords must never be stored in plaintext.

### Google Sign-In

Google Sign-In is treated as an external authentication method.

Google authentication establishes the user's Google identity; the platform then creates or retrieves the platform account and issues the platform's own authenticated session.

For a new Google user, the product flow is:

**Google Authentication → Role Selection → Role-Specific Onboarding → Account Creation → Profile Creation → Authenticated Session**

A new Google user should not be forced to create a password during initial onboarding.

A Google-only account may therefore exist without a local password.

### Existing Account Protection

If a user already has a password-based account and their email matches a Google account, the platform must not automatically merge or link the accounts solely because their email addresses match.

The user should authenticate using their existing account.

Account linking may be introduced as a future authenticated account-settings capability.

### Email Verification

Email verification is planned as a future capability and is not part of the current backend MVP implementation.

---

## 10. Learning Content Model

A lesson should provide an actual learning experience rather than only plain text.

A lesson may contain:

- conceptual explanation
- examples
- visual material
- YouTube video resources
- instructor-provided PDF/PPT/PPTX/DOCX resources
- external references
- practice activities
- assessments

Instructors should not be required to record their own videos.

Relevant YouTube videos may be embedded when embedding is permitted.

The platform should treat instructor-created educational content as an important source of structured learning knowledge.

---

## 11. Assessment Model

The platform should distinguish between:

### Practice

Learning-oriented activities that are generally repeatable and intended to reinforce understanding.

### Assessment

An activity primarily used to measure learning.

### Diagnostic Assessment

An assessment used to determine whether a learner has the prerequisite knowledge required for a course.

### Final Assessment

An assessment used to evaluate course-level knowledge.

Assessments should support:

- question banks
- configurable question count
- configurable marks
- passing thresholds
- optional time limits
- maximum attempt policies
- randomized question selection
- question-level response tracking
- assessment history

Unanswered questions should contribute zero points but remain analytically distinct from incorrect answers.

---

## 12. Personalization

Personalization is the central differentiator of the platform.

The system should collect structured learning evidence from:

- lesson completion
- practice activities
- assessment results
- question-level responses
- topic performance
- course progress
- learning activity
- diagnostic assessments
- reassessment results

The system should use this evidence to maintain an evolving learning profile.

The platform should identify:

- strengths
- weaknesses
- developing topics
- current mastery
- learning gaps
- areas requiring remediation

It should then recommend actions such as:

- continue the current lesson
- study the next lesson
- revise a weak topic
- complete targeted practice
- take a mini assessment
- revisit prerequisite knowledge
- enroll in a recommended course

Personalization should be **evidence-driven and explainable** wherever practical.

The system should avoid making unsupported assumptions about a learner's knowledge or ability.

---

## 13. AI Role

AI should complement deterministic application logic rather than replace it.

Deterministic rules should handle decisions such as:

- scoring
- passing thresholds
- access control
- lesson unlocking
- prerequisite requirements
- assessment policies
- account-state enforcement

AI should be used for reasoning-heavy tasks such as:

- interpreting structured learning evidence
- generating personalized explanations
- summarizing performance
- recommending targeted learning actions
- generating personalized feedback
- helping prioritize interventions

AI should not be the sole authority for critical progression or mastery decisions.

Important learning decisions should be grounded in structured evidence and deterministic rules wherever possible.

### AI-Generated Assessment Content

AI-assisted question generation may be added later.

AI-generated questions should not automatically become official assessment content.

Instructor review and approval should be required before generated questions become official educational or assessment content.

---

## 14. Improvement Loop

The core improvement loop is:

```text
Learner learns
      ↓
Learner practices
      ↓
Learner is assessed
      ↓
Performance evidence is collected
      ↓
Topic mastery is updated
      ↓
Strengths and weaknesses are identified
      ↓
Targeted recommendation is generated
      ↓
Learner completes intervention
      ↓
Learner is reassessed
      ↓
Improvement is measured
      ↓
Learning profile is updated
      ↓
Next personalized action
```

The loop should allow the platform to continuously adapt to the learner rather than treating learning as a one-time linear progression.

---

## 15. Learning Domain Taxonomy

The initial shared learning-domain taxonomy should include:

- Programming & Software Development
- Data Science & Artificial Intelligence
- Mathematics & Statistics
- Business & Entrepreneurship
- Finance & Economics
- Science & Technology

The same core taxonomy should be usable across relevant parts of the platform, including:

- learner interests
- instructor expertise
- course domains
- learning discovery
- future recommendation systems

This creates a common relationship between:

**Learner Interest → Instructor Expertise → Course Domain → Personalized Recommendation**

The taxonomy may be expanded as the platform grows.

---

## 16. Non-Functional Product Goals

The platform should be designed for:

- scalability
- maintainability
- modularity
- reusability
- reliability
- security
- testability
- clear separation of responsibilities
- explainable personalization
- future extensibility

The project should avoid unnecessary complexity during the MVP.

Architecture and implementation decisions should support future expansion without prematurely implementing every planned feature.

---

## 17. MVP Product Principles

1. **Understand requirements before implementation.**
2. **Prefer evidence over unsupported AI inference.**
3. **Keep deterministic decisions deterministic.**
4. **Use AI where reasoning provides real value.**
5. **Build reusable and modular components.**
6. **Avoid unnecessary over-engineering.**
7. **Keep the MVP focused.**
8. **Measure improvement rather than only completion.**
9. **Treat instructor-created content as a core source of educational knowledge.**
10. **Keep account data, role-specific profile data, and learning data conceptually separate.**
11. **Use explicit account-state semantics so suspension and deactivation are not treated as the same operation.**
12. **Do not allow authentication methods to bypass account restrictions.**
13. **Keep personalization evidence-driven and explainable.**
14. **Every major architectural decision should have a documented reason.**

---

## 18. Product Direction

The platform should evolve toward a continuous personalized learning ecosystem in which:

```text
Learner
   ↓
Learner Profile
   ↓
Learning Activity
   ↓
Learning Evidence
   ↓
Mastery & Learning Gaps
   ↓
Personalized Recommendations
   ↓
Targeted Learning Intervention
   ↓
Reassessment
   ↓
Updated Learner Profile
   ↓
Next Best Learning Action
```

At the same time, instructors provide the educational knowledge and learning experiences that power the platform:

```text
Instructor
   ↓
Course
   ↓
Topics
   ↓
Lessons
   ↓
Resources
   ↓
Practice
   ↓
Assessments
   ↓
Learning Evidence
```

The long-term product should connect these two sides so that educational content and learner evidence continuously improve the relevance of the learning experience.
