BEGIN;

-- Safety Guardian Pro - Seed data for testing (PostgreSQL)
-- Intended for non-production environments.

-- -----------------------------------------------------------------------------
-- Organizations & sites
-- -----------------------------------------------------------------------------

INSERT INTO organizations (id, name, is_active)
VALUES
    (1, 'Acme Safety Group', TRUE);

INSERT INTO sites (
    id,
    organization_id,
    name,
    code,
    address_line_1,
    city,
    region,
    postal_code,
    country,
    is_active
)
VALUES
    (1, 1, 'HQ - London', 'LDN-HQ', '100 River Street', 'London', 'Greater London', 'E1 6AN', 'UK', TRUE),
    (2, 1, 'Warehouse - Birmingham', 'BHM-WH', '20 Industrial Road', 'Birmingham', 'West Midlands', 'B1 1AA', 'UK', TRUE),
    (3, 1, 'Plant - Manchester', 'MAN-PL', '55 Foundry Lane', 'Manchester', 'Greater Manchester', 'M1 2AB', 'UK', TRUE);

-- -----------------------------------------------------------------------------
-- Users, user settings (with staff code), and office schedules
-- -----------------------------------------------------------------------------

INSERT INTO users (id, organization_id, email, first_name, last_name, is_active)
VALUES
    (1, 1, 'admin@safeguard.local', 'Sarah', 'Officer', TRUE),
    (2, 1, 'john.ward@safeguard.local', 'John', 'Ward', TRUE),
    (3, 1, 'nina.patel@safeguard.local', 'Nina', 'Patel', TRUE),
    (4, 1, 'alex.chen@safeguard.local', 'Alex', 'Chen', TRUE),
    (5, 1, 'mia.roberts@safeguard.local', 'Mia', 'Roberts', TRUE),
    (6, 1, 'liam.turner@safeguard.local', 'Liam', 'Turner', TRUE);

INSERT INTO user_settings (id, user_id, staff_code, default_site_id, notification_preferences_json)
VALUES
    (1, 1, 'SG-0001', 1, '{"email":true,"sms":true,"drillAlerts":true}'::jsonb),
    (2, 2, 'SG-0002', 1, '{"email":true,"sms":false,"drillAlerts":true}'::jsonb),
    (3, 3, 'SG-0003', 1, '{"email":true,"sms":false,"drillAlerts":false}'::jsonb),
    (4, 4, 'SG-0004', 2, '{"email":true,"sms":true,"drillAlerts":true}'::jsonb),
    (5, 5, 'SG-0005', 2, '{"email":false,"sms":true,"drillAlerts":true}'::jsonb),
    (6, 6, 'SG-0006', 3, '{"email":true,"sms":false,"drillAlerts":true}'::jsonb);

-- weekday: 0=Sun .. 6=Sat
INSERT INTO user_office_schedule (id, user_id, weekday, is_in_office, start_time, end_time, site_id)
VALUES
    -- Sarah (Admin) in office Mon-Fri at HQ
    (1, 1, 1, TRUE, '08:30', '17:30', 1),
    (2, 1, 2, TRUE, '08:30', '17:30', 1),
    (3, 1, 3, TRUE, '08:30', '17:30', 1),
    (4, 1, 4, TRUE, '08:30', '17:30', 1),
    (5, 1, 5, TRUE, '08:30', '17:30', 1),

    -- John split between HQ and Warehouse
    (6, 2, 1, TRUE, '09:00', '17:00', 1),
    (7, 2, 2, TRUE, '09:00', '17:00', 1),
    (8, 2, 3, TRUE, '09:00', '17:00', 2),
    (9, 2, 4, TRUE, '09:00', '17:00', 2),
    (10, 2, 5, TRUE, '09:00', '17:00', 1),

    -- Nina hybrid schedule
    (11, 3, 1, TRUE, '09:30', '16:30', 1),
    (12, 3, 2, FALSE, NULL, NULL, NULL),
    (13, 3, 3, TRUE, '09:30', '16:30', 1),
    (14, 3, 4, FALSE, NULL, NULL, NULL),
    (15, 3, 5, TRUE, '09:30', '16:30', 1),

    -- Alex warehouse focused
    (16, 4, 1, TRUE, '07:00', '15:00', 2),
    (17, 4, 2, TRUE, '07:00', '15:00', 2),
    (18, 4, 3, TRUE, '07:00', '15:00', 2),
    (19, 4, 4, TRUE, '07:00', '15:00', 2),
    (20, 4, 5, TRUE, '07:00', '15:00', 2),

    -- Mia warehouse with one remote day
    (21, 5, 1, TRUE, '10:00', '18:00', 2),
    (22, 5, 2, TRUE, '10:00', '18:00', 2),
    (23, 5, 3, FALSE, NULL, NULL, NULL),
    (24, 5, 4, TRUE, '10:00', '18:00', 2),
    (25, 5, 5, TRUE, '10:00', '18:00', 2),

    -- Liam at plant
    (26, 6, 1, TRUE, '06:30', '14:30', 3),
    (27, 6, 2, TRUE, '06:30', '14:30', 3),
    (28, 6, 3, TRUE, '06:30', '14:30', 3),
    (29, 6, 4, TRUE, '06:30', '14:30', 3),
    (30, 6, 5, TRUE, '06:30', '14:30', 3);

