# AI Based Personalized Learning Platform — Background Processing Design

## 1. Purpose

This document defines the asynchronous and background-processing architecture of the AI Based Personalized Learning Platform.

The platform contains operations that should not unnecessarily block user-facing HTTP requests, including:

- personalization recalculation
- recommendation generation
- AI-assisted processing
- notification delivery
- large question-bank imports
- PDF/Excel parsing
- analytics aggregation
- resource processing
- scheduled maintenance
- cache updates

The goal is to keep the application responsive while making background work reliable, observable, retryable, and scalable.

This document defines background-processing architecture and behavior. Detailed API definitions belong to `07-api-design.md`; security requirements belong to `08-security-authentication.md`; testing requirements belong to `12-testing-strategy.md`; deferred infrastructure decisions belong to `15-future-implementation.md`.

---

# 2. Core Principle

> **A user-facing request should perform only the work required to return a correct authoritative response; expensive, slow, retryable, external-service-dependent, or independent work should be processed asynchronously.**

Example:

```text
Student submits assessment
        ↓
API validates + scores attempt
        ↓
Persist authoritative result
        ↓
Persist learning evidence
        ↓
Queue downstream work
        ↓
Return response
        ↓
Workers update personalization
        ↓
Optional AI enhancement
        ↓
Update analytics / notifications
```

The learner should not have to wait for every downstream operation.

---

# 3. Recommended MVP Technology

The approved background-processing foundation is:

```text
Node.js
Express.js
MongoDB
Redis
BullMQ
```

Conceptually:

```text
Express API
     │
     ├── MongoDB
     │
     └── Redis
           │
           ▼
        BullMQ
           │
     ┌─────┴─────┐
     ▼           ▼
 Workers    Scheduled Jobs
```

Redis provides the infrastructure used by BullMQ for queue state and coordination.

MongoDB remains the durable source of truth for application data.

---

# 4. Redis and BullMQ Responsibilities

Redis may support:

- BullMQ queue infrastructure
- temporary/cache data
- rate limiting
- short-lived processing state

BullMQ provides the queue/job lifecycle:

```text
Create Job
    ↓
Store Job
    ↓
Worker Picks Job
    ↓
Process
    ↓
Complete / Retry / Fail
```

Redis must not become the authoritative source of:

```text
Assessment Results
Learning Evidence
Mastery
Enrollment
Course Ownership
User Identity
```

Those remain durable application state in MongoDB.

---

# 5. API and Worker Separation

The API process primarily handles:

```text
HTTP requests
Validation
Authorization
Synchronous business transactions
Response formatting
```

Workers handle:

```text
Long-running jobs
Retryable jobs
AI processing
Large parsing
Notifications
Analytics aggregation
Other expensive background work
```

The API and workers remain part of the same modular-monolith application architecture. They are separate execution processes, not separate microservices.

---

# 6. Synchronous vs Asynchronous Work

## 6.1 Synchronous

Use synchronous processing when the request cannot be meaningfully completed without the result and the operation is reasonably fast.

Examples:

```text
Login
Create course
Update profile
Enroll in course
Start assessment
Submit assessment
```

## 6.2 Asynchronous

Use background processing when work is:

- slow
- retryable
- independent after the core transaction
- external-service dependent
- resource intensive
- suitable for eventual consistency

Examples:

```text
Generate recommendation
Generate AI explanation
Send notification
Parse large PDF
Parse Excel question bank
Generate analytics aggregate
Process uploaded resource
Scheduled maintenance
```

The distinction is based on transaction requirements, not simply on whether an operation is technically capable of running in the background.

---

# 7. Critical Transaction Principle

Authoritative data must be persisted before downstream background work is relied upon.

Preferred:

```text
Submit Assessment
       ↓
Validate Attempt
       ↓
Calculate Score
       ↓
Persist Result
       ↓
Persist Learning Evidence
       ↓
Queue Downstream Work
       ↓
Return Response
```

The student's authoritative result must never depend on a worker successfully running.

If queue publishing fails after the authoritative transaction succeeds, the system should have a recovery/reconciliation path rather than undoing the student's result.

---

# 8. Background Job Categories

Initial logical queues:

```text
learning
personalization
ai
notifications
imports
```

Analytics and maintenance may initially share an appropriate low-priority queue when workload is small.

