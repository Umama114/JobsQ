-- JobsQ first build: the tables this slice needs, following docs/BACKEND.md section 8 (names in snake_case, plural).
-- Applied on every start; every statement is safe to run again.

create table if not exists users (
  id bigserial primary key,
  email text not null unique,
  name text not null,
  phone text not null,                       -- digits only, with country code
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  email_verified_at timestamptz,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,               -- only the hash of the cookie value is stored
  user_id bigint not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists email_tokens (
  token_hash text primary key,
  user_id bigint not null references users(id) on delete cascade,
  kind text not null check (kind in ('verify', 'reset')),
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Emails are not sent anywhere yet: they land here and are shown on the website's dev inbox page.
create table if not exists email_outbox (
  id bigserial primary key,
  to_email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  code text primary key,                     -- jobsq_ai | own_ai
  name text not null,
  description text not null,
  price_inr int                              -- null = price not decided yet
);

create table if not exists subscriptions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  plan_code text not null references plans(code),
  status text not null check (status in ('active', 'past_due', 'canceled', 'expired', 'refunded')),
  current_period_end timestamptz not null,
  grace_until timestamptz,
  extended_until timestamptz,
  provider text not null default 'test',    -- test | razorpay | stripe (payments come later)
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user on subscriptions(user_id);

create table if not exists resumes (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  filename text not null,
  stored_path text not null,
  text_chars int not null,
  text_excerpt text not null,
  created_at timestamptz not null default now()
);

create table if not exists channel_links (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'discord')),
  external_id text not null,                 -- WhatsApp: the phone number, digits only
  status text not null check (status in ('active', 'opted_out', 'disconnected')),
  linked_at timestamptz not null default now()
);
create unique index if not exists channel_links_one_active_number on channel_links(channel, external_id) where status <> 'disconnected';
create unique index if not exists channel_links_one_per_user on channel_links(user_id) where status <> 'disconnected';

create table if not exists link_codes (
  code text primary key,
  user_id bigint not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists messages (
  id bigserial primary key,
  user_id bigint references users(id) on delete set null,   -- null when the sender is not registered
  channel text not null default 'whatsapp',
  direction text not null check (direction in ('in', 'out')),
  external_id text not null,                 -- the other side's phone number
  platform_message_id text unique,           -- WhatsApp's id; a repeated webhook is ignored
  reply_to text,                             -- WhatsApp id of the message this one replies to
  body text not null,
  intent text,                               -- what the engine understood (in) or why it replied (out)
  status text,                               -- out: sent | failed
  error text,
  created_at timestamptz not null default now()
);
create index if not exists messages_user_time on messages(user_id, created_at desc);

-- ---------- agents ----------
-- The user's profile as the AI read it from the resume, and what jobs they want.
create table if not exists profiles (
  user_id bigint primary key references users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,         -- name, headline, location, skills, experience, education, projects...
  prefs jsonb not null default '{}'::jsonb,        -- roles, locations, level, remote, min_salary
  resume_text text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists scout_runs (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  summary text,
  picks jsonb not null default '[]'::jsonb,        -- shortlisted jobs, in order, with the reason each fits
  error text,
  source text not null default 'web',              -- web | whatsapp
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  number int not null,                             -- A1, A2... per user, used in WhatsApp
  job jsonb not null,                              -- title, company, location, link, salary, source, description
  status text not null default 'applied' check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'archived')),
  done jsonb not null default '{}'::jsonb,         -- which agent steps have run: research, resume, email, linkedin, prep
  research jsonb,                                  -- company summary and people, kept for the later agents
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create table if not exists thread_messages (
  id bigserial primary key,
  application_id bigint not null references applications(id) on delete cascade,
  role text not null check (role in ('user', 'agent', 'system')),
  agent text,                                      -- research | resume | email | linkedin | prep | assistant
  body text not null default '',
  status text not null default 'done' check (status in ('working', 'done', 'failed')),
  files jsonb not null default '[]'::jsonb,        -- [{name, file_id}]
  created_at timestamptz not null default now()
);
create index if not exists thread_messages_app on thread_messages(application_id, id);

create table if not exists files (
  id text primary key,                             -- random id, used in download links
  user_id bigint not null references users(id) on delete cascade,
  application_id bigint references applications(id) on delete cascade,
  name text not null,
  path text not null,
  mime text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_calls (
  id bigserial primary key,
  user_id bigint,
  agent text,
  provider text,
  ok boolean,
  secs numeric,
  input_tokens int,
  output_tokens int,
  turns int,
  error text,
  created_at timestamptz not null default now()
);

-- Which job a WhatsApp message we sent was about, so a reply to it goes to that job.
alter table messages add column if not exists application_id bigint references applications(id) on delete set null;

-- Details the user checked or corrected in the resume form (name, email, phone, location, skills).
alter table profiles add column if not exists basics jsonb not null default '{}'::jsonb;
-- The user's own notes on a job.
alter table applications add column if not exists notes text not null default '';

-- ---------- "Your own AI" plan: the JobsQ Connector on the user's computer runs the AI with their Claude Code or Codex ----------
-- One connector per user. The key is shown once; only its hash is stored.
create table if not exists connectors (
  user_id bigint primary key references users(id) on delete cascade,
  key_hash text not null unique,
  tool text,                                       -- claude | codex, reported by the connector
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- AI work waiting for a connector. owner_user_id null = JobsQ's own connector (used in development when there's no API key).
create table if not exists ai_tasks (
  id bigserial primary key,
  owner_user_id bigint references users(id) on delete cascade,
  agent text,
  system text not null,
  prompt text not null,
  web boolean not null default false,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  result text,
  error text,
  usage jsonb,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz
);
create index if not exists ai_tasks_queue on ai_tasks(owner_user_id, status, id);

-- When JobsQ's own connector was last seen (development only).
create table if not exists house_connector (
  id int primary key default 1 check (id = 1),
  tool text,
  last_seen_at timestamptz
);

-- The user's LinkedIn connections (from LinkedIn's "Connections.csv" export), to find people they already know at a company.
create table if not exists connections (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  name text not null,
  url text,
  email text,
  company text,
  company_key text,                                -- company name simplified for matching
  position text,
  created_at timestamptz not null default now()
);
create index if not exists connections_user_company on connections(user_id, company_key);

-- One account per phone number. Skipped while older accounts still share a number, so start-up never fails; it is added on the
-- first start after the repeats are removed. Sign-up refuses a repeated number either way.
do $$ begin
  if not exists (select 1 from users group by phone having count(*) > 1) then
    create unique index if not exists users_phone_unique on users(phone);
  end if;
end $$;
