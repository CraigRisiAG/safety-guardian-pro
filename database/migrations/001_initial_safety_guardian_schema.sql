BEGIN;

-- Safety Guardian Pro - Initial schema (PostgreSQL)
-- Includes main-menu domain tables and separated user/admin structures.

-- -----------------------------------------------------------------------------
-- Core reference tables
-- -----------------------------------------------------------------------------

CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sites (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    address_line_1 VARCHAR(200),
    address_line_2 VARCHAR(200),
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(30),
    country VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sites_org_name UNIQUE (organization_id, name),
    CONSTRAINT uq_sites_org_code UNIQUE (organization_id, code)
);

-- -----------------------------------------------------------------------------
-- Users and user-owned settings (kept separate from admin profile)
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_org_email UNIQUE (organization_id, email)
);

CREATE TABLE user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    staff_code VARCHAR(50) NOT NULL,
    default_site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    notification_preferences_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_settings_user UNIQUE (user_id),
    CONSTRAINT uq_user_settings_staff_code UNIQUE (staff_code)
);

CREATE TABLE user_office_schedule (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL,
    is_in_office BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_office_schedule_weekday CHECK (weekday BETWEEN 0 AND 6),
    CONSTRAINT chk_user_office_schedule_times CHECK (
        start_time IS NULL OR end_time IS NULL OR start_time < end_time
    ),
    CONSTRAINT uq_user_office_schedule_user_weekday UNIQUE (user_id, weekday)
);

-- -----------------------------------------------------------------------------
-- Admin-only details (separate from users)
-- -----------------------------------------------------------------------------

CREATE TABLE admin_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_level VARCHAR(30) NOT NULL DEFAULT 'site-admin',
    department VARCHAR(100),
    can_manage_users BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_drills BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_incidents BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_settings BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_admin_profiles_user UNIQUE (user_id),
    CONSTRAINT chk_admin_profiles_level CHECK (admin_level IN ('site-admin', 'org-admin', 'super-admin'))
);

CREATE TABLE admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_profile_id BIGINT NOT NULL REFERENCES admin_profiles(id) ON DELETE RESTRICT,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT,
    changes_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_settings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    setting_key VARCHAR(120) NOT NULL,
    setting_value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_admin_settings_org_key UNIQUE (organization_id, setting_key)
);

-- -----------------------------------------------------------------------------
-- Main menu tables: incidents, drills, safety check-in, dashboard metrics
-- -----------------------------------------------------------------------------

CREATE TABLE incidents (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    incident_number VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    location VARCHAR(200),
    reported_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_incidents_org_number UNIQUE (organization_id, incident_number),
    CONSTRAINT chk_incidents_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_incidents_status CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    CONSTRAINT chk_incidents_resolved_time CHECK (resolved_at IS NULL OR resolved_at >= occurred_at)
);

CREATE TABLE drills (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
    drill_name VARCHAR(200) NOT NULL,
    drill_type VARCHAR(60) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    initiated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_drills_status CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    CONSTRAINT chk_drills_times CHECK (start_time IS NULL OR end_time IS NULL OR start_time <= end_time)
);

CREATE TABLE safety_checkins (
    id BIGSERIAL PRIMARY KEY,
    drill_id BIGINT NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    checked_in_at TIMESTAMPTZ,
    location VARCHAR(200),
    notes TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'web',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_safety_checkins_drill_user UNIQUE (drill_id, user_id),
    CONSTRAINT chk_safety_checkins_status CHECK (status IN ('safe', 'needs-assistance', 'pending', 'unreachable')),
    CONSTRAINT chk_safety_checkins_source CHECK (source IN ('web', 'mobile', 'public_link'))
);

CREATE TABLE dashboard_metrics_daily (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    open_incidents INTEGER NOT NULL DEFAULT 0,
    scheduled_drills INTEGER NOT NULL DEFAULT 0,
    active_drills INTEGER NOT NULL DEFAULT 0,
    safe_checkins INTEGER NOT NULL DEFAULT 0,
    needs_assistance_checkins INTEGER NOT NULL DEFAULT 0,
    pending_checkins INTEGER NOT NULL DEFAULT 0,
    compliance_score NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dashboard_metrics_org_date UNIQUE (organization_id, metric_date),
    CONSTRAINT chk_dashboard_metrics_nonnegative CHECK (
        open_incidents >= 0 AND
        scheduled_drills >= 0 AND
        active_drills >= 0 AND
        safe_checkins >= 0 AND
        needs_assistance_checkins >= 0 AND
        pending_checkins >= 0
    ),
    CONSTRAINT chk_dashboard_compliance_score CHECK (
        compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100)
    )
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_sites_org_id ON sites (organization_id);

CREATE INDEX idx_users_org_id ON users (organization_id);
CREATE INDEX idx_users_active ON users (is_active);

CREATE INDEX idx_user_settings_default_site_id ON user_settings (default_site_id);

CREATE INDEX idx_user_office_schedule_user_id ON user_office_schedule (user_id);
CREATE INDEX idx_user_office_schedule_site_id ON user_office_schedule (site_id);

CREATE INDEX idx_admin_audit_admin_profile_id ON admin_audit_log (admin_profile_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log (created_at DESC);

CREATE INDEX idx_admin_settings_org_id ON admin_settings (organization_id);
CREATE INDEX idx_admin_settings_updated_by ON admin_settings (updated_by_user_id);

CREATE INDEX idx_incidents_org_id ON incidents (organization_id);
CREATE INDEX idx_incidents_site_id ON incidents (site_id);
CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_occurred_at ON incidents (occurred_at DESC);
CREATE INDEX idx_incidents_reported_by ON incidents (reported_by_user_id);

CREATE INDEX idx_drills_org_id ON drills (organization_id);
CREATE INDEX idx_drills_site_id ON drills (site_id);
CREATE INDEX idx_drills_status ON drills (status);
CREATE INDEX idx_drills_start_time ON drills (start_time DESC);
CREATE INDEX idx_drills_initiated_by ON drills (initiated_by_user_id);

CREATE INDEX idx_safety_checkins_drill_id ON safety_checkins (drill_id);
CREATE INDEX idx_safety_checkins_user_id ON safety_checkins (user_id);
CREATE INDEX idx_safety_checkins_status ON safety_checkins (status);
CREATE INDEX idx_safety_checkins_checked_in_at ON safety_checkins (checked_in_at DESC);

CREATE INDEX idx_dashboard_metrics_org_id ON dashboard_metrics_daily (organization_id);

COMMIT;
