# Unit Test Suite

This project uses Vitest for unit tests, with all test files located outside `src` in the top-level `tests/` folder.

## Folder structure

- `tests/lib/` : unit tests for pure library logic
- `tests/hooks/` : unit tests for React hooks
- `tests/setup.ts` : shared test setup and cleanup

## Commands

- `npm run test` : run all unit tests once
- `npm run test:watch` : run tests in watch mode
- `npm run test:coverage` : run tests with coverage output

## CI and quality gates

- GitHub Actions workflow: `.github/workflows/unit-tests.yml`
- CI runs lint and unit tests with coverage on push and pull requests.
- Coverage thresholds are enforced in `vite.config.ts` and will fail CI if they regress.

Current minimum coverage thresholds:

- Statements: 35%
- Branches: 25%
- Functions: 35%
- Lines: 35%

Branch protection artifacts:

- `.github/branch-protection/main-protection.json`
- `.github/scripts/apply-branch-protection.ps1`
- `.github/branch-protection/README.md`

## Current coverage targets

This suite currently focuses on high-risk behavior:

- Drill storage parsing/normalization and persistence
- Personnel access/permission scope logic
- Drill status hook lifecycle (start/end drill and record persistence)

## Persistence matrix

This matrix maps each localStorage persistence key to its owning code and current automated test coverage.

| Domain | Storage key | Source owner | Test coverage | Status |
|---|---|---|---|---|
| Authentication | auth_accounts | src/contexts/AuthContext.tsx, src/lib/authAccounts.ts | tests/contexts/AuthContext.persistence.test.tsx, tests/contexts/AuthContext.test.tsx | Covered |
| Authentication | auth_session | src/contexts/AuthContext.tsx | tests/contexts/AuthContext.persistence.test.tsx | Covered |
| Authentication | auth_user | src/contexts/AuthContext.tsx | tests/contexts/AuthContext.persistence.test.tsx | Covered |
| Authentication | auth_token | src/contexts/AuthContext.tsx, src/hooks/useAuthFetch.ts | tests/contexts/AuthContext.persistence.test.tsx | Covered |
| Admin settings and user management | safeguard_admin_settings | src/hooks/useAdminSettings.ts | tests/hooks/useAdminSettings.persistence.test.tsx | Covered |
| Drills data store | safeguard_drills | src/lib/drillsStorage.ts | tests/lib/drillsStorage.test.ts | Covered |
| Drill runtime state | active_drill | src/hooks/useDrillStatus.ts | tests/hooks/useDrillStatus.test.tsx | Covered |
| Drill history records | drill_records | src/hooks/useDrillStatus.ts, src/utils/safetyComplianceScore.ts | tests/hooks/useDrillStatus.test.tsx | Covered |
| Incidents data store | safeguard_incidents | src/lib/incidentsStorage.ts | tests/lib/incidentsStorage.test.ts | Covered |
| Notifications inbox | safeguard_notifications | src/lib/notifications.ts | tests/lib/notifications.test.ts | Covered |
| Notification delivery config | safeguard_notification_delivery_config | src/lib/notifications.ts | tests/lib/notifications.test.ts | Covered |
| Notification provider settings | safeguard_notification_provider_settings | src/lib/notifications.ts | tests/lib/notifications.test.ts | Covered |
| Compliance completion records | safeguard_completed_checks | src/components/dashboard/ComplianceCheckForm.tsx, src/components/dashboard/ComplianceStatsWidget.tsx, src/components/dashboard/ComplianceHistoryDialog.tsx, src/components/dashboard/ComplianceCalendarDialog.tsx, src/utils/safetyComplianceScore.ts | tests/hooks/useAdminSettings.persistence.test.tsx (related training state), tests/lib/complianceMonitoring.test.ts (related processing) | Partial |
| Missed compliance records | safeguard_missed_compliance_records | src/lib/complianceMonitoring.ts | tests/lib/complianceMonitoring.test.ts | Covered |
| Certificates | safeguard_certificates | src/hooks/useCertificates.ts | tests/components/dashboard/CertificateExpiryWidget.test.tsx (read usage) | Partial |
| Check-ins | safeguard_check_ins | src/lib/checkInsStorage.ts | tests/lib/checkInsStorage.test.ts | Covered |
| Audit logs | safeguard_audit_logs | src/lib/auditLog.ts | tests/lib/auditLog.test.ts | Covered |
| Notification seen signature | safeguard_notifications_seen_* | src/components/layout/AppLayout.tsx | tests/components/layout/AppLayout.persistence.test.tsx | Covered |

Notes:

- Covered: direct persistence tests validate read/write behavior for the key.
- Partial: key is exercised indirectly or only read behavior is validated.
- Gap: no direct automated persistence test currently exists.

## Add a new test

1. Add a new `*.test.ts` or `*.test.tsx` file under `tests/`.
2. Import production code from `@/` aliases.
3. Keep tests deterministic by controlling local storage/mocks in each test.
4. Run `npm run test` before committing.
