# AI Based Personalized Learning Platform — Deployment Design

> **Document Type:** Deployment & Production Operations Design  
> **Status:** Initial approved deployment plan  
> **Purpose:** Define how the platform moves from local development to testing, staging, and production without introducing unnecessary infrastructure complexity.

---

# 1. Purpose

This document defines the deployment architecture and operational strategy for the AI Based Personalized Learning Platform.

It covers:

```text
Development
Testing
Staging
Production
CI/CD
Infrastructure
Secrets
Database
Redis
Background workers
AI services
Storage
Monitoring
Logging
Backups
Security
Scaling
Rollback
Disaster recovery
```

The goal is:

> **Deploy the MVP reliably with the simplest architecture that satisfies the project's requirements, while keeping a clear path toward future scaling.**

---

# 2. Deployment Philosophy

The platform should follow:

```text
Simple
+
Reliable
+
Secure
+
Observable
+
Reproducible
+
Scalable when necessary
```

We should not introduce complex infrastructure merely because it is technically possible.

Initial deployment should avoid premature:

```text
Microservices
Kubernetes
Service mesh
Complex event infrastructure
Multi-region deployment
Custom infrastructure orchestration
```

These may become appropriate later if real requirements justify them.

---

# 3. Deployment Environments

The platform should distinguish:

```text
Local
   ↓
Test
   ↓
Staging
   ↓
Production
```

## Local

Purpose:

```text
Development
Debugging
Feature implementation
Manual testing
```

## Test

Purpose:

```text
Automated tests
Integration tests
E2E tests
Regression testing
```

## Staging

Purpose:

```text
Production-like verification
Release candidate testing
Deployment verification
Final acceptance
```

## Production

Purpose:

```text
Real users
Real learning data
Real course content
```

---

# 4. Environment Isolation

Each environment should have separate configuration.

At minimum:

```text
LOCAL
TEST
STAGING
PRODUCTION
```

Do not accidentally connect local/test code to production databases.

---

# 5. High-Level Production Architecture

Recommended initial architecture:

```text
                    INTERNET
                        │
                        ▼
                 HTTPS / Domain
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        React Frontend        Backend API
                                   │
                ┌──────────────────┼──────────────────┐
                ▼                  ▼                  ▼
             MongoDB             Redis             AI Provider
                │                  │
                │                  ▼
                │              BullMQ
                │                  │
                │                  ▼
                │              Worker(s)
                │
                └──────────────────┐
                                   ▼
                            Application Data
```

Optional supporting services:

```text
Object/File Storage
Email/Notification Provider
Monitoring
Logging
Error Tracking
```

---

# 6. Deployment Components

The production system contains:

```text
1. Frontend
2. Backend API
3. Worker process
4. MongoDB
5. Redis
6. AI provider
7. File/object storage where required
8. Notification/email provider where required
9. Monitoring/logging
```

The frontend, backend, and workers may be deployed independently even though the application remains a modular monolith.

---

# 7. Frontend Deployment

The React application is built into static production assets.

Conceptually:

```text
React source
    ↓
Build
    ↓
Static assets
    ↓
CDN / static hosting
    ↓
Browser
```

The frontend should not contain:

```text
Database credentials
AI provider secrets
JWT signing secrets
Redis credentials
Private API keys
```

---

# 8. Frontend Environment Configuration

Only public configuration belongs in the frontend build.

Examples:

```text
PUBLIC_API_BASE_URL
PUBLIC_APP_NAME
PUBLIC_ENVIRONMENT
```

Never expose:

```text
MongoDB URI
Redis URI
JWT secret
AI API key
Private storage credentials
Email provider secret
```

Anything embedded in frontend JavaScript should be considered visible to users.

---

# 9. Backend Deployment

The backend is a Node.js/Express application.

Conceptually:

```text
Source
 ↓
Install dependencies
 ↓
Test
 ↓
Build if applicable
 ↓
Start API server
```

The backend should run as a stateless API process where practical.

This allows multiple API instances later without redesigning the application.

---

# 10. Backend Statelessness

Avoid storing authoritative session state only inside application memory.

Do not rely on:

```text
In-memory user sessions
In-memory queues
In-memory persistent progress
```

Persistent/shared state belongs in appropriate infrastructure:

```text
MongoDB
Redis where appropriate
```

This makes horizontal scaling possible later.

---

# 11. Worker Deployment

BullMQ workers should run separately from the API process when practical.

Architecture:

```text
Backend API
    ↓
Redis Queue
    ↓
Worker
    ↓
Job Processing
```

This prevents expensive background work from blocking API requests.

Examples:

```text
Mastery recalculation
Personalization processing
AI requests
Question-file processing
Notifications
Analytics jobs
```

---

# 12. Worker Scaling

Initially:

```text
1 API service
1 worker service
```

Later:

```text
API × N
Worker × N
```

Scale workers independently according to queue demand.

---

# 13. MongoDB Deployment

MongoDB should use a managed production service such as MongoDB Atlas or an equivalent managed MongoDB provider.

Benefits:

```text
Managed backups
Monitoring
Security controls
Scaling options
Operational simplicity
```

The production application must use a dedicated production database/cluster configuration.

---

# 14. MongoDB Environment Separation

Use separate databases or isolated clusters for:

```text
Development
Test
Staging
Production
```

At minimum, production data must never be mixed with test data.

---

# 15. MongoDB Connection Security

Production database access should use:

```text
Strong credentials
IP/network restrictions where appropriate
TLS
Least-privilege database users
Secret management
```

Do not hard-code the connection string.

---

# 16. MongoDB Indexes

Indexes defined in the database design must be deliberately created and verified.

Examples may include indexes supporting:

```text
User lookup
Course lookup
Enrollment
Course ownership
Learning events
Assessment attempts
Mastery records
Recommendations
Notifications
Audit logs
```

Do not create indexes blindly.

Measure query patterns and maintain only useful indexes.

---

# 17. Redis Deployment

Redis is used for appropriate fast/shared state and background processing.

Production Redis must be:

```text
Authenticated
Encrypted where supported
Network restricted
Configured with appropriate memory limits
Monitored
```

Redis must not become the authoritative long-term storage for learning records.

MongoDB remains the persistent source of truth for application data.

---

# 18. BullMQ Deployment

BullMQ uses Redis as its queue backend.

Conceptually:

```text
API
 ↓
Queue
 ↓
Redis
 ↓
Worker
 ↓
Database / AI / Notification
```

Production workers must support:

```text
Retry
Backoff
Failure handling
Idempotency
Graceful shutdown
```

as defined in document `10`.

---

# 19. AI Provider Deployment

AI integration should be isolated behind an application service.

Conceptually:

```text
Application
     ↓
AI Service Layer
     ↓
Provider Adapter
     ↓
AI Provider
```

The rest of the application should not directly depend on provider-specific APIs everywhere.

This makes future provider changes easier.

---

# 20. AI Secrets

AI API keys must exist only on trusted backend/worker infrastructure.

Never expose AI credentials to the browser.

Use:

```text
Environment secrets
Secret manager
Deployment platform secret storage
```

rather than source-code configuration.

---

# 21. AI Reliability

Production AI calls must account for:

```text
Timeout
Rate limits
Provider errors
Malformed output
Temporary outage
Cost limits
```

The system should use:

```text
Validation
Retry where appropriate
Fallback
Logging
```

according to the AI architecture.

---

# 22. File and Resource Storage

If teachers upload:

```text
PDF
PPT/PPTX
Images
Question files
Other approved resources
```

large files should normally be stored in object/file storage rather than MongoDB documents.

Conceptually:

```text
Browser
 ↓
Backend authorization
 ↓
Object storage
 ↓
Metadata in MongoDB
```

MongoDB stores metadata such as:

```text
file name
resource type
storage reference
course
lesson
teacher
createdAt
```

---

# 23. File Upload Security

Production file uploads must enforce:

```text
Authentication
Authorization
Allowed file types
File-size limits
MIME validation
Filename normalization
Malware/security scanning where appropriate
Private storage
Access control
```

Do not trust only the file extension.

---

# 24. YouTube Resources

If teacher-created lessons reference YouTube content:

```text
Store approved video metadata/reference
       ↓
Frontend embeds or opens approved content
```

Do not download/re-host third-party copyrighted videos unless the applicable rights permit it.

The platform should respect the provider's embedding and usage rules.

---

# 25. Domain and HTTPS

Production should use:

```text
Custom domain
HTTPS
Valid TLS certificate
```

Example architecture:

```text
app.example.com
        ↓
Frontend

api.example.com
        ↓
Backend API
```

The exact domain naming can be finalized later.

---

# 26. CORS

CORS should explicitly allow the production frontend origin.

Development may use:

```text
localhost
```

Production should not use:

```text
Access-Control-Allow-Origin: *
```

for authenticated application APIs unless there is a deliberate security reason.

---

# 27. Cookie Configuration

If refresh tokens are stored in cookies, production configuration should consider:

```text
HttpOnly
Secure
SameSite
Appropriate domain/path
```

The exact `SameSite` strategy depends on the final frontend/API domain architecture.

---

# 28. JWT Production Configuration

Production JWT configuration must use:

```text
Strong signing secret/key
Short-lived access token
Secure refresh-token strategy
Token expiration
Refresh-token validation
Logout/revocation strategy where implemented
```

Never reuse development secrets in production.

---

# 29. Environment Variables

Typical backend configuration categories:

```text
NODE_ENV
PORT

MONGODB_URI

REDIS_URL

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET

AI_PROVIDER_KEY

FRONTEND_URL

CORS_ORIGINS

STORAGE credentials
EMAIL credentials
```

Exact names are implementation details and should be finalized in the project environment template.

---

# 30. Environment Variable Rules

Never commit:

```text
.env
production secrets
API keys
database passwords
private certificates
```

Commit instead:

```text
.env.example
```

containing placeholders.

Example:

```text
MONGODB_URI=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
AI_PROVIDER_KEY=
```

---

# 31. Secret Management

Production secrets should be stored in:

```text
Deployment platform secret manager
```

or:

```text
Dedicated secret manager
```

Never in:

```text
Git repository
Frontend source
Docker image
Logs
Screenshots
Documentation
```

---

# 32. CI/CD Philosophy

The deployment pipeline should make deployments:

```text
Repeatable
Automated
Auditable
Reversible
```

Recommended flow:

```text
Developer
   ↓
Git push / Pull Request
   ↓
CI
   ↓
Lint
   ↓
Tests
   ↓
Build
   ↓
Review
   ↓
Merge
   ↓
Deploy staging
   ↓
Verification
   ↓
Production deployment
```

---

# 33. Pull Request Pipeline

At minimum:

```text
Install dependencies
 ↓
Lint
 ↓
Type check where applicable
 ↓
Unit tests
 ↓
Integration tests
 ↓
Build
```

E2E tests should run according to their cost and environment requirements.

---

# 34. Staging Deployment

A staging deployment should resemble production sufficiently to catch deployment-specific problems.

Verify:

```text
Frontend loads
API reachable
Database reachable
Redis reachable
Workers running
AI configuration valid
Authentication works
Cookies work
CORS works
Background jobs process
Health checks pass
```

---

# 35. Production Deployment Strategy

For MVP:

```text
Build
 ↓
Deploy
 ↓
Health check
 ↓
Smoke test
 ↓
Observe
```

As the platform matures, use safer strategies such as:

```text
Rolling deployment
Blue/green
Canary
```

where supported and justified.

---

# 36. Database Deployment Safety

Database changes must be handled carefully.

Before a schema/index change:

```text
Understand impact
 ↓
Test on staging
 ↓
Backup where appropriate
 ↓
Apply change
 ↓
Verify
```

Avoid destructive production schema changes without a rollback/data-recovery plan.

---

# 37. Backward Compatibility

When backend and frontend are deployed independently:

```text
Old frontend
+
New backend
```

or:

```text
New frontend
+
Old backend
```

may temporarily coexist.

API changes should therefore avoid unnecessary breaking changes.

If a breaking API change is required:

```text
Version/migration strategy
```

must be defined.

---

# 38. Health Checks

The backend should expose a lightweight health endpoint.

Conceptually:

```text
GET /health
```

It should indicate that the application process is alive.

A deeper readiness check may verify:

```text
Database connectivity
Redis connectivity
Required dependencies
```

Do not make a basic liveness endpoint unnecessarily dependent on every external service.

---

# 39. Worker Health

Workers should expose or report:

```text
Worker running
Queue connectivity
Last successful job
Failure count
```

Monitoring should detect when workers stop processing jobs.

---

# 40. Logging

Use structured logs where practical.

Important fields:

```text
timestamp
level
service
request ID / correlation ID
user ID where safe
route
status
duration
error category
job ID
```

Never log:

```text
password
refresh token
JWT secret
AI API key
database password
```

---

# 41. Error Tracking

Production errors should be captured through an error-tracking solution when possible.

Useful information:

```text
Error
Stack trace
Environment
Release/version
Request context
Correlation ID
```

Sensitive data must be filtered.

