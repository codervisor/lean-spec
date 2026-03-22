-- Initial schema: consolidates all tables from ChatStore and SessionDatabase.
-- Uses IF NOT EXISTS so this migration is safe for databases that already
-- have these tables from the pre-sqlx era.

-- Chat conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    provider_id TEXT,
    model_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    message_count INTEGER DEFAULT 0,
    last_message TEXT,
    tags TEXT,
    archived INTEGER DEFAULT 0,
    cloud_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    parts TEXT,
    metadata TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Cloud sync metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
    conversation_id TEXT PRIMARY KEY,
    cloud_id TEXT,
    last_synced_at INTEGER,
    sync_status TEXT CHECK(sync_status IN ('local-only', 'synced', 'conflict', 'pending')),
    version INTEGER DEFAULT 1,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    prompt TEXT,
    runner TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    exit_code INTEGER,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_ms INTEGER,
    token_count INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_runner ON sessions(runner);

-- Session-spec association (many-to-many)
CREATE TABLE IF NOT EXISTS session_specs (
    session_id TEXT NOT NULL,
    spec_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, spec_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_specs_session ON session_specs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_specs_spec ON session_specs(spec_id);

-- Session metadata (key-value)
CREATE TABLE IF NOT EXISTS session_metadata (
    session_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (session_id, key),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session logs
CREATE TABLE IF NOT EXISTS session_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_logs_session ON session_logs(session_id);

-- Session events
CREATE TABLE IF NOT EXISTS session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    data TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id);

-- Runner configurations
CREATE TABLE IF NOT EXISTS runners (
    scope TEXT NOT NULL,
    project_path TEXT NOT NULL DEFAULT '',
    runner_id TEXT NOT NULL,
    config_json TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (scope, project_path, runner_id)
);

CREATE INDEX IF NOT EXISTS idx_runners_scope_project ON runners(scope, project_path);
CREATE INDEX IF NOT EXISTS idx_runners_default ON runners(scope, project_path, is_default);
