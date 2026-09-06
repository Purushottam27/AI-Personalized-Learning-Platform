# AI Based Personalized Learning Platform — AI Personalization Engine Design

## 1. Purpose

This document defines the AI personalization architecture for the AI Based Personalized Learning Platform.

The personalization engine transforms learning activity and structured learning evidence into:

- learner learning state
- topic mastery estimates
- strengths
- weaknesses
- knowledge gaps
- recommendations
- interventions
- next-best learning actions

The system must not behave like a generic chatbot.

The goal is:

> **Help each learner understand what they know, what they do not know, why they are struggling, and what they should do next to improve efficiently and confidently.**

This document defines the personalization architecture and boundaries. Exact persistence schemas belong to `06-database-design.md`; API definitions belong to `07-api-design.md`; testing requirements belong to `12-testing-strategy.md`; deferred capabilities belong to `15-future-implementation.md`.

---

# 2. Personalization Philosophy

The platform follows a continuous learning loop:

```text
Learner Learns
      ↓
Learner Practices
      ↓
Learner Is Assessed
      ↓
Learning Evidence Generated
      ↓
Student Learning Model Updated
      ↓
Strengths / Weaknesses Identified
      ↓
Next Best Action Determined
      ↓
Learner Acts
      ↓
New Evidence
      ↓
Model Updated Again
```

Personalization is therefore a **continuous feedback system**, not a one-time course recommendation.

The system should continuously identify the smallest useful next action that helps the learner overcome the current learning difficulty and move forward.

---

# 3. Core Architectural Principle

The most important design rule is:

> **AI enhances the personalization engine; AI does not become the personalization engine.**

The personalization system combines:

```text
Learning Evidence
+
Student Learning Model
+
Deterministic Rules
+
Recommendation Logic
+
AI Enhancement
```

AI must not directly control authoritative learning state.

---

# 4. Why Pure AI Personalization Is Not Enough

A simple architecture such as:

```text
Learner History
      ↓
LLM
      ↓
Recommendation
```

creates problems:

- inconsistent decisions
- difficult testing
- unpredictable output
- difficult debugging
- poor explainability
- unnecessary AI cost
- hallucination risk
- difficulty enforcing prerequisite rules
- difficulty guaranteeing learning progression

Therefore, the platform uses a hybrid architecture in which deterministic application logic remains authoritative.

---

# 5. Hybrid Personalization Architecture

```text
                  Learning Activity
                         │
                         ▼
                  Learning Evidence
                         │
                         ▼
                Student Learning Model
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      Deterministic Engine       Analytics
              │
              ▼
       Candidate Actions
              │
              ▼
      Recommendation Engine
              │
        ┌─────┴─────┐
        ▼           ▼
      Rules         AI
        │           │
        └─────┬─────┘
              ▼
     Validated Recommendation
              │
              ▼
       Student Next Action
              │
              ▼
        New Evidence
```

The deterministic engine controls authoritative decisions. AI operates only within the boundaries provided by the platform.

---

# 6. Personalization Responsibilities

The personalization engine should answer five core questions.

### 6.1 What is the learner learning?

```text
Current course
Current topic
Current lesson
Course progress
Learning path
```

### 6.2 What does the learner appear to know?

```text
Topic mastery
Course-level performance
Prerequisite readiness
Recent assessment performance
```

### 6.3 What does the learner struggle with?

```text
Weak topics
Repeated mistakes
Knowledge gaps
High unanswered rates
Declining performance
```

### 6.4 What is improving?

```text
Learning trend
Recent assessment improvement
Reduced mistakes
Improved practice performance
```

### 6.5 What should happen next?

```text
Continue lesson
Review topic
Review lesson
Use an approved resource
Practice
Take an assessment
Complete prerequisite
Take a diagnostic
Continue to the next course/topic
```

---

# 7. Personalization Levels

Personalization can operate at multiple levels:

```text
Course
  ↓
Topic
  ↓
Lesson
  ↓
Resource
  ↓
Practice
  ↓
Assessment
```

These levels do **not** represent a mandatory sequence.

A learner may not need a different course. They may only need:

```text
One topic review
+
A small targeted practice set
```

The engine should therefore select the most specific useful intervention supported by available evidence.

## 7.1 Course

Use when the learner's broader learning path needs to change.

Examples:

```text
Recommend a prerequisite course
Recommend a relevant next course
Identify a course needed to continue
```

## 7.2 Topic

Use when a specific conceptual area is weak.

Example:

```text
Review Normalization
Practice SQL Joins
```

## 7.3 Lesson

Use when evidence identifies a specific lesson or concept that needs review.

## 7.4 Resource

Use when another approved explanation or learning format may help.

Examples:

```text
Teacher notes
Approved video
PDF/resource
Alternative explanation
```

## 7.5 Practice

Use when the learner has sufficient conceptual exposure but needs application or reinforcement.

## 7.6 Assessment

Use when stronger evidence of readiness or improvement is required.

Assessment is primarily a **measurement instrument**, not the default remediation mechanism.

---

# 8. Learning Evidence

Learning evidence is the primary input to personalization.

