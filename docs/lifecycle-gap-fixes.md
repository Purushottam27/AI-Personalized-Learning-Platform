# Backend lifecycle coordination fixes

This package starts from the supplied local backend snapshot and keeps the existing Assessment implementation. It does not change the frontend, course publication-readiness policy, the deferred diagnostic enrollment flow, or FINAL topic-coverage rules.

## What changed

- `src/shared/utils/withTransaction.js` — shared MongoDB transaction helper for lifecycle mutations.
- `src/modules/question/models/question.model.js` — adds an internal `lifecycleVersion` write-fence field.
- `src/modules/question/services/question.service.js` — coordinates question creation, editing, archival, and restoration with bank lifecycle writes; prevents edits to questions used by published Assessments; prevents archiving questions used by published Assessments or Practice; runs these mutations in transactions.
- `src/modules/questionBank/models/questionBank.model.js` — adds an internal lifecycle write-fence field.
- `src/modules/questionBank/services/questionBank.service.js` — blocks Question Bank archival while published Practice or Assessment depends on it; transactional coordination with publication.
- `src/modules/practice/services/practice.service.js` — Practice pool updates and publication run transactionally; publication transaction validates and writes the selected Question and Question Bank records before publishing. These shared writes serialize it against concurrent question/bank lifecycle mutations.
- `src/modules/course/models/course.model.js` — adds a lifecycle write-fence field.
- `src/modules/course/services/course.service.js` — diagnostic policy updates are transactional and are rejected after a diagnostic Assessment is published. The Course document write fence is shared with Assessment publication.
- `src/modules/assessment/services/assessment.service.js` — Assessment publication is transactional and writes the selected Question, Question Bank, and Course records before publication, coordinating with their lifecycle operations.
- `src/modules/enrollment/models/enrollment.model.js` — adds a unique partial index allowing at most one ACTIVE enrollment per learner/course while preserving withdrawn/completed history.
- `src/modules/enrollment/services/enrollment.service.js` — maps duplicate-key errors from that invariant to `409 ALREADY_ENROLLED`.
- `src/scripts/migrateActiveEnrollmentUniqueIndex.js` — safe, rerunnable dry-run/apply migration. It detects duplicates before index creation and never edits/deletes enrollment documents.
- `tests/enrollment.test.js` — integration coverage for concurrent enrollment and re-enrollment after withdrawal.
- `tests/lifecycle-coordination.test.js` — integration coverage for published Assessment/Practice references, concurrent Practice publication vs question archival, Question Bank archival, and diagnostic policy locking.
- `package.json` and `.env.example` — migration command and explicit test DB configuration example.

## Transaction/deployment requirement

These race-safe guarantees use MongoDB transactions. MongoDB transactions require a replica set or sharded deployment. MongoDB Atlas supports transactions; a standalone local `mongod` does not. If the configured development/test MongoDB is standalone, configure it as a single-node replica set before running lifecycle integration tests. Do not remove transactions to make tests pass, because doing so would reintroduce the race this patch is designed to close.

## Enrollment index migration

The migration is deliberately dry-run by default:

```bash
npm run migrate:active-enrollment-index
```

It connects to `DB_NAME`, checks for duplicate ACTIVE records, reports the planned index, and makes no changes. It refuses to run if `DB_NAME` ends in `_test` or equals `TEST_DB_NAME`.

After reviewing the dry-run output and confirming `DB_NAME` is the intended application database, apply explicitly:

```bash
npm run migrate:active-enrollment-index -- --apply
```

The script first checks for duplicate ACTIVE enrollments. If any exist, it prints up to 20 duplicate groups, exits without changing the index or documents, and requires manual resolution. If the expected index already exists, it verifies the definition and exits successfully. After creation, it re-reads and verifies the index definition. The index is `{ learnerId: 1, courseId: 1, status: 1 }`, unique, with partial filter `{ status: "ACTIVE" }`; historical WITHDRAWN and COMPLETED rows remain allowed.

## Verification performed while preparing this ZIP

- `node --check` was run for every JavaScript file under `src/` and `tests/` and passed.
- The package JSON was parsed and the migration script entry was checked.
- The test suite and database migration were **not executed in this environment** because dependencies could not be installed here and no project `.env`/MongoDB credentials were supplied. Run the focused tests and full suite after extracting this package into your project. This is the only remaining runtime verification; it must not be represented as already passed.

## Commands to run after replacement

From the `backend` directory, with dependencies installed and `.env` configured to use a transaction-capable MongoDB replica set:

```bash
node --test tests/lifecycle-coordination.test.js tests/enrollment.test.js
npm test
npm run migrate:active-enrollment-index
```

Review the migration dry-run output first. Only run the `--apply` form after confirming the configured `DB_NAME` is the intended database and that no duplicate active enrollment groups were reported.