Queues should be split further only when actual workload, isolation, reliability, or scaling requirements justify it.

---

# 9. Learning Jobs

Potential jobs include:

```text
process-learning-event
update-learning-state
update-course-progress
update-topic-mastery
finalize-assessment-state
```

These jobs transform persisted learning evidence into updated derived learning state.

Authoritative assessment scoring remains part of the synchronous assessment workflow.

---

# 10. Personalization Jobs

Potential jobs include:

```text
recalculate-personalization
generate-recommendations
refresh-next-best-action
evaluate-intervention
```

These jobs should be driven by learning evidence and the current learner state.

They should follow the personalization rules defined in `09-ai-personalization-engine.md`.

---

# 11. AI Jobs

Potential jobs include:

```text
generate-personalized-explanation
generate-learning-strategy
rank-approved-resources
generate-recommendation-explanation
```

AI work should normally be asynchronous because external providers may be slow or temporarily unavailable.

AI workers must not become a dependency for authoritative learning transactions.

---

# 12. Notification Jobs

Potential jobs include:

```text
send-course-notification
send-enrollment-notification
send-assessment-result-notification
send-teacher-alert
```

Notification failure should generally not invalidate the learning transaction.

Notifications should be treated as downstream side effects.

---

# 13. Import Jobs

Potential jobs include:

```text
parse-question-file
validate-question-import
prepare-import-preview
process-resource-file
```

Large files should not be parsed inside normal HTTP requests when processing may take significant time.

The import workflow should validate the file, process it asynchronously, and provide the frontend with a job/import status.

---

# 14. Analytics and Maintenance Jobs

Analytics jobs may include:

```text
update-course-analytics
update-student-analytics
aggregate-topic-performance
aggregate-teacher-course-metrics
```

Maintenance jobs may include:

```text
cleanup-expired-data
cleanup-old-cache
remove-failed-temporary-files
reconcile-stale-state
```

These operations can usually tolerate eventual consistency.

---

# 15. Job Payload Design

Job payloads should be:

- small
- serializable
- explicit
- versionable
- sufficient to identify the work

Prefer:

```json
{
  "version": 1,
  "eventId": "event-id",
  "studentId": "student-id",
  "courseId": "course-id"
}
```

Avoid sending entire MongoDB documents or entire learner histories.

Workers should load current authoritative data from the appropriate application services/repositories.

Payloads should not contain secrets, raw authentication tokens, or unnecessary personal information.

---

# 16. Job Lifecycle

Conceptually:

```text
WAITING
   ↓
ACTIVE
   ↓
COMPLETED
```

or:

```text
WAITING
   ↓
ACTIVE
   ↓
FAILED
   ↓
RETRY
   ↓
ACTIVE
```

After retries are exhausted:

```text
FAILED
   ↓
Failed-job review / recovery handling
```

Exact BullMQ states and APIs must follow the installed version's official documentation.

---

# 17. Idempotency

A job may execute more than once because of:

- retries
- worker crashes
- duplicate job submission
- recovery
- operational errors

Therefore:

> **Background jobs should be idempotent whenever possible.**

Bad:

```text
Every execution:
mastery += 10
```

Better:

```text
Read authoritative evidence
       ↓
Recalculate mastery
       ↓
Persist calculated state
```

The preferred design is to derive current state from durable evidence rather than applying irreversible increments repeatedly.

---

# 18. Event IDs and Deduplication

Learning events should have unique identifiers.

Example:

```text
EVT_123
```

A worker can use the identifier to prevent incorrect duplicate processing.

For bursts of events, recalculation jobs may sometimes be coalesced:

```text
5 learning events
      ↓
1 latest-state recalculation
```

This is acceptable only when correctness is preserved and the final derived state reflects all relevant evidence.

Job deduplication should be used where practical, but correctness must not depend solely on queue-level deduplication.

---

# 19. Retry Strategy

Retry failures that may be temporary:

```text
Network failure
AI timeout
Temporary database connectivity
Notification provider outage
```

Do not repeatedly retry permanent failures:

```text
Invalid input
Invalid file
Unauthorized operation
Broken business rule
Malformed domain data
```

Retries should have bounded attempts and appropriate backoff.

---

# 20. Exponential Backoff

Temporary failures should generally use increasing delays:

```text
Attempt 1 → short delay
Attempt 2 → longer delay
Attempt 3 → longer delay
```

Exact BullMQ retry and backoff configuration will be finalized during implementation according to the installed version's official documentation.

---

# 21. Failed Jobs

Failed jobs must remain observable.

The system should support:

```text
Inspect failure
Understand error
Retry manually when safe
Remove permanently invalid job
Reconcile missing downstream state when possible
```

Failed jobs must not be silently discarded.

---

# 22. Worker Failure and Recovery

If a worker crashes:

```text
Worker crashes
      ↓
Job remains recoverable according to queue state
      ↓
Another worker can process it
```

Handlers must remain idempotent because recovery can result in reprocessing.

The application should not assume that a job executes exactly once.

---

# 23. Graceful Shutdown

Workers should:

```text
Receive shutdown signal
       ↓
Stop accepting new work
       ↓
Finish or safely release active jobs
       ↓
Close worker
       ↓
Close Redis connections
       ↓
Exit
```

Exact implementation should follow Node.js and BullMQ lifecycle guidance.

---

# 24. Worker Concurrency

Workers may process multiple jobs concurrently.

Concurrency must consider:

```text
CPU
Memory
Database load
External API limits
AI provider limits
Queue priority
```

More concurrency is not automatically better.

AI workers may require lower or independently configured concurrency because external provider limits and latency can dominate processing.

---

# 25. AI Worker Isolation

Recommended logical separation:

```text
Learning Worker
    ↓
Fast deterministic processing

AI Worker
    ↓
External AI calls
```

This prevents slow AI requests from blocking core learning processing.

AI workers should respect:

```text
Provider rate limits
Timeouts
Retries
Fallback behavior
Output validation
```

---

# 26. Personalization Processing Flow

The authoritative assessment result and learning evidence must be persisted before downstream personalization work is queued.

```text
Assessment Submitted
       ↓
Validate Attempt
       ↓
Calculate Score
       ↓
Persist Assessment Result
       ↓
Persist Learning Evidence
       ↓
Queue Personalization Work
       ↓
Return Assessment Response
       ↓
Worker
       ↓
Load Current Learning State
       ↓
Recalculate Mastery
       ↓
Detect Weakness / Strength
       ↓
Generate Candidate Actions
       ↓
Select Next Best Action
       ↓
Persist / Update Recommendation
       ↓
Optional AI Enhancement
```

Critical learning state that must be immediately authoritative should be updated synchronously where practical, while expensive enrichment can remain asynchronous.

---

# 27. AI Enhancement Flow

```text
Recommendation Candidate
       ↓
AI enhancement required?
       ↓
Retrieve approved context
       ↓
AI Worker
       ↓
Validate structured output
       ↓
Persist enhancement
       ↓
Serve enhanced recommendation
```

AI enhances a valid recommendation; it does not directly modify authoritative learning state.

If AI fails, the deterministic recommendation remains usable.

---

# 28. Assessment Submission

The assessment request should perform the authoritative work synchronously:

```text
Authenticate
    ↓
Authorize
    ↓
Validate Attempt
    ↓
Validate Submission
    ↓
Calculate Score
    ↓
Persist Result
    ↓
Persist Learning Evidence
    ↓
Queue Downstream Jobs
    ↓
Return Response
```

Background work may then:

```text
Update mastery
Update weaknesses/strengths
Generate recommendation
Generate AI explanation
Update analytics
Send notification if required
```

Duplicate assessment submissions must be controlled by the assessment/attempt domain and not delegated to background jobs.

---

# 29. Enrollment Processing

Enrollment is primarily synchronous:

```text
Validate learner
    ↓
Validate course
    ↓
Check eligibility
    ↓
Check prerequisites
    ↓
Create enrollment
    ↓
Return enrollment
```

Downstream work may include:

```text
Teacher notification
Analytics update
Recommendation refresh
```

Enrollment should not fail because a notification provider or optional analytics worker is unavailable.

---

# 30. Question Import Processing

The recommended workflow is:

```text
Instructor uploads Excel/PDF
        ↓
Authenticate + authorize
        ↓
Validate file type/size
        ↓
Store safely
        ↓
Create import record/job
        ↓
Return job/import identifier
        ↓
Worker parses
        ↓
Validate rows
        ↓
Normalize data
        ↓
Generate preview/result
        ↓
Instructor reviews
        ↓
Instructor approves
        ↓
Persist questions
```

