# AI Based Personalized Learning Platform — Background Processing Design

## 1. Purpose

This document defines the asynchronous and background-processing architecture of the AI Based Personalized Learning Platform.

The platform contains operations that should not block a user's HTTP request, including:

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

---

## 2. Core Principle

> **A user-facing request should perform only the work required to return a correct response; expensive, slow, retryable, or independent work should be processed asynchronously.**

Example:

```text
Student submits quiz
       ↓
API validates + scores attempt
       ↓
Save authoritative result
       ↓
Return response
       ↓
Publish background job
       ↓
Update mastery
       ↓
Generate recommendation
       ↓
Generate AI explanation if required
```

The student should not have to wait for every downstream operation.

---

## 3. Recommended Technology

The MVP architecture uses:

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
 Workers       Scheduled Jobs
```

Redis provides the infrastructure used by BullMQ for queue state and coordination.

---

## 4. Redis and BullMQ Responsibilities

Redis may support:

- queue infrastructure
- temporary/cache data
- rate limiting
- short-lived processing state

BullMQ provides:

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

- assessment results
- learning evidence
- mastery
- enrollment
- course ownership
- user identity

MongoDB remains the durable source of truth for application data.

---

## 5. API and Worker Separation

The API process primarily handles:

```text
HTTP requests
validation
authorization
synchronous business transactions
response formatting
```

Workers handle:

```text
long-running jobs
retryable jobs
AI processing
large parsing
notifications
analytics aggregation
```

This separation improves reliability and scaling.

---

## 6. Synchronous vs Asynchronous Work

### Synchronous

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

### Asynchronous

Use background processing when work is slow, retryable, independent after the core transaction, external-service dependent, or resource intensive.

Examples:

```text
Generate recommendation
Generate AI explanation
Send notification
Parse large PDF
Parse Excel question bank
Generate analytics aggregate
Process uploaded resource
```

---

## 7. Critical Transaction Principle

Authoritative data must be persisted before downstream background work is relied upon.

Preferred:

```text
Submit Assessment
       ↓
Validate attempt
       ↓
Calculate score
       ↓
Persist result
       ↓
Commit successful transaction
       ↓
Queue personalization job
```

Never make the student's authoritative result depend on a worker successfully running.

---

## 8. Background Job Categories

Initial logical queues:

```text
learning
personalization
ai
notifications
imports
analytics
maintenance
```

The MVP may combine low-volume categories when practical and split them later as workload grows.

---

## 9. Learning Jobs

Potential jobs:

```text
process-learning-event
update-course-progress
update-topic-mastery
finalize-assessment-state
```

These jobs transform learning evidence into updated learning state.

---

## 10. Personalization Jobs

Potential jobs:

```text
recalculate-personalization
generate-recommendations
refresh-next-best-action
evaluate-intervention
```

These jobs should be driven by learning evidence.

---

## 11. AI Jobs

Potential jobs:

```text
generate-personalized-explanation
generate-learning-strategy
rank-approved-resources
generate-recommendation-explanation
```

AI work should normally be asynchronous because external providers may be slow or temporarily unavailable.

---

## 12. Notification Jobs

Potential jobs:

```text
send-course-notification
send-enrollment-notification
send-assessment-result-notification
send-teacher-alert
```

Notification failure should generally not invalidate the learning transaction.

---

## 13. Import Jobs

Potential jobs:

```text
parse-question-file
validate-question-import
prepare-import-preview
process-resource-file
```

Large files should not be parsed inside normal HTTP requests when processing may take significant time.

---

## 14. Analytics and Maintenance Jobs

Analytics:

```text
update-course-analytics
update-student-analytics
aggregate-topic-performance
aggregate-teacher-course-metrics
```

Maintenance:

```text
cleanup-expired-data
cleanup-old-cache
remove-failed-temporary-files
reconcile-stale-state
```

These can usually tolerate eventual consistency.

---

## 15. Job Payload Design

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

Avoid sending entire MongoDB documents or the entire learner history.

Workers should retrieve current authoritative data.

---

## 16. Job Lifecycle

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
FAILED-JOB REVIEW / DEAD-LETTER HANDLING
```

