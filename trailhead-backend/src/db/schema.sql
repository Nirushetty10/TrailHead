-- TRAILHEAD Phase 1 Foundation Schema
-- Every business-owned table carries tenant_id for isolation.
-- IF NOT EXISTS everywhere so this can run safely on every startup.

PRAGMA foreign_keys = ON;

-- === Tenancy ===

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  default_theme TEXT NOT NULL DEFAULT 'dark',
  enabled_card_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- === Auth / RBAC ===

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id),
  permission_id TEXT NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

-- === Commerce entities ===

CREATE TABLE IF NOT EXISTS products (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL,
  original_price REAL,
  currency TEXT DEFAULT 'USD',
  stock TEXT,
  stock_count INTEGER,
  description TEXT,
  tags TEXT DEFAULT '[]',
  variants TEXT DEFAULT '[]',
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  customer_email TEXT NOT NULL,
  items TEXT NOT NULL,
  status TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  estimated_delivery TEXT,
  breakdown TEXT NOT NULL,
  exchange_status TEXT,
  exchange_reason TEXT,
  exchange_requested_at TEXT,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  date TEXT,
  time TEXT,
  service TEXT,
  booked INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, id)
);

-- === Knowledge system (Phase 1: schema + keyword retrieval;
--     real embeddings are a later-phase upgrade behind the same interface) ===

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT,
  type TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_sources(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  title TEXT,
  content TEXT NOT NULL,
  keywords TEXT DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  content TEXT NOT NULL,
  embedding TEXT
);

-- === Conversations ===

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_state (
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id TEXT NOT NULL,
  facts TEXT NOT NULL DEFAULT '{}',
  cart TEXT NOT NULL DEFAULT '[]',
  verified_orders TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, client_id)
);

CREATE TABLE IF NOT EXISTS usage_counters (
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  month TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, month, client_id)
);

-- === Events, Actions, Audit (the core Phase 1 intelligence spine) ===

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  event_type TEXT NOT NULL,
  customer_id TEXT,
  product_id TEXT,
  order_id TEXT,
  conversation_id TEXT,
  source TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_type ON events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_tenant_created ON events(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  payload TEXT NOT NULL DEFAULT '{}',
  requested_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS escalations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL,
  order_id TEXT,
  reason TEXT,
  note TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at);

-- === AI Feedback (Phase 2) ===

CREATE TABLE IF NOT EXISTS message_feedback (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  message_id TEXT NOT NULL REFERENCES messages(id),
  client_id TEXT NOT NULL,
  rating TEXT NOT NULL, -- 'helpful' | 'not_helpful'
  correction TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- === Opportunity Engine (Phase 3) ===

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  problem TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT '[]',
  frequency INTEGER NOT NULL DEFAULT 1,
  business_impact TEXT,
  estimated_impact TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  recommended_solution TEXT,
  suggested_action TEXT,
  source_events TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'DETECTED',
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_status ON opportunities(tenant_id, status);

-- === AI Employees + Approval Engine (Phase 4) ===

CREATE TABLE IF NOT EXISTS ai_employees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL, -- 'sales' | 'support' | 'retention' | 'operations' | 'analytics'
  name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  tool_names TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approval_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  action_type TEXT NOT NULL, -- e.g. 'start_exchange'
  auto_approve_below REAL NOT NULL,
  restricted_at_or_above REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, action_type)
);
