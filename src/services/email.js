const { sqliteDb, mariaPool } = require('../config/database');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Password hashing for Dovecot (SHA512-CRYPT)
// Since native node crypto doesn't do SHA512-CRYPT easily without libs,
// we can use `doveadm pw` command to generate it.
// This ensures compatibility with Dovecot.

const hashPassword = async (plainPassword) => {
    try {
        const { stdout } = await execAsync(`doveadm pw -s SHA512-CRYPT -p '${plainPassword}'`);
        return stdout.trim();
    } catch (error) {
        throw new Error('Failed to hash password');
    }
};

const createAccount = async (email, password, quotaMb = 1024) => {
    // Check if email account exists in SQLite (for panel view)
    // Actually, we need to sync users. 
    // The previous design had an existing `email_accounts` table in SQLite for panel metadata?
    // Wait, Postfix needs to read from *MariaDB*.
    // So we MUST use MariaDB for the actual auth/routing.
    // The SQLite table was just me prototyping.
    // We should use MariaDB `email_accounts` table.
    
    const connection = await mariaPool.getConnection();
    try {
        const passwordHash = await hashPassword(password);
        
        // Insert into MariaDB
        // Ensure table exists (config/database.js initSqlite - wait, Postfix uses MySQL/MariaDB in my config)
        // I need to create the table in MariaDB, not SQLite.
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS email_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                quota_mb INT DEFAULT 1024,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
             INSERT INTO email_accounts (email, password_hash, quota_mb)
             VALUES (?, ?, ?)
        `, [email, passwordHash, quotaMb]);

    } finally {
        connection.release();
    }
    
    // Create Maildir? Dovecot does it on first login usually.
    return true;
};

const listAccounts = async () => {
    const connection = await mariaPool.getConnection();
    try {
        // Create check to avoid error if table missing
        await connection.query(`
            CREATE TABLE IF NOT EXISTS email_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                quota_mb INT DEFAULT 1024,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const [rows] = await connection.query('SELECT id, email, quota_mb, created_at FROM email_accounts');
        return rows;
    } finally {
        connection.release();
    }
};

const deleteAccount = async (id) => {
    const connection = await mariaPool.getConnection();
    try {
        // Get email to delete files later?
        // For now just remove DB entry
        await connection.query('DELETE FROM email_accounts WHERE id = ?', [id]);
    } finally {
        connection.release();
    }
    return true;
};

module.exports = {
    createAccount,
    listAccounts,
    deleteAccount
};