Exact BullMQ states and APIs must follow the installed version's official documentation.

---

## 17. Idempotency

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

---

## 18. Event IDs and Deduplication

Learning events should have unique identifiers.

Example:

```text
EVT_123
```

A worker can use the identifier to prevent incorrect duplicate processing.

For bursts of events, some recalculation jobs may be coalesced:

```text
5 learning events
      ↓
1 latest-state recalculation
```

only when correctness is preserved.

---

## 19. Retry Strategy

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
```

Retries should have bounded attempts and appropriate backoff.

---

## 20. Exponential Backoff

Temporary external failures should generally use increasing delays:

```text
Attempt 1 → short delay
Attempt 2 → longer delay
Attempt 3 → longer delay
```

Exact BullMQ retry/backoff configuration should follow current official documentation.

---

## 21. Failed Jobs

Failed jobs must remain observable.

The system should support:

```text
Inspect failure
Understand error
Retry manually when safe
Remove permanently invalid job
```

Do not silently discard failed jobs.

---

## 22. Worker Failure and Recovery

If a worker crashes:

```text
Worker crashes
      ↓
Job remains recoverable
      ↓
Another worker can process it
```

Handlers must remain idempotent because recovery can result in reprocessing.

---

## 23. Graceful Shutdown

Workers should:

```text
Receive shutdown signal
       ↓
Stop accepting new work
       ↓
Finish safe active jobs
       ↓
Close worker
       ↓
Close Redis connections
       ↓
Exit
```

Exact implementation should follow Node.js and BullMQ lifecycle guidance.

---

## 24. Worker Concurrency

Workers may process multiple jobs concurrently.

Concurrency must consider:

```text
CPU
memory
database load
external API limits
AI provider limits
```

More concurrency is not automatically better.

AI workers may require separate concurrency limits.

---

## 25. AI Worker Isolation

Recommended:

```text
Learning Worker
    ↓
Fast deterministic processing

AI Worker
    ↓
External AI calls
```

This prevents slow AI requests from blocking core learning processing.

AI workers should respect provider rate limits, timeouts, retries, and fallback behavior.

---

## 26. Personalization Processing Flow

The authoritative assessment result and learning evidence must be
persisted before downstream personalization work is queued.

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
Queue Personalization Job
       ↓
Return Assessment Response
       ↓
Worker
       ↓
Load Current Learning State
       ↓
Recalculate Mastery
       ↓
Detect Weakness
       ↓
Generate Candidate Actions
       ↓
Persist / Update Recommendation
       ↓
Optional AI Enhancement
```

---

## 27. AI Enhancement Flow

```text
Recommendation Candidate
       ↓
AI enhancement required?
       ↓
Retrieve approved context
       ↓
AI worker
       ↓
Validate structured output
       ↓
Persist enhancement
```

AI enhances a valid recommendation; it does not directly modify authoritative learning state.

---

## 28. Assessment Submission

Synchronous:

```text
Authenticate
   ↓
Authorize
   ↓
Validate attempt
   ↓
Validate submission
   ↓
Score
   ↓
Persist result
   ↓
Create learning evidence
   ↓
Queue downstream jobs
   ↓
Return response
```

Asynchronous:

```text
Update mastery
Update weaknesses
Generate recommendation
Generate AI explanation
Update analytics
Send notification if required
```

---

## 29. Enrollment Processing

Synchronous:

```text
Validate student
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

Asynchronous:

```text
Teacher notification
Analytics update
Recommendation refresh
```

Enrollment should not fail because a notification provider is unavailable.

---

## 30. Question Import Processing

```text
Teacher uploads Excel/PDF
        ↓
Authenticate + authorize
        ↓
Validate file type/size
        ↓
Store safely
        ↓
Create import job
        ↓
Return job ID
        ↓
Worker parses
        ↓
Validate rows
        ↓
Normalize data
        ↓
Generate preview
        ↓
Teacher reviews
        ↓
Teacher approves
        ↓