Examples include:

```text
LESSON_STARTED
LESSON_COMPLETED
QUESTION_CORRECT
QUESTION_INCORRECT
QUESTION_UNANSWERED
ASSESSMENT_STARTED
ASSESSMENT_SUBMITTED
DIAGNOSTIC_COMPLETED
PRACTICE_COMPLETED
INTERVENTION_COMPLETED
COURSE_COMPLETED
```

Each evidence record should contain enough structured information to support later analysis.

The exact persistence schema follows `06-database-design.md`.

## 8.1 Evidence Example

Conceptual example:

```json
{
  "studentId": "...",
  "courseId": "...",
  "topicId": "...",
  "lessonId": "...",
  "eventType": "QUESTION_INCORRECT",
  "questionId": "...",
  "timestamp": "...",
  "metadata": {
    "attemptId": "...",
    "difficulty": "MEDIUM"
  }
}
```

Learning evidence is historical evidence. It should not be confused with a current mastery value.

---

# 9. Evidence Is Not Equal to Mastery

A single wrong answer does not mean:

```text
The learner does not know the topic.
```

Similarly, one correct answer does not prove:

```text
The learner has mastered the topic.
```

The engine must aggregate evidence.

```text
One incorrect answer
        ↓
Small negative signal

Repeated incorrect answers
        ↓
Stronger negative signal

Repeated correct answers
across varied questions
        ↓
Stronger positive evidence
```

---

# 10. Student Learning Model

The Student Learning Model is a **conceptual representation of the learner's current estimated state**.

Conceptually:

```text
Student Learning Model
├── Course State
│    ├── Progress
│    ├── Completion
│    └── Performance
│
├── Topic State
│    ├── Mastery
│    ├── Confidence (when reliable evidence exists)
│    ├── Trend
│    └── Evidence Summary
│
├── Strengths
├── Weaknesses
├── Knowledge Gaps
├── Recommendations
└── Intervention History
```

This does **not** imply that all of these fields must be stored in one MongoDB document.

The approved database design separates historical evidence from derived/current state. The exact persistence model follows `06-database-design.md`.

---

# 11. Topic Mastery

Topic mastery is an estimate, not an absolute claim of knowledge.

Initial interpretation categories:

```text
0–39    Weak
40–59   Developing
60–74   Functional
75–89   Strong
90–100  Mastered
```

These are initial design values and can be tuned using evaluation data.

## 11.1 Mastery Categories vs Intervention Thresholds

The mastery categories above describe estimated mastery.

Intervention thresholds serve a different purpose:

```text
Mastery below 60%
    ↓
Weakness candidate

Mastery below 50%
    ↓
Prioritize review / remediation

Mastery 50–70%
    ↓
Prioritize targeted practice

Mastery above 70%
    ↓
Generally continue unless other evidence indicates a weakness
```

These intervention thresholds must not be interpreted as additional mastery categories.

---

# 12. Mastery Calculation Principle

The MVP should use a transparent weighted model.

Conceptually:

```text
Mastery =
Performance
+
Consistency
+
Recency
+
Difficulty
+
Coverage
+
Assessment Evidence
```

The system must not simply use:

```text
lastQuizPercentage
```

as mastery.

Exact weights are intentionally not finalized in this document. They should be configurable, tested, and tuned using evaluation data.

Do not scatter arbitrary constants throughout the codebase.

---

# 13. Mastery Evidence Signals

## 13.1 Performance

Potential signals:

```text
Correct responses
Incorrect responses
Unanswered responses
Assessment score
Practice score
```

Repeated performance should provide stronger evidence than an isolated event.

## 13.2 Unanswered Questions

Unanswered questions are meaningful evidence.

They may indicate:

```text
Knowledge gap
Low confidence
Time pressure
Poor recall
Difficulty with application
```

Therefore:

```text
UNANSWERED ≠ IGNORED
```

The engine must distinguish:

```text
CORRECT
INCORRECT
UNANSWERED
```

## 13.3 Difficulty

Difficulty can affect evidence strength.

Conceptually:

```text
Easy correct   → positive evidence
Medium correct → stronger positive evidence
Hard correct   → stronger evidence
```

Difficulty must not unfairly reward guessing.

## 13.4 Coverage

The engine should consider how much of a topic has been sampled.

For example:

```text
2/2 correct
```

provides weaker evidence of broad mastery than:

```text
18/20 correct
```

across multiple concepts.

## 13.5 Consistency

Performance should be evaluated across multiple attempts and time periods.

Example:

```text
45%
62%
81%
```

suggests improvement.

But:

```text
90%
40%
```

suggests unstable understanding.

## 13.6 Recency

Recent evidence should usually carry more influence than very old evidence.

Old evidence should not simply disappear because it can still help identify:

```text
Recent improvement
Knowledge decay
Instability
```

---

# 14. Confidence

Mastery and confidence are different concepts.

Example:

```text
Mastery = 80
Confidence = 45
```

may indicate strong performance with limited confidence or evidence coverage.

Another example:

```text
Mastery = 55
Confidence = 90
```

may indicate that the learner believes they understand the topic while performance evidence disagrees.

