const { spawnAsync } = require('../utils/process');
const path = require('path');
const { spawn } = require('child_process');

const ALLOWED_LOG_DIRS = [
    '/var/log/nginx',
    '/var/log/php-fpm',
    '/var/log/mysql',
    '/var/www'
];

const isAllowedPath = (logPath) => {
    if (!logPath) return false;
    // Resolve path to remove .. and ensure it's absolute
    const resolved = path.resolve(logPath);
    // Check if it starts with any allowed dir
    return ALLOWED_LOG_DIRS.some(dir => resolved.startsWith(dir));
};

const tailLog = async (logPath, lines = 100) => {
    if (!isAllowedPath(logPath)) throw new Error('Access denied');
    try {
        const { stdout } = await spawnAsync('tail', ['-n', lines.toString(), logPath]);
        return stdout;
    } catch (error) {
        throw new Error(`Failed to read log: ${error.message}`);
    }
};

const searchLog = async (logPath, query) => {
    if (!isAllowedPath(logPath)) throw new Error('Access denied');

    return new Promise((resolve, reject) => {
        // grep -i "query" logPath | tail -n 100
        const grep = spawn('grep', ['-i', '-e', query, logPath]);
        const tail = spawn('tail', ['-n', '100']);

        let stdout = '';
        let stderr = '';

        grep.stdout.pipe(tail.stdin);

        // Handle grep errors (e.g., file not found, though we checked path)
        grep.on('error', (err) => {
            // If grep fails, we probably shouldn't reject immediately if it's just no matches?
            // grep exit code 1 means no matches.
        });

        grep.on('close', (code) => {
             if (code !== 0 && code !== 1) { // 1 is no matches
                 // Log error?
             }
             tail.stdin.end();
        });

        tail.stdout.on('data', (data) => stdout += data);

        tail.on('close', (code) => {
            resolve(stdout);
        });

        tail.on('error', (err) => {
            reject(err);
        });
    });
};

const streamLog = (logPath) => {
    if (!isAllowedPath(logPath)) {
        // Return empty stream or throw? Throwing might crash the route handler if not caught well.
        // Route handler catches errors.
        throw new Error('Access denied');
    }
    const tail = spawn('tail', ['-f', logPath]);
    return tail.stdout;
};

const getAvailableLogs = async () => {
    const logs = [];

    for (const dir of ALLOWED_LOG_DIRS) {
        try {
            // find dir -name "*.log" -type f
            const { stdout } = await spawnAsync('find', [dir, '-name', '*.log', '-type', 'f']);
            if (stdout) {
                logs.push(...stdout.toString().split('\n').filter(l => l));
            }
        } catch {
            // Directory doesn't exist or no permission
        }
    }

    return logs;
};

const compressOldLogs = async () => {
    try {
        // find /var/log -name "*.log" -mtime +7 -exec gzip {} ;
        // spawn handles arguments correctly.
        // However, -exec argument syntax is tricky with spawn because usually ';' needs escaping in shell.
        // In spawn, we pass ';' as an argument.

        await spawnAsync('find', ['/var/log', '-name', '*.log', '-mtime', '+7', '-exec', 'gzip', '{}', ';']);
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