Persist questions
```

Imported questions should not automatically become live assessment content without validation and teacher approval.

---

## 31. Job Status for Long Operations

For long-running work:

```text
POST /imports
      ↓
jobId
      ↓
GET /imports/:jobId
```

Possible status values:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
```

This is preferable to holding an HTTP connection open.

---

## 32. Outbox Reliability Problem

There is a possible failure:

```text
Database transaction succeeds
      ↓
Application crashes
      ↓
Queue job was never created
```

For MVP, controlled queue publishing plus reconciliation may be sufficient.

For higher reliability, an outbox pattern can be introduced.

---

## 33. Outbox Pattern

```text
Database Transaction
 ├── Save business data
 └── Save outbox event
          ↓
Transaction commits
          ↓
Outbox publisher
          ↓
Queue
          ↓
Worker
```

This reduces the chance of losing an event between database persistence and queue publication.

Recommended approach:

```text
MVP:
Simple reliable queue publishing + reconciliation

Later:
Outbox pattern when event reliability requirements justify it
```

---

## 34. Reconciliation

A reconciliation job can detect inconsistent downstream state.

Example:

```text
Assessment result exists
BUT
personalization update missing
        ↓
Requeue processing
```

This provides an additional reliability mechanism.

---

## 35. Eventual Consistency

Background processing creates short periods of eventual consistency.

Example:

```text
Student submits assessment
      ↓
Score immediately visible
      ↓
Mastery recalculation
      ↓
Recommendation updates shortly afterward
```

The frontend should communicate processing state without pretending that an unavailable recommendation already exists.

---

## 36. Background Processing and Redis

Redis can support:

```text
BullMQ
Rate limiting
Caching
Temporary processing state
```

Redis should not replace MongoDB as the durable source of learning state.

---

## 37. Background Processing and AI Data Security

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

AI output must be parsed and validated before persistence.

---

## 38. Worker Service Boundaries

Workers should invoke existing application/domain services rather than duplicating business logic.

Preferred:

```text
Controller
   ↓
Application/Domain Service
```

and:

```text
Worker
   ↓
Same Application/Domain Service
```

This keeps business rules consistent.

---

## 39. Suggested Project Organization

The exact modular-monolith structure will be finalized during implementation, but conceptually:

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
│   ├── learning.queue
│   ├── personalization.queue
│   ├── ai.queue
│   ├── notifications.queue
│   └── imports.queue
│
└── workers/
    ├── learning.worker
    ├── personalization.worker
    ├── ai.worker
    ├── notifications.worker
    └── imports.worker
```

This is a logical guide, not a requirement to create every file immediately.

---

## 40. Modular Monolith Compatibility

Background workers do not require microservices.

The initial architecture remains a modular monolith:

```text
                    APPLICATION
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
   Auth Module      Learning Module   Course Module
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                    Queue Layer
                         │
               ┌─────────┼─────────┐
               ▼         ▼         ▼
             Worker    Worker    Worker
```

Microservices can be considered only when actual scale or organizational requirements justify them.

---

## 41. Queue Isolation and Scaling

API and workers can scale independently:

```text
API:
3 instances

AI workers:
5 instances

Import workers:
2 instances
```

One overloaded queue should not prevent critical learning operations from running.

Critical queues should eventually be isolated operationally if workload requires it.

---

## 42. Critical vs Non-Critical Jobs

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

This classification helps allocate worker resources.

---

## 43. Observability

Background processing should record:

```text
job name
job ID
queue
attempt number
duration
status
error
created time
started time
completed time
```

Use correlation IDs to connect:

```text
HTTP Request
   ↓
Assessment
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

Never log passwords, tokens, API keys, or unnecessary sensitive learner information.

---

## 44. Metrics

Useful metrics include:

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

These help identify bottlenecks.

---

## 45. Security

Workers must still validate job payloads.

Protect:

```text
Redis
MongoDB
temporary files
AI credentials
external service credentials
```

Workers should use least-privilege access where practical.

---

## 46. Anti-Patterns

### Unmanaged background promises

Avoid:

```js
app.post("/assessment", async (req, res) => {
    await saveResult();
    generateAIRecommendation();
    res.json(...);
});
```

There is no durable retry, observability, or reliable recovery.

### Giant worker

Do not put all business logic directly into workers.

### AI for authoritative decisions

Do not use AI for:

```text
score
unlock
authorization
eligibility
```

### Infinite retries

Every retryable job needs bounded attempts.

### Giant generic queue

Avoid turning one `background` queue into an unstructured collection of unrelated jobs.

---

## 47. Local Development

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

## 48. Production Process Model

Production may run API and workers separately:

```text
              Load Balancer
                    │
             ┌──────┴──────┐
             ▼             ▼
          API #1         API #2
             │             │
             └──────┬──────┘
                    │
                  Redis
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Worker #1 Worker #2 Worker #3
```

This allows independent scaling.

---

## 49. Graceful Deployment

Deployment should account for active workers:

```text
Stop accepting new work
       ↓
Finish/recover active jobs
       ↓
Deploy
       ↓
Restart workers
       ↓
Resume processing
```

Queue-backed architecture makes this safer than unmanaged promises.

---

## 50. Testing Background Jobs

Each worker should be testable independently.

Test:

```text
Valid job
   ↓
Expected result
```

Also:

```text
Invalid payload
Duplicate job
Retry
Permanent failure
External provider failure
Timeout
Worker restart
```

Idempotency should be explicitly tested.

---

## 51. MVP Queue Strategy

Start with a small number of queues:

```text
learning
personalization
ai
notifications
imports
```

Analytics and maintenance may initially share an appropriate low-priority queue if operationally simpler.

Split queues further only when real workload requires it.

---

## 52. MVP Background Jobs

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

---

## 53. Failure Policies

Every job should define:

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

Example:

### Recommendation

```text
Retry: yes
Fallback: deterministic rules
User transaction affected: no
```

### AI explanation

```text
Retry: limited
Fallback: deterministic explanation
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

## 54. End-to-End Personalization Example

```text
Student submits DBMS quiz
          ↓
API scores quiz
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
Queue: generate-recommendation
          ↓
Recommendation:
Review Normalization
          ↓
Optional AI job
          ↓
AI generates explanation
          ↓
Validated
          ↓
Dashboard displays recommendation
```

---

## 55. End-to-End Failure Example

```text
Assessment submitted
       ↓
Result saved
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
Student continues learning
```

The core learning workflow remains available.

---

## 56. Background Processing Checklist

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
```

---

## 57. Future Enhancements

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

These should be introduced only when justified by actual workload and reliability requirements.

---

## 58. Scope Boundary

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

## 59. Final Architecture Principle

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
RETRY / FALLBACK
        ↓
UPDATED APPLICATION STATE
```

The most important rule is:

> **Never make the student's core learning transaction depend unnecessarily on slow or failure-prone asynchronous work. Persist the authoritative result first, then process enrichment, personalization, AI, analytics, and notifications in reliable background jobs.**


---

# 60. Personalization Intervention Jobs and Escalation

Background processing supports the intervention policy defined in `09-ai-personalization-engine-design.md`.

Personalization workers may process jobs such as:

```text
recalculate-personalization
generate-recommendations
refresh-next-best-action
evaluate-intervention
```

The worker must not blindly generate the same intervention repeatedly.

Conceptually:

```text
Learning Evidence
      ↓
Evaluate Current Intervention
      ↓
Improved?
   /       \
 YES       NO
  ↓         ↓
Continue   Escalate
           ↓
      Generate next
      appropriate action
```

Important rules:

- hard prerequisite constraints are evaluated before ordinary recommendations
- the most specific useful intervention should be preferred
- repeated failed interventions should trigger escalation or alternative remediation
- assessment jobs should measure improvement rather than simply repeat an identical quiz
- recommendation generation should remain deterministic at the decision level, with AI used only for permitted enhancement
- recommendation/intervention outcomes should be recorded so future personalization can evaluate effectiveness

The worker should use the same personalization/application services as synchronous application flows rather than duplicating intervention-selection logic.
