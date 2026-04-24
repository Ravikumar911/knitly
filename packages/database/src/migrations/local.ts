export const localMigrationSql = `
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY NOT NULL,
  email text,
  first_name text,
  last_name text,
  updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS parsed_emails (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  snippet text,
  sender_email_id text,
  thread_id text,
  subject text,
  received_date integer,
  parse_success integer DEFAULT 0,
  parse_errors text,
  raw_content text,
  attachment_storage_path text,
  parsed_at integer,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS parsed_emails_user_id_thread_id
ON parsed_emails(user_id, thread_id);

CREATE TABLE IF NOT EXISTS email_sync_status (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  last_synced_at integer,
  last_sync_attempt_at integer,
  next_page_token text,
  sync_status text DEFAULT 'complete',
  error_details text,
  oauth_error_type text,
  oauth_error_code text,
  requires_reauth integer DEFAULT 0,
  user_friendly_error text,
  total_emails integer,
  processed_emails integer DEFAULT 0,
  estimated_completion integer,
  progress_percentage real DEFAULT 0,
  has_initial_sync integer DEFAULT 0,
  sync_timeout_at integer,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions_v2 (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  parsed_email_id text REFERENCES parsed_emails(id) ON DELETE set null,
  merchant_id text,
  merchant_code text,
  merchant_name text,
  amount real NOT NULL,
  currency text DEFAULT 'INR',
  type text NOT NULL,
  status text DEFAULT 'COMPLETED',
  transaction_date integer NOT NULL,
  description text,
  category text,
  payment_method text,
  reference_ids text,
  location text,
  merchant_data text,
  extraction_confidence real,
  schema_used text,
  data_source text,
  is_verified integer DEFAULT 0,
  verification_status text DEFAULT 'UNVERIFIED',
  duplicate_of text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_v2_user_date
ON transactions_v2(user_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_v2_merchant
ON transactions_v2(user_id, merchant_id);

CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY NOT NULL,
  user_id text REFERENCES profiles(id),
  subject text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  user_email text,
  user_agent text,
  created_at integer,
  updated_at integer
);

CREATE TABLE IF NOT EXISTS chats (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  title text NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY NOT NULL,
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE cascade,
  role text NOT NULL,
  parts text NOT NULL,
  created_at integer NOT NULL
);
`;