Confidence can be used as a supplementary signal when reliable confidence evidence exists. It is not equivalent to mastery and does not override performance evidence.

---

# 15. Strength Detection

A topic may be classified as a strength when:

```text
Mastery is high
+
Recent performance is stable
+
Evidence coverage is sufficient
```

Example:

```text
SQL SELECT queries

Mastery = 91
Recent performance = strong
Coverage = sufficient
```

Result:

```text
Strength:
SQL SELECT queries
```

The system should allow future evidence to change this classification.

---

# 16. Weakness Detection

A topic may become a weakness candidate when meaningful evidence crosses a threshold.

Possible signals:

```text
Mastery below threshold
Repeated incorrect responses
High unanswered rate
Declining trend
Failed assessment
Prerequisite weakness
```

The system should avoid declaring a weakness from a single isolated mistake.

MVP weakness detection should use a minimum evidence requirement where practical.

---

# 17. Knowledge Gaps and Error Patterns

A knowledge gap is more specific than a general weakness.

Example:

```text
Topic:
Normalization

General mastery:
68%

Specific gap:
Transitive dependency
```

Repeated errors can be mapped to a knowledge gap when question metadata identifies the relevant topic/concept.

Example:

```text
Question 1 → Incorrect
Question 4 → Incorrect
Question 8 → Incorrect

All involve:
LEFT JOIN vs INNER JOIN
```

Potential inference:

```text
SQL JOIN semantics may be a knowledge gap.
```

This inference should primarily use structured question-topic/concept metadata, not an unsupported AI guess.

---

# 18. Learning Trend

The model may classify learning trends as:

```text
IMPROVING
STABLE
DECLINING
INSUFFICIENT_DATA
```

Example:

```text
40%
52%
63%
76%

Trend = IMPROVING
```

Trend should be treated as an additional signal rather than a replacement for mastery.

---

# 19. Course Progress vs Mastery

Course completion and understanding are different.

Example:

```text
Course Progress = 90%
Mastery = 55%
```

The learner completed most of the course but struggled with assessments.

Conversely:

```text
Course Progress = 40%
Mastery of completed topics = 90%
```

The learner is performing strongly on the material already studied.

The engine must never confuse completion with understanding.

---

# 20. Cold Start and Onboarding Signals

A new learner has limited learning evidence.

Therefore the system cannot immediately know their:

```text
Strengths
Weaknesses
Mastery
Observed learning behavior
```

The MVP uses:

```text
Onboarding
+
Diagnostic assessment where configured
+
Early learning evidence
```

Finalized onboarding signals include:

```text
Interests
Learning goals
Experience level
Daily study capacity
Preferred learning format
```

These are initial signals, not permanent truths.

Observed learning behavior should gradually provide stronger evidence where appropriate.

---

# 21. Shared Learning Taxonomy

Learner interests and instructor expertise use the approved shared learning domains:

```text
Programming & Software Development
Data Science & Artificial Intelligence
Mathematics & Statistics
Business & Entrepreneurship
Finance & Economics
Science & Technology
```

This taxonomy can later connect:

```text
Learner Interest
      ↓
Instructor Expertise
      ↓
Course Domain
      ↓
Recommendation / Discovery
```

The taxonomy is a relevance signal and does not permanently restrict discovery.

---

# 22. Diagnostic and Prerequisite Personalization

Prerequisites and diagnostics are governed by deterministic course/teacher rules.

A teacher may configure:

```text
Prerequisite required
Diagnostic required
Minimum eligibility threshold
```

Example:

```text
Advanced SQL
      ↓
Diagnostic required
      ↓
Score = 58%
      ↓
Not eligible
      ↓
Identify prerequisite weakness
      ↓
Recommend Basic SQL / targeted remediation
```

If a prerequisite was completed long ago but current evidence is weak, targeted review may be more appropriate than repeating the entire course.

Hard eligibility constraints always take priority over ordinary recommendations.

---

# 23. Recommendation Engine

The recommendation engine transforms learning state into candidate actions.

Example:

```text
Weak Topic
    ↓
Candidate Actions
    ├── Review lesson
    ├── Read approved notes
    ├── Watch approved resource
    ├── Practice questions
    └── Take mini-assessment
```

The engine should generate candidates first, then select and rank appropriate actions.

---

# 24. Recommendation Types

Initial recommendation types:

```text
COURSE_RECOMMENDATION
TOPIC_REVIEW
LESSON_REVIEW
RESOURCE_RECOMMENDATION
PRACTICE_RECOMMENDATION
ASSESSMENT_RETRY
PREREQUISITE_RECOMMENDATION
COURSE_CONTINUATION
```

Future recommendation capabilities may include:

```text
STUDY_PLAN
SPACED_REVIEW
DIFFICULTY_ADJUSTMENT
LEARNING_STRATEGY
```

These future capabilities remain subject to the scope defined in `15-future-implementation.md`.

---

# 25. Candidate Generation and Ranking

Candidate generation should consider relevant learning context.

Conceptual ranking signals include:

