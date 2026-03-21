-- Run this in Supabase SQL Editor

-- ─── PRICE ALERTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_postal   TEXT NOT NULL,
  type_local    TEXT NOT NULL DEFAULT 'Appartement',
  threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  last_median   NUMERIC(10,2),
  last_checked  TIMESTAMPTZ,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(active) WHERE active = true;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own alerts" ON price_alerts;
CREATE POLICY "own alerts" ON price_alerts USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── ALERT HISTORY ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id    UUID NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_median  NUMERIC(10,2),
  new_median  NUMERIC(10,2),
  change_pct  NUMERIC(6,2)
);

-- ─── PORTFOLIO ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_properties (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label                  TEXT,
  adresse                TEXT,
  code_postal            TEXT NOT NULL,
  type_local             TEXT NOT NULL DEFAULT 'Appartement',
  surface_m2             NUMERIC(8,2) NOT NULL,
  purchase_price         NUMERIC(12,2) NOT NULL,
  purchase_date          DATE NOT NULL,
  current_median_per_m2  NUMERIC(10,2),
  estimate_updated_at    TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_properties(user_id);
ALTER TABLE portfolio_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own properties" ON portfolio_properties;
CREATE POLICY "own properties" ON portfolio_properties USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── MARKET CACHE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_cache (
  code_postal     TEXT NOT NULL,
  type_local      TEXT NOT NULL,
  cached_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_history   JSONB,
  median_12m      NUMERIC(10,2),
  median_prev_12m NUMERIC(10,2),
  volume_12m      INTEGER,
  volume_prev_12m INTEGER,
  momentum_pct    NUMERIC(6,2),
  city_name       TEXT,
  PRIMARY KEY (code_postal, type_local)
);