Imported questions should not automatically become live assessment content without validation and instructor approval.

File-processing security requirements remain governed by `08-security-authentication.md`.

---

# 31. Job Status for Long Operations

For long-running work, the API should return an identifier rather than hold the HTTP connection open.

Conceptually:

```http
POST /imports
```

returns:

```text
jobId / importId
```

Then:

```http
GET /imports/:jobId
```

can provide status.

Possible application-level statuses:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
```

Exact API contracts belong to `07-api-design.md`.

---

# 32. Outbox Reliability Problem

There is a possible failure window:

```text
Database transaction succeeds
       ↓
Application crashes
       ↓
Queue job was never created
```

Therefore, queue publication must have a recovery strategy.

For the MVP:

```text
Reliable queue publishing
+
Reconciliation
```

may be sufficient.

For higher reliability, an outbox pattern can be introduced later.

---

# 33. Outbox Pattern

Conceptually:

```text
Database Transaction
 ├── Save business data
 └── Save outbox event
          ↓
Transaction commits
          ↓
Outbox Publisher
          ↓
Queue
          ↓
Worker
```

This reduces the chance of losing an event between database persistence and queue publication.

The outbox pattern is a future reliability enhancement unless implementation requirements justify introducing it earlier.

---

# 34. Reconciliation

A reconciliation job can detect inconsistent downstream state.

Example:

```text
Assessment result exists
BUT
personalization update missing
       ↓
Requeue processing
```

Other examples may include:

```text
Persisted evidence without derived-state update
Completed import without expected processing result
Missing analytics update
Stale recommendation after important learning evidence
```

Reconciliation should be safe and idempotent.

---

# 35. Eventual Consistency

Background processing creates short periods of eventual consistency.

Example:

```text
Learner submits assessment
       ↓
Score immediately visible
       ↓
Mastery recalculation
       ↓
Recommendation update
```

The frontend should communicate processing state when appropriate without pretending that a recommendation is already available.

Authoritative assessment results should not be hidden behind eventual-consistency delays.

---

# 36. Background Processing and AI Data Security

AI jobs should preferably contain references:

```text
studentId
topicId
recommendationId
```

rather than entire learner records.

Before sending context to an external AI provider:

```text
Load relevant data
      ↓
Remove unnecessary fields
      ↓
Remove secrets
      ↓
Remove unrelated personal information
      ↓
Construct controlled context
      ↓
Send to AI
```

AI output must be parsed and validated before persistence or presentation.

---

# 37. Worker Service Boundaries

Workers should invoke existing application/domain services rather than duplicating business logic.

Preferred:

```text
Controller
   ↓
Application / Domain Service
```

and:

```text
Worker
   ↓
Same Application / Domain Service
```

This keeps business rules consistent across synchronous and asynchronous flows.

Workers should coordinate jobs, not become an alternative location for scattered business logic.

---

# 38. Suggested Project Organization

The exact project structure will be finalized during implementation, but a logical organization may look like:

```text
src/

├── modules/
│   ├── learning/
│   ├── personalization/
│   ├── courses/
│   ├── assessments/
│   └── notifications/
│
├── jobs/
│   ├── definitions/
│   └── producers/
│
├── queues/
│   ├── learning.queue.js
│   ├── personalization.queue.js
│   ├── ai.queue.js
│   ├── notifications.queue.js
│   └── imports.queue.js
│
└── workers/
    ├── learning.worker.js
    ├── personalization.worker.js
    ├── ai.worker.js
    ├── notifications.worker.js
    └── imports.worker.js
```

This is a logical guide, not a requirement to create every file immediately.

The existing modular-monolith conventions remain the source of truth for actual module placement.

---

# 39. Modular Monolith Compatibility

Background workers do not require microservices.

The initial architecture remains a modular monolith:

```text
                 APPLICATION
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   Auth Module   Learning Module  Course Module
       │              │              │
       └──────────────┼──────────────┘
                      │
                 Queue Layer
                      │
            ┌─────────┼─────────┐
            ▼         ▼         ▼
          Worker    Worker    Worker