```text
Immediate learning need
Prerequisite importance
Mastery gap
Recent performance
Course progression
Learning goals
Interests
Student context
Previous recommendation response
```

The MVP should keep the ranking logic transparent.

Exact production ranking formulas are intentionally not finalized.

Course popularity is not a primary MVP personalization signal. Broader discovery may use separate discovery/ranking logic.

---

# 26. Next Best Action

The engine should identify one primary next action rather than overwhelming the learner with many recommendations.

Example:

```text
Student opens dashboard
        ↓
Next Best Action:
"Review SQL JOINs"
```

The frontend presents the result; it does not calculate the recommendation itself.

A small number of secondary recommendations may be presented where useful.

---

# 27. Recommendation Priority

The MVP should generally prioritize:

```text
1. Blocking prerequisite
2. Required current-course action
3. Immediate weakness remediation
4. Assessment preparation
5. Course continuation
6. Broader course discovery
```

This keeps personalization aligned with the learner's current goal.

---

# 28. Personalization Intervention Selection Policy

The engine must not simply move through:

```text
Course → Topic → Lesson → Resource → Practice → Assessment
```

in a fixed sequence.

Instead:

> **The engine selects the most specific intervention supported by available evidence, beginning with the smallest useful intervention and escalating only when subsequent evidence shows that the intervention was insufficient. Hard prerequisite constraints take priority over ordinary recommendations.**

## 28.1 Hard Constraints Have Priority

Examples:

```text
Missing prerequisite
Diagnostic required
Diagnostic below threshold
Lesson assessment not passed
Course eligibility not satisfied
```

These are deterministic platform/curriculum decisions.

AI cannot override them.

## 28.2 Strongest Need

After hard constraints are resolved, the engine identifies the strongest meaningful learning need.

## 28.3 Most Specific Useful Target

The engine should choose the most specific useful target.

Example:

```text
Normalization weak
      ↓
Specific weakness = Transitive Dependency
      ↓
Lesson 7 contains the concept
      ↓
Recommend Lesson 7
```

Do not recommend the entire DBMS course when one lesson is sufficient.

## 28.4 Smallest Useful Intervention

Prefer the smallest intervention likely to solve the problem.

Example:

```text
Mastery = 72%
One recent mistake
      ↓
Small targeted practice
```

Do not unnecessarily force the learner to repeat an entire lesson.

---

# 29. Intervention Intensity

Personalization level and intervention intensity are separate concepts.

### Personalization Level — WHERE

```text
Course
Topic
Lesson
Resource
Practice
Assessment
```

### Intervention Intensity — HOW MUCH

```text
LOW
MEDIUM
HIGH
```

Example:

```text
Mastery = 72%
One recent mistake

→ Lesson/topic target
→ LOW intensity
→ Small practice set
```

Versus:

```text
Mastery = 38%
Repeated failures
Prerequisite weakness

→ HIGH intensity
→ Explanation + resource + practice + reassessment
```

---

# 30. Intervention Escalation

Intervention should escalate only when evidence indicates that the current intervention was insufficient.

Example:

```text
Weak Topic
    ↓
Review Lesson
    ↓
Practice
    ↓
Still weak
    ↓
Alternative Approved Resource
    ↓
Practice Again
    ↓
Improves
    ↓
Assessment
    ↓
Ready
```

The system should not repeat the exact same failed intervention indefinitely.

A persistent weakness may justify stronger remediation or prerequisite review.

---

# 31. Assessment as a Measurement Instrument

Assessment should generally measure readiness or improvement rather than serve as the default remediation mechanism.

Bad loop:

```text
FAIL
 ↓
Same Quiz
 ↓
FAIL
 ↓
Same Quiz
```

Preferred flow:

```text
FAIL
 ↓
Analyze evidence
 ↓
Identify weakness
 ↓
Lesson / Resource
 ↓
Targeted Practice
 ↓
New Question Set
 ↓
Mini-Assessment
 ↓
Re-evaluate
```

Retries should use the approved question-bank strategy and avoid identical question repetition indefinitely.

---

# 32. Recommendation vs Intervention

A recommendation is what the system presents.

An intervention is the learning action performed.

Example:

```text
Recommendation:
"Review Normalization Lesson 7"

Intervention:
Lesson review
```

This distinction allows the platform to evaluate both:

```text
What was recommended?
```

and:

```text
What did the learner actually do?
```

---

# 33. Recommendation Feedback and Effectiveness

Recommendation outcomes can eventually include:

```text
SHOWN
ACCEPTED
DISMISSED
STARTED
COMPLETED
IGNORED
IMPROVED
NO_IMPROVEMENT
```

These signals can help determine which interventions work.

For the MVP, implement only the tracking necessary for the approved recommendation/evidence workflow. More advanced feedback modeling is future work.

Effectiveness can be evaluated by comparing evidence before and after an intervention.

Example:

```text
Before:
Mastery = 48%

Intervention:
Lesson review + practice

After:
Mastery = 71%
```

If improvement is insufficient, the engine may escalate.

---

# 34. Avoiding Recommendation Loops and Duplicates

Bad behavior:

```text
Weak topic
 ↓
Recommend quiz
 ↓
Quiz fails
 ↓
Recommend same quiz
 ↓
Quiz fails
 ↓
Same quiz forever
```

The system should vary interventions when evidence indicates that the previous intervention was ineffective.

It should also avoid generating duplicate active recommendations unnecessarily.

Conceptually:

```text
Same learner
+
Same target
+
Same intervention
+
Recently shown
→ Avoid duplicate active recommendation
```

Recommendations may become stale when new evidence changes the learner state.

Example:

```text
Recommendation:
Review JOINs

Learner later scores 90%

→ Old recommendation is no longer primary
```

---

# 35. AI Personalization Role

AI may assist with:

```text
Personalized explanation
Recommendation wording
Learning-strategy suggestions
Alternative teaching approaches
Explanation of approved resources
Explanation of recommendation reasons
```

AI must not be the sole authority for:

```text
Pass/fail
Official score
Mastery storage
Lesson unlocking
Prerequisite eligibility
Enrollment authorization
Authorization
Teacher/curriculum constraints
```

The deterministic system remains authoritative.

---

# 36. AI Teaching Assistance

For a weak topic, AI can generate an explanation using approved course context.

Flow:

```text
Weak Topic
    ↓
Retrieve approved lesson context
    ↓
AI explanation request
    ↓
Structured output
    ↓
Validate
    ↓
Show learner
```

AI should not invent course facts when authoritative teacher content is available.

---

# 37. Retrieval-Grounded Learning

When AI explains a topic, preferred context is:

```text
Teacher-approved content
+
Course resources
+
Structured topic metadata
```

This reduces hallucination and keeps explanations aligned with the actual curriculum.

The exact embedding/vector-database architecture is intentionally not finalized for the MVP.

---

# 38. AI Resource Assistance

AI may help explain or rank already-approved resources.

Example:

```text
Weak topic:
Normalization

Available resources:
PDF
Approved video
Teacher notes
Practice set
```

AI can help explain which resource may suit the learner.

The backend still controls:

```text
Which resources exist
Which resources are approved
Which resources the learner can access
```

AI cannot invent resources or make unavailable content appear valid.

---

# 39. AI Service Boundary

AI functionality must be isolated behind a provider-neutral service abstraction.

Conceptually:

```text
AIService
├── generateExplanation()
├── generateLearningStrategy()
├── explainRecommendation()
└── rankApprovedResources()
```

The AI service must not directly modify:

```text
Enrollment
Mastery
Assessment score
Lesson unlock state
Authorization
Prerequisite eligibility
```

The exact LLM provider/model remains intentionally unresolved.

---

# 40. AI Validation and Safety

AI-generated output must be:

```text
Validated
Relevant
Bounded
Grounded
Explainable
```

AI must not invent:

```text
Student performance
Completed lessons
Scores
Resources
Teacher instructions
Prerequisites
Learning history
```

Structured AI output should be validated before it reaches the application/UI.

If validation fails, the system should use a deterministic fallback where appropriate.

---

# 41. Deterministic Rules and Fallback

Some decisions must remain deterministic.

Examples:

```text
If prerequisite diagnostic fails
    → prerequisite remediation

If lesson assessment is not passed
    → do not unlock next lesson

If topic mastery is below a meaningful threshold
    → remediation candidate

If prerequisite is missing
    → prerequisite recommendation
```

If AI is unavailable:

```text
AI unavailable
    ↓
Deterministic recommendation rules
    ↓
Useful next action
```

The platform must not become unusable because an AI provider fails.

---

# 42. AI Failure Handling

Potential failures include:

```text
Rate limit
Network failure
Provider outage
Timeout
Invalid output
Malformed response
Content safety failure
```

The system should fail gracefully.

```text
AI timeout/failure
      ↓
Stop or fail the AI enhancement
      ↓
Use deterministic fallback
      ↓
Continue core learning workflow
```

AI should never block a critical learning transaction indefinitely.

---

# 43. Event-Driven Personalization

Important learning events can trigger asynchronous personalization work.

Example:

```text
Assessment Submitted
        ↓
Persist Result
        ↓
Persist Learning Evidence
        ↓
Update Critical Learning State
        ↓
Publish / Queue Personalization Work
        ↓
Update Recommendations
```

The authoritative result must be persisted before asynchronous analysis depends on it.

---

# 44. Synchronous vs Asynchronous Processing

### Authoritative / synchronous where practical

```text
Assessment result
Question response
Required completion state
Critical progression state
Critical learning-state update
```

### Asynchronous

```text
Recommendation generation
AI explanation generation
Large analytics aggregation
Non-critical personalization enhancements
Notifications
Other expensive processing
```

This separation prevents AI or expensive analysis from blocking core learning workflows.

---

# 45. Personalization Consistency

The system should avoid contradictory states such as:

```text
Assessment = 80%

Recommendation:
"Your performance is 20%."
```

After an important learning event, authoritative learning state should be updated synchronously where practical.

AI-generated enhancements may arrive asynchronously.

When new evidence invalidates an old recommendation, the recommendation should be recalculated or marked stale according to the approved persistence model.

---

