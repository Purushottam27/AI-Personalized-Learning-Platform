# AI Based Personalized Learning Platform — Security & Authentication Design

## 1. Purpose

This document defines the security and authentication architecture for the AI Based Personalized Learning Platform. It translates the approved Product Requirements, MVP Scope, Student Learning Model, User Journeys, System Architecture, Database Design, and API Design into concrete security and authentication rules.

The goal is not merely to add JWT. The goal is to ensure that only the right user can access the right resource for the right operation under the right conditions, while preventing manipulation of authoritative learning state.

## 2. Security Goals

The platform must protect user accounts, authentication credentials, access and refresh credentials, course ownership, enrollment information, assessment integrity, learning evidence, topic mastery, personalization state, teacher analytics, admin operations, uploaded resources, AI credentials and learner context, database/Redis credentials, and internal application information.

Core goals:

```text
Confidentiality + Integrity + Availability + Accountability
```

## 3. Core Security Principle

> **Never trust the client with authoritative state.**

The frontend may request actions such as submitting an assessment, enrolling in a course, opening a lesson, or viewing mastery. It must never decide its own score, mastery, unlocked lessons, role, ownership, or enrollment state. The backend is authoritative.

## 4. Threat Model

Assume attackers can inspect frontend code, modify requests, call APIs directly, replay requests, send malformed input, attempt privilege escalation, steal credentials, brute-force authentication, upload malicious files, manipulate assessment timing, access other users' data, inject malicious input, abuse AI endpoints, or exploit insecure configuration.

```text
Frontend validation ≠ Security
Backend validation = Security boundary
```

## 5. Authentication vs Authorization

**Authentication** answers: "Who are you?"

**Authorization** answers: "What are you allowed to do?"

A valid login does not grant access to every resource.

## 6. Authentication Architecture

Recommended MVP:

```text
Login
  ↓
Verify credentials
  ↓
User identity
  ├── Access Token  → short-lived API authorization
  └── Refresh Token → protected token renewal
```

## 7. JWT Strategy

Use two conceptual credentials:

- Access token: short-lived, minimal claims, used for API authorization.
- Refresh token: longer-lived, more sensitive, protected and revocable/rotatable.

Access-token payload:

```json
{
  "sub": "userId",
  "role": "STUDENT",
}
```
Refresh-token payload:

```json
{
  "sub": "userId",
  "jti": "refresh-token-id"
}
```

Do not put passwords, password hashes, refresh tokens, private profile information, learning history, or large recommendation/analytics data into JWTs.

## 8. Refresh Token Rotation

Recommended flow:

```text
Refresh Token A
      ↓
Verify JWT
      ↓
Find RefreshSession using userId + jti
      ↓
Compare SHA-256 token hash
      ↓
Generate Refresh Token B
      ↓
Generate new JTI
      ↓
Update SAME RefreshSession
      ↓
Issue new Access Token
```

jti        → changed
tokenHash  → changed
tokenFamily → unchanged
expiresAt   → unchanged
revokedAt   → remains null

Reuse of an already-rotated refresh token should be treated as suspicious and can invalidate the affected token family/session.

If refresh sessions are persisted, store a protected representation such as a hash rather than raw long-lived credentials.

## 9. Browser Credential Strategy

Recommended MVP:

```text
Access Token  → Authorization: Bearer <token>
Refresh Token → HttpOnly + Secure + appropriate SameSite cookie
```

`HttpOnly` reduces JavaScript access to the refresh credential. `Secure` requires HTTPS in production. `SameSite` helps control cross-site cookie behavior. Exact values depend on deployment.

## 10. Password Security

Passwords must never be stored in plaintext.

```text
Password
   ↓
Modern password hashing algorithm
   ↓
Password hash
   ↓
Database
```

The current MVP implementation uses bcryptjs with a cost factor
of 12. Password hashing is performed by the User model before
persistence. Plaintext passwords are never stored.

## 11. Signup and Public Roles

Signup validates name, email, password, and role. The backend normalizes appropriate fields, validates uniqueness,
hashes the password, creates the User record, and returns a safe
response. Role-specific profile creation/onboarding is handled
according to the approved user/profile flow.

Public signup may support:

```text
STUDENT
TEACHER
```

but never:

```text
ADMIN
```

Admin accounts must be created or managed through controlled mechanisms.

## 12. Authentication Middleware

```text
Request
  ↓
Extract access token
  ↓
Verify signature
  ↓
Verify expiration
  ↓
Identify user
  ↓
Check account state if needed
  ↓
Attach authenticated context
  ↓
next()
```

Authentication middleware should remain focused and not contain large business rules.

## 13. Authorization Architecture

Roles:

```text
STUDENT
TEACHER
ADMIN
```

Authorization is layered:

```text
Authentication
   ↓
Role authorization
   ↓
Resource ownership
   ↓
Relationship authorization
   ↓
Business rules
   ↓
Operation
```

Example teacher edit:

```text
Authenticated?
  ↓
Teacher?
  ↓
Owns course?
  ↓
Lesson belongs to course?
  ↓
Allowed
```

Role alone is not sufficient.

## 14. Resource and Relationship Authorization

A teacher may edit only their own courses. A teacher may view only course-relevant information about students enrolled in their course.

Example:

```text
Teacher
  ↓
Own Course
  ↓
Student Enrollment
  ↓
Course-Relevant Student Data
```

A student's platform-wide history must not become visible merely because a teacher has the TEACHER role.

## 15. Account State

Recommended states:

```text
ACTIVE
SUSPENDED
DEACTIVATED
```

A valid JWT does NOT automatically grant access to a suspended or deactivated account.

### Account State Enforcement

Protected request:

```text
Request
 ↓
Verify access token
 ↓
Identify User
 ↓
Check User.status
 ↓
ACTIVE?
 ├── YES → continue
 └── NO → reject
```

### Refresh behavior

Refresh request:

```text
Refresh credential
 ↓
Validate refresh session
 ↓
Find User
 ↓
Check User.status
 ↓
ACTIVE?
 ├── YES → rotate and issue new access token
 └── NO → reject
```

### Suspension / Deactivation

When an account becomes SUSPENDED or DEACTIVATED:

- revoke active refresh sessions
- reject future refresh attempts
- reject protected API requests even when an old access token is
  otherwise cryptographically valid

Do NOT introduce an access-token blacklist for MVP.

### RefreshSession

Refresh-session persistence is separate from User.

RefreshSession
├── userId
├── jti
├── tokenHash
├── expiresAt
├── revokedAt
├── tokenFamily
└── timestamps

One User can have multiple RefreshSession records.

Refresh-session persistence has been finalized for the current
authentication implementation.

RefreshSession is maintained separately from User. One User may have multiple RefreshSession records. The refresh token contains a unique jti that identifies the corresponding persisted session.

## 16. Logout and Session Management

```text
POST /auth/logout
      ↓
Read refreshToken cookie
      ↓
Verify refresh JWT
      ↓
Extract sub + jti
      ↓
Find RefreshSession
      ↓
Set revokedAt = current time
      ↓
Clear accessToken cookie
      ↓
Clear refreshToken cookie
```
Normal logout revokes the current refresh session only. Other active sessions belonging to the same user remain unaffected.

Access tokens are short-lived; refresh credentials should be revoked on logout.

A future `logout-all` operation may invalidate all refresh sessions after a security incident or password change.

## 17. JWT Secret and Environment Security

Never hard-code signing secrets:

```js
const JWT_SECRET = "my-secret"; // WRONG
```

Use environment configuration or a production secret manager.

Typical sensitive configuration includes:

```text
MONGODB_URI
JWT_ACCESS_SECRET / signing key
JWT_REFRESH_SECRET / signing key
REDIS_URL
AI_PROVIDER_KEY
STORAGE credentials
EMAIL credentials
```

Never commit real `.env` files. Use `.env.example` with placeholders.

## 18. Secret Rotation

Production secrets must be rotatable. A secret manager is preferred for mature deployments. JWT key rotation requires planned support for multiple keys during transition if necessary.

## 19. CORS and CSRF

CORS should explicitly allow trusted frontend origins. Avoid wildcard origins when credentials/cookies are involved.

Cookie-based authentication requires CSRF consideration. Mitigations can include:

```text
SameSite cookies
Origin/Referer validation where appropriate
CSRF tokens where required
```

The final implementation must test the chosen deployment architecture.

