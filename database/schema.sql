CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'usher')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count BETWEEN 1 AND 10),
  sms_consent BOOLEAN NOT NULL DEFAULT FALSE,
  sms_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sms_status IN ('pending', 'sending', 'sent', 'failed')),
  sms_error TEXT,
  sms_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

ALTER TABLE attendees
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE attendees
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE attendees
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES staff(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Wedding program',
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wedding_settings (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  event_at TIMESTAMPTZ NOT NULL,
  show_program BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wedding_settings
  ADD COLUMN IF NOT EXISTS show_program BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO wedding_settings (id, event_at)
VALUES (1, '2026-11-21 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS wedding_program (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL DEFAULT 'Wedding Day Program',
  subtitle TEXT NOT NULL DEFAULT 'A celebration of love, faith, and family.',
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  functionaries JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(functionaries) = 'array'),
  photography JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(photography) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wedding_program
  ADD COLUMN IF NOT EXISTS functionaries JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(functionaries) = 'array');
ALTER TABLE wedding_program
  ADD COLUMN IF NOT EXISTS photography JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(photography) = 'array');

INSERT INTO wedding_program (id, title, subtitle, items)
VALUES (
  1,
  'Wedding Day Program',
  'A celebration of love, faith, and family.',
  '[{"id":"ceremony","time":"10:00 AM","title":"Wedding Ceremony","description":"The Church of Pentecost, Agona-Fie Assembly, Agona Nkwanta"}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS attendees_created_at_idx ON attendees (created_at DESC);
CREATE INDEX IF NOT EXISTS attendees_sms_status_idx ON attendees (sms_status);
CREATE INDEX IF NOT EXISTS attendees_created_by_idx ON attendees (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS attendees_checked_in_at_idx ON attendees (checked_in_at DESC);
