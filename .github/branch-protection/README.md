# Branch Protection

This repository includes branch protection as code for the `main` branch.

## Files

- `main-protection.json`: protection policy payload
- `../scripts/apply-branch-protection.ps1`: script to apply policy through GitHub REST API
- `../CODEOWNERS`: code owner rules for required code owner approvals

## Apply policy

1. Create a GitHub token with repository administration permissions.
2. Set token in environment:
   - PowerShell: `$env:GITHUB_TOKEN = "<token>"`
3. Run:
   - `powershell -ExecutionPolicy Bypass -File .github/scripts/apply-branch-protection.ps1`

## What this policy enforces

- Required status check: `test` job from CI workflow
- At least one approving review
- Require code owner review
- Dismiss stale approvals on new commits
- Require linear history
- Block force pushes and deletions
- Require conversation resolution before merge
- Enforce for admins
