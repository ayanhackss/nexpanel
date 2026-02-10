#!/usr/bin/env node
/**
 * NexPanel Admin User Setup Script
 * Creates or resets the admin user in the database
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;
const DB_PATH = path.join(__dirname, '../../data/panel.db');

async function setupAdmin() {
    console.log('🔧 NexPanel Admin Setup');
    console.log('='.repeat(40));
    
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`✓ Created data directory: ${dataDir}`);
    }
    
    const sqliteDb = new Database(DB_PATH);
    
    // Enable foreign keys
    sqliteDb.pragma('foreign_keys = ON');
    
    // Create tables
    console.log('📊 Initializing database schema...');
    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            totp_secret TEXT,
            totp_enabled INTEGER DEFAULT 0,
            backup_codes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS websites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            domain TEXT NOT NULL,
            runtime TEXT NOT NULL,
            php_version TEXT,
            port INTEGER,
            status TEXT DEFAULT 'stopped',
            auto_start INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS domains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER,
            domain TEXT NOT NULL,
            is_primary INTEGER DEFAULT 0,
            FOREIGN KEY (website_id) REFERENCES websites(id)
        );

        CREATE TABLE IF NOT EXISTS ssl_certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'pending',
            expires_at DATETIME,
            auto_renew INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER,
            backup_path TEXT NOT NULL,
            size_bytes INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES websites(id)
        );

        CREATE TABLE IF NOT EXISTS cron_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER,
            command TEXT NOT NULL,
            schedule TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES websites(id)
        );

        CREATE TABLE IF NOT EXISTS git_repos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER,
            repo_url TEXT NOT NULL,
            branch TEXT DEFAULT 'main',
            deploy_key TEXT,
            auto_pull INTEGER DEFAULT 0,
            FOREIGN KEY (website_id) REFERENCES websites(id)
        );

        CREATE TABLE IF NOT EXISTS webhooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER,
            event TEXT NOT NULL,
            url TEXT,
            command TEXT,
            enabled INTEGER DEFAULT 1,
            FOREIGN KEY (website_id) REFERENCES websites(id)
        );

        CREATE TABLE IF NOT EXISTS ftp_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            quota_mb INTEGER DEFAULT 1024,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES websites(id)
        );

        CREATE TABLE IF NOT EXISTS redis_instances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id INTEGER,
            port INTEGER UNIQUE NOT NULL,
            password TEXT,
            max_memory_mb INTEGER DEFAULT 64,
            status TEXT DEFAULT 'stopped',
            FOREIGN KEY (website_id) REFERENCES websites(id)
        );

        CREATE TABLE IF NOT EXISTS email_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            quota_mb INTEGER DEFAULT 1024,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('✓ Database schema initialized');
    
    // Get admin credentials from args or prompt
    const args = process.argv.slice(2);
    let username = 'admin';
    let password = null;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--username' && args[i + 1]) {
            username = args[i + 1];
        } else if (args[i] === '--password' && args[i + 1]) {
            password = args[i + 1];
        }
    }
    
    if (!password) {
        password = generateRandomPassword();
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Check if admin exists
    const existingUser = sqliteDb.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
    
    if (existingUser) {
        // Update existing user
        sqliteDb.prepare(`
            UPDATE admin_users 
            SET password_hash = ?, totp_enabled = 0, totp_secret = NULL, backup_codes = NULL
            WHERE username = ?
        `).run(passwordHash, username);
        console.log(`✓ Updated existing user: ${username}`);
    } else {
        // Create new user
        sqliteDb.prepare(`
            INSERT INTO admin_users (username, password_hash)
            VALUES (?, ?)
        `).run(username, passwordHash);
        console.log(`✓ Created new user: ${username}`);
    }
    
    sqliteDb.close();
    
    console.log('');
    console.log('='.repeat(40));
    console.log('✅ Admin setup complete!');
    console.log('');
    console.log('📝 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Save this password now!');
    console.log('    You will need it to log into NexPanel.');
    console.log('');
    console.log('🚀 To start NexPanel:');
    console.log('   npm start');
    console.log('');
}

function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

setupAdmin().catch(err => {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
});
