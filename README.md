**Safety Guardian**

A comprehensive Health & Safety management platform that maintains a register of responsible personnel, monitors compliance with required safety checks, and supports the coordination of drills and the logging and tracking of incidents.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Development quality checks

Use Node.js 22.12.0+ to avoid Vite runtime warnings.

```sh
# Use the pinned Node version for this repo
nvm install
nvm use

# Run unit/integration tests
npm run test

# Run visual regression tests (non-snapshot update mode)
npm run test:visual

# Run both suites together
npm run test:all

# Run quick k6 performance smoke gate (requires k6 installed)
npm run perf:smoke

# Run deeper k6 load profile
npm run perf:load

# Generate smoke summary then compare against stored baseline
npm run perf:smoke:summary
npm run perf:baseline:compare

# Refresh baseline after intentional performance shifts
npm run perf:baseline:update

# Only when UI changes are intentional, refresh snapshots
npm run test:visual:update
```

## Open-source release management

This repository now uses automated release/version management with GitHub Actions + Release Please.

### What is automated

- Semantic version bumps in `package.json`
- GitHub release tags (for example `v1.2.3`)
- Release notes and changelog updates in `CHANGELOG.md`
- Release PR creation and tracking

### Workflow

1. Merge changes to `main`.
2. The `release-management` workflow runs automatically.
3. Release Please opens or updates a release PR with:
	- proposed version bump
	- changelog entries
4. Merge the release PR to cut an official release.
5. Release Please creates the GitHub tag + GitHub release.

### Commit message guidance

Use Conventional Commit style to control version bump behavior:

- `fix:` -> patch release
- `feat:` -> minor release
- `feat!:` or `BREAKING CHANGE:` footer -> major release

Examples:

```text
fix: correct incident status filter logic
feat: add multi-language admin grouping
feat!: replace legacy drill schema with normalized model
```

### Manual release trigger

You can also run release management manually from the GitHub Actions tab using `workflow_dispatch` on `release-management`.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