## 20. XSS and Security Headers

Avoid unsafe HTML injection. Validate and sanitize rich HTML if rich content is supported. Teacher-provided lesson content is untrusted if arbitrary HTML is permitted.

Production should use appropriate headers, commonly including:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
HSTS
```

Exact settings must be tested with the frontend.

## 21. NoSQL Injection and Query Security

Never blindly pass user-supplied objects into MongoDB queries. Do not allow clients to inject operators such as `$ne`, `$gt`, `$where`, or arbitrary field paths.

Use schema validation and explicit allowlisted query construction.

Allowed filters should be explicit, for example:

```text
department
category
difficulty
status
```

## 22. Object-Level Authorization / IDOR

Changing an ID must never grant access.

For example:

```text
GET /api/v1/attempts/ATTEMPT_B
```

must verify that the attempt belongs to the authenticated student or that an authorized teacher/admin relationship exists.

Object IDs are not an authorization mechanism.

## 23. Student and Teacher Data Minimization

Student responses must not expose internal teacher notes, admin metadata, other students, security state, or unnecessary internal analytics.

Teacher responses should focus on:

```text
Enrollment
Course progress
Course assessment results
Course topic mastery
Course-relevant strengths/weaknesses
```

Use DTOs/projections instead of blindly returning database documents.

## 24. Admin Security and Audit Logging

Sensitive admin operations must follow:

```text
Authenticate
   ↓
Authorize
   ↓
Validate
   ↓
Execute
   ↓
Audit
```

Examples of auditable events:

```text
LOGIN_SUCCESS
LOGIN_FAILURE
ROLE_CHANGED
USER_SUSPENDED
COURSE_PUBLISHED
COURSE_ARCHIVED
ASSESSMENT_SUBMITTED
REFRESH_TOKEN_REUSE_DETECTED
ADMIN_ACTION
```

Never log passwords, JWTs, refresh tokens, or API keys.

## 25. Rate Limiting and Brute-Force Protection

Protect especially:

```text
/signup
/login
/refresh
password-related endpoints
AI-triggering endpoints
bulk imports
admin-sensitive APIs
```

Redis can support distributed rate limiting. Authentication protection can combine IP-based limits, account-aware throttling, and progressive delays.

Avoid overly specific authentication errors that enable account enumeration.

## 26. Request Size and File Upload Security

Apply limits to JSON bodies, URL-encoded bodies, multipart uploads, individual files, and bulk imports.

Teacher resources such as PDF, PPT/PPTX, DOC/DOCX, and images should be validated by:

```text
Extension
MIME type
File signature where appropriate
File size
Storage policy
```

Never execute uploaded files. Production can add antivirus scanning, content inspection, isolated processing, and controlled storage.

## 27. Question Import Security

Uploaded Excel/PDF question files are untrusted input:

```text
Upload
  ↓
File validation
  ↓
Safe parsing
  ↓
Schema validation
  ↓
Preview
  ↓
Teacher approval
  ↓
Database
```

Arbitrary file content must never become executable code.

## 28. Assessment Security

The backend is authoritative for:

```text
Attempt ownership
Question selection
Correct answers
Marks
Timer
Submission state
Attempt count
Final score
```

When an assessment starts, return questions/options but do not expose answer keys prematurely.

If a question bank has 30 questions and an attempt contains 10, the server selects the 10 questions.

## 29. Assessment Attempt Integrity

An attempt should contain at least:

```text
studentId
assessmentId
startedAt
status
```

The backend prevents:

```text
Second final submission
Expired attempt modification
Another student accessing attempt
Changing assessment configuration mid-attempt
```

## 30. Timer Security

The browser timer is only a display mechanism. The server is authoritative:

```text
server startedAt + server timeLimit
```

At submission, server time determines whether the attempt is still valid. Expired attempts can be auto-submitted according to the assessment rules.

## 31. Score and Mastery Security

Score is calculated server-side:

```text
Responses
   ↓
Correct Answers
   ↓
Marks
   ↓
