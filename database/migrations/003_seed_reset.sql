BEGIN;

-- Safety Guardian Pro - Reset helper for local/dev seed data (PostgreSQL)
-- This clears all application tables and resets identity sequences.
-- Run 002_seed_test_data.sql afterward to repopulate test data.

TRUNCATE TABLE
    dashboard_metrics_daily,
    safety_checkins,
    drills,
    incidents,
    admin_audit_log,
    admin_settings,
    admin_profiles,
    user_office_schedule,
    user_settings,
    users,
    sites,
    organizations
RESTART IDENTITY CASCADE;

COMMIT;