```

Workers may run as separate Node.js processes while sharing the same application modules and infrastructure.

Microservices should be considered only when actual scale or organizational requirements justify them.

---

# 40. Queue Isolation and Scaling

API and workers can scale independently.

Conceptually:

```text
API instances
      ↓
Redis / BullMQ
      ↓
Worker pools
```

For example:

```text
API workers
AI workers
Import workers
```

may have different concurrency requirements.

One overloaded queue should not unnecessarily prevent critical learning work from running.

Dedicated queue/worker pools can be introduced when real workload requires stronger isolation.

---

# 41. Critical vs Non-Critical Jobs

### Critical

```text
Learning-state update
Assessment-related reconciliation
Required domain consistency
```

### Important

```text
Recommendation refresh
```

### Non-critical

```text
Optional AI explanation
Analytics aggregation
Notifications
```

This classification helps prioritize worker resources and failure handling.

A critical background job may be required for eventual consistency of derived learning state, but the original authoritative transaction must still be durable independently.

---

# 42. Observability

Background processing should record:

```text
Job name
Job ID
Queue
Attempt number
Duration
Status
Error
Created time
Started time
Completed time
```

Correlation IDs should connect:

```text
HTTP Request
    ↓
Assessment / Domain Operation
    ↓
Learning Event
    ↓
Background Job
```

Example:

```text
REQ_123
ATT_456
EVT_789
JOB_111
```

Never log:

```text
Passwords
Authentication tokens
API keys
Secrets
Unnecessary sensitive learner information
```

Logs should support debugging without becoming a source of sensitive-data leakage.

---

# 43. Metrics

Useful background-processing metrics include:

```text
Queue depth
Job success rate
Job failure rate
Retry rate
Average processing duration
Maximum processing duration
AI latency
AI failure rate
Import processing time
Stalled jobs
```

These metrics help identify bottlenecks and reliability problems.

---

# 44. Security

Workers must validate job payloads even when jobs originate from trusted application code.

Protect:

```text
Redis
MongoDB
Temporary files
AI credentials
External service credentials
```

Workers should use least-privilege access where practical.

Background workers are part of the application security boundary and must not be treated as inherently trusted simply because they are internal processes.

---

# 45. Anti-Patterns

## 45.1 Unmanaged Background Promises

Avoid:

```js
app.post("/assessment", async (req, res) => {
    await saveResult();
    generateAIRecommendation();
    res.json(...);
});
```

The unawaited operation has no durable retry, observability, or reliable recovery mechanism.

Use a queue instead.

## 45.2 Giant Worker

Do not put all business logic directly into workers.

Workers should call application/domain services.

## 45.3 AI for Authoritative Decisions

Do not use AI for:

```text
Score
Unlock
Authorization
Eligibility
Official mastery state
```

## 45.4 Infinite Retries

Every retryable job needs bounded attempts.

## 45.5 Giant Generic Queue

Avoid turning one `background` queue into an unstructured collection of unrelated jobs.

## 45.6 Large Job Payloads

Do not serialize entire database documents into queue messages.

---

# 46. Local Development

Local development should support:

```text
Node.js API
MongoDB
Redis
BullMQ workers
React frontend
```

The API and workers may initially run as separate processes.

Conceptually:

```text
npm run dev
npm run worker
```

Exact scripts will be defined during implementation.

---

# 47. Production Process Model

Production may run API and workers separately:

```text
              Load Balancer
                    │
             ┌──────┴──────┐
             ▼             ▼
          API #1          API #2
             │             │
             └──────┬──────┘
                    │
                  Redis
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Worker #1 Worker #2 Worker #3
```

This allows API and worker capacity to scale independently.

---

# 48. Graceful Deployment

Deployment should account for active workers:

```text
Stop accepting new work
       ↓
Finish or safely release active jobs
       ↓
Deploy
       ↓
Restart workers
       ↓
Resume processing
```

Queue-backed processing is safer than unmanaged background promises because unfinished work remains represented by durable queue state.

---

# 49. Testing Background Jobs

Each worker should be testable independently.

Test:

```text
Valid job
    ↓
