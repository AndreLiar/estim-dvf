-- ============================================================
-- EstimDVF — Full clean schema
-- Run this in Supabase SQL Editor on a fresh project
-- ============================================================


-- ─── DROP EVERYTHING (clean slate) ───────────────────────────────────────────
DROP TABLE IF EXISTS alert_history         CASCADE;
DROP TABLE IF EXISTS price_alerts          CASCADE;
DROP TABLE IF EXISTS portfolio_properties  CASCADE;
DROP TABLE IF EXISTS market_cache          CASCADE;
DROP TABLE IF EXISTS usage_log             CASCADE;
DROP TABLE IF EXISTS pro_users             CASCADE;


-- ─── PRO USERS ────────────────────────────────────────────────────────────────
-- Stores subscription state synced from Stripe webhooks.
-- Keyed on email (unique) so upserts work before a user has a Supabase account.
CREATE TABLE pro_users (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email                TEXT        NOT NULL UNIQUE,
  plan                 TEXT        NOT NULL CHECK (plan IN ('pro', 'api')),
  active               BOOLEAN     NOT NULL DEFAULT true,
  stripe_customer_id   TEXT,
  api_key              TEXT        UNIQUE,
  api_usage_count      INTEGER     NOT NULL DEFAULT 0,
  api_usage_reset_at   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pro_users_email    ON pro_users(email);
CREATE INDEX idx_pro_users_user_id  ON pro_users(user_id);
CREATE INDEX idx_pro_users_api_key  ON pro_users(api_key) WHERE api_key IS NOT NULL;

ALTER TABLE pro_users ENABLE ROW LEVEL SECURITY;
-- Users can read their own row; writes are admin-only (service role)
CREATE POLICY "read own pro record" ON pro_users
  FOR SELECT USING (auth.uid() = user_id);


-- ─── USAGE LOG ────────────────────────────────────────────────────────────────
-- Tracks anonymous estimate requests for rate limiting (5/day per IP).
CREATE TABLE usage_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_log_ip_time ON usage_log(ip, created_at);

-- No RLS needed — written by service role only


-- ─── PRICE ALERTS ─────────────────────────────────────────────────────────────
CREATE TABLE price_alerts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_postal   TEXT        NOT NULL,
  type_local    TEXT        NOT NULL DEFAULT 'Appartement',
  threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  last_median   NUMERIC(10,2),
  last_checked  TIMESTAMPTZ,
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_alerts_user   ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(active) WHERE active = true;

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON price_alerts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── ALERT HISTORY ────────────────────────────────────────────────────────────
-- Immutable log of every alert that fired.
CREATE TABLE alert_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id   UUID        NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_median NUMERIC(10,2),
  new_median NUMERIC(10,2),
  change_pct NUMERIC(6,2)
);

CREATE INDEX idx_alert_history_alert ON alert_history(alert_id);

-- No direct user RLS — access via service role only


-- ─── PORTFOLIO PROPERTIES ─────────────────────────────────────────────────────
CREATE TABLE portfolio_properties (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label                 TEXT,
  adresse               TEXT,
  code_postal           TEXT        NOT NULL,
  type_local            TEXT        NOT NULL DEFAULT 'Appartement',
  surface_m2            NUMERIC(8,2) NOT NULL,
  purchase_price        NUMERIC(12,2) NOT NULL,
  purchase_date         DATE        NOT NULL,
  current_median_per_m2 NUMERIC(10,2),
  estimate_updated_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_user ON portfolio_properties(user_id);

ALTER TABLE portfolio_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own properties" ON portfolio_properties
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── MARKET CACHE ─────────────────────────────────────────────────────────────
-- 24h cache of DVF market stats per postal code + property type.
-- Columns match what services/market.ts reads and writes.
CREATE TABLE market_cache (
  code_postal     TEXT        NOT NULL,
  type_local      TEXT        NOT NULL,
  cached_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Core stats
  median_per_m2   NUMERIC(10,2),
  avg_per_m2      NUMERIC(10,2),
  p10_per_m2      NUMERIC(10,2),
  p90_per_m2      NUMERIC(10,2),
  volume          INTEGER,
  momentum_12m    NUMERIC(6,2),
  last_sale_date  TEXT,
  city_name       TEXT,
  price_history   JSONB,
  -- Legacy columns kept for backwards compat (used by cron/alerts)
  median_12m      NUMERIC(10,2),
  median_prev_12m NUMERIC(10,2),
  volume_12m      INTEGER,
  volume_prev_12m INTEGER,
  momentum_pct    NUMERIC(6,2),
  PRIMARY KEY (code_postal, type_local)
);

-- No RLS — read/written by service role only


-- ─── SEED: AUTH USERS ─────────────────────────────────────────────────────────
-- Creates both users in auth.users with confirmed emails and hashed passwords.
-- Passwords: kanmegneandre@gmail.com → Estimdvf2025!
--            kanmegnea@gmail.com     → Estimdvf2025!
-- Change these after first login.

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, role, aud
)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'kanmegneandre@gmail.com',
    crypt('Estimdvf2025!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(), 'authenticated', 'authenticated'
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'kanmegnea@gmail.com',
    crypt('Estimdvf2025!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(), 'authenticated', 'authenticated'
  )
ON CONFLICT (email) DO NOTHING;


-- ─── SEED: PRO USERS ──────────────────────────────────────────────────────────
INSERT INTO pro_users (email, plan, active)
VALUES
  ('kanmegneandre@gmail.com', 'pro', true),
  ('kanmegnea@gmail.com',     'api', true)
ON CONFLICT (email) DO UPDATE
  SET plan = EXCLUDED.plan, active = true;

-- Link user_id from auth.users
UPDATE pro_users p
SET user_id = u.id
FROM auth.users u
WHERE p.email = u.email
  AND p.user_id IS NULL;

-- Generate an API key for the api-plan user
UPDATE pro_users
SET api_key = 'dvf_' || substr(md5(random()::text || clock_timestamp()::text), 1, 40)
WHERE email = 'kanmegnea@gmail.com'
  AND api_key IS NULL;


-- ─── TRIGGER: auto-link user_id on signup ─────────────────────────────────────
-- When a new user signs up whose email already has a pro_users row,
-- automatically fill in user_id so they get their pro access immediately.
CREATE OR REPLACE FUNCTION link_pro_user_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pro_users
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_pro_user_on_signup();