-- -----------------------------------------------------------------------------
-- Admin profile (kept separate from users) + admin settings
-- -----------------------------------------------------------------------------

INSERT INTO admin_profiles (
    id,
    user_id,
    admin_level,
    department,
    can_manage_users,
    can_manage_drills,
    can_manage_incidents,
    can_manage_settings,
    notes
)
VALUES
    (1, 1, 'org-admin', 'Health & Safety', TRUE, TRUE, TRUE, TRUE, 'Primary safety administrator for test data');

INSERT INTO admin_settings (id, organization_id, setting_key, setting_value_json, updated_by_user_id)
VALUES
    (1, 1, 'drill.checkinWindowMinutes', '{"value":45}'::jsonb, 1),
    (2, 1, 'incident.autoEscalationEnabled', '{"value":true}'::jsonb, 1),
    (3, 1, 'compliance.minimumScore', '{"value":90}'::jsonb, 1);

INSERT INTO admin_audit_log (id, admin_profile_id, action, entity_type, entity_id, changes_json)
VALUES
    (1, 1, 'CREATE_SETTING', 'admin_settings', 1, '{"setting_key":"drill.checkinWindowMinutes"}'::jsonb),
    (2, 1, 'CREATE_SETTING', 'admin_settings', 2, '{"setting_key":"incident.autoEscalationEnabled"}'::jsonb),
    (3, 1, 'CREATE_SETTING', 'admin_settings', 3, '{"setting_key":"compliance.minimumScore"}'::jsonb);

-- -----------------------------------------------------------------------------
-- Incidents
-- -----------------------------------------------------------------------------

INSERT INTO incidents (
    id,
    organization_id,
    site_id,
    incident_number,
    title,
    description,
    severity,
    status,
    location,
    reported_by_user_id,
    occurred_at,
    resolved_at
)
VALUES
    (1, 1, 1, 'INC-2026-0001', 'Wet floor near reception', 'Slip hazard identified near main entrance.', 'medium', 'open', 'Reception', 2, NOW() - INTERVAL '2 days', NULL),
    (2, 1, 2, 'INC-2026-0002', 'Forklift near-miss', 'Near-miss between forklift and pedestrian in loading bay.', 'high', 'investigating', 'Loading Bay A', 4, NOW() - INTERVAL '1 day', NULL),
    (3, 1, 3, 'INC-2026-0003', 'Minor hand injury', 'Operator reported minor cut while handling equipment.', 'low', 'resolved', 'Assembly Line 2', 6, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

-- -----------------------------------------------------------------------------
-- Drills and safety check-ins
-- -----------------------------------------------------------------------------

INSERT INTO drills (
    id,
    organization_id,
    site_id,
    drill_name,
    drill_type,
    status,
    start_time,
    end_time,
    initiated_by_user_id,
    notes
)
VALUES
    (1, 1, 1, 'Q2 Fire Evacuation Drill', 'fire-evacuation', 'active', NOW() - INTERVAL '15 minutes', NULL, 1, 'Live active drill for check-in testing'),
    (2, 1, 2, 'Warehouse Shelter-in-Place Drill', 'shelter-in-place', 'scheduled', NOW() + INTERVAL '3 days', NULL, 1, 'Planned weekday afternoon drill'),
    (3, 1, 3, 'Plant Evacuation Drill', 'fire-evacuation', 'completed', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '30 minutes', 1, 'Completed without issues');

INSERT INTO safety_checkins (
    id,
    drill_id,
    user_id,
    status,
    checked_in_at,
    location,
    notes,
    source
)
VALUES
    (1, 1, 1, 'safe', NOW() - INTERVAL '12 minutes', 'Assembly Point A', 'Coordinating responses', 'web'),
    (2, 1, 2, 'safe', NOW() - INTERVAL '10 minutes', 'Assembly Point A', NULL, 'mobile'),
    (3, 1, 3, 'needs-assistance', NOW() - INTERVAL '8 minutes', 'Stairwell B', 'Requested first aid support', 'mobile'),
    (4, 1, 4, 'safe', NOW() - INTERVAL '7 minutes', 'Assembly Point B', NULL, 'public_link'),
    (5, 1, 5, 'pending', NULL, NULL, 'No response yet', 'web'),
    (6, 1, 6, 'unreachable', NULL, NULL, 'Call attempts unsuccessful', 'web');

-- -----------------------------------------------------------------------------
-- Dashboard metrics snapshots
-- -----------------------------------------------------------------------------

INSERT INTO dashboard_metrics_daily (
    id,
    organization_id,
    metric_date,
    open_incidents,
    scheduled_drills,
    active_drills,
    safe_checkins,
    needs_assistance_checkins,
    pending_checkins,
    compliance_score
)
VALUES
    (1, 1, CURRENT_DATE - INTERVAL '2 day', 1, 1, 0, 12, 1, 1, 93.50),
    (2, 1, CURRENT_DATE - INTERVAL '1 day', 2, 1, 0, 10, 2, 1, 91.20),
    (3, 1, CURRENT_DATE, 2, 1, 1, 3, 1, 1, 89.70);

COMMIT;
