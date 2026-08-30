# Future Implementation & Deferred Decisions

> **Purpose:** Record features, architectural enhancements, and implementation decisions that have been intentionally deferred from the current MVP but may be required or valuable in future phases.
>
> **Status:** Living project document
>
> **Important:** Items in this document are NOT part of the current MVP implementation unless they are explicitly moved back into the active implementation plan.

---

# 1. Purpose of This Document

This document maintains a controlled list of features and architectural decisions that have been discussed during project planning but are intentionally deferred from the current MVP.

The purpose is to ensure that:

- useful ideas are not forgotten,
- the MVP does not continuously expand,
- deferred functionality is not accidentally implemented early,
- future architectural decisions remain traceable,
- previously discussed decisions can be revisited when the related feature is actually implemented.

This document is therefore a **deferred implementation register**, not a general brainstorming or feature-ideas document.

---

# 2. MVP Boundary Rule

A feature should remain in this document when:

1. It is useful or relevant to the long-term platform.
2. It has been intentionally excluded from the current MVP.
3. Implementing it now would add complexity without being necessary for the current MVP goals.

A deferred feature should only be moved into active implementation when:

- the related MVP functionality is stable,
- the project reaches the appropriate implementation phase,
- the required design decisions have been finalized,
- and the Project Guide explicitly moves the feature into the active implementation scope.

---

# 3. Study Scheduling & Time-Based Learning

## Status

**Deferred — Future Enhancement**

## Current MVP Decision

The current MVP collects:

- `dailyStudyTime`
- `preferredLearningFormat`

These are considered useful for initial personalization.

The MVP does NOT implement a time-based study scheduling system.

## Deferred Fields

The following study preferences are intentionally deferred:

- `preferredTime`
- `preferredSessionDuration`
- `studyDays`

### `preferredTime`

Represents the time of day during which the student generally prefers to study.

Examples may eventually include:

- Morning
- Afternoon
- Evening
- Night

The exact representation and allowed values must be finalized when study scheduling is implemented.

### `preferredSessionDuration`

Represents how long a student generally prefers an individual learning session to be.

This should eventually help the system divide learning activities into manageable sessions.

The exact representation and allowed values are not finalized.

### `studyDays`

Represents the days on which the student generally prefers or expects to study.

This can eventually support weekly study planning.

The exact representation and allowed values are not finalized.

---

# 4. Future Study Scheduling System

## Status

**Deferred — Future Enhancement**

The deferred study-preference fields are intended to become useful when the platform introduces scheduled learning.

Potential future flow:

Student study preferences
        ↓
Available study capacity
        ↓
Weekly study plan
        ↓
Recommended learning sessions
        ↓
Scheduled activities
        ↓
Notifications / reminders

The future scheduling system should use learner capacity and personalization data rather than simply generating a fixed weekly schedule.

The final scheduling algorithm is not defined yet.

---

# 5. Learning Notifications & Reminders

## Status

**Deferred — Future Enhancement**

The platform may eventually provide notifications related to:

- scheduled learning sessions,
- unfinished planned activities,
- study reminders,
- important learning events,
- personalized learning recommendations.

Notification timing should eventually be based on the student's study preferences and actual learning behavior rather than sending generic notifications.

This feature depends on the future study scheduling system and notification infrastructure.

The notification provider, delivery mechanism, frequency rules, and notification preferences are not finalized.

---

# 6. Teacher Verification & Trusted Teacher Creation

## Status

**Deferred — Future Enhancement**

## Current MVP Decision

The current MVP allows public registration for:

- `STUDENT`
- `TEACHER`

Public registration must never allow creation of:

- `ADMIN`

For current MVP development, testing, and debugging, the approved registration flow may accept the submitted role for Student/Teacher registration.

The system must still explicitly reject or prevent public creation of an `ADMIN` account.

## Future Enhancement

A later version may introduce a trusted mechanism for teacher account creation or verification.

Possible future mechanisms include:

- administrator approval,
- invitation-based teacher registration,
- institutional verification,
- verified teacher onboarding,
- other trusted account-creation mechanisms.

The exact mechanism is intentionally not finalized.

This must be decided before implementing the future teacher-verification system.

---

# 7. Refresh Session Persistence

## Status

**Architecture Direction Approved — Exact Schema Deferred**

The authentication architecture uses:

- short-lived access tokens,
- longer-lived refresh tokens,
- HttpOnly cookies,
- refresh-token rotation,
- refresh-token revocation.

Refresh sessions should not be represented as a single refresh-token field directly inside the `User` document.

Instead, the future authentication implementation should use a separate refresh-session model/collection.

Conceptually:

User
 |
 +---- RefreshSession
 |
 +---- RefreshSession
 |
 +---- RefreshSession

One user may have multiple refresh sessions, for example:

- laptop,
- mobile device,
- another browser/device.

## Future RefreshSession Model

The exact schema is not finalized.

The future model is expected to associate a session with a User and maintain information required for:

- token validation,
- expiration,
- rotation,
- revocation,
- session management.