---

# 42. Monitoring

Monitor at least:

```text
API uptime
API latency
5xx errors
4xx spikes
Database health
Redis health
Queue depth
Job failures
Worker availability
AI failures
AI latency
AI usage/cost
Storage usage
```

---

# 43. Application Metrics

Useful metrics:

```text
Active users
Course enrollments
Assessment submissions
Assessment failures
Recommendation generation
Learning events
Background jobs
API request rate
Error rate
```

Learning analytics and operational metrics should remain conceptually separate.

---

# 44. Queue Monitoring

Monitor:

```text
Waiting jobs
Active jobs
Completed jobs
Failed jobs
Delayed jobs
Processing latency
```

A growing queue can indicate:

```text
Worker shortage
AI provider slowdown
Database bottleneck
Unexpected traffic
Bugged job
```

---

# 45. AI Monitoring

Monitor:

```text
Request count
Latency
Failure rate
Rate-limit events
Token/usage consumption where available
Estimated cost
Fallback frequency
Invalid-output frequency
```

This prevents AI from silently becoming an uncontrolled cost or reliability risk.

---

# 46. Backup Strategy

Production data should have backups appropriate to the managed database provider.

At minimum consider:

```text
Automated database backups
Point-in-time recovery where available
Object-storage backup/versioning where appropriate
Configuration backup
```

Backups are useful only if restoration is possible.

---

# 47. Restore Testing

Periodically verify:

```text
Backup exists
 ↓
Restore can be performed
 ↓
Application can connect
 ↓
Critical data is intact
```

A backup that has never been restored should not be assumed reliable.

---

# 48. Disaster Recovery

Potential failures:

```text
Database outage
Redis outage
API outage
Worker outage
AI provider outage
Storage outage
Deployment failure
Accidental deletion
Security incident
```

Each critical failure should have a documented response.

---

# 49. Redis Failure Strategy

Redis may support:

```text
Queues
Caching
Temporary state
```

The exact behavior depends on the feature.

Critical persistent learning records must not exist only in Redis.

After Redis recovery:

```text
Queue/worker state
```

must follow the background-processing recovery policy.

---

# 50. AI Provider Outage Strategy

If AI is unavailable:

```text
Core learning
should continue
```

where possible.

Use:

```text
Deterministic rules
Existing recommendations
Previously computed results
Graceful "processing/unavailable" state
```

Do not make every page unusable because an AI provider is temporarily down.

---

# 51. Notification Failure Strategy

Notification failure should generally not roll back successful learning operations.

Example:

```text
Student completes assessment
 ↓
Result saved
 ↓
Notification fails
```

Expected:

```text
Assessment remains successful
Notification can retry independently
```

---

# 52. Deployment Rollback

If a deployment introduces a severe regression:

```text
Detect
 ↓
Stop further rollout
 ↓
Rollback application version
 ↓
Verify health
 ↓
Investigate
 ↓
Fix
 ↓
Retest
```

Database changes must be designed so application rollback does not create incompatible data states.

---

# 53. Versioning

Each deployment should identify a release/version.

Useful information:

```text
Git commit
Release version
Build timestamp
Environment
```

This makes production debugging much easier.

---

# 54. Database Migration Rollback

Not every database change is safely reversible.

For destructive changes:

```text
Backup
+
Migration plan
+
Recovery plan
```

must exist before production execution.

Prefer additive changes first.

---

# 55. Scaling Strategy

Initial architecture:

```text
1 Frontend deployment
1 API deployment
1 Worker deployment
Managed MongoDB
Managed Redis
```

When load increases:

```text
Frontend
→ CDN/scaling

API
→ horizontal scaling

Workers
→ horizontal scaling

MongoDB
→ managed scaling/index optimization

Redis
→ managed scaling
```

---

# 56. What Should Trigger Scaling?

Do not scale based only on intuition.

Observe:

```text
CPU
Memory
Latency
Requests/second
Database load
Queue depth
Worker latency
Redis usage
AI provider limits
```

Scale when a measured bottleneck exists.

---

# 57. Horizontal API Scaling

Because the backend should be stateless where practical:

```text
             Load Balancer
              /    |    \
             ▼     ▼     ▼
           API   API    API
             \     |    /
              Shared DB/Redis
```

This should be possible without rewriting the application architecture.

---

# 58. Worker Scaling

Worker count should depend on:

```text
Queue depth
Job duration
Concurrency
External provider limits
Database capacity
```