# 46. Personalization State

The personalization processing lifecycle can be understood conceptually as:

```text
NEW
 ↓
LEARNING
 ↓
EVIDENCE_AVAILABLE
 ↓
ANALYZING
 ↓
RECOMMENDATION_READY
 ↓
INTERVENTION
 ↓
REASSESSMENT
 ↓
IMPROVED / STILL_WEAK
```

This is a conceptual processing model, not a requirement to persist one giant learner state machine.

---

# 47. Personalization Module Boundary

Personalization logic must remain outside controllers.

Conceptual application-level operations include:

```text
processLearningEvidence()
calculateTopicMastery()
detectWeaknesses()
detectStrengths()
generateRecommendations()
selectNextBestAction()
createIntervention()
```

Controllers should coordinate requests and responses; they should not contain personalization algorithms.

A possible implementation structure is:

```text
personalization/
│
├── evidence
├── mastery
├── weakness
├── strengths
├── recommendations
├── interventions
├── rules
├── ai
└── analytics
```

The exact folder structure is an implementation detail and will be finalized during implementation.

---

# 48. Rule Engine Boundary

Rules should be centralized rather than scattered across controllers.

Examples:

```text
shouldUnlockNextLesson()
isPrerequisiteSatisfied()
shouldRecommendReview()
shouldEscalateIntervention()
```

Centralized rules improve:

```text
Testability
Reusability
Maintainability
Explainability
```

Hard platform/curriculum constraints must remain deterministic.

---

# 49. Personalization Hierarchy

The system follows this authority hierarchy:

```text
Platform Security
      ↓
Teacher / Curriculum Constraints
      ↓
Prerequisite Rules
      ↓
Student Learning State
      ↓
Deterministic Personalization
      ↓
AI Enhancement
      ↓
Presentation
```

Lower layers cannot override higher-priority constraints.

In particular:

```text
AI cannot override curriculum rules.
AI cannot override prerequisite rules.
AI cannot override authorization.
AI cannot rewrite authoritative learning state.
```

---

# 50. Teacher and Instructor Role

Instructors remain responsible for defining:

```text
Course content
Learning objectives
Prerequisites
Assessments
Question banks
Resources
Course structure
```

The personalization engine works within those boundaries.

It must not silently replace teacher-defined curriculum rules.

The MVP allows instructors to create and publish courses without mandatory Admin pre-approval. Admin remains responsible for platform governance and moderation and may intervene when content is reported or inappropriate.

Future teacher controls may include:

```text
Required resource
Minimum practice
Assessment threshold
Prerequisite
Recommended sequence
```

Personalization should optimize within those allowed boundaries.

---

# 51. Personalization and Course Progression

Once a learner is enrolled:

```text
Enrollment
   ↓
Lesson
   ↓
Practice
   ↓
Assessment
   ↓
Learning Evidence
   ↓
Mastery / Learning State
   ↓
Recommendation
```

The current course should generally receive priority over unrelated course recommendations when the learner has an immediate learning action available.

This does not permanently restrict broader discovery.

---

# 52. Personalization and Redis

Redis may support:

```text
Recommendation cache
Rate limiting
Background job queues
Temporary AI-related state
```

Redis must not become the permanent source of truth for:

```text
Mastery
Learning Evidence
Assessment Results
Other authoritative learning state
```

Cache invalidation should occur after important learning events where cached personalization becomes stale.

---

# 53. Personalization and MongoDB

MongoDB stores durable state such as:

```text
Learning Evidence
Topic Mastery
Recommendations
Interventions
Course relationships
Assessment results
```

The exact schemas and relationships follow `06-database-design.md`.

This document defines the personalization behavior, not the detailed MongoDB schema.

---

# 54. Personalization API Boundary

Personalization results are exposed through backend APIs.

Conceptual examples include:

```http
GET /api/v1/personalization/me/next-action
GET /api/v1/personalization/me/weaknesses
GET /api/v1/recommendations/me
```

The frontend consumes these results and does not calculate authoritative mastery, recommendations, eligibility, or unlocking.

The authoritative endpoint definitions remain in `07-api-design.md`.

---

# 55. Explainability and Auditability

Important recommendations should be explainable.

The system should be able to answer:

```text
Which evidence triggered this recommendation?
Which rule selected it?
Was AI used?
Which recommendation was shown?
What happened afterward?
```

Example:

```text
Recommendation:
Review Normalization

Evidence:
3 recent incorrect questions
Mastery = 52
Coverage = sufficient

Rules:
LOW_MASTERY
REPEATED_ERRORS
```

AI-generated explanations must not invent evidence.

---

# 56. Recommendation Confidence

Recommendations may have an internal confidence classification:

```text
HIGH
MEDIUM
LOW
```

When evidence is insufficient:

```text
INSUFFICIENT_DATA
```

The system should avoid presenting false certainty.

This confidence describes the recommendation/evidence quality; it is distinct from learner self-reported confidence.

---

# 57. Personalization Failure Modes

Potential failures include:

```text
Insufficient evidence
AI unavailable
Invalid AI output
Stale recommendation
Duplicate recommendation
Contradictory evidence
Incorrect question metadata
Missing topic mapping
Background job failure
```