Score
```

Never accept a client-supplied authoritative score.

Mastery is also derived from trusted evidence. A student cannot send:

```json
{"masteryScore":95}
```

and change the learning model.

## 32. Learning Evidence Security

Learning evidence should be generated by trusted domain operations such as:

```text
Assessment submission
Lesson completion
Practice completion
Intervention completion
Diagnostic result
```

Do not provide a generic endpoint that lets students fabricate arbitrary learning evidence.

## 33. AI Security Boundary

Preferred architecture:

```text
Database
   ↓
Personalization Service
   ↓
Minimal Relevant Context
   ↓
AI
   ↓
Validated Output
   ↓
Application Decision
```

The frontend must never hold private AI provider keys or directly control authoritative personalization state.

AI should receive only relevant context, not authentication data or unrelated learner information.

External/teacher content must be treated as untrusted data and should not automatically become AI instructions.

AI output must be schema-validated before persistence or use.

Example:

```json
{
  "recommendationType": "TOPIC_REVIEW",
  "targetTopicId": "...",
  "reason": "...",
  "priority": "HIGH"
}
```

AI suggestions do not directly set mastery or other authoritative state.

## 34. Redis Security

Redis is infrastructure and must never be exposed directly to the frontend.

Use authentication, private networking, and TLS where required. Redis can support caching, queues, rate limiting, and temporary state, but permanent learning history remains in the authoritative database.

## 35. MongoDB Security

Production MongoDB should use:

```text
Authenticated connection
Least-privilege database user
Network restrictions
TLS
Secure connection string
```

Do not run the application with a full cluster administrator account.

## 36. Backup and Recovery

Production should eventually provide:

```text
Automated backups
Retention policy
Restore testing
Disaster recovery
```

A backup is not proven until restoration has been tested.

## 37. Error Security

Production responses must not expose:

```text
Stack traces
Database queries
Filesystem paths
JWT internals
Provider credentials
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Something went wrong"
  }
}
```

Detailed diagnostics belong in secure server logs.

## 38. Security Testing Strategy

Every protected endpoint should test authentication, authorization, input validation, resource ownership, state transitions, and failure handling.

### Authentication tests

```text
No token             → 401
Expired token        → 401
Malformed token      → 401
Invalid signature    → 401
```

### Authorization tests

```text
Wrong role           → denied
Wrong owner          → denied
Wrong student        → denied
Wrong course         → denied
```

### State tests

```text
Already submitted
Already enrolled
Archived course
Suspended user
Expired attempt
```

## 39. IDOR and Privilege Escalation Tests

Test that User A cannot access User B resources simply by changing IDs.

Test that:

```text
Student → cannot become Teacher
Student → cannot become Admin
Teacher → cannot become Admin
Teacher → cannot modify another teacher's course
Teacher → cannot access unrelated student data
```

## 40. Assessment Abuse Tests

Test:

```text
Submit twice
Submit after timeout
Submit another student's attempt
Modify question ID
Modify marks
Modify score
Skip validation
Replay submission
```

## 41. Authentication Test Matrix

```text
Signup valid                 → 201
Signup duplicate email      → 409
Signup admin role           → rejected
Login valid                 → 200
Login invalid               → 401
Refresh valid               → 200
Refresh invalid             → 401
Refresh rotated token       → rejected/revoked
Logout                      → success
Protected route no token    → 401
Protected route expired     → 401
```

## 42. Authorization Test Matrix

```text
Student → own profile               → allowed
Student → other profile             → denied
Student → enrolled course           → allowed
Student → locked lesson             → denied
Teacher → own course                → allowed
Teacher → another teacher course    → denied
Teacher → own course students       → allowed
Teacher → unrelated student         → denied
Admin → authorized admin operation  → allowed
Student → admin operation           → denied
```

## 43. Dependency and Git Security

Keep dependencies updated, use lockfiles, review advisories, remove unused packages, avoid unmaintained packages, and add dependency scanning in CI when practical.

Never commit:

```text
.env
Private keys
JWT secrets
API keys
Database credentials
Storage credentials
```

If a secret is accidentally committed, rotate the credential; deleting the file alone is insufficient.

## 44. Account Deletion and Teacher Deactivation

Account deletion must respect privacy requirements, historical learning evidence, audit requirements, course ownership, teacher content, and enrollment history.

Teacher deactivation must preserve coherent historical course/student data. The business policy must later define whether affected courses remain published, become archived, or are transferred.

## 45. MVP Security Checklist

```text
[ ] Secure password hashing
[ ] JWT access authentication
[ ] Refresh token mechanism
[ ] Protected refresh credential
[ ] Authentication middleware
[ ] RBAC
[ ] Resource ownership checks
[ ] Enrollment authorization
[ ] Assessment ownership/integrity
[ ] Server-side scoring
[ ] Server-side timer validation
[ ] Input validation
[ ] Authentication rate limiting
[ ] Secure CORS
[ ] Security headers
[ ] Environment-based secrets
[ ] No sensitive data in responses
[ ] No secrets in Git
[ ] Basic audit logging
[ ] Security-focused API tests
```

## 46. Post-MVP Security Improvements

Later improvements may include:

```text
MFA
Advanced session management
Device/session dashboard
Advanced anomaly detection
Dedicated secret manager
Advanced file scanning
WAF
SIEM integration
Advanced audit analytics
Automated dependency scanning
Penetration testing
Formal threat modeling
```

These should not block the initial MVP unless deployment conditions require them.

## 47. Security Documentation Rule

If implementation changes a security-sensitive architectural decision, update this document before allowing code and documentation to drift.

Examples:

```text
JWT strategy changes
Refresh-token storage changes
Cookie strategy changes
Role changes
Admin permission changes
Assessment security changes
AI data-boundary changes
```

## 48. Scope Boundary

This document intentionally does not yet finalize:

- Exact JWT library configuration
- Exact cookie domain
- Exact SameSite deployment value
- Exact refresh-session schema
- Exact password-hashing library configuration
- Exact CSRF implementation
- Exact security-header configuration
- Exact cloud secret manager
- Exact storage provider
- Exact production firewall/network rules
- MFA implementation
- Complete penetration-testing plan

These will be finalized against current official documentation and the actual deployment environment during implementation.

## 49. Complete Authentication Flow

```text
SIGNUP
  ↓
