CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    website_id INTEGER,
    secret TEXT,
    last_triggered DATETIME,
    last_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id)
);