A protected representation of the refresh credential should be persisted rather than storing the raw refresh token.

Potential conceptual fields include:

- `userId`
- protected refresh-token representation
- expiration information
- rotation information
- revocation information
- timestamps

These are conceptual only until the authentication implementation phase formally finalizes the schema.

---

# 8. Existing Access Token Invalidation After Account Suspension/Deactivation

## Status

**MVP Security Behavior Approved — No Access-Token Blacklist**

The platform must not allow a valid JWT to bypass account-state restrictions.

Protected requests should follow the conceptual flow:

JWT
 ↓
Verify signature and expiration
 ↓
Identify User
 ↓
Check User.status
 ↓
ACTIVE?
 ├── YES → continue
 └── NO  → reject

Therefore:

- `ACTIVE` accounts may continue normally.
- `SUSPENDED` accounts must be denied protected access.
- `DEACTIVATED` accounts must be denied protected access.

## Access Token Blacklist

An access-token blacklist is NOT required for the MVP under the current architecture.

Instead, account status is checked when accessing protected resources.

This avoids unnecessary additional state and complexity.

---

# 9. Refresh Behavior After Suspension/Deactivation

## Status

**MVP Security Behavior Approved**

A suspended or deactivated account must not be able to use an existing refresh session to obtain a new access token.

Conceptual flow:

Refresh request
        ↓
Validate refresh session/token
        ↓
Find User
        ↓
Check User.status
        ↓
ACTIVE?
 ├── YES → rotate and issue new access token
 └── NO  → reject

When an account is suspended or deactivated, its active refresh sessions should be revoked so that future refresh operations cannot continue the session.

Existing access tokens are separately protected by checking the current User status during protected requests.

---

# 10. Advanced Recommendation Scheduling

## Status

**Deferred — Future Enhancement**

The current MVP personalization approach should avoid overwhelming students with a large list of recommendations.

The future personalization system may progressively generate recommendations based on:

- learner context,
- daily study capacity,
- learning history,
- mastery,
- evidence,
- completed activities,
- current goals,
- preferences.

Conceptual future flow:

Learner context
        ↓
Personalization Engine
        ↓
Prioritize learning activities
        ↓
Present the most relevant recommendation
        ↓
Student completes activity
        ↓
New learning evidence
        ↓
Update learner model
        ↓
Generate next recommendation

The exact recommendation batching, ranking, and scheduling algorithms are not finalized.

---

# 11. Future Personalization Enhancements

## Status

**Deferred — Future Enhancement**

Future versions may incorporate additional signals into personalization, including:

- study schedule,
- session duration preferences,
- preferred study days,
- notification behavior,
- historical learning patterns,
- recommendation completion patterns,
- long-term learning routines.

These should only be introduced when the underlying learning and evidence systems are mature enough to support them.

---

# 12. Items That Must Remain Deferred

The following should NOT be implemented merely because they appear in this document:

- preferred study time,
- preferred session duration,
- preferred study days,
- weekly scheduling,
- learning reminders,
- advanced notification systems,
- trusted teacher verification,
- invitation-based teacher creation,
- institutional teacher verification,
- advanced refresh-session management beyond the approved MVP authentication requirements,
- advanced recommendation scheduling.

They become active implementation items only when explicitly moved into the relevant implementation phase.

---

# 13. Decision Tracking Rule

Whenever a new feature or architectural idea is discussed but intentionally excluded from the MVP:

1. Determine whether it has genuine future value.
2. If yes, record it in this document.
3. Clearly state why it is deferred.
4. Record any known dependencies.
5. Record unresolved design decisions separately.
6. Do not modify the current MVP architecture solely to prepare for an unapproved future feature.

This prevents premature abstraction and unnecessary implementation complexity.

---

# 14. Future Feature Activation Rule

Before implementing any item from this document, the Project Guide should establish:

- feature scope,
- user flow,
- data requirements,
- API requirements,
- security requirements,
- dependencies,
- schema requirements,
- UI/UX requirements,
- testing requirements.

Only after these are finalized should the item be moved from:

**Deferred**

to:

**Active Implementation**

---

# 15. Current Status Summary

| Future Item | Current Status |
|---|---|
| `preferredTime` | Deferred |
| `preferredSessionDuration` | Deferred |
| `studyDays` | Deferred |
| Weekly study scheduling | Deferred |
| Learning notifications | Deferred |
| Study reminders | Deferred |
| Trusted teacher creation | Deferred |
| Teacher verification | Deferred |
| RefreshSession exact schema | Deferred / Open |
| Access-token blacklist | Not required for current MVP |
| Account-state token enforcement | Approved for MVP |
| Refresh-session revocation on suspension/deactivation | Approved for MVP |
| Progressive recommendation scheduling | Deferred |
| Advanced personalization signals | Deferred |

---

# 16. Guiding Principle

> **Build the MVP around what the platform needs now, while explicitly preserving valuable future decisions so they are not forgotten.**

A deferred feature is not a rejected feature.

It is an intentionally postponed feature whose implementation will be reconsidered when the project reaches the appropriate stage.