Validate Input
  ↓
Hash Password
  ↓
Create User
  ↓
Create Profile
  ↓
LOGIN
  ↓
Verify Password Hash
  ↓
Check Account
  ↓
Access Token + Refresh Token
  ↓
Protected API Calls
  ↓
Access Token Expired
  ↓
POST /auth/refresh
  ↓
Verify + Rotate Refresh
  ↓
New Access Token
```

## 50. Complete Authorization Flow

```text
Request
  ↓
Access Token
  ↓
Authenticate
  ↓
Identify User
  ↓
Role Check
  ↓
Resource Lookup
  ↓
Ownership / Relationship Check
  ↓
Business Rule Check
  ↓
Allowed?
 ┌───────┴────────┐
YES               NO
 ↓                 ↓
Execute           403/404
```

## 51. Complete Assessment Security Flow

```text
Start Attempt
      ↓
Verify Student
      ↓
Verify Enrollment
      ↓
Verify Assessment Access
      ↓
Check Attempt Eligibility
      ↓
Select Questions Server-Side
      ↓
Create Attempt
      ↓
Server Timer
      ↓
Student Answers
      ↓
Submit
      ↓
Lock Attempt
      ↓
Server Scoring
      ↓
Learning Evidence
      ↓
Mastery Update
      ↓
Progression Decision
      ↓
Personalization
```

## 52. Complete Security Architecture

```text
                         FRONTEND
                            │
                         HTTPS
                            │
                            ▼
                       API SERVER
                            │
            ┌───────────────┼────────────────┐
            │               │                │
            ▼               ▼                ▼
      Authentication   Authorization    Validation
            │               │                │
            └───────────────┼────────────────┘
                            ▼
                      Business Services
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
     MongoDB              Redis             AI/Storage
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                       Audit / Logs
```

## 53. Final Security Principle

The platform follows:

```text
IDENTITY
   ↓
AUTHENTICATION
   ↓
AUTHORIZATION
   ↓
RESOURCE OWNERSHIP
   ↓
BUSINESS RULES
   ↓
AUTHORITATIVE STATE
   ↓
LEARNING EVIDENCE
   ↓
PERSONALIZATION
```

> **AI, frontend code, and client requests may suggest or request actions, but the backend remains the final authority over security-sensitive and learning-critical state.**

This is the foundation for a secure, reliable, explainable, and scalable personalized learning platform.
