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

## Add a new test

1. Add a new `*.test.ts` or `*.test.tsx` file under `tests/`.
2. Import production code from `@/` aliases.
3. Keep tests deterministic by controlling local storage/mocks in each test.
4. Run `npm run test` before committing.