Expected result
```

Also test:

```text
Invalid payload
Duplicate job
Retry
Permanent failure
External provider failure
Timeout
Worker restart
```

Idempotency must be explicitly tested.

Testing should also verify that:

```text
Authoritative transaction succeeds
even when downstream worker processing fails
```

The detailed testing strategy belongs to `12-testing-strategy.md`.

---

# 50. MVP Queue Strategy

Start with a small number of queues:

```text
learning
personalization
ai
notifications
imports
```

Analytics and maintenance may initially share an appropriate low-priority queue if operationally simpler.

Split queues further only when real workload, priority, isolation, or reliability requirements justify it.

---

# 51. MVP Background Jobs

Initial important jobs:

```text
update-learning-state
update-mastery
generate-recommendations
generate-ai-explanation
send-notification
parse-question-import
update-course-analytics
```

Not every future background job needs to exist on day one.

Assessment scoring itself remains synchronous and authoritative.

---

# 52. Failure Policies

Every background job should define:

```text
Trigger
Payload
Expected result
Retry policy
Backoff policy
Failure behavior
Fallback
Idempotency strategy
Priority
Observability
```

Examples:

### Recommendation

```text
Retry: yes
Fallback: deterministic rules
User transaction affected: no
```

### AI explanation

```text
Retry: limited
Fallback: deterministic recommendation/explanation
User transaction affected: no
```

### Question import

```text
Retry: infrastructure failures only
Fallback: mark import failed
```

### Assessment result

```text
Synchronous
Must not depend on worker
```

---

# 53. End-to-End Personalization Example

```text
Learner submits DBMS assessment
          ↓
API scores assessment
          ↓
Result persisted
          ↓
Learning evidence persisted
          ↓
Response returned
          ↓
Queue: update-mastery
          ↓
Worker updates mastery
          ↓
Normalization = 52%
          ↓
Queue / processing: generate-recommendation
          ↓
Recommendation:
Review Normalization
          ↓
Optional AI job
          ↓
AI generates explanation
          ↓
Output validated
          ↓
Dashboard displays recommendation
```

The AI explanation is an enhancement; the recommendation decision remains governed by deterministic personalization logic.

---

# 54. End-to-End Failure Example

```text
Assessment submitted
       ↓
Result saved
       ↓
Learning evidence saved
       ↓
Personalization job
       ↓
AI provider unavailable
       ↓
Retry
       ↓
Still unavailable
       ↓
Deterministic recommendation
       ↓
Learner continues learning
```

The core learning workflow remains available.

---

# 55. Background Processing Checklist

```text
[ ] Redis configured
[ ] BullMQ configured
[ ] Worker process created
[ ] Queue abstraction created
[ ] Job payload validation
[ ] Retry strategy
[ ] Backoff strategy
[ ] Failed-job visibility
[ ] Graceful worker shutdown
[ ] Structured worker logging
[ ] Correlation IDs
[ ] Learning-state job
[ ] Personalization job
[ ] AI job
[ ] Notification job
[ ] Import job
[ ] Basic monitoring
[ ] Idempotency tests
[ ] Reconciliation path
```

These are implementation checkpoints, not a requirement to implement every capability before the surrounding MVP domain is ready.

---

# 56. Future Enhancements

Later versions may introduce:

```text
Outbox pattern
Advanced job deduplication
Dedicated worker pools
Autoscaling
Distributed tracing
Dead-letter workflows
Circuit breakers
Advanced queue monitoring
Event replay
Priority scheduling
Workflow orchestration
```

These should be introduced only when justified by actual workload, reliability requirements, or operational needs.

---

# 57. Scope Boundary

This document does not yet finalize:

- exact BullMQ version/configuration
- exact Redis deployment
- exact worker hosting
- exact queue concurrency
- exact retry counts for every job
- exact outbox implementation
- exact observability platform
- autoscaling infrastructure

These will be finalized during implementation and deployment using current official documentation.

---

# 58. Final Architecture Principle

The final background-processing philosophy is:

```text
FAST USER REQUEST
        ↓
AUTHORITATIVE TRANSACTION
        ↓
QUEUE
        ↓
RELIABLE WORKER
        ↓
RETRY / FALLBACK / RECOVERY
        ↓
UPDATED DERIVED STATE
```

The most important rule is:

> **Never make the learner's core learning transaction depend unnecessarily on slow or failure-prone asynchronous work. Persist the authoritative result first, then process enrichment, personalization, AI, analytics, and notifications through reliable background jobs.**

Background processing should improve responsiveness and scalability without weakening the authority, consistency, security, or explainability of the learning platform.
