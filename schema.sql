-- Hammy Focus House v20 PostgreSQL schema
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  player_id TEXT UNIQUE NOT NULL,
  recovery_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_saves (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL DEFAULT 0,
  device_id TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS premium_entitlements (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'none',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'unlisted',
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  moderation_status TEXT NOT NULL DEFAULT 'active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS normal_home_rooms (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  room_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS premium_rooms (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_key TEXT NOT NULL,
  room_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, room_key)
);

CREATE TABLE IF NOT EXISTS friend_codes (
  code TEXT PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_friends (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_code TEXT NOT NULL REFERENCES friend_codes(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_code)
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  profile_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS blocks (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, profile_code)
);

CREATE TABLE IF NOT EXISTS hidden_profiles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, profile_code)
);

CREATE TABLE IF NOT EXISTS reactions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_code TEXT NOT NULL,
  reaction TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, profile_code)
);

CREATE INDEX IF NOT EXISTS profiles_visibility_idx ON profiles (visibility, moderation_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reactions_code_idx ON reactions (profile_code);


CREATE TABLE IF NOT EXISTS reward_code_redemptions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  reward_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, code)
);

CREATE INDEX IF NOT EXISTS reward_code_redemptions_code_idx
  ON reward_code_redemptions (code, redeemed_at DESC);


CREATE TABLE IF NOT EXISTS admin_events (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_claims (
  event_id UUID NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_player_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_events_active_idx
  ON admin_events (status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS event_claims_user_idx
  ON event_claims (user_id, claimed_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON admin_audit_log (created_at DESC);


CREATE TABLE IF NOT EXISTS admin_reward_codes (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_redemptions INTEGER,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_announcements (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_reward_codes_status_idx
  ON admin_reward_codes (status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS admin_announcements_active_idx
  ON admin_announcements (status, priority, starts_at, ends_at);