The system should fail safely.

## 57.1 Insufficient Evidence

```text
Do not pretend certainty.
```

Example:

```text
Mastery:
INSUFFICIENT_DATA
```

Possible next action:

```text
Continue learning
or
Gather more evidence
```

## 57.2 Contradictory Evidence

Example:

```text
Old evidence:
80%

Recent evidence:
45%
```

The engine should consider:

```text
Recency
Difficulty
Coverage
Assessment quality
```

Rather than blindly averaging everything.

This may represent knowledge instability rather than simple mastery loss.

---

# 58. Personalization and Bias

Personalization must not permanently restrict learners based on historical performance.

Example:

```text
Learner previously performed poorly in mathematics
```

should not permanently prevent:

```text
Advanced mathematics recommendation
```

New evidence must be able to change the learner model.

Interests are relevance signals, not hard restrictions.

---

# 59. MVP Personalization Engine

The MVP should answer five questions:

```text
1. What is the learner learning?
2. What does the learner appear to know?
3. What does the learner struggle with?
4. What should the learner do next?
5. Did the intervention help?
```

## 59.1 MVP Signals

Initial signals:

```text
Assessment score
Question correctness
Unanswered questions
Question difficulty
Question/topic mapping
Lesson completion
Assessment attempts
Diagnostic result
Course progress
Recent performance
Prerequisites
```

Avoid adding too many speculative signals initially.

## 59.2 MVP Mastery

Use:

```text
Transparent weighted evidence
+
Performance
+
Recency
+
Consistency
+
Difficulty
+
Coverage
+
Assessment evidence
```

Exact weights remain configurable and subject to evaluation.

## 59.3 MVP Weakness

Create a weakness candidate when meaningful evidence supports it.

Possible triggers:

```text
Low mastery
Repeated incorrect concept
High unanswered rate
Declining trend
Failed assessment
Prerequisite weakness
```

Use sufficient evidence rather than a single isolated mistake.

## 59.4 MVP Recommendation Rules

Examples:

```text
Current lesson incomplete
→ Continue lesson

Current lesson complete + assessment pending
→ Take assessment

Assessment failed
→ Review relevant topic

Topic mastery low
→ Practice topic

Prerequisite missing
→ Learn prerequisite

Prerequisite diagnostic failed
→ Remediate prerequisite

Course completed
→ Recommend next relevant course
```

## 59.5 MVP Next-Best-Action Priority

```text
1. Blocking prerequisite
2. Required current-course action
3. Immediate weakness remediation
4. Assessment preparation
5. Course continuation
6. Broader course recommendation
```

## 59.6 MVP AI Responsibilities

AI initially focuses on:

```text
Personalized explanation
Recommendation wording
Learning-strategy suggestions
Approved-resource explanation
Alternative explanation style
```

AI does not control:

```text
Score
Mastery
Unlocking
Eligibility
Enrollment authorization
```

---

# 60. Personalization Processing Pipeline

The overall MVP pipeline is:

```text
Learning Event
      ↓
Validate Event
      ↓
Persist Learning Evidence
      ↓
Update Authoritative Learning State
      ↓
Evaluate Rules
      ↓
Generate Candidate Actions
      ↓
Rank / Select Candidate
      ↓
Optional AI Enhancement
      ↓
Validate AI Output
      ↓
Persist Recommendation
      ↓
Serve Next Action
      ↓
Observe Intervention Outcome
      ↓
Generate New Evidence
```

The pipeline should be deterministic where authority is required and asynchronous where expensive processing is appropriate.

---

# 61. Personalization Metrics

The platform should eventually evaluate:

```text
Recommendation acceptance rate
Recommendation completion rate
Post-intervention improvement
Mastery improvement
Repeated failure rate
Time to mastery
Course completion
Diagnostic improvement
```

Personalization quality can be evaluated using:

### Accuracy

Did the system identify the actual weakness?

### Relevance

Was the recommendation useful?

### Timing

Was it delivered at an appropriate time?

### Effectiveness

Did learning improve?

### Explainability

Can the recommendation be justified?

### Efficiency

Did it reduce unnecessary work?

---

# 62. Testing the Personalization Engine

Personalization tests should cover:

### Strong learner

```text
High performance
→ Continue
```

### Weak learner

```text
Low mastery
→ Remediation
```

### Improving learner

```text
Performance increasing
→ Reduce unnecessary intervention
```

### Declining learner

```text
Performance declining
→ Targeted review
```

### Insufficient evidence

```text
Few events
→ Insufficient-data state
```

### Prerequisite failure

```text
Diagnostic below threshold
→ Prerequisite recommendation
```

### AI failure

```text
AI unavailable
→ Deterministic fallback
```

### Explainability

For every important recommendation, tests should verify that the reason can be traced to actual evidence and deterministic rules.

The detailed testing strategy belongs to `12-testing-strategy.md`.

---

# 63. Example: DBMS Learner

Consider a learner studying:

```text
Course = DBMS
```

After several lessons:

```text
SQL basics      → 88%
ER modeling     → 81%
Normalization   → 52%
Transactions    → 76%
```

The system identifies:

```text
Strength:
SQL basics

Weakness:
Normalization
```

If the learner repeatedly performs poorly on:

```text
1NF
2NF
3NF
Functional dependencies
Transitive dependency
```

the structured question metadata may support:

```text
Knowledge gap:
Normalization dependency concepts
```

Candidate actions:

```text
Review Normalization Lesson
Watch approved Normalization Video
Read Teacher Notes
Practice 5 Questions
Take Mini Assessment
```

The deterministic engine may select:

```text
Review Lesson
+
Targeted Practice
```

AI may then produce a grounded explanation of why the learner is being asked to review the lesson.

After remediation:

```text
Practice = 80%
Mini assessment = 84%
```

and estimated mastery changes:

```text
52 → 71
```

The system should then move the learner forward rather than repeatedly recommending the same remediation.

---

# 64. Persistent Weakness Example

If the learner remains weak:

```text
52%
 ↓
Remediation
 ↓
55%
 ↓
Remediation
 ↓
51%
```

the engine may escalate to:

```text
Alternative explanation
+
Different approved resource
+
Prerequisite review
+
New targeted practice
+
Reassessment
```

The exact escalation should be evidence-driven rather than a fixed universal sequence.

---

# 65. Diagnostic Example — Advanced SQL

Teacher configuration:

```text
Prerequisite:
Basic SQL

Diagnostic:
Required

Threshold:
75%
```

Learner result:

```text
58%
```

System:

```text
Not eligible
    ↓
Identify weak concepts
    ↓
Check prerequisite history/evidence
    ↓
If prerequisite is missing:
    Recommend Basic SQL

If prerequisite exists but evidence is weak:
    Recommend targeted revision
```

After improvement:

```text
Mini assessment
    ↓
82%
    ↓
Re-evaluate diagnostic/readiness
    ↓
Eligible
```

Eligibility remains controlled by deterministic course rules.

---

# 66. Recommendation Example

Conceptual recommendation record:

```json
{
  "studentId": "...",
  "type": "TOPIC_REVIEW",
  "targetTopicId": "...",
  "reason": "Repeated errors in normalization questions",
  "priority": "HIGH",
  "source": {
    "rules": [
      "LOW_MASTERY",
      "REPEATED_ERRORS"
    ],
    "aiEnhanced": true
  }
}
```

The exact schema follows `06-database-design.md`.

---

# 67. Future Personalization Roadmap

## Phase 1 — MVP

```text
Rules
+
Transparent weighted mastery
+
Weakness detection
+
Basic recommendations
+
Basic AI explanations
```

## Phase 2

```text
Adaptive difficulty
+
Better question selection
+
Recommendation feedback
+
Improved analytics
```

## Phase 3

```text
Spaced repetition
+
Knowledge graph
+
Predictive mastery
+
Advanced learner modeling
```

## Phase 4

```text
Advanced adaptive learning
+
Personalized study plans
+
More sophisticated AI tutoring
+
Research / evaluation models
```

Advanced personalization should not be built before the MVP baseline is validated.

---

# 68. Scope Boundary

This document does not finalize:

- exact mastery formula weights
- exact machine-learning model
- exact LLM provider
- exact prompt templates
- exact embedding/vector database
- advanced knowledge graph
- adaptive testing algorithm
- spaced-repetition algorithm
- production recommendation ranking model
- complete AI evaluation framework

These should be introduced only when justified by the MVP and validated data.

Deferred capabilities must also remain consistent with `15-future-implementation.md`.

---

# 69. Final Personalization Principles

The platform follows:

```text
LEARN
  ↓
MEASURE
  ↓
UNDERSTAND
  ↓
IDENTIFY
  ↓
RECOMMEND
  ↓
INTERVENE
  ↓
REASSESS
  ↓
IMPROVE
```

The finalized principles are:

```text
1. Use learning evidence as the foundation.
2. Keep authoritative decisions deterministic.
3. Treat mastery as an estimate, not absolute truth.
4. Distinguish completion from understanding.
5. Use sufficient evidence before declaring weaknesses.
6. Respect hard prerequisite and curriculum constraints.
7. Select the most specific useful intervention.
8. Prefer the smallest effective intervention.
9. Use assessment primarily to measure readiness/improvement.
10. Avoid repeating failed interventions indefinitely.
11. Re-evaluate after meaningful intervention.
12. Keep AI behind a controlled backend abstraction.
13. Ground AI explanations in approved learning content.
14. Validate AI output before use.
15. Never let AI override authoritative learning state.
16. Provide deterministic fallback when AI is unavailable.
17. Keep personalization logic outside controllers.
18. Make important recommendations explainable and auditable.
19. Keep MVP personalization transparent and testable.
20. Add advanced intelligence only after validating the baseline.
```

> **The platform should not simply tell learners what course to take. It should continuously identify the smallest useful next action that helps them overcome their current learning difficulty and move forward confidently.**

AI makes the experience more adaptive and understandable, while deterministic application logic keeps the learning system reliable, testable, and explainable.