More workers are not always better.

Too much concurrency can overload:

```text
MongoDB
Redis
AI provider
External services
```

---

# 59. Cost Strategy for MVP

The MVP should minimize unnecessary recurring costs.

Prefer:

```text
Managed services
Small production resources
Usage-based services where appropriate
One API service initially
One worker initially
Managed database
Managed Redis
```

Avoid paying for infrastructure that the MVP does not require.

---

# 60. Cost Monitoring

Track:

```text
Database
Redis
Hosting
Storage
Bandwidth
AI usage
Email/notifications
Monitoring
```

AI usage deserves special attention because personalized processing can create large request volumes.

---

# 61. Security Deployment Checklist

Before production:

```text
[ ] HTTPS enabled
[ ] Production secrets configured
[ ] No secrets committed
[ ] Database protected
[ ] Redis protected
[ ] CORS restricted
[ ] Cookies configured securely
[ ] JWT secrets changed from development
[ ] Rate limiting enabled
[ ] File uploads restricted
[ ] Error responses sanitized
[ ] Logging does not expose secrets
[ ] Admin routes protected
[ ] Teacher ownership enforced
[ ] Security tests passing
```

---

# 62. Production Configuration Checklist

```text
[ ] NODE_ENV configured
[ ] Frontend URL configured
[ ] API URL configured
[ ] MongoDB URI configured
[ ] Redis configured
[ ] JWT secrets configured
[ ] AI provider configured
[ ] Storage configured
[ ] Notification provider configured
[ ] CORS configured
[ ] Logging configured
[ ] Monitoring configured
```

---

# 63. Deployment Smoke Tests

After deployment:

```text
Open website
 ↓
Login
 ↓
Check dashboard
 ↓
Call API
 ↓
Check database
 ↓
Open course
 ↓
Perform safe learning action
 ↓
Submit test assessment if appropriate
 ↓
Check background job
 ↓
Check logs
```

Production smoke tests must avoid corrupting real learning data.

Use a dedicated test account where appropriate.

---

# 64. Post-Deployment Verification

Verify:

```text
Frontend status
Backend health
Database connectivity
Redis connectivity
Worker status
Queue processing
Authentication
CORS
Cookies
AI integration
Monitoring
Error tracking
```

---

# 65. Incident Response

If production fails:

```text
1. Detect
2. Assess severity
3. Protect user/data integrity
4. Mitigate
5. Roll back if required
6. Investigate
7. Fix
8. Test
9. Deploy
10. Document incident
```

Do not immediately modify multiple systems without understanding the failure.

---

# 66. Production Data Protection

Never use production student data casually for:

```text
Local debugging
AI experiments
Screenshots
Development fixtures
Public examples
```

If production data is required for debugging:

```text
Minimize
Anonymize
Authorize
Audit
```

---

# 67. AI Data Privacy

Only send the minimum required student context to the AI provider.

Avoid sending:

```text
Passwords
Tokens
Unnecessary personal information
Private teacher information
Unrelated student records
```

AI prompts should use purpose-specific context.

---

# 68. Deployment Documentation Maintenance

Whenever deployment architecture changes:

```text
Change deployment
 ↓
Update 14
 ↓
Update 13
 ↓
Update environment documentation
 ↓
Update CI/CD configuration
```

Do not allow production infrastructure to drift away from documentation.

---

# 69. Antigravity Deployment Rules

Antigravity may assist with:

```text
Docker configuration
CI workflows
Build scripts
Environment templates
Health endpoints
Deployment configuration
Monitoring integration
Deployment debugging
```

It must not silently:

```text
Expose secrets
Change production credentials
Delete databases
Modify production infrastructure destructively
Change deployment architecture
Add expensive infrastructure
```

Any major infrastructure change should be discussed first.

---

# 70. Deployment Definition of Done

Deployment is considered ready when:

```text
Build succeeds
+
Tests pass
+
Environment variables documented
+
Secrets securely configured
+
Frontend deployed
+
Backend deployed
+
Worker deployed
+
Database connected
+
Redis connected
+
Health checks pass
+
Monitoring works
+
Logs work
+
Backups configured
+
Rollback strategy exists
+
Smoke tests pass
```

---

# 71. MVP Deployment Architecture

The recommended first production architecture is intentionally simple:

```text
                         USERS
                           │
                           ▼
                    HTTPS / DOMAIN
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       React Frontend              Node/Express API
                                         │
                           ┌─────────────┼─────────────┐
                           ▼             ▼             ▼
                       MongoDB        Redis        AI Provider
                                         │
                                         ▼
                                      BullMQ
                                         │
                                         ▼
                                      Worker
                                         │
                           ┌─────────────┼─────────────┐
                           ▼             ▼             ▼
                        MongoDB          AI       Notifications
```

Optional:

```text
Object Storage
Monitoring
Error Tracking
Email Provider
```

---

# 72. Future Evolution

The architecture can evolve:

```text
MVP
 ↓
Measure
 ↓
Optimize
 ↓
Scale
 ↓
Separate bottlenecks
```

Potential future changes:

```text
Multiple API instances
Multiple workers
Dedicated AI processing service
Dedicated analytics processing
Advanced caching
Read replicas
Search infrastructure
Microservices where justified
Container orchestration
```

These should be introduced only when actual requirements justify them.

---

# 73. What We Should NOT Do Initially

Do not introduce all of the following merely for resume value:

```text
Kubernetes
Microservices
Kafka
Service mesh
Multi-region architecture
Complex event sourcing
Multiple databases without need
Custom API gateway
Large observability stack
```

The project should demonstrate engineering judgment, not infrastructure quantity.

---

# 74. Final Deployment Flow

```text
Developer
   │
   ▼
Git Repository
   │
   ▼
Pull Request
   │
   ▼
CI
   │
   ├── Lint
   ├── Unit Tests
   ├── Integration Tests
   ├── Build
   └── Security Checks
   │
   ▼
Merge
   │
   ▼
Staging
   │
   ├── E2E
   ├── Smoke Tests
   └── Deployment Verification
   │
   ▼
Production
   │
   ├── Frontend
   ├── API
   └── Worker
   │
   ▼
Monitoring
   │
   ▼
Feedback
   │
   ▼
Next Iteration
```

---

# 75. Final Project Architecture After Deployment

```text
                           USERS
                             │
                             ▼
                    ┌─────────────────┐
                    │  HTTPS / DOMAIN │
                    └────────┬────────┘
                             │
                   ┌─────────┴─────────┐
                   ▼                   ▼
             React Frontend       Express API
                                       │
             ┌─────────────────────────┼──────────────────────────┐
             │                         │                          │
             ▼                         ▼                          ▼
          MongoDB                   Redis                     AI Service
             │                         │                          │
             │                         ▼                          ▼
             │                     BullMQ                    AI Provider
             │                         │
             │                         ▼
             │                       Worker
             │                         │
             └─────────────────────────┼──────────────────────────┐
                                       │                          │
                                       ▼                          ▼
                                  Notifications              Analytics
```

---

# 76. Final Deployment Principle

> **The deployment architecture should be boring, predictable, secure, observable, and easy to recover from.**

The intelligence of this project should primarily come from:

```text
Learning Model
+
Personalization Engine
+
Quality Course Content
+
Learning Evidence
+
AI Assistance
```

—not from unnecessary infrastructure complexity.

---

# 77. Final Documentation Set

After this document, the planned documentation set is:

```text
docs/
│
├── 01-product-requirements.md
├── 02-mvp-scope.md
├── 03-student-learning-model.md
├── 04-user-journeys.md
├── 05-system-architecture.md
├── 06-database-design.md
├── 07-api-design.md
├── 08-security-authentication-design.md
├── 09-ai-personalization-engine-design.md
├── 10-background-processing-design.md
├── 11-frontend-architecture-ux-design.md
├── 12-testing-strategy.md
├── 13-current-progress.md
└── 14-deployment.md
```

These documents form the project's initial planning foundation.

---

# 78. Transition to Implementation

After `14` is reviewed and approved:

```text
PLANNING PHASE
      │
      ▼
Documentation approved
      │
      ▼
Implementation preparation
      │
      ▼
Repository setup
      │
      ▼
Backend foundation
      │
      ▼
Frontend foundation
      │
      ▼
Authentication
      │
      ▼
First vertical learning slice
      │
      ▼
Incremental MVP development
```

At that point, `13-current-progress.md` becomes the primary living project-control document.

---

# 79. Final Rule

The project should never enter implementation with an unclear deployment story.

We do not need to deploy immediately.

We need to know:

```text
Where it will run
How services communicate
Where data lives
How secrets are handled
How workers run
How failures are detected
How backups work
How deployment is verified
How rollback happens
How the system can scale
```

That is what this document establishes.
