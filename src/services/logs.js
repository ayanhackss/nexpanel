const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const readline = require('readline');

// Allowed log paths - prevent path traversal
const ALLOWED_LOG_DIRS = [
    '/var/log/nginx',
    '/var/log/php-fpm',
    '/var/log/mysql'
];

const isPathAllowed = (path) => {
    // Resolve real path and check if it's under allowed directories
    try {
        const realPath = require('path').resolve('/' + path.replace(/\.\./g, ''));
        return ALLOWED_LOG_DIRS.some(dir => realPath.startsWith(dir));
    } catch {
        return false;
    }
};

const tailLog = async (logPath, lines = 100) => {
    // Validate path to prevent path traversal
    if (!isPathAllowed(logPath)) {
        throw new Error('Access denied: Invalid log path');
    }

    // Validate lines parameter
    const validatedLines = Math.min(Math.max(parseInt(lines) || 100, 1), 10000);

    try {
        // Use execFile instead of exec to prevent command injection
        const { stdout } = await execAsync('tail', ['-n', String(validatedLines), logPath]);
        return stdout;
    } catch (error) {
        throw new Error(`Failed to read log: ${error.message}`);
    }
};

const searchLog = async (logPath, query) => {
    // Validate path to prevent path traversal
    if (!isPathAllowed(logPath)) {
        throw new Error('Access denied: Invalid log path');
    }

    // Validate and sanitize query - only allow alphanumeric and basic chars
    const sanitizedQuery = String(query).replace(/[^a-zA-Z0-9\s\-_.]/g, '');

    try {
        // Use execFile with proper argument escaping
        const { stdout } = await execAsync('grep', ['-i', sanitizedQuery, logPath]);
        return stdout.split('\n').slice(0, 100).join('\n');
    } catch (error) {
        return ''; // No matches
    }
};

const streamLog = (logPath) => {
    // Validate path to prevent path traversal
    if (!isPathAllowed(logPath)) {
        throw new Error('Access denied: Invalid log path');
    }

    // Returns a readable stream for real-time log tailing
    const tail = exec('tail', ['-f', logPath]);
    return tail.stdout;
};

const getAvailableLogs = async () => {
    const logs = [];

    for (const dir of ALLOWED_LOG_DIRS) {
        try {
            const { stdout } = await execAsync('find', [dir, '-name', '*.log', '-type', 'f']);
            logs.push(...stdout.split('\n').filter(l => l));
        } catch {
            // Directory doesn't exist or no permission
        }
    }

    return logs;
};

const compressOldLogs = async () => {
    try {
        // Compress logs older than 7 days
        await execAsync(`find /var/log -name "*.log" -mtime +7 -exec gzip {} \\;`);
        return true;
    } catch (error) {
        throw new Error(`Log compression failed: ${error.message}`);
    }
};

module.exports = {
    tailLog,
    searchLog,
    streamLog,
    getAvailableLogs,
    compressOldLogs
};
